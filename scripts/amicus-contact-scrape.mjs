#!/usr/bin/env node
// Enrich unreachable agents with WhatsApp numbers from the public amicus.sg
// rental-listing directory (onelogin.amicus.sg/quickeys). Pages are keyed by
// building, cards carry CEA registration + a tel: link, so we match to our
// agents by CEA reg (every agent has one) and fill sg_agents.whatsapp where it
// is null. Business-contact info, same basis as the existing scraped data.
//
// Deliberately bounded and polite: this is a third-party server. Low
// concurrency, a delay between requests, a per-run cap, and a resumable state
// file so we crawl incrementally rather than hammering.
//
// Usage:
//   node scripts/amicus-contact-scrape.mjs --harvest-only        # just count buildings
//   node scripts/amicus-contact-scrape.mjs --cap 250 --dry       # scrape 250, no writes
//   node scripts/amicus-contact-scrape.mjs --cap 250             # scrape 250, write matches
//
// Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const ARGS = process.argv.slice(2);
const arg = (name, def) => {
  const i = ARGS.indexOf(name);
  return i >= 0 ? (ARGS[i + 1] ?? true) : def;
};
const DRY = ARGS.includes("--dry");
const HARVEST_ONLY = ARGS.includes("--harvest-only");
const CAP = Number(arg("--cap", 250));

const BASE = "https://onelogin.amicus.sg/quickeys";
const AUTOCOMPLETE = `${BASE}/quickeys_autocomplete.asmx/GetCondoName`;
const CONTEXT_KEY = "F22Mig35VsBaA95MA5*#)-iWatchE6ValU";
const DETAIL = (slug) => `${BASE}/pages/CondominiumDetail.aspx?Name=${encodeURIComponent(slug)}`;
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

const STATE_DIR = "/private/tmp/claude-501/-Users-lexvanlynden-New/074593fd-c371-4dad-a79e-d13afcf89f51/scratchpad/amicus";
const STATE_FILE = `${STATE_DIR}/state.json`;
if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });

// --- env ---
const env = {};
try {
  for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^"(.*)"$/, "$1");
  }
} catch {}
const sbUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const sbKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!sbUrl || !sbKey) { console.error("Missing Supabase creds"); process.exit(1); }
const sb = createClient(sbUrl, sbKey);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function politeFetch(url, opts = {}, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { ...opts, headers: { "User-Agent": UA, ...(opts.headers || {}) } });
      if (res.ok) return res;
      if (res.status === 429 || res.status >= 500) { await sleep(1500 * (i + 1)); continue; }
      return res;
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(1000 * (i + 1));
    }
  }
}

// --- 1. Harvest building names via autocomplete prefix expansion ---
// The service caps ~10 results/prefix, so deepen a prefix only when it returns
// the cap (meaning more names share it). Cheap: small JSON responses.
async function harvestNames() {
  const names = new Set();
  const alpha = "abcdefghijklmnopqrstuvwxyz0123456789".split("");
  const queue = [...alpha];
  let queries = 0;
  while (queue.length) {
    const prefix = queue.shift();
    queries++;
    try {
      const res = await politeFetch(AUTOCOMPLETE, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ prefixText: prefix, count: 20, contextKey: CONTEXT_KEY }),
      });
      const json = await res.json().catch(() => ({ d: [] }));
      const list = json.d || [];
      for (const n of list) names.add(n);
      // Capped -> deepen one level (prefix + each next char).
      if (list.length >= 10 && prefix.length < 4) {
        for (const c of alpha) queue.push(prefix + c);
      }
    } catch {}
    if (queries % 50 === 0) { process.stdout.write(`\r  harvested ${names.size} names (${queries} queries)`); }
    await sleep(120);
  }
  process.stdout.write(`\r  harvested ${names.size} names (${queries} queries)\n`);
  return [...names];
}

// --- 2. Parse agent cards from a building detail page ---
function parseCards(html) {
  const out = [];
  // Split on the card delimiter so CEA + phone are paired within one card.
  const chunks = html.split(/class="member\s/).slice(1);
  for (const c of chunks) {
    const cea = c.match(/AgentPhoto\/(R\d{6}[A-Z])/i)?.[1] || c.match(/CEA\s*:\s*(R\d{6}[A-Z])/i)?.[1];
    const phone = c.match(/tel:(\+65\d{8})/i)?.[1] || c.match(/tel:(\d{8})/i)?.[1];
    if (!cea || !phone) continue;
    const agency = (c.match(/Agency\s*:\s*([^<]+)/i)?.[1] || "").trim().slice(0, 120);
    out.push({ cea: cea.toUpperCase(), phone: phone.startsWith("+") ? phone : `+65${phone}`, agency });
  }
  return out;
}

// --- main ---
const state = existsSync(STATE_FILE)
  ? JSON.parse(readFileSync(STATE_FILE, "utf8"))
  : { names: [], scraped: [], contacts: {} };

if (state.names.length === 0) {
  console.log("Harvesting building names via autocomplete...");
  state.names = await harvestNames();
  writeFileSync(STATE_FILE, JSON.stringify(state));
}
console.log(`Buildings known: ${state.names.length} | already scraped: ${state.scraped.length} | CEA->phone collected: ${Object.keys(state.contacts).length}`);

if (HARVEST_ONLY) process.exit(0);

// Scrape up to CAP not-yet-scraped buildings, concurrency 2.
const scrapedSet = new Set(state.scraped);
const todo = state.names.filter((n) => !scrapedSet.has(n)).slice(0, CAP);
console.log(`Scraping ${todo.length} buildings (cap ${CAP})...`);

let done = 0;
const CONC = 2;
async function worker(list) {
  for (const name of list) {
    const slug = name.replace(/\s+/g, "-");
    try {
      const res = await politeFetch(DETAIL(slug));
      if (res && res.ok) {
        const html = await res.text();
        for (const card of parseCards(html)) {
          if (!state.contacts[card.cea]) state.contacts[card.cea] = card.phone;
        }
      }
    } catch {}
    state.scraped.push(name);
    done++;
    if (done % 20 === 0) {
      writeFileSync(STATE_FILE, JSON.stringify(state));
      process.stdout.write(`\r  scraped ${done}/${todo.length} | CEA->phone: ${Object.keys(state.contacts).length}`);
    }
    await sleep(350);
  }
}
const slices = Array.from({ length: CONC }, (_, i) => todo.filter((_, idx) => idx % CONC === i));
await Promise.all(slices.map(worker));
writeFileSync(STATE_FILE, JSON.stringify(state));
process.stdout.write(`\r  scraped ${done}/${todo.length} | CEA->phone: ${Object.keys(state.contacts).length}\n`);

// --- 3. Match to our unreachable agents and fill whatsapp ---
const ceaList = Object.keys(state.contacts);
if (ceaList.length === 0) { console.log("No contacts collected."); process.exit(0); }

// Pull our agents missing a whatsapp whose CEA we now have a phone for.
const targets = [];
for (let i = 0; i < ceaList.length; i += 500) {
  const { data } = await sb
    .from("sg_agents")
    .select("id, cea_registration, whatsapp")
    .in("cea_registration", ceaList.slice(i, i + 500));
  for (const a of data || []) {
    if ((!a.whatsapp || a.whatsapp === "") && state.contacts[a.cea_registration]) {
      targets.push({ id: a.id, cea: a.cea_registration, phone: state.contacts[a.cea_registration] });
    }
  }
}
console.log(`Matched ${targets.length} of our agents missing whatsapp.`);

if (DRY) {
  console.log("--dry: no writes. Sample:", targets.slice(0, 5));
  process.exit(0);
}

let updated = 0;
for (const t of targets) {
  const { error } = await sb.from("sg_agents").update({ whatsapp: t.phone }).eq("id", t.id).is("whatsapp", null);
  if (!error) updated++;
}
console.log(`Updated whatsapp on ${updated} agents.`);
