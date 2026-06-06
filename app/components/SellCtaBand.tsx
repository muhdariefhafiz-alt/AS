import Link from "next/link";

// Shared conversion band for content/discovery pages that would otherwise
// dead-end. Puts a "compare agents" prompt on every page: route content traffic
// into the free comparison.
export default function SellCtaBand({
  source = "content",
  heading = "Ready to choose on evidence?",
  sub = "Compare the ranked agents who actually sell properties like yours nearby, then contact the ones you choose. Always free for sellers.",
}: {
  source?: string;
  heading?: string;
  sub?: string;
}) {
  return (
    <section className="fc-section fc-section--dark">
      <div className="fc-wrap" style={{ textAlign: "center" }}>
        <h2 style={{ color: "#fff" }}>{heading}</h2>
        <p className="lede" style={{ margin: "14px auto 24px", textAlign: "center" }}>
          {sub}
        </p>
        <div className="fc-row" style={{ justifyContent: "center", gap: 12 }}>
          <Link href={`/sell?utm_source=${source}`} className="fc-btn fc-btn--primary fc-btn--lg">
            Compare agents
          </Link>
          <Link href="/tools/valuation" className="fc-btn fc-btn--ghost-light fc-btn--lg">
            What is my home worth?
          </Link>
        </div>
      </div>
    </section>
  );
}
