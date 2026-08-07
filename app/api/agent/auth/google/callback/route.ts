import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "../../../../../lib/supabase";
import { issueAgentSession, AGENT_COOKIE, AGENT_SESSION_TTL_MS } from "../../../../../lib/agent-auth";
import { isGoogleLoginConfigured, verifyLoginState, exchangeCodeForEmail } from "../../../../../lib/google-auth";

// Sign in with Google callback: verify the signed state (CSRF), exchange the
// code, and mint the SAME agent session as the magic-link flow if and only if
// the Google-verified email belongs to a claimed agent. Google acts purely as
// an email verifier here; there is no separate Google identity.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (url.searchParams.get("error") || !code || !isGoogleLoginConfigured()) {
    return NextResponse.redirect(new URL("/dashboard?login=google_error", req.url));
  }
  if (!verifyLoginState(state)) {
    return NextResponse.redirect(new URL("/dashboard?login=google_error", req.url));
  }

  const email = await exchangeCodeForEmail(code);
  if (!email) {
    return NextResponse.redirect(new URL("/dashboard?login=google_error", req.url));
  }

  const { data: agent } = await supabaseAdmin()
    .from("sg_agents")
    .select("id")
    .eq("claimed", true)
    .eq("claimed_email", email)
    .maybeSingle();
  if (!agent) {
    // Honest no-match: the Google account is fine, it just is not the email a
    // claimed profile uses. Never leak whether an email exists in the register.
    return NextResponse.redirect(new URL("/dashboard?login=google_nomatch", req.url));
  }

  const store = await cookies();
  store.set(AGENT_COOKIE, issueAgentSession(email), {
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

  // Measurable: same event the tracker taxonomy already uses for dashboard
  // entry, tagged with the channel. Best-effort.
  await supabaseAdmin().from("sg_funnel_events").insert({
    event: "dashboard_login",
    agent_id: Number(agent.id),
    source: "google",
  }).then(
    () => undefined,
    (e: unknown) => console.error("[auth/google] funnel event failed", e)
  );

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
