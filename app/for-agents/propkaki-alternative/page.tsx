import Link from "next/link";
import type { Metadata } from "next";
import { supabase } from "../../lib/supabase";

export const revalidate = false;

export const metadata: Metadata = {
  title: "PropKaki Alternative for Agents - FairComparisons",
  description:
    "PropKaki gives agents AI tools. FairComparisons gives agents clients: a seller marketplace, an independent AgentScore from real CEA transactions, and free-forever visibility. See how they compare.",
  alternates: {
    canonical: "https://fair-comparisons.com/for-agents/propkaki-alternative",
  },
  openGraph: {
    title: "PropKaki Alternative for Agents - FairComparisons",
    description:
      "PropKaki gives agents AI tools. FairComparisons gives agents clients, an independent record, and free-forever visibility.",
    url: "https://fair-comparisons.com/for-agents/propkaki-alternative",
    siteName: "FairComparisons",
    locale: "en_SG",
    type: "website",
  },
};

async function getStats() {
  const [scored, agencies, total] = await Promise.all([
    supabase.from("sg_agents").select("id", { count: "exact", head: true }).not("score", "is", null),
    supabase.from("sg_agencies").select("id", { count: "exact", head: true }),
    supabase.from("sg_agents").select("id", { count: "exact", head: true }),
  ]);
  return {
    scored: scored.count ?? 10594,
    agencies: agencies.count ?? 930,
    total: total.count ?? 30000,
  };
}

// PropKaki facts below are as published on propkaki.com and verified on 12 Jul 2026.
// PropKaki states it is free during its launch beta; the figures are its published
// plan prices. Kept factual and non-disparaging; many agents will use both tools.
const faqItems = [
  {
    question: "Is FairComparisons a replacement for PropKaki?",
    answer:
      "Not really, because they do different jobs. PropKaki is an AI property assistant with research, valuation and content-generation tools. FairComparisons is a two-sided marketplace and an independent agent record: sellers compare agents on real transaction data and invite the ones they choose to quote. Many agents will use both, PropKaki for the AI tooling and FairComparisons for the clients and the public track record.",
  },
  {
    question: "What does each cost an agent?",
    answer:
      "On FairComparisons, being listed, ranked and found by sellers is free forever, and we never take a cut of a sale. Optional tool subscriptions add reputation and analytics only, never ranking: Verified S$29/mo, Professional S$69/mo, Elite S$149/mo. PropKaki lists its Agent plan at S$25/mo (with a free tier and an Enterprise plan), and states it is currently free during its launch beta.",
  },
  {
    question: "Does PropKaki send me seller enquiries?",
    answer:
      "No. PropKaki is an AI assistant and a set of tools and directories, not a marketplace, so it does not route seller enquiries to agents. On FairComparisons, a seller shortlists agents for their area and invites up to three to send a fee quote, so you receive real enquiries from sellers who chose you.",
  },
  {
    question: "How is an agent ranked on each platform?",
    answer:
      "PropKaki's Agent Finder shows an agent's active segments, recent deals and leaderboard standing, which is based on deal counts. FairComparisons ranks agents by AgentScore, computed from verified CEA, URA and HDB transaction records and review standing. Payment never changes your AgentScore or your position, and there is no paid placement.",
  },
  {
    question: "Is PropKaki better at anything?",
    answer:
      "Yes, and it is worth being straight about it. PropKaki has a broader AI research and content toolset today, including a valuation assistant, tower view, a profitability model, and slide, video and paperwork generators, plus a WhatsApp assistant. If you want those AI tools and you want the clients and an independent record, the sensible move is to use both.",
  },
];

// Honest capability comparison. Each row states what is true of each platform.
const COMPARE: { label: string; pk: string; fc: string }[] = [
  {
    label: "Seller enquiries sent to you",
    pk: "Not a marketplace, no seller-to-agent lead flow",
    fc: "Yes: sellers shortlist agents and invite up to 3 to quote",
  },
  {
    label: "Cost to be listed, ranked and found",
    pk: "Directory listing free; full agent toolkit S$25/mo",
    fc: "Free forever, and never a cut of your sale",
  },
  {
    label: "How you are ranked to clients",
    pk: "Leaderboard by deal counts and active segments",
    fc: "AgentScore on verified CEA/URA/HDB records + reviews, never for sale",
  },
  {
    label: "Cost to the seller or consumer",
    pk: "Free tier; premium valuations from S$10/mo",
    fc: "Always free for sellers",
  },
  {
    label: "AI research and content tools",
    pk: "Broad: valuation, tower view, slides, video, WhatsApp AI",
    fc: "Focused suite: Deal Radar prospecting, stamp duty and commission calculators, CEA advert checker",
  },
  {
    label: "Business model",
    pk: "Consumer and agent subscriptions",
    fc: "Agent tool subscriptions only, never pay-to-rank",
  },
];

export default async function PropKakiAlternativePage() {
  const stats = await getStats();

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://fair-comparisons.com" },
      { "@type": "ListItem", position: 2, name: "For Agents", item: "https://fair-comparisons.com/for-agents" },
      { "@type": "ListItem", position: 3, name: "PropKaki alternative", item: "https://fair-comparisons.com/for-agents/propkaki-alternative" },
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
          <li className="text-gray-600">PropKaki Alternative</li>
        </ol>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-[var(--ink)] via-[var(--ink-2)] to-[var(--ink)] mt-4">
        <div className="mx-auto max-w-[900px] px-5 py-16 text-center md:px-8 md:py-24">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--slate-2)]">For Property Agents</p>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight text-white md:text-5xl">
            PropKaki gives agents tools.
            <br />
            <span className="text-[var(--slate-2)]">FairComparisons gives agents clients.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/60">
            PropKaki is an AI assistant and toolkit. FairComparisons is a seller marketplace and an
            independent record: sellers compare {stats.scored.toLocaleString()} scored agents on real
            CEA, URA and HDB data and invite the ones they choose. Free to be listed, ranked and found.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/search" className="inline-block rounded-lg bg-[var(--blue)] px-8 py-4 font-semibold text-white shadow-lg transition hover:bg-[var(--blue)]">
              <span style={{ color: "#fff" }}>Find your profile</span>
            </Link>
            <Link href="/for-agents" className="inline-block rounded-lg border border-white/20 px-8 py-4 font-semibold text-white transition hover:bg-white/10">
              <span style={{ color: "#fff" }}>See how it works</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="mx-auto max-w-[1120px] px-5 py-14 md:px-8">
        <h2 className="text-center text-2xl font-bold text-gray-900">PropKaki vs FairComparisons</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm text-gray-500">
          An honest, side-by-side look. PropKaki details are as published on propkaki.com and verified on 12 Jul 2026;
          PropKaki states it is currently free during its launch beta. FairComparisons pricing is current as of today.
        </p>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left font-semibold text-gray-900"></th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">PropKaki</th>
                <th className="px-4 py-3 text-left font-semibold text-[var(--blue)]">FairComparisons</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {COMPARE.map((row) => (
                <tr key={row.label}>
                  <td className="px-4 py-3 font-medium text-gray-900">{row.label}</td>
                  <td className="px-4 py-3 text-gray-500">{row.pk}</td>
                  <td className="px-4 py-3 text-gray-700">{row.fc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Key differentiators */}
      <section className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-[1120px] px-5 py-14 md:px-8">
          <h2 className="text-center text-2xl font-bold text-gray-900">Different model, different value</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {[
              {
                pk: "PropKaki: an AI assistant and toolkit.",
                fc: "FairComparisons: a marketplace that sends you clients.",
                detail:
                  "PropKaki helps you research, value and prepare. FairComparisons puts you in front of sellers who are actively choosing an agent, then lets them invite you to quote.",
              },
              {
                pk: "PropKaki ranks agents on deal counts.",
                fc: "FairComparisons ranks on your verified record.",
                detail:
                  "Your AgentScore comes from CEA, URA and HDB transaction records plus review standing. Payment never changes it, and there is no paid placement.",
              },
              {
                pk: "PropKaki charges agents S$25/mo for its toolkit.",
                fc: "FairComparisons is free to be found and ranked.",
                detail:
                  "A full claimed profile with your photo, contact details and AgentScore costs nothing, and we never take a cut of a sale. Optional tools add analytics only, never visibility or rank.",
              },
              {
                pk: "PropKaki charges sellers for premium valuations.",
                fc: "FairComparisons is always free for sellers.",
                detail:
                  "Sellers never pay us and we never take a cut of their sale, which is why they trust the shortlist. That trust is what makes the enquiries you receive worth having.",
              },
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-6">
                <p className="text-sm text-gray-400">{item.pk}</p>
                <p className="mt-1 text-base font-bold text-[var(--blue)]">{item.fc}</p>
                <p className="mt-3 text-sm text-gray-500">{item.detail}</p>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-xl text-center text-sm text-gray-500">
            Not either-or: many agents use PropKaki for AI research and FairComparisons for the clients and the record.
          </p>
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
          {faqItems.map((item, i) => (
            <details key={i} className="group py-4">
              <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-gray-900">
                {item.question}
                <span className="ml-4 text-gray-400 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-gray-500">{item.answer}</p>
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
            <Link href="/search" className="inline-block rounded-lg bg-[var(--blue)] px-8 py-4 font-semibold text-white shadow-lg transition hover:bg-[var(--blue)]">
              <span style={{ color: "#fff" }}>Find your profile</span>
            </Link>
            <Link href="/for-agents" className="inline-block rounded-lg border border-white/20 px-8 py-4 font-semibold text-white transition hover:bg-white/10">
              <span style={{ color: "#fff" }}>See how it works</span>
            </Link>
          </div>
          <p className="mt-6 text-sm text-white/40">
            Questions?{" "}
            <a href="mailto:hello@fair-comparisons.com" className="text-white/60 underline hover:text-white">hello@fair-comparisons.com</a>
          </p>
        </div>
      </section>
    </>
  );
}
