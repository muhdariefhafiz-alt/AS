/**
 * Validation harness for the per-agent verdict generator (M4).
 *
 * The whole point of the verdict is to ADD uniqueness to near-duplicate agent
 * pages. This proves it does, before we ship it: it generates a verdict for
 * every data-dense agent and measures how alike the outputs are. If the
 * generator is too templated, the gate fails and we do not wire it into the
 * page.
 *
 * Run: npx tsx scripts/verdict-dedup.ts
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { buildAgentVerdict, VERDICT_MIN_TXNS, type VerdictInput } from "../app/lib/verdict";

// Minimal .env.local loader (no dotenv dependency).
function loadEnv() {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const env: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = loadEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

type Row = {
  name: string;
  agency_name: string | null;
  primary_area: string | null;
  score: number | null;
  percentile: number | null;
  transaction_count: number | null;
  sale_share: number | null;
  seller_share: number | null;
  specialization: string | null;
  years_active: number | null;
  cea_registration: string;
};

function toInput(r: Row): VerdictInput {
  const shortArea = r.primary_area ? r.primary_area.split("/")[0].split(",")[0].trim() : null;
  return {
    name: r.name,
    agencyName: (r.agency_name ?? "").replace(/\s+PTE\.?\s+LTD\.?$/i, "").trim() || "their agency",
    area: shortArea,
    score: r.score != null ? Number(r.score) : null,
    percentile: r.percentile,
    txns: r.transaction_count ?? 0,
    saleShare: r.sale_share != null ? Number(r.sale_share) : null,
    sellerShare: r.seller_share != null ? Number(r.seller_share) : null,
    specialization: r.specialization,
    yearsActive: r.years_active != null ? Number(r.years_active) : null,
    seed: r.cea_registration,
  };
}

function trigrams(text: string): Set<string> {
  const words = text.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  const grams = new Set<string>();
  for (let i = 0; i + 2 < words.length; i++) grams.add(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  return grams;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const g of a) if (b.has(g)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

async function main() {
  // Pull the data-dense population (the set that would get a verdict).
  const PAGE = 1000;
  let from = 0;
  const rows: Row[] = [];
  while (rows.length < 6000) {
    const { data, error } = await supabase
      .from("sg_agents")
      .select(
        "name, agency_name, primary_area, score, percentile, transaction_count, sale_share, seller_share, specialization, years_active, cea_registration",
      )
      .not("score", "is", null)
      .gte("transaction_count", VERDICT_MIN_TXNS)
      .order("transaction_count", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...(data as Row[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }

  const texts: string[] = [];
  const headlines: string[] = [];
  let nullCount = 0;
  for (const r of rows) {
    const v = buildAgentVerdict(toInput(r));
    if (!v) {
      nullCount++;
      continue;
    }
    texts.push(`${v.headline}. ${v.body}`);
    headlines.push(v.headline);
  }

  const n = texts.length;
  const uniqueTexts = new Set(texts);
  const uniqueHeadlines = new Set(headlines);

  // Exact-duplicate rate.
  const exactDupRate = 1 - uniqueTexts.size / n;

  // Sampled pairwise trigram Jaccard (full pairwise is O(n^2)).
  const grams = texts.map(trigrams);
  const SAMPLES = 40000;
  let sum = 0;
  let nearDup = 0; // Jaccard > 0.7
  let high = 0; // Jaccard > 0.5
  const dist: number[] = [];
  for (let s = 0; s < SAMPLES; s++) {
    const i = Math.floor((fnvRand(s * 2 + 1) % n));
    let j = Math.floor((fnvRand(s * 2 + 2) % n));
    if (j === i) j = (j + 1) % n;
    const sim = jaccard(grams[i], grams[j]);
    sum += sim;
    dist.push(sim);
    if (sim > 0.7) nearDup++;
    if (sim > 0.5) high++;
  }
  dist.sort((a, b) => a - b);
  const mean = sum / SAMPLES;
  const p95 = dist[Math.floor(SAMPLES * 0.95)];
  const p99 = dist[Math.floor(SAMPLES * 0.99)];
  const max = dist[SAMPLES - 1];

  const avgTrigrams = grams.reduce((s, g) => s + g.size, 0) / n;

  const pass =
    exactDupRate < 0.02 && nearDup / SAMPLES < 0.01 && uniqueTexts.size / n > 0.95;

  console.log("=== VERDICT DEDUP REPORT ===");
  console.log(`agents pulled          : ${rows.length}`);
  console.log(`verdicts generated     : ${n}  (null/too-thin: ${nullCount})`);
  console.log(`distinct full texts    : ${uniqueTexts.size}  (${((uniqueTexts.size / n) * 100).toFixed(2)}%)`);
  console.log(`distinct headlines     : ${uniqueHeadlines.size}`);
  console.log(`exact-duplicate rate   : ${(exactDupRate * 100).toFixed(2)}%`);
  console.log(`avg trigrams / verdict : ${avgTrigrams.toFixed(1)}`);
  console.log(`--- sampled pairwise trigram Jaccard (${SAMPLES} random pairs) ---`);
  console.log(`mean                   : ${mean.toFixed(3)}`);
  console.log(`p95 / p99 / max        : ${p95.toFixed(3)} / ${p99.toFixed(3)} / ${max.toFixed(3)}`);
  console.log(`pairs Jaccard > 0.5    : ${((high / SAMPLES) * 100).toFixed(2)}%`);
  console.log(`pairs Jaccard > 0.7    : ${((nearDup / SAMPLES) * 100).toFixed(2)}%  (near-duplicate)`);
  console.log("");
  console.log(`GATE: ${pass ? "PASS ✅" : "FAIL ❌"}  (need exactDup<2%, nearDup<1%, distinct>95%)`);
  console.log("");
  console.log("--- 3 sample verdicts ---");
  for (const t of [texts[0], texts[Math.floor(n / 2)], texts[n - 1]]) console.log("• " + t + "\n");
  process.exit(pass ? 0 : 1);
}

// Small deterministic PRNG so the sampled pairs are reproducible run-to-run.
function fnvRand(x: number): number {
  let h = 0x811c9dc5 ^ x;
  h = Math.imul(h, 0x01000193);
  h ^= h >>> 15;
  return h >>> 0;
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
