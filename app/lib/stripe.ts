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

/** @deprecated Use getStripe() for lazy init. Kept for backwards compat. */
export const stripe = undefined as unknown as Stripe;

/**
 * Price IDs - set in Vercel env vars.
 * Create these in Stripe Dashboard > Products:
 *   - Pro:     S$99/mo  recurring
 *   - Premium: S$299/mo recurring
 */
export const PRICE_IDS = {
  pro: process.env.STRIPE_PRICE_PRO!,
  premium: process.env.STRIPE_PRICE_PREMIUM!,
} as const;

export type Tier = "free" | "pro" | "premium";
