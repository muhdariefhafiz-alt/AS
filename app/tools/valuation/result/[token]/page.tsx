import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { supabaseAdmin } from "../../../../lib/supabase";
import { hdbValuation, isValidHdbFlatType, type AvmRange } from "../../../../lib/avm";
import KeysDateForm from "./KeysDateForm";

// My Home: the persistent tracked-homeowner surface (board Option A v1).
// One unguessable token = one saved home. Shows a LIVE estimate with the
// delta since the owner saved it (the retention hook), confidence, real
// comps, and the MOP countdown, and exits into the rank-neutral shortlist.
// Everything is labelled an estimate, never a valuation.

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  return {
    title: "My Home · value tracker | FairComparisons",
    alternates: { canonical: `https://fair-comparisons.com/tools/valuation/result/${token}` },
    robots: { index: false, follow: true },
  };
}

function fmtSgd(n: number): string {
  return new Intl.NumberFormat("en-SG", { style: "currency", currency: "SGD", maximumFractionDigits: 0 }).format(n);
}
function tc(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// Whole months between two dates (a <= b), calendar-based.
function monthsBetween(a: Date, b: Date): number {
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
}

export default async function MyHomePage({ params }: Props) {
  const { token } = await params;
  if (!token || token.length < 8 || token.length > 64) notFound();

  const sb = supabaseAdmin();
  const { data: lead } = await sb
    .from("sg_leads")
    .select("token, property_type, town, district_code, est_value_low, est_value_high, source, flat_type, keys_date, created_at")
    .eq("token", token)
    .single();
  if (!lead || lead.source !== "avm") notFound();

  const isHdb = lead.property_type === "HDB" && Boolean(lead.town);
  const flat = isValidHdbFlatType(String(lead.flat_type ?? "")) ? (lead.flat_type as Parameters<typeof hdbValuation>[1]) : "4 ROOM";
  const area = isHdb ? String(lead.town) : String(lead.district_code ?? "");

  // Live re-estimate (never a stale shared link).
  let result: AvmRange | null = null;
  if (isHdb) result = await hdbValuation(String(lead.town), flat);

  const low = result?.low ?? Number(lead.est_value_low ?? 0);
  const high = result?.high ?? Number(lead.est_value_high ?? 0);
  const mid = result?.mid ?? Math.round((low + high) / 2);

  // Delta since saved: baseline is the estimate captured at save time.
  const baseMid = (Number(lead.est_value_low ?? 0) + Number(lead.est_value_high ?? 0)) / 2;
  const deltaPct = result && baseMid > 0 ? ((mid - baseMid) / baseMid) * 100 : null;
  const savedOn = lead.created_at ? new Date(lead.created_at) : null;

  // MOP countdown: 5 years from key collection.
  let mop: { state: "past" | "counting"; months: number; date: string } | null = null;
  if (isHdb && lead.keys_date) {
    const keys = new Date(String(lead.keys_date));
    const mopDate = new Date(Date.UTC(keys.getUTCFullYear() + 5, keys.getUTCMonth(), 1));
    const monthsLeft = monthsBetween(new Date(), mopDate);
    mop = {
      state: monthsLeft <= 0 ? "past" : "counting",
      months: Math.max(0, monthsLeft),
      date: mopDate.toLocaleDateString("en-SG", { month: "long", year: "numeric" }),
    };
  }

  const confidenceLabel =
    result?.confidence === "high" ? "High confidence" : result?.confidence === "medium" ? "Medium confidence" : "Low confidence";

  return (
    <>
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-[680px] px-5 py-10 md:px-8 md:py-12">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--blue-deep)]">My Home</p>
          <h1 className="mt-2 text-2xl font-extrabold text-gray-900">
            {isHdb ? `${flat.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())} HDB in ${tc(area)}` : `Private home in ${area}`}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Your saved home. We re-estimate it from official transaction records every time you open this page, and alert you when it moves more than 2%.
          </p>
        </div>
      </section>

      <section className="bg-gray-50 py-10">
        <div className="mx-auto max-w-[680px] space-y-6 px-5 md:px-8">
          {/* Value card */}
          <div className="rounded-2xl border border-[var(--line-2)] bg-gradient-to-br from-[var(--blue-wash)] to-white p-6 shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--blue-deep)]">Estimated value today</p>
              {result && <span className="text-xs text-gray-500">{confidenceLabel} · {result.comp_count} comparable sales · last {result.window_months} months</span>}
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <span className="text-3xl font-extrabold text-gray-900">{fmtSgd(low)}</span>
              <span className="pb-1 text-gray-400">to</span>
              <span className="text-3xl font-extrabold text-gray-900">{fmtSgd(high)}</span>
            </div>
            <p className="mt-1 text-sm text-gray-600">Most likely around <strong>{fmtSgd(mid)}</strong></p>

            {deltaPct != null && Math.abs(deltaPct) >= 0.5 && savedOn && (
              <p className={"mt-2 text-sm font-semibold " + (deltaPct >= 0 ? "text-emerald-700" : "text-red-700")}>
                {deltaPct >= 0 ? "Up" : "Down"} {Math.abs(deltaPct).toFixed(1)}% since you saved it in{" "}
                {savedOn.toLocaleDateString("en-SG", { month: "long", year: "numeric" })}
              </p>
            )}
            {deltaPct != null && Math.abs(deltaPct) < 0.5 && (
              <p className="mt-2 text-sm text-gray-500">Broadly unchanged since you saved it.</p>
            )}

            <p className="mt-3 text-xs text-gray-400">
              This is a data estimate from official records, not a valuation. Actual prices vary with floor, facing, renovation and timing.
            </p>

            <Link
              href={`/sell?utm_source=my_home${isHdb ? `&town=${encodeURIComponent(area)}` : ""}`}
              className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-[var(--blue)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--blue-deep)]"
            >
              Thinking of selling? Compare agents free
            </Link>
          </div>

          {/* MOP card */}
          {isHdb && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">MOP countdown</p>
              {mop ? (
                mop.state === "past" ? (
                  <div className="mt-2">
                    <p className="text-xl font-extrabold text-emerald-700">You are past your 5-year MOP</p>
                    <p className="mt-1 text-sm text-gray-600">
                      Your flat has been eligible to sell on the open market since {mop.date}. When you are ready,{" "}
                      <Link href={`/sell?town=${encodeURIComponent(area)}&utm_source=my_home_mop`} className="font-semibold text-[var(--blue)]">
                        compare the agents who actually sell in {tc(area)}
                      </Link>.
                    </p>
                  </div>
                ) : (
                  <div className="mt-2">
                    <p className="text-xl font-extrabold text-gray-900">
                      {mop.months} month{mop.months === 1 ? "" : "s"} until you can sell
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      Based on your key collection date, you reach your 5-year Minimum Occupation Period in <strong>{mop.date}</strong>.
                      {mop.months <= 6 ? " That is close: sellers usually start comparing agents about now." : " We will keep tracking your value until then."}
                    </p>
                  </div>
                )
              ) : (
                <div className="mt-2">
                  <KeysDateForm token={String(lead.token)} />
                </div>
              )}
            </div>
          )}

          {/* Comps card */}
          {result && result.recent.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Recent comparable sales</p>
              <ul className="mt-3 divide-y divide-gray-100">
                {result.recent.slice(0, 5).map((c, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{c.label}</p>
                      <p className="text-xs text-gray-500">{c.detail}</p>
                    </div>
                    <span className="whitespace-nowrap text-sm font-bold text-gray-900">{fmtSgd(c.price)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer actions */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/tools/valuation" className="inline-flex flex-1 items-center justify-center rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              Run a new estimate
            </Link>
            <Link href="/tools/stamp-duty-calculator" className="inline-flex flex-1 items-center justify-center rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              Selling costs calculator
            </Link>
          </div>
          <p className="text-center text-xs text-gray-400">
            Bookmark this page: it is your home&#39;s live tracker. Estimates from official HDB resale and URA records.
          </p>
        </div>
      </section>
    </>
  );
}
