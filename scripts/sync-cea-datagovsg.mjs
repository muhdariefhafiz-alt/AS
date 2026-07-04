// Sync CEA open data from data.gov.sg into Supabase.
//
// Two source datasets (free, openly licensed):
//   Dataset 1  d_07c63be0f37e6e59c07a4ddc2fd87fcb  CEA Salesperson Information (daily)
//   Dataset 2  d_ee7e46d3c57f7865790704632b0aef71  CEA Property Transaction Records (monthly, ~1.33M)
//
// Modes:
//   reconcile      print our counts vs data.gov.sg totals + gaps (read-only)
//   agents         upsert Dataset 1 into sg_agents (insert missing, set cea_status, refresh agency)
//   load-staging   bulk-load Dataset 2 into sg_agent_transactions_staging (non-destructive)
//
// The destructive swap (truncate + insert-select), score recompute, and area refresh
// are run separately via SQL after validating the staging count.
//
// Usage: node scripts/sync-cea-datagovsg.mjs <mode>

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

const DS_AGENTS = "d_07c63be0f37e6e59c07a4ddc2fd87fcb";
const DS_TXNS = "d_ee7e46d3c57f7865790704632b0aef71";
const API = "https://data.gov.sg/api/action/datastore_search";
const PAGE = 5000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function apiPage(resourceId, offset, limit) {
  for (let attempt = 0; attempt < 7; attempt++) {
    try {
      const res = await fetch(`${API}?resource_id=${resourceId}&offset=${offset}&limit=${limit}`);
      if (res.status === 429) { await sleep(2500 * (attempt + 1)); continue; }
      const j = await res.json();
      if (!j.success) { await sleep(1000 * (attempt + 1)); continue; }
      return j.result;
    } catch {
      await sleep(1000 * (attempt + 1));
    }
  }
  throw new Error(`data.gov.sg API failed at offset ${offset}`);
}

async function* iterate(resourceId, label) {
  let offset = 0, total = null;
  while (true) {
    const r = await apiPage(resourceId, offset, PAGE);
    if (total === null) { total = r.total; console.error(`  ${label} total=${total}`); }
    const recs = r.records || [];
    if (recs.length === 0) break;
    yield recs;
    offset += recs.length;
    if (offset >= total) break;
    await sleep(150);
  }
}

function slugify(s) {
  return (s || "").toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "")
    .trim().replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 70);
}

async function countRows(table) {
  const { count, error } = await sb.from(table).select("*", { count: "exact", head: true });
  if (error) throw error;
  return count;
}

async function reconcile() {
  const a = await apiPage(DS_AGENTS, 0, 1);
  const t = await apiPage(DS_TXNS, 0, 1);
  const ourAgents = await countRows("sg_agents");
  const ourTxns = await countRows("sg_agent_transactions");
  console.log(JSON.stringify({
    agents: { ours: ourAgents, datagov: a.total, gap: a.total - ourAgents },
    transactions: { ours: ourTxns, datagov: t.total, gap: t.total - ourTxns },
  }, null, 2));
}

async function syncAgents() {
  console.error("Loading existing agents (reg + slug)...");
  const existingReg = new Set();
  const slugs = new Set();
  let from = 0; const span = 1000;
  while (true) {
    const { data, error } = await sb.from("sg_agents").select("cea_registration,slug").range(from, from + span - 1);
    if (error) throw error;
    if (!data.length) break;
    for (const r of data) { if (r.cea_registration) existingReg.add(r.cea_registration); if (r.slug) slugs.add(r.slug); }
    if (data.length < span) break;
    from += span;
  }
  console.error(`  existing agents: ${existingReg.size}`);

  const today = new Date().toISOString().slice(0, 10);
  const nowIso = new Date().toISOString();
  const inserts = [];
  const updates = [];
  let seen = 0;
  for await (const recs of iterate(DS_AGENTS, "agents")) {
    for (const r of recs) {
      seen++;
      const reg = (r.registration_no || "").trim();
      if (!reg) continue;
      const name = (r.salesperson_name || "").trim();
      const agency = (r.estate_agent_name || "").trim() || null;
      const end = (r.registration_end_date || "").trim();
      const status = end ? (end >= today ? "active" : "lapsed") : "active";
      if (existingReg.has(reg)) {
        updates.push({ cea_registration: reg, name, agency_name: agency, cea_status: status, cea_status_checked_at: nowIso });
      } else {
        let base = slugify(name) || ("agent-" + reg.toLowerCase());
        let slug = base, n = 1;
        while (slugs.has(slug)) {
          slug = `${base}-${reg.slice(-4).toLowerCase()}`;
          if (slugs.has(slug)) slug = `${base}-${n++}`;
        }
        slugs.add(slug);
        existingReg.add(reg);
        inserts.push({ name, slug, cea_registration: reg, agency_name: agency, cea_status: status, cea_status_checked_at: nowIso, created_at: nowIso });
      }
    }
  }
  console.error(`  parsed ${seen}; to insert=${inserts.length}, to update=${updates.length}`);

  let u = 0;
  for (let i = 0; i < updates.length; i += 500) {
    const { error } = await sb.from("sg_agents").upsert(updates.slice(i, i + 500), { onConflict: "cea_registration" });
    if (error) throw new Error("update batch: " + error.message);
    u += Math.min(500, updates.length - i);
    if (u % 5000 < 500) console.error(`  updated ${u}/${updates.length}`);
  }
  let ins = 0;
  for (let i = 0; i < inserts.length; i += 500) {
    const { error } = await sb.from("sg_agents").insert(inserts.slice(i, i + 500));
    if (error) throw new Error("insert batch: " + error.message);
    ins += Math.min(500, inserts.length - i);
    console.error(`  inserted ${ins}/${inserts.length}`);
  }

  // Lapse detection: any agent NOT seen in this run (not on the current active
  // register) is marked lapsed. Active rows just got cea_status_checked_at=nowIso,
  // so anything older-or-null was not in today's register.
  const { error: lapseErr, count: lapsed } = await sb
    .from("sg_agents")
    .update({ cea_status: "lapsed", cea_status_checked_at: new Date().toISOString() }, { count: "exact" })
    .neq("cea_status", "lapsed")
    .or(`cea_status_checked_at.is.null,cea_status_checked_at.lt.${nowIso}`);
  if (lapseErr) throw new Error("lapse marking: " + lapseErr.message);

  console.log(JSON.stringify({ inserted: inserts.length, updated: updates.length, lapsed: lapsed ?? 0 }));
}

async function loadStaging() {
  let loaded = 0;
  for await (const recs of iterate(DS_TXNS, "txns")) {
    const rows = recs.map((r) => ({
      salesperson_name: r.salesperson_name,
      salesperson_reg_num: r.salesperson_reg_num,
      transaction_date: r.transaction_date,
      property_type: r.property_type,
      transaction_type: r.transaction_type,
      represented: r.represented,
      town: r.town,
      district: r.district,
      general_location: r.general_location,
    }));
    for (let i = 0; i < rows.length; i += 2500) {
      const { error } = await sb.from("sg_agent_transactions_staging").insert(rows.slice(i, i + 2500));
      if (error) throw new Error("staging insert: " + error.message);
    }
    loaded += rows.length;
    if (loaded % 50000 < PAGE) console.error(`  staged ${loaded}`);
  }
  console.log(JSON.stringify({ staged: loaded }));
}

async function truncateStaging() {
  const { error } = await sb.rpc("truncate_staging_transactions");
  if (error) throw new Error("truncate staging: " + error.message);
  console.log(JSON.stringify({ truncated: true }));
}

// Guarded swap of staging -> live (see promote_staging_transactions). Exits
// non-zero if the guard refuses (partial load), so a CI pipeline fails loudly.
async function promote() {
  const { data, error } = await sb.rpc("promote_staging_transactions");
  if (error) throw new Error("promote: " + error.message);
  console.log(JSON.stringify(data));
  if (data && data.ok === false) process.exit(2);
}

const mode = process.argv[2];
const run = {
  reconcile,
  agents: syncAgents,
  "load-staging": loadStaging,
  "truncate-staging": truncateStaging,
  promote,
}[mode];
if (!run) {
  console.error("Usage: node scripts/sync-cea-datagovsg.mjs <reconcile|agents|truncate-staging|load-staging|promote>");
  process.exit(1);
}
run().then(() => process.exit(0)).catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
