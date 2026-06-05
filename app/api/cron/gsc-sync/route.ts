import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { gscConfigured, gscAccessToken, querySearchAnalytics, type GscRow } from "../../../lib/gsc";

// Daily cron: pull Search Console data into fc_gsc_daily_stats.
// - dimension 'date'  : one row per day for the trailing 31 days (history kept)
// - dimension 'query' : top 100 queries over the last 28 days (rolling snapshot)
// - dimension 'page'  : top 100 pages over the last 28 days (rolling snapshot)
// GSC data lags ~2 days, so the window ends at today-2.

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  if (!gscConfigured()) {
    return NextResponse.json({ ok: false, reason: "GSC not configured (set GSC_SA_EMAIL + GSC_SA_PRIVATE_KEY)" });
  }

  const now = Date.now();
  const end = new Date(now - 2 * 86_400_000); // GSC lag
  const startDaily = new Date(now - 31 * 86_400_000);
  const start28 = new Date(now - 28 * 86_400_000);
  const endStr = ymd(end);
  const sb = supabaseAdmin();

  try {
    const token = await gscAccessToken();

    const toRow = (r: GscRow, dimension: string, dateVal: string) => ({
      date: dateVal,
      dimension,
      dimension_value: r.keys[0] ?? null,
      clicks: Math.round(r.clicks ?? 0),
      impressions: Math.round(r.impressions ?? 0),
      ctr: r.ctr ?? 0,
      position: r.position ?? 0,
      fetched_at: new Date(now).toISOString(),
    });

    // ---- daily series (keep history; refresh the trailing window) ----
    const dateRows = await querySearchAnalytics(token, {
      startDate: ymd(startDaily),
      endDate: endStr,
      dimensions: ["date"],
      rowLimit: 1000,
    });
    await sb.from("fc_gsc_daily_stats").delete().eq("dimension", "date").gte("date", ymd(startDaily));
    if (dateRows.length) {
      await sb.from("fc_gsc_daily_stats").insert(dateRows.map((r) => toRow(r, "date", r.keys[0])));
    }

    // ---- top queries (28d rolling snapshot) ----
    const queryRows = await querySearchAnalytics(token, {
      startDate: ymd(start28),
      endDate: endStr,
      dimensions: ["query"],
      rowLimit: 100,
    });
    await sb.from("fc_gsc_daily_stats").delete().eq("dimension", "query");
    if (queryRows.length) {
      await sb.from("fc_gsc_daily_stats").insert(queryRows.map((r) => toRow(r, "query", endStr)));
    }

    // ---- top pages (28d rolling snapshot) ----
    const pageRows = await querySearchAnalytics(token, {
      startDate: ymd(start28),
      endDate: endStr,
      dimensions: ["page"],
      rowLimit: 100,
    });
    await sb.from("fc_gsc_daily_stats").delete().eq("dimension", "page");
    if (pageRows.length) {
      await sb.from("fc_gsc_daily_stats").insert(pageRows.map((r) => toRow(r, "page", endStr)));
    }

    return NextResponse.json({
      ok: true,
      window: { start: ymd(startDaily), end: endStr },
      days: dateRows.length,
      queries: queryRows.length,
      pages: pageRows.length,
    });
  } catch (err) {
    console.error("[cron/gsc-sync]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "GSC sync failed" },
      { status: 502 }
    );
  }
}
