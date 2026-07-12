import Link from "next/link";
import type { Metadata } from "next";
import NetProceedsCalculator from "../../tools/net-proceeds-calculator/NetProceedsCalculator";

export const metadata: Metadata = {
  title: "Net proceeds calculator",
  robots: { index: false, follow: false },
};

// Chrome-free, iframe-friendly version. Header/footer hidden on /embed/* via
// ChromeGate. The Powered-by backlink is the point of the embed.
export default function EmbedNetProceedsCalculator() {
  return (
    <div style={{ background: "#fff", minHeight: "100vh", padding: "20px 16px" }}>
      <div style={{ maxWidth: 660, margin: "0 auto" }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Singapore seller net proceeds calculator</div>
        <NetProceedsCalculator />
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <Link href="https://fair-comparisons.com/tools/net-proceeds-calculator?utm_source=embed" target="_blank" rel="noopener" className="mono" style={{ fontSize: 12, color: "var(--slate)", textDecoration: "none" }}>
            Powered by FairComparisons
          </Link>
        </div>
      </div>
    </div>
  );
}
