// Guaranteed-short SEO titles. The root layout applies the title template
// "%s | FairComparisons", which adds 17 chars, so any page title over ~48
// chars overflows the 65-char best-practice limit (and Google truncates the
// tail around 60). Dynamic titles carry variable-length names (agents,
// developments, agencies), so a static string cannot guarantee the cap.
//
// seoTitle() returns a Next.js ABSOLUTE title (bypassing the layout template)
// that is always <= MAX. It appends the brand when it fits, drops the brand
// when it does not, and truncates the lead at a word boundary only in the
// extreme case. Put the most important keywords at the FRONT of `lead`.
const BRAND = " | FairComparisons";
const MAX = 60; // safely under the 65 limit and Google's ~60px visible cut

export function seoTitle(lead: string): { absolute: string } {
  const l = lead.replace(/\s+/g, " ").trim();
  if (l.length + BRAND.length <= MAX) return { absolute: l + BRAND };
  if (l.length <= MAX) return { absolute: l };
  // Truncate at a word boundary, then strip a dangling trailing connector
  // (&, -, :, comma, |) so it never ends mid-phrase like "... Price History &".
  const cut = l
    .slice(0, MAX)
    .replace(/\s+\S*$/, "")
    // Drop a dangling trailing connector or short function word so the title
    // never ends mid-phrase like "... Property Agent in" or "... History &".
    .replace(/[\s&\-:,|]+$/, "")
    .replace(/\s+(in|at|vs|for|the|of|to|on|by|and|a|an)$/i, "")
    .replace(/[\s&\-:,|]+$/, "")
    .trim();
  return { absolute: cut || l.slice(0, MAX).trim() };
}
