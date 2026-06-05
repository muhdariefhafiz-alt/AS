import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact FairComparisons",
  description:
    "Get in touch with FairComparisons, the independent Singapore property-agent comparison platform. Questions from sellers, agents, or media: we reply within one business day.",
  alternates: { canonical: "https://fair-comparisons.com/contact" },
};

const ROUTES: { eyebrow: string; title: string; body: string; href: string; cta: string }[] = [
  {
    eyebrow: "Selling a home",
    title: "Get matched with an agent",
    body: "Tell us about your property and get a free shortlist of the agents who actually sell homes like yours.",
    href: "/sell?utm_source=contact",
    cta: "Get my free shortlist",
  },
  {
    eyebrow: "Property agents",
    title: "Claim or correct your profile",
    body: "Claim your free profile to manage your details and receive seller leads. Spotted something wrong in your record? Email us.",
    href: "/for-agents",
    cta: "For agents",
  },
];

export default function ContactPage() {
  return (
    <>
      <header className="fc-wrap" style={{ padding: "26px 40px 0" }}>
        <div className="sr-crumb">
          <Link href="/">Home</Link> / Contact
        </div>
      </header>

      <section className="fc-wrap" style={{ padding: "20px 40px 8px", maxWidth: 760 }}>
        <div className="eyebrow">Contact</div>
        <h1 style={{ margin: "12px 0 0", fontSize: "clamp(30px,4vw,46px)" }}>Get in touch.</h1>
        <p className="lede" style={{ marginTop: 14, maxWidth: "58ch" }}>
          We are a small, independent team in Singapore. Rankings are built from government data, never advertising. If
          you have a question, a correction, or a data request, we want to hear it.
        </p>

        <div className="fc-card fc-card--pad" style={{ marginTop: 24, background: "var(--cloud)", borderColor: "transparent" }}>
          <div className="kicker">Email us</div>
          <a
            href="mailto:hello@fair-comparisons.com"
            className="serif"
            style={{ display: "inline-block", marginTop: 6, fontSize: "clamp(20px,2.4vw,26px)", fontWeight: 600, color: "var(--blue)" }}
          >
            hello@fair-comparisons.com
          </a>
          <p className="muted small" style={{ marginTop: 8 }}>
            We reply within one business day. For data corrections, please include your CEA registration number or the
            page URL so we can verify against the source records.
          </p>
        </div>

        <div className="fc-grid-2" style={{ marginTop: 20 }}>
          {ROUTES.map((r) => (
            <div key={r.href} className="fc-card fc-card--pad">
              <div className="eyebrow">{r.eyebrow}</div>
              <div className="serif" style={{ fontWeight: 600, fontSize: 19, margin: "8px 0 6px" }}>
                {r.title}
              </div>
              <p className="muted" style={{ margin: 0, fontSize: 14 }}>
                {r.body}
              </p>
              <Link href={r.href} className="fc-btn fc-btn--quiet fc-btn--sm" style={{ marginTop: 14 }}>
                {r.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="muted small" style={{ marginTop: 22 }}>
          Common questions about how the matching works and what it costs are answered on the{" "}
          <Link href="/sell#faq" style={{ color: "var(--blue)", fontWeight: 600 }}>
            sell-your-property FAQ
          </Link>
          . How we rank agents is explained on{" "}
          <Link href="/about" style={{ color: "var(--blue)", fontWeight: 600 }}>
            How we score
          </Link>
          .
        </p>
      </section>
      <div style={{ height: 48 }} />
    </>
  );
}
