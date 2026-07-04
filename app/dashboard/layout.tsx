import { getAgentSession } from "../lib/agent-auth";
import ImpersonationBanner from "./ImpersonationBanner";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getAgentSession();
  return (
    <>
      {session?.impersonatedBy && (
        <ImpersonationBanner adminEmail={session.impersonatedBy} agentEmail={session.email} />
      )}
      {children}
    </>
  );
}
