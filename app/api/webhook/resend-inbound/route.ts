import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { resolveContactId } from "../../../lib/contacts";

// Inbound-email webhook: captures a seller's REPLY into the contact timeline so
// the FC-scoped inbox becomes two-way. Separate Resend endpoint from the
// delivery/bounce webhook, so it has its own Svix secret. Inert until the owner
// provisions the reply.fair-comparisons.com MX (pointed at Resend inbound) and
// sets RESEND_INBOUND_WEBHOOK_SECRET in Vercel, the same latent-until-provisioned
// pattern as WhatsApp, Klaviyo and the outbound bounce webhook.
//
// Routing: FC relays an agent's reply with From/Reply-To
//   reply+{reply_token}@reply.fair-comparisons.com
// so the seller's reply carries the per-shortlist token in the local-part. The
// token maps 1:1 to a sg_lead_shortlist row (agent_id + lead_id). Unmatched
// inbound is QUARANTINED (lead_id/agent_id null), never dropped, so a genuine
// reply is never silently lost. Only the plain-text body is stored (no raw HTML,
// no attachments); quoted history is stripped; the body is never logged. The
// shared Supabase project is eu-west-1, so storing SG seller mail centrally is a
// documented Phase-1 data-residency/DPO gate.

const TOLERANCE_SECONDS = 5 * 60;
const TOKEN_RE = /reply\+([a-f0-9]{16,})@reply\.fair-comparisons\.com/i;

async function verifySvix(
  rawBody: string,
  id: string | null,
  timestamp: string | null,
  signatureHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!id || !timestamp || !signatureHeader) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Date.now() / 1000 - ts) > TOLERANCE_SECONDS) return false;

  const key = Uint8Array.from(atob(secret.replace(/^whsec_/, "")), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(`${id}.${timestamp}.${rawBody}`));
  const expected = btoa(String.fromCharCode(...new Uint8Array(signed)));

  for (const part of signatureHeader.split(" ")) {
    const sig = part.startsWith("v1,") ? part.slice(3) : part;
    if (sig.length !== expected.length) continue;
    let diff = 0;
    for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
    if (diff === 0) return true;
  }
  return false;
}

// Cut the seller's new text off the top of a reply: drop the first quoted-history
// marker and everything after it. Best-effort; keeps the platform from storing
// the whole thread (privacy + noise).
function stripQuoted(text: string): string {
  const markers = [
    /^On .*wrote:$/m,
    /^-----Original Message-----/m,
    /^________________________________/m,
    /^From: .*/m,
  ];
  let cut = text.length;
  for (const re of markers) {
    const m = re.exec(text);
    if (m && m.index < cut) cut = m.index;
  }
  // Also stop at the first line that begins a '>' quote block.
  const quoteLine = /^>.*/m.exec(text);
  if (quoteLine && quoteLine.index < cut) cut = quoteLine.index;
  return text.slice(0, cut).trim();
}

function parseFromName(from: string): string | null {
  // "Jane Tan <jane@x.com>" -> "Jane Tan"; bare address -> null.
  const m = /^\s*"?([^"<]+?)"?\s*</.exec(from);
  return m ? m[1].trim() || null : null;
}
function parseFromEmail(from: string): string | null {
  const m = /<([^>]+)>/.exec(from);
  if (m) return m[1].trim().toLowerCase();
  const bare = from.trim().toLowerCase();
  return /\S+@\S+/.test(bare) ? bare : null;
}

export async function POST(req: Request) {
  const secret = process.env.RESEND_INBOUND_WEBHOOK_SECRET;
  if (!secret) {
    console.error(
      "[resend-inbound] RESEND_INBOUND_WEBHOOK_SECRET missing. Create the inbound endpoint in Resend and set the secret in Vercel.",
    );
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const raw = await req.text();
  const ok = await verifySvix(
    raw,
    req.headers.get("svix-id"),
    req.headers.get("svix-timestamp"),
    req.headers.get("svix-signature"),
    secret,
  );
  if (!ok) {
    console.error("[resend-inbound] signature verification failed");
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: {
    type?: string;
    data?: {
      email_id?: string;
      from?: string;
      to?: string | string[];
      subject?: string;
      text?: string;
    };
  };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  // Only inbound receipts. Everything else 200s so Resend does not retry-storm.
  if (payload.type !== "email.received") {
    return NextResponse.json({ ok: true, ignored: payload.type ?? "unknown" });
  }

  const data = payload.data ?? {};
  const toList = (Array.isArray(data.to) ? data.to : [data.to]).filter(Boolean) as string[];
  const from = String(data.from ?? "");
  const fromEmail = parseFromEmail(from);
  const fromName = parseFromName(from);
  const subject = String(data.subject ?? "").slice(0, 300);
  const body = stripQuoted(String(data.text ?? "")).slice(0, 8000);
  const providerId = data.email_id ?? req.headers.get("svix-id") ?? null;

  // Extract the routing token from any of the To addresses.
  let token: string | null = null;
  for (const addr of toList) {
    const m = TOKEN_RE.exec(String(addr));
    if (m) {
      token = m[1].toLowerCase();
      break;
    }
  }

  const sb = supabaseAdmin();

  // Always refresh the contact spine off the From address (best-effort).
  if (fromEmail) {
    await resolveContactId(sb, { email: fromEmail, fullName: fromName }).catch(() => null);
  }

  let leadId: number | null = null;
  let agentId: number | null = null;
  let matchedBy: "token" | "from_address" | "none" = "none";

  if (token) {
    const { data: row } = await sb
      .from("sg_lead_shortlist")
      .select("id, lead_id, agent_id")
      .eq("reply_token", token)
      .maybeSingle();
    if (row) {
      leadId = Number(row.lead_id);
      agentId = Number(row.agent_id);
      matchedBy = "token";
    }
  }

  // Fallback: no token (seller replied to a non-tokenized FC address). Resolve
  // by the From email, but ONLY attribute when the seller-to-agent thread is
  // UNAMBIGUOUS. A contact can have several leads across different agents; a
  // reply carries the seller's raw message, so guessing the most-recent lead
  // could route it to the wrong agent. If more than one active (lead, agent)
  // thread exists, we quarantine instead of guessing.
  if (!leadId && fromEmail) {
    const { data: contact } = await sb
      .from("sg_contacts")
      .select("id")
      .eq("email_norm", fromEmail)
      .maybeSingle();
    if (contact?.id) {
      const { data: leads } = await sb.from("sg_leads").select("id").eq("contact_id", contact.id);
      const leadIds = (leads ?? []).map((r) => Number(r.id)).filter((n) => n > 0);
      if (leadIds.length) {
        const { data: sls } = await sb
          .from("sg_lead_shortlist")
          .select("lead_id, agent_id")
          .in("lead_id", leadIds)
          .in("status", ["invited", "quoted", "picked"]);
        const pairs = new Map<string, { lead_id: number; agent_id: number }>();
        for (const s of sls ?? []) {
          pairs.set(`${s.lead_id}:${s.agent_id}`, { lead_id: Number(s.lead_id), agent_id: Number(s.agent_id) });
        }
        if (pairs.size === 1) {
          const only = [...pairs.values()][0];
          leadId = only.lead_id;
          agentId = only.agent_id;
          matchedBy = "from_address";
        }
      }
    }
  }

  const meta = {
    direction: "inbound",
    channel: "email",
    from: fromEmail,
    subject,
    text: body,
    provider: "resend",
    provider_message_id: providerId,
    matched_by: matchedBy,
  };

  if (leadId) {
    await sb.from("sg_lead_events").insert({
      lead_id: leadId,
      agent_id: agentId,
      event_type: "email_reply",
      meta,
    });
    return NextResponse.json({ ok: true, matched_by: matchedBy });
  }

  // Quarantine, never drop. An admin can later link it to a lead.
  await sb.from("sg_lead_events").insert({
    lead_id: null,
    agent_id: null,
    event_type: "email_reply_unmatched",
    meta,
  });
  return NextResponse.json({ ok: true, quarantined: true });
}
