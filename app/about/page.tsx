import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About AgentScore - How We Rate Property Agents",
  description: "AgentScore rates Singapore property agents on sale-weighted transaction volume, recency, market diversity, experience, and Google reviews. Independent and data-driven.",
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl px-5 py-12 md:px-10">
      <h1 className="text-3xl font-bold text-gray-900">How we rate property agents</h1>
      <p className="mt-4 text-lg text-gray-500">
        An independent quality score based on public data, not influenced by agents or agencies.
      </p>

      <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-gray-600">
        <section>
          <h2 className="text-xl font-bold text-gray-900">Why AgentScore?</h2>
          <p className="mt-3">
            Choosing a property agent is one of the most important financial decisions you make
            in Singapore. But comparing agents is difficult -- everyone claims to be the best,
            and reviews on a single platform only tell part of the story.
          </p>
          <p className="mt-2">
            Google reviews are positively biased. Agents ask happy clients for reviews,
            while unhappy clients rarely write one. The result: an average rating of 4.5+
            across all agents, making it hard to differentiate.
          </p>
          <p className="mt-2">
            FairComparisons solves this by combining government transaction records with Google
            reviews and applying statistical corrections based on review volume.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900">What data do we use?</h2>
          <div className="mt-4 space-y-3">
            {[
              { name: "CEA Transaction Records", desc: "730,000+ property transactions from the Council for Estate Agencies, linked to individual salesperson registration numbers." },
              { name: "Google Reviews", desc: "Client ratings from Google Maps for each agency. Bayesian-corrected to account for agencies with few reviews." },
              { name: "CEA Public Register", desc: "Registration numbers and agency membership for all 30,000+ agents. Each agent's current registration status can be confirmed directly on the CEA public register." },
              { name: "URA Transaction Data", desc: "Private residential property prices from URA, used for district-level market analysis and development profiles." },
              { name: "HDB Resale Data", desc: "208,000+ HDB resale transactions from data.gov.sg, used for town-level pricing analysis." },
            ].map((s) => (
              <div key={s.name} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h3 className="font-semibold text-gray-900">{s.name}</h3>
                <p className="mt-1 text-sm text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900">How is the score calculated?</h2>
          <p className="mt-3">
            The AgentScore (0-100) combines five dimensions, each weighted by relevance to the consumer:
          </p>
          <div className="mt-4 space-y-3">
            {[
              { name: "Volume", weight: "30 points", desc: "Sale-weighted CEA transactions: completed sales count most (seller-side sales highest), rentals least, so the score reflects an agent's record of actually selling homes, not raw deal count." },
              { name: "Recency", weight: "25 points", desc: "How recently the agent has completed transactions. Recent activity is weighted higher than historical volume." },
              { name: "Diversity", weight: "15 points", desc: "Range of property types (HDB, condo, landed) and transaction types (sale, purchase, rental) handled." },
              { name: "Experience", weight: "15 points", desc: "Years of CEA registration and consistency of transaction activity over time." },
              { name: "Reviews", weight: "15 points", desc: "Google review rating of the agent's agency, Bayesian-corrected to account for agencies with few reviews." },
            ].map((d) => (
              <div key={d.name} className="flex items-start gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--blue-wash)] text-xs font-bold text-[var(--blue-deep)]">{d.weight.split(" ")[0]}</div>
                <div>
                  <h3 className="font-semibold text-gray-900">{d.name} <span className="text-sm font-normal text-gray-400">({d.weight})</span></h3>
                  <p className="mt-1 text-sm text-gray-500">{d.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4">
            The score is fully automated and recalculated weekly as new CEA data is ingested.
            Payment does not influence ranking position. The only way to improve a score is to
            complete more transactions and deliver better service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900">Frequently asked questions</h2>
          <div className="mt-4 space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900">Can agents influence their score?</h3>
              <p className="mt-1 text-sm text-gray-500">
                No. The AgentScore is calculated automatically from public government data and
                Google reviews. Agents cannot pay for a higher position.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">How often is the score updated?</h3>
              <p className="mt-1 text-sm text-gray-500">
                Scores are recalculated weekly based on the latest CEA transaction data and Google reviews.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Why does my score differ from my Google rating?</h3>
              <p className="mt-1 text-sm text-gray-500">
                Google ratings only account for 15% of the AgentScore. The majority (70 points)
                comes from actual transaction data: volume, recency, and diversity. An agent with
                a 5.0 Google rating but few transactions will score lower than an agent with a 4.2
                rating and hundreds of transactions.
              </p>
            </div>
          </div>
        </section>

        {/* Contact */}
        <div className="mt-12 rounded-xl border border-gray-200 bg-gray-50 p-6">
          <h2 className="text-lg font-bold text-gray-900">Questions or feedback?</h2>
          <p className="mt-2 text-sm text-gray-600">
            Reach us at{" "}
            <a href="mailto:hello@fair-comparisons.com" className="text-[var(--blue)] hover:underline">hello@fair-comparisons.com</a>.
            We respond within 24 hours.
          </p>
        </div>

        {/* CTA */}
        <div className="mt-6 rounded-xl border border-[var(--line-2)] bg-[var(--blue-wash)] p-6 text-center">
          <h2 className="text-xl font-bold text-gray-900">Ready to choose on evidence?</h2>
          <p className="mt-2 text-gray-600">Compare the agents who actually sell homes like yours, ranked on government data, then contact the ones you choose. Free, and we never take a cut of a sale.</p>
          <a href="/sell?utm_source=about" className="mt-4 inline-block rounded-lg bg-[var(--blue)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--blue-deep)]">
            Compare agents
          </a>
        </div>
      </div>
    </article>
  );
}
