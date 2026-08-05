import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { getAdminSession } from "../../../lib/admin-auth";

// Paperwork adoption tracker for the operator.
//
// Reads sg_paperwork_tracker(): the setup / aha / habit funnel against the
// claimed-agent denominator, the chain rate (the phase's core bet), and the
// counter-metric that says whether documents ever leave the building. Sandbox
// agents are excluded inside the RPC, so a test document can never move a
// number here.

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin().rpc("sg_paperwork_tracker");
  if (error) {
    console.error("[admin/paperwork-tracker]", error);
    return NextResponse.json({ error: "Could not load the tracker." }, { status: 500 });
  }
  return NextResponse.json(data);
}
