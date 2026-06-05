import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { buildShortlist, type PropertyType } from "../../../lib/sellMatch";

// Seller clicked "none of these will work" on /sell/quotes or /sell/shortlist.
// Generate the next batch of agents for their area, excluding everyone already
// suggested/invited, append to sg_lead_shortlist, and flip the lead back to a
// reshortlist state so the shortlist page shows the broader set.

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token } = body ?? {};
    if (typeof token !== "string" || token.length < 8 || token.length > 64) {
      return NextResponse.json({ error: "Invalid token." }, { status: 400 });
    }

    const sb = supabaseAdmin();
    const { data: lead } = await sb
      .from("sg_leads")
      .select("id, token, status, property_type, town, district_code")
      .eq("token", token)
      .single();
    if (!lead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }
    if (lead.status === "instructed" || lead.status === "completed") {
      return NextResponse.json(
        { error: "This sale is already instructed." },
        { status: 409 }
      );
    }

    // Who's already on the shortlist? Exclude them from the next batch.
    const { data: existing } = await sb
      .from("sg_lead_shortlist")
      .select("agent_id, rank")
      .eq("lead_id", lead.id);
    const existingIds = new Set((existing ?? []).map((r) => r.agent_id));
    const maxRank = (existing ?? []).reduce(
      (m, r) => Math.max(m, r.rank ?? 0),
      0
    );

    // Pull a deeper shortlist and filter out everyone already shown.
    const full = await buildShortlist(
      {
        property_type: lead.property_type as PropertyType,
        town: lead.town,
        district_code: lead.district_code,
      },
      20
    );
    const fresh = full.filter((a) => !existingIds.has(a.agent_id)).slice(0, 5);

    if (fresh.length === 0) {
      return NextResponse.json(
        {
          error:
            "No more ranked agents for this area. Email hello@fair-comparisons.com and we'll source more.",
        },
        { status: 422 }
      );
    }

    const rows = fresh.map((a, i) => ({
      lead_id: lead.id,
      agent_id: a.agent_id,
      rank: maxRank + i + 1,
      score_at_shortlist: a.score_components.composite,
      status: "suggested",
    }));
    const { error: insErr } = await sb.from("sg_lead_shortlist").insert(rows);
    if (insErr) {
      console.error("[sell/reshortlist] insert failed", insErr);
      return NextResponse.json(
        { error: "Could not expand your shortlist." },
        { status: 500 }
      );
    }

    await sb
      .from("sg_leads")
      .update({ status: "reshortlisted" })
      .eq("id", lead.id);
    await sb.from("sg_lead_events").insert({
      lead_id: lead.id,
      event_type: "reshortlist",
      meta: { added: fresh.length },
    });

    return NextResponse.json({
      success: true,
      added: fresh.length,
    });
  } catch (err) {
    console.error("[sell/reshortlist] unexpected", err);
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
