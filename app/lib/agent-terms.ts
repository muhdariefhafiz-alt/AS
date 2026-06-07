// Versioned platform terms for agents. Bump AGENT_TERMS_VERSION whenever the
// substance changes; agents are re-prompted to accept the new version.
// Subscription model: free profile + optional tool subscriptions. No success
// fee. When a seller selects an agent we pass that introduction free; the
// subscription never gates leads or seller-facing placement (licence-safe: no
// reward is tied to the introduction or the sale).
export const AGENT_TERMS_VERSION = "2026-06c";
export const AGENT_TERMS_TITLE = "FairComparisons Agent Terms";

export const AGENT_TERMS_INTRO =
  `These are the terms between you (a CEA-registered property salesperson) and FairComparisons. ` +
  `FairComparisons is an independent comparison and data platform. Your profile is free to claim and use, ` +
  `and you can optionally subscribe for reputation and analytics tools. Read these before you accept.`;

export type Clause = { h: string; body: string };

export const AGENT_TERMS_CLAUSES: Clause[] = [
  {
    h: "1. Your profile is free",
    body:
      "Your FairComparisons profile is built from public CEA, URA and HDB transaction records. " +
      "Claiming it is free, and lets you add your photo, bio, specialisations and contact details so that sellers " +
      "comparing agents can reach you directly.",
  },
  {
    h: "2. We never take a cut of your sales",
    body:
      "FairComparisons charges no success fee, no commission and no per-lead fee. When a seller comparing agents chooses " +
      "to invite you, we pass you that introduction at no cost, and any sale you close is entirely yours. Your " +
      "subscription, if any, never changes whether, when or how many seller introductions you receive, nor your " +
      "position in seller-facing results, which are set by public data alone.",
  },
  {
    h: "3. Optional subscriptions",
    body:
      "You may subscribe for tools only: Verified at S$29 per month, Professional at S$69 per month, or Elite at S$149 per month. " +
      "These add a verified badge, profile and branding tools, your verified reviews, profile analytics and area market data. " +
      "Subscriptions are billed monthly via Stripe and you can cancel at any time.",
  },
  {
    h: "4. Subscriptions never affect your ranking",
    body:
      "Paying for tools buys nothing on the rankings. Your AgentScore and your position in any list are computed from " +
      "public CEA, URA and HDB data only. No payment, now or ever, changes your rank.",
  },
  {
    h: "5. Accuracy and corrections",
    body:
      "Your transaction figures come straight from public government records. If something is wrong, tell us and we will " +
      "check it against the official CEA, URA or HDB source and correct verified errors. You can also ask us to remove your profile.",
  },
  {
    h: "6. General",
    body:
      "FairComparisons is an independent comparison and data platform, not an estate agency and not a party to any transaction " +
      "between you and a seller. These terms are governed by the laws of Singapore. If any part is unenforceable, the rest still applies.",
  },
];

export const AGENT_TERMS_FOOTNOTE =
  "This is a plain-English summary. Keep a copy for your records. " +
  "If you want your own legal advice before accepting, take it.";
