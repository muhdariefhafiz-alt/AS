import type { Tier } from "../tiers";
import { LOI_SECTIONS, LOI_FIELD_KEYS, loiTitle } from "./loi";
import { TENANCY_SECTIONS, TENANCY_FIELD_KEYS, tenancyTitle } from "./tenancy";
import type { DocFields, Section } from "./schema";

// Agent Paperwork tool: document system-of-record.
// See docs/strategy/paperwork-phase2-prd-2026-08.md.
//
// This registry is the SINGLE dispatch point for document types. The API
// routes and the dashboard panel derive their behaviour from it, so adding a
// template means adding an entry here plus its content builder in build.ts,
// never editing a switch in a route or a hardcoded label in the UI.
//
// CLIENT-SAFE: the panel imports this module. Everything reachable from here
// must stay free of pdf-lib (see schema.ts).
//
// GUARDRAILS (do not relax):
// - Administrative SaaS only. Documents NEVER touch AgentScore, ranking,
//   search order or lead allocation. Quotas gate a tool, not a ranking.
// - Templates are standard and neutral. The tool fills a document for the
//   agent's review; it is NOT legal advice and gives none.
// - PDF output carries a "not legal advice" footer, and any unsigned document
//   carries a DRAFT watermark so a template is never mistaken for an executed
//   agreement.
// - Party PII (PDPA): stored in a PRIVATE bucket, served only to the owning
//   agent. Collect only what the document needs; NRIC/FIN is optional.

// Documents an agent may generate per rolling 30 days, by tier.
//
// Deliberately generous from Phase 2a. One rental deal is a chain of documents
// (LOI, then the tenancy agreement), so a cap at the habit target would strangle
// the behaviour we are trying to start, and the same templates are available
// free elsewhere. The paid unit this feeds is the stored record and, from Phase
// 2c, e-signing; not access to a template.
export const DOCUMENT_QUOTA: Record<Tier, number> = {
  free: 10,
  verified: 30,
  professional: Number.POSITIVE_INFINITY,
  elite: Number.POSITIVE_INFINITY,
};

export function quotaLabel(tier: Tier): string {
  const q = DOCUMENT_QUOTA[tier];
  return q === Number.POSITIVE_INFINITY ? "Unlimited" : `${q}/month`;
}

export type DocStatus = "draft" | "finalised" | "sent" | "signed" | "void";

// Fields are editable only while a document is a draft. Finalising is the point
// the agent takes it to signing, so the content stops moving under it; "Back to
// draft" is the way to change something. Phase 2c seals signed documents for
// good.
export const EDITABLE_STATUSES: DocStatus[] = ["draft"];
export function isEditable(status: string): boolean {
  return (EDITABLE_STATUSES as string[]).includes(status);
}

export type DocTypeMeta = {
  key: string; // doc_type
  templateKey: string; // versioned template id
  label: string; // picker + list chip
  kicker: string; // eyebrow above the editor
  blurb: string; // picker card description
  minutes: string; // honest time estimate on the picker
  available: boolean; // phased rollout
  sections: Section[];
  fieldKeys: string[];
  titlePrefix: string;
  title: (f: DocFields) => string;
  // Shown under the form: what the agent should know about this document.
  guidance: { strong: string; body: string; link?: { href: string; label: string } };
  empty: { headline: string; em: string; body: string; cta: string };
  // Offer to start the next document in the deal from this one.
  chain?: { to: string; label: string; hint: string };
};

export const DOC_TYPES: DocTypeMeta[] = [
  {
    key: "loi",
    templateKey: "loi_residential_v1",
    label: "Letter of Intent",
    kicker: "Letter of intent (residential lease)",
    blurb: "The offer letter that opens a rental deal: terms, good-faith deposit, and the deadline to sign the tenancy agreement.",
    minutes: "about 2 minutes",
    available: true,
    sections: LOI_SECTIONS,
    fieldKeys: LOI_FIELD_KEYS,
    titlePrefix: "LOI",
    title: loiTitle,
    guidance: {
      strong: "Standard template for your review.",
      body:
        "This generates a standard letter, not legal advice. It goes out over your name and CEA registration, so read it before you send it. The good-faith deposit is held by the landlord, never by us.",
    },
    empty: {
      headline: "Send a letter of intent",
      em: "in two minutes.",
      body:
        "Your details, your CEA registration and the standard clauses are already in. Fill in the property, the parties and the terms, then download a clean PDF to send.",
      cta: "New letter of intent",
    },
    chain: {
      to: "tenancy_agreement",
      label: "Create the tenancy agreement",
      hint: "Carries the property, parties and terms across. You will not retype them.",
    },
  },
  {
    key: "tenancy_agreement",
    templateKey: "tenancy_residential_v1",
    label: "Tenancy agreement",
    kicker: "Residential tenancy agreement",
    blurb: "A standard TA for an HDB, condo or room rental. Starts filled with your details.",
    minutes: "about 3 minutes",
    available: true,
    sections: TENANCY_SECTIONS,
    fieldKeys: TENANCY_FIELD_KEYS,
    titlePrefix: "TA",
    title: tenancyTitle,
    guidance: {
      strong: "Standard template for your review.",
      body:
        "This generates a standard document, not legal advice. Have the parties seek independent advice for non-standard terms. After signing, the tenant stamps the agreement within 14 days via IRAS e-Stamping.",
      link: { href: "https://mytax.iras.gov.sg", label: "IRAS e-Stamping" },
    },
    empty: {
      headline: "Draw up a tenancy agreement",
      em: "in minutes.",
      body:
        "A standard residential TA, started with your salesperson details and the standard clauses already filled in. Fill the property, parties and rent, then download a clean PDF to sign.",
      cta: "New tenancy agreement",
    },
  },
  {
    key: "cea_estate_agency_agreement",
    templateKey: "cea_eaa_v1",
    label: "CEA estate agency agreement",
    kicker: "Prescribed estate agency agreement",
    blurb: "The prescribed CEA form for your mandate. Coming soon.",
    minutes: "",
    available: false,
    sections: [],
    fieldKeys: [],
    titlePrefix: "EAA",
    title: () => "Estate agency agreement",
    guidance: { strong: "", body: "" },
    empty: { headline: "", em: "", body: "", cta: "" },
  },
];

export function docTypeByKey(key: string): DocTypeMeta | undefined {
  return DOC_TYPES.find((d) => d.key === key);
}

export function docTypeByTemplate(templateKey: string): DocTypeMeta | undefined {
  return DOC_TYPES.find((d) => d.templateKey === templateKey);
}

export function availableDocTypes(): DocTypeMeta[] {
  return DOC_TYPES.filter((d) => d.available);
}

// Client-safe slice: the panel needs labels and schemas, never the server-only
// prefill/content functions.
export function docTypeLabel(key: string): string {
  return docTypeByKey(key)?.label ?? "Document";
}
