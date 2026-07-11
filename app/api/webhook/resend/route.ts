import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";

// Resend delivery-event webhook.
//
// Closes the last honesty gap in the notification ledger: a hard bounce on an
// agent invite currently leaves the ledger row 'sent', so the seller keeps
// reading "Emailed" for a message that never arrived. This endpoint flips the
// row to 'bounced'/'complained' (the seller copy and the admin "not reached"
// worklist both key off outcome, so they self-correct) and grades the agent's
// address in sg_agents.email_status so future sends can skip known-dead
// addresses.
//
// Resend signs webhooks with Svix. Verification is hand-rolled (no dependency):
// HMAC-SHA256 over `${svix-id}.${svix-timestamp}.${rawBody}` keyed with the
// base64 secret after the `whsec_` prefix, compared against each `v1,<sig>`
// candidate. Inert until the owner creates the endpoint in the Resend
// dashboard and sets RESEND_WEBHOOK_SECRET in Vercel.

const TOLERANCE_SECONDS = 5 * 60;

async function verifySvix(
  rawBody: string,
  id: string | null,
  timestamp: string | null,
  signatureHeader: string | null,
  secret: string
): Promise<boolean> {
  if (!id || !timestamp || !signatureHeader) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Date.now() / 1000 - ts) > TOLERANCE_SECONDS) return false;

  const key = Uint8Array.from(
    atob(secret.replace(/^whsec_/, "")),
    (c) => c.charCodeAt(0)
  );
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(`${id}.${timestamp}.${rawBody}`)
  );
  const expected = btoa(String.fromCharCode(...new Uint8Array(signed)));

  // Header carries one or more space-separated "v1,<base64>" entries.
  for (const part of signatureHeader.split(" ")) {
    const sig = part.startsWith("v1,") ? part.slice(3) : part;
    if (sig.length !== expected.length) continue;
    let diff = 0;
    for (let i = 0; i < sig.length; i++) {
      diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
    }
    if (diff === 0) return true;
  }
  return false;
}

export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error(
      "[resend/webhook] RESEND_WEBHOOK_SECRET missing. Create the webhook in the Resend dashboard and set the secret in Vercel."
    );
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const raw = await req.text();
  const ok = await verifySvix(
    raw,
    req.headers.get("svix-id"),
    req.headers.get("svix-timestamp"),
    req.headers.get("svix-signature"),
    secret
  );
  if (!ok) {
    console.error("[resend/webhook] signature verification failed");
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: {
    type?: string;
    data?: { email_id?: string; to?: string | string[] };
  };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const type = payload.type ?? "";
  const emailId = payload.data?.email_id ?? null;
  const toRaw = payload.data?.to;
  const to = Array.isArray(toRaw) ? toRaw[0] : toRaw ?? null;
  const sb = supabaseAdmin();

  // Map Resend event -> ledger outcome + address grade. Only events that
  // change what we may honestly claim are handled; the rest 200 out.
  const map: Record<string, { outcome: string; grade: string } | undefined> = {
    "email.bounced": { outcome: "bounced", grade: "bounced" },
    "email.complained": { outcome: "complained", grade: "complained" },
    "email.delivered": { outcome: "delivered", grade: "delivered_ok" },
  };
  const action = map[type];
  if (!action) return NextResponse.json({ ok: true, ignored: type });

  if (emailId) {
    const { error: updErr } = await sb
      .from("sg_lead_notifications")
      .update({ outcome: action.outcome })
      .eq("provider_message_id", emailId)
      .eq("channel", "email");
    if (updErr) {
      console.error("[resend/webhook] ledger update failed", updErr);
    }
  }

  if (to) {
    // Never downgrade a verified (agent-proven) address on a stray event.
    const { error: gradeErr } = await sb
      .from("sg_agents")
      .update({
        email_status: action.grade,
        email_validated_at: new Date().toISOString(),
      })
      .eq("email", to)
      .neq("email_status", "verified");
    if (gradeErr) {
      console.error("[resend/webhook] grade update failed", gradeErr);
    }
  }

  return NextResponse.json({ ok: true, handled: type });
}
