import { NextResponse } from "next/server";
import { getAgentSession } from "../../../../../lib/agent-auth";
import { isMicrosoftCalendarConfigured, microsoftAuthUrl } from "../../../../../lib/microsoft-calendar";

// Kick off Microsoft (Outlook / M365) calendar OAuth for the signed-in agent.
export async function GET() {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fair-comparisons.com";
  const session = await getAgentSession();
  if (!session) return NextResponse.redirect(`${site}/dashboard`);
  if (session.impersonatedBy) {
    return NextResponse.redirect(`${site}/dashboard?tab=leads&calendar=impersonation`);
  }
  if (!isMicrosoftCalendarConfigured()) {
    return NextResponse.redirect(`${site}/dashboard?tab=leads&calendar=unconfigured`);
  }
  return NextResponse.redirect(microsoftAuthUrl(session.agentId));
}
