import Link from "next/link";
import type { Metadata } from "next";
import HeroBand from "../../components/HeroBand";
import SkylinePreFooter from "../../components/SkylinePreFooter";
import ShortlistMatcher from "../../components/ShortlistMatcher";
import { getHireAreaOptions } from "../../lib/hireData";

export const metadata: Metadata = {
  title: { absolute: "Find the Right Agent for Your Home, on Their Real Record | FairComparisons" },
  description:
    "Tell us your property type, area, and whether you're selling or renting out. Instantly see the agents who have actually closed the most deals like yours, ranked on official CEA transaction records. No sign-up. Free.",
  alternates: { canonical: "https://fair-comparisons.com/property-agents/shortlist" },
};

type Props = { searchParams: Promise<{ type?: string; side?: string; area?: string }> };

export default async function ShortlistPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { town, district } = await getHireAreaOptions();

  const schema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "FairComparisons Agent Shortlist",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "SGD" },
    description: "Match with Singapore property agents ranked on their real CEA transaction record for your property type and area.",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />

      <div className="mx-auto max-w-[1120px] px-5 pt-5 md:px-8">
        <nav className="text-xs text-[var(--slate-2)]">
          <Link href="/" className="hover:text-[var(--blue-wash)]">Home</Link>
          <span className="mx-1.5">/</span>
          <Link href="/property-agents" className="hover:text-[var(--blue-wash)]">Property Agents</Link>
          <span className="mx-1.5">/</span>
          <span className="text-[var(--slate-2)]">Find your agent</span>
        </nav>
      </div>

      <HeroBand
        eyebrow="Matched on real deals, not ads"
        title={<>Find the right agent for</>}
        accent={<>your home</>}
        sub={<>Pick your property type and area. See the agents who have genuinely closed the most deals like yours, ranked on official CEA records, before you give any contact details.</>}
        art="condo"
      />

      <div className="mx-auto max-w-[820px] px-5 py-10 md:px-8">
        <ShortlistMatcher
          townAreas={town}
          districtAreas={district}
          initialType={sp.type}
          initialSide={sp.side}
          initialArea={sp.area}
        />

        {/* Why this is different */}
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {[
            { h: "Real transactions", p: "Rankings come from official CEA transaction records, matched to each agent's registration number, not advertising spend or self-reported claims." },
            { h: "For your exact home", p: "We rank the agents who actually close deals for your property type, in your area, on the side you need (selling or renting out)." },
            { h: "See first, decide later", p: "The agents are shown before you give any contact details. Request an introduction only if you want one." },
          ].map((c) => (
            <div key={c.h} className="fc-reveal rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900">{c.h}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">{c.p}</p>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-gray-500">
          Prefer to browse by area?{" "}
          <Link href="/property-agents" className="font-medium text-[var(--blue)] underline">See all Singapore agents</Link>{" "}
          or{" "}
          <Link href="/property-agents/check" className="font-medium text-[var(--blue)] underline">check a specific agent</Link>.
        </p>
      </div>

      <SkylinePreFooter />
    </>
  );
}
