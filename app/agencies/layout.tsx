import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Property Agencies in Singapore - Compare 930+ Licensed Agencies",
  description: "Compare all CEA-licensed property agencies in Singapore. Search by name, view agent counts, Google ratings and AgentScore rankings.",
};

export default function AgenciesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
