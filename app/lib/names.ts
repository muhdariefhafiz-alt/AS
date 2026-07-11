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

/**
 * Best name to greet an agent by. CEA names are often "TAN YONG DA (BENDON)"
 * where the parenthesised part is the name the agent actually goes by, so
 * prefer its first token; otherwise fall back to givenName(). Greeting by the
 * raw first token would address Bendon as "Tan".
 */
export function greetName(full: string): string {
  const marketing = (full || "").match(/\(([^)]+)\)/)?.[1]?.trim();
  if (marketing) {
    const tok = marketing.split(/\s+/)[0];
    if (tok) return titleName(tok);
  }
  return givenName(full);
}

/** Clean an agency name: drop "Pte Ltd"/"LLP", title-case, keep ERA upper. */
export function cleanAgency(name: string): string {
  const n = (name || "").replace(/\s*PTE\.?\s*LTD\.?\.?$/i, "").replace(/\s*LLP$/i, "").trim();
  return titleName(n).replace(/\bEra\b/g, "ERA");
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
