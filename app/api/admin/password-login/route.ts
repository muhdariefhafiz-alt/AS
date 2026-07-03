import { NextResponse } from "next/server";
import {
  isAdminEmail,
  verifyAdminPassword,
  issueSession,
  COOKIE_NAME,
  SESSION_TTL_MS,
} from "../../../lib/admin-auth";
import { checkRateLimit, clientIp } from "../../../lib/rateLimit";

/**
 * POST /api/admin/password-login
 * Body: { email, password }
 * Self-contained admin sign-in that does not depend on email delivery. On a
 * match (email in ADMIN_EMAILS AND password == ADMIN_PASSWORD) it sets the same
 * HMAC session cookie the magic link would have. Rate-limited per IP because a
 * password endpoint is brute-forceable.
 */
export async function POST(req: Request) {
  const ip = clientIp(req);
  const { limited } = await checkRateLimit(`admin-login:${ip}`, 10, 15 * 60 * 1000);
  if (limited) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429 }
    );
  }

  let email = "";
  let password = "";
  try {
    const body = await req.json();
    email = typeof body?.email === "string" ? body.email : "";
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const normalized = email.toLowerCase().trim();
  // Evaluate both checks unconditionally so response timing does not reveal
  // whether the email or the password was the wrong one (anti-enumeration).
  const emailOk = isAdminEmail(normalized);
  const passOk = verifyAdminPassword(password);
  if (!emailOk || !passOk) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set({
    name: COOKIE_NAME,
    value: issueSession(normalized),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return res;
}
