import { supabase } from "./supabase";

// Live headline counts for the "already live on FairComparisons" proof blocks
// used across the competitor-alternative comparison pages. Cached by the page's
// own revalidate window.
export async function getAgentStats(): Promise<{ scored: number; total: number; agencies: number }> {
  const [scored, agencies, total] = await Promise.all([
    supabase.from("sg_agents").select("id", { count: "exact", head: true }).not("score", "is", null),
    supabase.from("sg_agencies").select("id", { count: "exact", head: true }),
    supabase.from("sg_agents").select("id", { count: "exact", head: true }),
  ]);
  return {
    scored: scored.count ?? 10594,
    agencies: agencies.count ?? 930,
    total: total.count ?? 30000,
  };
}
