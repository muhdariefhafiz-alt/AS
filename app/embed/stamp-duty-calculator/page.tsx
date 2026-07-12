import Link from "next/link";
import type { Metadata } from "next";
import StampDutyCalculator from "../../tools/stamp-duty-calculator/StampDutyCalculator";

export const metadata: Metadata = {
  title: "Stamp duty calculator",
  robots: { index: false, follow: false },
};

// Chrome-free, iframe-friendly version. Site header/footer are hidden on /embed/*
// via ChromeGate. The Powered-by backlink is the point: every embed on an agent's
// or blogger's site is a link back to the canonical tool.
export default function EmbedStampDutyCalculator() {
  return (
    <div style={{ background: "#fff", minHeight: "100vh", padding: "20px 16px" }}>
      <div style={{ maxWidth: 660, margin: "0 auto" }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Singapore stamp duty calculator (BSD, ABSD, SSD)</div>
        <StampDutyCalculator />
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <Link
            href="https://fair-comparisons.com/tools/stamp-duty-calculator?utm_source=embed"
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
