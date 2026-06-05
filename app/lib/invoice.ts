// PayNow-first invoicing for the seller-funnel success fee.
//
// Singapore B2B norm = PayNow QR + bank transfer; Stripe Connect for SGD
// agent payouts adds KYB friction. For v1 we email the agent a PDF-shaped
// HTML invoice with QR + bank details; admin reconciles via Supabase.

export type InvoiceLine = {
  description: string;
  amount_sgd: number;     // pre-GST
};

export type InvoiceInput = {
  reference: string;             // FC-YYYY-NNNNNN
  agent_name: string;
  agent_cea_reg: string;
  agent_email: string;
  property_summary: string;      // e.g. "4-rm HDB in Tampines"
  sale_price: number;
  platform_fee_pct: number;      // 0.5
  platform_fee_amt: number;      // sale_price × pct
  gst_pct: number;               // 9 in 2026
  total_due: number;             // fee + gst
  due_at: string;                // ISO
  paynow_uen?: string;
  bank_name?: string;
  bank_account?: string;
};

const FALLBACK_PAYNOW_UEN = process.env.FC_PAYNOW_UEN ?? "TBC";
const FALLBACK_BANK_NAME = process.env.FC_BANK_NAME ?? "DBS";
const FALLBACK_BANK_ACCOUNT =
  process.env.FC_BANK_ACCOUNT ?? "to be configured";

// Generates a 6-digit suffix on a YYYY prefix. Collisions are vanishingly
// unlikely at our volume; if we hit one, the DB unique constraint forces a
// retry at the call site.
export function makeInvoiceReference(now = new Date()): string {
  const year = now.getUTCFullYear();
  // Crypto-random, 0..999_999 padded to 6 digits.
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  const n = buf[0] % 1_000_000;
  return `FC-${year}-${String(n).padStart(6, "0")}`;
}

// SGD-cents-safe rounding: avoid 0.005 drift. Round to 2dp half-up.
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function computeInvoiceTotals(
  sale_price: number,
  platform_fee_pct: number,
  gst_pct = 9
): {
  platform_fee_amt: number;
  gst_amt: number;
  total_due: number;
} {
  const fee = round2(sale_price * (platform_fee_pct / 100));
  const gst = round2(fee * (gst_pct / 100));
  return {
    platform_fee_amt: fee,
    gst_amt: gst,
    total_due: round2(fee + gst),
  };
}

export function fmtSgd(n: number): string {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
  }).format(n);
}

// HTML invoice that renders cleanly in Gmail / Apple Mail / Outlook web.
// Kept inline table-based for email-client compatibility.
export function buildInvoiceHtml(i: InvoiceInput): string {
  const paynowUen = i.paynow_uen ?? FALLBACK_PAYNOW_UEN;
  const bankName = i.bank_name ?? FALLBACK_BANK_NAME;
  const bankAccount = i.bank_account ?? FALLBACK_BANK_ACCOUNT;
  const dueDate = new Date(i.due_at).toLocaleDateString("en-SG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f9fafb">
<tr><td align="center" style="padding:24px 16px">
<table cellpadding="0" cellspacing="0" border="0" width="640" style="background:#ffffff;border-radius:12px;overflow:hidden">

  <tr><td style="background:#0a1733;padding:24px 32px">
    <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff">FairComparisons</p>
    <p style="margin:4px 0 0;font-size:12px;color:#a7f3d0">Success fee invoice</p>
  </td></tr>

  <tr><td style="padding:28px 32px">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td style="font-size:13px;color:#6b7280">Invoice reference</td>
        <td align="right" style="font-size:13px;color:#6b7280">Due</td>
      </tr>
      <tr>
        <td style="font-size:16px;font-weight:700;color:#111827">${i.reference}</td>
        <td align="right" style="font-size:16px;font-weight:700;color:#111827">${dueDate}</td>
      </tr>
    </table>

    <p style="margin:24px 0 8px;font-size:13px;color:#6b7280">Billed to</p>
    <p style="margin:0;font-size:15px;font-weight:600;color:#111827">${i.agent_name}</p>
    <p style="margin:2px 0 0;font-size:13px;color:#4b5563">CEA ${i.agent_cea_reg} · ${i.agent_email}</p>

    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:24px;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb">
      <tr>
        <td style="padding:12px 0;font-size:13px;color:#6b7280">Description</td>
        <td align="right" style="padding:12px 0;font-size:13px;color:#6b7280">Amount</td>
      </tr>
      <tr style="border-top:1px solid #f3f4f6">
        <td style="padding:12px 0;font-size:14px;color:#111827">
          Platform success fee, ${i.platform_fee_pct.toFixed(2)}% of sale<br>
          <span style="font-size:12px;color:#6b7280">${i.property_summary} · sale price ${fmtSgd(i.sale_price)}</span>
        </td>
        <td align="right" style="padding:12px 0;font-size:14px;color:#111827">${fmtSgd(i.platform_fee_amt)}</td>
      </tr>
      <tr>
        <td style="padding:12px 0;font-size:14px;color:#111827">GST (${i.gst_pct}%)</td>
        <td align="right" style="padding:12px 0;font-size:14px;color:#111827">${fmtSgd(i.total_due - i.platform_fee_amt)}</td>
      </tr>
    </table>

    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:8px">
      <tr>
        <td style="padding:12px 0;font-size:15px;font-weight:700;color:#111827">Total due</td>
        <td align="right" style="padding:12px 0;font-size:18px;font-weight:800;color:#0a1733">${fmtSgd(i.total_due)}</td>
      </tr>
    </table>

    <div style="margin-top:24px;padding:16px;background:#eef1ff;border:1px solid #c9d4ff;border-radius:8px">
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#0a1733">Pay via PayNow (recommended)</p>
      <p style="margin:0;font-size:13px;color:#0a1733">
        UEN: <strong>${paynowUen}</strong><br>
        Reference: <strong>${i.reference}</strong>
      </p>
    </div>

    <div style="margin-top:12px;padding:16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px">
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#374151">Or bank transfer</p>
      <p style="margin:0;font-size:13px;color:#4b5563">
        Bank: <strong>${bankName}</strong><br>
        Account: <strong>${bankAccount}</strong><br>
        Reference: <strong>${i.reference}</strong>
      </p>
    </div>

    <p style="margin:24px 0 0;font-size:12px;color:#6b7280;line-height:1.5">
      Once paid, reply to this email or message the dashboard. We&apos;ll
      mark the invoice as paid within one business day. Your verified
      completion will go live on your public profile after we confirm
      payment. For questions, reply to hello@fair-comparisons.com.
    </p>
  </td></tr>

  <tr><td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.5">
      FairComparisons · Independent property agent comparison platform · Singapore.
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}
