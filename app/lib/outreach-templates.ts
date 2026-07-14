/**
 * Outreach email templates for the FairComparisons agent acquisition campaign.
 *
 * Each function returns { subject, html } ready for Klaviyo.
 * Agent data comes from sg_agents (all real, CEA-sourced).
 *
 * Every template here is a marketing send (doc A1, Agent cold outreach):
 * it composes through emailShell and carries the signed unsubscribe link,
 * so each function takes the recipient email as its final argument.
 */

import { greetName } from "./names";
import { emailShell, p, muted, rows, statCard } from "./email-layout";

const BASE_URL = "https://fair-comparisons.com";

// Why the recipient got this (doc A1). Same note on every outreach send.
const OUTREACH_FOOTER_NOTE =
  "You are receiving this because your details are publicly listed as a CEA-registered salesperson. Not you? Ignore this email.";

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
  return greetName(name);
}

/** AgentScore stat card, with a percentile line when it is genuinely strong. */
function scoreBlock(score: number | null, percentile: number | null): string {
  if (!score) return "";
  const card = statCard(String(Math.round(Number(score))), "AgentScore");
  const pct =
    percentile && percentile <= 25
      ? muted(`Top ${percentile}% of agents in Singapore.`)
      : "";
  return card + pct;
}

// ------------------------------------------------------------------
// Template 1: Initial outreach (doc A1 copy)
// ------------------------------------------------------------------

export function initialOutreach(agent: AgentData, recipientEmail: string) {
  const campaign = "initial_outreach";
  const claim = claimUrl(agent.slug, campaign);
  const profile = profileUrl(agent.slug, campaign);

  const subject = `${firstName(agent.name)}, your FairComparisons profile is live (and public)`;

  const html = emailShell({
    preheader: "Your CEA record is already on your public page. Claim it free.",
    heading: "Your profile is live (and public)",
    bodyHtml: [
      p(
        `Your CEA transaction record is public, so FairComparisons already has a <a href="${profile}" style="color:#1f44ff">page for you</a> that sellers${agent.primary_area ? ` in ${agent.primary_area}` : ""} can see.`
      ),
      scoreBlock(agent.score, agent.percentile),
      p(
        "Right now it shows your record only. Claim it, free, to add your photo, a short bio, and start receiving seller leads matched to your area. Claiming never changes your ranking. We rank on the CEA data alone."
      ),
    ].join(""),
    cta: { label: "Claim your profile", href: claim },
    footerNote: OUTREACH_FOOTER_NOTE,
    unsubscribeEmail: recipientEmail,
  });

  return { subject, html };
}

// ------------------------------------------------------------------
// Template 2: Competitor comparison
// ------------------------------------------------------------------

export function competitorComparison(agent: AgentData, recipientEmail: string) {
  const campaign = "competitor_comparison";
  const claim = claimUrl(agent.slug, campaign);

  const area = agent.primary_area || "Singapore";
  const subject = `Buyers in ${area} are comparing you to other agents`;

  const html = emailShell({
    preheader: "Claimed profiles get contacted. Unclaimed ones get skipped.",
    heading: `Buyers in ${area} are comparing agents`,
    bodyHtml: [
      p(
        `When buyers search for property agents in ${area}, they see a side-by-side comparison of profiles and scores. Yours is one of them.`
      ),
      p("The difference between a claimed and unclaimed profile:"),
      rows([
        "<strong>Claimed profile:</strong> photo, WhatsApp button, practice description, full transaction history. Buyers contact you directly.",
        "<strong>Your profile now:</strong> placeholder image, no contact details. Buyers see your score but move on to agents they can reach.",
      ]),
      p("30 seconds. Free. You keep full control."),
    ].join(""),
    cta: { label: "Claim your profile", href: claim },
    footerNote: OUTREACH_FOOTER_NOTE,
    unsubscribeEmail: recipientEmail,
  });

  return { subject, html };
}

// ------------------------------------------------------------------
// Template 3: Cost comparison
// ------------------------------------------------------------------

export function costComparison(agent: AgentData, recipientEmail: string) {
  const campaign = "cost_comparison";
  const claim = claimUrl(agent.slug, campaign);

  const area = agent.primary_area || "Singapore";
  const subject = `${firstName(agent.name)}, what are you paying for leads right now?`;

  const html = emailShell({
    preheader: "PropertyGuru from S$163/mo, 99.co from S$82/mo, FairComparisons free.",
    heading: "What are you paying for visibility?",
    bodyHtml: [
      p("What Singapore agents typically spend on visibility each month:"),
      rows([
        "PropertyGuru agent profile: <strong>S$163-500/mo</strong>",
        "99.co agent page: <strong>from S$82/mo</strong>",
        "Meta/Google ads: <strong>S$500-2,000/mo</strong>",
        "FairComparisons profile: <strong>Free</strong>",
      ]),
      p(
        `Your profile is already ranking on Google for "${area} property agent" searches. Buyers find it, see your transaction history and score, but cannot contact you because the profile is unclaimed.`
      ),
      p(
        "Claiming takes 30 seconds. You add your photo and WhatsApp. Buyers reach you directly."
      ),
    ].join(""),
    cta: { label: "Claim your profile (free)", href: claim },
    footerNote: OUTREACH_FOOTER_NOTE,
    unsubscribeEmail: recipientEmail,
  });

  return { subject, html };
}

// ------------------------------------------------------------------
// Template 4: Weekly nudge (requires view count)
// ------------------------------------------------------------------

export function weeklyNudge(agent: AgentData, views: number, recipientEmail: string) {
  const campaign = "weekly_nudge";
  const claim = claimUrl(agent.slug, campaign);

  const area = agent.primary_area || "Singapore";
  const subject = `Your profile was viewed ${views} times, still unclaimed`;

  const html = emailShell({
    preheader: `Buyers in ${area} found your profile this week but could not reach you.`,
    heading: "Buyers found you this week",
    bodyHtml: [
      statCard(String(views), "Profile views this week"),
      p(
        `Buyers searched for agents in ${area} and found your profile. But without your photo and contact details, they moved on to agents who claimed theirs.`
      ),
      p(
        "Claiming takes under a minute. Add your photo, WhatsApp, and a short bio so buyers can reach you."
      ),
    ].join(""),
    cta: { label: "Claim now", href: claim },
    footerNote: OUTREACH_FOOTER_NOTE,
    unsubscribeEmail: recipientEmail,
  });

  return { subject, html };
}

// ------------------------------------------------------------------
// Template 5: Area leader (requires rank + area)
// ------------------------------------------------------------------

export function areaLeader(
  agent: AgentData,
  rank: number,
  townOrArea: string,
  recipientEmail: string
) {
  const campaign = "area_leader";
  const claim = claimUrl(agent.slug, campaign);
  const profile = profileUrl(agent.slug, campaign);

  const subject = `You rank #${rank} in ${townOrArea}`;

  const html = emailShell({
    preheader: `Buyers can see your ranking in ${townOrArea}. They just cannot reach you.`,
    heading: `You rank #${rank} in ${townOrArea}`,
    bodyHtml: [
      p("This is the last time we will email you about this."),
      p(
        `Based on ${agent.transaction_count ? `<strong>${agent.transaction_count}</strong> CEA transactions` : "your CEA transactions"}, you are the <strong>#${rank} ranked agent in ${townOrArea}</strong> on FairComparisons.`
      ),
      scoreBlock(agent.score, agent.percentile),
      p(
        `Buyers searching for agents in ${townOrArea} can see your ranking, your transaction history, and your score. What they cannot do is contact you, because your profile is unclaimed.`
      ),
      p(
        "If you want to keep it that way, no action needed. We will not email you again."
      ),
      p("If you want buyers to reach you: claim it. Free. 30 seconds."),
      muted(
        `Or <a href="${profile}" style="color:#6b7280">see your ranking</a> first.`
      ),
    ].join(""),
    cta: { label: "Claim your profile", href: claim },
    footerNote: OUTREACH_FOOTER_NOTE,
    unsubscribeEmail: recipientEmail,
  });

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
