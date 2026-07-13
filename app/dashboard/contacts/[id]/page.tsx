import { notFound, redirect } from "next/navigation";
import { supabaseAdmin } from "../../../lib/supabase";
import { getAgentSession } from "../../../lib/agent-auth";
import { listAgentViewings, viewingMatchesContact } from "../../../lib/viewings";
import { listLabels } from "../../../lib/inbox-labels";
import { normPhone, normEmail } from "../../../lib/contacts";
import { titleName } from "../../../lib/names";
import ContactDetail from "./ContactDetail";

export const metadata = { title: "Leads Inbox: Contact" };

type Props = { params: Promise<{ id: string }> };

type TimelineItem = {
  id: string;
  event_type: string;
  at: string | null;
  meta?: Record<string, unknown> | null;
};

// Median of a numeric list (lower-middle for even length). Used for honest area
// context; area_recent_sales is NOT room-filtered, so this is "recent deals in
// the area", never a per-room median.
function median(nums: number[]): number | null {
  const xs = nums.filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
  if (!xs.length) return null;
  return xs[Math.floor((xs.length - 1) / 2)];
}

export default async function ContactDetailPage(props: Props) {
  const params = await props.params;
  const shortlistId = Number(params.id);
  if (!Number.isFinite(shortlistId)) notFound();

  const session = await getAgentSession();
  if (!session) redirect("/dashboard");

  const sb = supabaseAdmin();

  // Shortlist row + lead + resolved contact. Ownership is enforced by agent_id.
  // The contact FK lives on sg_leads.contact_id (not on the shortlist), so the
  // sg_contacts embed is nested UNDER the sg_leads embed.
  const { data: shortlist } = await sb
    .from("sg_lead_shortlist")
    .select(
      `
      id, status, invited_at, quoted_at, picked_at, first_reply_at,
      sg_leads!inner(
        id, token, status, property_type, town, district_code, bedrooms,
        est_value_low, est_value_high, timeline, reason, full_name,
        email, phone, whatsapp, created_at, contact_id,
        sg_contacts(id, phone_norm, email_norm, whatsapp_norm, full_name, first_seen_at, last_seen_at)
      )
    `,
    )
    .eq("id", shortlistId)
    .eq("agent_id", session.agentId)
    .maybeSingle();

  if (!shortlist) notFound();

  const lead = (Array.isArray(shortlist.sg_leads) ? shortlist.sg_leads[0] : shortlist.sg_leads) as
    | Record<string, unknown>
    | null;
  if (!lead) notFound();
  const contact = (Array.isArray(lead.sg_contacts) ? lead.sg_contacts[0] : lead.sg_contacts) as
    | Record<string, unknown>
    | null;

  // Agent, with the REAL proof columns (score, not "agentscore"; agency_name,
  // not "agency"). These are populated for every agent regardless of claim.
  const { data: agentRow } = await sb
    .from("sg_agents")
    .select(
      "id, cea_registration, slug, name, agency_name, score, primary_area, years_active, transaction_count, sale_txns, seller_sales, sale_share, seller_share, subscription_tier",
    )
    .eq("id", session.agentId)
    .maybeSingle();
  if (!agentRow) notFound();

  const cea = String(agentRow.cea_registration ?? "");
  const propertyType = String(lead.property_type ?? "");
  const isHdb = propertyType.toUpperCase() === "HDB";
  const areaType = isHdb ? "town" : "district";
  const areaKey = isHdb ? (lead.town as string | null) : (lead.district_code as string | null);

  // Real proof, in parallel: the agent's own CEA transaction record, recent area
  // comps (the same open records the AI draft and area pages use), and area rank.
  const [txnRes, compsRes, standingRes, viewingsRaw, labels] = await Promise.all([
    cea ? sb.rpc("get_agent_txn_record", { p_reg: cea, p_lim: 8 }) : Promise.resolve({ data: null }),
    areaKey
      ? sb.rpc("area_recent_sales", { p_type: areaType, p_key: String(areaKey), p_limit: 40 })
      : Promise.resolve({ data: [] }),
    cea ? sb.rpc("get_agent_standing", { p_reg: cea }) : Promise.resolve({ data: null }),
    cea ? listAgentViewings(sb, cea) : Promise.resolve([]),
    listLabels(sb, shortlistId, session.agentId),
  ]);

  const txn = (txnRes.data ?? null) as Record<string, unknown> | null;
  const compsRows = (compsRes.data ?? []) as { title: string; subtitle: string; price: number | null; event_date: string }[];
  const comps = compsRows.slice(0, 5).map((c) => ({
    title: c.title,
    subtitle: c.subtitle,
    price: c.price != null ? Number(c.price) : null,
    event_date: c.event_date,
  }));
  // Median over the SAME deals we render (comps, the shown 5), so the caption
  // "median of recent deals shown" is literally accurate.
  const areaMedian = median(comps.map((c) => Number(c.price)));
  const standing = (Array.isArray(standingRes.data) ? standingRes.data[0] : standingRes.data) as
    | Record<string, unknown>
    | null;

  const areaLabel = lead.town
    ? titleName(String(lead.town))
    : lead.district_code
      ? `District ${lead.district_code}`
      : null;

  // Timeline: authoritative per-agent milestones come from the shortlist row
  // itself (accurate, no cross-agent leakage). We then merge only this agent's
  // private events (notes, inbound email replies) and matched viewings.
  const items: TimelineItem[] = [];
  if (shortlist.invited_at) items.push({ id: "sl-invited", event_type: "lead_invited", at: shortlist.invited_at });
  if (shortlist.first_reply_at) items.push({ id: "sl-reply", event_type: "reply_sent", at: shortlist.first_reply_at });
  if (shortlist.quoted_at) items.push({ id: "sl-quoted", event_type: "quote_submitted", at: shortlist.quoted_at });
  if (shortlist.picked_at) {
    items.push({
      id: "sl-outcome",
      event_type: shortlist.status === "picked" ? "lead_picked" : "lead_not_picked",
      at: shortlist.picked_at,
    });
  }

  // Private events for THIS lead, scoped to this agent (or global null-agent
  // rows). email_reply carries the seller's raw message, so it must never be
  // shown to another shortlisted agent.
  const { data: events } = await sb
    .from("sg_lead_events")
    .select("id, agent_id, event_type, meta, created_at")
    .eq("lead_id", lead.id)
    .in("event_type", ["agent_note", "email_reply"])
    .order("created_at", { ascending: false });
  for (const e of events ?? []) {
    if (e.agent_id != null && Number(e.agent_id) !== session.agentId) continue;
    items.push({
      id: `ev-${e.id}`,
      event_type: String(e.event_type),
      at: e.created_at as string | null,
      meta: (e.meta as Record<string, unknown> | null) ?? null,
    });
  }

  // Viewings matched to this contact (normalized phone/email). When there is no
  // resolved sg_contacts row, fall back to the lead's own contact fields, which
  // must be normalized the SAME way the attendee side is (sg_leads.phone is
  // stored raw, e.g. "+6598304946"), or the match silently fails.
  const matchKeys = {
    phone_norm: (contact?.phone_norm as string | null) ?? null,
    email_norm: (contact?.email_norm as string | null) ?? null,
  };
  const leadKeys = {
    phone_norm: normPhone(lead.phone as string | null) ?? normPhone(lead.whatsapp as string | null),
    email_norm: normEmail(lead.email as string | null),
  };
  for (const v of viewingsRaw) {
    const matched =
      viewingMatchesContact(v.attendee_contact, matchKeys) ||
      (!matchKeys.phone_norm && !matchKeys.email_norm && viewingMatchesContact(v.attendee_contact, leadKeys));
    if (!matched) continue;
    items.push({
      id: `vw-${v.id}`,
      event_type: "viewing_booked",
      at: v.created_at ?? v.viewing_at,
      meta: {
        property_label: v.property_label,
        attendee_name: v.attendee_name,
        viewing_at: v.viewing_at,
        status: v.status,
      },
    });
  }

  items.sort((a, b) => new Date(b.at ?? 0).getTime() - new Date(a.at ?? 0).getTime());

  // Serializable proof for the client component.
  const proof = {
    score: agentRow.score != null ? Math.round(Number(agentRow.score)) : null,
    agencyName: (agentRow.agency_name as string | null) ?? null,
    name: agentRow.name ? titleName(String(agentRow.name)) : null,
    primaryArea: (agentRow.primary_area as string | null) ?? null,
    yearsActive: agentRow.years_active != null ? Number(agentRow.years_active) : null,
    txnTotals: txn
      ? {
          total: Number(txn.total ?? 0),
          sales: Number(txn.sales ?? 0),
          rentals: Number(txn.rentals ?? 0),
          sellerSales: Number(txn.seller_sales ?? 0),
        }
      : {
          total: Number(agentRow.transaction_count ?? 0),
          sales: Number(agentRow.sale_txns ?? 0),
          rentals: Math.max(0, Number(agentRow.transaction_count ?? 0) - Number(agentRow.sale_txns ?? 0)),
          sellerSales: Number(agentRow.seller_sales ?? 0),
        },
    recentDeals: (Array.isArray(txn?.recent) ? (txn!.recent as Record<string, unknown>[]) : []).slice(0, 5).map((d) => ({
      month: String(d.month ?? ""),
      propertyType: String(d.property_type ?? ""),
      transactionType: String(d.transaction_type ?? ""),
      represented: String(d.represented ?? ""),
      area: String(d.area ?? ""),
    })),
    comps,
    areaMedian,
    areaLabel,
    standing: standing
      ? {
          areaName: String(standing.area_name ?? ""),
          agentPct: standing.agent_pct != null ? Number(standing.agent_pct) : null,
          agentRank: standing.agent_rank != null ? Number(standing.agent_rank) : null,
          agentTotal: standing.agent_total != null ? Number(standing.agent_total) : null,
        }
      : null,
  };

  return (
    <ContactDetail
      shortlist={{
        id: Number(shortlist.id),
        status: String(shortlist.status),
        invited_at: shortlist.invited_at as string | null,
        quoted_at: shortlist.quoted_at as string | null,
        picked_at: shortlist.picked_at as string | null,
        first_reply_at: shortlist.first_reply_at as string | null,
      }}
      lead={{
        id: Number(lead.id),
        property_type: propertyType,
        town: (lead.town as string | null) ?? null,
        district_code: (lead.district_code as string | null) ?? null,
        bedrooms: lead.bedrooms != null ? Number(lead.bedrooms) : null,
        est_value_low: lead.est_value_low != null ? Number(lead.est_value_low) : null,
        est_value_high: lead.est_value_high != null ? Number(lead.est_value_high) : null,
        timeline: (lead.timeline as string | null) ?? null,
        full_name: lead.full_name ? titleName(String(lead.full_name)) : null,
        email: (lead.email as string | null) ?? null,
        phone: (lead.phone as string | null) ?? null,
        whatsapp: (lead.whatsapp as string | null) ?? null,
      }}
      proof={proof}
      timeline={items}
      labels={labels}
    />
  );
}
