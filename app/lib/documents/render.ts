import { PDFDocument, StandardFonts, rgb, degrees, type PDFFont, type PDFPage } from "pdf-lib";

// Minimal, self-contained PDF layout engine for legal-style documents, built on
// pdf-lib (pure JS, serverless-safe; no headless Chrome). It word-wraps and
// paginates a stream of ContentBlocks into A4 pages with Times typography,
// numbered clauses, signature blocks, an optional DRAFT watermark and a
// "not legal advice" footer stamped on every page.

export type ContentBlock =
  | { kind: "title"; text: string }
  | { kind: "subtitle"; text: string }
  | { kind: "para"; text: string; indent?: number; gap?: number }
  | { kind: "clause"; n: number; heading: string; body: Array<string | { list: string[] }> }
  | { kind: "kv"; rows: Array<[string, string]>; heading?: string }
  | { kind: "spacer"; h: number }
  | { kind: "rule" }
  | { kind: "signatures"; blocks: Array<{ role: string; name?: string; sub?: string }> };

// A4 in points.
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M_LEFT = 60;
const M_RIGHT = 60;
const M_TOP = 66;
const M_BOTTOM = 74; // leaves room for the footer
const CONTENT_W = PAGE_W - M_LEFT - M_RIGHT;

const INK = rgb(0.09, 0.12, 0.19);
const SLATE = rgb(0.42, 0.46, 0.53);
const LINE = rgb(0.82, 0.84, 0.87);

// pdf-lib StandardFonts encode WinAnsi (Latin-1 / CP1252) only; drawText THROWS
// on anything outside it. Singapore names/inventories routinely contain CJK,
// Tamil, or smart typography, so EVERY string drawn is passed through this
// first: normalise common typographic characters to ASCII, keep Latin-1
// (accents included), and replace any remaining out-of-range character with
// "?" so the renderer degrades gracefully instead of 500-ing.
// Break a word with no spaces that is wider than maxWidth into pieces that fit.
function splitLongWord(word: string, font: PDFFont, size: number, maxWidth: number): string[] {
  if (font.widthOfTextAtSize(word, size) <= maxWidth) return [word];
  const pieces: string[] = [];
  let cur = "";
  for (const ch of word) {
    if (font.widthOfTextAtSize(cur + ch, size) > maxWidth && cur) {
      pieces.push(cur);
      cur = ch;
    } else {
      cur += ch;
    }
  }
  if (cur) pieces.push(cur);
  return pieces;
}

// Typographic normalisation: the characters we CAN faithfully map into
// Latin-1. Split out of winAnsiSafe so unencodableChars() below measures
// exactly what the renderer will do. If the two ever drift apart, the
// pre-flight check starts passing text the renderer then mangles, which is
// precisely the failure it exists to prevent.
function normaliseTypography(input: string): string {
  return String(input)
    .normalize("NFC")
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/…/g, "...")
    .replace(/[   ]/g, " ")
    ;
}

function encodableInWinAnsi(ch: string): boolean {
  const c = ch.charCodeAt(0);
  // Printable Latin-1 (skip the C1 control block 0x80-0x9F).
  return c === 9 || c === 10 || (c >= 0x20 && c <= 0x7e) || (c >= 0xa0 && c <= 0xff);
}

/**
 * The characters in `input` that the standard-14 fonts CANNOT encode, and that
 * winAnsiSafe would therefore replace with "?". Deduplicated, order preserved.
 *
 * pdf-lib's built-in Times and Helvetica are WinAnsi only, so a Chinese, Tamil
 * or Arabic name cannot be drawn at all. Substituting "?" silently turned a
 * FINALISED, watermark-free letter of intent into one addressed "To ???", with
 * a deposit "made payable to ???" and a signature block reading "Signed by the
 * Tenant / ???". Callers use this to refuse finalisation and name the offending
 * fields, so the agent enters the romanised NRIC name (which is the name a
 * Singapore tenancy instrument should carry anyway) rather than discovering the
 * damage after sending it to a landlord.
 */
export function unencodableChars(input: string): string[] {
  const out: string[] = [];
  for (const ch of normaliseTypography(input)) {
    if (!encodableInWinAnsi(ch) && !out.includes(ch)) out.push(ch);
  }
  return out;
}

function winAnsiSafe(input: string): string {
  return normaliseTypography(input)
    .split("")
    .map((ch) => (encodableInWinAnsi(ch) ? ch : "?"))
    .join("");
}

type RenderOpts = {
  draft: boolean;
  footerNote: string;
  templateKey: string;
  // Overrides the DRAFT stamp (the public sample uses its own wording).
  watermarkText?: string;
};

class Layout {
  doc!: PDFDocument;
  body!: PDFFont;
  bold!: PDFFont;
  italic!: PDFFont;
  sans!: PDFFont;
  page!: PDFPage;
  y = 0;

  static async create(): Promise<Layout> {
    const l = new Layout();
    l.doc = await PDFDocument.create();
    l.body = await l.doc.embedFont(StandardFonts.TimesRoman);
    l.bold = await l.doc.embedFont(StandardFonts.TimesRomanBold);
    l.italic = await l.doc.embedFont(StandardFonts.TimesRomanItalic);
    l.sans = await l.doc.embedFont(StandardFonts.Helvetica);
    l.newPage();
    return l;
  }

  newPage() {
    this.page = this.doc.addPage([PAGE_W, PAGE_H]);
    this.y = PAGE_H - M_TOP;
  }

  ensure(space: number) {
    if (this.y - space < M_BOTTOM) this.newPage();
  }

  wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
    const out: string[] = [];
    for (const rawLine of winAnsiSafe(text).split("\n")) {
      const words = rawLine.split(/\s+/).filter(Boolean);
      if (words.length === 0) { out.push(""); continue; }
      let line = "";
      for (const w of words) {
        // Hard-break a single word longer than the line (a pasted URL or an
        // unbroken string) so wrapping can never loop or overflow the margin.
        const pieces = splitLongWord(w, font, size, maxWidth);
        for (let pi = 0; pi < pieces.length; pi++) {
          const piece = pieces[pi];
          const trial = line ? `${line} ${piece}` : piece;
          if (font.widthOfTextAtSize(trial, size) > maxWidth && line) {
            out.push(line);
            line = piece;
          } else {
            line = trial;
          }
          if (pi < pieces.length - 1) { out.push(line); line = ""; }
        }
      }
      if (line) out.push(line);
    }
    return out;
  }

  para(
    text: string,
    opts: { size?: number; font?: PDFFont; indent?: number; gap?: number; color?: ReturnType<typeof rgb>; lead?: number } = {}
  ) {
    const size = opts.size ?? 10.5;
    const font = opts.font ?? this.body;
    const indent = opts.indent ?? 0;
    const lead = opts.lead ?? size * 1.42;
    const color = opts.color ?? INK;
    const x = M_LEFT + indent;
    const lines = this.wrap(text, font, size, CONTENT_W - indent);
    for (const line of lines) {
      this.ensure(lead);
      this.page.drawText(line, { x, y: this.y - size, size, font, color });
      this.y -= lead;
    }
    if (opts.gap) this.y -= opts.gap;
  }

  title(text: string) {
    this.ensure(40);
    const size = 20;
    const t = winAnsiSafe(text);
    const w = this.bold.widthOfTextAtSize(t, size);
    this.page.drawText(t, { x: (PAGE_W - w) / 2, y: this.y - size, size, font: this.bold, color: INK });
    this.y -= size * 1.6;
  }

  subtitle(text: string) {
    const size = 9;
    const t = winAnsiSafe(text);
    const w = this.sans.widthOfTextAtSize(t, size);
    this.page.drawText(t, { x: (PAGE_W - w) / 2, y: this.y - size, size, font: this.sans, color: SLATE });
    this.y -= size * 2.2;
  }

  rule() {
    this.ensure(14);
    this.page.drawLine({ start: { x: M_LEFT, y: this.y }, end: { x: PAGE_W - M_RIGHT, y: this.y }, thickness: 0.6, color: LINE });
    this.y -= 14;
  }

  spacer(h: number) { this.y -= h; }

  clause(n: number, heading: string, body: Array<string | { list: string[] }>) {
    const numText = `${n}.`;
    const headSize = 10.5;
    this.ensure(headSize * 1.6 + 6);
    // Number in the left gutter, heading in bold.
    this.page.drawText(numText, { x: M_LEFT, y: this.y - headSize, size: headSize, font: this.bold, color: INK });
    this.page.drawText(winAnsiSafe(heading.toUpperCase()), { x: M_LEFT + 22, y: this.y - headSize, size: headSize, font: this.bold, color: INK });
    this.y -= headSize * 1.7;
    for (const part of body) {
      if (typeof part === "string") {
        this.para(part, { indent: 22, gap: 4 });
      } else {
        for (const item of part.list) {
          this.ensure(15);
          this.page.drawText("•", { x: M_LEFT + 24, y: this.y - 10.5, size: 10.5, font: this.body, color: SLATE });
          this.para(item, { indent: 36, gap: 3 });
        }
      }
    }
    this.y -= 4;
  }

  kv(rows: Array<[string, string]>, heading?: string) {
    if (heading) {
      this.ensure(16);
      this.page.drawText(winAnsiSafe(heading.toUpperCase()), { x: M_LEFT, y: this.y - 9, size: 9, font: this.bold, color: SLATE });
      this.y -= 16;
    }
    const labelW = 118;
    for (const [label, value] of rows) {
      const valueLines = this.wrap(value || "-", this.body, 10.5, CONTENT_W - labelW);
      this.ensure(valueLines.length * 15);
      this.page.drawText(winAnsiSafe(label), { x: M_LEFT, y: this.y - 10.5, size: 10, font: this.sans, color: SLATE });
      let first = true;
      for (const line of valueLines) {
        if (!first) this.ensure(15);
        this.page.drawText(line, { x: M_LEFT + labelW, y: this.y - 10.5, size: 10.5, font: this.body, color: INK });
        this.y -= 15;
        first = false;
      }
      this.y -= 3;
    }
    this.y -= 4;
  }

  signatures(blocks: Array<{ role: string; name?: string; sub?: string }>) {
    // Keep the signature area on one page.
    this.ensure(90);
    this.y -= 10;
    for (const b of blocks) {
      this.ensure(64);
      // Signature line
      this.page.drawLine({ start: { x: M_LEFT, y: this.y }, end: { x: M_LEFT + 240, y: this.y }, thickness: 0.8, color: INK });
      this.y -= 14;
      this.page.drawText(winAnsiSafe(b.role), { x: M_LEFT, y: this.y - 10, size: 10, font: this.bold, color: INK });
      this.y -= 14;
      if (b.name) {
        this.page.drawText(winAnsiSafe(b.name), { x: M_LEFT, y: this.y - 10, size: 10, font: this.body, color: INK });
        this.y -= 13;
      }
      if (b.sub) {
        this.page.drawText(winAnsiSafe(b.sub), { x: M_LEFT, y: this.y - 9, size: 8.5, font: this.sans, color: SLATE });
        this.y -= 12;
      }
      this.y -= 12;
    }
  }

  // Stamp footer (page x of y + disclaimer) and optional DRAFT watermark on
  // every page, in a final pass once the total page count is known.
  finalize(opts: RenderOpts) {
    const pages = this.doc.getPages();
    const total = pages.length;
    pages.forEach((page, i) => {
      if (opts.draft) {
        const wm = winAnsiSafe(opts.watermarkText || "DRAFT - NOT EXECUTED");
        // Scale to the diagonal so a longer stamp (e.g. the public sample)
        // never runs off the page.
        const size = Math.min(46, Math.max(18, (620 / this.bold.widthOfTextAtSize(wm, 46)) * 46));
        page.drawText(wm, {
          x: 96,
          y: 250,
          size,
          font: this.bold,
          color: rgb(0.85, 0.87, 0.9),
          rotate: degrees(50),
          opacity: 0.5,
        });
      }
      const foot = winAnsiSafe(opts.footerNote);
      const fs = 7.5;
      const fw = this.sans.widthOfTextAtSize(foot, fs);
      page.drawText(foot, { x: (PAGE_W - fw) / 2, y: 40, size: fs, font: this.sans, color: SLATE });
      const pageNo = winAnsiSafe(`Page ${i + 1} of ${total} · ${opts.templateKey}`);
      const pw = this.sans.widthOfTextAtSize(pageNo, fs);
      page.drawText(pageNo, { x: (PAGE_W - pw) / 2, y: 28, size: fs, font: this.sans, color: LINE });
    });
  }
}

export async function renderDocument(blocks: ContentBlock[], opts: RenderOpts): Promise<Uint8Array> {
  const l = await Layout.create();
  for (const b of blocks) {
    switch (b.kind) {
      case "title": l.title(b.text); break;
      case "subtitle": l.subtitle(b.text); break;
      case "para": l.para(b.text, { indent: b.indent, gap: b.gap ?? 6 }); break;
      case "clause": l.clause(b.n, b.heading, b.body); break;
      case "kv": l.kv(b.rows, b.heading); break;
      case "spacer": l.spacer(b.h); break;
      case "rule": l.rule(); break;
      case "signatures": l.signatures(b.blocks); break;
    }
  }
  l.finalize(opts);
  return l.doc.save();
}
