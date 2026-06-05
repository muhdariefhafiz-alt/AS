import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

// Typeahead for the private-property AVM path. Returns up to 10 developments
// matching the query, ranked by transaction count (most-traded first).

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ projects: [] });
  }

  const { data } = await supabase
    .from("sg_projects")
    .select("name, slug, district, txn_count, median_price")
    .ilike("name", `%${q}%`)
    .not("median_price", "is", null)
    .order("txn_count", { ascending: false })
    .limit(10);

  return NextResponse.json({
    projects: (data ?? []).map((p) => ({
      name: p.name,
      slug: p.slug,
      district: p.district,
      txn_count: p.txn_count,
    })),
  });
}
