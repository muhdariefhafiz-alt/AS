import { supabaseAdmin } from "../lib/supabase";
import FunnelTracker from "./FunnelTracker";

// Ego-search claim trigger for UNCLAIMED profiles (agent-reach roadmap item 5).
//
// The only surface that reaches the ~26k agents with no contact channel is
// the profile page they ego-search. When real sellers have picked this agent,
// say so: an open request ("a homeowner is waiting") or the lifetime count.
// Strict honesty rules: only real sg_lead_shortlist rows the seller actively
// picked (invited / unreachable / quoted), only district or town + property
// type + month, never price, never seller identity. Renders nothing below one
// pick. Data via service role (shortlist tables are rightly RLS-locked);
// freshness via revalidatePath from the invite and claim routes.

const TYPE_LABEL: Record<string, string> = {
  HDB: "HDB flat",
  CONDO: "condo",
  EC: "EC",
  LANDED: "landed home",
};
const MONTHS = ["", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

const tc = (s: string) =>
  s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\bHdb\b/g, "HDB");

export default async function EgoBaitPanel({
  agentId,
  slug,
}: {
  agentId: number;
  slug: string;
}) {
  const sb = supabaseAdmin();
  const { data: picks } = await sb
    .from("sg_lead_shortlist")
    .select(
      "status, created_at, sg_leads!inner(status, property_type, town, district_code, created_at)"
    )
    .eq("agent_id", agentId)
    .in("status", ["invited", "unreachable", "quoted"]);

  if (!picks || picks.length === 0) return null;

  type LeadJoin = {
    status: string;
    property_type: string | null;
    town: string | null;
    district_code: string | null;
    created_at: string | null;
  };
  const leadOf = (p: (typeof picks)[number]): LeadJoin => {
    const j = p.sg_leads as unknown;
    return ((Array.isArray(j) ? j[0] : j) ?? {}) as LeadJoin;
  };

  // An open request: the seller has not yet instructed anyone. The waiting
  // claim ("is waiting for your response") is only honest for these.
  const open = picks
    .map((p) => ({ p, lead: leadOf(p) }))
    .filter(({ lead }) => ["invited", "quoted"].includes(String(lead.status)))
    .sort((a, b) =>
      String(b.lead.created_at ?? "").localeCompare(String(a.lead.created_at ?? ""))
    )[0];

  const count = picks.length;

  let headline: string;
  let sub: string;
  if (open) {
    const t = TYPE_LABEL[String(open.lead.property_type)] ?? "home";
    const area = open.lead.town
      ? tc(String(open.lead.town))
      : (open.lead.district_code ?? "Singapore");
    const month = MONTHS[Number(String(open.lead.created_at ?? "").slice(5, 7))] || "";
    headline = `A homeowner selling ${t === "EC" ? "an" : "a"} ${t} in ${area} picked you${month ? ` in ${month}` : ""}.`;
    sub =
      "They asked you for a fee quote through FairComparisons and are waiting for your response. Activate your free profile below to see the request and reply.";
  } else {
    headline =
      count === 1
        ? "A homeowner picked you on FairComparisons."
        : `${count} homeowners have picked you on FairComparisons.`;
    sub =
      "Activate your free profile below so the next seller request reaches you the moment it happens.";
  }

  return (
    <div
      className="fc-card fc-card--pad"
      style={{
        marginTop: 16,
        borderColor: "var(--blue)",
        background: "var(--blue-wash)",
      }}
    >
      <FunnelTracker
        event="egobait_view"
        agentId={agentId}
        agentSlug={slug}
        metadata={{ open_request: Boolean(open), pick_count: count }}
      />
      <div className="kicker" style={{ color: "var(--blue-deep)" }}>
        Seller interest
      </div>
      <p style={{ marginTop: 8, fontSize: 17, fontWeight: 700, color: "var(--ink)" }}>
        {headline}
      </p>
      <p className="muted" style={{ marginTop: 6, fontSize: 14, maxWidth: "60ch" }}>
        {sub}
      </p>
      <a href="#claim" className="fc-btn fc-btn--primary" style={{ marginTop: 12 }}>
        Activate your free profile
      </a>
    </div>
  );
}
