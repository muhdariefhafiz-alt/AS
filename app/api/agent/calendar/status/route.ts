import { NextResponse } from "next/server";
import { getAgentSession } from "../../../../lib/agent-auth";
import { isGoogleCalendarConfigured, getCalendarConnection } from "../../../../lib/google-calendar";
import { isMicrosoftCalendarConfigured } from "../../../../lib/microsoft-calendar";

// Connection state for the Planner's calendar controls. `google`/`microsoft`
// say which providers are configured (buttons to show); `connected`/`provider`
// /`email` describe the agent's single active connection, if any.
export async function GET() {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const google = isGoogleCalendarConfigured();
  const microsoft = isMicrosoftCalendarConfigured();
  if (!google && !microsoft) {
    return NextResponse.json({ configured: false, google, microsoft, connected: false });
  }

  const conn = await getCalendarConnection(session.agentId);
  return NextResponse.json({
    configured: true,
    google,
    microsoft,
    connected: !!conn,
    provider: conn?.provider ?? null,
    email: conn?.account_email ?? conn?.google_email ?? null,
  });
}
