// CEA property-advertisement compliance pre-flight: pure, client-side logic.
//
// Requirements are taken verbatim from CEA's published guidance ("Check if your
// property agent is registered", last updated 21 Aug 2025):
//   A property advertisement must list:
//     - the agent's name, CEA registration number, and phone number
//     - the agency's name and CEA licence number
//   Exception: for newspaper classified ads and phone-text (SMS) ads, only the
//   agent's name (full or abbreviated) and phone number are required.
// Salespersons must also have the client's prior consent to advertise a property,
// and must not make false or misleading statements (Estate Agents Act / CEA PSM).
//
// Nothing here is legal advice. The tool is a checklist against published CEA
// requirements; the agent remains responsible for compliance.
// Source: https://www.cea.gov.sg/consumers/engaging-a-property-agent/check-if-your-property-agent-is-registered/

export const CEA_ADVERT_SOURCE_URL =
  "https://www.cea.gov.sg/consumers/engaging-a-property-agent/check-if-your-property-agent-is-registered/";
export const CEA_PUBLIC_REGISTER_URL = "https://eservices.cea.gov.sg/aceas/public-register/";

export type AdMedium = "online" | "classified";

// CEA salesperson registration number, e.g. R123456A. Legacy numbers use a P
// prefix. Letter + 6 digits + letter.
const CEA_REG_RE = /\b[RP]\d{6}[A-Z]\b/i;
// Estate agent (agency) licence number, e.g. L3008022J. L + 7 digits + letter
// (a 6-8 digit range is allowed to be safe against edge formats).
const CEA_LICENCE_RE = /\bL\d{6,8}[A-Z]\b/i;
// Singapore phone number: 8 digits starting 3, 6, 8 or 9, optional +65 and spacing.
const SG_PHONE_RE = /(?:\+?65[\s-]?)?[3689]\d{3}[\s-]?\d{4}\b/;

export type CheckId = "reg" | "licence" | "phone";
export type CheckResult = { id: CheckId; label: string; met: boolean; hint: string };

// Claims that risk breaching CEA's rule against false or misleading statements.
// These are advisory: the agent must be able to substantiate any claim made.
const RISKY_CLAIMS: { re: RegExp; term: string }[] = [
  { re: /\bguarantee(?:d|s)?\b/i, term: "guarantee" },
  { re: /\bsure[\s-]?sell\b/i, term: "sure sell" },
  { re: /\bconfirm(?:ed)?\s+sale\b/i, term: "confirmed sale" },
  { re: /\b(?:best|lowest|cheapest|highest)\s+(?:price|deal|value)\b/i, term: "best/lowest/highest price" },
  { re: /\bcheapest\b/i, term: "cheapest" },
  { re: /\b(?:no\.?\s?1|number\s?(?:1|one)|#1)\b/i, term: "no. 1 / #1" },
  { re: /\b100\s?%/i, term: "100%" },
  { re: /\brisk[\s-]?free\b/i, term: "risk-free" },
  { re: /\bmust\s+sell\b/i, term: "must sell" },
  { re: /\bfire\s?sale\b/i, term: "fire sale" },
  { re: /\bonce[\s-]in[\s-]a[\s-]lifetime\b/i, term: "once-in-a-lifetime" },
  { re: /\bundervalued\b/i, term: "undervalued" },
];

export type AdvertReport = {
  medium: AdMedium;
  required: CheckResult[];
  metCount: number;
  totalCount: number;
  allMet: boolean;
  risky: string[]; // matched risky claim terms
};

export function checkAdvert(text: string, medium: AdMedium = "online"): AdvertReport {
  const t = text || "";
  const hasReg = CEA_REG_RE.test(t);
  const hasLicence = CEA_LICENCE_RE.test(t);
  const hasPhone = SG_PHONE_RE.test(t);

  // Newspaper classified / SMS: only name + phone required (name is a manual
  // check the agent confirms, so the only auto-detectable requirement is phone).
  const required: CheckResult[] =
    medium === "classified"
      ? [{ id: "phone", label: "Contact phone number", met: hasPhone, hint: "Include your phone number so consumers can verify you on the CEA Public Register." }]
      : [
          { id: "reg", label: "Your CEA registration number", met: hasReg, hint: "Format R123456A (or a legacy P number). Every online, portal, website or social ad must show it." },
          { id: "licence", label: "Agency CEA licence number", met: hasLicence, hint: "Format L3008022J. The property agency's licence number must appear alongside your details." },
          { id: "phone", label: "Contact phone number", met: hasPhone, hint: "A Singapore phone number that resolves to your profile on the CEA Public Register." },
        ];

  const risky = RISKY_CLAIMS.filter((c) => c.re.test(t)).map((c) => c.term);
  const metCount = required.filter((r) => r.met).length;

  return {
    medium,
    required,
    metCount,
    totalCount: required.length,
    allMet: metCount === required.length,
    risky,
  };
}
