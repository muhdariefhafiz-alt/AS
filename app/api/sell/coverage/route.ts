import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { checkRateLimit, clientIp } from "../../../lib/rateLimit";

// Live supply count for the sell form's area step: "We rank N agents who
// sell <type> in <area>". A straight count of sg_area_top_agents rows, the
// same pool buildShortlist draws from, so the number the seller sees before
// giving contact details is exactly the pool their shortlist will come from.
// Also lets the form fail an uncovered area BEFORE contact capture instead
// of rejecting a fully completed form (the old flow's worst-faith moment).

export async function GET(req: Request) {
  const { limited } = await checkRateLimit(
    `coverage:${clientIp(req)}`,
    60,
    60 * 60 * 1000
  );
  if (limited) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const url = new URL(req.url);
  const type = (url.searchParams.get("type") || "").toUpperCase();
  const town = (url.searchParams.get("town") || "").trim().toUpperCase();
  const districtCode = (url.searchParams.get("district") || "").trim().toUpperCase();
  if (!["HDB", "CONDO", "EC", "LANDED"].includes(type)) {
    return NextResponse.json({ error: "Invalid type." }, { status: 400 });
  }
  if (town.length > 40 || districtCode.length > 8) {
    return NextResponse.json({ error: "Invalid area." }, { status: 400 });
  }

  const sb = supabaseAdmin();

  // Same area resolution as buildShortlist: HDB matches by town, private by
  // district DESCRIPTIVE NAME (sg_area_top_agents never stores codes).
  const areaType = type === "HDB" ? "town" : "district";
  let areaName = areaType === "town" ? town : "";
  if (areaType === "district" && districtCode) {
    const { data: d } = await sb
      .from("sg_districts")
      .select("name")
      .eq("code", districtCode)
      .maybeSingle();
    if (d?.name) areaName = String(d.name).replace(/,\s*/g, "/ ");
  }
  if (!areaName) {
    return NextResponse.json({ agents: 0, area: null });
  }

  const { count } = await sb
    .from("sg_area_top_agents")
    .select("agent_id", { count: "exact", head: true })
    .eq("area_type", areaType)
    .eq("area_name", areaName);

  return NextResponse.json({ agents: count ?? 0, area: areaName });
}
