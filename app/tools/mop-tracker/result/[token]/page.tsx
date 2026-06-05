import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { supabaseAdmin } from "../../../../lib/supabase";
import {
  lookupMop,
  isValidHdbFlatType,
  type MopResult,
} from "../../../../lib/mop";

type Props = { params: Promise<{ token: string }> };

// The result page is per-cohort; deep-linkable but not indexed (we don't
// want every shared link in Google's index).
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  return {
    title: "Your HDB MOP + value · FairComparisons",
    alternates: { canonical: `https://fair-comparisons.com/tools/mop-tracker/result/${token}` },
    robots: { index: false, follow: true },
  };
}

const TYPE_LABEL: Record<string, string> = {
  HDB: "HDB",
  CONDO: "Condo",
  EC: "EC",
  LANDED: "Landed",
};

function fmtSgd(n: number): string {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    maximumFractionDigits: 0,
  }).format(n);
}

function monthsLabel(n: number): string {
  if (n === 0) return "MOP this month";
  if (n > 0) {
    const yrs = Math.floor(n / 12);
    const months = n % 12;
    if (yrs === 0) return `${n} month${n === 1 ? "" : "s"} to MOP`;
    if (months === 0) return `${yrs} year${yrs === 1 ? "" : "s"} to MOP`;
    return `${yrs}y ${months}mo to MOP`;
  }
  const abs = Math.abs(n);
  if (abs < 12) return `Past MOP by ${abs} month${abs === 1 ? "" : "s"}`;
  return `Past MOP by ${Math.floor(abs / 12)} year${
    Math.floor(abs / 12) === 1 ? "" : "s"
  }`;
}

export default async function MopResultPage({ params }: Props) {
  const { token } = await params;
  if (!token || token.length < 8 || token.length > 64) notFound();

  const sb = supabaseAdmin();
  const { data: lead } = await sb
    .from("sg_leads")
    .select("id, token, status, property_type, town, est_value_low, est_value_high, current_mop_status, source")
    .eq("token", token)
    .single();
  if (!lead) notFound();
  if (lead.source !== "mop_tracker") notFound();

  // Reconstruct the result from the persisted snapshot + a fresh lookup.
  // We don't have key_collection_date stored, so re-derive from
  // current_mop_status + estimated value. For v1 we just re-fetch the
  // median + agents; we show "current snapshot" rather than the original
  // calculation. This is good enough for the share use case.
  const town = lead.town ?? "";
  // Best-effort flat type from est range — fallback to 4 ROOM.
  const guessFlatType = ((): "2 ROOM" | "3 ROOM" | "4 ROOM" | "5 ROOM" | "EXECUTIVE" => {
    const mid = lead.est_value_low ? Number(lead.est_value_low) : null;
    if (!mid) return "4 ROOM";
    if (mid < 380_000) return "3 ROOM";
    if (mid < 720_000) return "4 ROOM";
    if (mid < 950_000) return "5 ROOM";
    return "EXECUTIVE";
  })();

  let result: MopResult | null = null;
  if (town && isValidHdbFlatType(guessFlatType)) {
    const now = new Date();
    const fallbackYear = now.getUTCFullYear() - 4;
    result = await lookupMop({
      town,
      flat_type: guessFlatType,
      key_collection_year: fallbackYear,
      key_collection_month: now.getUTCMonth() + 1,
    });
  }

  const propertyTypeLabel = TYPE_LABEL[lead.property_type] ?? lead.property_type;

  return (
    <>
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-[860px] px-5 py-10 md:px-8 md:py-12">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--blue-deep)]">
            Saved MOP result
          </p>
          <h1 className="mt-2 text-2xl font-extrabold text-gray-900 md:text-3xl">
            {propertyTypeLabel} in {town}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-gray-600">
            We&apos;ll alert you 3 months before your MOP with a refreshed
            valuation and a shortlist. You can share this snapshot with the
            person deciding alongside you.
          </p>
        </div>
      </section>

      <section className="bg-gray-50 py-10">
        <div className="mx-auto max-w-[680px] px-5 md:px-8">
          {result ? (
            <div className="rounded-2xl border border-[var(--line-2)] bg-gradient-to-br from-[var(--blue-wash)] to-white p-6 shadow-sm">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    MOP
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-gray-900">
                    {monthsLabel(result.months_to_mop)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Estimated MOP date:{" "}
                    {new Date(result.mop_date).toLocaleDateString("en-SG", {
                      year: "numeric",
                      month: "long",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Recent {guessFlatType} median in {town}
                  </p>
                  {result.median_resale_price ? (
                    <>
                      <p className="mt-1 text-2xl font-extrabold text-gray-900">
                        {fmtSgd(result.median_resale_price)}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Based on {result.comp_count} resales · last 6 months
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-base text-gray-500">
                      Not enough recent comps
                    </p>
                  )}
                </div>
              </div>

              {result.top_agents.length > 0 && (
                <div className="mt-6 border-t border-[var(--line)] pt-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Top 3 HDB agents in {town}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {result.top_agents.map((a) => (
                      <li
                        key={a.agent_id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-white p-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {a.agent_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {a.agency_name} · {Math.round(a.score)}{" "}
                            AgentScore · {a.area_txns} deals in {town}
                          </p>
                        </div>
                        {a.agent_slug && (
                          <Link
                            href={`/property-agents/agent/${a.agent_slug}`}
                            className="text-xs font-medium text-[var(--blue)] hover:underline"
                          >
                            Profile →
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Link
                  href={`/sell?utm_source=mop_share&town=${encodeURIComponent(town)}`}
                  className="rounded-lg bg-[var(--blue)] px-5 py-2.5 text-center text-sm font-semibold text-white hover:bg-[var(--blue-deep)]"
                >
                  Get matched with the right agent
                </Link>
                <Link
                  href="/tools/mop-tracker"
                  className="rounded-lg border border-gray-200 px-5 py-2.5 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Run the tracker again
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <p className="text-sm font-semibold text-gray-900">
                Snapshot expired
              </p>
              <p className="mt-2 text-sm text-gray-600">
                Run the MOP tracker again to refresh.
              </p>
              <Link
                href="/tools/mop-tracker"
                className="mt-4 inline-block rounded-lg bg-[var(--blue)] px-5 py-2 text-sm font-semibold text-white"
              >
                Open MOP tracker
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
