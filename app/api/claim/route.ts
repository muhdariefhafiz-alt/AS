import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "../../lib/email";
import { givenName, titleName } from "../../lib/names";
import { checkRateLimit, clientIp } from "../../lib/rateLimit";

// Service role: this route reads agent contact PII (email/phone) to send a
// claim verification email. Those columns are REVOKEd from the anon role.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function generateToken(): string {
  // Cryptographically secure, URL-safe (~32 chars, 192 bits).
  return randomBytes(24).toString("base64url");
}

export async function POST(req: Request) {
  try {
    // Throttle claim attempts so the public CEA number cannot be used to
    // brute-force / spam claim emails.
    const ip = clientIp(req);
    const { limited } = await checkRateLimit(`claim:${ip}`, 5, 60 * 60 * 1000);
    if (limited) {
      return NextResponse.json(
        { error: "Too many claim attempts. Please try again later." },
        { status: 429 }
      );
    }

    const { agentId, email, phone, ceaNumber } = await req.json();

    if (!agentId || !email || !ceaNumber) {
      return NextResponse.json({ error: "Agent ID, email, and CEA registration number are required" }, { status: 400 });
    }

    // Check agent exists
    const { data: agent } = await supabase
      .from("sg_agents")
      .select("id, name, claimed, cea_registration, email")
      .eq("id", agentId)
      .single();

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Verify CEA registration number matches
    if (
      !agent.cea_registration ||
      ceaNumber.trim().toLowerCase() !== agent.cea_registration.trim().toLowerCase()
    ) {
      return NextResponse.json(
        { error: "CEA registration number does not match this profile" },
        { status: 403 }
      );
    }

    if (agent.claimed) {
      return NextResponse.json({ error: "This profile has already been claimed" }, { status: 409 });
    }

    // SECURITY: the verification link is sent to the agent's ON-FILE email, not
    // to whatever address the request supplied. The CEA number is public, so
    // accepting an attacker-supplied destination would let anyone claim any
    // profile to their own inbox. The submitted email is only recorded and
    // becomes claimed_email AFTER the real agent clicks the link in their own
    // inbox. If we have no on-file email, claiming must go through support.
    if (!agent.email) {
      return NextResponse.json(
        {
          error:
            "We could not verify ownership automatically for this profile. Please email hello@fair-comparisons.com to claim it.",
        },
        { status: 422 }
      );
    }

    // Check for existing pending claim
    const { data: existing } = await supabase
      .from("sg_claim_requests")
      .select("id, status")
      .eq("agent_id", agentId)
      .eq("status", "pending")
      .single();

    if (existing) {
      return NextResponse.json({ error: "A claim request is already pending for this profile" }, { status: 409 });
    }

    // Create claim request
    const token = generateToken();
    const { error } = await supabase.from("sg_claim_requests").insert({
      agent_id: agentId,
      email,
      phone: phone || null,
      verification_token: token,
    });

    if (error) {
      return NextResponse.json({ error: "Failed to create claim request" }, { status: 500 });
    }

    // Transactional: send verification link with full HTML.
    // Sent to the agent's ON-FILE email (agent.email), never the submitted
    // address — this is what proves the claimant controls the agent's inbox.
    const verifyUrl = `https://fair-comparisons.com/api/claim/verify?token=${token}`;
    const verifyHtml = buildVerifyEmail(agent.name, verifyUrl);
    // Await the send: on Vercel a fire-and-forget promise is dropped once the
    // response returns (the lambda freezes), so the Klaviyo event never lands.
    // try/catch so a Klaviyo hiccup does not fail an otherwise-valid claim.
    try {
      await sendEmail({
        to: agent.email,
        subject: `Verify your profile claim, ${givenName(agent.name)}`,
        html: verifyHtml,
        metric: "Claim Verification",
        properties: {
          agent_name: agent.name,
          agent_id: agentId,
          verify_url: verifyUrl,
        },
      });
    } catch (err) {
      console.error("[claim] Klaviyo verification event failed:", err);
    }

    return NextResponse.json({
      success: true,
      message: "Claim request submitted. Check your email for the verification link.",
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

function buildVerifyEmail(agentName: string, verifyUrl: string): string {
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f9fafb">
<tr><td align="center" style="padding:24px 16px">
<table cellpadding="0" cellspacing="0" border="0" width="560" style="background:#ffffff;border-radius:12px;overflow:hidden">

  <tr><td style="background:#0a1733;padding:24px 32px">
    <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff">FairComparisons</p>
  </td></tr>

  <tr><td style="padding:32px">
    <p style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111827">Confirm your profile claim</p>

    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6">
      You requested to claim the profile for <strong>${titleName(agentName)}</strong> on FairComparisons. Click below to verify this is you.
    </p>

    <div style="text-align:center;margin:28px 0;">
      <a href="${verifyUrl}" style="display:inline-block;background:#1f44ff;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">
        Verify and claim profile
      </a>
    </div>

    <p style="margin:0 0 8px;font-size:13px;color:#6b7280;line-height:1.5">
      The link expires in 24 hours. If the button does not work, copy this URL:
    </p>
    <p style="margin:0 0 16px;font-size:12px;color:#9ca3af;word-break:break-all;">
      ${verifyUrl}
    </p>

    <p style="margin:16px 0 0;font-size:14px;color:#374151;line-height:1.6;padding-top:16px;border-top:1px solid #f3f4f6;">
      Once verified, you can add your photo, a short bio, and start receiving seller leads in your area through your dashboard.
    </p>
  </td></tr>

  <tr><td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.5">
      If you did not request this, ignore this email. No changes will be made.
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}
