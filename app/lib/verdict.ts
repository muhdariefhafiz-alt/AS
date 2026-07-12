// Deterministic, data-driven "verdict" synthesis for an agent profile.
//
// Why this exists: every agent page is built from the same template, so the
// prose is near-identical across ~30k pages (different numbers, same
// sentences). That is exactly the near-duplicate signal that suppresses
// indexation and gives an AI assistant nothing distinctive to quote. This
// composes a short verdict whose SUBSTANCE is driven by each agent's own CEA
// figures (score band, volume, sale-vs-rental lean, seller-vs-buyer lean,
// property focus, area), so two agents only read alike if their records are
// genuinely alike. A per-agent hash varies the phrasing on top.
//
// Honesty rails (PDPA + defamation): every clause is comparative-factual and
// attributable to CEA transaction records. No evaluative verb is applied to a
// named person ("weak", "bad"); we state what the record shows and let the
// reader judge. Nothing here asserts anything the profile body does not.

export type VerdictInput = {
  name: string; // formal display name
  agencyName: string;
  area: string | null; // primary area, short label
  score: number | null; // 0-100 AgentScore
  percentile: number | null; // 0-100, higher = stronger
  txns: number; // transaction_count
  saleShare: number | null; // 0-1: share of txns that are sales (not rentals)
  sellerShare: number | null; // 0-1: of sales with a known side, share seller-side
  specialization: string | null; // e.g. "HDB", "Condo"
  yearsActive: number | null;
  seed: string; // stable per-agent seed (cea_registration) for phrasing variation
};

export type Verdict = { headline: string; body: string };

// Only agents with a real record get a verdict; the rest are noindexed anyway.
export const VERDICT_MIN_TXNS = 10;

function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Independent hash streams from one seed so different phrasing slots vary
// independently (salted), not in lockstep.
function pick<T>(arr: T[], seed: string, salt: string): T {
  return arr[fnv1a(seed + "|" + salt) % arr.length];
}

function bandWord(score: number): string {
  if (score >= 80) return "an exceptional";
  if (score >= 65) return "a strong";
  if (score >= 50) return "an established";
  if (score >= 35) return "a developing";
  return "an early-stage";
}

function volumeWord(txns: number): string {
  if (txns >= 100) return "a high-volume";
  if (txns >= 40) return "an active";
  if (txns >= 15) return "a steady";
  return "a modest";
}

// Map the raw specialization enum to human prose. Returns null for anything we
// do not have a clean label for, so the sentence is simply dropped rather than
// leaking a raw enum like "CONDOMINIUM_APARTMENTS".
function specLabel(spec: string | null): string | null {
  switch ((spec ?? "").toUpperCase()) {
    case "HDB":
      return "HDB";
    case "CONDOMINIUM_APARTMENTS":
      return "condo and apartment";
    case "EXECUTIVE_CONDOMINIUM":
      return "executive condo";
    case "LANDED":
      return "landed";
    case "STRATA_LANDED":
      return "strata-landed";
    default:
      return null;
  }
}

export function buildAgentVerdict(i: VerdictInput): Verdict | null {
  if (i.score == null || i.txns < VERDICT_MIN_TXNS) return null;

  const score = Math.round(i.score);
  const salePct = i.saleShare != null ? Math.round(i.saleShare * 100) : null;
  const sellerPct = i.sellerShare != null ? Math.round(i.sellerShare * 100) : null;
  const areaLabel = i.area || "Singapore";
  const rentalLean = salePct != null && salePct < 40;
  const sellerStrong = sellerPct != null && sellerPct >= 60;
  const buyerHeavy = sellerPct != null && sellerPct < 35;

  // --- Headline: pick the single most decision-relevant angle for a seller. ---
  let headline: string;
  if (rentalLean) {
    headline = pick(
      [
        `Rental-focused record in ${areaLabel}`,
        `Mostly rental deals in ${areaLabel}`,
        `Record leans to rentals in ${areaLabel}`,
      ],
      i.seed,
      "head",
    );
  } else if (sellerStrong && score >= 65) {
    headline = pick(
      [
        `Seller-side sales record in ${areaLabel}`,
        `Listing-side strength in ${areaLabel}`,
        `Strong seller representation in ${areaLabel}`,
      ],
      i.seed,
      "head",
    );
  } else if (buyerHeavy) {
    headline = pick(
      [
        `More buyer-side than seller-side sales`,
        `Record weighted to buyer representation`,
        `Chiefly buyer-side sales in ${areaLabel}`,
      ],
      i.seed,
      "head",
    );
  } else {
    headline = pick(
      [
        `${score >= 65 ? "Strong" : "Established"} track record in ${areaLabel}`,
        `${volumeWord(i.txns).replace("a ", "").replace("an ", "")} record in ${areaLabel}`,
        `Consistent sales record in ${areaLabel}`,
      ],
      i.seed,
      "head",
    ).replace(/^./, (c) => c.toUpperCase());
  }

  // --- Sentence 1: score + volume, with an optional ranking clue. ---
  const rankClue =
    i.percentile != null && i.percentile >= 60
      ? pick(
          [
            `, placing them in the top ${Math.max(1, 100 - i.percentile)}% of Singapore agents by sale-weighted volume`,
            `, among the top ${Math.max(1, 100 - i.percentile)}% of agents nationally on sale-weighted volume`,
          ],
          i.seed,
          "rank",
        )
      : "";
  const s1 = pick(
    [
      `${i.name} holds ${bandWord(i.score)} AgentScore of ${score}/100 on ${i.txns} CEA-recorded transactions${rankClue}.`,
      `On ${i.txns} CEA-recorded transactions, ${i.name} carries ${bandWord(i.score)} AgentScore of ${score}/100${rankClue}.`,
      `${i.name} (${i.agencyName}) records ${volumeWord(i.txns)} history of ${i.txns} CEA transactions, for ${bandWord(i.score)} AgentScore of ${score}/100${rankClue}.`,
    ],
    i.seed,
    "s1",
  );

  // --- Sentence 2: the sale-vs-rental and seller-vs-buyer mix (seller's lens). ---
  let s2 = "";
  if (salePct != null) {
    const saleClause = rentalLean
      ? pick(
          [
            `Rentals make up most of that activity, with ${salePct}% being sales`,
            `Only ${salePct}% of that record is sales rather than rentals`,
          ],
          i.seed,
          "s2a",
        )
      : pick(
          [
            `Sales make up ${salePct}% of that record`,
            `${salePct}% of that activity is sales rather than rentals`,
          ],
          i.seed,
          "s2a",
        );
    const sellerClause =
      sellerPct != null
        ? pick(
            [
              `, and of the sales with a recorded side ${sellerPct}% were seller-side, representing the person selling`,
              `, of which ${sellerPct}% of sided sales had them acting for the seller`,
            ],
            i.seed,
            "s2b",
          )
        : "";
    s2 = `${saleClause}${sellerClause}.`;
  }

  // --- Sentence 3: property focus / experience colour. ---
  const spec = specLabel(i.specialization);
  const specClause = spec
    ? pick(
        [`Their sales concentrate in ${spec} property`, `The record centres on ${spec} transactions`],
        i.seed,
        "s3",
      )
    : null;
  const expClause =
    i.yearsActive != null && i.yearsActive >= 3
      ? `over roughly ${Math.round(i.yearsActive)} years of recorded activity`
      : null;
  let s3 = "";
  if (specClause && expClause) s3 = `${specClause}, ${expClause}.`;
  else if (specClause) s3 = `${specClause}.`;
  else if (expClause) s3 = `The record spans ${expClause}.`;

  const body = [s1, s2, s3].filter(Boolean).join(" ");
  return { headline, body };
}
