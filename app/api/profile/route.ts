import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, clientIp } from "../../lib/rateLimit";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Profile edit API for claimed agents.
 * Auth: email must match claimed_email on the agent record.
 * Moderation: message, photo_url, and bio go to pending status when changed.
 */
export async function POST(req: Request) {
  try {
    // Auth is email-only; throttle to blunt brute-forcing claimed_email values.
    const { limited } = await checkRateLimit(`profile:${clientIp(req)}`, 20, 60 * 60 * 1000);
    if (limited) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const { agentId, email, bio, photoUrl, whatsapp, message, marketingName } = await req.json();

    if (!agentId || !email) {
      return NextResponse.json({ error: "Agent ID and email required" }, { status: 400 });
    }

    const { data: agent } = await supabase
      .from("sg_agents")
      .select("id, name, claimed, claimed_email, bio, photo_url, message, marketing_name")
      .eq("id", agentId)
      .single();

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (!agent.claimed || agent.claimed_email !== email.toLowerCase().trim()) {
      return NextResponse.json({ error: "Not authorized to edit this profile" }, { status: 403 });
    }

    if (bio && typeof bio === "string" && bio.length > 1000) {
      return NextResponse.json({ error: "Bio must be under 1000 characters" }, { status: 400 });
    }
    if (photoUrl && typeof photoUrl === "string" && photoUrl.length > 500) {
      return NextResponse.json({ error: "Photo URL too long" }, { status: 400 });
    }
    if (whatsapp && typeof whatsapp === "string" && whatsapp.length > 20) {
      return NextResponse.json({ error: "Invalid WhatsApp number" }, { status: 400 });
    }
    if (message && typeof message === "string" && message.length > 500) {
      return NextResponse.json({ error: "Message must be under 500 characters" }, { status: 400 });
    }
    if (marketingName && typeof marketingName === "string" && marketingName.length > 60) {
      return NextResponse.json({ error: "Marketing name must be under 60 characters" }, { status: 400 });
    }

    const updates: Record<string, string | null> = {};
    const changed: string[] = [];

    if (bio !== undefined) {
      updates.bio = bio || null;
      if ((bio || null) !== (agent.bio || null)) {
        updates.bio_status = "pending";
        updates.bio_updated_at = new Date().toISOString();
        changed.push("bio");
      }
    }
    if (photoUrl !== undefined) {
      updates.photo_url = photoUrl || null;
      if ((photoUrl || null) !== (agent.photo_url || null)) {
        updates.photo_status = "pending";
        updates.photo_updated_at = new Date().toISOString();
        changed.push("photo");
      }
    }
    if (marketingName !== undefined) {
      updates.marketing_name = marketingName || null;
      if ((marketingName || null) !== (agent.marketing_name || null)) {
        updates.marketing_name_status = "pending";
        updates.marketing_name_updated_at = new Date().toISOString();
        changed.push("marketing name");
      }
    }
    if (whatsapp !== undefined) updates.whatsapp = whatsapp || null;
    if (message !== undefined) {
      updates.message = message || null;
      if ((message || null) !== (agent.message || null)) {
        updates.message_status = "pending";
        updates.message_updated_at = new Date().toISOString();
        changed.push("message");
      }
    }

    const { data: updated, error } = await supabase
      .from("sg_agents")
      .update(updates)
      .eq("id", agentId)
      .select("slug")
      .single();

    if (error) {
      console.error("Profile update error:", error);
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    // If moderated content changed (now pending), purge the public profile so the
    // previously-approved version stops showing until re-approved.
    if (changed.length > 0 && updated?.slug) {
      try {
        revalidatePath(`/property-agents/agent/${updated.slug}`);
      } catch (err) {
        console.error("[profile] revalidate failed:", err);
      }
    }

    await supabase.from("sg_funnel_events").insert({
      event: "profile_edit",
      agent_id: agentId,
      metadata: { fields: Object.keys(updates), queued_for_review: changed },
    });

    return NextResponse.json({
      success: true,
      message:
        changed.length > 0
          ? `Profile updated. ${changed.join(", ")} queued for review.`
          : "Profile updated.",
      queuedForReview: changed,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
