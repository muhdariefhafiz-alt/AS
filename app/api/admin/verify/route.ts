import { NextResponse } from "next/server";
import { verifyToken, issueSession, isAdminEmail, COOKIE_NAME, SESSION_TTL_MS } from "../../../lib/admin-auth";

/**
 * GET /api/admin/verify?token=...
 * Verifies the magic link, sets an httpOnly session cookie, redirects to /admin.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const session = verifyToken(token);

  const loginUrl = new URL("/admin/login?error=invalid", req.url);

  if (!session) {
    return NextResponse.redirect(loginUrl);
  }

  if (!isAdminEmail(session.email)) {
    return NextResponse.redirect(loginUrl);
  }

  const sessionToken = issueSession(session.email);
  const res = NextResponse.redirect(new URL("/admin", req.url));
  res.cookies.set({
    name: COOKIE_NAME,
    value: sessionToken,
    httpOnly: true,
    // Only require HTTPS in production; localhost over http needs secure=false
    // for the cookie to stick.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return res;
}
