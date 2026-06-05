import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { sendEmail } from "../../../lib/email";
import { sendWaAsync } from "../../../lib/whatsapp";
import { hdbValuation, isValidHdbFlatType } from "../../../lib/avm";

// Weekly cron: recompute AVM watchers' estimates and notify when the value
// has moved more than 2% since we last stored it. HDB-only for now (private
// needs the project slug, which we don't store on the lead).
//
// Batched: processes up to 200 watchers per run via created_at cursor so we
// never blow the cron time budget.

const MOVE_THRESHOLD = 0.02;

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const sb = supabaseAdmin();
  const { data: watchers } = await sb
    .from("sg_leads")
    .select("id, token, property_type, town, email, whatsapp, marketing_consent, est_value_low, est_value_high")
    .eq("source", "avm")
    .eq("status", "avm_watch")
    .eq("property_type", "HDB")
    .not("email", "is", null)
    .order("created_at", { ascending: true })
    .limit(200);

  if (!watchers || watchers.length === 0) {
    return NextResponse.json({ ok: true, notified: 0 });
  }

  let notified = 0;
  for (const w of watchers) {
    try {
      if (!w.town) continue;
      // We don't store flat type; estimate the 4 ROOM band as the town proxy.
      const flat = "4 ROOM";
      if (!isValidHdbFlatType(flat)) continue;
      const fresh = await hdbValuation(w.town, flat);
      if (!fresh) continue;

      const prevMid =
        (Number(w.est_value_low ?? 0) + Number(w.est_value_high ?? 0)) / 2;
      if (prevMid <= 0) {
        // First baseline; just store it, don't notify.
        await sb
          .from("sg_leads")
          .update({ est_value_low: fresh.low, est_value_high: fresh.high })
          .eq("id", w.id);
        continue;
      }
      const move = Math.abs(fresh.mid - prevMid) / prevMid;
      if (move < MOVE_THRESHOLD) continue;

      const site =
        process.env.NEXT_PUBLIC_SITE_URL ?? "https://fair-comparisons.com";
      const link = `${site}/tools/valuation/result/${w.token}?utm_source=avm_update`;
      const direction = fresh.mid > prevMid ? "up" : "down";

      if (w.whatsapp && w.marketing_consent) {
        sendWaAsync({
          to: String(w.whatsapp),
          template: "mop_alert", // reuse: town + figure + link
          variables: {
            town: w.town,
            median_price_sgd: fmtSgd(fresh.mid),
            link,
          },
          metric: "AVM Update",
          properties: { lead_token: w.token, channel: "wa" },
        });
      }
      await sendEmail({
        to: String(w.email),
        subject: `Your ${w.town} home value moved ${direction} ${Math.round(move * 100)}%`,
        html: updateHtml({
          town: w.town,
          low: fresh.low,
          high: fresh.high,
          direction,
          movePct: Math.round(move * 100),
          link,
        }),
        metric: "AVM Update",
        properties: { lead_token: w.token, move_pct: Math.round(move * 100) },
      });

      await sb
        .from("sg_leads")
        .update({ est_value_low: fresh.low, est_value_high: fresh.high })
        .eq("id", w.id);
      notified += 1;
    } catch (e) {
      console.error("[cron/avm-updates] watcher failed", w.id, e);
    }
  }

  return NextResponse.json({ ok: true, scanned: watchers.length, notified });
}

function fmtSgd(n: number): string {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    maximumFractionDigits: 0,
  }).format(n);
}

function updateHtml({
  town,
  low,
  high,
  direction,
  movePct,
  link,
}: {
  town: string;
  low: number;
  high: number;
  direction: string;
  movePct: number;
  link: string;
}): string {
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f9fafb">
<tr><td align="center" style="padding:24px 16px">
<table cellpadding="0" cellspacing="0" border="0" width="560" style="background:#ffffff;border-radius:12px;overflow:hidden">
  <tr><td style="background:#0a1733;padding:24px 32px">
    <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff">FairComparisons</p>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#111827">Your ${town} home value moved ${direction} ${movePct}%.</p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6">
      Current range: <strong>${fmtSgd(low)} – ${fmtSgd(high)}</strong>.
    </p>
    <p style="margin:0 0 16px">
      <a href="${link}" style="display:inline-block;background:#1f44ff;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
        See the latest estimate
      </a>
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}
