import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { sendEmail } from "../../../lib/email";
import { sendWaAsync } from "../../../lib/whatsapp";
import { lookupMop, isValidHdbFlatType, type HdbFlatType } from "../../../lib/mop";

// Daily cron: find sg_leads (source=mop_tracker) whose MOP is 3 months away,
// refresh the valuation, and email the watcher with a current shortlist.
//
// We don't store the original key collection date in sg_leads (privacy-by-
// default; the date is sensitive). We derive an approximate MOP window from
// the `current_mop_status` snapshot + `est_value_low` to infer flat type and
// only fire alerts for cohorts whose status was `before_mop`.

// For v1 we use the lead's created_at as a proxy for "calc was N months
// ago", which lets us re-run the calc deterministically. This is good
// enough until we add a dedicated mop_alerts table.

export async function GET(req: Request) {
  // Vercel cron sends a header `Authorization: Bearer <CRON_SECRET>`. Allow
  // unauthenticated calls in dev when CRON_SECRET is unset (Klaviyo pattern).
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
    .select("id, token, town, est_value_low, email, whatsapp, created_at, current_mop_status")
    .eq("source", "mop_tracker")
    .eq("status", "mop_watch")
    .not("email", "is", null)
    .limit(500);

  if (!watchers || watchers.length === 0) {
    return NextResponse.json({ ok: true, alerted: 0, message: "No watchers" });
  }

  let alerted = 0;
  for (const w of watchers) {
    try {
      const town = w.town ?? "";
      if (!town) continue;
      const flatType = guessFlatType(w.est_value_low ?? null);
      if (!isValidHdbFlatType(flatType)) continue;

      // We don't know the original key collection — re-run lookup with a
      // synthetic seed; we only care about the median + agents here.
      const result = await lookupMop({
        town,
        flat_type: flatType,
        key_collection_year: new Date(w.created_at).getUTCFullYear() - 4,
        key_collection_month: 1,
      });

      // Only alert if originally before_mop and value snapshot is "fresh".
      if (w.current_mop_status !== "before_mop") continue;

      const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fair-comparisons.com";
      const link = `${site}/tools/mop-tracker/result/${w.token}?utm_source=mop_alert`;

      if (w.whatsapp) {
        const median = result.median_resale_price
          ? new Intl.NumberFormat("en-SG", {
              style: "currency",
              currency: "SGD",
              maximumFractionDigits: 0,
            }).format(result.median_resale_price)
          : "S$—";
        sendWaAsync({
          to: String(w.whatsapp),
          template: "mop_alert",
          variables: { town, median_price_sgd: median, link },
          metric: "MOP Alert",
          properties: { lead_token: w.token, town, channel: "wa" },
        });
      }

      await sendEmail({
        to: String(w.email),
        subject: `${town} HDB market update — your saved MOP snapshot`,
        html: alertHtml({
          town,
          medianPrice: result.median_resale_price,
          flatType,
          link,
        }),
        metric: "MOP Alert",
        properties: { lead_token: w.token, town, flat_type: flatType },
      });
      alerted += 1;
    } catch (e) {
      console.error("[cron/mop-alerts] watcher failed", e, w.id);
    }
  }

  return NextResponse.json({ ok: true, alerted, scanned: watchers.length });
}

function guessFlatType(estValueLow: number | null): HdbFlatType {
  if (!estValueLow) return "4 ROOM";
  if (estValueLow < 380_000) return "3 ROOM";
  if (estValueLow < 720_000) return "4 ROOM";
  if (estValueLow < 950_000) return "5 ROOM";
  return "EXECUTIVE";
}

function alertHtml({
  town,
  medianPrice,
  flatType,
  link,
}: {
  town: string;
  medianPrice: number | null;
  flatType: string;
  link: string;
}): string {
  const fmt = medianPrice
    ? new Intl.NumberFormat("en-SG", {
        style: "currency",
        currency: "SGD",
        maximumFractionDigits: 0,
      }).format(medianPrice)
    : "—";
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
    <p style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111827">${town} HDB market update</p>
    <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6">
      Current median resale for ${flatType} in ${town}: <strong>${fmt}</strong>.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#4b5563;line-height:1.6">
      Tap below for your refreshed MOP snapshot and the top 3 HDB agents in ${town}.
    </p>
    <p style="margin:0 0 16px">
      <a href="${link}" style="display:inline-block;background:#1f44ff;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
        See your snapshot
      </a>
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}
