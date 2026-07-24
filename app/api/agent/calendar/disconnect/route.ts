import { NextResponse } from "next/server";
import { getAgentSession } from "../../../../lib/agent-auth";
import { supabaseAdmin } from "../../../../lib/supabase";

// Disconnect the agent's calendar. Deletes our stored OAuth tokens (the privacy
// policy promises immediate deletion on disconnect) and best-effort revokes the
// grant at Google so it also disappears from the agent's Google Account
// permissions page. Revocation failure never blocks the delete: our copy of the
// tokens is gone either way, which is the promise that matters.
export async function POST() {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const sb = supabaseAdmin();
  const { data: conn } = await sb
    .from("sg_agent_calendar")
    .select("provider, access_token, refresh_token")
    .eq("agent_id", session.agentId)
    .maybeSingle();
  if (!conn) return NextResponse.json({ ok: true, disconnected: false });

  if (conn.provider === "google") {
    // Revoking the refresh token revokes the whole grant; fall back to the
    // access token if no refresh token was stored.
    const token = (conn.refresh_token as string | null) ?? (conn.access_token as string | null);
    if (token) {
      try {
        await fetch("https://oauth2.googleapis.com/revoke", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ token }),
        });
      } catch (err) {
        console.error("[calendar/disconnect] revoke failed (tokens still deleted)", err);
      }
    }
  }
  // Microsoft has no equivalent token-revocation endpoint for this flow; the
  // agent can remove the grant at account.microsoft.com. Our copy is deleted.

  await sb.from("sg_agent_calendar").delete().eq("agent_id", session.agentId);
  return NextResponse.json({ ok: true, disconnected: true });
}
