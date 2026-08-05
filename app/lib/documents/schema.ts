// Shared document schema: field definitions, the stored field shape, and the
// deterministic formatting helpers every template renders through.
//
// CLIENT-SAFE. This module (and anything it imports) is bundled into the
// dashboard, so it must never reach pdf-lib. Template content builders keep
// their `import type { ContentBlock } from "./render"` type-only for the same
// reason; the value-level pdf-lib entry point is build.ts, server only.

export type FieldType = "text" | "textarea" | "number" | "money" | "date" | "select" | "checkbox";

export type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  options?: string[];
  default?: string;
  colSpan?: 1 | 2;
  // Collapsed-by-default groups. "agent" is the salesperson block (pre-filled
  // from the profile); "advanced" holds terms most agents leave at the default.
  group?: "agent" | "advanced";
  showIf?: { key: string; equals: string };
};

export type Section = { title: string; note?: string; fields: FieldDef[] };

export type DocFields = Record<string, string>;

export function fieldKeysOf(sections: Section[]): string[] {
  return sections.flatMap((s) => s.fields.map((f) => f.key));
}

// --- formatting helpers (deterministic; no Date.now / argless new Date) ---

export const BLANK = "____________________";

export function money(v: string | undefined): string {
  const raw = String(v ?? "");
  // A leading minus is invalid on a rent/deposit; do not silently flip its sign.
  if (/-/.test(raw)) return "S$0";
  const n = Number(raw.replace(/[^0-9.]/g, ""));
  if (!isFinite(n) || n <= 0) return "S$0";
  return `S$${n.toLocaleString("en-SG", { maximumFractionDigits: n % 1 === 0 ? 0 : 2 })}`;
}

export function moneyNumber(v: string | undefined): number {
  const raw = String(v ?? "");
  if (/-/.test(raw)) return 0;
  const n = Number(raw.replace(/[^0-9.]/g, ""));
  return isFinite(n) && n > 0 ? n : 0;
}

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function under1000(n: number): string {
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(`${ONES[Math.floor(n / 100)]} Hundred`);
    n %= 100;
    if (n) parts.push("and");
  }
  if (n >= 20) {
    parts.push(TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : ""));
  } else if (n > 0) {
    parts.push(ONES[n]);
  }
  return parts.join(" ");
}

// Amount in words, the convention on Singapore agency letters ("Singapore
// Dollars Four Thousand Only"). Returns "" for a missing or invalid amount so
// callers can fall back to the figure alone rather than print a wrong word.
export function moneyWords(v: string | undefined): string {
  const n = moneyNumber(v);
  if (!n) return "";
  const whole = Math.floor(n);
  const cents = Math.round((n - whole) * 100);
  if (whole > 999_999_999) return "";
  const groups: Array<[number, string]> = [
    [1_000_000, "Million"],
    [1_000, "Thousand"],
  ];
  let rest = whole;
  const parts: string[] = [];
  for (const [size, name] of groups) {
    const q = Math.floor(rest / size);
    if (q) {
      parts.push(`${under1000(q)} ${name}`);
      rest %= size;
    }
  }
  if (rest) parts.push(under1000(rest));
  if (!parts.length) parts.push("Zero");
  const words = parts.join(" ").replace(/\s+/g, " ").trim();
  return cents ? `${words} and ${under1000(cents)} Cents` : `${words} Only`;
}

// Parse a YYYY-MM-DD into a real UTC date, rejecting out-of-range values like
// 2026-13-45 (regex shape alone is not enough for a legal document).
export function parseIso(iso: string | undefined): { y: number; m: number; d: number } | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return { y, m, d };
}

export function normTermMonths(months: string | undefined): number {
  return Math.max(1, Math.min(120, Math.round(Number(months) || 0) || 12));
}

// Optional whole-number field with a floor/ceiling; returns the fallback when
// the value is absent or unusable.
export function normInt(v: string | undefined, fallback: number, min = 0, max = 999): number {
  const n = Math.round(Number(v));
  if (!isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export function fmtDate(iso: string | undefined): string {
  const p = parseIso(iso);
  if (!p) return BLANK;
  return new Date(Date.UTC(p.y, p.m - 1, p.d)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Add months (and optional extra days) to a start date, CLAMPING the day to the
// target month's last day so a month-end start (31 Jan) never overflows into
// the wrong month, then step back one day for a term that ends the day before
// the anniversary.
export function leaseEndDate(startIso: string | undefined, months: string | undefined, extraDays = 0): string {
  const p = parseIso(startIso);
  if (!p) return BLANK;
  const n = normTermMonths(months);
  const monthIndex = p.m - 1 + n;
  const ty = p.y + Math.floor(monthIndex / 12);
  const tm = ((monthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
  const dt = new Date(Date.UTC(ty, tm, Math.min(p.d, lastDay)));
  dt.setUTCDate(dt.getUTCDate() - 1 + Math.max(0, Math.min(365, Math.round(extraDays) || 0)));
  return dt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export const truthy = (v: string | undefined) => v === "true" || v === "1" || v === "on";

// Split a multi-line textarea into clean list items.
export function lines(v: string | undefined): string[] {
  return String(v ?? "")
    .split(/\r?\n/)
    .map((s) => s.replace(/^\s*[-*•]\s*/, "").trim())
    .filter(Boolean);
}

// A short document title derived from the property address.
export function addressTitle(prefix: string, address: string | undefined, fallback: string): string {
  const addr = (address || "").trim();
  const short = addr ? addr.split(",")[0].slice(0, 48) : fallback;
  return `${prefix} · ${short}`;
}
