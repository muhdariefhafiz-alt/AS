import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { getAdminSession } from "../../../lib/admin-auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * POST /api/admin/moderation
 * Body: { type: "message" | "photo" | "bio", agentId: number, decision: "approve" | "reject" }
 * Auth: admin session cookie.
 */
export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { type, agentId, decision, reviewId } = await req.json();

    if (!["approve", "reject"].includes(decision)) {
      return NextResponse.json({ ok: false, error: "Invalid decision" }, { status: 400 });
    }

    // Community-review moderation lane (separate from agent profile content).
    // Approve publishes the review + refreshes the agent aggregate; reject hides it.
    if (type === "review") {
      if (typeof reviewId !== "number") {
        return NextResponse.json({ ok: false, error: "Invalid reviewId" }, { status: 400 });
      }
      const { data: rev, error: revErr } = await supabase
        .from("sg_agent_reviews")
        .update({
          status: decision === "approve" ? "published" : "rejected",
          approved: decision === "approve",
          updated_at: new Date().toISOString(),
        })
        .eq("id", reviewId)
        .eq("status", "pending")
        .select("agent_id")
        .single();
      if (revErr) {
        console.error("[admin/moderation] review update error:", revErr);
        return NextResponse.json({ ok: false, error: "Update failed" }, { status: 500 });
      }
      if (rev?.agent_id) {
        if (decision === "approve") await refreshReviewAggregate(rev.agent_id);
        const slug = await agentSlugById(rev.agent_id);
        if (slug) {
          try { revalidatePath(`/property-agents/agent/${slug}`); } catch (e) { console.error(e); }
        }
      }
      await supabase.from("admin_audit_log").insert({
        admin_identifier: session.email,
        action: `moderation_${decision}_review`,
        target_type: "sg_agent_reviews",
        target_id: String(reviewId),
        detail: { decision },
      });
      return NextResponse.json({ ok: true });
    }

    if (!["message", "photo", "bio", "marketing_name"].includes(type)) {
      return NextResponse.json({ ok: false, error: "Invalid type" }, { status: 400 });
    }
    if (typeof agentId !== "number") {
      return NextResponse.json({ ok: false, error: "Invalid agentId" }, { status: 400 });
    }

    const statusField =
      type === "message" ? "message_status"
      : type === "photo" ? "photo_status"
      : type === "marketing_name" ? "marketing_name_status"
      : "bio_status";
    const contentField = type === "photo" ? "photo_url" : type;
    const newStatus = decision === "approve" ? "approved" : "rejected";

    const updates: Record<string, unknown> = { [statusField]: newStatus };

    // On reject, clear the content so it does not appear publicly
    if (decision === "reject") {
      updates[contentField] = null;
    }

    const { data: updated, error } = await supabase
      .from("sg_agents")
      .update(updates)
      .eq("id", agentId)
      .select("slug")
      .single();
    if (error) {
      console.error("[admin/moderation] update error:", error);
      return NextResponse.json({ ok: false, error: "Update failed" }, { status: 500 });
    }

    // Purge the agent's public profile so an approve/reject shows immediately,
    // instead of waiting up to 12h for ISR revalidation.
    if (updated?.slug) {
      try {
        revalidatePath(`/property-agents/agent/${updated.slug}`);
      } catch (err) {
        console.error("[admin/moderation] revalidate failed:", err);
      }
    }

    await supabase.from("admin_audit_log").insert({
      admin_identifier: session.email,
      action: `moderation_${decision}_${type}`,
      target_type: "sg_agents",
      target_id: String(agentId),
      detail: { type, decision },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
}

// Recompute the agent's published-review average + count after an approve.
async function refreshReviewAggregate(agentId: number): Promise<void> {
  const { data } = await supabase
    .from("sg_agent_reviews")
    .select("rating_overall")
    .eq("agent_id", agentId)
    .eq("status", "published");
  const ratings = (data ?? [])
    .map((r) => Number(r.rating_overall))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 5);
  const avg = ratings.length > 0
    ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
    : null;
  await supabase
    .from("sg_agents")
    .update({ review_aggregate: { avg, count: ratings.length, last_reviewed_at: new Date().toISOString() } })
    .eq("id", agentId);
}

async function agentSlugById(agentId: number): Promise<string> {
  const { data } = await supabase.from("sg_agents").select("slug").eq("id", agentId).single();
  return data?.slug ?? "";
}
