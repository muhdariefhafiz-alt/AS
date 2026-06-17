#!/usr/bin/env node
/*
 * Source public contact numbers for the supply-activation target agents.
 *
 * For each agent it asks Apify's rag-web-browser (a real headless browser, so it
 * gets past most anti-bot) to Google "<name> <agency> property agent Singapore
 * contact" and scrape the top results, then extracts a Singapore mobile from the
 * agency-portal markdown (the wa.me / tel: link, e.g. ERA/PropNex portals expose
 * it directly). PropertyGuru and SRX block scraping; the agency portals and
 * SGPBusiness do not, and the #1 result usually carries the number.
 *
 * Usage:
 *   export APIFY_TOKEN=apify_api_xxx
 *   node scripts/source-agent-contacts.mjs targets.csv > contacts.csv
 *
 * targets.csv: header row, then `name,cea,agency,slug` per line (export it from
 * the SQL in docs/growth-experiments/supply-activation-kit.md). Output CSV:
 * name,cea,mobile,source_url. Be a good citizen: this is rate-limited and meant
 * for a few hundred rows, not the whole register.
 */
import { readFileSync } from "node:fs";

const TOKEN = process.env.APIFY_TOKEN;
if (!TOKEN) {
  console.error("Set APIFY_TOKEN (Apify account > Settings > Integrations).");
  process.exit(1);
}
const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/source-agent-contacts.mjs targets.csv > contacts.csv");
  process.exit(1);
}

// Minimal CSV parse (handles simple quoted fields, no embedded newlines).
function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.match(/("([^"]|"")*"|[^,]*)/g).filter((_, i, a) => i < a.length - 1);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = (cells[i] ?? "").replace(/^"|"$/g, "").replace(/""/g, '"').trim();
    });
    return row;
  });
}

// Extract a Singapore mobile (8/9 + 7 more digits) from page markdown. Prefer the
// explicit wa.me / tel links agency portals expose, fall back to a bare number.
function extractMobile(markdown) {
  if (!markdown) return null;
  const wa = markdown.match(/wa\.me\/(?:65)?(\d{8})/i) || markdown.match(/tel:(?:\+?65)?(\d{8})/i);
  if (wa) return wa[1];
  const bare = markdown.match(/(?:\+?65[\s-]?)?([89]\d{3})[\s-]?(\d{4})/);
  if (bare) return bare[1] + bare[2];
  return null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function lookup(agent) {
  const query = `${agent.name.replace(/\(.*?\)/g, "").trim()} ${agent.agency} property agent Singapore contact`;
  const url =
    `https://api.apify.com/v2/acts/apify~rag-web-browser/run-sync-get-dataset-items?token=${TOKEN}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, maxResults: 3, outputFormats: ["markdown"] }),
  });
  if (!res.ok) return { mobile: null, source: `apify ${res.status}` };
  const items = await res.json();
  for (const it of items ?? []) {
    const mobile = extractMobile(it.markdown);
    if (mobile) return { mobile, source: it.metadata?.url || it.searchResult?.url || "" };
  }
  return { mobile: null, source: "" };
}

const targets = parseCsv(readFileSync(file, "utf8"));
console.log("name,cea,mobile,source_url");
for (const a of targets) {
  let r = { mobile: null, source: "" };
  try {
    r = await lookup(a);
  } catch (e) {
    r = { mobile: null, source: `err: ${e.message}` };
  }
  const cells = [a.name, a.cea, r.mobile ?? "", r.source].map((c) => `"${String(c).replace(/"/g, '""')}"`);
  console.log(cells.join(","));
  await sleep(1500); // be polite
}
