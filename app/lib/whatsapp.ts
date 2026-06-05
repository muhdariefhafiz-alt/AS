// WhatsApp Business Cloud API wrapper.
//
// Templates are pre-approved in Meta Business Manager (24-48h approval).
// We type each template's variables here so a typo at the call site is a
// compile error, not a Meta 400 at runtime.
//
// Dry-run fallback when WHATSAPP_ACCESS_TOKEN is missing — same pattern as
// Klaviyo's sendEmail. We log a Tier-1 message (problem + cause + fix +
// docs link) so the next engineer reading dev logs knows exactly why
// nothing arrived.
//
// See WHATSAPP_TEMPLATES.md for the Meta Business Manager setup quickstart.

const GRAPH_API = "https://graph.facebook.com/v20.0";

type AgentInviteVars = {
  agent_first_name: string;
  area: string;
  property_type: string;
  link: string;
};

type SellerQuoteReadyVars = {
  seller_first_name: string;
  agent_name: string;
  link: string;
};

type SellerCompletionReviewVars = {
  seller_first_name: string;
  agent_name: string;
  link: string;
};

type SellerShortlistReadyVars = {
  seller_first_name: string;
  property_type: string;
  area: string;
  link: string;
};

type MopAlertVars = {
  town: string;
  median_price_sgd: string;     // pre-formatted, e.g. "S$680,000"
  link: string;
};

type AgentInvoiceReminderVars = {
  agent_first_name: string;
  invoice_reference: string;
  amount_sgd: string;           // pre-formatted, e.g. "S$3,260"
  link: string;
};

// Discriminated union: each template name pins its variable shape.
export type WaSend =
  | { template: "agent_invite"; variables: AgentInviteVars }
  | { template: "seller_quote_ready"; variables: SellerQuoteReadyVars }
  | { template: "seller_completion_review"; variables: SellerCompletionReviewVars }
  | { template: "seller_shortlist_ready"; variables: SellerShortlistReadyVars }
  | { template: "mop_alert"; variables: MopAlertVars }
  | { template: "agent_invoice_reminder"; variables: AgentInvoiceReminderVars };

export type WaSendOpts = WaSend & {
  to: string;                            // E.164, e.g. +6591234567
  language?: string;                     // BCP-47, defaults to "en_GB"
  metric?: string;
  properties?: Record<string, unknown>;
};

function getEnv() {
  return {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  };
}

function normaliseTo(raw: string): string {
  // Meta wants digits-only (no +) for the `to` field; we accept both.
  return String(raw).replace(/\D/g, "");
}

// Template body uses positional placeholders {{1}}, {{2}}, ... The order
// here MUST match the order set in Meta Business Manager. Documented in
// WHATSAPP_TEMPLATES.md.
function templateParameters(send: WaSend): { type: "text"; text: string }[] {
  switch (send.template) {
    case "agent_invite":
      return [
        { type: "text", text: send.variables.agent_first_name },
        { type: "text", text: send.variables.property_type },
        { type: "text", text: send.variables.area },
        { type: "text", text: send.variables.link },
      ];
    case "seller_quote_ready":
      return [
        { type: "text", text: send.variables.seller_first_name },
        { type: "text", text: send.variables.agent_name },
        { type: "text", text: send.variables.link },
      ];
    case "seller_completion_review":
      return [
        { type: "text", text: send.variables.seller_first_name },
        { type: "text", text: send.variables.agent_name },
        { type: "text", text: send.variables.link },
      ];
    case "seller_shortlist_ready":
      return [
        { type: "text", text: send.variables.seller_first_name },
        { type: "text", text: send.variables.property_type },
        { type: "text", text: send.variables.area },
        { type: "text", text: send.variables.link },
      ];
    case "mop_alert":
      return [
        { type: "text", text: send.variables.town },
        { type: "text", text: send.variables.median_price_sgd },
        { type: "text", text: send.variables.link },
      ];
    case "agent_invoice_reminder":
      return [
        { type: "text", text: send.variables.agent_first_name },
        { type: "text", text: send.variables.invoice_reference },
        { type: "text", text: send.variables.amount_sgd },
        { type: "text", text: send.variables.link },
      ];
  }
}

export async function sendWa(
  opts: WaSendOpts
): Promise<{ id: string; dry_run: boolean }> {
  const { phoneNumberId, accessToken } = getEnv();
  const to = normaliseTo(opts.to);
  if (to.length < 8 || to.length > 15) {
    throw new Error(
      `sendWa: 'to' looks invalid (${opts.to}). Use E.164 format like +6591234567.`
    );
  }

  if (!phoneNumberId || !accessToken) {
    // Tier-1 dry-run log: problem + cause + fix + docs link.
    console.log(
      `🟡 [whatsapp/dry-run] Would send template '${opts.template}' to +${to}` +
        ` with vars ${JSON.stringify(opts.variables)}.` +
        ` Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN to enable real sends.` +
        ` See WHATSAPP_TEMPLATES.md#quickstart for Meta Business Manager setup.`
    );
    return { id: "dry-run", dry_run: true };
  }

  const language = opts.language ?? "en_GB";
  const body = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: opts.template,
      language: { code: language },
      components: [
        {
          type: "body",
          parameters: templateParameters(opts),
        },
      ],
    },
  };

  const url = `${GRAPH_API}/${phoneNumberId}/messages`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error(`[whatsapp] network error sending '${opts.template}':`, err);
    throw err;
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(
      `[whatsapp] Meta returned ${res.status} for template '${opts.template}': ${text}`
    );
    throw new Error(`WhatsApp send failed: ${res.status}`);
  }

  const json = (await res.json()) as {
    messages?: Array<{ id: string }>;
  };
  const id = json.messages?.[0]?.id ?? "unknown";
  return { id, dry_run: false };
}

// Convenience: fire-and-forget send with try/catch baked in. Mirrors the
// way email is fired async after API responses (we don't want WhatsApp
// errors to fail the seller's lead submission).
export function sendWaAsync(opts: WaSendOpts): void {
  sendWa(opts).catch((err) => {
    console.error("[whatsapp] async send failed", err);
  });
}

// Meta webhook signature verification. Used by /api/webhook/whatsapp to
// confirm inbound payloads are genuinely from Meta.
export async function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string
): Promise<boolean> {
  if (!signatureHeader) return false;
  const expected = signatureHeader.replace(/^sha256=/, "");
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const sigHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // Constant-time compare
  if (sigHex.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < sigHex.length; i++) {
    diff |= sigHex.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
