import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  redeemAgentMagicLink,
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
  // Redeem, do not merely verify: this SPENDS the link, so a second visit with
  // the same URL fails. The login email promises it "can be used once", and
  // before this the link stayed live for its full 24 hours, handing the whole
  // dashboard to anyone who reached a forwarded mail or a shared inbox.
  // (redeemAgentMagicLink also rejects impersonation tokens, which must never
  // be upgraded into a clean 30-day session: that would strip the imp flag,
  // the banner and the audit trail.)
  const session = await redeemAgentMagicLink(token);
  if (!session) {
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
  // Non-sensitive UI hint so the site header can say "Dashboard" instead of
  // "Sign in" to someone already signed in. Readable by JS ON PURPOSE and
  // carries no identity: the real session stays httpOnly. The header lives
  // in the root layout, so reading the real cookie there would make every
  // page dynamic and cost static rendering on ~38k agent pages.
  store.set("fc_signed_in", "1", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(AGENT_SESSION_TTL_MS / 1000),
  });

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
