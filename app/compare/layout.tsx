import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare Property Agents Side by Side | FairComparisons",
  description:
    "Compare up to 3 Singapore property agents side by side on AgentScore, transaction history, specialization, and area expertise.",
  alternates: { canonical: "https://fair-comparisons.com/compare" },
};

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
