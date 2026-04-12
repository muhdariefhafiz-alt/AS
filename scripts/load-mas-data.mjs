import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://yhfdahkzukxglwikcdlo.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DATASET_ID = "dVwCagzTrTx2w1H1r";

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function getSector(category) {
  if (category.includes("Financial Adviser")) return "Financial Advisory";
  if (category.includes("Insur") || category.includes("Lloyd")) return "Insurance";
  if (category.includes("Capital") || category.includes("Trust") || category.includes("Exchange") || category.includes("Clearing") || category.includes("Market") || category.includes("Depository") || category.includes("Trade Repository")) return "Capital Markets";
  if (category.includes("Bank") || category.includes("Finance Company") || category.includes("Merchant") || category.includes("SGS")) return "Banking";
  if (category.includes("Payment") || category.includes("Money") || category.includes("Credit") || category.includes("Bureau")) return "Payments";
  return "Other";
}

async function main() {
  console.log("Fetching MAS FID data...");

  const res = await fetch(`https://api.apify.com/v2/datasets/${DATASET_ID}/items?format=json`);
  const items = await res.json();

  console.log(`Got ${items.length} items`);

  // Filter to actual institutions (not "Print/Download List" etc.)
  const institutions = items.filter(i =>
    i.name &&
    i.name.length > 3 &&
    !i.name.includes("Print/Download") &&
    !i.name.includes("See All") &&
    i.url &&
    i.url.includes("/institution/")
  );

  console.log(`Filtered to ${institutions.length} institutions`);

  // Deduplicate by URL
  const seen = new Set();
  const unique = [];
  for (const inst of institutions) {
    if (!seen.has(inst.url)) {
      seen.add(inst.url);
      unique.push(inst);
    }
  }
  console.log(`Unique: ${unique.length}`);

  // Prepare rows
  const usedSlugs = new Set();
  const rows = unique.map(inst => {
    let slug = slugify(inst.name);
    if (usedSlugs.has(slug)) slug += `-${Math.random().toString(36).slice(2, 6)}`;
    usedSlugs.add(slug);

    return {
      name: inst.name,
      slug,
      category: inst.category || "Unknown",
      sector: getSector(inst.category || ""),
      status: "Active",
      mas_url: inst.url,
    };
  });

  // Insert in batches
  const BATCH = 100;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase.from("sg_financial_institutions").upsert(batch, { onConflict: "slug" });
    if (error) {
      console.error(`Error at batch ${i}: ${error.message}`);
      for (const row of batch) {
        const { error: e2 } = await supabase.from("sg_financial_institutions").upsert(row, { onConflict: "slug" });
        if (!e2) inserted++;
      }
    } else {
      inserted += batch.length;
    }
  }

  console.log(`Inserted ${inserted} institutions`);

  // Summary by sector
  const sectorCounts = {};
  for (const r of rows) {
    sectorCounts[r.sector] = (sectorCounts[r.sector] || 0) + 1;
  }
  console.log("By sector:", sectorCounts);
}

main().catch(console.error);
