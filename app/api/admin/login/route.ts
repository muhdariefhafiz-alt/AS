import { NextResponse } from "next/server";
import { issueMagicLink, getAdminEmail } from "../../../lib/admin-auth";
import { sendEmail } from "../../../lib/email";

/**
 * POST /api/admin/login
 * Body: { email }
 * Always returns success (to avoid email enumeration).
 * If email matches ADMIN_EMAIL, a magic link is sent.
 */
export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (typeof email !== "string") {
      return NextResponse.json({ success: true });
    }

    const normalized = email.toLowerCase().trim();
    const allowed = getAdminEmail();

    if (!allowed) {
      console.error("[admin/login] ADMIN_EMAIL not configured");
      return NextResponse.json({ success: true });
    }

    if (normalized !== allowed) {
      // Silent failure
      return NextResponse.json({ success: true });
    }

    const token = issueMagicLink(normalized);
    const link = `https://fair-comparisons.com/api/admin/verify?token=${token}`;

    const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f9fafb">
<tr><td align="center" style="padding:24px 16px">
<table cellpadding="0" cellspacing="0" border="0" width="520" style="background:#ffffff;border-radius:12px;overflow:hidden">
  <tr><td style="background:#0f766e;padding:24px 32px">
    <p style="margin:0;font-size:18px;font-weight:700;color:#fff">FairComparisons Admin</p>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#111827">Sign in to the admin dashboard</p>
    <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.6">
      Click the button below to sign in. This link expires in 24 hours and can only be used once.
    </p>
    <div style="text-align:center;margin:24px 0">
      <a href="${link}" style="display:inline-block;background:#0d9488;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
        Open dashboard
      </a>
    </div>
    <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;word-break:break-all">
      Or paste this URL into your browser: ${link}
    </p>
    <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;padding-top:16px;border-top:1px solid #f3f4f6">
      If you did not request this, ignore the email. No action will be taken.
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

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
