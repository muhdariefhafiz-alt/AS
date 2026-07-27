import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { getAgentSession } from "../../../../lib/agent-auth";
import { TIER_ORDER } from "../../../../lib/tiers";

/**
 * POST /api/dashboard/sandbox/tier  Body: { tier }
 * Sandbox-ONLY: flips the signed-in sandbox account's subscription_tier with no
 * payment, so the owner can preview the unlock moment, the paid gates and plan
 * management instantly, without waiting on Stripe. Hard-gated: it can only ever
 * change the CALLER's own tier, and only when that caller's profile carries
 * is_sandbox = true (a single, non-public test row). A 403 for anyone else.
 * This never touches Stripe, so it is not a real payment; it is a preview tool.
 */
export async function POST(req: Request) {
  const sess = await getAgentSession();
  if (!sess) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (sess.impersonatedBy) {
    return NextResponse.json(
      { error: "Billing changes are disabled during admin impersonation." },
      { status: 403 }
    );
  }

  const { tier } = (await req.json().catch(() => ({}))) as { tier?: string };
  if (!tier || !(TIER_ORDER as string[]).includes(tier)) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data: agent } = await sb
    .from("sg_agents")
    .select("id, is_sandbox")
    .eq("id", sess.agentId)
    .single();

  if (!agent?.is_sandbox) {
    return NextResponse.json({ error: "Not a sandbox account." }, { status: 403 });
  }

  await sb
    .from("sg_agents")
    .update(
      tier === "free"
        ? { subscription_tier: "free", subscription_ends_at: null }
        : { subscription_tier: tier, subscription_started_at: new Date().toISOString(), subscription_ends_at: null }
    )
    .eq("id", agent.id);

  return NextResponse.json({ ok: true, tier });
}
