import { notFound } from "next/navigation";
import { supabaseAdmin } from "../../../lib/supabase";
import ShortlistPicker, { type ShortlistRow } from "./ShortlistPicker";
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
  if (!lead) notFound();

  const { data: shortlist } = await sb
    .from("sg_lead_shortlist")
    .select(
      "id, agent_id, rank, score_at_shortlist, status, sg_agents!inner(id, name, slug, agency_name, score, transaction_count, primary_area, google_rating, google_review_count, photo_url, claimed)"
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
    const areaName =
      areaType === "town" ? lead.town ?? "" : lead.district_code ?? "";
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

  const rows: ShortlistRow[] = (shortlist ?? []).map((s) => {
    const joined = s.sg_agents as unknown;
    const a =
      ((Array.isArray(joined) ? joined[0] : joined) ?? {}) as Record<
        string,
        unknown
      >;
    const ar = areaRowsByAgent.get(Number(s.agent_id));
    return {
      shortlist_id: Number(s.id),
      agent_id: Number(s.agent_id),
      agent_name: String(a.name ?? ""),
      agent_slug: (a.slug as string) ?? null,
      agency_name: String(a.agency_name ?? ""),
      score: Number(s.score_at_shortlist ?? a.score ?? 0),
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
      invite_status: String(s.status ?? "suggested"),
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
  const OPEN_STATES = new Set(["shortlisted", "new", "reshortlisted"]);
  const alreadyInvited = !OPEN_STATES.has(lead.status);

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
            Ranked by actual transaction record. Compare their track records and
            contact the ones you choose. Always free for you.
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
            />
          )}
        </div>
      </section>
    </>
  );
}
