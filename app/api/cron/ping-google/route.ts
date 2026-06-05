import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const BASE = "https://fair-comparisons.com";

/**
 * Daily Google ping cron.
 * Submits updated URLs to Google via the Indexing API and pings the sitemap.
 * Runs daily at 4am SGT (8pm UTC previous day), after revalidation cron.
 *
 * Two mechanisms:
 * 1. Sitemap ping via Google's ping endpoint (no auth needed)
 * 2. Google Indexing API for high-priority URLs (needs service account)
 *
 * The sitemap ping alone is enough to tell Google "something changed."
 * The Indexing API is for pages we want crawled within hours, not days.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, unknown> = {};

  // --- 1. Ping sitemap ---
  try {
    const pingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(`${BASE}/sitemap.xml`)}`;
    const pingRes = await fetch(pingUrl);
    results.sitemap_ping = { status: pingRes.status, ok: pingRes.ok };
  } catch (err) {
    results.sitemap_ping = { error: err instanceof Error ? err.message : String(err) };
  }

  // Also ping Bing
  try {
    const bingUrl = `https://www.bing.com/ping?sitemap=${encodeURIComponent(`${BASE}/sitemap.xml`)}`;
    const bingRes = await fetch(bingUrl);
    results.bing_ping = { status: bingRes.status, ok: bingRes.ok };
  } catch (err) {
    results.bing_ping = { error: err instanceof Error ? err.message : String(err) };
  }

  // --- 2. Google Indexing API (if credentials available) ---
  const indexingKey = process.env.GOOGLE_INDEXING_KEY;
  if (indexingKey) {
    try {
      const priorityUrls = await getPriorityUrls();
      const submitted: string[] = [];
      const failed: string[] = [];

      // Google Indexing API allows ~200 requests/day
      // We submit the most important changed URLs
      for (const url of priorityUrls.slice(0, 100)) {
        try {
          const res = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${indexingKey}`,
            },
            body: JSON.stringify({
              url,
              type: "URL_UPDATED",
            }),
          });
          if (res.ok) {
            submitted.push(url);
          } else {
            failed.push(`${url}: ${res.status}`);
          }
        } catch {
          failed.push(`${url}: fetch error`);
        }
      }

      results.indexing_api = {
        submitted: submitted.length,
        failed: failed.length,
        sample_submitted: submitted.slice(0, 5),
        errors: failed.length > 0 ? failed.slice(0, 5) : undefined,
      };
    } catch (err) {
      results.indexing_api = { error: err instanceof Error ? err.message : String(err) };
    }
  } else {
    results.indexing_api = { skipped: true, reason: "GOOGLE_INDEXING_KEY not set" };
  }

  // --- 3. Find recently changed agent profiles (score changed, newly claimed) ---
  // Log which agents had activity for the revalidation cron to pick up
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentlyChanged } = await supabase
    .from("sg_agents")
    .select("slug")
    .gte("updated_at", oneDayAgo)
    .limit(50);

  const changedUrls = (recentlyChanged ?? []).map(a => `${BASE}/property-agents/agent/${a.slug}`);
  results.recently_changed_profiles = changedUrls.length;

  // Log the cron run
  await supabase.from("sg_funnel_events").insert({
    event: "cron_ping_google",
    metadata: results,
  });

  return NextResponse.json({ ok: true, ...results });
}

/**
 * Get URLs that should be submitted to Google Indexing API.
 * Priority: recently claimed profiles, top agent pages, hub pages.
 */
async function getPriorityUrls(): Promise<string[]> {
  const urls: string[] = [];

  // Always submit core hub pages
  urls.push(
    `${BASE}/`,
    `${BASE}/property-agents`,
    `${BASE}/insights/top-agents-2026`,
    `${BASE}/sitemap.xml`,
  );

  // Recently claimed profiles (highest value - new unique content)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: newClaims } = await supabase
    .from("sg_agents")
    .select("slug")
    .eq("claimed", true)
    .gte("claimed_at", oneDayAgo)
    .limit(20);

  for (const a of newClaims ?? []) {
    urls.push(`${BASE}/property-agents/agent/${a.slug}`);
  }

  // Recently updated profiles (bio, photo changes)
  const { data: updated } = await supabase
    .from("sg_agents")
    .select("slug")
    .gte("updated_at", oneDayAgo)
    .limit(30);

  for (const a of updated ?? []) {
    const url = `${BASE}/property-agents/agent/${a.slug}`;
    if (!urls.includes(url)) urls.push(url);
  }

  // Top 20 agents (always keep these fresh)
  const { data: topAgents } = await supabase
    .from("sg_agents")
    .select("slug")
    .not("score", "is", null)
    .order("score", { ascending: false })
    .limit(20);

  for (const a of topAgents ?? []) {
    const url = `${BASE}/property-agents/agent/${a.slug}`;
    if (!urls.includes(url)) urls.push(url);
  }

  return urls;
}
