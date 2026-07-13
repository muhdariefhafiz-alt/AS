import type { Metadata } from "next";
import AgentFeaturePage from "../../components/AgentFeaturePage";
import { getAgentStats } from "../../lib/agentStats";
import { AGENT_FEATURES } from "../../lib/agentFeatures";

const DATA = AGENT_FEATURES["badge-widget"];
export const revalidate = 86400;

export const metadata: Metadata = {
  title: DATA.metaTitle,
  description: DATA.metaDescription,
  alternates: { canonical: `https://fair-comparisons.com/for-agents/${DATA.slug}` },
  openGraph: {
    title: DATA.metaTitle, description: DATA.metaDescription,
    url: `https://fair-comparisons.com/for-agents/${DATA.slug}`,
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
  return <AgentFeaturePage data={DATA} stats={stats} />;
}
