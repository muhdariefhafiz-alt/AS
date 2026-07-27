import type { Tier } from "../tiers";

// Agent Paperwork tool: document system-of-record.
// See docs/strategy/paperwork-tool-spec-2026-07.md.
//
// GUARDRAILS (do not relax):
// - Administrative SaaS only. Documents NEVER touch AgentScore, ranking,
//   search order or lead allocation. Quotas gate a tool, not a ranking.
// - Templates are standard and neutral. The tool fills a document for the
//   agent's review; it is NOT legal advice and gives none.
// - PDF output carries a "not legal advice" footer, and any unsigned document
//   carries a DRAFT watermark so a template is never mistaken for an executed
//   agreement.
// - Party PII (PDPA): stored in a PRIVATE bucket, served only via short-lived
//   signed URLs to the owning agent. Collect only what the document needs;
//   NRIC/FIN is optional and minimised.

// Documents an agent may generate per rolling 30 days, by tier. Mirrors
// BUILDING_PAGE_QUOTA: a free agent gets one (to seed the habit); the value
// compounds with stored history behind the subscription.
export const DOCUMENT_QUOTA: Record<Tier, number> = {
  free: 1,
  verified: 5,
  professional: 20,
  elite: Number.POSITIVE_INFINITY,
};

export function quotaLabel(tier: Tier): string {
  const q = DOCUMENT_QUOTA[tier];
  return q === Number.POSITIVE_INFINITY ? "Unlimited" : `${q}/month`;
}

export type DocStatus = "draft" | "finalised" | "sent" | "signed" | "void";

export type DocTypeMeta = {
  key: string; // doc_type
  templateKey: string; // versioned template id
  label: string;
  blurb: string;
  available: boolean; // phased rollout
};

// Registry of document types. Phase 1 ships the residential tenancy agreement;
// later phases add CEA prescribed forms and the OTP (available:false teases the
// roadmap without pretending they exist).
export const DOC_TYPES: DocTypeMeta[] = [
  {
    key: "tenancy_agreement",
    templateKey: "tenancy_residential_v1",
    label: "Residential tenancy agreement",
    blurb: "A standard TA for an HDB, condo or room rental. Starts filled with your details.",
    available: true,
  },
  {
    key: "otp",
    templateKey: "otp_v1",
    label: "Option to Purchase",
    blurb: "Standard OTP for a resale. Coming soon.",
    available: false,
  },
  {
    key: "cea_estate_agency_agreement",
    templateKey: "cea_eaa_v1",
    label: "CEA estate agency agreement",
    blurb: "The prescribed CEA form for your mandate. Coming soon.",
    available: false,
  },
];

export function docTypeByKey(key: string): DocTypeMeta | undefined {
  return DOC_TYPES.find((d) => d.key === key);
}

export function availableDocTypes(): DocTypeMeta[] {
  return DOC_TYPES.filter((d) => d.available);
}
