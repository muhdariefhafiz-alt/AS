import Link from "next/link";
import type { Metadata } from "next";
import CommissionCalculator from "../../tools/commission-calculator/CommissionCalculator";

export const metadata: Metadata = {
  title: "Commission calculator",
  robots: { index: false, follow: false },
};

// Chrome-free, iframe-friendly version of the commission calculator. Site
// header/footer are hidden on /embed/* via ChromeGate. Carries a Powered-by
// backlink, which is the point: every embed is a link back to the canonical tool.
export default function EmbedCommissionCalculator() {
  return (
    <div style={{ background: "#fff", minHeight: "100vh", padding: "20px 16px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Property agent commission calculator</div>
        <CommissionCalculator />
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <Link
            href="https://fair-comparisons.com/tools/commission-calculator?utm_source=embed"
            target="_blank"
            rel="noopener"
            className="mono"
            style={{ fontSize: 12, color: "var(--slate)", textDecoration: "none" }}
          >
            Powered by FairComparisons
          </Link>
        </div>
      </div>
    </div>
  );
}
