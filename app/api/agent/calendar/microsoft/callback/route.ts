import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabase";
import { verifyCalendarState } from "../../../../../lib/google-calendar";
import {
  isMicrosoftCalendarConfigured, msExchangeCodeForTokens,
  msGetAccountEmail, msStoreCalendarTokens,
} from "../../../../../lib/microsoft-calendar";

// Microsoft OAuth callback: verify the signed state (CSRF + agent binding),
// exchange the code for tokens, store them, return the agent to the Planner.
export async function GET(req: Request) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fair-comparisons.com";
  const dash = `${site}/dashboard?tab=leads`;
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (url.searchParams.get("error") || !code) {
    return NextResponse.redirect(`${dash}&calendar=denied`);
  }
  const agentId = verifyCalendarState(state);
  if (!agentId || !isMicrosoftCalendarConfigured()) {
    return NextResponse.redirect(`${dash}&calendar=error`);
  }
  const tokens = await msExchangeCodeForTokens(code);
  if (!tokens?.access_token) {
    return NextResponse.redirect(`${dash}&calendar=error`);
  }
  const email = await msGetAccountEmail(tokens.access_token);
  await msStoreCalendarTokens(agentId, tokens, email);
  // Planner tracker: calendar connection is an active-adoption signal.
  await supabaseAdmin().from("sg_funnel_events").insert({
    event: "calendar_connect",
    agent_id: agentId,
    source: "microsoft",
  }).then(
    () => undefined,
    (e: unknown) => console.error("[calendar/microsoft] funnel event failed", e)
  );
  return NextResponse.redirect(`${dash}&calendar=connected`);
}
