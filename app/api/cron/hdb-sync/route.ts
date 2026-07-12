import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 300;

// Scheduled HDB resale sync. Keeps sg_hdb_transactions fresh so it can never
// silently drift incomplete again (the original 2025 gap was caused by having
// NO sync at all). data.gov.sg publishes by registration month and recent
// months keep accruing, while older months are immutable, so each run
// re-mirrors only a trailing window (default 6 months) rather than all ~235k
// rows. That keeps the run well inside the serverless duration cap.
//
// Pipeline: fetch the window from data.gov.sg (newest-first, stop past the
// cutoff) -> load it into sg_hdb_transactions_staging -> call
// sync_hdb_recent_window(cutoff), which atomically replaces exactly those
// months in the live table (and refuses to wipe if staging is empty). The full
// one-shot rebuild lives in scripts/sync-hdb-resale.mjs.

const API = "https://data.gov.sg/api/action/datastore_search";
const RESOURCE = "d_8b84c4ee58e3cfc0ece0d773c8ca6abc";
const PAGE = 5000;
const MAX_OFFSET = 60000; // hard safety cap (~12 pages; any window is far smaller)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Raw = Record<string, unknown>;
type Row = {
  month: string;
  town: string | null;
  flat_type: string | null;
  block: string | null;
  street_name: string | null;
  storey_range: string | null;
  floor_area_sqm: number | null;
  flat_model: string | null;
  lease_commence_date: string | null;
  remaining_lease: string | null;
  resale_price: number | null;
};

const numOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const strOrNull = (v: unknown): string | null =>
  v === null || v === undefined || v === "" ? null : String(v).trim();

function mapRow(r: Raw): Row | null {
  const month = strOrNull(r.month);
  const price = numOrNull(r.resale_price);
  if (!month || price === null) return null;
  return {
    month,
    town: strOrNull(r.town),
    flat_type: strOrNull(r.flat_type),
    block: strOrNull(r.block),
    street_name: strOrNull(r.street_name),
    storey_range: strOrNull(r.storey_range),
    floor_area_sqm: numOrNull(r.floor_area_sqm),
    flat_model: strOrNull(r.flat_model),
    lease_commence_date: strOrNull(r.lease_commence_date),
    remaining_lease: strOrNull(r.remaining_lease),
    resale_price: price,
  };
}

async function apiPage(offset: number): Promise<Raw[]> {
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const res = await fetch(`${API}?resource_id=${RESOURCE}&sort=month%20desc&offset=${offset}&limit=${PAGE}`);
      if (res.status === 429) { await sleep(2000 * (attempt + 1)); continue; }
      const j = await res.json();
      if (!j?.success) { await sleep(800 * (attempt + 1)); continue; }
      return (j.result?.records ?? []) as Raw[];
    } catch {
      await sleep(800 * (attempt + 1));
    }
  }
  throw new Error(`data.gov.sg fetch failed at offset ${offset}`);
}

// Trailing window cutoff, 'YYYY-MM', for the (monthsBack-1)-th month before the
// current one, so the window covers the current month plus monthsBack-1 priors.
function windowCutoff(monthsBack: number): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (monthsBack - 1), 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const url = new URL(req.url);
  const monthsBack = Math.min(24, Math.max(2, Number(url.searchParams.get("months")) || 6));
  const cutoff = windowCutoff(monthsBack);
  const sb = supabaseAdmin();

  try {
    // 1. Fetch the trailing window from data.gov.sg (newest-first; stop once a
    //    whole page falls before the cutoff).
    const rows: Row[] = [];
    for (let offset = 0; offset <= MAX_OFFSET; offset += PAGE) {
      const recs = await apiPage(offset);
      if (recs.length === 0) break;
      let anyInWindow = false;
      for (const r of recs) {
        if (String(r.month ?? "") >= cutoff) {
          const mapped = mapRow(r);
          if (mapped) rows.push(mapped);
          anyInWindow = true;
        }
      }
      if (!anyInWindow) break; // desc sort => everything past here is older
    }

    // 2. Guard: never wipe the window on a bad/empty fetch. A real 6-month
    //    window is ~12k rows; anything tiny means the source call failed.
    if (rows.length < 500) {
      return NextResponse.json(
        { ok: false, reason: "fetch returned too few rows; skipped swap to avoid data loss", cutoff, fetched: rows.length },
        { status: 502 },
      );
    }

    // 3. Load the window into staging, tagged with a per-run id. Two overlapping
    //    runs (a manual re-trigger during the cron, or Vercel's at-least-once
    //    delivery) therefore never see or clobber each other's staged rows.
    const runId = crypto.randomUUID();
    for (let i = 0; i < rows.length; i += 1000) {
      const { error } = await sb
        .from("sg_hdb_transactions_staging")
        .insert(rows.slice(i, i + 1000).map((r) => ({ ...r, run_id: runId })));
      if (error) throw error;
    }

    // 4. Atomic swap of exactly THIS run's window into the live table (the RPC
    //    also deletes this run's staged rows afterward). Concurrent runs each
    //    swap a complete window, so the live table is always consistent.
    const { data: swap, error: rpcErr } = await sb.rpc("sync_hdb_recent_window", {
      p_cutoff: cutoff,
      p_run_id: runId,
    });
    if (rpcErr) throw rpcErr;

    return NextResponse.json({ ok: true, cutoff, monthsBack, fetched: rows.length, runId, swap });
  } catch (err) {
    console.error("[cron/hdb-sync]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "HDB sync failed" },
      { status: 502 },
    );
  }
}
