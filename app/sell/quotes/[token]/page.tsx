import { notFound } from "next/navigation";
import { supabaseAdmin } from "../../../lib/supabase";
import QuotesView, { type QuoteRow } from "./QuotesView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your agent quotes",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ token: string }> };

const TYPE_LABEL: Record<string, string> = {
  HDB: "HDB",
  CONDO: "Condo",
  EC: "EC",
  LANDED: "Landed",
};

export default async function QuotesPage({ params }: Props) {
  const { token } = await params;
  if (!token || token.length < 8 || token.length > 64) notFound();

  const sb = supabaseAdmin();
  const { data: lead } = await sb
    .from("sg_leads")
    .select(
      "id, token, status, property_type, town, district_code, full_name"
    )
    .eq("token", token)
    .single();
  if (!lead) notFound();

  const { data: quotes } = await sb
    .from("sg_lead_quotes")
    .select(
      "id, agent_id, commission_pct, est_timeline_weeks, est_value_low, est_value_high, marketing_plan, note, status, submitted_at, sg_agents!inner(id, name, slug, agency_name, score, agent_flags)"
    )
    .eq("lead_id", lead.id)
    .neq("status", "withdrawn")
    .order("submitted_at");

  const rows: QuoteRow[] = (quotes ?? []).map((q) => {
    const joined = q.sg_agents as unknown;
    const a =
      ((Array.isArray(joined) ? joined[0] : joined) ?? {}) as Record<
        string,
        unknown
      >;
    return {
      quote_id: Number(q.id),
      agent_id: Number(q.agent_id),
      agent_name: String(a.name ?? ""),
      agent_slug: (a.slug as string) ?? null,
      agency_name: String(a.agency_name ?? ""),
      agent_score: Number(a.score ?? 0),
      agent_flags: (a.agent_flags as { t: string; pct?: number }[] | null) ?? [],
      commission_pct: Number(q.commission_pct),
      est_timeline_weeks: q.est_timeline_weeks ?? null,
      est_value_low: q.est_value_low ?? null,
      est_value_high: q.est_value_high ?? null,
      marketing_plan: String(q.marketing_plan ?? ""),
      note: (q.note as string | null) ?? null,
      status: String(q.status ?? ""),
      submitted_at: q.submitted_at ?? null,
    };
  });

  const pickedRow = rows.find((r) => r.status === "accepted");
  const alreadyPicked = Boolean(pickedRow) || lead.status === "instructed" || lead.status === "completed";

  // How many were invited vs how many have quoted, so the seller knows
  // whether to wait for more.
  const { data: shortlist } = await sb
    .from("sg_lead_shortlist")
    .select("status")
    .eq("lead_id", lead.id);
  const invitedCount =
    shortlist?.filter((s) => s.status === "invited" || s.status === "quoted").length ?? 0;
  const outstanding = Math.max(0, invitedCount - rows.length);

  await sb
    .from("sg_lead_events")
    .insert({
      lead_id: lead.id,
      event_type: "view_quotes",
      meta: { quote_count: rows.length },
    })
    .then(
      () => undefined,
      (e: unknown) => console.error("[sell/quotes] event log failed", e)
    );

  const area = lead.town ?? lead.district_code ?? "your area";
  const propertyTypeLabel = TYPE_LABEL[lead.property_type] ?? lead.property_type;

  return (
    <>
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-[860px] px-5 py-10 md:px-8 md:py-12">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--blue-deep)]">
            Your quotes
          </p>
          <h1 className="mt-2 text-2xl font-extrabold text-gray-900 md:text-3xl">
            {alreadyPicked
              ? `You instructed ${pickedRow?.agent_name ?? "an agent"}.`
              : `${rows.length} of ${invitedCount} agents have quoted on your ${propertyTypeLabel} in ${area}.`}
          </h1>
          {!alreadyPicked && outstanding > 0 && (
            <p className="mt-2 text-sm text-gray-600">
              {outstanding} more invited agent{outstanding === 1 ? "" : "s"} still
              to submit. You can wait or instruct any of those already in.
            </p>
          )}
        </div>
      </section>

      <section className="bg-gray-50 py-10">
        <div className="mx-auto max-w-[860px] px-5 md:px-8">
          <QuotesView
            token={lead.token}
            rows={rows}
            alreadyPicked={alreadyPicked}
            pickedQuoteId={pickedRow?.quote_id ?? null}
          />
        </div>
      </section>
    </>
  );
}
