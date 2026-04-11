import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare Property Agents Side by Side",
  description: "Compare two or more property agents in Singapore on transaction records, AgentScore, and specialization.",
  robots: { index: false, follow: true },
};

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
