import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { supabaseAdmin } from "../../../../lib/supabase";
import { hdbValuation } from "../../../../lib/avm";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  return {
    title: "Your home value estimate · FairComparisons",
    alternates: {
      canonical: `https://fair-comparisons.com/tools/valuation/result/${token}`,
    },
    robots: { index: false, follow: true },
  };
}

function fmtSgd(n: number): string {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function ValuationResultPage({ params }: Props) {
  const { token } = await params;
  if (!token || token.length < 8 || token.length > 64) notFound();

  const sb = supabaseAdmin();
  const { data: lead } = await sb
    .from("sg_leads")
    .select("token, property_type, town, district_code, est_value_low, est_value_high, source")
    .eq("token", token)
    .single();
  if (!lead || lead.source !== "avm") notFound();

  // Re-estimate fresh so a shared link is never stale.
  let result = null;
  let area = "";
  if (lead.property_type === "HDB" && lead.town) {
    result = await hdbValuation(lead.town, "4 ROOM");
    area = lead.town;
  } else if (lead.district_code) {
    // We don't store the project slug; fall back to the captured band.
    area = lead.district_code;
  }

  const low = result?.low ?? Number(lead.est_value_low ?? 0);
  const high = result?.high ?? Number(lead.est_value_high ?? 0);
  const mid = result?.mid ?? Math.round((low + high) / 2);

  return (
    <>
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-[640px] px-5 py-10 md:px-8 md:py-12">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--blue-deep)]">
            Saved valuation
          </p>
          <h1 className="mt-2 text-2xl font-extrabold text-gray-900">
            {lead.property_type === "HDB" ? "HDB" : "Private"} in {area}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            We&apos;ll alert you when this estimate moves more than 2%.
          </p>
        </div>
      </section>

      <section className="bg-gray-50 py-10">
        <div className="mx-auto max-w-[640px] px-5 md:px-8">
          <div className="rounded-2xl border border-[var(--line-2)] bg-gradient-to-br from-[var(--blue-wash)] to-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--blue-deep)]">
              Estimated value range
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <span className="text-3xl font-extrabold text-gray-900">
                {fmtSgd(low)}
              </span>
              <span className="pb-1 text-gray-400">to</span>
              <span className="text-3xl font-extrabold text-gray-900">
                {fmtSgd(high)}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-600">
              Most likely around <strong>{fmtSgd(mid)}</strong>
            </p>
            <Link
              href={`/sell?utm_source=avm_share&town=${encodeURIComponent(area)}`}
              className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-[var(--blue)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--blue-deep)]"
            >
              Compare agents free
            </Link>
            <Link
              href="/tools/valuation"
              className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Run a new valuation
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
