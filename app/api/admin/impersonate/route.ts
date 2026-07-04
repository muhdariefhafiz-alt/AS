import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { getAdminSession } from "../../../lib/admin-auth";
import { issueImpersonationSession, AGENT_COOKIE, IMPERSONATION_TTL_MS } from "../../../lib/agent-auth";
import { supabaseAdmin } from "../../../lib/supabase";

// Admin-only: open a claimed agent's dashboard by minting a short-lived
// impersonation session (carries the admin's email as `imp`). Every start is
// audited. Only CLAIMED agents can be impersonated, an unclaimed profile has no
// account to act as.
export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let agentId: number | null = null;
  try {
    const body = await req.json();
    agentId = Number(body?.agentId);
  } catch {
    // fall through to validation
  }
  if (!agentId || !Number.isFinite(agentId)) {
    return NextResponse.json({ error: "agentId required" }, { status: 400 });
  }

  const { data: agent } = await supabaseAdmin()
    .from("sg_agents")
    .select("id, name, claimed, claimed_email")
    .eq("id", agentId)
    .maybeSingle();

  if (!agent || !agent.claimed || !agent.claimed_email) {
    return NextResponse.json(
      { error: "Only a claimed agent can be impersonated." },
      { status: 400 }
    );
  }

  // Audit BEFORE issuing the session, and fail closed if the record does not
  // persist. supabase-js returns { error } rather than throwing, so an ignored
  // result would let impersonation start silently unlogged.
  const h = await headers();
  const { error: auditErr } = await supabaseAdmin().from("admin_audit_log").insert({
    admin_identifier: admin.email,
    action: "impersonate_start",
    target_type: "agent",
    target_id: String(agentId),
    detail: { agent_name: agent.name, agent_email: agent.claimed_email },
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    user_agent: h.get("user-agent") ?? null,
  });
  if (auditErr) {
    console.error("[impersonate] audit insert failed, aborting", auditErr);
    return NextResponse.json(
      { error: "Could not record the audit log; impersonation aborted." },
      { status: 500 }
    );
  }

  const store = await cookies();
  store.set(AGENT_COOKIE, issueImpersonationSession(agent.claimed_email, admin.email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(IMPERSONATION_TTL_MS / 1000),
  });

  return NextResponse.json({ ok: true, redirect: "/dashboard" });
}
