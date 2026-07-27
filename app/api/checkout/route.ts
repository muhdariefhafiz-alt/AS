import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripeTestConfigured, PRICE_IDS } from "../../lib/stripe";
import { createPortalSession, stripeForSandbox, checkoutLineItem } from "../../lib/billing";
import { getAgentSession } from "../../lib/agent-auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * POST /api/checkout
 * Creates a Stripe Checkout session for a claimed agent subscribing to a
 * reputation/analytics tier (licence-safe SaaS, not lead routing).
 * Body: { email: string, tier: "verified" | "professional" | "elite" }
 *
 * Sandbox agents (is_sandbox) run through the Stripe TEST client so the owner
 * can rehearse a real checkout with test card 4242 and no money. Every non-
 * sandbox agent uses the live client on exactly the path it did before.
 */
export async function POST(req: Request) {
  try {
    // Safety: an admin impersonating an agent must not be able to start a paid
    // subscription on the agent's behalf. Profile/photo setup stays enabled.
    const sess = await getAgentSession();
    if (sess?.impersonatedBy) {
      return NextResponse.json(
        { error: "Billing changes are disabled during admin impersonation." },
        { status: 403 }
      );
    }

    const { email, tier } = await req.json();

    if (!email || !tier || !["verified", "professional", "elite"].includes(tier)) {
      return NextResponse.json(
        { error: "Valid email and tier required" },
        { status: 400 }
      );
    }

    // A signed-in agent may only subscribe their OWN profile. Without this, a
    // logged-in agent could drive a checkout bound to another agent's email.
    // The public pricing page (no agent session) still uses the body email.
    if (sess && sess.email && sess.email.toLowerCase().trim() !== String(email).toLowerCase().trim()) {
      return NextResponse.json(
        { error: "You can only subscribe your own profile." },
        { status: 403 }
      );
    }

    // Verify agent is claimed
    const { data: agent } = await supabase
      .from("sg_agents")
      .select("id, name, slug, claimed, claimed_email, subscription_tier, stripe_customer_id, stripe_subscription_id, is_sandbox")
      .eq("claimed", true)
      .eq("claimed_email", email.toLowerCase().trim())
      .single();

    if (!agent) {
      return NextResponse.json(
        { error: "No claimed profile found for this email. Claim your profile first." },
        { status: 404 }
      );
    }

    if (agent.subscription_tier === tier) {
      return NextResponse.json(
        { error: `You are already on the ${tier} plan.` },
        { status: 409 }
      );
    }

    // Sandbox billing is owner-only: it must be driven by the sandbox account's
    // OWN signed-in session. This blocks the unauthenticated public-pricing path
    // from spinning sessions on it and keeps the test-mode branch keyed to the
    // session (not the request-body email).
    if (agent.is_sandbox && (!sess || String(sess.agentId) !== String(agent.id))) {
      return NextResponse.json(
        { error: "Sign in to your dashboard to use the sandbox account." },
        { status: 403 }
      );
    }

    // Sandbox account but the test key is not configured yet: fail with a clear,
    // actionable message instead of a 500 (we must NEVER silently fall back to
    // the live client for a sandbox account -> that would be a real charge).
    if (agent.is_sandbox && !stripeTestConfigured()) {
      return NextResponse.json(
        { error: "Sandbox test mode is not configured. Add STRIPE_TEST_SECRET_KEY (sk_test_...) in Vercel to rehearse payments." },
        { status: 503 }
      );
    }

    const { stripe, test } = stripeForSandbox(Boolean(agent.is_sandbox));

    // Live path: fail fast with an actionable message if the price env var is
    // missing, instead of a generic 500 after a Stripe round-trip.
    if (!test && !PRICE_IDS[tier as keyof typeof PRICE_IDS]) {
      return NextResponse.json(
        { error: "Pricing not configured. Please contact support." },
        { status: 500 }
      );
    }

    // Existing subscriber changing plans: a second Checkout would create a
    // SECOND concurrent subscription (double billing, no proration). Route the
    // change through the Stripe customer portal's subscription-update flow
    // instead, where Stripe shows the prorated amount and asks to confirm.
    // A portal session grants full billing control, so this path requires a
    // signed-in agent session matching the email (checkout's email-only path
    // is safe only because the payer must still enter their own card).
    if (agent.stripe_subscription_id && agent.stripe_customer_id) {
      const sub = await stripe.subscriptions.retrieve(agent.stripe_subscription_id).catch(() => null);
      if (sub && (sub.status === "active" || sub.status === "trialing" || sub.status === "past_due")) {
        if (!sess || sess.email.toLowerCase().trim() !== String(email).toLowerCase().trim()) {
          return NextResponse.json(
            { error: "You already have an active plan. Sign in to your dashboard to change it." },
            { status: 409 }
          );
        }
        const url = await createPortalSession(
          agent.stripe_customer_id,
          agent.stripe_subscription_id,
          Boolean(agent.is_sandbox)
        );
        return NextResponse.json({ url, planChange: true });
      }
    }

    // Reuse or create the Stripe customer (in the SAME mode as the checkout).
    let customerId = agent.stripe_customer_id;
    // Stripe customers are mode-scoped. For a sandbox (test) checkout, a stored
    // id created in LIVE mode does not exist in test mode, so verify before
    // reuse and recreate on mismatch. The LIVE path is unchanged (no extra
    // call) so the 38k real agents behave exactly as before.
    if (customerId && test) {
      const ok = await stripe.customers
        .retrieve(customerId)
        .then((c) => !!c && !(c as { deleted?: boolean }).deleted)
        .catch(() => false);
      if (!ok) customerId = null;
    }
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email.toLowerCase().trim(),
        name: agent.name,
        metadata: { agent_id: String(agent.id), agent_slug: agent.slug, test: test ? "1" : "0" },
      });
      customerId = customer.id;
      await supabase.from("sg_agents").update({ stripe_customer_id: customerId }).eq("id", agent.id);
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://fair-comparisons.com";

    // Real conversions only: a sandbox rehearsal must not write funnel rows into
    // the shared table that operator dashboards count.
    if (!test) {
      await supabase.from("sg_funnel_events").insert({
        event: "checkout_started",
        agent_id: agent.id,
        agent_slug: agent.slug,
        metadata: { tier, from_tier: agent.subscription_tier || "free" },
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [checkoutLineItem(tier, test)],
      // session_id lets the dashboard confirm the payment server-side the
      // moment the agent lands, instead of racing the webhook (ST2). The
      // session id prefix (cs_test_ vs cs_live_) also tells confirm which
      // Stripe client to verify it with.
      success_url: `${baseUrl}/dashboard?upgraded=${tier}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/dashboard`,
      metadata: { agent_id: String(agent.id), tier, test: test ? "1" : "0" },
      subscription_data: { metadata: { agent_id: String(agent.id), tier, test: test ? "1" : "0" } },
    });

    return NextResponse.json({ url: session.url, test });
  } catch (err) {
    console.error("[checkout] Error:", err);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
