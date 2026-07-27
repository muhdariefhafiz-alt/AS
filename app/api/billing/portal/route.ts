import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createPortalSession } from "../../../lib/billing";
import { getAgentSession } from "../../../lib/agent-auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * POST /api/billing/portal
 * Opens a Stripe customer portal session for the signed-in agent: update the
 * card (dunning recovery), cancel at period end, see invoices, or switch plans
 * with Stripe's own proration confirmation screen.
 * Body: { flow?: "update_plan" } deep links straight into the plan change.
 *
 * Auth: requires the agent session, and only ever opens the portal of the
 * customer attached to THAT agent's claimed profile. A portal session grants
 * full billing control, so there is no email-only path here (unlike checkout,
 * where the payer still has to enter their own card).
 */
export async function POST(req: Request) {
  try {
    const sess = await getAgentSession();
    if (!sess) {
      return NextResponse.json({ error: "Sign in to manage billing." }, { status: 401 });
    }
    if (sess.impersonatedBy) {
      return NextResponse.json(
        { error: "Billing changes are disabled during admin impersonation." },
        { status: 403 }
      );
    }

    const { flow } = (await req.json().catch(() => ({}))) as { flow?: string };

    const { data: agent } = await supabase
      .from("sg_agents")
      .select("id, stripe_customer_id, stripe_subscription_id")
      .eq("claimed", true)
      .eq("claimed_email", sess.email.toLowerCase().trim())
      .single();

    if (!agent?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No billing account yet. Subscribe to a plan first." },
        { status: 404 }
      );
    }

    const url = await createPortalSession(
      agent.stripe_customer_id,
      flow === "update_plan" ? agent.stripe_subscription_id : null
    );
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[billing/portal] Error:", err);
    return NextResponse.json({ error: "Could not open billing portal." }, { status: 500 });
  }
}
