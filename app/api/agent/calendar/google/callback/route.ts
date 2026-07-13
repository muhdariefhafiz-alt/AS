import { NextResponse } from "next/server";
import {
  verifyCalendarState, exchangeCodeForTokens, getGoogleEmail,
  storeCalendarTokens, isGoogleCalendarConfigured,
} from "../../../../../lib/google-calendar";

// Google OAuth callback: verify the signed state (CSRF + agent binding),
// exchange the code for tokens, store them, and return the agent to the Planner.
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
  if (!agentId || !isGoogleCalendarConfigured()) {
    return NextResponse.redirect(`${dash}&calendar=error`);
  }
  const tokens = await exchangeCodeForTokens(code);
  if (!tokens?.access_token) {
    return NextResponse.redirect(`${dash}&calendar=error`);
  }
  const email = await getGoogleEmail(tokens.access_token);
  await storeCalendarTokens(agentId, tokens, email);
  return NextResponse.redirect(`${dash}&calendar=connected`);
}
