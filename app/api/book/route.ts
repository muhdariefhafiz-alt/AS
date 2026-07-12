import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../lib/supabase";

// Public booking endpoint for an agent's /book/[agentSlug] page. Creates a
// viewing request keyed to the agent's CEA number. No auth (anyone with the
// link can request a viewing), all writes via supabaseAdmin (the table is
// RLS-locked from anon). Validates and length-caps every field.

const cap = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const agentSlug = cap(body.agentSlug, 120);
  const propertyLabel = cap(body.propertyLabel, 120);
  const attendeeName = cap(body.attendeeName, 80);
  const attendeeContact = cap(body.attendeeContact, 120);
  const message = cap(body.message, 500);
  const viewingAtRaw = cap(body.viewingAt, 40);

  if (!agentSlug || !propertyLabel || !attendeeName || !attendeeContact || !viewingAtRaw) {
    return NextResponse.json({ error: "Please fill in all required fields." }, { status: 400 });
  }

  // Validate the requested time: a real date, in the future, within 90 days.
  const when = new Date(viewingAtRaw);
  const now = Date.now();
  if (Number.isNaN(when.getTime()) || when.getTime() < now - 60 * 60 * 1000 || when.getTime() > now + 90 * 24 * 60 * 60 * 1000) {
    return NextResponse.json({ error: "Please choose a valid date and time within the next 90 days." }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data: agent } = await sb
    .from("sg_agents")
    .select("cea_registration, name")
    .eq("slug", agentSlug)
    .maybeSingle();
  if (!agent?.cea_registration) {
    return NextResponse.json({ error: "Agent not found." }, { status: 404 });
  }

  const { error } = await sb.from("sg_viewings").insert({
    agent_cea_no: agent.cea_registration,
    property_label: propertyLabel,
    viewing_at: when.toISOString(),
    attendee_name: attendeeName,
    attendee_contact: attendeeContact,
    message: message || null,
    status: "requested",
    source: "book_page",
  });
  if (error) {
    return NextResponse.json({ error: "Could not save your request. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
