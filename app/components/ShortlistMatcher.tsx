"use client";

import { useMemo, useState } from "react";

type AreaOption = { slug: string; label: string };

type ShortlistAgent = {
  slug: string; display_name: string; agency_name: string;
  score: number; claimed: boolean; recent_txns: number; last_txn: string;
};
type ShortlistResult = {
  areaName: string; areaShort: string;
  agents: ShortlistAgent[];
  summary: { active_agents: number; recent_txns: number };
};

type Props = {
  townAreas: AreaOption[];
  districtAreas: AreaOption[];
  initialType?: string;
  initialSide?: string;
  initialArea?: string;
};

const TYPES = [
  { typeSlug: "hdb", label: "HDB flat", areaType: "town" as const },
  { typeSlug: "condo", label: "Condo", areaType: "district" as const },
  { typeSlug: "ec", label: "Executive condo", areaType: "district" as const },
  { typeSlug: "landed", label: "Landed home", areaType: "district" as const },
];
const SIDES = [
  { slug: "sell", label: "sell" },
  { slug: "rent-out", label: "rent out" },
];

function track(event: string, campaign?: string) {
  try {
    const sid = (localStorage.getItem("fc_sid") || "").split(":")[0] || null;
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        path: "/property-agents/shortlist",
        event,
        session_id: sid,
        utm_campaign: campaign || null,
        referrer: typeof document !== "undefined" ? document.referrer || null : null,
      }),
    }).catch(() => {});
  } catch { /* tracking must never break the UX */ }
}

export default function ShortlistMatcher({ townAreas, districtAreas, initialType, initialSide, initialArea }: Props) {
  const [typeSlug, setTypeSlug] = useState(TYPES.some((t) => t.typeSlug === initialType) ? initialType! : "hdb");
  const [side, setSide] = useState(SIDES.some((s) => s.slug === initialSide) ? initialSide! : "sell");
  const [area, setArea] = useState(initialArea || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ShortlistResult | null>(null);
  const [err, setErr] = useState("");

  const areaType = useMemo(() => TYPES.find((t) => t.typeSlug === typeSlug)?.areaType ?? "town", [typeSlug]);
  const areas = areaType === "town" ? townAreas : districtAreas;
  const dealWord = side === "sell" ? "sale" : "rental";

  function onTypeChange(next: string) {
    const nextAreaType = TYPES.find((t) => t.typeSlug === next)?.areaType ?? "town";
    if (nextAreaType !== areaType) setArea(""); // area list changed, reset selection
    setTypeSlug(next);
    setResult(null);
  }

  async function search() {
    if (!area) { setErr("Please choose an area."); return; }
    const intent = `${side}-${typeSlug}`;
    setLoading(true); setErr(""); setResult(null);
    track("shortlist_search", `${intent}/${area}`);
    try {
      const r = await fetch("/api/shortlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent, area, limit: 8 }),
      });
      if (!r.ok) {
        setErr(r.status === 404 ? "We don't have enough transaction data for that exact combination yet. Try another area or type." : "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      setResult((await r.json()) as ShortlistResult);
      track("shortlist_result", `${intent}/${area}`);
    } catch {
      setErr("Something went wrong. Please try again.");
    }
    setLoading(false);
  }

  function requestShortlist() {
    const intent = `${side}-${typeSlug}`;
    track("shortlist_request", `${intent}/${area}`);
    const qs = new URLSearchParams({
      utm_source: "shortlist", utm_medium: "matcher",
      type: typeSlug, side, area,
    }).toString();
    window.location.href = `/sell?${qs}`;
  }

  const selectCls = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-[var(--blue)] focus:outline-none focus:ring-1 focus:ring-[var(--blue)]";

  return (
    <div>
      {/* Controls */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">I want to</span>
            <select className={selectCls} value={side} onChange={(e) => { setSide(e.target.value); setResult(null); }}>
              {SIDES.map((s) => <option key={s.slug} value={s.slug}>{s.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">a</span>
            <select className={selectCls} value={typeSlug} onChange={(e) => onTypeChange(e.target.value)}>
              {TYPES.map((t) => <option key={t.typeSlug} value={t.typeSlug}>{t.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">in</span>
            <select className={selectCls} value={area} onChange={(e) => { setArea(e.target.value); setResult(null); }}>
              <option value="">Choose {areaType === "town" ? "town" : "district"}...</option>
              {areas.map((a) => <option key={a.slug} value={a.slug}>{a.label}</option>)}
            </select>
          </label>
        </div>
        <button
          onClick={search}
          disabled={loading}
          className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-[var(--blue)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--blue-deep)] disabled:opacity-60 sm:w-auto"
        >
          {loading ? "Finding agents..." : "Show me the agents"}
        </button>
        {err && <p className="mt-3 text-sm text-amber-700">{err}</p>}
        <p className="mt-3 text-xs text-gray-400">No sign-up needed. See the agents first, decide later.</p>
      </div>

      {/* Results (no wall) */}
      {result && result.agents.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-gray-900">
            Agents who actually {side === "sell" ? "sold" : "rented out"} {result.agents.length > 1 ? "the most " : ""}here
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {result.summary.active_agents.toLocaleString()} agents closed {result.summary.recent_txns.toLocaleString()} such {dealWord}s in {result.areaName} over the last 3 years. Top {result.agents.length}, ranked on their real record.
          </p>

          <div className="mt-5 space-y-3 fc-pop-in">
            {result.agents.map((a, i) => (
              <a
                key={a.slug || i}
                href={`/property-agents/agent/${a.slug}`}
                onClick={() => track("shortlist_agent_click", a.slug)}
                className="fc-reveal group flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 transition hover:border-[var(--line-2)] hover:shadow-sm"
                style={{ ["--reveal-delay" as string]: `${Math.min(i * 0.05, 0.4)}s` }}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                  i === 0 ? "bg-amber-500" : i === 1 ? "bg-gray-400" : i === 2 ? "bg-amber-700" : "bg-[var(--blue)]"
                }`}>{i + 1}</div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 group-hover:text-[var(--blue)]">{a.display_name}</p>
                  <p className="truncate text-xs text-gray-500">
                    {a.agency_name}
                    {a.claimed && <span className="ml-1.5 rounded bg-[var(--blue-wash)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--blue)]">Claimed</span>}
                  </p>
                </div>
                <div className="hidden shrink-0 text-right sm:block">
                  <p className="text-sm font-bold text-gray-900">{a.recent_txns}</p>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400">recent {dealWord}s here</p>
                </div>
                {a.score > 0 && (
                  <div className="flex shrink-0 flex-col items-center rounded-lg border border-[var(--line)] bg-[var(--blue-wash)] px-3 py-1.5">
                    <span className="text-lg font-extrabold text-[var(--blue)]">{a.score}</span>
                    <span className="text-[8px] uppercase tracking-widest text-gray-400">Score</span>
                  </div>
                )}
              </a>
            ))}
          </div>

          {/* Request handoff into the compliant /sell funnel */}
          <div className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--blue-wash)] p-5">
            <p className="text-sm font-semibold text-gray-900">Want us to introduce you to a few of them?</p>
            <p className="mt-1 text-sm text-gray-600">Send one request and the best-matched agents reach out to you. Free, no obligation, and you choose who to reply to.</p>
            <button onClick={requestShortlist} className="mt-3 inline-flex items-center rounded-lg bg-[var(--blue)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--blue-deep)]">
              Request my shortlist
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
