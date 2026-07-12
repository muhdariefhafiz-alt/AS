import type { Metadata } from "next";
import CompetitorAlternative from "../../components/CompetitorAlternative";
import { getAgentStats } from "../../lib/agentStats";
import { COMPETITORS } from "../../lib/competitors";

const DATA = COMPETITORS["srx"];
export const revalidate = false;

export const metadata: Metadata = {
  title: DATA.metaTitle,
  description: DATA.metaDescription,
  alternates: { canonical: `https://fair-comparisons.com/for-agents/${DATA.slug}-alternative` },
  openGraph: {
    title: DATA.metaTitle, description: DATA.metaDescription,
    url: `https://fair-comparisons.com/for-agents/${DATA.slug}-alternative`,
    siteName: "FairComparisons", locale: "en_SG", type: "website",
  },
};

export default async function Page() {
  const stats = await getAgentStats();
  return <CompetitorAlternative data={DATA} stats={stats} />;
}
