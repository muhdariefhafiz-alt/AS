import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";

// Seller updates their contact details mid-funnel. Token-gated (same auth
// model as every seller-facing page — possession of the token IS the auth).

function isValidEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 254;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, email, phone, whatsapp, marketing_consent } = body ?? {};

    if (typeof token !== "string" || token.length < 8 || token.length > 64) {
      return NextResponse.json({ error: "Invalid token." }, { status: 400 });
    }
    if (email && !isValidEmail(String(email))) {
      return NextResponse.json({ error: "Invalid email." }, { status: 400 });
    }

    const sb = supabaseAdmin();
    const { data: lead } = await sb
      .from("sg_leads")
      .select("id, status")
      .eq("token", token)
      .single();
    if (!lead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    const patch: Record<string, unknown> = {};
    if (email) patch.email = String(email).toLowerCase().trim();
    if (phone !== undefined) patch.phone = phone ? String(phone).trim() : null;
    if (whatsapp !== undefined)
      patch.whatsapp = whatsapp ? String(whatsapp).trim() : null;
    if (typeof marketing_consent === "boolean")
      patch.marketing_consent = marketing_consent;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }

    const { error } = await sb.from("sg_leads").update(patch).eq("id", lead.id);
    if (error) {
      console.error("[sell/contact-update] failed", error);
      return NextResponse.json({ error: "Update failed." }, { status: 500 });
    }

    await sb.from("sg_lead_events").insert({
      lead_id: lead.id,
      event_type: "seller_contact_update",
      meta: { fields: Object.keys(patch) },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[sell/contact-update] unexpected", err);
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
