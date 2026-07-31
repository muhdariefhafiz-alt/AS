// F2 "hire" surface: demand-led, evidence-first pages answering "who should I hire to
// [sell/rent out] a [property type] in [area]", ranked on real closed CEA transactions.
//
// Data reality (see get_area_top_agents / get_qualifying_hire_pages):
//   - HDB is organised by TOWN; condo/EC/landed by DISTRICT.
//   - Ranking is on recent (36mo) area transactions for the exact type + side, matched on
//     CEA registration number (not name), so it sidesteps the global AgentScore's known
//     seller-skew/compression and stays defamation-safe (pure factual counts).
//   - Every page is density-gated (>= 8 active agents) so nothing is thin.

import { supabase, supabaseAdmin } from "./supabase";
import { HDB_TOWNS, townFromSlug, townDisplayName } from "./hdbData";

export type HireIntent = {
  slug: string;
  propertyType: string;                 // DB property_type value
  represented: "SELLER" | "LANDLORD";
  areaType: "town" | "district";
  action: string;                       // "sell" | "rent out"
  actionNoun: string;                   // "selling" | "renting out"
  typeLabel: string;                    // "HDB flat"
  typeLabelPlural: string;              // "HDB flats"
  clientLabel: string;                  // "sellers" | "landlords"
};

export const HIRE_INTENTS: HireIntent[] = [
  { slug: "sell-hdb", propertyType: "HDB", represented: "SELLER", areaType: "town", action: "sell", actionNoun: "selling", typeLabel: "HDB flat", typeLabelPlural: "HDB flats", clientLabel: "sellers" },
  { slug: "rent-out-hdb", propertyType: "HDB", represented: "LANDLORD", areaType: "town", action: "rent out", actionNoun: "renting out", typeLabel: "HDB flat", typeLabelPlural: "HDB flats", clientLabel: "landlords" },
  { slug: "sell-condo", propertyType: "CONDOMINIUM_APARTMENTS", represented: "SELLER", areaType: "district", action: "sell", actionNoun: "selling", typeLabel: "condo", typeLabelPlural: "condos", clientLabel: "sellers" },
  { slug: "rent-out-condo", propertyType: "CONDOMINIUM_APARTMENTS", represented: "LANDLORD", areaType: "district", action: "rent out", actionNoun: "renting out", typeLabel: "condo", typeLabelPlural: "condos", clientLabel: "landlords" },
  { slug: "sell-ec", propertyType: "EXECUTIVE_CONDOMINIUM", represented: "SELLER", areaType: "district", action: "sell", actionNoun: "selling", typeLabel: "executive condo", typeLabelPlural: "executive condos", clientLabel: "sellers" },
  { slug: "rent-out-ec", propertyType: "EXECUTIVE_CONDOMINIUM", represented: "LANDLORD", areaType: "district", action: "rent out", actionNoun: "renting out", typeLabel: "executive condo", typeLabelPlural: "executive condos", clientLabel: "landlords" },
  { slug: "sell-landed", propertyType: "LANDED", represented: "SELLER", areaType: "district", action: "sell", actionNoun: "selling", typeLabel: "landed home", typeLabelPlural: "landed homes", clientLabel: "sellers" },
  { slug: "rent-out-landed", propertyType: "LANDED", represented: "LANDLORD", areaType: "district", action: "rent out", actionNoun: "renting out", typeLabel: "landed home", typeLabelPlural: "landed homes", clientLabel: "landlords" },
];

export function intentFromSlug(slug: string): HireIntent | undefined {
  return HIRE_INTENTS.find((i) => i.slug === slug);
}

// Property-type -> the short slug the matcher UI uses.
const PROP_TYPE_SLUG: Record<string, string> = {
  HDB: "hdb", CONDOMINIUM_APARTMENTS: "condo", EXECUTIVE_CONDOMINIUM: "ec", LANDED: "landed",
};
// URL parts to deep-link an F2 page into the F1 matcher, pre-filled.
export function intentUrlParts(intent: HireIntent): { type: string; side: string } {
  return { type: PROP_TYPE_SLUG[intent.propertyType] ?? "hdb", side: intent.represented === "SELLER" ? "sell" : "rent-out" };
}
function intentFor(propertyType: string, represented: string): HireIntent | undefined {
  return HIRE_INTENTS.find((i) => i.propertyType === propertyType && i.represented === represented);
}

// Short area label: "Tampines, Pasir Ris" -> "Tampines".
function shortName(name: string): string {
  return name.split(",")[0].trim();
}

type DistrictInfo = { code: string; slug: string; name: string; txnKey: string };
let _districtCache: { bySlug: Map<string, DistrictInfo>; byTxnKey: Map<string, DistrictInfo> } | null = null;
async function getDistrictMaps() {
  if (_districtCache) return _districtCache;
  const { data } = await supabase.from("sg_districts").select("code, slug, name");
  const bySlug = new Map<string, DistrictInfo>();
  const byTxnKey = new Map<string, DistrictInfo>();
  for (const r of (data ?? []) as Array<{ code: string; slug: string; name: string }>) {
    const code = String(r.code);            // 'D18'
    const txnKey = code.replace(/^D/, "");  // '18' (matches sg_agent_transactions.district)
    const info: DistrictInfo = { code, slug: String(r.slug), name: String(r.name), txnKey };
    bySlug.set(info.slug, info);
    byTxnKey.set(txnKey, info);
  }
  _districtCache = { bySlug, byTxnKey };
  return _districtCache;
}

export type HirePageParam = { intent: string; area: string; areaName: string; activeAgents: number };

// All density-gated (intent x area) combos. Drives generateStaticParams + the sitemap.
// Server/build-only: the enumeration aggregates the full 1.34M-row transaction table
// and exceeds the anon role's statement_timeout, so it MUST run via the service-role
// client (no timeout). Never call this from client code.
export async function getQualifyingHirePages(minAgents = 8): Promise<HirePageParam[]> {
  const { data } = await supabaseAdmin().rpc("get_qualifying_hire_pages", { p_min_agents: minAgents });
  const rows = (data ?? []) as Array<{ property_type: string; represented: string; area_type: string; area_key: string; active_agents: number }>;
  const districts = await getDistrictMaps();
  const out: HirePageParam[] = [];
  for (const r of rows) {
    const intent = intentFor(r.property_type, r.represented);
    if (!intent) continue;
    if (intent.areaType === "town") {
      const t = HDB_TOWNS.find((x) => x.name === r.area_key); // area_key = upper(town)
      if (!t) continue;
      out.push({ intent: intent.slug, area: t.slug, areaName: townDisplayName(t.name), activeAgents: r.active_agents });
    } else {
      const d = districts.byTxnKey.get(r.area_key);
      if (!d) continue;
      out.push({ intent: intent.slug, area: d.slug, areaName: `District ${d.txnKey} (${shortName(d.name)})`, activeAgents: r.active_agents });
    }
  }
  return out;
}

export type HireAgent = {
  slug: string; name: string; display_name: string; agency_name: string;
  score: number; percentile: number | null; claimed: boolean;
  area_txns: number; recent_txns: number; last_txn: string;
};

export type HirePageData = {
  intent: HireIntent;
  areaSlug: string;
  areaName: string;   // full display, e.g. "Tampines" or "District 18 (Tampines)"
  areaShort: string;  // e.g. "Tampines"
  agents: HireAgent[];
  summary: { active_agents: number; total_agents: number; recent_txns: number; all_time_txns: number };
};

async function resolveArea(
  intent: HireIntent,
  areaSlug: string
): Promise<{ dbValue: string; areaName: string; areaShort: string } | null> {
  if (intent.areaType === "town") {
    const t = townFromSlug(areaSlug);
    if (!t) return null;
    const areaShort = townDisplayName(t.name);
    return { dbValue: t.name, areaName: areaShort, areaShort };
  }
  const districts = await getDistrictMaps();
  const d = districts.bySlug.get(areaSlug);
  if (!d) return null;
  const areaShort = shortName(d.name);
  return { dbValue: d.txnKey, areaName: `District ${d.txnKey} (${areaShort})`, areaShort };
}

// Shared fetch for both the static F2 page and the interactive F1 matcher.
// No thin-guard here; callers decide (static pages guard, the matcher shows what exists).
export async function getShortlist(
  intentSlug: string,
  areaSlug: string,
  limit = 12
): Promise<HirePageData | null> {
  const intent = intentFromSlug(intentSlug);
  if (!intent) return null;
  const area = await resolveArea(intent, areaSlug);
  if (!area) return null;

  const { data } = await supabase.rpc("get_area_top_agents", {
    p_area_type: intent.areaType,
    p_area_name: area.dbValue,
    p_property_type: intent.propertyType,
    p_represented: intent.represented,
    p_months: 36,
    p_limit: limit,
  });
  const res = (data ?? {}) as { agents?: HireAgent[]; summary?: HirePageData["summary"] };
  return {
    intent, areaSlug, areaName: area.areaName, areaShort: area.areaShort,
    agents: res.agents ?? [],
    summary: res.summary ?? { active_agents: 0, total_agents: 0, recent_txns: 0, all_time_txns: 0 },
  };
}

// F2 static page fetch: same data plus a thin-content guard (in addition to the
// build-time density gate) so a page never renders with too few agents.
export async function getHirePageData(intentSlug: string, areaSlug: string): Promise<HirePageData | null> {
  const data = await getShortlist(intentSlug, areaSlug, 12);
  if (!data || data.agents.length < 3) return null;
  return data;
}

// The option lists the interactive matcher needs (areas per area-type).
export type AreaOption = { slug: string; label: string };
export async function getHireAreaOptions(): Promise<{ town: AreaOption[]; district: AreaOption[] }> {
  const districts = await getDistrictMaps();
  const town = HDB_TOWNS.map((t) => ({ slug: t.slug, label: townDisplayName(t.name) }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const district = [...districts.bySlug.values()]
    .map((d) => ({ slug: d.slug, label: `District ${d.txnKey} (${shortName(d.name)})` }))
    .sort((a, b) => a.label.localeCompare(b.label));
  return { town, district };
}
