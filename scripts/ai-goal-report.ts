/**
 * Weekly AI-citation goal scorecard.
 * Goal (set 2 Jul 2026): 100 citations/week across ChatGPT, Google AI, Claude.
 *
 * Prints the two instruments side by side:
 *  1. Probe SOV: latest tracker run per query/surface (sg_ai_tracker_sov_latest),
 *     FairComparisons rows only.
 *  2. Real referrals: page_views whose referrer/UTM identifies an AI assistant
 *     (clicked citations, the measured floor of citation exposure).
 *
 * Usage:
 *   set -a; source .env.local; set +a
 *   npx tsx scripts/ai-goal-report.ts
 */
import { supabaseAdmin } from "../app/lib/supabase";

const GOAL_PER_WEEK = 100;
const BASELINE = "2 Jul 2026: 5 probe-cited of 60 answers (ChatGPT 1, AIO 2, Claude 1, Perplexity 1); 12 ChatGPT referrals/7d";

function aiSource(referrer: string, utm: string): string {
  const r = `${referrer} ${utm}`.toLowerCase();
  if (r.includes("chatgpt") || r.includes("openai")) return "ChatGPT";
  if (r.includes("perplexity")) return "Perplexity";
  if (r.includes("gemini") || r.includes("bard.google")) return "Gemini";
  if (r.includes("claude") || r.includes("anthropic")) return "Claude";
  if (r.includes("copilot")) return "Copilot";
  return "Other AI";
}

async function main() {
  const sb = supabaseAdmin();
  const since30 = new Date(Date.now() - 30 * 86400_000).toISOString();

  const [{ data: sov }, { data: lastRun }, { data: refRows }] = await Promise.all([
    sb.from("sg_ai_tracker_sov_latest").select("*").eq("brand_domain", "fair-comparisons.com"),
    sb.from("sg_ai_tracker_runs").select("captured_at").order("captured_at", { ascending: false }).limit(1),
    sb
      .from("page_views")
      .select("referrer, utm_source, path, created_at, host")
      .gte("created_at", since30)
      .or(
        "referrer.ilike.%chatgpt%,referrer.ilike.%openai%,referrer.ilike.%perplexity%,referrer.ilike.%gemini%,referrer.ilike.%bard.google%,referrer.ilike.%claude%,referrer.ilike.%anthropic%,referrer.ilike.%copilot%,utm_source.ilike.%openai%,utm_source.ilike.%chatgpt%,utm_source.ilike.%perplexity%"
      )
      .limit(5000),
  ]);

  console.log("=== AI-CITATION GOAL SCORECARD ===");
  console.log(`Goal: ${GOAL_PER_WEEK} citations/week in ChatGPT, Google AI, Claude`);
  console.log(`Baseline: ${BASELINE}\n`);

  console.log("-- Instrument 1: probe share of voice (latest tracker run) --");
  const runAt = lastRun?.[0]?.captured_at ? String(lastRun[0].captured_at).slice(0, 10) : "never";
  console.log(`Last tracker run: ${runAt}`);
  let probeCited = 0;
  let probeTotal = 0;
  for (const r of sov ?? []) {
    probeCited += Number(r.cited_queries || 0);
    probeTotal += Number(r.total_queries || 0);
    console.log(
      `  ${String(r.surface).padEnd(11)} cited ${r.cited_queries}/${r.total_queries}  mentioned ${r.mentioned_queries}  presence ${r.presence_pct}%`
    );
  }
  console.log(`  TOTAL probe-cited: ${probeCited} of ${probeTotal} tracked answers\n`);

  console.log("-- Instrument 2: real AI referrals (clicked citations) --");
  const cutoff7 = Date.now() - 7 * 86400_000;
  const refs = (refRows ?? []).filter((r) => !r.host || r.host === "fair-comparisons.com");
  const bySrc = new Map<string, { d7: number; d30: number }>();
  for (const r of refs) {
    const s = aiSource(String(r.referrer ?? ""), String(r.utm_source ?? ""));
    const e = bySrc.get(s) ?? { d7: 0, d30: 0 };
    e.d30++;
    if (new Date(String(r.created_at)).getTime() >= cutoff7) e.d7++;
    bySrc.set(s, e);
  }
  let clicked7 = 0;
  for (const [s, e] of [...bySrc.entries()].sort((a, b) => b[1].d7 - a[1].d7)) {
    clicked7 += e.d7;
    console.log(`  ${s.padEnd(11)} 7d ${e.d7}   30d ${e.d30}`);
  }
  if (bySrc.size === 0) console.log("  (no AI-referred visits in the last 30 days)");

  console.log(`\n== VERDICT ==`);
  console.log(`Measured clicked citations this week: ${clicked7} (goal surface subset included)`);
  console.log(`Probe-cited answers, latest sweep:    ${probeCited}/${probeTotal}`);
  console.log(
    clicked7 >= GOAL_PER_WEEK
      ? `GOAL MET on the clicked-citation instrument (${clicked7} >= ${GOAL_PER_WEEK}/week).`
      : `Goal not yet met: ${clicked7}/${GOAL_PER_WEEK} clicked citations this week. Clicked visits undercount citation exposure (most citations are read, not clicked); the probe sweep samples the unclicked share.`
  );
}

main().then(() => process.exit(0));
