/**
 * Outreach email templates for the FairComparisons agent acquisition campaign.
 *
 * Each function returns { subject, html } ready for Klaviyo.
 * Agent data comes from sg_agents (all real, CEA-sourced).
 */

const BASE_URL = "https://fair-comparisons.com";
const BRAND_COLOR = "#0A6B5E";

interface AgentData {
  name: string;
  slug: string;
  score: number | null;
  transaction_count: number | null;
  primary_area: string | null;
  agency_name: string | null;
  cea_registration: string | null;
  percentile: number | null;
}

function profileUrl(slug: string, campaign: string) {
  return `${BASE_URL}/property-agents/agent/${slug}?utm_source=outreach&utm_medium=email&utm_campaign=${campaign}`;
}

function claimUrl(slug: string, campaign: string) {
  return `${profileUrl(slug, campaign)}#claim`;
}

function firstName(name: string) {
  return name.split(" ")[0];
}

function roundScore(score: number | null): string {
  return score ? String(Math.round(Number(score))) : "pending";
}

// ------------------------------------------------------------------
// Shared layout components
// ------------------------------------------------------------------

function emailHeader() {
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:0 auto;">
  <tr>
    <td style="background:${BRAND_COLOR};padding:24px 32px;border-radius:12px 12px 0 0;">
      <span style="color:#ffffff;font-weight:800;font-size:18px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">FairComparisons</span>
    </td>
  </tr>`;
}

function emailFooter() {
  return `
  <tr>
    <td style="padding:24px 32px;border:1px solid #e5e7eb;border-top:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <p style="font-size:12px;color:#9ca3af;line-height:1.6;margin:0 0 8px 0;">
        FairComparisons ranks Singapore property agents using CEA public records. Your profile exists because your transactions are part of that public record. Questions? Reply to this email.
      </p>
      <p style="font-size:12px;color:#9ca3af;margin:0;">
        <a href="{{unsubscribe_url}}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe from future emails</a>
      </p>
    </td>
  </tr>
</table>`;
}

function bodyOpen() {
  return `
  <tr>
    <td style="padding:32px;border:1px solid #e5e7eb;border-top:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;font-size:15px;line-height:1.6;">`;
}

function bodyClose() {
  return `
    </td>
  </tr>`;
}

function ctaButton(text: string, href: string) {
  return `
<div style="text-align:center;margin:28px 0;">
  <a href="${href}" style="background:${BRAND_COLOR};color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;display:inline-block;">
    ${text}
  </a>
</div>`;
}

function scoreBlock(score: number | null, percentile: number | null) {
  if (!score) return "";
  const rounded = Math.round(Number(score));
  return `
<div style="background:#f0fdfa;border:2px solid ${BRAND_COLOR};border-radius:12px;padding:20px;text-align:center;margin:24px 0;">
  <div style="font-size:48px;font-weight:800;color:${BRAND_COLOR};">${rounded}</div>
  <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:2px;">AgentScore</div>
  ${percentile && percentile <= 25 ? `<div style="margin-top:8px;font-size:14px;color:${BRAND_COLOR};font-weight:600;">Top ${percentile}% in Singapore</div>` : ""}
</div>`;
}

// ------------------------------------------------------------------
// Template 1: Initial outreach
// ------------------------------------------------------------------

export function initialOutreach(agent: AgentData) {
  const campaign = "initial_outreach";
  const claim = claimUrl(agent.slug, campaign);
  const score = roundScore(agent.score);

  const subject = `Your AgentScore is ${score} out of 100`;

  const html = `${emailHeader()}${bodyOpen()}
<p>Hi ${firstName(agent.name)},</p>

<p>We scored every CEA-registered property agent in Singapore based on their actual transaction records. Your profile is live${agent.primary_area ? ` for ${agent.primary_area}` : ""}.</p>

${scoreBlock(agent.score, agent.percentile)}

<p style="margin-bottom:4px;">Your public record:</p>
<ul style="color:#4b5563;line-height:1.8;margin-top:4px;">
  ${agent.transaction_count ? `<li><strong>${agent.transaction_count}</strong> CEA transactions on record</li>` : ""}
  ${agent.primary_area ? `<li>Primary area: ${agent.primary_area}</li>` : ""}
  <li>${agent.agency_name || "Independent"}</li>
</ul>

<p>Right now, buyers who find your profile cannot contact you. Claim it (free, takes 30 seconds) to add your photo, WhatsApp, and a short description of your practice.</p>

${ctaButton("See your profile and claim it", claim)}

<p style="font-size:13px;color:#9ca3af;">Scores are calculated from CEA data and Google reviews. No agent can pay to change their score.</p>
${bodyClose()}${emailFooter()}`;

  return { subject, html };
}

// ------------------------------------------------------------------
// Template 2: Competitor comparison
// ------------------------------------------------------------------

export function competitorComparison(agent: AgentData) {
  const campaign = "competitor_comparison";
  const claim = claimUrl(agent.slug, campaign);

  const area = agent.primary_area || "Singapore";
  const subject = `Buyers in ${area} are comparing you to other agents`;

  const html = `${emailHeader()}${bodyOpen()}
<p>Hi ${firstName(agent.name)},</p>

<p>When buyers search for property agents in ${area}, they see a side-by-side comparison of profiles and scores. Yours is one of them.</p>

<p>The difference between a claimed and unclaimed profile:</p>

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;font-size:14px;">
  <tr>
    <td width="50%" style="padding:16px;background:#f0fdfa;border-radius:8px 0 0 8px;vertical-align:top;">
      <p style="margin:0 0 8px;font-weight:700;color:#0f766e;font-size:12px;text-transform:uppercase;">Claimed profile</p>
      <p style="margin:0;color:#374151;line-height:1.7;font-size:13px;">Photo, WhatsApp button, practice description, full transaction history. Buyers contact you directly.</p>
    </td>
    <td width="50%" style="padding:16px;background:#f3f4f6;border-radius:0 8px 8px 0;vertical-align:top;">
      <p style="margin:0 0 8px;font-weight:700;color:#9ca3af;font-size:12px;text-transform:uppercase;">Your profile now</p>
      <p style="margin:0;color:#6b7280;line-height:1.7;font-size:13px;">Placeholder image. No contact details. Buyers see your score but move on to agents they can reach.</p>
    </td>
  </tr>
</table>

<p>30 seconds. Free. You keep full control.</p>

${ctaButton("Claim your profile", claim)}
${bodyClose()}${emailFooter()}`;

  return { subject, html };
}

// ------------------------------------------------------------------
// Template 3: Cost comparison
// ------------------------------------------------------------------

export function costComparison(agent: AgentData) {
  const campaign = "cost_comparison";
  const claim = claimUrl(agent.slug, campaign);

  const subject = `${firstName(agent.name)}, what are you paying for leads right now?`;

  const html = `${emailHeader()}${bodyOpen()}
<p>Hi ${firstName(agent.name)},</p>

<p>What Singapore agents typically spend on visibility each month:</p>

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;font-size:14px;">
  <tr style="border-bottom:1px solid #e5e7eb;">
    <td style="padding:12px 0;color:#6b7280;">PropertyGuru agent profile</td>
    <td style="padding:12px 0;text-align:right;font-weight:600;">S$163-500/mo</td>
  </tr>
  <tr style="border-bottom:1px solid #e5e7eb;">
    <td style="padding:12px 0;color:#6b7280;">99.co agent page</td>
    <td style="padding:12px 0;text-align:right;font-weight:600;">from S$82/mo</td>
  </tr>
  <tr style="border-bottom:1px solid #e5e7eb;">
    <td style="padding:12px 0;color:#6b7280;">Meta/Google ads</td>
    <td style="padding:12px 0;text-align:right;font-weight:600;">S$500-2,000/mo</td>
  </tr>
  <tr>
    <td style="padding:12px 0;color:${BRAND_COLOR};font-weight:600;">FairComparisons profile</td>
    <td style="padding:12px 0;text-align:right;font-weight:800;color:${BRAND_COLOR};font-size:16px;">Free</td>
  </tr>
</table>

<p>Your profile is already ranking on Google for "${agent.primary_area || "Singapore"} property agent" searches. Buyers find it, see your transaction history and score, but cannot contact you because the profile is unclaimed.</p>

<p>Claiming takes 30 seconds. You add your photo and WhatsApp. Buyers reach you directly.</p>

${ctaButton("Claim your profile (free)", claim)}
${bodyClose()}${emailFooter()}`;

  return { subject, html };
}

// ------------------------------------------------------------------
// Template 4: Weekly nudge (requires view count)
// ------------------------------------------------------------------

export function weeklyNudge(agent: AgentData, views: number) {
  const campaign = "weekly_nudge";
  const claim = claimUrl(agent.slug, campaign);

  const area = agent.primary_area || "Singapore";
  const subject = `Your profile was viewed ${views} times - still unclaimed`;

  const html = `${emailHeader()}${bodyOpen()}
<p>Hi ${firstName(agent.name)},</p>

<div style="background:#f0fdfa;border:2px solid ${BRAND_COLOR};border-radius:12px;padding:20px;text-align:center;margin:24px 0;">
  <div style="font-size:48px;font-weight:800;color:${BRAND_COLOR};">${views}</div>
  <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:2px;">Profile views this week</div>
</div>

<p>Buyers searched for agents in ${area} and found your profile. But without your photo and contact details, they moved on to agents who claimed theirs.</p>

<p>Claiming takes under a minute. Add your photo, WhatsApp, and a short bio so buyers can reach you.</p>

${ctaButton("Claim now", claim)}
${bodyClose()}${emailFooter()}`;

  return { subject, html };
}

// ------------------------------------------------------------------
// Template 5: Area leader (requires rank + area)
// ------------------------------------------------------------------

export function areaLeader(agent: AgentData, rank: number, townOrArea: string) {
  const campaign = "area_leader";
  const claim = claimUrl(agent.slug, campaign);
  const profile = profileUrl(agent.slug, campaign);

  const subject = `You're #${rank} in ${townOrArea}. Buyers can see it. They just can't reach you.`;

  const html = `${emailHeader()}${bodyOpen()}
<p>Hi ${firstName(agent.name)},</p>

<p>This is the last time we will email you about this.</p>

<p>Based on ${agent.transaction_count || "your"} CEA transactions, you are the <strong>#${rank} ranked agent in ${townOrArea}</strong> on FairComparisons.</p>

${scoreBlock(agent.score, agent.percentile)}

<p>Buyers searching for agents in ${townOrArea} can see your ranking, your transaction history, and your score. What they cannot do is contact you, because your profile is unclaimed.</p>

<p>If you want to keep it that way, no action needed. We will not email you again.</p>

<p>If you want buyers to reach you: claim it. Free. 30 seconds.</p>

<div style="text-align:center;margin:28px 0;">
  <a href="${profile}" style="background:#ffffff;color:${BRAND_COLOR};padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;border:2px solid ${BRAND_COLOR};margin-right:8px;">
    See your ranking
  </a>
  <a href="${claim}" style="background:${BRAND_COLOR};color:#ffffff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">
    Claim your profile
  </a>
</div>
${bodyClose()}${emailFooter()}`;

  return { subject, html };
}

// Template name to function mapping
export const TEMPLATES = {
  initialOutreach,
  competitorComparison,
  costComparison,
  weeklyNudge,
  areaLeader,
} as const;

export type TemplateName = keyof typeof TEMPLATES;
