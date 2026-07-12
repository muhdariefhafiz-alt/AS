import { notFound } from "next/navigation";
import { supabaseAdmin } from "../../lib/supabase";
import { verifyInviteToken } from "../../lib/agentInvite";
import { greetName, titleName } from "../../lib/names";
import InviteQuoteForm from "./InviteQuoteForm";
import type { Metadata } from "next";

// Magic-invite landing: the full seller brief plus the quote form, one page,
// no sign-in. The signed token names the (lead, agent) pair; submitting the
// form claims an unclaimed profile in the same step (see /api/invite/quote).
// Replaces the old CTA target (/dashboard?token=) that walled every unclaimed
// agent behind a sign-in form no invite recipient could pass.

export const metadata: Metadata = {
  title: "Seller request | FairComparisons",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ token: string }> };

const TYPE_LABEL: Record<string, string> = {
  HDB: "HDB",
  CONDO: "Condo",
  EC: "EC",
  LANDED: "Landed",
};
const TIMELINE_LABEL: Record<string, string> = {
  asap: "ASAP",
  "1_3m": "Within 1-3 months",
  "3_6m": "Within 3-6 months",
  "6_12m": "Within 6-12 months",
  exploring: "Exploring",
};

const fmtMoney = (n: number | null) =>
  n == null
    ? null
    : n >= 1_000_000
      ? `S$${(n / 1_000_000).toFixed(1)}M`
      : `S$${Math.round(n / 1_000)}K`;

export default async function InviteBriefPage({ params }: Props) {
  const { token } = await params;
  const parsed = verifyInviteToken(token);

  if (!parsed) {
    return (
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-[560px] px-5 text-center">
          <h1 className="text-2xl font-extrabold text-gray-900">
            This invite link is invalid or has expired.
          </h1>
          <p className="mt-3 text-sm text-gray-600">
            Invite links are valid for 14 days. If a seller request reached you
            recently and this link no longer works, email{" "}
            <a
              href="mailto:hello@fair-comparisons.com"
              className="font-medium text-[var(--blue)] underline"
            >
              hello@fair-comparisons.com
            </a>{" "}
            and we will reconnect you.
          </p>
        </div>
      </section>
    );
  }

  const sb = supabaseAdmin();
  const [{ data: agent }, { data: lead }] = await Promise.all([
    sb
      .from("sg_agents")
      .select("id, name, slug, claimed, whatsapp")
      .eq("id", parsed.agentId)
      .maybeSingle(),
    sb
      .from("sg_leads")
      .select(
        "id, status, property_type, town, district_code, bedrooms, timeline, reason, est_value_low, est_value_high, created_at"
      )
      .eq("id", parsed.leadId)
      .maybeSingle(),
  ]);
  if (!agent || !lead) notFound();

  const { data: shortlistRow } = await sb
    .from("sg_lead_shortlist")
    .select("id, status")
    .eq("lead_id", lead.id)
    .eq("agent_id", agent.id)
    .maybeSingle();
  if (!shortlistRow) notFound();

  const leadClosed = ["instructed", "completed", "expired"].includes(
    String(lead.status)
  );
  const alreadyQuoted = String(shortlistRow.status) === "quoted";

  // Funnel instrumentation: brief views are the top of the magic-claim funnel
  // (brief_view -> magic_claim -> invite_quote). Best-effort.
  await sb
    .from("sg_funnel_events")
    .insert({
      event: "invite_brief_view",
      agent_id: agent.id,
      metadata: { lead_id: lead.id, closed: leadClosed },
    })
    .then(
      () => undefined,
      (e: unknown) => console.error("[invite] brief_view log failed", e)
    );

  const typeLabel = TYPE_LABEL[String(lead.property_type)] ?? lead.property_type;
  const area = lead.town ?? lead.district_code ?? "Singapore";
  const timeline = lead.timeline
    ? (TIMELINE_LABEL[String(lead.timeline)] ?? String(lead.timeline))
    : null;
  const lo = fmtMoney(lead.est_value_low as number | null);
  const hi = fmtMoney(lead.est_value_high as number | null);
  const valueRange = lo && hi ? `${lo} to ${hi}` : (lo ?? hi);
  const firstName = greetName(agent.name ?? "") || "there";
  const displayName = titleName(agent.name ?? "");

  const facts: { label: string; value: string }[] = [
    { label: "Property", value: `${typeLabel}${lead.bedrooms ? `, ${lead.bedrooms}-bed` : ""}` },
    { label: "Area", value: String(area) },
  ];
  if (valueRange) facts.push({ label: "Estimated value", value: valueRange });
  if (timeline) facts.push({ label: "Timeline", value: timeline });
  if (lead.reason) facts.push({ label: "Reason for selling", value: String(lead.reason) });

  return (
    <>
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-[720px] px-5 py-10 md:px-8 md:py-12">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--blue-deep)]">
            Seller request
          </p>
          <h1 className="mt-2 text-2xl font-extrabold text-gray-900 md:text-3xl">
            {leadClosed
              ? "This seller request has closed."
              : `${firstName}, a homeowner in ${area} picked you.`}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-gray-600">
            {leadClosed
              ? "The homeowner has already instructed an agent or the request expired. Claim your profile so the next request reaches you instantly."
              : "They found you on FairComparisons, ranked on your real transaction record, and asked you for a fee quote. Quotes are expected within 24 hours of the invite."}
          </p>
        </div>
      </section>

      <section className="bg-gray-50 py-10">
        <div className="mx-auto max-w-[720px] space-y-6 px-5 md:px-8">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">
              The brief
            </h2>
            <dl className="mt-3 divide-y divide-gray-100">
              {facts.map((f) => (
                <div key={f.label} className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="text-sm text-gray-500">{f.label}</dt>
                  <dd className="text-sm font-semibold text-gray-900">{f.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-gray-500">
              The homeowner&apos;s name and contact details are shared after you
              submit your quote and they choose to proceed.
            </p>
          </div>

          {!leadClosed && (
            <InviteQuoteForm
              inviteToken={token}
              agentName={displayName}
              claimed={Boolean(agent.claimed)}
              alreadyQuoted={alreadyQuoted}
              defaultWhatsapp={(agent.whatsapp as string | null) ?? ""}
            />
          )}

          <p className="text-center text-xs text-gray-400">
            Not {displayName || "you"}?{" "}
            <a
              href={`mailto:hello@fair-comparisons.com?subject=${encodeURIComponent(`Wrong recipient: invite for ${displayName || "agent"}`)}`}
              className="underline"
            >
              Tell us
            </a>{" "}
            and we will correct our records. Your ranking on FairComparisons is
            computed from public CEA, URA and HDB data and never changes based
            on participation or payment.
          </p>
        </div>
      </section>
    </>
  );
}
