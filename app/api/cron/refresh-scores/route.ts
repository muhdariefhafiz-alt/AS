import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Daily score refresh cron.
 * Recalculates AgentScores using the latest transaction data.
 * Runs daily at 2am SGT (6pm UTC previous day), before revalidation.
 *
 * Flow: refresh-scores (2am) -> revalidate (3am) -> ping-google (4am)
 *
 * This ensures:
 * 1. Scores reflect the latest CEA transaction data
 * 2. Pages show updated scores after revalidation
 * 3. Google gets pinged with the freshest content
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const results: Record<string, unknown> = {};

  // --- 1. Refresh AgentScores via Supabase RPC ---
  // This calls the calculate_agent_scores() function in Supabase
  // which recalculates scores from sg_transactions data
  try {
    const { data, error } = await supabase.rpc("calculate_agent_scores");
    if (error) {
      results.score_refresh = { error: error.message };
    } else {
      results.score_refresh = { ok: true, result: data };
    }
  } catch (err) {
    // If the RPC doesn't exist yet, we fall back to a simpler approach
    results.score_refresh = {
      skipped: true,
      reason: err instanceof Error ? err.message : "RPC not available",
    };
  }

  // --- 2. Update percentile rankings ---
  // Recalculate where each agent sits relative to all others
  try {
    const { data, error } = await supabase.rpc("update_agent_percentiles");
    if (error) {
      results.percentile_update = { error: error.message };
    } else {
      results.percentile_update = { ok: true, result: data };
    }
  } catch (err) {
    results.percentile_update = {
      skipped: true,
      reason: err instanceof Error ? err.message : "RPC not available",
    };
  }

  // --- 3. Refresh area top agents materialized view ---
  try {
    const { data, error } = await supabase.rpc("refresh_area_top_agents");
    if (error) {
      results.area_refresh = { error: error.message };
    } else {
      results.area_refresh = { ok: true, result: data };
    }
  } catch (err) {
    results.area_refresh = {
      skipped: true,
      reason: err instanceof Error ? err.message : "RPC not available",
    };
  }

  // --- 4. Update transaction counts (fast, always works) ---
  try {
    const { error } = await supabase.rpc("update_transaction_counts");
    if (error) {
      // Fallback: direct SQL update
      const { error: fallbackErr } = await supabase.rpc("exec_sql", {
        query: `
          UPDATE sg_agents a
          SET transaction_count = sub.cnt,
              updated_at = NOW()
          FROM (
            SELECT agent_registration, COUNT(*) as cnt
            FROM sg_transactions
            GROUP BY agent_registration
          ) sub
          WHERE a.cea_registration = sub.agent_registration
            AND (a.transaction_count IS NULL OR a.transaction_count != sub.cnt)
        `,
      });
      results.txn_count_update = fallbackErr
        ? { error: fallbackErr.message }
        : { ok: true, method: "fallback_sql" };
    } else {
      results.txn_count_update = { ok: true };
    }
  } catch (err) {
    results.txn_count_update = {
      skipped: true,
      reason: err instanceof Error ? err.message : "RPC not available",
    };
  }

  // --- 5. Detect and log ranking changes ---
  // Useful for the weekly digest: "Agent X moved up 5 spots"
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

  // Log the cron run
  await supabase.from("sg_funnel_events").insert({
    event: "cron_refresh_scores",
    metadata: { ...results, duration_ms: duration },
  });

  return NextResponse.json({
    ok: true,
    duration_ms: duration,
    ...results,
  });
}
