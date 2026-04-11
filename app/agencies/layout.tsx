import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Property Agencies in Singapore - Full CEA Directory | FairComparisons",
  description:
    "Browse all CEA-licensed property agencies in Singapore. Compare by agent count, Google ratings, and AgentScore. Search by name or license number.",
  alternates: { canonical: "https://fair-comparisons.com/property-agents" },
};

export default function AgenciesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
