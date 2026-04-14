import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Admin metrics API. Protected by a simple secret key.
 * Returns funnel metrics, email stats, and claim data.
 */
export async function GET(req: Request) {
  // Simple auth: check for admin key in query params
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  if (key !== process.env.ADMIN_SECRET_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    funnelAll,
    funnel7d,
    funnelToday,
    funnelDaily,
    topPages,
    topSources,
    emailTotal,
    email7d,
    emailBySource,
    claimedAgents,
    claimedWithProfile,
    recentEvents,
  ] = await Promise.all([
    // Funnel totals (all time)
    supabase.rpc("get_funnel_counts", {}),

    // Funnel totals (7 days)
    supabase
      .from("sg_funnel_events")
      .select("event")
      .gte("created_at", sevenDaysAgo),

    // Funnel totals (today)
    supabase
      .from("sg_funnel_events")
      .select("event")
      .gte("created_at", today),

    // Daily event counts (last 30 days)
    supabase
      .from("sg_funnel_events")
      .select("event, created_at")
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: true }),

    // Top pages by profile_view
    supabase
      .from("sg_funnel_events")
      .select("page_path")
      .eq("event", "profile_view")
      .gte("created_at", sevenDaysAgo),

    // Top sources for email_capture
    supabase
      .from("sg_funnel_events")
      .select("source")
      .eq("event", "email_capture")
      .gte("created_at", thirtyDaysAgo),

    // Email subscribers total
    supabase
      .from("sg_email_subscribers")
      .select("id", { count: "exact", head: true })
      .eq("unsubscribed", false),

    // Email subscribers last 7 days
    supabase
      .from("sg_email_subscribers")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo)
      .eq("unsubscribed", false),

    // Email by source
    supabase
      .from("sg_email_subscribers")
      .select("source")
      .eq("unsubscribed", false),

    // Claimed agents total
    supabase
      .from("sg_agents")
      .select("id", { count: "exact", head: true })
      .eq("claimed", true),

    // Claimed agents with profile data
    supabase
      .from("sg_agents")
      .select("id", { count: "exact", head: true })
      .eq("claimed", true)
      .or("bio.neq.null,photo_url.neq.null,whatsapp.neq.null"),

    // Recent events (last 50)
    supabase
      .from("sg_funnel_events")
      .select("event, agent_id, agent_slug, source, page_path, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  // Aggregate funnel counts from raw data
  function countEvents(data: { event: string }[] | null): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      counts[row.event] = (counts[row.event] || 0) + 1;
    }
    return counts;
  }

  // Aggregate daily counts
  function dailyCounts(data: { event: string; created_at: string }[] | null): Record<string, Record<string, number>> {
    const result: Record<string, Record<string, number>> = {};
    for (const row of data ?? []) {
      const day = row.created_at.slice(0, 10);
      if (!result[day]) result[day] = {};
      result[day][row.event] = (result[day][row.event] || 0) + 1;
    }
    return result;
  }

  // Top N aggregation
  function topN(data: { page_path?: string | null; source?: string | null }[] | null, field: "page_path" | "source", n: number) {
    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      const val = row[field] || "(unknown)";
      counts[val] = (counts[val] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([name, count]) => ({ name, count }));
  }

  // Email by source aggregation
  function emailSourceCounts(data: { source: string | null }[] | null) {
    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      const src = row.source || "(unknown)";
      counts[src] = (counts[src] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([source, count]) => ({ source, count }));
  }

  const counts7d = countEvents(funnel7d.data as { event: string }[] | null);
  const countsToday = countEvents(funnelToday.data as { event: string }[] | null);

  return NextResponse.json({
    funnel: {
      allTime: funnelAll.data ?? countEvents(null),
      last7d: counts7d,
      today: countsToday,
    },
    daily: dailyCounts(funnelDaily.data as { event: string; created_at: string }[] | null),
    topProfilePages: topN(topPages.data as { page_path: string }[] | null, "page_path", 20),
    topEmailSources: topN(topSources.data as { source: string }[] | null, "source", 10),
    email: {
      total: emailTotal.count ?? 0,
      last7d: email7d.count ?? 0,
      bySource: emailSourceCounts(emailBySource.data as { source: string }[] | null),
    },
    claims: {
      total: claimedAgents.count ?? 0,
      withProfile: claimedWithProfile.count ?? 0,
    },
    recentEvents: recentEvents.data ?? [],
  });
}
