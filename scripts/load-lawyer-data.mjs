import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://yhfdahkzukxglwikcdlo.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CASES_DATASET = "jyRiKZ8mQiFhQcXaV";
const COUNSEL_DATASET = "wN5151SMFXEW3y7qH";
const APIFY_TOKEN = process.env.APIFY_TOKEN;

async function fetchDataset(datasetId, offset = 0, limit = 1000) {
  const url = `https://api.apify.com/v2/datasets/${datasetId}/items?offset=${offset}&limit=${limit}&format=json`;
  const headers = APIFY_TOKEN ? { Authorization: `Bearer ${APIFY_TOKEN}` } : {};
  const res = await fetch(url, { headers });
  return res.json();
}

async function fetchAllDataset(datasetId) {
  const all = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const items = await fetchDataset(datasetId, offset, limit);
    if (!items || items.length === 0) break;
    all.push(...items);
    console.log(`  Fetched ${all.length} items from dataset ${datasetId}...`);
    if (items.length < limit) break;
    offset += limit;
  }
  return all;
}

function cleanCaseTypes(types) {
  if (!types || !Array.isArray(types)) return [];
  return types.filter(t =>
    t && t.length > 3 &&
    !t.match(/^\d{4}\]/) &&       // Remove citation fragments like "2024] SGHC 331 |"
    !t.match(/Decision Date/) &&
    !t.match(/\/[A-Z]+\s+\d/)     // Remove case numbers
  ).map(t => t.trim().replace(/\r\n/g, ' ').replace(/\s+/g, ' '));
}

function isValidLawyerName(name) {
  if (!name || name.length < 3) return false;
  if (name.length > 80) return false;
  // Filter out sentence fragments that got captured as names
  if (name.includes('order as to')) return false;
  if (name.includes('imposed')) return false;
  if (name.includes('inapplicable')) return false;
  if (name.includes('Judge of')) return false;
  if (name.match(/^(I|The|This|In|On|At|For|By|No|A|An)\s/)) return false;
  if (name.match(/\d{4}/)) return false;  // Contains year
  // Must look like a name (starts with capital, has at least 2 words or is SC)
  if (!/^[A-Z][a-z]/.test(name)) return false;
  return true;
}

function cleanFirm(firm) {
  if (!firm) return null;
  // Remove trailing role info that leaked into firm name
  return firm.replace(/\s*for the.*$/i, '').trim();
}

function slugify(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main() {
  console.log("=== Loading eLitigation data into Supabase ===\n");

  // Step 1: Load case listings
  console.log("1. Fetching case listings...");
  const cases = await fetchAllDataset(CASES_DATASET);
  console.log(`   Got ${cases.length} cases\n`);

  // Deduplicate by citation
  const caseMap = new Map();
  for (const c of cases) {
    if (c.citation && c.caseName && !caseMap.has(c.citation)) {
      caseMap.set(c.citation, {
        case_name: c.caseName,
        citation: c.citation,
        court: c.court || null,
        year: c.year || null,
        decision_date: c.decisionDate || null,
        case_number: c.caseNumber || null,
        case_types: cleanCaseTypes(c.caseTypes),
        case_url: c.caseUrl || null,
      });
    }
  }
  console.log(`   Unique cases: ${caseMap.size}\n`);

  // Step 2: Fetch counsel data
  console.log("2. Fetching counsel data...");
  const counselRaw = await fetchAllDataset(COUNSEL_DATASET);
  console.log(`   Got ${counselRaw.length} records\n`);

  // Merge judge + counsel into case records
  const counselByCitation = new Map();
  for (const r of counselRaw) {
    if (!r.citation || !r.counsel) continue;
    const c = caseMap.get(r.citation);
    if (c && r.judge) c.judge = r.judge;

    if (!counselByCitation.has(r.citation)) counselByCitation.set(r.citation, []);
    for (const entry of r.counsel) {
      if (isValidLawyerName(entry.name)) {
        counselByCitation.get(r.citation).push({
          lawyer_name: entry.name.trim(),
          law_firm: cleanFirm(entry.firm),
          role: entry.role || null,
        });
      }
    }
  }

  // Update counsel counts
  for (const [cit, c] of caseMap) {
    c.counsel_count = (counselByCitation.get(cit) || []).length;
  }

  // Step 3: Insert cases in batches
  console.log("3. Inserting cases into sg_court_cases...");
  const caseRows = [...caseMap.values()];
  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < caseRows.length; i += BATCH) {
    const batch = caseRows.slice(i, i + BATCH);
    const { error } = await supabase.from("sg_court_cases").upsert(batch, { onConflict: "citation" });
    if (error) {
      console.error(`   Error at batch ${i}: ${error.message}`);
      // Try one by one for this batch
      for (const row of batch) {
        const { error: e2 } = await supabase.from("sg_court_cases").upsert(row, { onConflict: "citation" });
        if (e2) console.error(`   Skip ${row.citation}: ${e2.message}`);
        else inserted++;
      }
    } else {
      inserted += batch.length;
    }
    console.log(`   ${inserted}/${caseRows.length}`);
  }
  console.log(`   Done: ${inserted} cases inserted\n`);

  // Step 4: Insert counsel appearances
  console.log("4. Inserting counsel into sg_case_counsel...");
  const counselRows = [];
  for (const [citation, entries] of counselByCitation) {
    if (!caseMap.has(citation)) continue;
    for (const e of entries) {
      counselRows.push({ citation, ...e });
    }
  }
  console.log(`   Total counsel rows: ${counselRows.length}`);

  let counselInserted = 0;
  for (let i = 0; i < counselRows.length; i += BATCH) {
    const batch = counselRows.slice(i, i + BATCH);
    const { error } = await supabase.from("sg_case_counsel").insert(batch);
    if (error) {
      console.error(`   Error at batch ${i}: ${error.message}`);
      // Try smaller batches
      for (let j = 0; j < batch.length; j += 50) {
        const mini = batch.slice(j, j + 50);
        const { error: e2 } = await supabase.from("sg_case_counsel").insert(mini);
        if (e2) console.error(`   Mini batch error: ${e2.message}`);
        else counselInserted += mini.length;
      }
    } else {
      counselInserted += batch.length;
    }
    if (i % 2000 === 0) console.log(`   ${counselInserted}/${counselRows.length}`);
  }
  console.log(`   Done: ${counselInserted} counsel rows inserted\n`);

  // Step 5: Aggregate into sg_lawyers
  console.log("5. Aggregating lawyer profiles...");
  const lawyerMap = new Map();
  for (const [citation, entries] of counselByCitation) {
    const caseData = caseMap.get(citation);
    if (!caseData) continue;
    for (const e of entries) {
      const key = e.lawyer_name.toLowerCase();
      if (!lawyerMap.has(key)) {
        lawyerMap.set(key, {
          name: e.lawyer_name,
          firms: new Set(),
          courts: new Set(),
          areas: new Set(),
          years: [],
          caseCount: 0,
        });
      }
      const l = lawyerMap.get(key);
      l.caseCount++;
      if (e.law_firm) l.firms.add(e.law_firm);
      if (caseData.court) l.courts.add(caseData.court);
      if (caseData.year) l.years.push(caseData.year);
      for (const area of (caseData.case_types || [])) {
        // Extract top-level practice area
        const top = area.split(' — ')[0].split(' - ')[0].trim();
        if (top.length > 2) l.areas.add(top);
      }
    }
  }

  const lawyerRows = [];
  const usedSlugs = new Set();
  for (const [, l] of lawyerMap) {
    let slug = slugify(l.name);
    if (usedSlugs.has(slug)) slug += `-${Math.random().toString(36).slice(2, 6)}`;
    usedSlugs.add(slug);

    const sortedYears = l.years.sort();
    // Most frequent firm
    const firmCounts = {};
    for (const f of l.firms) firmCounts[f] = (firmCounts[f] || 0) + 1;
    const primaryFirm = Object.entries(firmCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    lawyerRows.push({
      name: l.name,
      slug,
      primary_firm: primaryFirm,
      case_count: l.caseCount,
      courts: [...l.courts],
      practice_areas: [...l.areas].slice(0, 20),
      first_case_year: sortedYears[0] || null,
      last_case_year: sortedYears[sortedYears.length - 1] || null,
    });
  }

  console.log(`   Unique lawyers: ${lawyerRows.length}`);

  let lawyerInserted = 0;
  for (let i = 0; i < lawyerRows.length; i += BATCH) {
    const batch = lawyerRows.slice(i, i + BATCH);
    const { error } = await supabase.from("sg_lawyers").upsert(batch, { onConflict: "slug" });
    if (error) {
      console.error(`   Error at batch ${i}: ${error.message}`);
      for (const row of batch) {
        const { error: e2 } = await supabase.from("sg_lawyers").upsert(row, { onConflict: "slug" });
        if (!e2) lawyerInserted++;
      }
    } else {
      lawyerInserted += batch.length;
    }
    if (i % 1000 === 0) console.log(`   ${lawyerInserted}/${lawyerRows.length}`);
  }
  console.log(`   Done: ${lawyerInserted} lawyer profiles created\n`);

  // Summary
  console.log("=== DONE ===");
  console.log(`Cases: ${inserted}`);
  console.log(`Counsel appearances: ${counselInserted}`);
  console.log(`Unique lawyers: ${lawyerInserted}`);
}

main().catch(console.error);
