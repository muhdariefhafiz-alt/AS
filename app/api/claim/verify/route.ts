import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  // Find claim request
  const { data: claim } = await supabase
    .from("sg_claim_requests")
    .select("id, agent_id, email, status")
    .eq("verification_token", token)
    .single();

  if (!claim) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 404 });
  }

  if (claim.status === "verified") {
    return NextResponse.redirect(new URL("/claim/success", req.url));
  }

  // Verify the claim
  await supabase
    .from("sg_claim_requests")
    .update({ status: "verified", verified_at: new Date().toISOString() })
    .eq("id", claim.id);

  // Mark agent as claimed
  await supabase
    .from("sg_agents")
    .update({ claimed: true, claimed_email: claim.email, claimed_at: new Date().toISOString() })
    .eq("id", claim.agent_id);

  // Redirect to success page
  return NextResponse.redirect(new URL("/claim/success", req.url));
}
