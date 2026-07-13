import { notFound, redirect } from "next/navigation";
import { supabaseAdmin } from "../../../lib/supabase";
import { getAgentSession } from "../../../lib/agent-auth";
import ContactDetail from "./ContactDetail";

export const metadata = { title: "Contact Detail — Leads Inbox" };

type Props = { params: Promise<{ id: string }> };

export default async function ContactDetailPage(props: Props) {
  const params = await props.params;
  const shortlistId = Number(params.id);
  if (!Number.isFinite(shortlistId)) notFound();

  const session = await getAgentSession();
  if (!session) redirect("/login");

  const sb = supabaseAdmin();

  // Load the shortlist row + full lead + contact.
  const { data: shortlist } = await sb
    .from("sg_lead_shortlist")
    .select(
      `
      id, status, invited_at, quoted_at, picked_at, first_reply_at,
      sg_leads!inner(
        id, token, status, property_type, town, district_code, bedrooms,
        est_value_low, est_value_high, timeline, reason, full_name,
        email, phone, whatsapp, created_at, contact_id
      ),
      sg_contacts(id, phone_norm, email_norm, whatsapp_norm, full_name, first_seen_at, last_seen_at)
    `
    )
    .eq("id", shortlistId)
    .eq("agent_id", session.agentId)
    .single();

  if (!shortlist) notFound();

  const lead = Array.isArray(shortlist.sg_leads) ? shortlist.sg_leads[0] : shortlist.sg_leads;
  const contact = Array.isArray(shortlist.sg_contacts) ? shortlist.sg_contacts[0] : shortlist.sg_contacts;

  if (!lead) notFound();

  // Load timeline events for this lead.
  const { data: timelineEvents } = await sb
    .from("sg_lead_events")
    .select("id, event_type, meta, created_at")
    .eq("lead_id", lead.id)
    .order("created_at", { ascending: false });

  // Load agent's transaction history + AgentScore.
  const { data: agent } = await sb
    .from("sg_agents")
    .select("id, cea_registration, slug, name, agency, agentscore")
    .eq("id", session.agentId)
    .single();

  if (!agent) notFound();

  return (
    <ContactDetail
      shortlist={shortlist}
      lead={lead}
      contact={contact}
      timeline={timelineEvents || []}
      agent={agent}
    />
  );
}
