import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How to Check if a Property Agent Is Good: The 5-Step Record Check (2026)",
  description:
    "How to check a Singapore property agent's real track record before you sign: verify the CEA registration, read the transaction record the right way, and spot the four patterns that a 'top producer' title hides.",
  alternates: { canonical: "https://fair-comparisons.com/guides/how-to-check-property-agent-record" },
};

const steps = [
  {
    title: "Verify the CEA registration first",
    body: "Every practising agent in Singapore must hold a CEA registration number (format R000000X). Ask for it, then confirm the person is currently registered and see which agency holds their licence. An expired or missing registration is disqualifying, no exceptions. This takes under a minute with a registration lookup.",
  },
  {
    title: "Count recent SALES, not total transactions",
    body: "A big transaction count means little by itself: across the whole CEA record, 63% of recorded activity is rentals, and a rental record does not prove someone can negotiate a home sale. Filter the record to sale transactions (resale, new sale, sub-sale) in the last 12 to 24 months. An agent whose last recorded home sale is years old is out of practice in the market you are entering, whatever their lifetime total says.",
  },
  {
    title: "Check the sales are in YOUR area and property type",
    body: "Selling an HDB flat in Yishun is a different job from selling a District 10 condo: different buyer pool, different pricing logic, different paperwork rhythm. Look for repeated recent sales in your town or district and your property type. A genuine local specialist shows a cluster; a generalist shows a scatter.",
  },
  {
    title: "Check which SIDE they were on",
    body: "The record states whether the agent represented the seller or the buyer. Marketing, pricing and negotiating for a seller is the skill you are hiring for. An agent whose sale record is mostly buyer-side has spent their time finding homes, not selling them.",
  },
  {
    title: "Apply the team test",
    body: "If one name is credited with more deals than a single person could physically handle, spread across many towns, you are looking at a team record logged under the leader's name. Our study of the CEA record found the busiest 1% of HDB resale agents are credited with sales across a median of 23 of Singapore's 26 HDB towns, and the record contains single months that no individual could close alone. There is nothing wrong with hiring a team, but then the question changes: ask which team member will actually handle your sale, and check THAT person's record.",
  },
];

const hides = [
  { label: "Team-attributed volume", body: "Deals are often logged under the team leader's name, so the star's record can be several people's work. We flag profiles whose record contains physically implausible single-month volume." },
  { label: "Private deals uploaded late or not at all", body: "Some private-market transactions reach the record only when manually submitted, so recent private-sale counts can understate." },
  { label: "The newest months are still filling", body: "CEA publishes with a lag, so the most recent month or two of any record is typically incomplete. Judge on a 12-month window, not last month." },
  { label: "Soft skills", body: "Responsiveness, honesty about pricing, and negotiation style are not in any database. The record qualifies the shortlist; a conversation picks the winner." },
];

const faqItems = [
  {
    q: "How do I check if a property agent is good in Singapore?",
    a: "Run five checks against the public CEA record: verify the registration number is current; count recent home sales rather than total transactions (63% of all recorded activity is rentals); confirm those sales are in your area and property type; check the agent was on the seller's side; and apply the team test, because deals are often logged under a team leader's name. You can run all five in minutes with a free record lookup on FairComparisons.",
  },
  {
    q: "Is a 'top producer' award proof an agent is good?",
    a: "No. 'Top producer' is a self-applied or agency-applied marketing label with no independent audit. The public CEA record shows the largest 'individual' volumes are spread across so many towns at once that they are almost certainly team totals. Judge the specific person on their own recorded sales in your area, not the title on the flyer.",
  },
  {
    q: "How many transactions should a good agent have?",
    a: "There is no magic number, but context helps: 66% of registered agents have no sale on record at all, so any agent with repeated recent seller-side sales in your area is already in the market's active minority. For a typical HDB or condo sale, a specialist with several recent sales in your town or district beats a generalist with a bigger island-wide total.",
  },
  {
    q: "Where can I see a property agent's track record for free?",
    a: "The transaction record originates from CEA's public data. FairComparisons republishes it per agent with the analysis already done: sale vs rental split, seller-side vs buyer-side, area concentration, recency, and integrity flags such as team-attributed volume. Search any name or registration number, free, no sign-up.",
  },
];

export default function CheckAgentRecordGuide() {
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://fair-comparisons.com" },
        { "@type": "ListItem", position: 2, name: "Guides", item: "https://fair-comparisons.com/guides" },
        { "@type": "ListItem", position: 3, name: "Check an Agent's Record", item: "https://fair-comparisons.com/guides/how-to-check-property-agent-record" },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: "How to check a Singapore property agent's track record",
      step: steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.title, text: s.body })),
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
          <span className="text-gray-600">Check an agent&apos;s record</span>
        </div>
      </nav>

      <section className="border-b border-gray-100 bg-gradient-to-b from-[var(--blue-wash)] to-white">
        <div className="mx-auto max-w-[1120px] px-5 pb-10 pt-8 md:px-8">
          <span className="inline-block rounded-full border border-[var(--line-2)] bg-[var(--blue-wash)] px-3 py-1 text-xs font-semibold text-[var(--blue-deep)]">Due Diligence</span>
          <h1 className="mt-3 max-w-3xl text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">
            How to check if a property agent is good: the 5-step record check
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-gray-500">
            Every Singapore agent&apos;s transaction history is public. Most sellers never read it, and the ones who do
            often read it wrong: they count transactions when they should be counting recent, local, seller-side home
            sales. Here is the check we would run on any agent, plus the four things the record cannot tell you.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1120px] px-5 py-10 md:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          <article className="space-y-10">

            <section>
              <h2 className="text-xl font-bold text-gray-900">The 5-step check</h2>
              <div className="mt-4 space-y-4">
                {steps.map((s, i) => (
                  <div key={s.title} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--blue-wash)] text-sm font-bold text-[var(--blue-deep)]">{i + 1}</span>
                      <div>
                        <h3 className="text-[15px] font-bold text-gray-900">{s.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-gray-600">{s.body}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[15px] leading-[1.75] text-gray-600">
                All five checks run off the same public record. The fastest way is the{" "}
                <Link href="/property-agents/check" className="font-medium text-[var(--blue)] underline">free agent checker</Link>,
                which shows any agent&apos;s sale/rental split, seller-side share, area concentration and recency in one view.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900">What the record cannot tell you</h2>
              <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
                We publish the record&apos;s limits as openly as its contents, because a check you half-trust is worse
                than no check:
              </p>
              <div className="mt-4 space-y-3">
                {hides.map((h) => (
                  <div key={h.label} className="rounded-xl border border-gray-100 bg-white p-4">
                    <h3 className="text-sm font-bold text-gray-900">{h.label}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-gray-600">{h.body}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[15px] leading-[1.75] text-gray-600">
                The full list of limitations, and how our AgentScore compensates for them, is on the{" "}
                <Link href="/trust" className="font-medium text-[var(--blue)] underline">trust and data page</Link>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900">The questions to ask once the record checks out</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                <p>
                  The record qualifies a shortlist; the conversation picks the winner. When you meet the two or three
                  agents whose records survive the five checks, ask each one: How many homes like mine have you
                  personally sold in this area in the last year, and can you walk me through one? How would you price
                  my home, and what recent transactions is that based on? What happens if the listing goes stale at
                  week four? If you work in a team, who exactly handles my viewings and my negotiation?
                </p>
                <p>
                  Vague answers to specific questions are the tell. An agent whose record is genuinely their own can
                  talk you through individual deals without notes.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900">Frequently asked questions</h2>
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

          <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start">
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900">Run the check now</h3>
              <p className="mt-2 text-xs leading-relaxed text-gray-500">Look up any agent&apos;s real CEA transaction record: sales vs rentals, seller-side share, area focus, recency.</p>
              <Link href="/property-agents/check" className="mt-4 block rounded-lg bg-[var(--blue)] px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-[var(--blue-deep)]">
                Check an agent
              </Link>
            </div>
            <div className="rounded-xl border border-[var(--line-2)] bg-[var(--blue-wash)] p-5">
              <h3 className="text-sm font-bold text-gray-900">Why titles mislead</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-gray-600">
                Our study of the CEA record: the busiest &ldquo;individual&rdquo; agents are credited across 23 of 26
                HDB towns at once. League tables measure teams, not people.
              </p>
              <Link href="/insights/property-agent-league-tables-singapore" className="mt-3 inline-block text-sm font-semibold text-[var(--blue)]">Read the study &rarr;</Link>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900">Related Guides</h3>
              <ul className="mt-3 space-y-2">
                <li><Link href="/guides/how-to-choose-property-agent" className="text-sm text-[var(--blue)] hover:underline">How to choose an agent</Link></li>
                <li><Link href="/guides/property-agent-commission" className="text-sm text-[var(--blue)] hover:underline">Agent commission rates</Link></li>
                <li><Link href="/guides/property-agent-vs-diy" className="text-sm text-[var(--blue)] hover:underline">Selling without an agent</Link></li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
