import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import { getAdminSession } from "../../lib/admin-auth";
import { ModerationQueue } from "./ModerationQueue";
import { ReviewModeration, type PendingReview } from "./ReviewModeration";

export const metadata: Metadata = {
  title: "Moderation Queue",
  robots: "noindex, nofollow",
};

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function AdminModerationPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const [msgRes, photoRes, bioRes, nameRes] = await Promise.all([
    supabase
      .from("sg_agents")
      .select("id, name, slug, agency_name, primary_area, message, message_updated_at, photo_url")
      .eq("message_status", "pending")
      .not("message", "is", null)
      .order("message_updated_at", { ascending: true })
      .limit(100),
    supabase
      .from("sg_agents")
      .select("id, name, slug, agency_name, primary_area, photo_url, photo_updated_at")
      .eq("photo_status", "pending")
      .not("photo_url", "is", null)
      .order("photo_updated_at", { ascending: true })
      .limit(100),
    supabase
      .from("sg_agents")
      .select("id, name, slug, agency_name, primary_area, bio, bio_updated_at, photo_url")
      .eq("bio_status", "pending")
      .not("bio", "is", null)
      .order("bio_updated_at", { ascending: true })
      .limit(100),
    supabase
      .from("sg_agents")
      .select("id, name, slug, agency_name, primary_area, marketing_name, marketing_name_updated_at, photo_url")
      .eq("marketing_name_status", "pending")
      .not("marketing_name", "is", null)
      .order("marketing_name_updated_at", { ascending: true })
      .limit(100),
  ]);

  // Community (open) reviews that confirmed their email and await moderation.
  const { data: reviewRows } = await supabase
    .from("sg_agent_reviews")
    .select("id, reviewer_name, rating_overall, transaction_type, comment, created_at, sg_agents!inner(name, slug, agency_name)")
    .eq("status", "pending")
    .eq("verified_completion", false)
    .order("created_at", { ascending: true })
    .limit(100);

  const pendingReviews: PendingReview[] = (reviewRows ?? []).map((r) => {
    const j = (Array.isArray(r.sg_agents) ? r.sg_agents[0] : r.sg_agents) as
      | { name?: string; slug?: string | null; agency_name?: string | null }
      | undefined;
    return {
      id: Number(r.id),
      agent_name: j?.name ?? "",
      agent_slug: j?.slug ?? null,
      agency_name: j?.agency_name ?? null,
      reviewer_name: String(r.reviewer_name ?? ""),
      rating_overall: Number(r.rating_overall ?? 0),
      transaction_type: (r.transaction_type as string | null) ?? null,
      comment: String(r.comment ?? ""),
      created_at: (r.created_at as string | null) ?? null,
    };
  });

  return (
    <div className="mx-auto min-h-screen max-w-[1200px] bg-gray-50 px-5 py-8 md:px-10">
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Admin</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">Moderation queue</h1>
          <p className="mt-1 text-sm text-gray-500">
            UGC from claimed profiles waits here for approval. First edits per agent are pending; the admin approves or
            rejects. Rejected content is cleared from the public profile.
          </p>
        </div>
        <a
          href="/admin"
          className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
        >
          Back to dashboard
        </a>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-gray-500">
          Community reviews ({pendingReviews.length})
        </h2>
        <ReviewModeration reviews={pendingReviews} />
      </section>

      <ModerationQueue
        messages={(msgRes.data ?? []) as Array<{
          id: number;
          name: string;
          slug: string;
          agency_name: string | null;
          primary_area: string | null;
          message: string;
          message_updated_at: string | null;
          photo_url: string | null;
        }>}
        photos={(photoRes.data ?? []) as Array<{
          id: number;
          name: string;
          slug: string;
          agency_name: string | null;
          primary_area: string | null;
          photo_url: string;
          photo_updated_at: string | null;
        }>}
        bios={(bioRes.data ?? []) as Array<{
          id: number;
          name: string;
          slug: string;
          agency_name: string | null;
          primary_area: string | null;
          bio: string;
          bio_updated_at: string | null;
          photo_url: string | null;
        }>}
        marketingNames={(nameRes.data ?? []) as Array<{
          id: number;
          name: string;
          slug: string;
          agency_name: string | null;
          primary_area: string | null;
          marketing_name: string;
          marketing_name_updated_at: string | null;
          photo_url: string | null;
        }>}
      />
    </div>
  );
}
