import Stripe from "stripe";

/**
 * Lazy-init Stripe to avoid build-time errors when STRIPE_SECRET_KEY
 * is not in the environment (e.g. during `next build` in CI).
 */
let _stripe: Stripe | null = null;
let _stripeTest: Stripe | null = null;

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
 * TEST-MODE Stripe client. Used ONLY for sandbox accounts (sg_agents.is_sandbox)
 * so the owner can run a genuine, no-money checkout with a Stripe test card
 * (4242 4242 4242 4242) without touching the live payment path real agents use.
 * Requires STRIPE_TEST_SECRET_KEY (sk_test_...). Inert until that is set.
 */
export function stripeTestConfigured(): boolean {
  return Boolean(process.env.STRIPE_TEST_SECRET_KEY);
}

export function getStripeTest(): Stripe {
  const key = process.env.STRIPE_TEST_SECRET_KEY;
  if (!key) throw new Error("STRIPE_TEST_SECRET_KEY is not set");
  if (!key.startsWith("sk_test_")) {
    // Hard guard: a live key here would defeat the whole point (real charges).
    throw new Error("STRIPE_TEST_SECRET_KEY must be a Stripe test-mode key (sk_test_...)");
  }
  if (!_stripeTest) {
    _stripeTest = new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
  }
  return _stripeTest;
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
