import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search Agents, Agencies & Districts",
  description:
    "Search for property agents, agencies, districts, and HDB towns in Singapore. Find market data, agent profiles, and transaction records.",
  alternates: { canonical: "https://fair-comparisons.com/search" },
  robots: { index: false, follow: true },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
