import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { getAgentSession } from "../../../lib/agent-auth";

// Dismiss a broadcast for the signed-in agent (idempotent). Impersonating admins
// must not dismiss on the agent's behalf.
export async function POST(req: Request) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (session.impersonatedBy) return NextResponse.json({ error: "Disabled during impersonation." }, { status: 403 });

  let body: { broadcast_id?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const id = Number(body.broadcast_id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  await supabaseAdmin()
    .from("sg_broadcast_dismissals")
    .upsert({ broadcast_id: id, agent_id: session.agentId }, { onConflict: "broadcast_id,agent_id" });
  return NextResponse.json({ ok: true });
}
