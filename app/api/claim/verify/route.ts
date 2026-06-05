import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "../../../lib/email";
import { AGENT_TERMS_VERSION } from "../../../lib/agent-terms";
import { PLATFORM_FEE_PCT } from "../../../lib/fee";
import { givenName } from "../../../lib/names";

// Service role: reads/writes agent email + claimed_email during claim
// verification. Those columns are REVOKEd from the anon role.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  // Find claim request
  const { data: claim } = await supabase
    .from("sg_claim_requests")
    .select("id, agent_id, email, status")
    .eq("verification_token", token)
    .single();

  if (!claim) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 404 });
  }

  if (claim.status === "verified") {
    return NextResponse.redirect(new URL("/claim/success", req.url));
  }

  // Verify the claim
  await supabase
    .from("sg_claim_requests")
    .update({ status: "verified", verified_at: new Date().toISOString() })
    .eq("id", claim.id);

  // Mark agent as claimed
  await supabase
    .from("sg_agents")
    .update({ claimed: true, claimed_email: claim.email, claimed_at: new Date().toISOString() })
    .eq("id", claim.agent_id);

  // Fetch agent details for the welcome email payload
  const { data: agentFull } = await supabase
    .from("sg_agents")
    .select("name, slug, score, agency_name, cea_registration")
    .eq("id", claim.agent_id)
    .single();

  // Record the blanket agent agreement. Clicking the email-verified claim link
  // is the e-signature: identity is confirmed (CEA match at request time +
  // verified email here). This is the binding success-fee contract, stored.
  await supabase.from("sg_agent_agreements").insert({
    agent_id: claim.agent_id,
    cea_registration: agentFull?.cea_registration ?? null,
    terms_version: AGENT_TERMS_VERSION,
    fee_pct: PLATFORM_FEE_PCT,
    signatory_name: agentFull?.name ?? null,
    signatory_email: claim.email,
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    user_agent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
    source: "claim",
  });

  // Fire Agent Claimed welcome with full HTML.
  // Consent: double opt-in (submitted email + clicked verification link).
  const profileUrl = `https://fair-comparisons.com/property-agents/agent/${agentFull?.slug ?? ""}`;
  const dashboardUrl = "https://fair-comparisons.com/dashboard";
  const claimedHtml = buildClaimedEmail(
    agentFull?.name ?? "",
    agentFull?.score ? Math.round(Number(agentFull.score)) : null,
    profileUrl,
    dashboardUrl,
  );
  // Await before the redirect: a fire-and-forget promise is dropped when the
  // Vercel lambda freezes after responding, so the Klaviyo event never lands.
  try {
    await sendEmail({
      to: claim.email,
      subject: "Your profile is claimed. Here's what to do next.",
      html: claimedHtml,
      metric: "Agent Claimed",
      properties: {
        agent_name: agentFull?.name ?? "",
        agent_slug: agentFull?.slug ?? "",
        agent_score: agentFull?.score ?? null,
        agency_name: agentFull?.agency_name ?? "",
        profile_url: profileUrl,
        dashboard_url: dashboardUrl,
      },
    });
  } catch (err) {
    console.error("[claim/verify] Klaviyo welcome event failed:", err);
  }

  // Redirect to success page
  return NextResponse.redirect(new URL("/claim/success", req.url));
}

function buildClaimedEmail(
  name: string,
  score: number | null,
  profileUrl: string,
  dashboardUrl: string,
): string {
  const firstName = givenName(name);
  const scoreSection = score
    ? `
    <div style="background:#eef2fb;border:2px solid #0a1733;border-radius:12px;padding:20px;text-align:center;margin:20px 0;">
      <div style="font-size:48px;font-weight:800;color:#0a1733;">${score}</div>
      <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:2px;">Your AgentScore</div>
    </div>`
    : "";

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
    <p style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111827">${firstName}, your profile is live.</p>

    ${scoreSection}

    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6">
      Sellers in your area looking for an agent can now find your profile and invite you to quote. Three things to do now:
    </p>

    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;">
      <tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
        <span style="display:inline-block;width:24px;height:24px;background:#1f44ff;color:#fff;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;margin-right:10px;">1</span>
        <span style="font-size:14px;color:#374151;font-weight:500;">Add a professional photo</span>
      </td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
        <span style="display:inline-block;width:24px;height:24px;background:#1f44ff;color:#fff;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;margin-right:10px;">2</span>
        <span style="font-size:14px;color:#374151;font-weight:500;">Add your WhatsApp number</span>
      </td></tr>
      <tr><td style="padding:10px 0;">
        <span style="display:inline-block;width:24px;height:24px;background:#1f44ff;color:#fff;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;margin-right:10px;">3</span>
        <span style="font-size:14px;color:#374151;font-weight:500;">Write a short practice description</span>
      </td></tr>
    </table>

    <table cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="padding-right:8px">
        <a href="${dashboardUrl}?utm_source=claimed&utm_medium=email" style="display:inline-block;background:#1f44ff;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
          Complete your profile
        </a>
      </td>
      <td>
        <a href="${profileUrl}?utm_source=claimed&utm_medium=email" style="display:inline-block;border:1px solid #d1d5db;color:#374151;padding:11px 20px;border-radius:8px;text-decoration:none;font-weight:500;font-size:14px">
          View public page
        </a>
      </td>
    </tr></table>

    <p style="margin:24px 0 0;font-size:13px;color:#6b7280;line-height:1.5;padding-top:16px;border-top:1px solid #f3f4f6;">
      You will receive a weekly report on your seller leads and profile activity. You can unsubscribe from those at any time.
    </p>
  </td></tr>

  <tr><td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.5">
      FairComparisons. Rankings based on CEA transaction data, not advertising.
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}
