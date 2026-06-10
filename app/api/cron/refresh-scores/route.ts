import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Daily score-refresh observability endpoint.
 *
 * The heavy refresh (calculate_agent_scores -> refresh_area_top_agents ->
 * refresh_agent_market_stats) now runs INSIDE Postgres via the pg_cron job
 * "daily-score-refresh" at 18:00 UTC. Those functions scan the full 730k-row
 * transaction table and were timing out under the PostgREST statement limit when
 * called over HTTP, so scores silently went stale. They were moved in-DB, where
 * there is no such timeout. This endpoint no longer triggers them; it records how
 * fresh the scores are and surfaces notable rank moves for the weekly digest. The
 * Vercel revalidate cron (19:00 UTC) re-renders pages after the in-DB refresh.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const results: Record<string, unknown> = {
    refresh: "owned by pg_cron job 'daily-score-refresh' (in-database, runs 18:00 UTC)",
  };

  // Freshness check: how recently did the in-DB job last update scores?
  try {
    const { data } = await supabase
      .from("sg_agents")
      .select("score_updated_at")
      .not("score_updated_at", "is", null)
      .order("score_updated_at", { ascending: false })
      .limit(1)
      .single();
    results.scores_last_updated = data?.score_updated_at ?? null;
  } catch {
    results.scores_last_updated = null;
  }

  // Read-only: notable rank moves for the weekly digest (harmless if previous_score is unset).
  try {
    const { data: topMovers } = await supabase
      .from("sg_agents")
      .select("name, slug, score, previous_score")
      .not("score", "is", null)
      .not("previous_score", "is", null)
      .order("score", { ascending: false })
      .limit(500);

    const movers = (topMovers ?? [])
      .map((a) => ({
        slug: a.slug,
        name: a.name,
        score: Math.round(Number(a.score)),
        prev: Math.round(Number(a.previous_score)),
        delta: Math.round(Number(a.score) - Number(a.previous_score)),
      }))
      .filter((a) => Math.abs(a.delta) >= 2)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 10);

    results.top_movers = movers.length > 0 ? movers : "no significant changes";
  } catch {
    results.top_movers = "previous_score column may not exist yet";
  }

  const duration = Date.now() - started;

  await supabase.from("sg_funnel_events").insert({
    event: "cron_refresh_scores",
    metadata: { ...results, duration_ms: duration },
  });

  return NextResponse.json({ ok: true, duration_ms: duration, ...results });
}
