import type { Metadata } from "next";
import CompetitorAlternative from "../../components/CompetitorAlternative";
import { getAgentStats } from "../../lib/agentStats";
import { COMPETITORS } from "../../lib/competitors";

const DATA = COMPETITORS["ohmyhome"];
export const revalidate = false;

export const metadata: Metadata = {
  title: DATA.metaTitle,
  description: DATA.metaDescription,
  alternates: { canonical: `https://fair-comparisons.com/for-agents/${DATA.slug}-alternative` },
  openGraph: {
    title: DATA.metaTitle, description: DATA.metaDescription,
    url: `https://fair-comparisons.com/for-agents/${DATA.slug}-alternative`,
    siteName: "FairComparisons", locale: "en_SG", type: "website",
    images: ["https://fair-comparisons.com/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: DATA.metaTitle,
    description: DATA.metaDescription,
    images: ["https://fair-comparisons.com/og-image.png"],
  },
};

export default async function Page() {
  const stats = await getAgentStats();
  return <CompetitorAlternative data={DATA} stats={stats} />;
}
