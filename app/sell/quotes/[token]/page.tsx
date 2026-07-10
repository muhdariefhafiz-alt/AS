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

const MONTHS_SHORT = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul",
  "Aug", "Sep", "Oct", "Nov", "Dec"];

// Format the stored ISO timestamp as "10 Jul 2026" using its date parts only,
// so the label is timezone-neutral and never fabricated.
function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const month = MONTHS_SHORT[Number(m[2])] ?? "";
  return `${Number(m[3])} ${month} ${m[1]}`;
}

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
    .select("agent_id, status, invited_at, sg_agents!inner(name)")
    .eq("lead_id", lead.id)
    .order("invited_at", { ascending: true });
  const invitedCount =
    shortlist?.filter((s) => s.status === "invited" || s.status === "quoted").length ?? 0;

  // Evidence of contact, per agent. sg_lead_notifications records what each
  // provider actually accepted; status='invited' alone is only the seller's
  // intent. Copy below claims "emailed"/"notified" strictly from these rows,
  // never from the status flag, so the seller is never told an agent was
  // contacted when nothing was delivered to a provider.
  const { data: notifRows } = await sb
    .from("sg_lead_notifications")
    .select("agent_id, channel, outcome, created_at")
    .eq("lead_id", lead.id)
    .order("created_at", { ascending: true });
  const sentByAgent = new Map<number, { channel: string; at: string }>();
  for (const n of notifRows ?? []) {
    const ok =
      n.outcome === "sent" || n.outcome === "delivered" || n.outcome === "read";
    if (!ok) continue;
    const id = Number(n.agent_id);
    // Prefer email as the shown channel (the durable record) when both sent.
    const prev = sentByAgent.get(id);
    if (!prev || (prev.channel !== "email" && n.channel === "email")) {
      sentByAgent.set(id, {
        channel: String(n.channel),
        at: String(n.created_at),
      });
    }
  }

  const agentName = (s: { sg_agents: unknown }): string => {
    const joined = s.sg_agents as unknown;
    const a =
      ((Array.isArray(joined) ? joined[0] : joined) ?? {}) as Record<
        string,
        unknown
      >;
    return String(a.name ?? "Your agent");
  };

  // Agents the seller is waiting on: invited and not yet quoted. Each carries
  // its proof-of-contact (or lack of it) so the row label is honest.
  const waitingAgents = (shortlist ?? [])
    .filter((s) => s.status === "invited")
    .map((s) => {
      const sent = sentByAgent.get(Number(s.agent_id)) ?? null;
      return {
        name: agentName(s),
        invited_at: (s.invited_at as string | null) ?? null,
        sent_channel: sent?.channel ?? null,
        sent_at: sent?.at ?? null,
      };
    });
  const notifiedWaiting = waitingAgents.filter((a) => a.sent_channel !== null);
  const allNotifiedByEmail =
    notifiedWaiting.length > 0 &&
    notifiedWaiting.every((a) => a.sent_channel === "email");

  // Picked agents we could not reach at all (no verified contact channel).
  // Shown to the seller as the truth, never counted as contacted.
  const unreachableAgents = (shortlist ?? [])
    .filter((s) => s.status === "unreachable")
    .map(agentName);

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
              : rows.length === 0
                ? notifiedWaiting.length > 0
                  ? `Your ${propertyTypeLabel} in ${area} is now with ${notifiedWaiting.length} agent${notifiedWaiting.length === 1 ? "" : "s"}.`
                  : waitingAgents.length > 0
                    ? `You invited ${waitingAgents.length} agent${waitingAgents.length === 1 ? "" : "s"} for your ${propertyTypeLabel} in ${area}.`
                    : `No quotes yet for your ${propertyTypeLabel} in ${area}.`
                : `${rows.length} of ${invitedCount} agents have quoted on your ${propertyTypeLabel} in ${area}.`}
          </h1>
        </div>
      </section>

      <section className="bg-gray-50 py-10">
        <div className="mx-auto max-w-[860px] px-5 md:px-8">
          {!alreadyPicked && waitingAgents.length > 0 && (
            <div className="mb-6 rounded-2xl border border-[var(--line-2)] bg-[var(--blue-wash)] p-5 md:p-6">
              <p className="text-sm font-bold text-gray-900">
                {rows.length > 0
                  ? `Still waiting on ${waitingAgents.length} more agent${waitingAgents.length === 1 ? "" : "s"} to quote.`
                  : notifiedWaiting.length > 0
                    ? `We have ${allNotifiedByEmail ? "emailed" : "notified"} your ${notifiedWaiting.length} agent${notifiedWaiting.length === 1 ? "" : "s"}. Now we wait for them to reach out.`
                    : `You invited ${waitingAgents.length} agent${waitingAgents.length === 1 ? "" : "s"}.`}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                {notifiedWaiting.length > 0 || rows.length > 0
                  ? "Each has 24 hours to send you a fee quote. We will email you the moment one responds. There is nothing more for you to do right now."
                  : "We could not yet confirm delivery to these agents. We will email you the moment a quote arrives."}
              </p>
              <ul className="mt-4 divide-y divide-gray-200 border-t border-gray-200">
                {waitingAgents.map((a, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <span className="text-sm font-semibold text-gray-900">
                      {a.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {a.sent_channel === "email"
                        ? `Emailed ${fmtDate(a.sent_at) ?? ""}`.trim()
                        : a.sent_channel === "whatsapp"
                          ? `Sent by WhatsApp ${fmtDate(a.sent_at) ?? ""}`.trim()
                          : fmtDate(a.invited_at)
                            ? `Invited ${fmtDate(a.invited_at)}`
                            : "Invited"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!alreadyPicked && unreachableAgents.length > 0 && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 md:p-6">
              <p className="text-sm font-bold text-gray-900">
                We could not reach{" "}
                {unreachableAgents.length === 1
                  ? unreachableAgents[0]
                  : `${unreachableAgents.slice(0, -1).join(", ")} and ${unreachableAgents[unreachableAgents.length - 1]}`}
                .
              </p>
              <p className="mt-1 text-sm text-gray-700">
                {unreachableAgents.length === 1 ? "This agent has" : "These agents have"}{" "}
                no verified contact details on FairComparisons, so your request
                was not sent to them. You can contact them yourself through
                their agency, or wait for quotes from the agents we did reach.
              </p>
            </div>
          )}
          <QuotesView
            token={lead.token}
            rows={rows}
            alreadyPicked={alreadyPicked}
            pickedQuoteId={pickedRow?.quote_id ?? null}
            waitingNoticeShown={
              waitingAgents.length > 0 || unreachableAgents.length > 0
            }
          />
        </div>
      </section>
    </>
  );
}
