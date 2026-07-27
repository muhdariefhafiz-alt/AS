import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "../../../lib/stripe";
import { getAgentSession } from "../../../lib/agent-auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * POST /api/checkout/confirm  Body: { session_id }
 * Called by the dashboard the moment the agent lands on the checkout
 * success_url. Retrieves the Checkout Session from Stripe, verifies it is paid
 * and belongs to the SIGNED-IN agent, and writes the tier immediately, so the
 * tools are active the second the agent is back, instead of racing the webhook
 * (which stays in place as the source of truth for later lifecycle events;
 * this write is idempotent with it).
 *
 * Trust model: the tier never comes from the client. It is read from the
 * verified Stripe session's metadata, which /api/checkout wrote server-side.
 */
export async function POST(req: Request) {
  try {
    const sess = await getAgentSession();
    if (!sess) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const { session_id } = (await req.json().catch(() => ({}))) as { session_id?: string };
    if (!session_id || !/^cs_[A-Za-z0-9_]+$/.test(session_id)) {
      return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
    }

    const checkout = await getStripe().checkout.sessions.retrieve(session_id);
    const agentId = checkout.metadata?.agent_id ? Number(checkout.metadata.agent_id) : null;
    const tier = checkout.metadata?.tier;
    const subscriptionId =
      typeof checkout.subscription === "string" ? checkout.subscription : checkout.subscription?.id;

    if (!agentId || !tier || !["verified", "professional", "elite"].includes(tier)) {
      return NextResponse.json({ error: "Unrecognised checkout session" }, { status: 400 });
    }
    if (checkout.payment_status !== "paid" || !subscriptionId) {
      return NextResponse.json({ pending: true, tier }, { status: 202 });
    }

    // The session must belong to the signed-in agent's claimed profile.
    const { data: agent } = await supabase
      .from("sg_agents")
      .select("id, claimed_email, subscription_tier")
      .eq("id", agentId)
      .eq("claimed", true)
      .single();
    if (!agent || agent.claimed_email?.toLowerCase().trim() !== sess.email.toLowerCase().trim()) {
      return NextResponse.json({ error: "This checkout belongs to a different profile." }, { status: 403 });
    }

    // Idempotent with the webhook: same fields, same values.
    if (agent.subscription_tier !== tier) {
      await supabase
        .from("sg_agents")
        .update({
          subscription_tier: tier,
          stripe_subscription_id: subscriptionId,
          subscription_started_at: new Date().toISOString(),
          subscription_ends_at: null,
        })
        .eq("id", agentId);

      await supabase.from("sg_funnel_events").insert({
        event: "subscription_confirmed_on_return",
        agent_id: agentId,
        metadata: { tier, subscription_id: subscriptionId },
      });
    }

    return NextResponse.json({ ok: true, tier });
  } catch (err) {
    console.error("[checkout/confirm] Error:", err);
    return NextResponse.json({ error: "Could not confirm checkout" }, { status: 500 });
  }
}
