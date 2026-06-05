// Escape user-controlled text before interpolating it into HTML email bodies.
// Email clients do not run JS, so this is not XSS, but unescaped UGC (seller
// names, agent names, free-text fields) can otherwise inject markup/links and
// turn a genuine FairComparisons email into a phishing surface.
//
// NOTE: for JSON-LD inside <script type="application/ld+json"> use the <
// escape instead (see app/lib/jsonLd.ts) — HTML entities are NOT decoded inside
// a <script> tag, so &lt; would corrupt the JSON.
export function escapeHtml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
