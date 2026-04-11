import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About AgentScore - How We Rate Property Agents",
  description: "The AgentScore combines Google reviews, listing portals ratings, CEA data and market performance into one objective score. Independent and not influenced by payment.",
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
            in Singapore. But comparing agents is difficult - everyone claims to be the best,
            and reviews on a single platform only tell part of the story.
          </p>
          <p className="mt-2">
            Google reviews are positively biased. Agents ask happy clients for reviews,
            while unhappy clients rarely write one. The result: an average rating of 4.5+
            across all agents, making it hard to differentiate.
          </p>
          <p className="mt-2">
            FairComparisons corrects this by combining reviews from multiple independent platforms
            and applying statistical corrections based on review volume.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900">What data do we use?</h2>
          <div className="mt-4 space-y-3">
            {[
              { name: "Google Reviews", desc: "Client ratings and review texts from Google Maps. The most widely used source, but positively biased." },
              { name: "listing portals Reviews", desc: "Ratings from Singapore's largest property platform. Includes reviews from actual property transactions." },
              { name: "CEA Registration", desc: "Verification against the Council for Estate Agencies public register. Confirms active registration status." },
              { name: "Market Activity", desc: "Listing volume and transaction data per district. Indicates how active an agent is in specific areas." },
              { name: "Agency Profile", desc: "Agency size, years in operation, and professional certifications." },
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
            The AgentScore combines five dimensions, each weighted by relevance to the consumer.
          </p>
          <p className="mt-2">
            <strong>Quality</strong> - A Bayesian-corrected average of reviews from Google, listing portals
            and other platforms. Sources where negative reviews are more common carry higher weight.
          </p>
          <p className="mt-2">
            <strong>Experience</strong> - Transaction history, years of registration, and specialisations.
          </p>
          <p className="mt-2">
            <strong>Market presence</strong> - Activity per district based on listings and transactions.
          </p>
          <p className="mt-2">
            <strong>Trust</strong> - CEA verification, agency membership, review volume.
          </p>
          <p className="mt-2">
            <strong>Visibility</strong> - Online presence and profile completeness.
          </p>
          <p className="mt-3">
            The exact weighting is proprietary and continuously refined. The score is fully
            automated and cannot be influenced by payment.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900">Frequently asked questions</h2>
          <div className="mt-4 space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900">Can agents influence their score?</h3>
              <p className="mt-1 text-sm text-gray-500">
                No. The AgentScore is calculated automatically from public data. The only way
                to improve a score is to actually perform better - better service leads to
                better reviews.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">How often is the score updated?</h3>
              <p className="mt-1 text-sm text-gray-500">
                Scores are recalculated weekly based on the latest data from all sources.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Why does my score differ from my Google rating?</h3>
              <p className="mt-1 text-sm text-gray-500">
                Google ratings are structurally too positive. FairComparisons corrects for this
                by also including listing portals reviews and applying Bayesian correction
                based on review volume. Additionally, experience, market activity and
                trust factors are weighted in.
              </p>
            </div>
          </div>
        </section>
      </div>
    </article>
  );
}
