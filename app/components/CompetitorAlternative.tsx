import Link from "next/link";
import type { CompetitorData } from "../lib/competitors";

type Stats = { scored: number; total: number; agencies: number };

// Shared, verified "X alternative for agents" comparison page. Factual and
// non-disparaging by construction: the data comes from the researched +
// adversarially-verified COMPETITORS table. Mirrors the PropertyGuru /
// PropKaki alternative pages (Tailwind + CSS vars), with FAQ + Breadcrumb JSON-LD.
export default function CompetitorAlternative({ data, stats }: { data: CompetitorData; stats: Stats }) {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: data.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://fair-comparisons.com" },
      { "@type": "ListItem", position: 2, name: "For Agents", item: "https://fair-comparisons.com/for-agents" },
      { "@type": "ListItem", position: 3, name: `${data.name} alternative`, item: `https://fair-comparisons.com/for-agents/${data.slug}-alternative` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd).replace(/</g, "\\u003c") }} />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mx-auto max-w-[1120px] px-5 pt-6 md:px-8">
        <ol className="flex flex-wrap gap-2 text-xs text-gray-400">
          <li><Link href="/" className="hover:text-gray-600">Home</Link></li>
          <li>/</li>
          <li><Link href="/for-agents" className="hover:text-gray-600">For Agents</Link></li>
          <li>/</li>
          <li className="text-gray-600">{data.name} Alternative</li>
        </ol>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-[var(--ink)] via-[var(--ink-2)] to-[var(--ink)] mt-4">
        <div className="mx-auto max-w-[900px] px-5 py-16 text-center md:px-8 md:py-24">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--slate-2)]">For Property Agents</p>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight text-white md:text-5xl">
            {data.heroHeadline}
            <br />
            <span className="text-[var(--slate-2)]">{data.heroAccent}</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/60">{data.heroSub}</p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/search" className="inline-block rounded-lg bg-[var(--blue)] px-8 py-4 font-semibold text-white shadow-lg transition hover:bg-[var(--blue-deep)]">
              Find your profile
            </Link>
            <Link href="/for-agents" className="inline-block rounded-lg border border-white/20 px-8 py-4 font-semibold text-white transition hover:bg-white/10">
              See how it works
            </Link>
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="mx-auto max-w-[1120px] px-5 py-14 md:px-8">
        <h2 className="text-center text-2xl font-bold text-gray-900">{data.name} vs FairComparisons</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm text-gray-500">
          An honest, side-by-side look. {data.name} details are as published on {data.url.replace(/^https?:\/\/(www\.)?/, "")} and verified on {data.verifiedOn}. FairComparisons pricing is current as of today.
        </p>
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left font-semibold text-gray-900"></th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">{data.name}</th>
                <th className="px-4 py-3 text-left font-semibold text-[var(--blue)]">FairComparisons</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.compareRows.map((row) => (
                <tr key={row.label}>
                  <td className="px-4 py-3 font-medium text-gray-900">{row.label}</td>
                  <td className="px-4 py-3 text-gray-500">{row.them}</td>
                  <td className="px-4 py-3 text-gray-700">{row.us}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Differentiators */}
      <section className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-[1120px] px-5 py-14 md:px-8">
          <h2 className="text-center text-2xl font-bold text-gray-900">Different model, different value</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {data.differentiators.map((item, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-6">
                <p className="text-sm text-gray-400">{item.them}</p>
                <p className="mt-1 text-base font-bold text-[var(--blue)]">{item.us}</p>
                <p className="mt-3 text-sm text-gray-500">{item.detail}</p>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-xl text-center text-sm text-gray-500">{data.bothNote}</p>
        </div>
      </section>

      {/* Live stats */}
      <section className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-[900px] px-5 py-14 text-center md:px-8">
          <h2 className="text-2xl font-bold text-gray-900">Already live on FairComparisons</h2>
          <div className="mt-8 flex justify-center gap-10">
            <div className="text-center">
              <span className="text-3xl font-extrabold text-[var(--blue)]">{stats.total.toLocaleString()}</span>
              <p className="mt-1 text-xs text-gray-400">agents profiled</p>
            </div>
            <div className="text-center">
              <span className="text-3xl font-extrabold text-[var(--blue)]">{stats.scored.toLocaleString()}</span>
              <p className="mt-1 text-xs text-gray-400">agents scored</p>
            </div>
            <div className="text-center">
              <span className="text-3xl font-extrabold text-[var(--blue)]">{stats.agencies.toLocaleString()}</span>
              <p className="mt-1 text-xs text-gray-400">agencies</p>
            </div>
          </div>
          <p className="mt-6 text-sm text-gray-500">Data sourced from CEA, URA and HDB public records. Updated regularly.</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-[1120px] px-5 py-14 md:px-8">
        <h2 className="text-center text-2xl font-bold text-gray-900">Frequently asked questions</h2>
        <div className="mx-auto mt-8 max-w-[720px] divide-y divide-gray-200">
          {data.faq.map((item, i) => (
            <details key={i} className="group py-4">
              <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-gray-900">
                {item.q}
                <span className="ml-4 text-gray-400 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-gray-500">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-gray-100 bg-gradient-to-br from-[var(--ink)] via-[var(--ink-2)] to-[var(--ink)]">
        <div className="mx-auto max-w-[600px] px-5 py-16 text-center md:px-8">
          <h2 className="text-2xl font-bold text-white">Your profile is already live. Claim it for free.</h2>
          <p className="mt-3 text-white/60">No credit card. No listing fees. Just your track record, working for you.</p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/search" className="inline-block rounded-lg bg-[var(--blue)] px-8 py-4 font-semibold text-white shadow-lg transition hover:bg-[var(--blue-deep)]">
              Find your profile
            </Link>
            <Link href="/for-agents" className="inline-block rounded-lg border border-white/20 px-8 py-4 font-semibold text-white transition hover:bg-white/10">
              See how it works
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
