/**
 * One-off AI-citation baseline runner. Same loop as
 * app/api/cron/ai-tracker-scan/route.ts but run LOCALLY so a full
 * queries x surfaces sweep is not subject to the Vercel function cap.
 * Writes to the same sg_ai_tracker_runs / sg_ai_tracker_brand_hits tables,
 * so the admin AI Search tab and sg_ai_tracker_sov_latest pick it up.
 *
 * Usage:
 *   set -a; source .env.local; set +a
 *   DATAFORSEO_LOGIN=... DATAFORSEO_PASSWORD=... npx tsx scripts/ai-baseline.ts [surface]
 *
 * [surface] one of google_aio|chatgpt|perplexity|claude, default: all four.
 */
import { supabaseAdmin } from "../app/lib/supabase";
import { fetchSurface, AI_SURFACES, AiBudgetError } from "../app/lib/dataforseo-ai";

async function main() {
  const arg = process.argv[2];
  const surfaces = arg
    ? (AI_SURFACES as readonly string[]).includes(arg)
      ? [arg]
      : (() => {
          throw new Error(`Unknown surface: ${arg}`);
        })()
    : [...AI_SURFACES];

  const sb = supabaseAdmin();
  const [{ data: queries }, { data: brands }] = await Promise.all([
    sb.from("sg_ai_tracker_queries").select("id, query").eq("is_active", true).order("id"),
    sb.from("sg_ai_tracker_brands").select("domain, name_pattern, kind").eq("is_active", true),
  ]);
  if (!queries?.length) throw new Error("No active queries");
  const brandList = brands ?? [];
  console.log(`Baseline: ${queries.length} queries x ${surfaces.length} surfaces, ${brandList.length} brands`);

  let totalCost = 0;
  for (const surface of surfaces) {
    let present = 0;
    for (const q of queries) {
      try {
        const r = await fetchSurface(surface, q.query as string);
        totalCost += r.cost;
        const refBlob = r.references.map((x) => `${x.domain} ${x.url}`.toLowerCase()).join(" ");

        const { data: run, error: runErr } = await sb
          .from("sg_ai_tracker_runs")
          .insert({
            query_id: q.id,
            surface,
            aio_present: r.present,
            answer_excerpt: r.answerText.slice(0, 1500) || null,
            ref_count: r.references.length,
            cost_usd: r.cost,
            raw: r.present ? { references: r.references.slice(0, 30) } : null,
          })
          .select("id")
          .single();
        if (runErr || !run) throw new Error(`run insert: ${runErr?.message}`);
        if (r.present) present++;

        const hits = brandList.map((b) => {
          const domain = String(b.domain).toLowerCase();
          const pat = String(b.name_pattern ?? "");
          let mentioned = false;
          if (r.present && pat) {
            try {
              mentioned = new RegExp(pat, "i").test(r.answerText);
            } catch {
              mentioned = r.answerText.toLowerCase().includes(pat.toLowerCase());
            }
          }
          return {
            run_id: run.id,
            query_id: q.id,
            surface,
            brand_domain: b.domain,
            brand_kind: b.kind,
            cited: refBlob.includes(domain),
            mentioned,
          };
        });
        if (hits.length) {
          const { error: hitErr } = await sb.from("sg_ai_tracker_brand_hits").insert(hits);
          if (hitErr) throw new Error(`hits insert: ${hitErr.message}`);
        }
        const fcHit = hits.find((h) => h.brand_domain === "fair-comparisons.com");
        console.log(
          `[${surface}] "${q.query}" present=${r.present} refs=${r.references.length}` +
            ` FC:${fcHit?.cited ? "CITED" : fcHit?.mentioned ? "mentioned" : "-"} $${r.cost.toFixed(4)}`
        );
      } catch (err) {
        if (err instanceof AiBudgetError) {
          console.error(`BUDGET STOP: ${(err as Error).message}`);
          console.log(`Total spend this run: $${totalCost.toFixed(4)}`);
          process.exit(2);
        }
        console.error(`[${surface}] "${q.query}" FAILED: ${(err as Error).message}`);
      }
    }
    console.log(`== ${surface}: ${present}/${queries.length} answers present ==`);
  }
  console.log(`Total spend this run: $${totalCost.toFixed(4)}`);
}

main().then(() => process.exit(0));
