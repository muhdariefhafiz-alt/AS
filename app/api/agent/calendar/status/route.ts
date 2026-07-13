import { NextResponse } from "next/server";
import { getAgentSession } from "../../../../lib/agent-auth";
import { isGoogleCalendarConfigured, getCalendarConnection } from "../../../../lib/google-calendar";

// Connection state for the Planner's "Connect Google Calendar" control.
export async function GET() {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!isGoogleCalendarConfigured()) return NextResponse.json({ configured: false, connected: false });
  const conn = await getCalendarConnection(session.agentId);
  return NextResponse.json({ configured: true, connected: !!conn, email: conn?.google_email ?? null });
}
