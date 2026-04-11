import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function generateToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

export async function POST(req: Request) {
  try {
    const { agentId, email, phone } = await req.json();

    if (!agentId || !email) {
      return NextResponse.json({ error: "Agent ID and email required" }, { status: 400 });
    }

    // Check agent exists
    const { data: agent } = await supabase
      .from("sg_agents")
      .select("id, name, claimed")
      .eq("id", agentId)
      .single();

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (agent.claimed) {
      return NextResponse.json({ error: "This profile has already been claimed" }, { status: 409 });
    }

    // Check for existing pending claim
    const { data: existing } = await supabase
      .from("sg_claim_requests")
      .select("id, status")
      .eq("agent_id", agentId)
      .eq("status", "pending")
      .single();

    if (existing) {
      return NextResponse.json({ error: "A claim request is already pending for this profile" }, { status: 409 });
    }

    // Create claim request
    const token = generateToken();
    const { error } = await supabase.from("sg_claim_requests").insert({
      agent_id: agentId,
      email,
      phone: phone || null,
      verification_token: token,
    });

    if (error) {
      return NextResponse.json({ error: "Failed to create claim request" }, { status: 500 });
    }

    // In production, send verification email here via Resend
    // For now, auto-verify (we'll add email later)
    console.log(`Claim request for agent ${agent.name} (${agentId}). Token: ${token}. Email: ${email}`);

    return NextResponse.json({
      success: true,
      message: "Claim request submitted. You will receive a verification email shortly.",
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
