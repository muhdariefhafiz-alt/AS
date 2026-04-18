import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const APIFY_TOKEN = process.env.APIFY_TOKEN;

/**
 * Manual contact scraping endpoint.
 *
 * POST /api/scrape-contacts
 * Body: { agentIds?: number[], limit?: number, agency?: string }
 *
 * - agentIds: specific agents to scrape
 * - limit: max agents to process (default 10)
 * - agency: filter by agency name (e.g. "huttons")
 *
 * Requires CRON_SECRET as Bearer token.
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!APIFY_TOKEN) {
    return NextResponse.json({ error: "APIFY_TOKEN not configured" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const { agentIds, limit = 10, agency } = body as {
    agentIds?: number[];
    limit?: number;
    agency?: string;
  };

  // Build query
  let query = supabase
    .from("sg_agents")
    .select("id, name, slug, cea_registration, agency_name, score, phone, email")
    .is("email", null)
    .is("phone", null)
    .not("score", "is", null)
    .gte("score", 30)
    .order("score", { ascending: false })
    .limit(Math.min(limit, 50));

  if (agentIds && agentIds.length > 0) {
    query = supabase
      .from("sg_agents")
      .select("id, name, slug, cea_registration, agency_name, score, phone, email")
      .in("id", agentIds)
      .limit(50);
  }

  if (agency) {
    query = query.ilike("agency_name", `%${agency}%`);
  }

  const { data: agents, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!agents || agents.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, reason: "No matching agents" });
  }

  const results: Array<{
    id: number;
    name: string;
    cea: string;
    agency: string | null;
    phone: string | null;
    email: string | null;
    source: string;
  }> = [];

  for (const agent of agents) {
    try {
      const isHuttons = agent.agency_name?.toLowerCase().includes("huttons");
      let contact: { phone: string | null; email: string | null; source: string };

      if (isHuttons) {
        contact = await scrapeHuttons(agent.cea_registration, agent.name);
      } else {
        contact = await scrapeViaSearch(agent.name, agent.cea_registration);
      }

      // Update database
      const update: Record<string, unknown> = {
        contact_scraped_at: new Date().toISOString(),
      };
      if (contact.phone) update.phone = contact.phone;
      if (contact.email) update.email = contact.email;

      await supabase.from("sg_agents").update(update).eq("id", agent.id);

      results.push({
        id: agent.id,
        name: agent.name,
        cea: agent.cea_registration,
        agency: agent.agency_name,
        phone: contact.phone,
        email: contact.email,
        source: contact.source,
      });
    } catch (err) {
      console.error(`[manual-scrape] ${agent.name} failed:`, err);
      results.push({
        id: agent.id,
        name: agent.name,
        cea: agent.cea_registration,
        agency: agent.agency_name,
        phone: null,
        email: null,
        source: "error",
      });
    }
  }

  const found = results.filter(r => r.phone || r.email).length;

  return NextResponse.json({
    ok: true,
    processed: results.length,
    contacts_found: found,
    results,
  });
}

// ---------------------------------------------------------------------------
// Scraping functions (same logic as cron)
// ---------------------------------------------------------------------------

async function scrapeHuttons(cea: string, name: string) {
  const result = await callApifyRAG(
    `https://www.huttonsgroup.com/agent-directory/?search=${cea}`,
    `huttons agent ${name} ${cea} phone email`
  );

  const contact = { phone: null as string | null, email: null as string | null, source: "huttons" };
  if (!result) return contact;

  const waMatch = result.match(/wa\.me\/(\d{8,})/);
  if (waMatch) contact.phone = `+65${waMatch[1]}`;

  if (!contact.phone) {
    const telMatch = result.match(/tel:(\d{8})/);
    if (telMatch) contact.phone = `+65${telMatch[1]}`;
  }

  const cfMatch = result.match(/email-protection#([a-f0-9]+)/);
  if (cfMatch) {
    const decoded = decodeCfEmail(cfMatch[1]);
    if (decoded?.includes("@")) contact.email = decoded;
  }

  return contact;
}

async function scrapeViaSearch(name: string, cea: string) {
  const query = `"${name}" "${cea}" Singapore property agent contact email`;
  const result = await callApifyRAG(null, query);

  const contact = { phone: null as string | null, email: null as string | null, source: "google" };
  if (!result) return contact;

  const emailMatch = result.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) {
    const email = emailMatch[1].toLowerCase();
    if (!["noreply", "info@", "admin@", "support@", "hello@", "contact@"].some(g => email.includes(g))) {
      contact.email = email;
    }
  }

  const phoneMatch = result.match(/(?:\+65\s?)?([689]\d{7})/);
  if (phoneMatch) contact.phone = `+65${phoneMatch[1]}`;

  return contact;
}

async function callApifyRAG(startUrl: string | null, query: string): Promise<string | null> {
  const input: Record<string, unknown> = { query, maxResults: 1 };
  if (startUrl) input.startUrls = [{ url: startUrl }];

  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/apify~rag-web-browser/run-sync-get-dataset-items?token=${APIFY_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }
    );
    if (!res.ok) return null;

    const items = await res.json();
    if (!Array.isArray(items) || items.length === 0) return null;
    return [items[0].markdown, items[0].text].filter(Boolean).join("\n");
  } catch {
    return null;
  }
}

function decodeCfEmail(encoded: string): string | null {
  try {
    const r = parseInt(encoded.substr(0, 2), 16);
    let email = "";
    for (let i = 2; i < encoded.length; i += 2) {
      email += String.fromCharCode(parseInt(encoded.substr(i, 2), 16) ^ r);
    }
    return email;
  } catch {
    return null;
  }
}
