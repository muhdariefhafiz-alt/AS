import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import {
  fetchSurface,
  AI_SURFACES,
  AI_TRACKER_DISABLED,
  AiBudgetError,
  aiCredsConfigured,
} from "../../../lib/dataforseo-ai";

/**
 * AI-answer tracker. For each active query + surface (Google AI Overview,
 * ChatGPT, Perplexity) it records, per tracked brand, whether it is MENTIONED
 * (name in the answer text) and/or CITED (domain in references). Feeds
 * sg_ai_tracker_sov_latest.
 *
 * Cron: GET /api/cron/ai-tracker-scan (Mon). Manual: ?surface=google_aio|chatgpt|
 * perplexity (default all), ?max=N. AIO runs first so a cut-short run keeps the
 * primary surface; the SG-scoped budget guard breaks cleanly.
 *
 * Dormant until DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD are set in the env.
 */

export const runtime = "nodejs";
export const maxDuration = 300;

const DEFAULT_MAX = Number(process.env.DATAFORSEO_AI_MAX_QUERIES_PER_RUN || 60);

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (AI_TRACKER_DISABLED) return NextResponse.json({ skipped: "DATAFORSEO_AI_DISABLED" });
  if (!aiCredsConfigured()) return NextResponse.json({ skipped: "DATAFORSEO creds not configured" });

  const url = new URL(req.url);
  const maxQueries = Math.min(Number(url.searchParams.get("max") || DEFAULT_MAX), 200);
  const surfaceParam = url.searchParams.get("surface");
  const surfaces =
    surfaceParam && (AI_SURFACES as readonly string[]).includes(surfaceParam)
      ? [surfaceParam]
      : [...AI_SURFACES];

  const sb = supabaseAdmin();
  const [{ data: queries }, { data: brands }] = await Promise.all([
    sb.from("sg_ai_tracker_queries").select("id, query").eq("is_active", true).order("id", { ascending: true }).limit(maxQueries),
    sb.from("sg_ai_tracker_brands").select("domain, name_pattern, kind").eq("is_active", true),
  ]);
  if (!queries || queries.length === 0) {
    return NextResponse.json({ message: "No active queries", processed: 0 });
  }
  const brandList = brands ?? [];

  const perSurface: Record<string, { processed: number; present: number }> = {};
  let stoppedOnBudget = false;

  outer: for (const surface of surfaces) {
    perSurface[surface] = { processed: 0, present: 0 };
    for (const q of queries) {
      try {
        const r = await fetchSurface(surface, q.query as string);
        const refBlob = r.references.map((x) => `${x.domain} ${x.url}`.toLowerCase()).join(" ");
        const lowerText = r.answerText.toLowerCase();

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
        if (r.present) perSurface[surface].present++;

        const hits = brandList.map((b) => {
          const domain = String(b.domain).toLowerCase();
          const pat = String(b.name_pattern ?? "");
          let mentioned = false;
          if (r.present && pat) {
            try {
              mentioned = new RegExp(pat, "i").test(r.answerText);
            } catch {
              mentioned = lowerText.includes(pat.toLowerCase());
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
        if (hits.length > 0) {
          const { error: hitErr } = await sb.from("sg_ai_tracker_brand_hits").insert(hits);
          if (hitErr) throw new Error(`hits insert: ${hitErr.message}`);
        }
        perSurface[surface].processed++;
      } catch (err) {
        if (err instanceof AiBudgetError) {
          stoppedOnBudget = true;
          break outer;
        }
        throw err;
      }
    }
  }

  return NextResponse.json({
    surfaces,
    queries: queries.length,
    brands_tracked: brandList.length,
    per_surface: perSurface,
    stopped_on_budget: stoppedOnBudget,
  });
}
