import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { verifyMetaSignature } from "../../../lib/whatsapp";

// Meta WhatsApp Business webhook.
//
// GET = subscription handshake (echo back hub.challenge).
// POST = signed inbound payload (verify HMAC against WHATSAPP_APP_SECRET).
//
// For v1 we log every inbound message to sg_lead_events with event_type =
// 'wa_inbound'. The admin moderation tab can surface these for manual
// follow-up; no auto-reply.

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const expected = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (!expected) {
    console.error(
      "[whatsapp/webhook] WHATSAPP_WEBHOOK_VERIFY_TOKEN missing — refusing verification."
    );
    return new NextResponse("missing config", { status: 500 });
  }

  if (mode === "subscribe" && token === expected && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }
  return new NextResponse("forbidden", { status: 403 });
}

export async function POST(req: Request) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  const sigHeader = req.headers.get("x-hub-signature-256");
  const raw = await req.text();

  if (appSecret) {
    const ok = await verifyMetaSignature(raw, sigHeader, appSecret);
    if (!ok) {
      console.error("[whatsapp/webhook] signature verification failed");
      return new NextResponse("invalid signature", { status: 401 });
    }
  } else {
    console.warn(
      "[whatsapp/webhook] WHATSAPP_APP_SECRET missing — accepting unverified payload (dev only)"
    );
  }

  type MetaPayload = {
    entry?: Array<{
      changes?: Array<{
        value?: {
          messages?: Array<{
            id: string;
            from: string;
            timestamp: string;
            type: string;
            text?: { body: string };
          }>;
          statuses?: Array<{
            id: string;
            status: string;
            recipient_id: string;
          }>;
        };
      }>;
    }>;
  };

  let payload: MetaPayload;
  try {
    payload = JSON.parse(raw) as MetaPayload;
  } catch {
    return new NextResponse("invalid json", { status: 400 });
  }

  const sb = supabaseAdmin();
  const events: { event_type: string; meta: Record<string, unknown> }[] = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};
      for (const msg of value.messages ?? []) {
        events.push({
          event_type: "wa_inbound",
          meta: {
            from: msg.from,
            message_id: msg.id,
            type: msg.type,
            text: msg.text?.body ?? null,
            timestamp: msg.timestamp,
          },
        });
      }
      for (const status of value.statuses ?? []) {
        events.push({
          event_type: `wa_status_${status.status}`,
          meta: {
            message_id: status.id,
            recipient: status.recipient_id,
          },
        });
      }
    }
  }

  if (events.length > 0) {
    await sb.from("sg_lead_events").insert(events);
  }

  return NextResponse.json({ ok: true, received: events.length });
}
