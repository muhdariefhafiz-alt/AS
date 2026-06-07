import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";

// Allow the function room to work through a batch within Vercel's cap.
export const maxDuration = 300;

const BATCH_SIZE = 250;
const CONCURRENCY = 8;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

/**
 * Daily contact enrichment for unclaimed agents.
 *
 * Primary source: openagent.sg/agent/{CEA} — server-rendered, free, ~92% hit
 * rate on active agents, keyed by the CEA registration we already store. We
 * parse the agent's published business mobile (tel:), WhatsApp (wa.me) and
 * email (mailto:). No API key required.
 *
 * APIFY_TOKEN remains configured in the environment and can be wired in as a
 * fallback for the ~8% openagent misses, but is intentionally not used by
 * default: the generic Google/regex path returned wrong or empty contacts and
 * would pollute the table. Cleanliness over coverage.
 *
 * Note: business mobile/WhatsApp are public business-contact info (PDPA BCI);
 * emails are often personal webmail, treat as a softer channel downstream.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = supabaseAdmin();

  const { data: agents, error } = await sb
    .from("sg_agents")
    .select("id, cea_registration")
    .eq("claimed", false)
    .is("email", null)
    .is("phone", null)
    .not("score", "is", null)
    .gte("score", 30)
    .is("contact_scraped_at", null)
    .not("cea_registration", "is", null)
    .order("score", { ascending: false })
    .limit(BATCH_SIZE);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!agents || agents.length === 0) {
    // Nothing fresh to do: retry agents last attempted > 30 days ago in case
    // openagent has since published their contact.
    await sb
      .from("sg_agents")
      .update({ contact_scraped_at: null })
      .eq("claimed", false)
      .is("email", null)
      .is("phone", null)
      .lt(
        "contact_scraped_at",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      );
    return NextResponse.json({ ok: true, processed: 0, reason: "No fresh agents (reset stale)" });
  }

  let found = 0;
  for (let i = 0; i < agents.length; i += CONCURRENCY) {
    const slice = agents.slice(i, i + CONCURRENCY);
    await Promise.all(
      slice.map(async (a) => {
        const contact = await scrapeOpenAgent(String(a.cea_registration));
        const update: Record<string, unknown> = {
          contact_scraped_at: new Date().toISOString(),
        };
        if (contact.phone) update.phone = contact.phone;
        if (contact.whatsapp) update.whatsapp = contact.whatsapp;
        if (contact.email) update.email = contact.email;
        await sb.from("sg_agents").update(update).eq("id", a.id);
        if (contact.phone || contact.email) found++;
      })
    );
  }

  return NextResponse.json({ ok: true, processed: agents.length, contacts_found: found });
}

async function scrapeOpenAgent(
  cea: string
): Promise<{ phone: string | null; whatsapp: string | null; email: string | null }> {
  const out = { phone: null as string | null, whatsapp: null as string | null, email: null as string | null };
  try {
    const res = await fetch(`https://openagent.sg/agent/${encodeURIComponent(cea)}`, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return out;
    const html = await res.text();

    const tel = html.match(/tel:(\+?\d{8,})/);
    if (tel) {
      const digits = tel[1].replace(/^\+/, "");
      out.phone = digits.startsWith("65") ? `+${digits}` : `+65${digits}`;
    }

    const wa = html.match(/wa\.me\/(\d{8,})/);
    if (wa) out.whatsapp = `+65${wa[1].slice(-8)}`;

    const em = html.match(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (em) out.email = em[1].toLowerCase();
  } catch {
    // Leave nulls; contact_scraped_at is still set so we don't hot-loop retries.
  }
  return out;
}
