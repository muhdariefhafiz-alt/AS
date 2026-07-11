#!/usr/bin/env node
// One-shot MX sweep grading every ungraded scraped agent email address.
//
// For each distinct domain among sg_agents.email where email_status is null,
// resolve MX records; grade the agents at that domain 'mx_ok' or 'no_mx'.
// Domains that resolve keep their agents sendable; 'no_mx' addresses are
// provably undeliverable and every email-based feature can skip them instead
// of burning sender reputation on guaranteed bounces.
//
// Never overwrites an existing grade (bounced/complained/verified stay).
//
// Usage: node scripts/email-mx-sweep.mjs [--dry]
// Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.

import { readFileSync } from "node:fs";
import { resolveMx } from "node:dns/promises";
import { createClient } from "@supabase/supabase-js";

const DRY = process.argv.includes("--dry");

// Minimal .env.local parser: KEY=VALUE lines, no export, no quotes handling
// beyond trimming a single pair.
const env = {};
try {
  for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^"(.*)"$/, "$1");
  }
} catch {
  // fall through to process.env
}
const url = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const sb = createClient(url, key);

// Page through every ungraded email (PostgREST caps single reads at 1000).
async function fetchUngradedEmails() {
  const emails = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from("sg_agents")
      .select("email")
      .not("email", "is", null)
      .neq("email", "")
      .is("email_status", null)
      .range(from, from + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    emails.push(...data.map((r) => String(r.email)));
    if (data.length < 1000) break;
  }
  return emails;
}

const emails = await fetchUngradedEmails();
const domains = new Map(); // domain -> count
for (const e of emails) {
  const at = e.lastIndexOf("@");
  if (at < 1) continue;
  const d = e.slice(at + 1).toLowerCase().trim();
  if (!d || !d.includes(".")) continue;
  domains.set(d, (domains.get(d) ?? 0) + 1);
}
console.log(`${emails.length} ungraded emails across ${domains.size} domains`);

// Resolve MX with bounded concurrency; a 5s timeout counts as unresolved
// (graded no_mx only on a definitive empty/NXDOMAIN answer, timeouts skipped).
const results = new Map(); // domain -> 'mx_ok' | 'no_mx' | 'skip'
const queue = [...domains.keys()];
const CONCURRENCY = 20;
async function worker() {
  while (queue.length) {
    const d = queue.shift();
    try {
      const mx = await Promise.race([
        resolveMx(d),
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 5000)),
      ]);
      results.set(d, Array.isArray(mx) && mx.length > 0 ? "mx_ok" : "no_mx");
    } catch (err) {
      const code = err?.code ?? String(err?.message ?? err);
      // ENOTFOUND/ENODATA = definitively no mail host. Timeouts and transient
      // DNS failures are skipped, never graded down.
      results.set(d, code === "ENOTFOUND" || code === "ENODATA" ? "no_mx" : "skip");
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const ok = [...results].filter(([, v]) => v === "mx_ok");
const dead = [...results].filter(([, v]) => v === "no_mx");
const skipped = [...results].filter(([, v]) => v === "skip");
console.log(`mx_ok: ${ok.length} domains, no_mx: ${dead.length}, skipped(transient): ${skipped.length}`);
if (dead.length) console.log("dead domains:", dead.slice(0, 30).map(([d]) => d).join(", "));

if (DRY) {
  console.log("--dry: no writes");
  process.exit(0);
}

// Grade agents per domain, never clobbering an existing grade.
let updated = 0;
const nowIso = new Date().toISOString();
for (const [domain, grade] of results) {
  if (grade === "skip") continue;
  const { error, count } = await sb
    .from("sg_agents")
    .update(
      { email_status: grade, email_validated_at: nowIso },
      { count: "exact" }
    )
    .ilike("email", `%@${domain}`)
    .is("email_status", null);
  if (error) {
    console.error(`update failed for ${domain}:`, error.message);
    continue;
  }
  updated += count ?? 0;
}
console.log(`graded ${updated} agent emails`);
