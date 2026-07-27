import { NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "../../../lib/supabase";
import {
  gscConfigured,
  gscAccessToken,
  gscAccessTokenFull,
  querySearchAnalytics,
  submitSitemap,
  inspectUrl,
} from "../../../lib/gsc";
import {
  AGENT_INDEX_MIN_TXNS,
  agentSitemapShardCount,
  countIndexableAgents,
} from "../../../lib/indexable";

// Daily indexation scoreboard for the agent-page universe (~29.7k scored
// agents). Three jobs in one run:
//   1. (Re)submit the root sitemap + every agent shard to Search Console via
//      the API. This replaces the deprecated google.com/ping endpoint and is
//      the only "tell Google" mechanism we control. Idempotent.
//   2. Pull the trailing-28d GSC page dimension filtered to agent pages: the
//      count of distinct URLs with impressions is the broadest honest
//      "indexed and serving" measure.
//   3. URL-inspect a rotating stratified sample (dense tier + middle tail) for
//      a precise indexation-rate estimate that accumulates day over day.
// Writes one row per day into sg_index_coverage; the admin SEO tab renders
// the trend against the 29.7k target.

export const maxDuration = 300;

const BASE = "https://fair-comparisons.com";
const SAMPLE_PER_TIER = 10;

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

type TierSample = { size: number; indexed: number; states: Record<string, number> };

async function sampleTier(
  token: string,
  tier: "dense" | "tail",
  dayOfYear: number
): Promise<TierSample> {
  const base = () => {
    const q = supabase.from("sg_agents").select("slug").not("score", "is", null).not("slug", "is", null);
    return tier === "dense"
      ? q.or(`transaction_count.gte.${AGENT_INDEX_MIN_TXNS},claimed.eq.true`)
      : q.lt("transaction_count", AGENT_INDEX_MIN_TXNS).eq("claimed", false);
  };
  const headQ = supabase.from("sg_agents").select("id", { count: "exact", head: true }).not("score", "is", null).not("slug", "is", null);
  const head = await (tier === "dense"
    ? headQ.or(`transaction_count.gte.${AGENT_INDEX_MIN_TXNS},claimed.eq.true`)
    : headQ.lt("transaction_count", AGENT_INDEX_MIN_TXNS).eq("claimed", false));
  const tierCount = head.count ?? 0;
  // Deterministic daily rotation through the tier so the sample sweeps the
  // whole set over time instead of re-inspecting the same head rows.
  const offset = tierCount > SAMPLE_PER_TIER ? (dayOfYear * SAMPLE_PER_TIER) % (tierCount - SAMPLE_PER_TIER) : 0;

  const { data } = await base()
    .order("score", { ascending: false })
    .order("id", { ascending: true })
    .range(offset, offset + SAMPLE_PER_TIER - 1);

  const out: TierSample = { size: 0, indexed: 0, states: {} };
  for (const row of data ?? []) {
    try {
      const { coverageState } = await inspectUrl(token, `${BASE}/property-agents/agent/${row.slug}`);
      out.size += 1;
      out.states[coverageState] = (out.states[coverageState] ?? 0) + 1;
      if (coverageState === "Submitted and indexed" || coverageState === "Indexed, not submitted in sitemap") {
        out.indexed += 1;
      }
    } catch {
      // Quota or transient error: record what we have; never fail the run.
      break;
    }
  }
  return out;
}

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  if (!gscConfigured()) {
    return NextResponse.json({ ok: false, reason: "GSC not configured (set GSC_SA_EMAIL + GSC_SA_PRIVATE_KEY)" });
  }

  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - Date.UTC(now.getUTCFullYear(), 0, 0)) / 86_400_000);
  const notes: Record<string, unknown> = {};

  // ---- 1. Sitemap submission (full scope; degrade honestly on 403) ----
  let sitemapsSubmitted = 0;
  try {
    const rwToken = await gscAccessTokenFull();
    const shards = agentSitemapShardCount(await countIndexableAgents());
    const feeds = [`${BASE}/sitemap.xml`, ...Array.from({ length: shards }, (_, i) => `${BASE}/property-agents/sitemap/${i}.xml`)];
    for (const feed of feeds) {
      try {
        await submitSitemap(rwToken, feed);
        sitemapsSubmitted += 1;
      } catch (err) {
        notes.submit_error = err instanceof Error ? err.message.slice(0, 300) : String(err);
        // A 403 means the service account is Restricted on the property:
        // every PUT will fail, so stop instead of hammering the API.
        if (notes.submit_error && String(notes.submit_error).includes("403")) break;
      }
    }
  } catch (err) {
    notes.submit_error = err instanceof Error ? err.message.slice(0, 300) : String(err);
  }

  // ---- 2 + 3 need only the read scope ----
  let pagesWithImpressions: number | null = null;
  let agentClicks: number | null = null;
  let agentImpressions: number | null = null;
  let sample: { dense: TierSample; tail: TierSample } | null = null;
  try {
    const roToken = await gscAccessToken();

    const end = new Date(now.getTime() - 2 * 86_400_000); // GSC lag
    const start = new Date(now.getTime() - 30 * 86_400_000);
    const pageRows = await querySearchAnalytics(roToken, {
      startDate: ymd(start),
      endDate: ymd(end),
      dimensions: ["page"],
      rowLimit: 25000,
      dimensionFilterGroups: [
        { filters: [{ dimension: "page", operator: "contains", expression: "/property-agents/agent/" }] },
      ],
    });
    pagesWithImpressions = pageRows.length;
    agentClicks = Math.round(pageRows.reduce((s, r) => s + (r.clicks ?? 0), 0));
    agentImpressions = Math.round(pageRows.reduce((s, r) => s + (r.impressions ?? 0), 0));

    const dense = await sampleTier(roToken, "dense", dayOfYear);
    const tail = await sampleTier(roToken, "tail", dayOfYear);
    sample = { dense, tail };
    notes.sample = sample;
  } catch (err) {
    notes.read_error = err instanceof Error ? err.message.slice(0, 300) : String(err);
  }

  const row = {
    date: ymd(now),
    agent_pages_with_impressions: pagesWithImpressions,
    agent_clicks: agentClicks,
    agent_impressions: agentImpressions,
    sample_size: sample ? sample.dense.size + sample.tail.size : null,
    sample_indexed: sample ? sample.dense.indexed + sample.tail.indexed : null,
    sitemaps_submitted: sitemapsSubmitted,
    notes,
    fetched_at: now.toISOString(),
  };
  const { error } = await supabaseAdmin().from("sg_index_coverage").upsert(row, { onConflict: "date" });

  return NextResponse.json({ ok: !error, ...row, db_error: error?.message ?? null });
}
