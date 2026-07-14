// Shared name helpers. CEA stores agent names ALL-CAPS and often as
// "SURNAME, Given" — deriving the first token greets people by their surname
// (e.g. "ANG BOON KIAT, JASON" -> "ANG"). These fix that everywhere.

/** Title-case an ALL-CAPS name/place, keeping separators. */
export function titleName(full: string): string {
  return (full || "").toLowerCase().replace(/(^|[\s,/('-])([a-z])/g, (_m, p, c) => p + c.toUpperCase());
}

/** The given (first) name. "SURNAME, Given" -> "Given"; else the first token. */
export function givenName(full: string): string {
  if (!full) return "";
  const part = full.includes(",") ? full.split(",")[1] : full;
  const tok = (part || full).trim().split(/\s+/)[0] || full;
  return titleName(tok);
}

// Common Singaporean Chinese surnames as they appear FIRST in CEA (surname-first)
// records, plus the top Mandarin pinyin forms. Used to safely pull a given name
// out of a bare ALL-CAPS name with no parenthesised preferred name
// ("TAN BEN DON" -> "Ben"). Gated on a known surname so Malay ("MUHAMMAD ...")
// and Indian given-first names are never mis-stripped down to a middle token.
const CN_SURNAMES = new Set([
  "TAN", "LIM", "LEE", "NG", "WONG", "GOH", "ONG", "CHUA", "TEO", "KOH", "HAN",
  "CHAN", "LOW", "TOH", "SIM", "YEO", "CHONG", "CHIA", "CHEW", "SEAH", "HO",
  "HENG", "LAU", "FOO", "YAP", "QUEK", "GAN", "LEONG", "LOH", "SOH", "TAY",
  "PHUA", "OOI", "CHOO", "WEE", "ANG", "CHENG", "CHIN", "CHOW", "FONG", "KWEK",
  "LIEW", "LING", "MOK", "POH", "SNG", "THAM", "YONG", "SEE", "SIA", "NEO",
  "PNG", "TNG", "KANG", "LOKE", "TICK", "SEET",
  "ZHANG", "ZHOU", "LI", "WANG", "CHEN", "LIU", "HUANG", "WU", "ZHAO", "YANG",
  "XU", "SUN", "ZHU", "LIN", "GUO",
]);

/**
 * Best name to greet an agent by. CEA names are surname-first, often
 * "TAN YONG DA (BENDON)" where the parenthesised part is the name the agent
 * actually goes by. Resolution order:
 *   1. Parenthesised preferred name  ("... (Ziqi)" -> "Ziqi").
 *   2. "SURNAME, Given"              (comma path -> "Given").
 *   3. Bare ALL-CAPS with a known Chinese surname first ("TAN BEN DON" -> "Ben").
 *   4. Fallback to givenName().
 * Greeting by the raw first token would address Bendon as "Tan".
 */
export function greetName(full: string): string {
  const raw = (full || "").trim();
  if (!raw) return "";

  const marketing = raw.match(/\(([^)]+)\)/)?.[1]?.trim();
  if (marketing) {
    const tok = marketing.split(/\s+/)[0];
    if (tok) return titleName(tok);
  }

  if (raw.includes(",")) return givenName(raw);

  const toks = raw.split(/\s+/);
  const isAllCaps = raw === raw.toUpperCase() && /[A-Z]/.test(raw);
  if (isAllCaps && toks.length >= 2 && CN_SURNAMES.has(toks[0].toUpperCase())) {
    // Skip the surname; use the next token that is more than a single initial.
    const given = toks.slice(1).find((t) => t.replace(/\W/g, "").length > 1) || toks[1];
    return titleName(given);
  }

  return givenName(raw);
}

/** Clean an agency name: drop "Pte Ltd"/"LLP", title-case, keep ERA upper. */
export function cleanAgency(name: string): string {
  const n = (name || "").replace(/\s*PTE\.?\s*LTD\.?\.?$/i, "").replace(/\s*LLP$/i, "").trim();
  return titleName(n).replace(/\bEra\b/g, "ERA");
}

/**
 * Agency name for immediate use before the words "Property Agent". Strips a
 * trailing "Property"/"Properties" so an agency like "Jinson Property" renders
 * "Jinson Property Agent", not "Jinson Property Property Agent". Do NOT use for a
 * standalone agency name (use cleanAgency) where the trailing token is the name.
 */
export function agencyForRole(name: string): string {
  return cleanAgency(name).replace(/\s+propert(?:y|ies)$/i, "").trim();
}

/**
 * Share of an agent's transactions that are SALES (not rentals), from a
 * { TYPE: count } map. Used to flag rental-focused agents on seller surfaces:
 * a "best agent to sell" who is mostly leasing rentals would otherwise mislead.
 */
export function saleShare(types: Record<string, number> | null | undefined): number {
  let sale = 0, total = 0;
  for (const [k, n] of Object.entries(types || {})) {
    total += n;
    const key = k.toUpperCase();
    if (key.includes("SALE") && !key.includes("RENTAL")) sale += n;
  }
  return total ? sale / total : 0;
}
