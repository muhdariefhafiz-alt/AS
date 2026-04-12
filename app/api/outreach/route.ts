import { NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";

// Will use Resend once API key is configured
// For now, generates the email content and logs it

export async function POST(request: Request) {
  const { agentId, template } = await request.json();

  if (!agentId) {
    return NextResponse.json({ error: "agentId required" }, { status: 400 });
  }

  // Get agent data
  const { data: agent } = await supabase
    .from("sg_agents")
    .select("name, slug, score, transaction_count, primary_area, cea_registration, agency_name, percentile")
    .eq("id", agentId)
    .single();

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const score = agent.score ? Math.round(Number(agent.score)) : null;
  const profileUrl = `https://fair-comparisons.com/property-agents/agent/${agent.slug}`;
  const claimUrl = `${profileUrl}#claim`;

  // Generate personalized email
  const subject = `Your FairComparisons profile is live - AgentScore: ${score || "pending"}`;

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
  <div style="background: #0A6B5E; padding: 24px 32px; border-radius: 12px 12px 0 0;">
    <span style="color: white; font-weight: 800; font-size: 18px;">FairComparisons</span>
  </div>

  <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <p>Hi ${agent.name.split(" ")[0]},</p>

    <p>Your property agent profile on FairComparisons is now live. We scored you based on your CEA transaction records${agent.primary_area ? ` in ${agent.primary_area}` : ""}.</p>

    ${score ? `
    <div style="background: #f0fdfa; border: 2px solid #0A6B5E; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
      <div style="font-size: 48px; font-weight: 800; color: #0A6B5E;">${score}</div>
      <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 2px;">AgentScore</div>
      ${agent.percentile && agent.percentile <= 25 ? `<div style="margin-top: 8px; font-size: 14px; color: #0A6B5E; font-weight: 600;">Top ${agent.percentile}% in Singapore</div>` : ""}
    </div>
    ` : ""}

    <p>Your profile shows:</p>
    <ul style="color: #4b5563; line-height: 1.8;">
      ${agent.transaction_count ? `<li>${agent.transaction_count} recorded CEA transactions</li>` : ""}
      ${agent.primary_area ? `<li>Primary area: ${agent.primary_area}</li>` : ""}
      <li>Agency: ${agent.agency_name || "Independent"}</li>
    </ul>

    <p><strong>Claim your profile (free)</strong> to add your photo, WhatsApp number, and practice description. Buyers searching your area will be able to contact you directly.</p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${claimUrl}" style="background: #0A6B5E; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
        View and claim your profile
      </a>
    </div>

    <p style="font-size: 13px; color: #9ca3af;">
      FairComparisons is an independent platform. Your score is calculated from public CEA data and Google reviews. It cannot be influenced by payment.
    </p>

    <p style="font-size: 13px; color: #9ca3af;">
      <a href="${profileUrl}" style="color: #0A6B5E;">${profileUrl}</a>
    </p>
  </div>
</div>`;

  // Log to outreach table
  await supabase.from("sg_outreach").update({
    email_sent: true,
    email_sent_at: new Date().toISOString(),
    email_subject: subject,
  }).eq("agent_id", agentId);

  // TODO: Send via Resend when API key is configured
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({ from: 'hello@fair-comparisons.com', to: agentEmail, subject, html });

  return NextResponse.json({
    success: true,
    preview: { subject, profileUrl, claimUrl },
    html,
    note: "Email generated but not sent - Resend API key not yet configured",
  });
}
