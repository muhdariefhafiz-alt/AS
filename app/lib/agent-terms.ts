import { FEE_PCT_DISPLAY, FEE_RATE_NAME, GST_PCT } from "./fee";

// Versioned blanket agent agreement. Bump AGENT_TERMS_VERSION whenever the
// substance changes; agents are re-prompted to accept the new version.
export const AGENT_TERMS_VERSION = "2026-06";
export const AGENT_TERMS_TITLE = "FairComparisons Agent Agreement";

export const AGENT_TERMS_INTRO =
  `This is the agreement between you (a CEA-registered property salesperson) and FairComparisons. ` +
  `It is a single blanket agreement: it covers every seller you are introduced to through FairComparisons, ` +
  `so you do not sign anything per lead. Read it before you accept.`;

export type Clause = { h: string; body: string };

export const AGENT_TERMS_CLAUSES: Clause[] = [
  {
    h: "1. What counts as an introduction",
    body:
      "An introduction is any seller who reaches you because of FairComparisons. That includes a seller matched to you " +
      "through the /sell shortlist, and a seller who found you on FairComparisons and then contacted you directly " +
      "(WhatsApp, call, email, or your claimed profile). If the seller came from FairComparisons, the sale is covered.",
  },
  {
    h: "2. Success fee",
    body:
      `You pay a success fee of ${FEE_PCT_DISPLAY} of the final sale price, plus ${GST_PCT}% GST, on any sale that completes ` +
      `with a seller introduced through FairComparisons. ${FEE_PCT_DISPLAY} is the ${FEE_RATE_NAME}, locked for the founding cohort. ` +
      "There is no upfront cost, no monthly fee for this, and no fee if a sale does not complete.",
  },
  {
    h: "3. When and how you pay",
    body:
      "The fee is invoiced when the sale completes. Payment is by PayNow and is due within 14 days of the invoice. " +
      "You log the instruction, the option to purchase, and the completed sale price in your dashboard; FairComparisons " +
      "issues the invoice automatically.",
  },
  {
    h: "4. Honest reporting",
    body:
      "You agree to report completed sales accurately and promptly. FairComparisons cross-checks reported sale prices against " +
      "public URA and HDB transaction records, and may confirm completion with the seller directly. Under-reporting or hiding " +
      "a completed introduction is a breach of this agreement.",
  },
  {
    h: "5. Your ranking is never affected",
    body:
      "This fee buys nothing on the platform. Your AgentScore and your position in any ranking or shortlist are computed from " +
      "public CEA, URA and HDB data only. No payment, now or ever, changes your rank or the leads you receive.",
  },
  {
    h: "6. Term",
    body:
      "This agreement starts when you accept it and continues while your profile is claimed or you receive introductions. " +
      "It covers every introduction made during that time, including completions that finalise after you stop receiving new leads. " +
      "You may stop receiving leads at any time by asking us to unpublish your contact details.",
  },
  {
    h: "7. General",
    body:
      "FairComparisons is an introduction and comparison platform, not a party to your agency agreement with the seller. " +
      "This agreement is governed by the laws of Singapore. If any part is unenforceable, the rest still applies.",
  },
];

export const AGENT_TERMS_FOOTNOTE =
  "This is a plain-English summary of a binding agreement. Keep a copy for your records. " +
  "If you want your own legal advice before signing, take it.";
