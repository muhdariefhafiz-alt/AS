import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { checkRateLimit, clientIp } from "../../../lib/rateLimit";
import { renderPdf } from "../../../lib/documents/build";
import { todaySg } from "../../../lib/documents/prefill";
import { titleName, cleanAgency } from "../../../lib/names";
import type { DocFields } from "../../../lib/documents/schema";

// Public letter-of-intent sample.
//
// Why this exists: generating a real, storable document requires a claimed
// profile (the letterhead has to be the agent's own), but a salesperson has no
// reason to claim anything before they have seen the thing work. So this
// renders the SAMPLE on their real letterhead, from the public CEA register
// data we already publish on their profile page, and the live tool sits one
// claim away.
//
// ANTI-MISUSE, deliberately strict. Anyone can hit this endpoint for any
// salesperson, so it must never be able to produce something that could pass as
// a document that salesperson issued:
// - Every party, property and figure is FIXED SAMPLE DATA. There is no caller
//   input beyond which salesperson's letterhead to show.
// - Every page carries a "SAMPLE - NOT AN ISSUED DOCUMENT" stamp (the draft
//   watermark path) and the sample notice is in the body text.
// - Only agents already published on the site are eligible (scored, not
//   hidden), i.e. exactly the data already on their public profile page.

export const maxDuration = 30;

// The sample deal. Obviously illustrative, and never a real address: One Amber
// style unit numbering with a placeholder street the register does not carry.
const SAMPLE: DocFields = {
  premises_address: "18 Sample Gardens #08-08",
  premises_postal: "Singapore 000000",
  premises_type: "Condominium or apartment",
  furnishing: "Partially furnished",
  landlord_name: "SAMPLE LANDLORD",
  landlord_address: "Landlord's correspondence address",
  tenant_name: "SAMPLE TENANT",
  occupiers: "Sample Tenant",
  start_date: "2026-09-01",
  term_months: "24",
  rent_amount: "4200",
  rent_inclusive: "true",
  option_to_renew: "true",
  renew_months: "12",
  security_deposit_months: "2",
  security_deposit: "8400",
  advance_rental_months: "1",
  deposit_amount: "4200",
  deposit_method: "Bank transfer",
  deposit_payee: "SAMPLE LANDLORD",
  deposit_converts_to: "Part of the security deposit",
  ta_deadline_days: "7",
  stamp_duty_by: "Tenant",
  utilities_by: "Tenant",
  telecom_by_tenant: "true",
  aircon_servicing: "true",
  aircon_frequency: "Quarterly",
  immigration_clause: "true",
  minor_repair_cap: "150",
  diplomatic_clause: "true",
  diplomatic_after_months: "12",
  diplomatic_notice_months: "2",
  diplomatic_reimburse: "true",
  handover: "With the requirements listed below",
  tenant_requirements: "Professional cleaning before handover\nService the air-conditioning units before handover\nProvide a washer and dryer",
  no_parallel_negotiation: "true",
  landlord_fail_pays_commission: "true",
  forfeit_split_agency: "true",
  forfeit_split_pct: "50",
  subject_to_contract: "true",
};

type AgentRow = {
  slug: string | null;
  name: string | null;
  marketing_name: string | null;
  marketing_name_status: string | null;
  cea_registration: string | null;
  agency_name: string | null;
  claimed: boolean | null;
};

function letterhead(a: AgentRow): DocFields {
  const name =
    a.marketing_name_status === "approved" && a.marketing_name ? a.marketing_name.trim() : titleName(a.name ?? "");
  return {
    agent_name: name,
    agent_cea: a.cea_registration ?? "",
    agency_name: a.agency_name ? cleanAgency(a.agency_name) : "",
    agent_represents: "Landlord",
    loi_date: todaySg(),
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const slug = (url.searchParams.get("slug") ?? "").trim();

  // Rendering a PDF is far more expensive than a search and is the only branch
  // that writes, so it gets its own, tighter bucket.
  const ip = clientIp(req);
  const { limited } = slug
    ? await checkRateLimit(`loi-demo-pdf:${ip}`, 8, 60_000)
    : await checkRateLimit(`loi-demo:${ip}`, 30, 60_000);
  if (limited) return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });

  const sb = supabaseAdmin();

  // Search: the salesperson finds their own name in the register.
  if (!slug) {
    if (q.length < 2) return NextResponse.json({ agents: [] });
    const term = q.replace(/[%,()]/g, " ").trim();
    const { data } = await sb
      .from("sg_agents")
      .select("slug, name, marketing_name, marketing_name_status, cea_registration, agency_name, claimed")
      .not("score", "is", null)
      .eq("is_hidden", false)
      .not("slug", "is", null)
      .or(`name.ilike.%${term}%,cea_registration.ilike.%${term}%`)
      .order("score", { ascending: false, nullsFirst: false })
      .limit(8);
    return NextResponse.json({
      agents: (data ?? []).map((a) => {
        const row = a as AgentRow;
        return {
          slug: row.slug,
          name:
            row.marketing_name_status === "approved" && row.marketing_name
              ? row.marketing_name.trim()
              : titleName(row.name ?? ""),
          cea: row.cea_registration,
          agency: row.agency_name ? cleanAgency(row.agency_name) : "",
          claimed: row.claimed === true,
        };
      }),
    });
  }

  // Sample PDF on that salesperson's letterhead.
  const { data: agent } = await sb
    .from("sg_agents")
    .select("slug, name, marketing_name, marketing_name_status, cea_registration, agency_name, claimed")
    .eq("slug", slug)
    .not("score", "is", null)
    .eq("is_hidden", false)
    .maybeSingle();
  if (!agent || !agent.cea_registration) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const fields: DocFields = { ...SAMPLE, ...letterhead(agent as AgentRow) };

  let bytes: Uint8Array;
  try {
    bytes = await renderPdf("loi_residential_v1", fields, {
      draft: true,
      provenance: true,
      watermarkText: "SAMPLE - NOT AN ISSUED DOCUMENT",
    });
  } catch (err) {
    console.error("[loi-demo] render failed", err);
    return NextResponse.json({ error: "Could not render the sample." }, { status: 500 });
  }

  const { error: logErr } = await sb
    .from("sg_funnel_events")
    .insert({ event: "loi_demo_generated", agent_slug: slug, source: "public", page_path: "/tools/loi" });
  if (logErr) console.error("[loi-demo] funnel insert rejected", logErr);

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="letter-of-intent-sample.pdf"',
      // Not edge-cached: this is the last step of the claim funnel and a cached
      // response would never reach the function, so the one event we log would
      // undercount exactly the number the phase is judged on.
      "Cache-Control": "private, no-store",
    },
  });
}
