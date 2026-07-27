import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStripe, getStripeTest, stripeTestConfigured } from "../../../lib/stripe";
import { tierFromPriceId } from "../../../lib/billing";
import { sendEmail } from "../../../lib/email";
import { emailShell, p } from "../../../lib/email-layout";
import { greetName } from "../../../lib/names";
import { escapeHtml } from "../../../lib/escapeHtml";
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

  // Verify against the LIVE secret first. If that fails and a TEST webhook
  // secret is configured, try it too, so sandbox test-mode lifecycle events
  // (cancel, period-end) also sync. Event processing below is client-agnostic
  // (DB writes + tierFromPriceId with a metadata fallback that test carries).
  let event: Stripe.Event | null = null;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    if (stripeTestConfigured() && process.env.STRIPE_TEST_WEBHOOK_SECRET) {
      try {
        event = getStripeTest().webhooks.constructEvent(body, sig, process.env.STRIPE_TEST_WEBHOOK_SECRET);
      } catch {
        event = null;
      }
    }
  }
  if (!event) {
    console.error("[stripe-webhook] Signature verification failed (live+test)");
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

        const isTest = session.metadata?.test === "1";
        if (agentId && tier && subscriptionId) {
          // Idempotency: Stripe delivers at-least-once (retries, dashboard
          // replay, the sandbox rehearsal loop). Only write + log a conversion
          // when it is actually changing, so redeliveries do not double-count
          // subscription_started or churn subscription_started_at.
          const { data: cur } = await supabase
            .from("sg_agents")
            .select("subscription_tier, stripe_subscription_id")
            .eq("id", Number(agentId))
            .single();
          const changed =
            !cur || cur.subscription_tier !== tier || cur.stripe_subscription_id !== subscriptionId;

          if (changed) {
            await supabase
              .from("sg_agents")
              .update({
                subscription_tier: tier,
                stripe_subscription_id: subscriptionId,
                subscription_started_at: new Date().toISOString(),
                subscription_ends_at: null,
              })
              .eq("id", Number(agentId));

            // Real conversions only: a sandbox test rehearsal must not write
            // funnel rows that operator dashboards count.
            if (!isTest) {
              await supabase.from("sg_funnel_events").insert({
                event: "subscription_started",
                agent_id: Number(agentId),
                metadata: { tier, subscription_id: subscriptionId },
              });
            }
            console.log(`[stripe-webhook] Agent ${agentId} upgraded to ${tier}${isTest ? " (test)" : ""}`);
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;

        // Resolve the agent: metadata first, then by subscription id (covers
        // subscriptions whose metadata was lost or never set).
        let agentId: number | null = sub.metadata?.agent_id ? Number(sub.metadata.agent_id) : null;
        if (!agentId) {
          const { data: bySub } = await supabase
            .from("sg_agents")
            .select("id")
            .eq("stripe_subscription_id", sub.id)
            .single();
          agentId = bySub?.id ?? null;
        }

        if (agentId && (sub.status === "active" || sub.status === "trialing")) {
          // The PRICE on the subscription is authoritative for the tier.
          // Portal plan changes keep the original checkout metadata, so the
          // old metadata-based sync would silently mis-tier (e.g. an elite
          // upgrade staying "verified"). Metadata is only a fallback; if
          // neither resolves, leave the stored tier untouched.
          const item = sub.items?.data?.[0];
          const tier = tierFromPriceId(item?.price?.id) || (sub.metadata?.tier ?? null);

          // Cancel-at-period-end: the agent keeps the tier until the period
          // ends (Stripe fires customer.subscription.deleted then); store the
          // end date so the dashboard can say "your plan ends on X".
          const periodEnd =
            (item as unknown as { current_period_end?: number })?.current_period_end ??
            (sub as unknown as { current_period_end?: number }).current_period_end;
          const endsAt =
            sub.cancel_at_period_end && typeof periodEnd === "number"
              ? new Date(periodEnd * 1000).toISOString()
              : null;

          await supabase
            .from("sg_agents")
            .update({
              ...(tier ? { subscription_tier: tier } : {}),
              stripe_subscription_id: sub.id,
              subscription_ends_at: endsAt,
            })
            .eq("id", agentId);
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

          // Real conversions only (skip sandbox test cancellations).
          if (sub.metadata?.test !== "1") {
            await supabase.from("sg_funnel_events").insert({
              event: "subscription_cancelled",
              agent_id: Number(agentId),
              metadata: { subscription_id: sub.id },
            });
          }

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

        // E2 dunning email (docs/email-lifecycle.md). Transactional: no
        // unsubscribe. Wrapped so a send failure never 500s the webhook
        // (Stripe retries on 5xx and would re-deliver the whole event).
        try {
          const customerId =
            typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;

          if (customerId) {
            const { data: dunningAgent } = await supabase
              .from("sg_agents")
              .select("id, name, claimed_email, email, subscription_tier")
              .eq("stripe_customer_id", customerId)
              .single();

            const to = (dunningAgent?.claimed_email || dunningAgent?.email) as
              | string
              | null
              | undefined;

            if (dunningAgent && to) {
              const firstRaw = greetName(dunningAgent.name ?? "") || "there";
              const first = escapeHtml(firstRaw);
              const tier = dunningAgent.subscription_tier as string | null;
              const planLabel =
                tier && tier !== "free" ? tier.charAt(0).toUpperCase() + tier.slice(1) : null;

              const nextAttempt = (invoice as unknown as { next_payment_attempt?: number | null })
                .next_payment_attempt;
              const graceEndDate =
                typeof nextAttempt === "number" && nextAttempt > 0
                  ? new Date(nextAttempt * 1000).toLocaleDateString("en-SG", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : null;

              // ?billing=1 opens the dashboard's billing section, whose
              // "Update payment" button opens the Stripe customer portal.
              const billingUrl =
                "https://fair-comparisons.com/dashboard?billing=1&utm_source=dunning&utm_medium=email";

              const subject = `Your card could not be charged, ${firstRaw}`;
              const html = emailShell({
                preheader: planLabel
                  ? `Update it to keep your ${planLabel} tools active.`
                  : "Update it to keep your subscription tools active.",
                heading: subject,
                bodyHtml: p(
                  `We could not process your ${planLabel ? `${planLabel} subscription` : "subscription"}. ` +
                    `Your public profile and ranking are unaffected (those are always free), but your subscription tools will pause ` +
                    `${graceEndDate ? `on ${graceEndDate} ` : ""}unless the card is updated.`
                ),
                cta: { label: "Update payment", href: billingUrl },
              });

              await sendEmail({
                to,
                subject,
                html,
                metric: "Agent Dunning",
                properties: {
                  agent_id: dunningAgent.id,
                  subscription_id: subId ?? "",
                  source: "stripe_webhook",
                },
              });
            }
          }
        } catch (err) {
          console.error("[stripe-webhook] dunning email failed:", err);
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
