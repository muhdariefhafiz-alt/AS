import { unsubscribeUrl } from "./unsubscribe";

/**
 * Shared HTML shell for every FairComparisons email (see docs/email-lifecycle.md).
 *
 * One layout, sixteen emails: ink header, single blue CTA, firewall line in the
 * footer of every send. Templates compose body HTML with the small helpers
 * below and never hand-roll their own table scaffolding.
 *
 * Rules enforced here rather than re-remembered at every call site:
 *  - Marketing/lifecycle sends pass `unsubscribeEmail`; the shell renders a
 *    SIGNED one-click unsubscribe link (lib/unsubscribe). Transactional sends
 *    (verify, login, lead, quote, dunning) omit it.
 *  - The firewall line ("rankings cannot be bought") appears on every email.
 *  - No em dashes anywhere. Currency is written as S$.
 */

const INK = "#0a1733";
const BLUE = "#1f44ff";

export function emailShell(opts: {
  /** Hidden inbox preview line. Keep under ~90 chars. */
  preheader: string;
  heading: string;
  /** Inner HTML composed with p()/muted()/rows()/statCard(). */
  bodyHtml: string;
  cta?: { label: string; href: string };
  /** Small grey line above the footer, e.g. why the recipient got this. */
  footerNote?: string;
  /** Recipient email for marketing sends; renders a signed unsubscribe link. */
  unsubscribeEmail?: string;
}): string {
  const { preheader, heading, bodyHtml, cta, footerNote, unsubscribeEmail } = opts;
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</span>
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f9fafb">
<tr><td align="center" style="padding:24px 16px">
<table cellpadding="0" cellspacing="0" border="0" width="560" style="background:#ffffff;border-radius:12px;overflow:hidden">
  <tr><td style="background:${INK};padding:22px 32px">
    <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff">FairComparisons</p>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111827">${heading}</p>
    ${bodyHtml}
    ${
      cta
        ? `<div style="margin:26px 0 6px"><a href="${cta.href}" style="display:inline-block;background:${BLUE};color:#ffffff;padding:13px 26px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">${cta.label}</a></div>`
        : ""
    }
  </td></tr>
  <tr><td style="padding:18px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <p style="margin:0 0 6px;font-size:11px;color:#9ca3af;line-height:1.5">Ranked on real CEA transaction data, not advertising. Rankings cannot be bought.</p>
    ${footerNote ? `<p style="margin:0 0 6px;font-size:11px;color:#9ca3af;line-height:1.5">${footerNote}</p>` : ""}
    ${
      unsubscribeEmail
        ? `<p style="margin:0;font-size:11px;color:#9ca3af"><a href="${unsubscribeUrl(unsubscribeEmail)}" style="color:#9ca3af;text-decoration:underline">Unsubscribe</a></p>`
        : ""
    }
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

/** Standard body paragraph. */
export function p(html: string): string {
  return `<p style="margin:0 0 14px;font-size:15px;color:#374151;line-height:1.6">${html}</p>`;
}

/** Smaller, quieter paragraph (caveats, secondary context). */
export function muted(html: string): string {
  return `<p style="margin:0 0 12px;font-size:13px;color:#6b7280;line-height:1.5">${html}</p>`;
}

/** Numbered or plain rows with a subtle divider, e.g. the "3 things to finish". */
export function rows(items: string[], numbered = false): string {
  const tr = items
    .map(
      (item, i) => `<tr><td style="padding:10px 0;${i < items.length - 1 ? "border-bottom:1px solid #f3f4f6;" : ""}">
        ${
          numbered
            ? `<span style="display:inline-block;width:24px;height:24px;background:${BLUE};color:#fff;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;margin-right:10px;">${i + 1}</span>`
            : ""
        }<span style="font-size:14px;color:#374151;font-weight:500;">${item}</span>
      </td></tr>`
    )
    .join("");
  return `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px;">${tr}</table>`;
}

/** Big single stat (e.g. AgentScore) in a bordered card. */
export function statCard(value: string, label: string): string {
  return `<div style="background:#eef2fb;border:2px solid ${INK};border-radius:12px;padding:20px;text-align:center;margin:18px 0;">
    <div style="font-size:44px;font-weight:800;color:${INK};">${value}</div>
    <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:2px;">${label}</div>
  </div>`;
}
