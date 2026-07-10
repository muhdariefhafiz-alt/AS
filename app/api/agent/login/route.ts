import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { sendEmail } from "../../../lib/email";
import { issueAgentMagicLink } from "../../../lib/agent-auth";
import { checkRateLimit, clientIp } from "../../../lib/rateLimit";
import { escapeHtml } from "../../../lib/escapeHtml";
import { emailShell, p, muted } from "../../../lib/email-layout";

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
        const firstRaw = (agent.name ?? "").split(" ")[0] || "there";
        const first = escapeHtml(firstRaw);
        await sendEmail({
          to: normalized,
          subject: `${firstRaw}, here is your sign-in link`,
          html: emailShell({
            preheader: "Click to open your agent dashboard. Link expires in 24 hours.",
            heading: `${first}, here is your sign-in link.`,
            bodyHtml:
              p("Click to open your agent dashboard. The link expires in 24 hours and can be used once.") +
              muted("If you did not request this, ignore this email."),
            cta: { label: "Open my dashboard", href: link },
          }),
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
