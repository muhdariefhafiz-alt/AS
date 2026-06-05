import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://yhfdahkzukxglwikcdlo.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DATASET_ID = "RxfbWbBClRj0Cyvh1";

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

async function fetchAll(datasetId) {
  const all = [];
  let offset = 0;
  while (true) {
    const res = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?offset=${offset}&limit=1000&format=json`);
    const items = await res.json();
    if (!items || items.length === 0) break;
    all.push(...items);
    if (items.length < 1000) break;
    offset += 1000;
  }
  return all;
}

async function main() {
  console.log("Fetching MAS FID data (v2)...");
  const items = await fetchAll(DATASET_ID);
  console.log(`Got ${items.length} items`);

  // Filter to items with name and masUrl
  const institutions = items.filter(i =>
    i.name && i.name.length > 3 && i.masUrl && i.masUrl.includes("/institution/detail/")
  );
  console.log(`Filtered: ${institutions.length}`);

  // Deduplicate by masUrl
  const seen = new Map();
  for (const inst of institutions) {
    if (!seen.has(inst.masUrl)) seen.set(inst.masUrl, inst);
  }
  const unique = [...seen.values()];
  console.log(`Unique: ${unique.length}`);

  // Determine category from URL path
  function guessCategory(masUrl) {
    // Will be enriched later from detail pages
    return "MAS Regulated";
  }

  function guessSector(masUrl, name) {
    const n = name.toUpperCase();
    if (n.includes("BANK") || n.includes("BANKING")) return "Banking";
    if (n.includes("INSURANCE") || n.includes("INSURER") || n.includes("UNDERWRITER")) return "Insurance";
    if (n.includes("FINANCIAL ADVIS") || n.includes("WEALTH") || n.includes("ADVISORY")) return "Financial Advisory";
    if (n.includes("PAYMENT") || n.includes("PAY ") || n.includes("MONEY") || n.includes("EXCHANGE") || n.includes("REMITTANCE")) return "Payments";
    return "Capital Markets";
  }

  const usedSlugs = new Set();
  const rows = unique.map(inst => {
    let slug = slugify(inst.name);
    if (!slug) slug = "inst-" + Math.random().toString(36).slice(2, 8);
    if (usedSlugs.has(slug)) slug += `-${Math.random().toString(36).slice(2, 6)}`;
    usedSlugs.add(slug);

    return {
      name: inst.name,
      slug,
      category: guessCategory(inst.masUrl),
      sector: guessSector(inst.masUrl, inst.name),
      status: "Active",
      mas_url: inst.masUrl,
    };
  });

  // Clear and reinsert
  await supabase.from("sg_financial_institutions").delete().neq("id", 0);

  const BATCH = 200;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase.from("sg_financial_institutions").insert(batch);
    if (error) {
      console.error(`Batch error: ${error.message}`);
      for (const row of batch) {
        const { error: e2 } = await supabase.from("sg_financial_institutions").insert(row);
        if (!e2) inserted++;
        else console.error(`Skip ${row.name}: ${e2.message}`);
      }
    } else {
      inserted += batch.length;
    }
  }

  console.log(`Inserted ${inserted} institutions`);

  // Summary
  const sectorCounts = {};
  for (const r of rows) sectorCounts[r.sector] = (sectorCounts[r.sector] || 0) + 1;
  console.log("By sector:", sectorCounts);
}

main().catch(console.error);
