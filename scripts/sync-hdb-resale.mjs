// Sync HDB resale flat prices from data.gov.sg into Supabase.
//
// Source: "Resale Flat Prices (based on registration date), 2017 onwards"
//   dataset d_8b84c4ee58e3cfc0ece0d773c8ca6abc  (~235k rows, monthly)
// The columns map 1:1 onto sg_hdb_transactions, so the table is a pure mirror
// with no local enrichment. This is the ingestion that was MISSING (only CEA
// data had a sync script), which is why the table drifted incomplete for
// 2025-01..2025-10.
//
// Modes:
//   load-staging   truncate + reload the FULL dataset into
//                  sg_hdb_transactions_staging (non-destructive to the live
//                  table). The validated swap into sg_hdb_transactions is run
//                  separately in SQL after checking the staging row count.
//
// Usage: node scripts/sync-hdb-resale.mjs load-staging

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

function loadEnvLocal() {
  try {
    const txt = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of txt.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!(m[1] in process.env)) process.env[m[1]] = v;
    }
  } catch { /* env may come from the shell */ }
}
loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const RESOURCE = "d_8b84c4ee58e3cfc0ece0d773c8ca6abc";
const API = "https://data.gov.sg/api/action/datastore_search";
const PAGE = 5000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function apiPage(offset, limit) {
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      const res = await fetch(`${API}?resource_id=${RESOURCE}&offset=${offset}&limit=${limit}`);
      if (res.status === 429) { await sleep(2500 * (attempt + 1)); continue; }
      const j = await res.json();
      if (!j.success) { await sleep(1000 * (attempt + 1)); continue; }
      return j.result;
    } catch {
      await sleep(1000 * (attempt + 1));
    }
  }
  throw new Error(`data.gov.sg fetch failed at offset ${offset}`);
}

const numOrNull = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const strOrNull = (v) => (v === null || v === undefined || v === "" ? null : String(v).trim());

function mapRow(r) {
  return {
    month: strOrNull(r.month),
    town: strOrNull(r.town),
    flat_type: strOrNull(r.flat_type),
    block: strOrNull(r.block),
    street_name: strOrNull(r.street_name),
    storey_range: strOrNull(r.storey_range),
    floor_area_sqm: numOrNull(r.floor_area_sqm),
    flat_model: strOrNull(r.flat_model),
    lease_commence_date: strOrNull(r.lease_commence_date),
    remaining_lease: strOrNull(r.remaining_lease),
    resale_price: numOrNull(r.resale_price),
  };
}

async function insertBatch(rows) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { error } = await sb.from("sg_hdb_transactions_staging").insert(rows);
    if (!error) return;
    if (attempt === 4) throw error;
    await sleep(1000 * (attempt + 1));
  }
}

async function loadStaging() {
  console.log("Truncating staging...");
  const { error: delErr } = await sb.from("sg_hdb_transactions_staging").delete().neq("month", "___never___");
  if (delErr) throw delErr;

  const first = await apiPage(0, 1);
  const total = first.total;
  console.log(`data.gov.sg total records: ${total}`);

  let fetched = 0;
  let inserted = 0;
  const INSERT_BATCH = 1000;
  let buffer = [];

  for (let offset = 0; offset < total; offset += PAGE) {
    const result = await apiPage(offset, PAGE);
    const recs = result.records ?? [];
    if (recs.length === 0) break;
    fetched += recs.length;
    for (const r of recs) {
      const row = mapRow(r);
      if (!row.month || row.resale_price === null) continue; // skip unusable rows
      buffer.push(row);
      if (buffer.length >= INSERT_BATCH) {
        await insertBatch(buffer);
        inserted += buffer.length;
        buffer = [];
      }
    }
    process.stdout.write(`\rfetched ${fetched}/${total}, inserted ${inserted}   `);
  }
  if (buffer.length) {
    await insertBatch(buffer);
    inserted += buffer.length;
  }
  console.log(`\nDone. fetched ${fetched}, inserted ${inserted} into staging.`);

  const { count } = await sb
    .from("sg_hdb_transactions_staging")
    .select("*", { count: "exact", head: true });
  console.log(`staging row count: ${count}`);
}

const mode = process.argv[2];
if (mode === "load-staging") {
  loadStaging().catch((e) => { console.error(e); process.exit(1); });
} else {
  console.error("Usage: node scripts/sync-hdb-resale.mjs load-staging");
  process.exit(1);
}
