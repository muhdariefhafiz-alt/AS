import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { verifyAgentToken, AGENT_COOKIE } from "../../../../lib/agent-auth";
import { supabaseAdmin } from "../../../../lib/supabase";

// Ends an impersonation session by clearing the agent cookie. Safe to call from
// the dashboard banner: it only clears the caller's own cookie. The admin's
// separate fc_admin session is untouched, so they land back in the admin panel.
export async function POST() {
  const store = await cookies();
  const session = verifyAgentToken(store.get(AGENT_COOKIE)?.value);

  store.set(AGENT_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  if (session?.impersonatedBy) {
    const h = await headers();
    await supabaseAdmin().from("admin_audit_log").insert({
      admin_identifier: session.impersonatedBy,
      action: "impersonate_stop",
      target_type: "agent",
      target_id: null,
      detail: { agent_email: session.email },
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      user_agent: h.get("user-agent") ?? null,
    });
  }

  return NextResponse.json({ ok: true, redirect: "/admin" });
}
