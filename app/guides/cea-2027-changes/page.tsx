import Link from "next/link";
import type { Metadata } from "next";
import SellCtaBand from "../../components/SellCtaBand";
import ScrollReveal from "../../components/ScrollReveal";
import { KeyLine } from "../../components/LineArt";

export const metadata: Metadata = {
  title: { absolute: "CEA's 2027 Rule Changes for Singapore Property Agents, Explained | FairComparisons" },
  description:
    "From 1 January 2027, Singapore property agents must complete at least 3 qualifying transactions per 3-year cycle or pass a refresher exam to renew. A clear, CEA-attributed guide to the confirmed changes and the proposals still under study.",
  alternates: { canonical: "https://fair-comparisons.com/guides/cea-2027-changes" },
};

const confirmedChanges = [
  {
    title: "The currency requirement (the headline change)",
    detail:
      "To renew, an agent must complete at least 3 qualifying transactions per 3-year registration cycle, or pass a refresher examination. New agents are exempt in their first year, then need 2 qualifying transactions across years 2 and 3 (or the exam). CEA may grant case-by-case waivers for extenuating circumstances such as serious medical issues or complex, long-running transactions.",
  },
  {
    title: "A 3-year registration cycle",
    detail:
      "Agency licences and agent registrations move from annual renewal to a 3-year validity period. The first cycle runs from 2027 to 2029. Annual fees are unchanged; the application fee is payable once per 3-year cycle rather than every year.",
  },
  {
    title: "Commission data collection",
    detail:
      "CEA will collect commission data from agencies monthly from 2027. Only aggregated, anonymised industry-level statistics are to be published. Individual agent earnings remain confidential, and CEA still does not set or cap commission rates, which stay negotiable.",
  },
];

const underStudy = [
  "Mandatory estate agency agreements, signed before work begins, with upfront disclosure of who pays the commission and how much.",
  "An online listing verification platform that assigns a unique code to a listing before it is published, to tackle fake, duplicated, and unauthorised listings.",
  "Whether homeowners may list a property directly on commercial portals without an agent (DIY / for-sale-by-owner).",
  "Making HDB's Resale Flat Listing (RFL) service the default listing platform for HDB resale flats.",
  "An official, verified client review and rating system for agents.",
  "A CEA survey of agents on their agency experience.",
];

const qualifyingTypes = [
  "HDB resale",
  "HDB rental",
  "Private residential sale",
  "Private residential rental",
  "Commercial property",
  "Industrial property",
  "Overseas property sale",
  "Collective (en bloc) sale",
];

const faqItems = [
  {
    q: "What is CEA's new 3-transaction rule for property agents?",
    a: "From 1 January 2027, a property agent must complete at least 3 qualifying transactions within each 3-year registration cycle to renew, or pass a refresher examination instead. New agents are exempt in their first year and then need 2 qualifying transactions across years 2 and 3, or the exam. The Council for Estate Agencies (CEA) can grant case-by-case waivers for extenuating circumstances.",
  },
  {
    q: "When do the CEA 2027 changes take effect?",
    a: "The confirmed changes take effect on 1 January 2027. The first 3-year registration cycle runs from 2027 to 2029, so the transaction count is assessed over that full period rather than in a single year.",
  },
  {
    q: "What counts as a qualifying transaction?",
    a: "CEA counts a broad set of deal types: HDB resale and rental, private residential sale and rental, commercial, industrial, overseas property sale, and collective (en bloc) sale. Because the definition spans all of these categories, a full picture of an agent's currency requires CEA's own records, not any single public dataset.",
  },
  {
    q: "What happens to an agent with fewer than 3 transactions in 3 years?",
    a: "They are not automatically deregistered. CEA's framework provides a refresher-examination route as an alternative to the transaction count, a first-year exemption for new agents, and case-by-case waivers for extenuating circumstances. Whether an agent qualifies to renew is a determination CEA makes, using its complete records across all qualifying transaction types.",
  },
  {
    q: "Is the CEA agent rating system confirmed?",
    a: "No. An official verified review and rating system is one of several proposals still under study, alongside listing verification, DIY listings, and making HDB's RFL the default HDB-resale platform. Only the currency requirement, the 3-year cycle, and commission-data collection are confirmed for 2027.",
  },
  {
    q: "Does the commission data collection mean CEA will set commission rates?",
    a: "No. CEA collects commission data monthly from 2027 but publishes only aggregated, anonymised industry statistics. Commission remains negotiable between agent and client, and there is no legally fixed rate in Singapore.",
  },
];

export default function Cea2027ChangesPage() {
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://fair-comparisons.com" },
        { "@type": "ListItem", position: 2, name: "Guides", item: "https://fair-comparisons.com/guides" },
        { "@type": "ListItem", position: 3, name: "CEA 2027 Changes", item: "https://fair-comparisons.com/guides/cea-2027-changes" },
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
          <span className="text-gray-600">CEA 2027 Changes</span>
        </div>
      </nav>

      <ScrollReveal />
      <section className="border-b border-gray-100 bg-gradient-to-b from-[var(--blue-wash)] to-white" style={{ position: "relative", overflow: "hidden" }}>
        <KeyLine className="fc-lineart fc-float" width={88} style={{ position: "absolute", right: "6%", top: 24, color: "var(--line-2)" }} />
        <div className="mx-auto max-w-[1120px] px-5 pb-10 pt-8 md:px-8" style={{ position: "relative" }}>
          <span className="fc-hero-in fc-hero-in--1 inline-block rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">Regulation</span>
          <h1 className="fc-hero-in fc-hero-in--2 mt-3 text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">CEA&apos;s 2027 Changes for Singapore Property Agents, Explained</h1>
          <p className="fc-hero-in fc-hero-in--3 mt-2 max-w-2xl text-[15px] leading-relaxed text-gray-500">
            The Council for Estate Agencies is raising the bar for keeping an agent licence. From 1 January 2027, staying registered depends on recent transactions. Here is what is confirmed, what is still under study, and what it means if you are hiring an agent.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1120px] px-5 py-10 md:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          <article className="space-y-10">

            {/* Key point */}
            <div className="fc-reveal fc-scene fc-scene--grow" style={{ padding: "clamp(10px,1.6vw,14px)" }}>
              <div className="rounded-xl border border-[var(--line)] bg-white p-6">
                <h2 className="text-lg font-bold text-gray-900">The one thing to know</h2>
                <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
                  From 1 January 2027, a property agent must complete at least <strong>3 qualifying transactions per 3-year cycle, or pass a refresher exam</strong>, to renew their registration. In plain terms, CEA has made a recent, active track record the bar for staying licensed. Recent transactions are exactly what an agent&apos;s public CEA record shows, so it is now worth checking before you hire.
                </p>
                <p className="mt-3 text-[15px] leading-[1.75] text-gray-600">
                  You can{" "}
                  <Link href="/property-agents/check" className="font-medium text-[var(--blue)] underline">look up any agent&apos;s CEA registration and transaction record</Link>{" "}
                  in one place, or{" "}
                  <Link href="/property-agents" className="font-medium text-[var(--blue)] underline">compare agents on their actual track record</Link>.
                </p>
              </div>
            </div>

            {/* Confirmed changes */}
            <section className="fc-reveal">
              <h2 className="text-xl font-bold text-gray-900">What is confirmed for 2027</h2>
              <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
                Three changes are confirmed and take effect on 1 January 2027.
              </p>
              <div className="mt-4 space-y-4">
                {confirmedChanges.map((c, i) => (
                  <div key={c.title} className="fc-reveal rounded-xl border border-gray-100 bg-white p-5 shadow-sm" style={{ ["--reveal-delay" as string]: `${Math.min(i * 0.06, 0.42)}s` }}>
                    <h3 className="text-[15px] font-bold text-gray-900">{c.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-500">{c.detail}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Qualifying transactions */}
            <section className="fc-reveal">
              <h2 className="text-xl font-bold text-gray-900">What counts as a qualifying transaction</h2>
              <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
                CEA counts a broad set of deal types toward the requirement. This matters: an agent may be well clear of the bar through deal types that are not visible in any single public dataset, which is why the definitive count is CEA&apos;s own.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {qualifyingTypes.map((t) => (
                  <div key={t} className="rounded-lg bg-gray-50 p-3 text-center text-sm font-medium text-[var(--blue-deep)]">{t}</div>
                ))}
              </div>
            </section>

            {/* Under study */}
            <section className="fc-reveal">
              <h2 className="text-xl font-bold text-gray-900">What is still under study (not confirmed)</h2>
              <p className="mt-2 text-[15px] leading-[1.75] text-gray-600">
                Alongside the confirmed rules, CEA is reviewing several further proposals as part of its industry review. None of these is confirmed, and any timelines would follow later.
              </p>
              <ul className="mt-4 list-disc space-y-2 pl-6 text-[15px] leading-[1.75] text-gray-600">
                {underStudy.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            </section>

            {/* What it means for you */}
            <section className="fc-reveal">
              <h2 className="text-xl font-bold text-gray-900">What it means if you are hiring an agent</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                <p>
                  The regulator has effectively endorsed a simple idea: a recent, active track record is the mark of a working agent. That is the same signal to weigh when you choose one. An agent who transacts regularly is both more likely to stay registered and more likely to know today&apos;s market for your property type and area.
                </p>
                <p>
                  Two practical steps before you sign anything:
                </p>
                <ul className="list-disc space-y-2 pl-6">
                  <li><strong>Verify current registration.</strong> Confirm the agent is currently registered with CEA and note their agency. You can{" "}
                    <Link href="/property-agents/check" className="font-medium text-[var(--blue)] underline">check any agent here</Link>.</li>
                  <li><strong>Look at recent, relevant activity.</strong> Recent sales in your property type and area tell you more than a lifetime transaction count or a marketing title.</li>
                </ul>
              </div>
            </section>

            {/* What it means for agents */}
            <section className="fc-reveal">
              <h2 className="text-xl font-bold text-gray-900">What it means if you are an agent</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-gray-600">
                <p>
                  There is more than one way to stay current: the transaction count, or the refresher exam. New agents have a first-year exemption, and CEA allows case-by-case waivers for genuine extenuating circumstances. The practical takeaways are to keep clear records of your qualifying transactions across all categories, and to plan renewals around the 3-year cycle rather than year by year.
                </p>
                <p>
                  Your public profile and AgentScore on FairComparisons are already live, built from official CEA transaction records.{" "}
                  <Link href="/for-agents" className="font-medium text-[var(--blue)] underline">Claim your profile</Link>{" "}
                  to add your contact details, marketing name, and message.
                </p>
              </div>
            </section>

            {/* Timeline */}
            <section className="fc-reveal">
              <h2 className="text-xl font-bold text-gray-900">Timeline at a glance</h2>
              <div className="mt-4 overflow-x-auto rounded-xl bg-white p-4 shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                      <th className="pb-2 pr-4">When</th>
                      <th className="pb-2">What</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr><td className="py-2.5 pr-4 font-medium text-gray-900">1 Jan 2027</td><td className="py-2.5 text-gray-600">Currency requirement, 3-year registration cycle, and monthly commission-data collection take effect.</td></tr>
                    <tr><td className="py-2.5 pr-4 font-medium text-gray-900">2027 to 2029</td><td className="py-2.5 text-gray-600">First 3-year cycle. An agent&apos;s qualifying transactions are counted across this full period.</td></tr>
                    <tr><td className="py-2.5 pr-4 font-medium text-gray-900">Under study</td><td className="py-2.5 text-gray-600">Listing verification, an official rating system, DIY listings, and HDB RFL-as-default remain proposals, with timelines to follow if adopted.</td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* FAQ */}
            <section className="fc-reveal">
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

            {/* Source note */}
            <p className="fc-reveal text-xs leading-relaxed text-gray-400">
              This page summarises publicly announced changes from the Council for Estate Agencies (CEA) for general information, and is not legal or regulatory advice. FairComparisons is an independent comparison service and is not affiliated with or endorsed by CEA. For the authoritative and current position, refer to CEA at cea.gov.sg.
            </p>

          </article>

          {/* Sidebar */}
          <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start">
            <div className="fc-reveal rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900">Check an agent</h3>
              <p className="mt-2 text-xs leading-relaxed text-gray-500">Look up any agent&apos;s CEA registration and real transaction record, free.</p>
              <Link href="/property-agents/check" className="mt-4 block rounded-lg bg-[var(--blue)] px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-[var(--blue-deep)]">
                Check an agent
              </Link>
            </div>
            <div className="fc-reveal rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900">For Agents</h3>
              <p className="mt-2 text-xs leading-relaxed text-gray-500">Your profile and AgentScore are already live, built on official CEA records. Claim it to manage your listing.</p>
              <Link href="/for-agents" className="mt-4 block rounded-lg border border-[var(--line-2)] px-4 py-2.5 text-center text-sm font-semibold text-[var(--blue-deep)] transition hover:bg-[var(--blue-wash)]">
                Claim your profile
              </Link>
            </div>
            <div className="fc-reveal rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900">Related Guides</h3>
              <ul className="mt-3 space-y-2">
                <li><Link href="/guides/how-to-choose-property-agent" className="text-sm font-semibold text-[var(--blue)] hover:underline">How to choose an agent</Link></li>
                <li><Link href="/guides/how-to-check-property-agent-record" className="text-sm text-[var(--blue)] hover:underline">How to check an agent&apos;s record</Link></li>
                <li><Link href="/guides/property-agent-commission" className="text-sm text-[var(--blue)] hover:underline">Agent commission rates</Link></li>
                <li><Link href="/insights/property-agent-statistics-singapore" className="text-sm text-[var(--blue)] hover:underline">Singapore agent statistics study</Link></li>
              </ul>
            </div>
          </aside>
        </div>
      </div>

      <SellCtaBand source="guide_cea_2027" heading="Hire an agent who is clearly active" sub="Get a free shortlist of the agents who actually sell homes like yours, ranked on their real CEA transaction record, not marketing." />
    </>
  );
}
