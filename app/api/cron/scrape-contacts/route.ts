import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const BATCH_SIZE = 20;

/**
 * Daily contact scraping cron for unclaimed agents.
 *
 * Strategy (by agency):
 *   1. Huttons: scrape huttonsgroup.com/agent-directory/?search={CEA}
 *      - Phone from wa.me links, email from Cloudflare-protected links
 *   2. All agencies: Google search via RAG browser "{name} {CEA} Singapore contact"
 *
 * Processes 20 agents per run to stay within rate limits.
 * Runs daily at 3am UTC (11am SGT).
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!APIFY_TOKEN) {
    return NextResponse.json({ error: "APIFY_TOKEN not configured" }, { status: 500 });
  }

  const results: Record<string, unknown> = {};

  // Get unclaimed agents without contact info, prioritized by score
  const { data: agents, error } = await supabase
    .from("sg_agents")
    .select("id, name, slug, cea_registration, agency_name, score, phone, email, contact_scraped_at")
    .is("email", null)
    .is("phone", null)
    .eq("claimed", false)
    .not("score", "is", null)
    .gte("score", 30)
    .is("contact_scraped_at", null)
    .order("score", { ascending: false })
    .limit(BATCH_SIZE);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!agents || agents.length === 0) {
    // Reset contact_scraped_at for agents scraped > 30 days ago to retry
    await supabase
      .from("sg_agents")
      .update({ contact_scraped_at: null })
      .is("email", null)
      .is("phone", null)
      .lt("contact_scraped_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    return NextResponse.json({ ok: true, processed: 0, reason: "No agents to process (or reset stale)" });
  }

  results.batch_size = agents.length;

  // Split agents by agency for targeted scraping
  const huttonsAgents = agents.filter(a => a.agency_name?.toLowerCase().includes("huttons"));
  const otherAgents = agents.filter(a => !a.agency_name?.toLowerCase().includes("huttons"));

  results.huttons = huttonsAgents.length;
  results.other = otherAgents.length;

  let updated = 0;
  let found = 0;

  // --- Strategy 1: Huttons agents via website-contact-scraper (batch) ---
  if (huttonsAgents.length > 0) {
    try {
      const huttonsResults = await scrapeHuttonsBatch(huttonsAgents);
      for (const hr of huttonsResults) {
        await updateAgentContact(hr.agentId, hr.contact);
        if (hr.contact.phone || hr.contact.email) found++;
        updated++;
      }
    } catch (err) {
      console.error("[scrape] Huttons batch failed:", err);
      // Mark all as attempted
      for (const a of huttonsAgents) {
        await supabase
          .from("sg_agents")
          .update({ contact_scraped_at: new Date().toISOString() })
          .eq("id", a.id);
        updated++;
      }
    }
  }

  // --- Strategy 2: All other agents via Google search ---
  for (const agent of otherAgents) {
    try {
      const contact = await scrapeViaSearch(agent.name, agent.cea_registration, agent.agency_name);
      await updateAgentContact(agent.id, contact);
      if (contact.phone || contact.email) found++;
      updated++;
    } catch (err) {
      console.error(`[scrape] Search agent ${agent.name} failed:`, err);
      await supabase
        .from("sg_agents")
        .update({ contact_scraped_at: new Date().toISOString() })
        .eq("id", agent.id);
      updated++;
    }
  }

  results.updated = updated;
  results.contacts_found = found;

  // Log run
  await supabase.from("sg_funnel_events").insert({
    event: "cron_scrape_contacts",
    metadata: { ...results, timestamp: new Date().toISOString() },
  });

  return NextResponse.json({ ok: true, ...results });
}

// ---------------------------------------------------------------------------
// Huttons: batch scrape via website-contact-scraper ($0.004/agent)
// ---------------------------------------------------------------------------

type AgentRow = { id: number; name: string; cea_registration: string; agency_name: string | null };

async function scrapeHuttonsBatch(agents: AgentRow[]): Promise<Array<{ agentId: number; contact: ContactResult }>> {
  // Build start URLs for each agent's Huttons profile page
  const startUrls = agents.map(a => ({
    url: `https://agents.huttonsgroup.com/${a.cea_registration}`,
  }));

  // Call Apify website-contact-scraper
  const res = await fetch(
    `https://api.apify.com/v2/acts/emastra~website-contact-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startUrls,
        maxPagesPerStartUrl: 1,
        maxDepth: 0,
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`website-contact-scraper failed: ${res.status}`);
  }

  const items = await res.json();
  if (!Array.isArray(items)) return [];

  return agents.map((agent, idx) => {
    const item = items[idx];
    const contact: ContactResult = { phone: null, email: null, photo_url: null, source: "huttons" };

    if (item?.contacts) {
      // Extract first valid SG phone number
      const phones = item.contacts.phones as string[] | undefined;
      if (phones?.length) {
        const sgPhone = phones.find((p: string) => p.startsWith("+65"));
        if (sgPhone) contact.phone = sgPhone;
        else if (phones[0].length === 8) contact.phone = `+65${phones[0]}`;
      }

      // Extract email if available
      const emails = item.contacts.emails as string[] | undefined;
      if (emails?.length) {
        contact.email = emails[0];
      }
    }

    // Huttons photo URL pattern
    contact.photo_url = `https://portal.huttonsgroup.com/uploads/photos/thumbnails/${agent.cea_registration}.jpg`;

    return { agentId: agent.id, contact };
  });
}

// ---------------------------------------------------------------------------
// Google search: find contact info via RAG browser
// ---------------------------------------------------------------------------

async function scrapeViaSearch(name: string, cea: string, agency: string | null): Promise<ContactResult> {
  const query = `"${name}" "${cea}" Singapore property agent contact email phone`;
  const result = await callApifyRAG(null, query);

  const contact: ContactResult = { phone: null, email: null, photo_url: null, source: "google" };

  if (!result) return contact;

  // Extract email addresses
  const emailMatch = result.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) {
    const email = emailMatch[1].toLowerCase();
    // Filter out generic/company emails
    if (!email.includes("noreply") && !email.includes("info@") && !email.includes("admin@") &&
        !email.includes("support@") && !email.includes("hello@") && !email.includes("contact@")) {
      contact.email = email;
    }
  }

  // Extract Singapore phone numbers (8 digits starting with 6, 8, or 9)
  const phoneMatch = result.match(/(?:\+65\s?)?([689]\d{7})/);
  if (phoneMatch) {
    contact.phone = `+65${phoneMatch[1]}`;
  }

  return contact;
}

// ---------------------------------------------------------------------------
// Apify RAG Browser helper
// ---------------------------------------------------------------------------

async function callApifyRAG(startUrl: string | null, query: string): Promise<string | null> {
  const input: Record<string, unknown> = {
    query,
    maxResults: 1,
  };

  if (startUrl) {
    input.startUrls = [{ url: startUrl }];
  }

  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/apify~rag-web-browser/run-sync-get-dataset-items?token=${APIFY_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }
    );

    if (!res.ok) {
      console.error("[apify] RAG browser failed:", res.status);
      return null;
    }

    const items = await res.json();
    if (!Array.isArray(items) || items.length === 0) return null;

    // Combine markdown and text from results
    return [items[0].markdown, items[0].text].filter(Boolean).join("\n");
  } catch (err) {
    console.error("[apify] RAG browser error:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Update agent in database
// ---------------------------------------------------------------------------

interface ContactResult {
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  source: string;
}

async function updateAgentContact(agentId: number, contact: ContactResult) {
  const update: Record<string, unknown> = {
    contact_scraped_at: new Date().toISOString(),
  };

  if (contact.phone) update.phone = contact.phone;
  if (contact.email) update.email = contact.email;
  if (contact.photo_url) update.photo_url = contact.photo_url;

  await supabase
    .from("sg_agents")
    .update(update)
    .eq("id", agentId);
}
