"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import DraftReply from "./DraftReply";

type Lead = {
  id: number;
  token: string;
  status: string;
  property_type: string;
  town: string | null;
  district_code: string | null;
  bedrooms: number | null;
  est_value_low: number | null;
  est_value_high: number | null;
  timeline: string | null;
  reason: string | null;
  full_name: string | null;
  created_at: string | null;
  // Only populated on the lead this agent WON (status picked); null otherwise.
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
};

type Quote = {
  id: number;
  commission_pct: number;
  est_timeline_weeks: number | null;
  est_value_low: number | null;
  est_value_high: number | null;
  marketing_plan: string;
  status: string;
  submitted_at: string | null;
};

type Completion = {
  id: number;
  instruction_signed_at: string | null;
  otp_signed_at: string | null;
  completion_date: string | null;
  sale_price: number | null;
  commission_pct_final: number | null;
};

type Row = {
  shortlist_id: number;
  status: string;
  invited_at: string | null;
  quoted_at: string | null;
  picked_at: string | null;
  first_reply_at: string | null;
  needs_reply: boolean;
  age_hours: number | null;
  sla: "fresh" | "aging" | "overdue" | null;
  deal_value: number;
  lead: Lead;
  quote: Quote | null;
  completion: Completion | null;
};

type Summary = {
  needs_reply: number;
  oldest_aging_hours: number;
  top_deal_value: number;
};

type Props = {
  agentEmail: string;
  ceaRegistration: string;
};

function ag0(hours: number): string {
  if (hours < 1) return "<1h";
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.floor(hours / 24)}d`;
}

function slaChip(sla: Row["sla"], ageHours: number | null): { label: string; cls: string } | null {
  if (!sla || ageHours == null) return null;
  if (sla === "overdue") return { label: `Overdue ${ag0(ageHours)}`, cls: "bg-red-100 text-red-700" };
  if (sla === "aging") return { label: `Aging ${ag0(ageHours)}`, cls: "bg-amber-100 text-amber-800" };
  return { label: "New", cls: "bg-emerald-100 text-emerald-700" };
}

const TYPE_LABEL: Record<string, string> = {
  HDB: "HDB",
  CONDO: "Condo",
  EC: "EC",
  LANDED: "Landed",
};

const TIMELINE_LABEL: Record<string, string> = {
  asap: "ASAP",
  "1_3m": "1–3 months",
  "3_6m": "3–6 months",
  "6_12m": "6–12 months",
  exploring: "Exploring",
};

function fmtPrice(n: number | null | undefined): string {
  if (!n) return "—";
  if (n >= 1_000_000) return `S$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `S$${(n / 1_000).toFixed(0)}K`;
  return `S$${n}`;
}

function statusPill(status: string): { label: string; cls: string } {
  switch (status) {
    case "invited":
      return {
        label: "Awaiting your quote",
        cls: "bg-amber-100 text-amber-800",
      };
    case "quoted":
      return { label: "Quote submitted", cls: "bg-[var(--blue-wash)] text-[var(--blue-deep)]" };
    case "picked":
      return { label: "You won the instruction", cls: "bg-emerald-100 text-emerald-800" };
    case "not_picked":
      return { label: "Seller picked someone else", cls: "bg-gray-100 text-gray-700" };
    default:
      return { label: status, cls: "bg-gray-100 text-gray-600" };
  }
}

export default function LeadsInbox({ agentEmail, ceaRegistration }: Props) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [replying, setReplying] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: agentEmail }),
      });
      const json = await res.json();
      if (!res.ok) {
        setLoadError(json?.error ?? "Could not load leads.");
        return;
      }
      setRows(json.leads ?? []);
      setSummary(json.summary ?? null);
    } catch {
      setLoadError("Network error loading leads.");
    }
  }, [agentEmail]);

  // Record that the agent replied (they send via their own channel; this marks
  // first_reply_at and fires the reply signal). Optimistic; server reconciles.
  const markReplied = useCallback(async (shortlistId: number) => {
    setReplying(shortlistId);
    setRows((rs) =>
      rs?.map((r) =>
        r.shortlist_id === shortlistId
          ? { ...r, first_reply_at: new Date().toISOString(), needs_reply: false, sla: null }
          : r
      ) ?? rs
    );
    setSummary((s) => (s ? { ...s, needs_reply: Math.max(0, s.needs_reply - 1) } : s));
    try {
      await fetch("/api/dashboard/leads/reply-sent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shortlist_id: shortlistId }),
      });
    } catch {
      /* optimistic; a later load() reconciles */
    } finally {
      setReplying(null);
    }
  }, []);

  useEffect(() => {
    // Fire-and-forget; the load() callback owns its own setState. We don't
    // await it here because the effect contract is synchronous.
    load();
  }, [load]);

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {loadError}
      </div>
    );
  }
  if (rows === null) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
        Loading your leads…
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <p className="text-sm font-semibold text-gray-900">No enquiries yet.</p>
        <p className="mt-1 text-sm text-gray-600">
          When a homeowner contacts you after comparing agents, we&apos;ll email
          you and show the enquiry here.
        </p>
      </div>
    );
  }

  return (
    <>
      {summary && summary.needs_reply > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--blue)] bg-[var(--blue-wash)] px-4 py-3">
          <p className="text-sm text-[var(--ink)]">
            <strong>
              {summary.needs_reply} {summary.needs_reply === 1 ? "lead needs" : "leads need"} a reply
            </strong>
            {summary.oldest_aging_hours >= 4 && (
              <span className="text-[var(--slate)]"> &middot; oldest waiting {ag0(summary.oldest_aging_hours)}</span>
            )}
          </p>
          <span className="text-xs font-semibold text-[var(--blue-deep)]">
            Reply first to win the instruction
          </span>
        </div>
      )}
      <ul className="space-y-3">
      {rows.map((r) => {
        const pill = statusPill(r.status);
        const area = r.lead.town ?? r.lead.district_code ?? "—";
        const isOpen = openId === r.shortlist_id;
        return (
          <li
            key={r.shortlist_id}
            className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-gray-900">
                    {TYPE_LABEL[r.lead.property_type] ?? r.lead.property_type}{" "}
                    in {area}
                  </h4>
                  <span
                    className={
                      "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold " +
                      pill.cls
                    }
                  >
                    {pill.label}
                  </span>
                  {r.status === "invited" &&
                    (() => {
                      const c = slaChip(r.sla, r.age_hours);
                      return c ? (
                        <span
                          className={
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold " + c.cls
                          }
                        >
                          {c.label}
                        </span>
                      ) : null;
                    })()}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-gray-600">
                  {r.lead.bedrooms && <span>{r.lead.bedrooms}-bed</span>}
                  {r.lead.timeline && (
                    <span>
                      Timeline:{" "}
                      <strong>{TIMELINE_LABEL[r.lead.timeline] ?? r.lead.timeline}</strong>
                    </span>
                  )}
                  {(r.lead.est_value_low || r.lead.est_value_high) && (
                    <span>
                      Est. {fmtPrice(r.lead.est_value_low)} –{" "}
                      {fmtPrice(r.lead.est_value_high)}
                    </span>
                  )}
                  {r.invited_at && (
                    <span>
                      Invited {new Date(r.invited_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {r.status === "invited" && (
                  <div className="mt-2 flex gap-3">
                    {r.first_reply_at ? (
                      <span className="text-xs font-medium text-emerald-700">
                        &#10003; Replied {new Date(r.first_reply_at).toLocaleDateString()}
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={replying === r.shortlist_id}
                        onClick={() => markReplied(r.shortlist_id)}
                        className="text-xs font-semibold text-[var(--blue-deep)] underline hover:text-[var(--blue)]"
                      >
                        {replying === r.shortlist_id ? "Saving…" : "Mark as replied"}
                      </button>
                    )}
                    <Link
                      href={`/dashboard/contacts/${r.shortlist_id}`}
                      className="text-xs font-semibold text-gray-600 hover:text-gray-900 underline"
                    >
                      View contact
                    </Link>
                  </div>
                )}
              </div>
              {r.status === "invited" && (
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : r.shortlist_id)}
                  className="rounded-lg bg-[var(--blue)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--blue-deep)]"
                >
                  {isOpen ? "Cancel" : "Submit quote"}
                </button>
              )}
              {r.status === "quoted" && r.quote && (
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm text-gray-700">
                    Your quote:{" "}
                    <strong>{r.quote.commission_pct.toFixed(2)}%</strong>
                  </span>
                  <WithdrawButton
                    token={r.lead.token}
                    ceaRegistration={ceaRegistration}
                    agentEmail={agentEmail}
                    onWithdrawn={load}
                  />
                </div>
              )}
            </div>

            {r.quote && (
              <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm">
                <p className="font-semibold text-gray-900">Your quote</p>
                <div className="mt-1 grid gap-2 text-xs text-gray-700 sm:grid-cols-3">
                  <span>
                    Commission: <strong>{r.quote.commission_pct.toFixed(2)}%</strong>
                  </span>
                  <span>
                    Timeline:{" "}
                    <strong>
                      {r.quote.est_timeline_weeks
                        ? `${r.quote.est_timeline_weeks} wks`
                        : "—"}
                    </strong>
                  </span>
                  <span>
                    Range: <strong>{fmtPrice(r.quote.est_value_low)} – {fmtPrice(r.quote.est_value_high)}</strong>
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-line text-xs text-gray-700">
                  {r.quote.marketing_plan}
                </p>
              </div>
            )}

            {isOpen && r.status === "invited" && (
              <DraftReply shortlistId={r.shortlist_id} />
            )}
            {isOpen && r.status === "invited" && (
              <QuoteForm
                token={r.lead.token}
                ceaRegistration={ceaRegistration}
                agentEmail={agentEmail}
                onSubmitted={() => {
                  setOpenId(null);
                  load();
                }}
              />
            )}

            {r.status === "picked" && (
              <>
                {/* The seller chose this agent: their contact details are
                    released here (and in the win email) so the handoff can
                    actually happen. */}
                {(r.lead.email || r.lead.phone || r.lead.whatsapp) && (
                  <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
                    <p className="font-semibold text-emerald-900">
                      Contact {r.lead.full_name ?? "the seller"} to arrange the
                      agency agreement
                    </p>
                    <div className="mt-1.5 space-y-0.5 text-emerald-900">
                      {(r.lead.whatsapp || r.lead.phone) && (
                        <div className="font-mono text-xs">
                          {r.lead.whatsapp || r.lead.phone}
                        </div>
                      )}
                      {r.lead.email && (
                        <div className="text-xs">{r.lead.email}</div>
                      )}
                    </div>
                    <DraftReply shortlistId={r.shortlist_id} />
                  </div>
                )}
                <CompletionStepper
                  token={r.lead.token}
                  ceaRegistration={ceaRegistration}
                  agentEmail={agentEmail}
                  completion={r.completion}
                  quotedCommissionPct={r.quote?.commission_pct ?? null}
                  onSaved={load}
                />
              </>
            )}
          </li>
        );
      })}
      </ul>
    </>
  );
}

function QuoteForm({
  token,
  ceaRegistration,
  agentEmail,
  onSubmitted,
}: {
  token: string;
  ceaRegistration: string;
  agentEmail: string;
  onSubmitted: () => void;
}) {
  const [commissionPct, setCommissionPct] = useState<string>("1.5");
  const [timelineWeeks, setTimelineWeeks] = useState<string>("8");
  const [low, setLow] = useState<string>("");
  const [high, setHigh] = useState<string>("");
  const [plan, setPlan] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    const pct = Number(commissionPct);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 10) {
      setError("Commission must be 0–10%.");
      return;
    }
    if (plan.trim().length < 20) {
      setError("Marketing plan must be at least 20 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/sell/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          cea_registration: ceaRegistration,
          agent_email: agentEmail,
          commission_pct: pct,
          est_timeline_weeks: timelineWeeks ? Number(timelineWeeks) : null,
          est_value_low: low ? Number(low) : null,
          est_value_high: high ? Number(high) : null,
          marketing_plan: plan.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Could not submit quote.");
        setSubmitting(false);
        return;
      }
      onSubmitted();
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--cloud)] p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold text-gray-700">
            Commission (% of sale)
          </span>
          <input
            value={commissionPct}
            onChange={(e) => setCommissionPct(e.target.value)}
            inputMode="decimal"
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[var(--blue)] focus:outline-none"
            required
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-gray-700">
            Est. timeline (weeks)
          </span>
          <input
            value={timelineWeeks}
            onChange={(e) =>
              setTimelineWeeks(e.target.value.replace(/\D/g, "").slice(0, 3))
            }
            inputMode="numeric"
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[var(--blue)] focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-gray-700">
            Est. sale low (S$)
          </span>
          <input
            value={low}
            onChange={(e) =>
              setLow(e.target.value.replace(/\D/g, "").slice(0, 9))
            }
            inputMode="numeric"
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[var(--blue)] focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-gray-700">
            Est. sale high (S$)
          </span>
          <input
            value={high}
            onChange={(e) =>
              setHigh(e.target.value.replace(/\D/g, "").slice(0, 9))
            }
            inputMode="numeric"
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[var(--blue)] focus:outline-none"
          />
        </label>
      </div>
      <label className="mt-3 block">
        <span className="text-xs font-semibold text-gray-700">
          Marketing approach
        </span>
        <textarea
          value={plan}
          onChange={(e) => setPlan(e.target.value.slice(0, 2000))}
          rows={4}
          placeholder="How will you market this property? What's your pricing strategy? What's your differentiator?"
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[var(--blue)] focus:outline-none"
          required
        />
      </label>

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={submitting}
        className={
          "mt-3 w-full rounded-lg px-4 py-2 text-sm font-semibold text-white transition " +
          (submitting ? "bg-gray-400" : "bg-[var(--blue)] hover:bg-[var(--blue-deep)]")
        }
      >
        {submitting ? "Submitting…" : "Submit quote"}
      </button>
      <p className="mt-2 text-xs text-gray-500">
        Your quote goes straight to the seller. FairComparisons never takes a
        cut of your sale.
      </p>
    </form>
  );
}

function CompletionStepper({
  token,
  ceaRegistration,
  agentEmail,
  completion,
  quotedCommissionPct,
  onSaved,
}: {
  token: string;
  ceaRegistration: string;
  agentEmail: string;
  completion: Completion | null;
  quotedCommissionPct: number | null;
  onSaved: () => void;
}) {
  const hasInstruction = Boolean(completion?.instruction_signed_at);
  const hasOtp = Boolean(completion?.otp_signed_at);
  const hasCompletion = Boolean(completion?.completion_date);

  const today = new Date().toISOString().slice(0, 10);

  const [openStage, setOpenStage] = useState<
    "instruction" | "otp" | "completion" | null
  >(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Instruction form
  const [instructionDate, setInstructionDate] = useState<string>(today);
  const [overrideCommission, setOverrideCommission] = useState<boolean>(false);
  const [overrideCommissionPct, setOverrideCommissionPct] = useState<string>(
    quotedCommissionPct !== null ? quotedCommissionPct.toFixed(2) : "1.50"
  );

  // OTP form
  const [otpDate, setOtpDate] = useState<string>(today);

  // Completion form
  const [completionDate, setCompletionDate] = useState<string>(today);
  const [salePrice, setSalePrice] = useState<string>("");

  async function postStage(payload: Record<string, unknown>) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/sell/completion/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          cea_registration: ceaRegistration,
          agent_email: agentEmail,
          ...payload,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Could not save.");
        setSubmitting(false);
        return;
      }
      setOpenStage(null);
      setSubmitting(false);
      onSaved();
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900">Completion log</p>
      </div>

      <ol className="mt-3 space-y-2 text-sm">
        <StageRow
          n={1}
          label="Instruction signed"
          done={hasInstruction}
          subline={
            completion?.instruction_signed_at
              ? new Date(completion.instruction_signed_at).toLocaleDateString()
              : null
          }
          actionLabel={hasInstruction ? null : "Log instruction"}
          onAction={() =>
            setOpenStage(openStage === "instruction" ? null : "instruction")
          }
          isOpen={openStage === "instruction"}
        />
        {openStage === "instruction" && !hasInstruction && (
          <li className="rounded-lg border border-[var(--line)] bg-white p-3">
            <label className="block">
              <span className="text-xs font-semibold text-gray-700">
                Instruction signing date
              </span>
              <input
                type="date"
                value={instructionDate}
                onChange={(e) => setInstructionDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[var(--blue)] focus:outline-none"
                max={today}
              />
            </label>
            <label className="mt-3 flex items-start gap-2 text-xs text-gray-700">
              <input
                type="checkbox"
                checked={overrideCommission}
                onChange={(e) => setOverrideCommission(e.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                Commission was renegotiated at instruction (final % differs
                from quoted {quotedCommissionPct?.toFixed(2) ?? "—"}%)
              </span>
            </label>
            {overrideCommission && (
              <label className="mt-2 block">
                <span className="text-xs font-semibold text-gray-700">
                  Final commission (%)
                </span>
                <input
                  value={overrideCommissionPct}
                  onChange={(e) => setOverrideCommissionPct(e.target.value)}
                  inputMode="decimal"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[var(--blue)] focus:outline-none"
                />
              </label>
            )}
            {error && (
              <p className="mt-2 text-xs text-red-700">{error}</p>
            )}
            <button
              type="button"
              disabled={submitting}
              onClick={() =>
                postStage({
                  stage: "instruction",
                  instruction_signed_at: instructionDate,
                  commission_pct_final: overrideCommission
                    ? Number(overrideCommissionPct)
                    : null,
                })
              }
              className={
                "mt-3 w-full rounded-lg px-3 py-2 text-sm font-semibold text-white " +
                (submitting ? "bg-gray-400" : "bg-[var(--blue)] hover:bg-[var(--blue-deep)]")
              }
            >
              {submitting ? "Saving…" : "Save instruction"}
            </button>
          </li>
        )}

        <StageRow
          n={2}
          label="OTP signed"
          done={hasOtp}
          subline={
            completion?.otp_signed_at
              ? new Date(completion.otp_signed_at).toLocaleDateString()
              : null
          }
          actionLabel={
            hasInstruction && !hasOtp ? "Log OTP" : null
          }
          onAction={() => setOpenStage(openStage === "otp" ? null : "otp")}
          isOpen={openStage === "otp"}
          locked={!hasInstruction}
        />
        {openStage === "otp" && !hasOtp && hasInstruction && (
          <li className="rounded-lg border border-[var(--line)] bg-white p-3">
            <label className="block">
              <span className="text-xs font-semibold text-gray-700">
                OTP signing date
              </span>
              <input
                type="date"
                value={otpDate}
                onChange={(e) => setOtpDate(e.target.value)}
                max={today}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[var(--blue)] focus:outline-none"
              />
            </label>
            {error && (
              <p className="mt-2 text-xs text-red-700">{error}</p>
            )}
            <button
              type="button"
              disabled={submitting}
              onClick={() =>
                postStage({ stage: "otp", otp_signed_at: otpDate })
              }
              className={
                "mt-3 w-full rounded-lg px-3 py-2 text-sm font-semibold text-white " +
                (submitting ? "bg-gray-400" : "bg-[var(--blue)] hover:bg-[var(--blue-deep)]")
              }
            >
              {submitting ? "Saving…" : "Save OTP"}
            </button>
            <p className="mt-2 text-xs text-gray-500">
              Logging the OTP adds to your verified-completion badge on your
              public profile once the sale is confirmed.
            </p>
          </li>
        )}

        <StageRow
          n={3}
          label="Sale completed"
          done={hasCompletion}
          subline={
            completion?.completion_date
              ? `${new Date(completion.completion_date).toLocaleDateString()} · sale ${
                  completion.sale_price ? fmtPrice(completion.sale_price) : "—"
                }`
              : null
          }
          actionLabel={
            hasOtp && !hasCompletion ? "Log completion" : null
          }
          onAction={() =>
            setOpenStage(openStage === "completion" ? null : "completion")
          }
          isOpen={openStage === "completion"}
          locked={!hasOtp}
        />
        {openStage === "completion" && !hasCompletion && hasOtp && (
          <li className="rounded-lg border border-[var(--line)] bg-white p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold text-gray-700">
                  Completion date
                </span>
                <input
                  type="date"
                  value={completionDate}
                  onChange={(e) => setCompletionDate(e.target.value)}
                  max={today}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[var(--blue)] focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-gray-700">
                  Sale price (S$)
                </span>
                <input
                  value={salePrice}
                  onChange={(e) =>
                    setSalePrice(e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  inputMode="numeric"
                  placeholder="e.g. 680000"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[var(--blue)] focus:outline-none"
                />
              </label>
            </div>
            {error && (
              <p className="mt-2 text-xs text-red-700">{error}</p>
            )}
            <button
              type="button"
              disabled={submitting || !salePrice}
              onClick={() =>
                postStage({
                  stage: "completion",
                  completion_date: completionDate,
                  sale_price: Number(salePrice),
                })
              }
              className={
                "mt-3 w-full rounded-lg px-3 py-2 text-sm font-semibold text-white " +
                (submitting || !salePrice
                  ? "bg-gray-400"
                  : "bg-[var(--blue)] hover:bg-[var(--blue-deep)]")
              }
            >
              {submitting
                ? "Saving…"
                : "Log completed sale"}
            </button>
            <p className="mt-2 text-xs text-gray-500">
              Logging a completed sale adds it to your verified track record on
              your public profile. FairComparisons never takes a cut of the sale.
            </p>
          </li>
        )}
      </ol>
    </div>
  );
}

function StageRow({
  n,
  label,
  done,
  subline,
  actionLabel,
  onAction,
  isOpen,
  locked,
}: {
  n: number;
  label: string;
  done: boolean;
  subline: string | null;
  actionLabel: string | null;
  onAction: () => void;
  isOpen?: boolean;
  locked?: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span
          className={
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold " +
            (done
              ? "bg-[var(--blue)] text-white"
              : locked
                ? "bg-gray-200 text-gray-500"
                : "border border-[var(--blue)] bg-white text-[var(--blue-deep)]")
          }
        >
          {done ? "✓" : n}
        </span>
        <div>
          <p
            className={
              "text-sm font-medium " +
              (locked ? "text-gray-400" : "text-gray-900")
            }
          >
            {label}
          </p>
          {subline && (
            <p className="text-xs text-gray-500">{subline}</p>
          )}
        </div>
      </div>
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="rounded-lg border border-[var(--blue)] px-3 py-1 text-xs font-semibold text-[var(--blue-deep)] hover:bg-[var(--cloud)]"
        >
          {isOpen ? "Cancel" : actionLabel}
        </button>
      )}
    </li>
  );
}

function WithdrawButton({
  token,
  ceaRegistration,
  agentEmail,
  onWithdrawn,
}: {
  token: string;
  ceaRegistration: string;
  agentEmail: string;
  onWithdrawn: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function withdraw() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/sell/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          cea_registration: ceaRegistration,
          agent_email: agentEmail,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Could not withdraw.");
        setBusy(false);
        return;
      }
      setConfirming(false);
      setBusy(false);
      onWithdrawn();
    } catch {
      setError("Network error.");
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-[11px] font-medium text-gray-400 underline hover:text-red-600"
      >
        Withdraw quote
      </button>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={withdraw}
        disabled={busy}
        className="rounded bg-red-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-red-500 disabled:bg-gray-300"
      >
        {busy ? "…" : "Confirm"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-[11px] text-gray-500"
      >
        Cancel
      </button>
      {error && <span className="text-[11px] text-red-700">{error}</span>}
    </div>
  );
}

