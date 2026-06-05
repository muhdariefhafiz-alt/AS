import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";

// Daily cron: reconcile self-reported completion sale prices against public
// HDB / URA transaction data.
//
// We can't do exact record matching (CEA completions don't carry block+unit),
// so this is PLAUSIBILITY matching: does a comparable transaction exist in the
// same geography, near the same date, at roughly the reported price? That is
// enough to catch the fraud case the original design flagged (agent reports
// sale_price = $1 to dodge the 0.25% fee) without false-accusing honest agents.
//
// verification_status transitions:
//   unverified -> matched      (comps found, reported price plausible)
//   unverified -> mismatch     (comps found, reported price wildly off)
//   unverified -> no_record    (90+ days elapsed, still no comps; URA lags)

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const sb = supabaseAdmin();
  const { data: completions } = await sb
    .from("sg_lead_completions")
    .select("id, lead_id, sale_price, completion_date, verification_status")
    .eq("verification_status", "unverified")
    .not("completion_date", "is", null)
    .limit(500);

  if (!completions || completions.length === 0) {
    return NextResponse.json({ ok: true, checked: 0 });
  }

  let matched = 0;
  let mismatch = 0;
  let noRecord = 0;

  for (const c of completions) {
    try {
      const { data: lead } = await sb
        .from("sg_leads")
        .select("property_type, town, district_code")
        .eq("id", c.lead_id)
        .single();
      if (!lead) continue;

      const salePrice = Number(c.sale_price);
      const completionDate = new Date(String(c.completion_date) + "T00:00:00Z");
      if (!Number.isFinite(salePrice) || salePrice <= 0) continue;

      const comps =
        lead.property_type === "HDB"
          ? await hdbComps(sb, lead.town, completionDate)
          : await privateComps(sb, lead.district_code, completionDate);

      const ageDays = Math.floor(
        (Date.now() - completionDate.getTime()) / 86_400_000
      );

      if (comps.length < 3) {
        // Not enough comps to judge. After 90 days, mark no_record (URA/HDB
        // either won't publish a match or the geography is too thin).
        if (ageDays >= 90) {
          await setStatus(sb, c.id, c.lead_id, "no_record", {
            comp_count: comps.length,
            age_days: ageDays,
          });
          noRecord += 1;
        }
        continue;
      }

      const prices = comps.map((p) => p).sort((a, b) => a - b);
      const min = prices[0];
      const max = prices[prices.length - 1];
      const median = prices[Math.floor(prices.length / 2)];

      // Plausible if within the observed band, or within 30% of the median.
      // Fraud (e.g. $1) falls far below min -> mismatch.
      const withinBand = salePrice >= min * 0.85 && salePrice <= max * 1.15;
      const nearMedian =
        salePrice >= median * 0.7 && salePrice <= median * 1.3;

      if (withinBand || nearMedian) {
        await setStatus(sb, c.id, c.lead_id, "matched", {
          comp_count: comps.length,
          median,
          reported: salePrice,
        });
        matched += 1;
      } else {
        await setStatus(sb, c.id, c.lead_id, "mismatch", {
          comp_count: comps.length,
          median,
          reported: salePrice,
          band: [min, max],
        });
        mismatch += 1;
      }
    } catch (e) {
      console.error("[cron/verify-completions] row failed", c.id, e);
    }
  }

  return NextResponse.json({
    ok: true,
    checked: completions.length,
    matched,
    mismatch,
    no_record: noRecord,
  });
}

async function setStatus(
  sb: ReturnType<typeof supabaseAdmin>,
  completionId: number,
  leadId: number,
  status: string,
  meta: Record<string, unknown>
): Promise<void> {
  await sb
    .from("sg_lead_completions")
    .update({ verification_status: status })
    .eq("id", completionId);
  await sb.from("sg_lead_events").insert({
    lead_id: leadId,
    event_type: `verify_${status}`,
    meta,
  });
}

// HDB comps: same town, ±45 days of completion (by month), any flat type.
async function hdbComps(
  sb: ReturnType<typeof supabaseAdmin>,
  town: string | null,
  completionDate: Date
): Promise<number[]> {
  if (!town) return [];
  const months = monthWindow(completionDate, 2); // ±2 months ~ ±45 days
  const { data } = await sb
    .from("sg_hdb_transactions")
    .select("resale_price, month")
    .eq("town", town.toUpperCase())
    .in("month", months)
    .limit(2000);
  return (data ?? [])
    .map((r) => Number(r.resale_price))
    .filter((n) => Number.isFinite(n) && n > 0);
}

// Private comps: same district, ±2 months. URA contract_date is "MMYY".
async function privateComps(
  sb: ReturnType<typeof supabaseAdmin>,
  districtCode: string | null,
  completionDate: Date
): Promise<number[]> {
  if (!districtCode) return [];
  // Normalise "D18" / "18" -> "18"
  const dnum = districtCode.replace(/[^0-9]/g, "").replace(/^0+/, "");
  if (!dnum) return [];
  const mmyys = mmyyWindow(completionDate, 2);
  const { data } = await sb
    .from("sg_private_transactions")
    .select("price, contract_date, district")
    .eq("district", dnum)
    .in("contract_date", mmyys)
    .limit(2000);
  return (data ?? [])
    .map((r) => Number(r.price))
    .filter((n) => Number.isFinite(n) && n > 0);
}

// "YYYY-MM" strings for completion month ± n months.
function monthWindow(d: Date, n: number): string[] {
  const out: string[] = [];
  for (let i = -n; i <= n; i++) {
    const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + i, 1));
    out.push(
      `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`
    );
  }
  return out;
}

// URA "MMYY" strings for completion month ± n months.
function mmyyWindow(d: Date, n: number): string[] {
  const out: string[] = [];
  for (let i = -n; i <= n; i++) {
    const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + i, 1));
    const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const yy = String(dt.getUTCFullYear()).slice(-2);
    out.push(`${mm}${yy}`);
  }
  return out;
}
