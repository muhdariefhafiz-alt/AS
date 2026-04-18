import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Profile edit API for claimed agents.
 * Auth: email must match claimed_email on the agent record.
 */
export async function POST(req: Request) {
  try {
    const { agentId, email, bio, photoUrl, whatsapp, message } = await req.json();

    if (!agentId || !email) {
      return NextResponse.json({ error: "Agent ID and email required" }, { status: 400 });
    }

    // Verify ownership: email must match claimed_email
    const { data: agent } = await supabase
      .from("sg_agents")
      .select("id, name, claimed, claimed_email")
      .eq("id", agentId)
      .single();

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (!agent.claimed || agent.claimed_email !== email.toLowerCase().trim()) {
      return NextResponse.json({ error: "Not authorized to edit this profile" }, { status: 403 });
    }

    // Validate inputs
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

    // Update profile
    const updates: Record<string, string | null> = {};
    if (bio !== undefined) updates.bio = bio || null;
    if (photoUrl !== undefined) updates.photo_url = photoUrl || null;
    if (whatsapp !== undefined) updates.whatsapp = whatsapp || null;
    if (message !== undefined) updates.message = message || null;

    const { error } = await supabase
      .from("sg_agents")
      .update(updates)
      .eq("id", agentId);

    if (error) {
      console.error("Profile update error:", error);
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    // Track funnel event
    await supabase.from("sg_funnel_events").insert({
      event: "profile_edit",
      agent_id: agentId,
      metadata: { fields: Object.keys(updates) },
    });

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully.",
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
