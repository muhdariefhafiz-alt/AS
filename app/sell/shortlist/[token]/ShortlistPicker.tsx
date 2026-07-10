"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AgentFlags from "../../../components/AgentFlags";

export type ShortlistRow = {
  shortlist_id: number;
  agent_id: number;
  agent_name: string;
  agent_slug: string | null;
  agency_name: string;
  score: number;
  rank: number;
  total_txns: number;
  area_txns: number;
  area_focus_pct: number;
  area_property_types: string | null;
  primary_area: string | null;
  google_rating: number | null;
  google_review_count: number | null;
  photo_url: string | null;
  claimed: boolean;
  agent_flags?: { t: string; pct?: number }[] | null;
  invite_status: string;
  // Whether FairComparisons has a live channel (verified email, or WhatsApp
  // once provisioned) to actually deliver an invite to this agent. Unreachable
  // agents stay visible with their full record but cannot be invited, so the
  // seller is never told we contacted someone we could not.
  reachable: boolean;
};

type Props = {
  token: string;
  rows: ShortlistRow[];
  propertyType: string;
  area: string;
  alreadyInvited: boolean;
};

const TYPE_LABEL: Record<string, string> = {
  HDB: "HDB",
  CONDOMINIUM_APARTMENTS: "Condo",
  EXECUTIVE_CONDOMINIUM: "EC",
  LANDED_PROPERTIES: "Landed",
};

function propTypeChips(area_property_types: string | null): string[] {
  if (!area_property_types) return [];
  return area_property_types
    .split(",")
    .map((s) => TYPE_LABEL[s.trim().toUpperCase()] ?? s.trim())
    .filter(Boolean)
    .slice(0, 3);
}

export default function ShortlistPicker({
  token,
  rows,
  propertyType,
  area,
  alreadyInvited,
}: Props) {
  const router = useRouter();
  // Pre-select the agent the seller explicitly requested from their profile.
  const [picked, setPicked] = useState<Set<number>>(
    () =>
      new Set(
        rows
          .filter((r) => r.invite_status === "requested" && r.reachable)
          .map((r) => r.agent_id)
      )
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const max = 3;
  const canSubmit = picked.size > 0 && picked.size <= max && !alreadyInvited;

  function toggle(id: number) {
    if (alreadyInvited) return;
    // Never let an unreachable agent into the pick set: we have no channel to
    // deliver the invite, so accepting the pick would mean lying to the seller.
    const row = rows.find((r) => r.agent_id === id);
    if (row && !row.reachable) return;
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < max) next.add(id);
      return next;
    });
  }

  async function submit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/sell/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, agent_ids: Array.from(picked) }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Could not send invites.");
        setSubmitting(false);
        return;
      }
      router.push(`/sell/quotes/${token}?sent=${picked.size}`);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-6 rounded-xl border border-[var(--line)] bg-[var(--blue-wash)] p-4 text-sm text-[var(--ink)]">
        <strong className="font-semibold">
          {rows.length} agents matched for {propertyType} in {area}.
        </strong>{" "}
        Pick up to {max} to invite. They&apos;ll submit a fee quote within 24
        hours. You can still walk away after seeing their quotes.
      </div>

      <ul className="space-y-3">
        {rows.map((a) => {
          const isPicked = picked.has(a.agent_id);
          const isInvited = a.invite_status === "invited";
          const isRequested = a.invite_status === "requested";
          const types = propTypeChips(a.area_property_types);
          return (
            <li
              key={a.agent_id}
              className={
                "rounded-2xl border p-4 transition md:p-5 " +
                (isPicked
                  ? "border-[var(--blue)] bg-[var(--blue-wash)] shadow-md"
                  : isInvited
                    ? "border-amber-300 bg-amber-50"
                    : "border-gray-200 bg-white hover:border-gray-300")
              }
            >
              <div className="flex flex-wrap items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--blue)] text-base font-bold text-white">
                  {a.agent_name.slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <h3 className="text-lg font-bold text-gray-900">
                      {a.agent_name}
                    </h3>
                    {isRequested && (
                      <span className="inline-flex items-center rounded-full bg-[var(--blue)] px-2.5 py-0.5 text-[11px] font-semibold text-white">
                        You requested this agent
                      </span>
                    )}
                    {a.agent_slug && (
                      <Link
                        href={`/property-agents/agent/${a.agent_slug}`}
                        target="_blank"
                        className="text-xs font-medium text-[var(--blue)] hover:underline"
                      >
                        View profile {"↗"}
                      </Link>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-gray-600">
                    {a.agency_name}
                  </p>
                  {a.agent_flags && a.agent_flags.length > 0 && (
                    <div className="mt-2">
                      <AgentFlags flags={a.agent_flags} size="sm" max={3} />
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-700">
                    <span>
                      <strong className="font-bold text-gray-900">
                        {Math.round(a.score)}
                      </strong>
                      <span className="text-gray-500"> AgentScore</span>
                    </span>
                    {isRequested && a.area_txns === 0 ? (
                      <span>
                        <strong className="font-bold text-gray-900">
                          {a.total_txns}
                        </strong>
                        <span className="text-gray-500"> deals (lifetime)</span>
                      </span>
                    ) : (
                      <span>
                        <strong className="font-bold text-gray-900">
                          {a.area_txns}
                        </strong>
                        <span className="text-gray-500">
                          {" "}
                          deals in {area}
                        </span>
                      </span>
                    )}
                    {(!isRequested || a.area_txns > 0) && (
                      <span>
                        <strong className="font-bold text-gray-900">
                          {a.area_focus_pct}%
                        </strong>
                        <span className="text-gray-500"> area focus</span>
                      </span>
                    )}
                    {a.google_rating !== null &&
                      a.google_rating !== undefined && (
                        <span>
                          <strong className="font-bold text-gray-900">
                            {a.google_rating?.toFixed(1)}
                          </strong>
                          <span className="text-gray-500">
                            {" "}
                            Google ({a.google_review_count ?? 0})
                          </span>
                        </span>
                      )}
                  </div>

                  {types.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {types.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="shrink-0 text-right">
                  {isInvited ? (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                      Invited
                    </span>
                  ) : !a.reachable ? (
                    // Honest: we have no channel to deliver an invite to this
                    // agent, so they cannot be picked. Record stays visible.
                    <span
                      className="inline-flex max-w-[140px] items-center rounded-full bg-gray-100 px-3 py-1 text-center text-xs font-medium text-gray-500"
                      title="This agent has no verified contact details on FairComparisons yet, so we cannot send them your request."
                    >
                      No verified contact details yet
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggle(a.agent_id)}
                      disabled={alreadyInvited}
                      className={
                        "rounded-lg px-4 py-2 text-sm font-semibold transition " +
                        (isPicked
                          ? "bg-[var(--blue)] text-white"
                          : "border border-gray-200 bg-white text-gray-700 hover:border-[var(--line-2)]")
                      }
                    >
                      {isPicked ? "Picked" : "Pick"}
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {!alreadyInvited && (
        <div className="sticky bottom-4 z-10 mt-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-lg md:flex md:items-center md:justify-between md:gap-4">
            <div className="text-sm text-gray-700">
              {picked.size === 0
                ? `Pick up to ${max} agents to invite for quotes.`
                : `${picked.size} of ${max} picked.`}
            </div>
            {error && (
              <div className="mt-2 text-sm text-red-700 md:mt-0">{error}</div>
            )}
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit || submitting}
              className={
                "mt-3 w-full rounded-lg px-5 py-3 text-sm font-semibold text-white shadow transition md:mt-0 md:w-auto " +
                (!canSubmit || submitting
                  ? "bg-gray-300"
                  : "bg-[var(--blue)] hover:bg-[var(--blue-deep)]")
              }
            >
              {submitting
                ? "Sending invites…"
                : `Invite ${picked.size} agent${picked.size === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
