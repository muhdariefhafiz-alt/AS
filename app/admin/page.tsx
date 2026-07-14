import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import { getAdminSession } from "../lib/admin-auth";
import { AdminSidebar, TABS } from "./AdminSidebar";
import { OverzichtTab } from "./tabs/OverzichtTab";
import { LiquidityTab } from "./tabs/LiquidityTab";
import { FunnelTab } from "./tabs/FunnelTab";
import { LeadsTab } from "./tabs/LeadsTab";
import { SupplyTab } from "./tabs/SupplyTab";
import { SeoTab } from "./tabs/SeoTab";
import { AiSearchTab } from "./tabs/AiSearchTab";
import { OpsTab } from "./tabs/OpsTab";
import { RevenueTab } from "./tabs/RevenueTab";
import { ContractsTab } from "./tabs/ContractsTab";
import { LoopsTab } from "./tabs/LoopsTab";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  robots: "noindex, nofollow",
};

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Props = { searchParams: Promise<{ tab?: string }> };

export default async function AdminPage({ searchParams }: Props) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const { tab } = await searchParams;
  const active = TABS.find((t) => t.id === tab)?.id || "overzicht";

  // Sidebar badge counts (cheap queries)
  const [pendingClaims, emailBad, outreachFailed, pendingMessages, pendingPhotos, pendingBios] = await Promise.all([
    supabase.from("sg_claim_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    // SG signals (the NL dashboard_feedback / email_queue tables were wrong-tenant).
    supabase.from("sg_agents").select("id", { count: "exact", head: true }).in("email_status", ["bounced", "complained"]),
    supabase.from("sg_outreach").select("id", { count: "exact", head: true }).eq("status", "failed"),
    supabase
      .from("sg_agents")
      .select("id", { count: "exact", head: true })
      .eq("message_status", "pending")
      .not("message", "is", null),
    supabase
      .from("sg_agents")
      .select("id", { count: "exact", head: true })
      .eq("photo_status", "pending")
      .not("photo_url", "is", null),
    supabase
      .from("sg_agents")
      .select("id", { count: "exact", head: true })
      .eq("bio_status", "pending")
      .not("bio", "is", null),
  ]);

  const modTotal = (pendingMessages.count ?? 0) + (pendingPhotos.count ?? 0) + (pendingBios.count ?? 0);

  const { count: manualReviewClaims } = await supabase
    .from("sg_claim_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "manual_review");

  const { count: leads7d } = await supabase
    .from("sg_leads")
    .select("id", { count: "exact", head: true })
    .gte("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString());

  const badges: Record<string, number> = {
    overzicht: pendingClaims.count ?? 0,
    ops: (outreachFailed.count ?? 0) + (emailBad.count ?? 0),
    revenue: 0,
    liquidity: 0,
    funnel: 0,
    leads: leads7d ?? 0,
    supply: 0,
    seo: 0,
    moderation: modTotal,
    claims: manualReviewClaims ?? 0,
  };

  const activeTab = TABS.find((t) => t.id === active)!;

  return (
    <div className="mx-auto min-h-screen max-w-[1400px] bg-gray-50 px-5 py-8 md:px-10">
      <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
        <AdminSidebar active={active} badges={badges} email={session.email} />

        <div className="min-w-0 flex-1">
          <header className="mb-6 border-b border-gray-200 pb-4">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-gray-900">{activeTab.label}</h1>
                <p className="mt-0.5 text-xs text-gray-500">{activeTab.hint}</p>
              </div>
              <div className="text-[11px] text-gray-500">
                {new Date().toLocaleString("en-SG", { dateStyle: "long", timeStyle: "short" })}
              </div>
            </div>
          </header>

          {/* Stream the tab body: sidebar + header paint immediately, data-heavy
              tabs fill in behind a skeleton instead of blocking navigation. */}
          <Suspense
            key={active}
            fallback={
              <div className="space-y-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="animate-pulse rounded-lg border border-gray-200 bg-white p-6">
                    <div className="h-4 w-40 rounded bg-gray-100" />
                    <div className="mt-4 h-24 rounded bg-gray-50" />
                  </div>
                ))}
              </div>
            }
          >
            {active === "overzicht" && <OverzichtTab />}
            {active === "liquidity" && <LiquidityTab />}
            {active === "funnel" && <FunnelTab />}
            {active === "leads" && <LeadsTab />}
            {active === "loops" && <LoopsTab />}
            {active === "supply" && <SupplyTab />}
            {active === "seo" && <SeoTab />}
            {active === "ai-search" && <AiSearchTab />}
            {active === "contracts" && <ContractsTab />}
            {active === "ops" && <OpsTab />}
            {active === "revenue" && <RevenueTab />}
          </Suspense>
        </div>
      </div>
    </div>
  );
}
