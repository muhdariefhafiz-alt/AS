import type Stripe from "stripe";
import { getStripe, getStripeTest, PRICE_IDS } from "./stripe";
import { TIER_PRICE, type Tier } from "./tiers";

// Stripe customer-portal + checkout helpers, shared by /api/billing/portal,
// /api/checkout and /api/checkout/confirm. The portal configuration is created
// lazily on first use and found again by metadata, so there is no manual
// dashboard setup step to forget. SECURITY: a portal session grants full
// billing control (card, cancel, plan) for the customer, so callers must only
// create one for an AUTHENTICATED agent whose claimed_email owns that customer.
//
// Test mode: sandbox accounts (sg_agents.is_sandbox) run every billing call
// against the Stripe TEST client so the owner can rehearse the whole flow with
// a test card and no money moves. Non-sandbox agents ALWAYS use the live
// client, byte-for-byte as before; the test branch is never reachable for them.

// Separate marker per mode so the live and test portal configs never collide.
const CONFIG_MARKER_LIVE = "fc_agent_portal_v1";
const CONFIG_MARKER_TEST = "fc_agent_portal_test_v1";

/** Pick the Stripe client for an agent. Sandbox -> test (if configured). */
export function stripeForSandbox(isSandbox: boolean): { stripe: Stripe; test: boolean } {
  if (isSandbox) {
    // getStripeTest throws if STRIPE_TEST_SECRET_KEY is unset/not a test key.
    return { stripe: getStripeTest(), test: true };
  }
  return { stripe: getStripe(), test: false };
}

// subscription_update.products needs product ids with their allowed prices.
// LIVE mode resolves the three env-configured price ids. TEST mode has no
// pre-created prices (checkout builds them inline), so plan-switch-by-portal is
// simply disabled there; the sandbox can still cancel and change card, and can
// switch plans by starting a fresh test checkout.
async function portalProducts(stripe: Stripe, test: boolean): Promise<{ product: string; prices: string[] }[]> {
  if (test) return [];
  const byProduct = new Map<string, string[]>();
  for (const priceId of Object.values(PRICE_IDS)) {
    if (!priceId) continue;
    const price = await stripe.prices.retrieve(priceId);
    const productId = typeof price.product === "string" ? price.product : price.product.id;
    byProduct.set(productId, [...(byProduct.get(productId) ?? []), priceId]);
  }
  return [...byProduct.entries()].map(([product, prices]) => ({ product, prices }));
}

export async function ensurePortalConfiguration(stripe: Stripe, test: boolean): Promise<string> {
  const marker = test ? CONFIG_MARKER_TEST : CONFIG_MARKER_LIVE;
  const existing = await stripe.billingPortal.configurations.list({ limit: 20 });
  const found = existing.data.find((c) => c.metadata?.marker === marker && c.active);
  const products = await portalProducts(stripe, test);

  const features = {
    payment_method_update: { enabled: true },
    invoice_history: { enabled: true },
    customer_update: { enabled: true, allowed_updates: ["email", "address"] as ("email" | "address")[] },
    subscription_cancel: { enabled: true, mode: "at_period_end" as const },
    subscription_update: {
      enabled: products.length > 0,
      default_allowed_updates: ["price"] as ("price")[],
      proration_behavior: "create_prorations" as const,
      products,
    },
  };

  if (found) {
    // Keep the plan-switch price list in sync with the env-configured prices.
    await stripe.billingPortal.configurations.update(found.id, { features });
    return found.id;
  }

  const created = await stripe.billingPortal.configurations.create({
    business_profile: {
      headline: "FairComparisons agent subscription",
      privacy_policy_url: "https://fair-comparisons.com/privacy",
      terms_of_service_url: "https://fair-comparisons.com/terms",
    },
    features,
    metadata: { marker },
  });
  return created.id;
}

/**
 * Create a portal session for a customer. Pass flowSubscriptionId to deep link
 * straight into Stripe's plan-change flow (shows proration, asks to confirm).
 */
export async function createPortalSession(
  customerId: string,
  flowSubscriptionId?: string | null,
  isSandbox = false
): Promise<string> {
  const { stripe, test } = stripeForSandbox(isSandbox);
  const configuration = await ensurePortalConfiguration(stripe, test);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://fair-comparisons.com";
  // Plan-switch flow only exists in live mode (test has no portal products).
  const canFlow = Boolean(flowSubscriptionId) && !test;
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    configuration,
    return_url: `${baseUrl}/dashboard`,
    ...(canFlow
      ? {
          flow_data: {
            type: "subscription_update" as const,
            subscription_update: { subscription: flowSubscriptionId as string },
          },
        }
      : {}),
  });
  return session.url;
}

/**
 * Line item for a checkout. LIVE mode uses the env-configured recurring price
 * id. TEST mode builds the price inline from TIER_PRICE (no pre-created test
 * prices needed), so the only env var required to rehearse payments is the
 * test secret key.
 */
type CheckoutLineItem = NonNullable<Stripe.Checkout.SessionCreateParams["line_items"]>[number];

export function checkoutLineItem(
  tier: Exclude<Tier, "free">,
  test: boolean
): CheckoutLineItem {
  if (!test) {
    return { price: PRICE_IDS[tier], quantity: 1 };
  }
  const label = tier.charAt(0).toUpperCase() + tier.slice(1);
  return {
    quantity: 1,
    price_data: {
      currency: "sgd",
      unit_amount: TIER_PRICE[tier] * 100,
      recurring: { interval: "month" },
      product_data: { name: `FairComparisons ${label} (test)` },
    },
  };
}

/** Map a Stripe price id back to its tier. Authoritative for LIVE webhook syncs.
 *  Test subscriptions use inline price_data (no id match) and fall back to the
 *  tier stored in subscription metadata, which the test checkout always sets. */
export function tierFromPriceId(priceId: string | null | undefined): "verified" | "professional" | "elite" | null {
  if (!priceId) return null;
  for (const [tier, id] of Object.entries(PRICE_IDS)) {
    if (id && id === priceId) return tier as "verified" | "professional" | "elite";
  }
  return null;
}
