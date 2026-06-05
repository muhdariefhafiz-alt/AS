import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Condo vs HDB as an Investment in Singapore (2026 Guide)",
  description: "Should you invest in a condo or HDB in Singapore? Key differences: ABSD rules, rental yield, capital appreciation, MOP restrictions, and ownership limits. A factual comparison for property investors.",
  alternates: { canonical: "https://fair-comparisons.com/guides/condo-vs-hdb-investment" },
};

const comparisonItems = [
  {
    factor: "Ownership Eligibility",
    hdb: "Singapore Citizens and Permanent Residents only. PRs can only buy resale HDB, not BTO. Foreigners cannot buy HDB.",
    condo: "Open to all nationalities. Singapore Citizens, PRs, and foreigners can purchase private condos, subject to ABSD.",
  },
  {
    factor: "Additional Buyer's Stamp Duty (ABSD)",
    hdb: "No ABSD on first HDB flat. If you own an HDB flat and buy a second property (private), you pay ABSD on the second property. You cannot own two HDB flats simultaneously.",
    condo: "Singapore Citizens: 0% on first property, 20% on second, 30% on third and subsequent. PRs: 5% on first, 30% on second and subsequent. Foreigners: 60% on any purchase.",
  },
  {
    factor: "Minimum Occupation Period (MOP)",
    hdb: "5 years from key collection. You cannot sell or rent out the entire flat before MOP is fulfilled. After MOP, you can sell on the open market or rent out the entire flat with HDB approval.",
    condo: "No MOP for resale condos. New launch condos from developers have no MOP either, but Seller's Stamp Duty (SSD) applies if sold within 3 years of purchase.",
  },
  {
    factor: "Rental Yield",
    hdb: "Generally lower gross yields (2% to 3%) because of the lower purchase price relative to rental rates. Renting out the entire flat requires HDB approval and is only allowed after MOP. Room rental is permitted during MOP with conditions.",
    condo: "Gross yields typically range from 2.5% to 4% depending on location and unit size. No approval needed to rent out. Studio and smaller units tend to have higher yields. Maintenance fees reduce net yield.",
  },
  {
    factor: "Capital Appreciation",
    hdb: "HDB prices are influenced by government policies, including BTO supply, cooling measures, and ethnic integration quotas. Newer flats with long remaining leases can appreciate, but appreciation slows as the lease ages. Lease decay is a real factor for older HDB flats.",
    condo: "Driven by location, supply/demand, and broader economic conditions. Freehold condos avoid lease decay concerns. New launches in transforming areas (e.g. near new MRT lines) can see significant appreciation. But over-supply in certain districts can suppress prices.",
  },
  {
    factor: "Lease Duration",
    hdb: "99-year leasehold only. No extension possible. After 99 years, the flat reverts to HDB. Lease decay becomes a pricing concern for flats older than 40 to 50 years.",
    condo: "Available as 99-year leasehold or freehold (including 999-year). Freehold avoids lease decay entirely. For leasehold condos, the en bloc (collective sale) mechanism provides a potential exit before lease decay significantly impacts value.",
  },
  {
    factor: "Financing",
    hdb: "Can use HDB concessionary loan (up to 80% LTV, 2.6% interest rate pegged to CPF OA rate + 0.1%) or bank loan (up to 75% LTV). Full CPF OA can be used for purchase.",
    condo: "Bank loan only (up to 75% LTV for first property, 45% for second with existing loan). CPF usage is subject to the Valuation Limit (for leasehold) or no limit (for freehold). Cash outlay is typically higher.",
  },
];

const faqItems = [
  {
    q: "Can I buy a condo if I already own an HDB flat?",
    a: "Yes, but only after your HDB flat has fulfilled its 5-year MOP. You will also need to pay ABSD on the condo purchase (20% for Singapore Citizens buying a second property, 30% for PRs). Some buyers sell their HDB first to avoid ABSD, then buy the condo as their first and only property.",
  },
  {
    q: "Is HDB a good investment in Singapore?",
    a: "HDB flats are primarily homes, not investment vehicles. The government actively manages HDB pricing through supply (BTO launches), grants, and cooling measures. While some HDB flats in desirable locations have appreciated significantly (including million-dollar HDB transactions), HDB is generally not considered an investment asset in the same way private property is. The 99-year lease, rental restrictions during MOP, and policy sensitivity make HDB more suitable as an affordable home than a pure investment.",
  },
  {
    q: "What is the ABSD rate for buying a second property in Singapore?",
    a: "For Singapore Citizens, the ABSD rate on a second residential property is 20% of the purchase price. For Permanent Residents, it is 30% on a second property. Foreigners pay 60% on any residential property purchase. These rates were set in the April 2023 cooling measures and are current as of 2026.",
  },
  {
    q: "Can foreigners buy HDB flats in Singapore?",
    a: "No. HDB flats are restricted to Singapore Citizens and Permanent Residents. PRs can only buy resale HDB flats (not BTO), and at least one buyer must be a PR. Foreigners cannot purchase any HDB flat.",
  },
  {
    q: "What is lease decay and why does it matter?",
    a: "Lease decay refers to the declining value of a leasehold property as the remaining lease shortens. For 99-year HDB flats, the impact becomes noticeable after about 40 to 50 years. Banks become reluctant to finance units with short remaining leases, and CPF usage becomes restricted. The government has stated that HDB flats will not be automatically renewed and that SERS (Selective En Bloc Redevelopment Scheme) applies to only a small percentage of HDB estates.",
  },
];

export default function CondoVsHdbInvestmentPage() {
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://fair-comparisons.com" },
        { "@type": "ListItem", position: 2, name: "Guides", item: "https://fair-comparisons.com/guides" },
        { "@type": "ListItem", position: 3, name: "Condo vs HDB Investment", item: "https://fair-comparisons.com/guides/condo-vs-hdb-investment" },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqItems.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas).replace(/</g, "\\u003c") }} />

      <nav className="border-b border-gray-100">
        <div className="mx-auto max-w-[1120px] px-5 py-2.5 text-xs text-gray-400 md:px-8">
          <Link href="/" className="hover:text-gray-600">Home</Link>
          <span className="mx-1.5">/</span>
          <Link href="/guides" className="hover:text-gray-600">Guides</Link>
          <span className="mx-1.5">/</span>
          <span className="text-gray-600">Condo vs HDB Investment</span>
        </div>
      </nav>

      <section className="border-b border-gray-100 bg-gradient-to-b from-[var(--blue-wash)] to-white">
        <div className="mx-auto max-w-[1120px] px-5 pb-10 pt-8 md:px-8">
          <span className="inline-block rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Investment</span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">Condo vs HDB as an Investment in Singapore</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-gray-500">
            A factual comparison of condos and HDB flats as investment properties. Covers ABSD, rental yield, capital appreciation, MOP restrictions, lease decay, and financing differences.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1120px] px-5 py-10 md:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          <article className="space-y-10">

            {/* Context */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">Context: Singapore Property as Investment</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                <p>
                  Property is the largest asset class for most Singaporean households. The government actively manages the property market through cooling measures, stamp duties, and supply-side interventions. This means that property investment in Singapore is fundamentally shaped by policy, not just market forces.
                </p>
                <p>
                  The most important policy tool is the Additional Buyer&apos;s Stamp Duty (ABSD), which adds significant upfront costs to second and subsequent property purchases. For Singapore Citizens, buying a second property incurs 20% ABSD on the purchase price. This single factor shapes most investment decisions about whether to hold one property or two.
                </p>
                <p>
                  Below is a systematic comparison of HDB and condo as investment vehicles, covering the factors that materially affect returns.
                </p>
              </div>
            </section>

            {/* Comparison Table */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">Side-by-Side Comparison</h2>
              <div className="mt-4 space-y-4">
                {comparisonItems.map((item) => (
                  <div key={item.factor} className="rounded-xl border border-gray-100 bg-white shadow-sm">
                    <div className="border-b border-gray-100 px-5 py-3">
                      <h3 className="text-[15px] font-bold text-gray-900">{item.factor}</h3>
                    </div>
                    <div className="grid gap-0 md:grid-cols-2">
                      <div className="border-b border-gray-100 p-5 md:border-b-0 md:border-r">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-600">HDB</p>
                        <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.hdb}</p>
                      </div>
                      <div className="p-5">
                        <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Condo</p>
                        <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.condo}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ABSD Deep Dive */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">ABSD: The Biggest Cost Factor</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                <p>
                  The Additional Buyer&apos;s Stamp Duty is the single largest barrier to property investment in Singapore. The current ABSD rates (effective from April 2023) are:
                </p>
                <div className="overflow-x-auto">
                  <table className="mt-2 w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left">
                        <th className="pb-2 pr-4 font-semibold text-gray-900">Buyer Profile</th>
                        <th className="pb-2 pr-4 font-semibold text-gray-900">1st Property</th>
                        <th className="pb-2 pr-4 font-semibold text-gray-900">2nd Property</th>
                        <th className="pb-2 font-semibold text-gray-900">3rd+</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-600">
                      <tr className="border-b border-gray-100">
                        <td className="py-2 pr-4 font-medium">Singapore Citizen</td>
                        <td className="py-2 pr-4">0%</td>
                        <td className="py-2 pr-4">20%</td>
                        <td className="py-2">30%</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 pr-4 font-medium">Permanent Resident</td>
                        <td className="py-2 pr-4">5%</td>
                        <td className="py-2 pr-4">30%</td>
                        <td className="py-2">35%</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 font-medium">Foreigner</td>
                        <td className="py-2 pr-4">60%</td>
                        <td className="py-2 pr-4">60%</td>
                        <td className="py-2">60%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p>
                  For a Singapore Citizen buying a S$1.5 million condo as a second property, the ABSD alone is S$300,000. This upfront cost dramatically changes the investment calculus and is why many investors sell their existing property before buying to qualify for the 0% first-property rate.
                </p>
              </div>
            </section>

            {/* Practical Considerations */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">Practical Considerations</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                <p>
                  Beyond the numbers, consider these practical factors:
                </p>
                <ul className="list-disc space-y-2 pl-6">
                  <li><strong>Liquidity.</strong> Condos generally have a more liquid resale market with fewer restrictions. HDB resale is subject to ethnic integration quotas, which can limit your buyer pool in certain blocks.</li>
                  <li><strong>Maintenance costs.</strong> Condo maintenance fees (S$200 to S$800+ per month) are higher than HDB service and conservancy charges (S$50 to S$100). This reduces net rental yield for condos.</li>
                  <li><strong>En bloc potential.</strong> Condos, especially older freehold developments in prime areas, have en bloc (collective sale) potential that can deliver significant windfalls. HDB flats do not have this mechanism (SERS is government-initiated and covers a very small number of estates).</li>
                  <li><strong>Tax implications.</strong> Rental income is taxable as income in Singapore. Property tax rates are higher for non-owner-occupied properties.</li>
                </ul>
                <p>
                  For data on freehold vs leasehold pricing across districts, see our{" "}
                  <Link href="/insights/freehold-premium" className="text-[var(--blue)] underline hover:text-[var(--blue-deep)]">Freehold Premium analysis</Link>.
                </p>
              </div>
            </section>

            {/* FAQ */}
            <section>
              <h2 className="text-xl font-bold text-gray-900">Frequently Asked Questions</h2>
              <div className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-100">
                {faqItems.map((f) => (
                  <details key={f.q} className="group px-5 py-4">
                    <summary className="cursor-pointer text-[15px] font-medium text-gray-900 group-open:text-[var(--blue-deep)]">{f.q}</summary>
                    <p className="mt-3 text-sm leading-relaxed text-gray-500">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>

          </article>

          {/* Sidebar */}
          <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start">
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900">Find Investment-Focused Agents</h3>
              <p className="mt-2 text-xs leading-relaxed text-gray-500">Search for agents with strong track records in your target area and property type.</p>
              <Link href="/search" className="mt-4 block rounded-lg bg-[var(--blue)] px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-[var(--blue-deep)]">
                Search agents
              </Link>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900">Market Data</h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link href="/insights/freehold-premium" className="text-[var(--blue)] hover:underline">Freehold Premium by District</Link></li>
                <li><Link href="/insights/million-dollar-hdb" className="text-[var(--blue)] hover:underline">Million-Dollar HDB Tracker</Link></li>
              </ul>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900">Related Guides</h3>
              <ul className="mt-3 space-y-2">
                <li><Link href="/guides/property-agent-commission" className="text-sm text-[var(--blue)] hover:underline">Agent commission rates</Link></li>
                <li><Link href="/guides/hdb-resale-process" className="text-sm text-[var(--blue)] hover:underline">HDB resale process</Link></li>
                <li><Link href="/guides/how-to-choose-property-agent" className="text-sm text-[var(--blue)] hover:underline">How to choose an agent</Link></li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
