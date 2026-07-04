import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStripe, PRICE_IDS } from "../../lib/stripe";
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
      .select("id, name, slug, claimed, claimed_email, subscription_tier, stripe_customer_id")
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

    const priceId = PRICE_IDS[tier as keyof typeof PRICE_IDS];
    if (!priceId) {
      return NextResponse.json(
        { error: "Pricing not configured. Please contact support." },
        { status: 500 }
      );
    }

    // Reuse or create Stripe customer
    let customerId = agent.stripe_customer_id;
    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: email.toLowerCase().trim(),
        name: agent.name,
        metadata: {
          agent_id: String(agent.id),
          agent_slug: agent.slug,
        },
      });
      customerId = customer.id;

      await supabase
        .from("sg_agents")
        .update({ stripe_customer_id: customerId })
        .eq("id", agent.id);
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://fair-comparisons.com";

    // Track checkout_started funnel event
    await supabase.from("sg_funnel_events").insert({
      event: "checkout_started",
      agent_id: agent.id,
      agent_slug: agent.slug,
      metadata: { tier, from_tier: agent.subscription_tier || "free" },
    });

    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/dashboard?upgraded=${tier}`,
      cancel_url: `${baseUrl}/for-agents`,
      metadata: {
        agent_id: String(agent.id),
        tier,
      },
      subscription_data: {
        metadata: {
          agent_id: String(agent.id),
          tier,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout] Error:", err);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
