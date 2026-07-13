import { NextResponse } from "next/server";
import { getAgentSession } from "../../../../../lib/agent-auth";
import { isGoogleCalendarConfigured, googleAuthUrl } from "../../../../../lib/google-calendar";

// Kick off Google Calendar OAuth for the signed-in agent. Redirects to Google's
// consent screen; the agent comes back at /callback.
export async function GET() {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fair-comparisons.com";
  const session = await getAgentSession();
  if (!session) return NextResponse.redirect(`${site}/dashboard`);
  if (session.impersonatedBy) {
    return NextResponse.redirect(`${site}/dashboard?tab=leads&calendar=impersonation`);
  }
  if (!isGoogleCalendarConfigured()) {
    return NextResponse.redirect(`${site}/dashboard?tab=leads&calendar=unconfigured`);
  }
  return NextResponse.redirect(googleAuthUrl(session.agentId));
}
