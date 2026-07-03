import { NextResponse } from "next/server";
import {
  verifyAdminPassword,
  getAdminEmail,
  issueSession,
  adminPasswordDiag,
  COOKIE_NAME,
  SESSION_TTL_MS,
} from "../../../lib/admin-auth";
import { checkRateLimit, clientIp } from "../../../lib/rateLimit";

/**
 * Password-only admin sign-in. No email delivery involved.
 *
 * POST { password } -> if it matches ADMIN_PASSWORD, set the HMAC session cookie
 * for the primary admin identity (first ADMIN_EMAILS entry) so the existing
 * getAdminSession allowlist check still passes. Rate-limited per IP.
 *
 * GET -> diagnostic only: reports whether ADMIN_PASSWORD reached this runtime
 * (boolean + length, never the value). Remove once login is confirmed working.
 */
export async function GET() {
  return NextResponse.json(adminPasswordDiag());
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  const { limited } = await checkRateLimit(`admin-login:${ip}`, 10, 15 * 60 * 1000);
  if (limited) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429 }
    );
  }

  let password = "";
  try {
    const body = await req.json();
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!verifyAdminPassword(password)) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  // Session identity = the first configured admin email, so getAdminSession's
  // allowlist check still passes. ADMIN_EMAILS must have at least one entry.
  const email = getAdminEmail();
  if (!email) {
    return NextResponse.json(
      { error: "Admin not configured (ADMIN_EMAILS empty)" },
      { status: 500 }
    );
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set({
    name: COOKIE_NAME,
    value: issueSession(email),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return res;
}
