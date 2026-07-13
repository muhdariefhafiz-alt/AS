import { notFound, redirect } from "next/navigation";
import { supabaseAdmin } from "../../../lib/supabase";
import { isAgentReachable } from "../../../lib/reachability";
import { titleName, cleanAgency } from "../../../lib/names";
import ShortlistPicker, { type ShortlistRow } from "./ShortlistPicker";
import ExpiredLink from "../../../components/ExpiredLink";
import type { Metadata } from "next";

// Per-token pages are private/personalised — never indexed.
export const metadata: Metadata = {
  title: "Your agent shortlist",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ token: string }> };

const TYPE_LABEL: Record<string, string> = {
  HDB: "HDB",
  CONDO: "Condo",
  EC: "EC",
  LANDED: "Landed",
};

export default async function ShortlistPage({ params }: Props) {
  const { token } = await params;
  if (!token || token.length < 8 || token.length > 64) notFound();

  const sb = supabaseAdmin();
  const { data: lead } = await sb
    .from("sg_leads")
    .select(
      "id, token, status, property_type, town, district_code, full_name, created_at"
    )
    .eq("token", token)
    .single();
  // A well-formed but unknown token is usually a stale email link (comparison
  // removed or expired). Recover the seller instead of a bare 404.
  if (!lead) return <ExpiredLink kind="shortlist" />;

  // Once the seller has invited agents, the picker is the wrong destination.
  // Any shortlist CTA (email reminder, reactivation link) for an already-invited
  // seller should land on the status page that confirms their agents were
  // emailed and that we are waiting on quotes, not a locked "pick agents" list.
  const POST_INVITE = new Set(["invited", "quoted", "instructed", "completed"]);
  if (POST_INVITE.has(lead.status)) redirect(`/sell/quotes/${lead.token}`);

  const { data: shortlist } = await sb
    .from("sg_lead_shortlist")
    .select(
      "id, agent_id, rank, score_at_shortlist, status, sg_agents!inner(id, name, slug, agency_name, score, transaction_count, primary_area, google_rating, google_review_count, photo_url, claimed, agent_flags, email, email_status, whatsapp, whatsapp_opt_in_at, cea_registration)"
    )
    .eq("lead_id", lead.id)
    .order("rank");

  // Pull area-context numbers for each agent in one batched read.
  const agentIds = (shortlist ?? []).map((s) => s.agent_id);
  type AreaRow = {
    agent_id: number;
    area_txns: number;
    area_focus_pct: number;
    area_property_types: string | null;
  };
  let areaRowsByAgent = new Map<number, AreaRow>();
  if (agentIds.length > 0) {
    const areaType = lead.property_type === "HDB" ? "town" : "district";
    // sg_area_top_agents stores districts by DESCRIPTIVE NAME (e.g.
    // "Katong/ Joo Chiat/ Amber Road"), never by code. Resolve the district
    // code the same way buildShortlist() does; otherwise every private-property
    // shortlist matches zero area rows and renders 0 deals / 0% area focus.
    let areaName = areaType === "town" ? lead.town ?? "" : "";
    if (areaType === "district" && lead.district_code) {
      const { data: d } = await sb
        .from("sg_districts")
        .select("name")
        .eq("code", lead.district_code)
        .maybeSingle();
      if (d?.name) areaName = String(d.name).replace(/,\s*/g, "/ ");
    }
    if (areaName) {
      const { data: ar } = await sb
        .from("sg_area_top_agents")
        .select("agent_id, area_txns, area_focus_pct, area_property_types")
        .eq("area_type", areaType)
        .eq("area_name", areaName)
        .in("agent_id", agentIds);
      areaRowsByAgent = new Map(
        (ar ?? []).map((r) => [Number(r.agent_id), r as AreaRow])
      );
    }
  }

  // Sold evidence per agent: last recorded SALE month, parsed from real CEA
  // transaction rows (shortlist_last_deals RPC handles the text-date format).
  // Dormant = no recorded sale in 24+ months; the seller sees that as a
  // warning chip instead of unknowingly picking an inactive agent.
  const regs = (shortlist ?? [])
    .map((s) => {
      const j = s.sg_agents as unknown;
      const a = ((Array.isArray(j) ? j[0] : j) ?? {}) as Record<string, unknown>;
      return (a.cea_registration as string) ?? null;
    })
    .filter((r): r is string => Boolean(r));
  const lastDealByReg = new Map<string, string | null>();
  if (regs.length > 0) {
    const { data: deals } = await sb.rpc("shortlist_last_deals", { regs });
    for (const d of (deals ?? []) as { reg: string; last_sale: string | null }[]) {
      lastDealByReg.set(d.reg, d.last_sale ?? null);
    }
  }
  const MONTHS_LONG = ["", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  const fmtDealMonth = (iso: string | null): string | null => {
    if (!iso) return null;
    const m = iso.match(/^(\d{4})-(\d{2})/);
    if (!m) return null;
    return `${MONTHS_LONG[Number(m[2])] ?? ""} ${m[1]}`.trim();
  };
  const DORMANT_MS = 24 * 30.44 * 24 * 60 * 60 * 1000; // ~24 months
  const isDormant = (iso: string | null): boolean => {
    if (!iso) return true;
    const t = new Date(iso).getTime();
    // eslint-disable-next-line react-hooks/purity -- dynamic per-request server render: dormancy is relative to the actual current time
    return !Number.isFinite(t) || Date.now() - t > DORMANT_MS;
  };

  const rows: ShortlistRow[] = (shortlist ?? []).map((s) => {
    const joined = s.sg_agents as unknown;
    const a =
      ((Array.isArray(joined) ? joined[0] : joined) ?? {}) as Record<
        string,
        unknown
      >;
    const ar = areaRowsByAgent.get(Number(s.agent_id));
    const lastSaleIso = lastDealByReg.get((a.cea_registration as string) ?? "") ?? null;
    return {
      shortlist_id: Number(s.id),
      agent_id: Number(s.agent_id),
      // CEA stores names/agencies ALL-CAPS; the homepage ranking title-cases
      // them, so the decision surface must too (and caps read as shouting).
      agent_name: titleName(String(a.name ?? "")),
      agent_slug: (a.slug as string) ?? null,
      agency_name: cleanAgency(String(a.agency_name ?? "")),
      // Display the canonical AgentScore (0-100), not the internal composite
      // ranking value in score_at_shortlist, which can exceed 100.
      score: Number(a.score ?? s.score_at_shortlist ?? 0),
      rank: Number(s.rank),
      total_txns: Number(a.transaction_count ?? 0),
      area_txns: Number(ar?.area_txns ?? 0),
      area_focus_pct: Number(ar?.area_focus_pct ?? 0),
      area_property_types: ar?.area_property_types ?? null,
      primary_area: (a.primary_area as string) ?? null,
      google_rating:
        a.google_rating !== null && a.google_rating !== undefined
          ? Number(a.google_rating)
          : null,
      google_review_count:
        a.google_review_count !== null && a.google_review_count !== undefined
          ? Number(a.google_review_count)
          : 0,
      photo_url: (a.photo_url as string) ?? null,
      claimed: Boolean(a.claimed),
      agent_flags: (a.agent_flags as { t: string; pct?: number }[] | null) ?? [],
      invite_status: String(s.status ?? "suggested"),
      // Computed server-side (lib/reachability) so raw contact details never
      // reach the client, only the flag.
      reachable: isAgentReachable({
        email: (a.email as string | null) ?? null,
        email_status: (a.email_status as string | null) ?? null,
        whatsapp: (a.whatsapp as string | null) ?? null,
        whatsapp_opt_in_at: (a.whatsapp_opt_in_at as string | null) ?? null,
      }),
      last_sale: fmtDealMonth(lastSaleIso),
      dormant: isDormant(lastSaleIso),
    };
  });

  // Log view (best-effort).
  await sb
    .from("sg_lead_events")
    .insert({
      lead_id: lead.id,
      event_type: "view_shortlist",
      meta: { count: rows.length },
    })
    .then(
      () => undefined,
      (e: unknown) => console.error("[sell/shortlist] event log failed", e)
    );

  const propertyTypeLabel = TYPE_LABEL[lead.property_type] ?? lead.property_type;
  const area = lead.town ?? lead.district_code ?? "your area";
  // Picker stays open while shortlisted/new/reshortlisted; locks once the
  // seller has invited agents (status moves to invited/quoted/instructed).
  // 'expired' is deliberately OPEN: the reactivation email's "Resume your
  // shortlist" CTA lands here, and a locked picker would make that a dead end.
  // Inviting from an expired lead flips it straight back to 'invited'.
  const OPEN_STATES = new Set(["shortlisted", "new", "reshortlisted", "expired"]);
  const alreadyInvited = !OPEN_STATES.has(lead.status);
  const isExpired = lead.status === "expired";

  return (
    <>
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-[860px] px-5 py-10 md:px-8 md:py-12">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--blue-deep)]">
            Your shortlist
          </p>
          <h1 className="mt-2 text-2xl font-extrabold text-gray-900 md:text-3xl">
            {lead.full_name?.split(" ")[0] ?? "Hi"}, here are the top agents for
            your {propertyTypeLabel} in {area}.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-600">
            Ranked by actual transaction record. Compare their track records,
            then invite up to 3 to send you a fee quote. Always free for you.
          </p>
          <p className="mt-2 max-w-2xl text-xs text-gray-500">
            How this list is made: we rank the agents with recorded activity in{" "}
            {area} by their CEA transactions, local focus and {propertyTypeLabel}{" "}
            match. No agent can pay to be here, and quoting or subscribing never
            changes anyone&apos;s rank.{" "}
            <a
              href="/how-we-score"
              target="_blank"
              className="underline hover:text-[var(--blue)]"
            >
              Full methodology
            </a>
          </p>
        </div>
      </section>

      <section className="bg-gray-50 py-10">
        <div className="mx-auto max-w-[860px] px-5 md:px-8">
          {rows.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
              <p className="text-base font-semibold text-gray-900">
                No matched agents available for this area yet.
              </p>
              <p className="mt-2 text-sm text-gray-600">
                Email us at hello@fair-comparisons.com and we&apos;ll source a
                manual shortlist for you within 24 hours.
              </p>
            </div>
          ) : (
            <ShortlistPicker
              token={lead.token}
              rows={rows}
              propertyType={propertyTypeLabel}
              area={area}
              alreadyInvited={alreadyInvited}
              expired={isExpired}
            />
          )}
        </div>
      </section>
    </>
  );
}
