import { getStripe, PRICE_IDS } from "./stripe";

// Stripe customer-portal helpers, shared by /api/billing/portal and
// /api/checkout (plan changes). The portal configuration is created lazily on
// first use and found again by metadata, so there is no manual dashboard setup
// step to forget. SECURITY: a portal session grants full billing control
// (card, cancel, plan) for the customer, so callers must only create one for
// an AUTHENTICATED agent whose claimed_email owns that Stripe customer.

const CONFIG_MARKER = "fc_agent_portal_v1";

// subscription_update.products needs product ids with their allowed prices.
// Resolve them from the three env-configured price ids at call time.
async function portalProducts(): Promise<{ product: string; prices: string[] }[]> {
  const stripe = getStripe();
  const byProduct = new Map<string, string[]>();
  for (const priceId of Object.values(PRICE_IDS)) {
    if (!priceId) continue;
    const price = await stripe.prices.retrieve(priceId);
    const productId = typeof price.product === "string" ? price.product : price.product.id;
    byProduct.set(productId, [...(byProduct.get(productId) ?? []), priceId]);
  }
  return [...byProduct.entries()].map(([product, prices]) => ({ product, prices }));
}

export async function ensurePortalConfiguration(): Promise<string> {
  const stripe = getStripe();
  const existing = await stripe.billingPortal.configurations.list({ limit: 20 });
  const found = existing.data.find((c) => c.metadata?.marker === CONFIG_MARKER && c.active);
  const products = await portalProducts();

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
    metadata: { marker: CONFIG_MARKER },
  });
  return created.id;
}

/**
 * Create a portal session for a customer. Pass flowSubscriptionId to deep link
 * straight into Stripe's plan-change flow (shows proration, asks to confirm).
 */
export async function createPortalSession(
  customerId: string,
  flowSubscriptionId?: string | null
): Promise<string> {
  const configuration = await ensurePortalConfiguration();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://fair-comparisons.com";
  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    configuration,
    return_url: `${baseUrl}/dashboard`,
    ...(flowSubscriptionId
      ? {
          flow_data: {
            type: "subscription_update" as const,
            subscription_update: { subscription: flowSubscriptionId },
          },
        }
      : {}),
  });
  return session.url;
}

/** Map a Stripe price id back to its tier. Authoritative for webhook syncs. */
export function tierFromPriceId(priceId: string | null | undefined): "verified" | "professional" | "elite" | null {
  if (!priceId) return null;
  for (const [tier, id] of Object.entries(PRICE_IDS)) {
    if (id && id === priceId) return tier as "verified" | "professional" | "elite";
  }
  return null;
}
