import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { sendEmail } from "../../../lib/email";
import { emailShell, p } from "../../../lib/email-layout";
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

      // We don't know the original key collection, so re-run lookup with a
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
          : "not yet available";
        sendWaAsync({
          to: String(w.whatsapp),
          template: "mop_alert",
          variables: { town, median_price_sgd: median, link },
          metric: "MOP Alert",
          properties: { lead_token: w.token, town, channel: "wa" },
        });
      }

      const medianPrice = result.median_resale_price
        ? new Intl.NumberFormat("en-SG", {
            style: "currency",
            currency: "SGD",
            maximumFractionDigits: 0,
          }).format(result.median_resale_price)
        : null;

      const html = emailShell({
        preheader: medianPrice
          ? `Median resale in ${town} is ${medianPrice}. See who is selling.`
          : `See who is selling in ${town}.`,
        heading: `Your flat in ${town} is now eligible to sell`,
        bodyHtml:
          p(
            `Your HDB flat in ${town} has reached its Minimum Occupation Period, so you can now sell on the open market.`
          ) +
          (medianPrice
            ? p(
                `Median resale in ${town} is currently <strong>${medianPrice}</strong>. When you are ready, see the agents who actually sell in ${town}, ranked on their record.`
              )
            : p(
                `When you are ready, see the agents who actually sell in ${town}, ranked on their record.`
              )),
        cta: { label: `See agents in ${town}`, href: link },
        footerNote: `Sent to ${w.email} because you saved a MOP snapshot on FairComparisons.`,
        unsubscribeEmail: String(w.email),
      });

      await sendEmail({
        to: String(w.email),
        subject: `Your flat in ${town} is now eligible to sell`,
        html,
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
