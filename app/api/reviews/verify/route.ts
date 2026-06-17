import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";

// GET /api/reviews/verify?token=...
// One-click email confirmation. Flips a pending open review to published.
// Redirects the reviewer back to the agent profile with a confirmation flag.

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const site =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://fair-comparisons.com";

  if (!token || token.length < 16 || token.length > 64) {
    return NextResponse.redirect(`${site}/?review=invalid`);
  }

  const sb = supabaseAdmin();
  const { data: review } = await sb
    .from("sg_agent_reviews")
    .select("id, agent_id, status, verify_expires")
    .eq("verify_token", token)
    .maybeSingle();

  if (!review) {
    return NextResponse.redirect(`${site}/?review=invalid`);
  }

  // Idempotent: anything past awaiting_email was already confirmed.
  if (review.status !== "awaiting_email") {
    const slug = await agentSlug(sb, review.agent_id);
    return NextResponse.redirect(
      `${site}/property-agents/agent/${slug}?review=received#reviews`
    );
  }

  if (
    review.verify_expires &&
    new Date(review.verify_expires).getTime() < Date.now()
  ) {
    return NextResponse.redirect(`${site}/?review=expired`);
  }

  // Email confirmed: move to the moderation queue, not public yet. An admin
  // approves it before it appears, so reviews about named agents are checked
  // (defamation risk). Approval publishes it and refreshes the aggregate.
  await sb
    .from("sg_agent_reviews")
    .update({
      status: "pending",
      verify_token: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", review.id);

  const slug = await agentSlug(sb, review.agent_id);
  return NextResponse.redirect(
    `${site}/property-agents/agent/${slug}?review=received#reviews`
  );
}

async function agentSlug(
  sb: ReturnType<typeof supabaseAdmin>,
  agentId: number
): Promise<string> {
  const { data } = await sb
    .from("sg_agents")
    .select("slug")
    .eq("id", agentId)
    .single();
  return data?.slug ?? "";
}
