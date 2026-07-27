import Stripe from "stripe";

/**
 * Lazy-init Stripe to avoid build-time errors when STRIPE_SECRET_KEY
 * is not in the environment (e.g. during `next build` in CI).
 */
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    _stripe = new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
  }
  return _stripe;
}

/**
 * Price IDs - set in Vercel env vars.
 * Create these recurring prices in Stripe Dashboard > Products:
 *   - Verified:     S$29/mo  recurring  -> STRIPE_PRICE_VERIFIED
 *   - Professional: S$69/mo  recurring  -> STRIPE_PRICE_PROFESSIONAL
 *   - Elite:        S$149/mo recurring  -> STRIPE_PRICE_ELITE
 * These are SaaS reputation/analytics tiers (licence-safe), NOT lead routing.
 */
export const PRICE_IDS = {
  verified: process.env.STRIPE_PRICE_VERIFIED!,
  professional: process.env.STRIPE_PRICE_PROFESSIONAL!,
  elite: process.env.STRIPE_PRICE_ELITE!,
} as const;

// Tier type + prices live in app/lib/tiers.ts (single source of truth).
