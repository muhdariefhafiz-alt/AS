import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

/**
 * Daily ISR revalidation cron.
 * Purges Next.js cache for high-value pages so fresh Supabase data appears.
 * Runs daily at 3am SGT (7pm UTC previous day).
 *
 * This is the core SEO freshness signal: Google sees updated scores,
 * transaction counts, and agent rankings every day without a full redeploy.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const revalidated: string[] = [];
  const errors: string[] = [];

  // High-priority pages that should always show fresh data
  const paths = [
    // Homepage + hub pages
    "/",
    "/property-agents",
    "/insights",
    "/insights/top-agents-2026",
    "/insights/million-dollar-hdb",
    "/insights/freehold-premium",
    // Search + compare (dynamic, but layout can cache)
    "/search",
    "/property-agents/compare",
    // For-agents landing (shows live agent count)
    "/for-agents",
  ];

  for (const path of paths) {
    try {
      revalidatePath(path);
      revalidated.push(path);
    } catch (err) {
      errors.push(`${path}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Blanket purge of all ~38k agent profile pages: WEEKLY (Sundays), not daily.
  // The pages already self-refresh every 12h via ISR (revalidate = 43200), so a
  // daily sitewide purge added no freshness; it just turned the next day's crawl
  // of the whole surface into cache-miss re-renders (~1M observability events/day
  // and matching Supabase load). Weekly still clears any transiently-bad render
  // (e.g. an agent whose track RPC blipped) without daily cache carnage.
  if (new Date().getUTCDay() === 0) {
    try {
      revalidatePath("/property-agents/agent/[slug]", "page");
      revalidated.push("/property-agents/agent/[slug] (all, weekly)");
    } catch (err) {
      errors.push(`agent/[slug]: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Revalidate all area "best agent" pages (28 areas)
  // These are the money pages for SEO - agent rankings per area
  try {
    revalidatePath("/property-agents/best/[area]", "page");
    revalidated.push("/property-agents/best/[area] (all)");
  } catch (err) {
    errors.push(`best/[area]: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Revalidate all HDB town "best agent" pages (26 towns)
  try {
    revalidatePath("/property-agents/best/hdb/[town]", "page");
    revalidated.push("/property-agents/best/hdb/[town] (all)");
  } catch (err) {
    errors.push(`best/hdb/[town]: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Revalidate HDB price pages
  try {
    revalidatePath("/property-agents/hdb/[town]", "page");
    revalidated.push("/property-agents/hdb/[town] (all)");
  } catch (err) {
    errors.push(`hdb/[town]: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Revalidate district pages
  try {
    revalidatePath("/property-agents/district/[code]", "page");
    revalidated.push("/property-agents/district/[code] (all)");
  } catch (err) {
    errors.push(`district/[code]: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Revalidate budget pages
  try {
    revalidatePath("/property-agents/budget/[range]", "page");
    revalidated.push("/property-agents/budget/[range] (all)");
  } catch (err) {
    errors.push(`budget/[range]: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Revalidate type pages
  try {
    revalidatePath("/property-agents/best-by-type/[type]", "page");
    revalidated.push("/property-agents/best-by-type/[type] (all)");
  } catch (err) {
    errors.push(`best-by-type/[type]: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Seller landing pages: now data-driven (12mo medians/volumes from RPCs), so
  // they must refresh daily like the other evidence pages, not sit on a stale
  // build for up to 24h.
  for (const [path, label] of [
    ["/sell/hdb/[town]", "sell/hdb/[town]"],
    ["/sell/condo/[district]", "sell/condo/[district]"],
  ] as const) {
    try {
      revalidatePath(path, "page");
      revalidated.push(`${path} (all)`);
    } catch (err) {
      errors.push(`${label}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const duration = Date.now() - started;

  return NextResponse.json({
    ok: true,
    revalidated: revalidated.length,
    paths: revalidated,
    errors: errors.length > 0 ? errors : undefined,
    duration_ms: duration,
  });
}
