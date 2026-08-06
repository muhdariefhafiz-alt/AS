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
import { PlannerTab } from "./tabs/PlannerTab";
import { PipelineTab } from "./tabs/PipelineTab";
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
  const [pendingClaims, emailBad, outreachFailed, pendingMessages, pendingPhotos, pendingBios, pendingNames, pendingReviews] = await Promise.all([
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
    // The moderation page also handles marketing names + community reviews; the
    // badge and banner must count everything that queue shows, or items sit unseen.
    supabase
      .from("sg_agents")
      .select("id", { count: "exact", head: true })
      .eq("marketing_name_status", "pending")
      .not("marketing_name", "is", null),
    supabase.from("sg_agent_reviews").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  const modTotal =
    (pendingMessages.count ?? 0) +
    (pendingPhotos.count ?? 0) +
    (pendingBios.count ?? 0) +
    (pendingNames.count ?? 0) +
    (pendingReviews.count ?? 0);

  const { count: manualReviewClaims } = await supabase
    .from("sg_claim_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "manual_review");

  const { count: leads7d } = await supabase
    .from("sg_leads")
    .select("id", { count: "exact", head: true })
    // eslint-disable-next-line react-hooks/purity -- force-dynamic admin page: the 7-day badge window is relative to the actual current time by design
    .gte("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString());

  const badges: Record<string, number> = {
    overzicht: pendingClaims.count ?? 0,
    ops: (outreachFailed.count ?? 0) + (emailBad.count ?? 0),
    revenue: 0,
    liquidity: 0,
    funnel: 0,
    leads: leads7d ?? 0,
    planner: 0,
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
          {(() => {
            // manual_review ONLY. A claim with status 'pending' is waiting on the
            // AGENT to click their verification link, not on the operator: the
            // claims queue filters .eq(status,'manual_review') so a pending row can
            // never appear there, and /api/admin/claims 409s anything that is not
            // manual_review. Counting it here put a permanent "1 item awaiting your
            // review" banner above a Review-claims button that opens an empty page,
            // with no action able to clear it. That is the exact alarm fatigue this
            // banner exists to end. Pending claims are already reported, correctly
            // labelled "awaiting email click", in the Overzicht tab.
            const claimsTotal = manualReviewClaims ?? 0;
            const total = modTotal + claimsTotal;
            if (total === 0) return null;
            const parts: string[] = [];
            const content =
              (pendingMessages.count ?? 0) + (pendingPhotos.count ?? 0) + (pendingBios.count ?? 0) + (pendingNames.count ?? 0);
            if (content > 0) parts.push(`${content} profile edit${content === 1 ? "" : "s"}`);
            if ((pendingReviews.count ?? 0) > 0) parts.push(`${pendingReviews.count} review${pendingReviews.count === 1 ? "" : "s"}`);
            if (claimsTotal > 0) parts.push(`${claimsTotal} claim${claimsTotal === 1 ? "" : "s"}`);
            return (
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                  </span>
                  <p className="text-sm text-amber-900">
                    <span className="font-semibold">{total} item{total === 1 ? "" : "s"} awaiting your review:</span>{" "}
                    {parts.join(", ")}
                  </p>
                </div>
                <div className="flex gap-2">
                  {modTotal > 0 && (
                    <a href="/admin/moderation" className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700">
                      Open moderation
                    </a>
                  )}
                  {claimsTotal > 0 && (
                    <a href="/admin/claims" className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100">
                      Review claims
                    </a>
                  )}
                </div>
              </div>
            );
          })()}
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
            {active === "planner" && <PlannerTab />}
            {active === "pipeline" && <PipelineTab />}
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
