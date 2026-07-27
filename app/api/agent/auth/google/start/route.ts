import { NextResponse } from "next/server";
import { isGoogleLoginConfigured, buildLoginAuthUrl } from "../../../../../lib/google-auth";

// Kick off Sign in with Google for the agent dashboard.
export async function GET(req: Request) {
  if (!isGoogleLoginConfigured()) {
    return NextResponse.redirect(new URL("/dashboard?login=google_error", req.url));
  }
  return NextResponse.redirect(buildLoginAuthUrl());
}
