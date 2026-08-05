import type { Metadata } from "next";
import Link from "next/link";
import LoiDemo from "./LoiDemo";
import ScrollReveal from "../../components/ScrollReveal";

export const revalidate = 86400;

const TITLE = "Letter of Intent Template Singapore (Rental) for Property Agents";
const DESC =
  "Draw up a residential letter of intent on your own letterhead: term, rent, good-faith deposit, diplomatic clause and the deadline to sign the tenancy agreement. Free for CEA-registered salespersons, and the tenancy agreement then fills itself from it.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "https://fair-comparisons.com/tools/loi" },
  openGraph: {
    title: "Letter of Intent (Rental) for Singapore Property Agents",
    description: "Your letterhead, the standard clauses, and a tenancy agreement that fills itself from it.",
    url: "https://fair-comparisons.com/tools/loi",
    type: "website",
    locale: "en_SG",
    images: ["https://fair-comparisons.com/og-image.png"],
  },
};

// Consumer and agent facing explainer. It is also where the provenance line on
// a free-tier document points, so a landlord or tenant who receives an LOI can
// read what they are being asked to agree to.
const FAQ: [string, string][] = [
  [
    "What is a letter of intent when renting in Singapore?",
    "A letter of intent, or LOI, is the short letter a prospective tenant's salesperson sends the landlord to set out the terms they are offering: the rent, the length of the lease, the deposits, the move-in date and any requests such as cleaning or repairs before handover. It usually comes with a good-faith deposit and is expressed subject to contract, so the binding document is still the tenancy agreement that follows.",
  ],
  [
    "Is a letter of intent legally binding?",
    "An LOI is normally written to be non-binding on the lease itself, which is why it is marked subject to contract and why it sets a deadline for signing the tenancy agreement. The parts that do bite are the practical ones: what happens to the good-faith deposit if either side walks away after the terms are agreed. Read those clauses before you sign, and take independent legal advice on anything non-standard. This tool generates a standard template and is not legal advice.",
  ],
  [
    "What is the good-faith deposit and do I get it back?",
    "The good-faith deposit accompanies the LOI and shows the tenant is serious. The market convention is one month's rent for a one-year lease and two months for a two-year lease. If the tenancy agreement is signed, the deposit is normally rolled into the security deposit or the first month's advance rental, depending on which wording the parties use. If the terms cannot be agreed, it is normally returned in full. If the tenant walks away after the terms are agreed, it is normally forfeited. The letter should say plainly which of these applies.",
  ],
  [
    "How much is the security deposit on a Singapore rental?",
    "The usual convention is one month's rent for each year of the lease, so one month on a one-year lease and two months on a two-year lease, paid when the tenancy agreement is signed and refundable at the end of the term less any lawful deductions. It is a convention, not a rule, and it is negotiable.",
  ],
  [
    "What is a diplomatic clause?",
    "A diplomatic clause lets the tenant end the lease early if they are required to leave Singapore, typically after an initial period of the lease has run and on two months' written notice with supporting evidence. Practice varies on when it can first be invoked, so the letter states the period the parties actually agreed rather than assuming one. It is often paired with a clause reimbursing the landlord a pro-rated share of the commission.",
  ],
  [
    "Who pays the stamp duty on a tenancy agreement?",
    "In practice the tenant pays it, and the agreement is stamped with IRAS within the time prescribed by law. Lease stamp duty is calculated from the rent and the length of the lease at the rates IRAS publishes.",
  ],
  [
    "Can a property agent send a letter of intent from their phone?",
    "Yes. A CEA-registered salesperson with a claimed FairComparisons profile can draw one up in about two minutes: the letterhead, registration number and standard clauses are already filled in, and only the property, the parties and the commercial terms are typed. The tenancy agreement is then started from the letter of intent, so those details are never typed twice.",
  ],
];

export default function LoiToolPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(([q, a]) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return (
    <main className="fc-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <div className="fc-wrap">
        <div className="eyebrow fc-hero-in fc-hero-in--1">For agents</div>
        <h1 className="fc-hero-in fc-hero-in--2" style={{ fontSize: "var(--t-h1)", margin: "10px 0 0", maxWidth: "18ch" }}>
          A letter of intent on <span className="italic-serif">your</span> letterhead.
        </h1>
        <p className="muted fc-hero-in fc-hero-in--3" style={{ marginTop: 12, fontSize: 17, maxWidth: "62ch" }}>
          The offer letter that opens a rental deal, drawn up in about two minutes: term, rent, deposits, the
          diplomatic clause and the deadline to sign the tenancy agreement. Your name and CEA registration are already
          on it, because we hold the register.
        </p>

        <div className="fc-hero-in fc-hero-in--4" style={{ marginTop: 24, maxWidth: 620 }}>
          <LoiDemo />
        </div>

        <div className="fc-scene fc-scene--mint fc-hero-in fc-hero-in--5" style={{ marginTop: 28, padding: "clamp(12px,2vw,18px)" }}>
          <div className="fc-scene__card" style={{ padding: "clamp(16px,2.6vw,24px)" }}>
            <p className="kicker" style={{ margin: 0 }}>Why it is different</p>
            <h2 className="serif" style={{ fontSize: "clamp(19px,2.4vw,24px)", margin: "6px 0 0" }}>
              Type the deal once. <span className="italic-serif">Sign it twice.</span>
            </h2>
            <ul style={{ margin: "12px 0 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8, fontSize: 15, color: "var(--ink-2)" }}>
              <li>Your letterhead, registration number and agency are filled in from the CEA register.</li>
              <li>The tenancy agreement starts from the letter of intent, so the property, parties and terms carry across.</li>
              <li>Every convention is an editable field with the market range shown, never fixed boilerplate.</li>
              <li>Documents are stored privately to your account, with a status you control.</li>
            </ul>
            <p className="muted small" style={{ marginTop: 12 }}>
              Free while you are on the free plan. Standard templates for your review, not legal advice.
            </p>
          </div>
        </div>

        <ScrollReveal />
        <section style={{ marginTop: 40 }}>
          <h2 style={{ fontSize: "var(--t-h2)", margin: 0 }}>Questions about a rental letter of intent</h2>
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            {FAQ.map(([q, a], i) => (
              <details key={q} className="fc-card fc-card--pad fc-reveal" style={{ background: "#fff", ["--reveal-delay" as string]: `${Math.min(i * 0.05, 0.35)}s` }}>
                <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 15.5 }}>{q}</summary>
                <p className="muted" style={{ marginTop: 10, fontSize: 15, lineHeight: 1.6 }}>{a}</p>
              </details>
            ))}
          </div>
        </section>

        <p className="muted small" style={{ marginTop: 32 }}>
          Renting out a property and choosing who to work with?{" "}
          <Link href="/property-agents" style={{ color: "var(--blue)", fontWeight: 600 }}>
            Compare every CEA-registered agent
          </Link>{" "}
          on their real transaction record.
        </p>
      </div>
    </main>
  );
}
