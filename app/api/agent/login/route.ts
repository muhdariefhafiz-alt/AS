import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { sendEmail } from "../../../lib/email";
import { issueAgentMagicLink } from "../../../lib/agent-auth";
import { checkRateLimit, clientIp } from "../../../lib/rateLimit";
import { escapeHtml } from "../../../lib/escapeHtml";

// Agent dashboard sign-in. Emails a magic link to a CLAIMED agent's on-file
// claimed_email. Anti-enumeration: always returns success.
export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    const { limited } = await checkRateLimit(`agent-login:${ip}`, 5, 60 * 60 * 1000);
    if (limited) {
      return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }

    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }
    const normalized = email.toLowerCase().trim();

    const { data: agent } = await supabaseAdmin()
      .from("sg_agents")
      .select("id, name")
      .eq("claimed", true)
      .eq("claimed_email", normalized)
      .maybeSingle();

    // Only send if a claimed agent matches; always respond success either way.
    if (agent) {
      const token = issueAgentMagicLink(normalized);
      const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fair-comparisons.com";
      const link = `${site}/api/agent/login/verify?token=${encodeURIComponent(token)}`;
      try {
        await sendEmail({
          to: normalized,
          subject: "Your FairComparisons dashboard sign-in link",
          html: signInHtml(agent.name ?? "", link),
          metric: "Agent Login Link",
          properties: { agent_id: agent.id },
        });
      } catch (err) {
        console.error("[agent/login] email failed", err);
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

function signInHtml(name: string, link: string): string {
  const first = escapeHtml((name || "").split(" ")[0] || "there");
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f9fafb">
<tr><td align="center" style="padding:24px 16px">
<table cellpadding="0" cellspacing="0" border="0" width="520" style="background:#ffffff;border-radius:12px;overflow:hidden">
  <tr><td style="background:#0a1733;padding:24px 32px"><p style="margin:0;font-size:18px;font-weight:700;color:#ffffff">FairComparisons</p></td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#111827">${first}, here is your sign-in link.</p>
    <p style="margin:0 0 22px;font-size:14px;color:#374151;line-height:1.6">Click to open your agent dashboard. The link expires in 24 hours and can be used once.</p>
    <p style="margin:0 0 8px"><a href="${link}" style="display:inline-block;background:#1f44ff;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Open my dashboard</a></p>
    <p style="margin:18px 0 0;font-size:12px;color:#9ca3af;line-height:1.5">If you did not request this, ignore this email.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}
