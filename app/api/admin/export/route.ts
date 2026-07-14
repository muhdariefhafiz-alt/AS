import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { getAdminSession } from "../../../lib/admin-auth";

// Operator CSV export. "Get my data out" is the top operate-freely friction:
// the operator owns every row in these tables and must be able to pull them as
// a plain CSV without asking anyone. Admin-session gated (same as every other
// /api/admin route), service-role read so RLS never silently empties a page.
//
// Column sets are hand-picked and pinned per type (never `select *`) so we
// export exactly the operator-useful fields and their order is deterministic:
// the pinned array drives both the header row and every value row. Contact PII
// (seller name/email/phone, agent claimed_email) is included on purpose - the
// admin already sees it in the dashboard, and this is the operator exporting
// their own data, not a marketing surface.

type ExportType = "leads" | "agents" | "outreach" | "contracts";

type ExportSpec = {
  table: string;
  // Pinned, ordered column list. Verified against information_schema before
  // shipping; do not add a column without confirming it exists on the table.
  columns: string[];
  // Column to order by (stable, chronological where possible).
  orderBy: string;
  orderAscending: boolean;
};

const EXPORTS: Record<ExportType, ExportSpec> = {
  leads: {
    table: "sg_leads",
    columns: [
      "id",
      "created_at",
      "updated_at",
      "status",
      "property_type",
      "flat_type",
      "bedrooms",
      "district_code",
      "town",
      "postal_code",
      "address_line",
      "est_value_low",
      "est_value_high",
      "timeline",
      "reason",
      "current_mop_status",
      "full_name",
      "email",
      "phone",
      "whatsapp",
      "source",
      "requested_agent_id",
    ],
    orderBy: "created_at",
    orderAscending: false,
  },
  agents: {
    table: "sg_agents",
    columns: [
      "id",
      "name",
      "cea_registration",
      "agency_name",
      "primary_area",
      "claimed",
      "claimed_email",
      "claimed_at",
      "subscription_tier",
      "email_status",
    ],
    orderBy: "id",
    orderAscending: true,
  },
  outreach: {
    table: "sg_outreach",
    columns: [
      "id",
      "agent_id",
      "agent_name",
      "agent_email",
      "campaign",
      "template",
      "email_subject",
      "email_sent",
      "email_sent_at",
      "status",
      "batch_id",
      "created_at",
    ],
    orderBy: "created_at",
    orderAscending: false,
  },
  contracts: {
    table: "sg_agent_agreements",
    columns: [
      "id",
      "agent_id",
      "cea_registration",
      "terms_version",
      "fee_pct",
      "signatory_name",
      "signatory_email",
      "accepted_at",
      "source",
      "ip",
      "user_agent",
      "created_at",
    ],
    orderBy: "created_at",
    orderAscending: false,
  },
};

const PAGE_SIZE = 1000; // PostgREST hard-caps every select at 1000 rows.
const HARD_CAP = 50000; // Never build an unbounded CSV in memory.

// RFC 4180 field encoding: null/undefined -> empty; wrap in double quotes and
// double any internal quote when the value contains a comma, quote, CR or LF.
// timestamptz/date already arrive from PostgREST as ISO strings, so String()
// preserves them; jsonb (none selected here) would be stringified defensively.
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s: string;
  if (typeof value === "object") {
    s = JSON.stringify(value);
  } else {
    s = String(value);
  }
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const type = new URL(req.url).searchParams.get("type");
  if (!type || !Object.prototype.hasOwnProperty.call(EXPORTS, type)) {
    return NextResponse.json(
      { error: "Unknown export type. Use one of: leads, agents, outreach, contracts." },
      { status: 400 }
    );
  }
  const spec = EXPORTS[type as ExportType];
  const select = spec.columns.join(",");
  const sb = supabaseAdmin();

  const rows: Record<string, unknown>[] = [];
  let from = 0;
  let capped = false;
  // Paginate with .range() until a short page or the hard cap. Total iterations
  // are bounded by HARD_CAP / PAGE_SIZE so a runaway table can never loop.
  for (let i = 0; i < HARD_CAP / PAGE_SIZE; i++) {
    const { data, error } = await sb
      .from(spec.table)
      .select(select)
      .order(spec.orderBy, { ascending: spec.orderAscending })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      return NextResponse.json({ error: "Export query failed." }, { status: 500 });
    }
    const page = (data ?? []) as unknown as Record<string, unknown>[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
    if (rows.length >= HARD_CAP) {
      capped = true;
      break;
    }
  }
  if (capped) {
    console.warn(`[admin/export] ${spec.table} hit hard cap of ${HARD_CAP} rows; CSV truncated.`);
  }
  const bounded = rows.slice(0, HARD_CAP);

  // Header row + one row per record, both driven by the pinned column order.
  const headerLine = spec.columns.map(csvCell).join(",");
  const dataLines = bounded.map((row) => spec.columns.map((col) => csvCell(row[col])).join(","));
  const csv = [headerLine, ...dataLines].join("\r\n") + "\r\n";

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type}-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
