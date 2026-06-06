// Single source of truth for agent subscription tiers. Pure module (no deps),
// so both client and server components can import it safely.
//
// IMPORTANT: subscriptions buy TOOLS only (badge, analytics, data). They NEVER
// change ranking position or search order, which stays purely by AgentScore.
// Do not add any feature that reorders agents by payment (pay-to-rank conflicts
// with the "rankings cannot be bought" promise and the defamation guidance).
export type Tier = "free" | "verified" | "professional" | "elite";

export const TIER_ORDER: Tier[] = ["free", "verified", "professional", "elite"];

export const TIER_LABEL: Record<Tier, string> = {
  free: "Free",
  verified: "Verified",
  professional: "Professional",
  elite: "Elite",
};

// Monthly SGD price for the paid tiers.
export const TIER_PRICE: Record<Exclude<Tier, "free">, number> = {
  verified: 29,
  professional: 69,
  elite: 149,
};

function norm(tier: Tier | string | null | undefined): Tier {
  return tier && (TIER_ORDER as string[]).includes(tier) ? (tier as Tier) : "free";
}

/** True when `tier` is `min` or higher (e.g. tierAtLeast("elite", "verified")). */
export function tierAtLeast(tier: Tier | string | null | undefined, min: Tier): boolean {
  return TIER_ORDER.indexOf(norm(tier)) >= TIER_ORDER.indexOf(min);
}

/** True for any paid subscription (verified and up). */
export function isPaid(tier: Tier | string | null | undefined): boolean {
  return tierAtLeast(tier, "verified");
}
