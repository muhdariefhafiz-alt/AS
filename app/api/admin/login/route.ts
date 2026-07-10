import { NextResponse } from "next/server";
import { issueMagicLink, isAdminEmail, getAdminEmails } from "../../../lib/admin-auth";
import { sendEmail } from "../../../lib/email";
import { emailShell, p, muted } from "../../../lib/email-layout";

/**
 * POST /api/admin/login
 * Body: { email }
 * Always returns success (to avoid email enumeration).
 * If email is in the ADMIN_EMAILS allowlist, a magic link is issued and
 * (a) emailed, and (b) logged to the server console so an operator can
 * paste it manually if email delivery is down.
 */
export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (typeof email !== "string") {
      return NextResponse.json({ success: true });
    }

    const normalized = email.toLowerCase().trim();

    if (getAdminEmails().size === 0) {
      console.error("[admin/login] ADMIN_EMAILS not configured");
      return NextResponse.json({ success: true });
    }

    if (!isAdminEmail(normalized)) {
      // Silent failure, anti-enumeration.
      return NextResponse.json({ success: true });
    }

    const token = issueMagicLink(normalized);
    const base =
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://fair-comparisons.com";
    const link = `${base}/api/admin/verify?token=${token}`;
    // Log the link so an operator can paste it manually when Klaviyo or the
    // mail provider does not deliver. The login endpoint is already
    // allowlist-gated, so this leaks nothing beyond the admin's own ability.
    console.log(`[admin/login] magic link issued for ${normalized}: ${link}`);

    const html = emailShell({
      preheader: "One click signs you in. Link expires in 24 hours and can only be used once.",
      heading: "Sign in to the admin dashboard",
      bodyHtml:
        p("Click the button below to sign in. This link expires in 24 hours and can only be used once.") +
        muted(`Or paste this URL into your browser: ${link}`) +
        muted("If you did not request this, ignore the email. No action will be taken."),
      cta: { label: "Open dashboard", href: link },
    });

    await sendEmail({
      to: normalized,
      subject: "Sign in to FairComparisons admin",
      html,
      metric: "Admin Login",
      properties: { login_url: link },
    }).catch((err) => {
      console.error("[admin/login] email send failed:", err);
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true });
  }
}
