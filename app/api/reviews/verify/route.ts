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

  // Already verified — be idempotent.
  if (review.status === "published") {
    const slug = await agentSlug(sb, review.agent_id);
    return NextResponse.redirect(
      `${site}/property-agents/agent/${slug}?review=confirmed#reviews`
    );
  }

  if (
    review.verify_expires &&
    new Date(review.verify_expires).getTime() < Date.now()
  ) {
    return NextResponse.redirect(`${site}/?review=expired`);
  }

  await sb
    .from("sg_agent_reviews")
    .update({
      status: "published",
      approved: true,
      verify_token: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", review.id);

  // Refresh the agent's review aggregate.
  await refreshAggregate(sb, review.agent_id);

  const slug = await agentSlug(sb, review.agent_id);
  return NextResponse.redirect(
    `${site}/property-agents/agent/${slug}?review=confirmed#reviews`
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

async function refreshAggregate(
  sb: ReturnType<typeof supabaseAdmin>,
  agentId: number
): Promise<void> {
  const { data } = await sb
    .from("sg_agent_reviews")
    .select("rating_overall")
    .eq("agent_id", agentId)
    .eq("status", "published");
  const ratings = (data ?? [])
    .map((r) => Number(r.rating_overall))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 5);
  const avg =
    ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) /
        10
      : null;
  await sb
    .from("sg_agents")
    .update({
      review_aggregate: {
        avg,
        count: ratings.length,
        last_reviewed_at: new Date().toISOString(),
      },
    })
    .eq("id", agentId);
}
