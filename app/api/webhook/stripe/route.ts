import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "../../../lib/stripe";
import type Stripe from "stripe";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Stripe webhook handler.
 * Listens for checkout.session.completed and customer.subscription events
 * to sync subscription tier to sg_agents.
 */
export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const agentId = session.metadata?.agent_id;
        const tier = session.metadata?.tier;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        if (agentId && tier && subscriptionId) {
          await supabase
            .from("sg_agents")
            .update({
              subscription_tier: tier,
              stripe_subscription_id: subscriptionId,
              subscription_started_at: new Date().toISOString(),
              subscription_ends_at: null,
            })
            .eq("id", Number(agentId));

          await supabase.from("sg_funnel_events").insert({
            event: "subscription_started",
            agent_id: Number(agentId),
            metadata: { tier, subscription_id: subscriptionId },
          });

          console.log(`[stripe-webhook] Agent ${agentId} upgraded to ${tier}`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const agentId = sub.metadata?.agent_id;

        if (agentId && sub.status === "active") {
          const tier = sub.metadata?.tier || "verified";
          await supabase
            .from("sg_agents")
            .update({
              subscription_tier: tier,
              subscription_ends_at: null,
            })
            .eq("id", Number(agentId));
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const agentId = sub.metadata?.agent_id;

        if (agentId) {
          await supabase
            .from("sg_agents")
            .update({
              subscription_tier: "free",
              stripe_subscription_id: null,
              subscription_ends_at: new Date().toISOString(),
            })
            .eq("id", Number(agentId));

          await supabase.from("sg_funnel_events").insert({
            event: "subscription_cancelled",
            agent_id: Number(agentId),
            metadata: { subscription_id: sub.id },
          });

          console.log(`[stripe-webhook] Agent ${agentId} downgraded to free`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = (invoice as unknown as { subscription?: string }).subscription;

        if (subId) {
          // Find agent by subscription ID
          const { data: agent } = await supabase
            .from("sg_agents")
            .select("id")
            .eq("stripe_subscription_id", subId)
            .single();

          if (agent) {
            await supabase.from("sg_funnel_events").insert({
              event: "payment_failed",
              agent_id: agent.id,
              metadata: { subscription_id: subId },
            });
          }
        }
        break;
      }
    }
  } catch (err) {
    console.error("[stripe-webhook] Processing error:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
