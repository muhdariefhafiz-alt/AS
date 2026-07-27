import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const BASE = "https://fair-comparisons.com";
const INDEXNOW_KEY = "ce213220a492a098fc85da7eb9657a6b";
// IndexNow protocol maximum per POST
const INDEXNOW_BATCH = 10000;

/**
 * Daily indexing cron.
 * Runs daily at 4am SGT (8pm UTC previous day), after revalidation cron.
 *
 * Two mechanisms:
 * 1. IndexNow (api.indexnow.org): submits agent profile URLs changed in the
 *    last 24h. Key file is served from public/. A one-time bulk submit of the
 *    full 29,806-URL universe was done manually on 2026-07-27, so this cron
 *    only needs the daily delta.
 * 2. Google Indexing API for high-priority URLs (needs service account,
 *    env-gated on GOOGLE_INDEXING_KEY).
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, unknown> = {};

  // --- 1. IndexNow: submit agent profiles changed in the last 24h ---
  const changedUrls = await getChangedAgentUrls();
  results.recently_changed_profiles = changedUrls.length;

  if (changedUrls.length > 0) {
    const batches: Record<string, unknown>[] = [];
    for (let i = 0; i < changedUrls.length; i += INDEXNOW_BATCH) {
      const urlList = changedUrls.slice(i, i + INDEXNOW_BATCH);
      try {
        const res = await fetch("https://api.indexnow.org/indexnow", {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({
            host: "fair-comparisons.com",
            key: INDEXNOW_KEY,
            keyLocation: `${BASE}/${INDEXNOW_KEY}.txt`,
            urlList,
          }),
        });
        batches.push({ status: res.status, ok: res.ok, count: urlList.length });
      } catch (err) {
        batches.push({ count: urlList.length, error: err instanceof Error ? err.message : String(err) });
      }
    }
    results.indexnow = { submitted: changedUrls.length, batches };
  } else {
    results.indexnow = { skipped: true, reason: "no changed agent URLs in last 24h" };
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

  // Log the cron run
  await supabase.from("sg_funnel_events").insert({
    event: "cron_ping_google",
    metadata: results,
  });

  return NextResponse.json({ ok: true, ...results });
}

/**
 * All agent profile URLs whose sg_agents row changed in the last 24h.
 * Paginates past Supabase's 1000-row response cap so a bulk update
 * (e.g. a full score recalc) still yields the complete delta.
 */
async function getChangedAgentUrls(): Promise<string[]> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const urls: string[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("sg_agents")
      .select("slug")
      .gte("updated_at", oneDayAgo)
      .order("slug")
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    for (const a of data) urls.push(`${BASE}/property-agents/agent/${a.slug}`);
    if (data.length < PAGE) break;
  }
  return urls;
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
