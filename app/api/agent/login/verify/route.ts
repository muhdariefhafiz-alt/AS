import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  verifyAgentToken,
  issueAgentSession,
  AGENT_COOKIE,
  AGENT_SESSION_TTL_MS,
} from "../../../../lib/agent-auth";
import { supabaseAdmin } from "../../../../lib/supabase";

// Magic-link landing: validates the token, confirms the email is still a claimed
// agent, sets the session cookie, and redirects into the dashboard.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const session = verifyAgentToken(token);
  // Reject impersonation tokens here: they must never be upgraded into a clean
  // 30-day agent session (that would strip the imp flag, banner, and audit).
  if (!session || session.impersonatedBy) {
    return NextResponse.redirect(new URL("/dashboard?login=invalid", req.url));
  }

  const { data: agent } = await supabaseAdmin()
    .from("sg_agents")
    .select("id")
    .eq("claimed", true)
    .eq("claimed_email", session.email)
    .maybeSingle();
  if (!agent) {
    return NextResponse.redirect(new URL("/dashboard?login=invalid", req.url));
  }

  const store = await cookies();
  store.set(AGENT_COOKIE, issueAgentSession(session.email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(AGENT_SESSION_TTL_MS / 1000),
  });

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
