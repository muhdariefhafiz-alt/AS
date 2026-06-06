import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import { getAdminSession } from "../../lib/admin-auth";
import { ClaimsQueue, type ClaimRow } from "./ClaimsQueue";

export const metadata: Metadata = {
  title: "Claim review",
  robots: "noindex, nofollow",
};

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function AdminClaimsPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const { data } = await supabase
    .from("sg_claim_requests")
    .select(
      "id, email, phone, created_at, agent_id, sg_agents!inner(name, slug, agency_name, primary_area, cea_registration, score)"
    )
    .eq("status", "manual_review")
    .order("created_at", { ascending: true })
    .limit(200);

  const claims: ClaimRow[] = (data ?? []).map((c) => {
    const joined = c.sg_agents as unknown;
    const a = ((Array.isArray(joined) ? joined[0] : joined) ?? {}) as Record<string, unknown>;
    return {
      id: Number(c.id),
      email: String(c.email ?? ""),
      phone: (c.phone as string) ?? null,
      created_at: String(c.created_at ?? ""),
      agent_id: Number(c.agent_id),
      agent_name: String(a.name ?? ""),
      agent_slug: (a.slug as string) ?? null,
      agency_name: (a.agency_name as string) ?? null,
      primary_area: (a.primary_area as string) ?? null,
      cea_registration: (a.cea_registration as string) ?? null,
      score: a.score != null ? Number(a.score) : null,
    };
  });

  return (
    <div className="mx-auto min-h-screen max-w-[1100px] bg-gray-50 px-5 py-8 md:px-10">
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Admin</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">Claim review</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Claim requests that could not be auto-verified by email (no on-file address) wait here. Verify the person is
            the agent out of band, then approve. Approving marks the profile claimed, records the agent agreement, and
            emails them a confirmation. Rejecting discards the request.
          </p>
        </div>
        <a
          href="/admin"
          className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
        >
          Back to dashboard
        </a>
      </div>

      <ClaimsQueue claims={claims} />
    </div>
  );
}
