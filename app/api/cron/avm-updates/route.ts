import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { sendEmail } from "../../../lib/email";
import { emailShell, p, muted } from "../../../lib/email-layout";
import { sendWaAsync } from "../../../lib/whatsapp";
import { hdbValuation, isValidHdbFlatType } from "../../../lib/avm";

// Weekly cron: recompute AVM watchers' estimates and notify when the value
// has moved more than 2% since we last stored it. HDB-only for now (private
// needs the project slug, which we don't store on the lead).
//
// Monthly nurture (F3): watchers whose estimate has NOT moved 2% still get one
// calm monthly My Home update (Zoopla-style), throttled by digest_last_sent_at.
// Any send (alert or digest) stamps digest_last_sent_at so nobody gets both
// within a month.
//
// Batched: processes up to 200 watchers per run via created_at cursor so we
// never blow the cron time budget.

const MOVE_THRESHOLD = 0.02;
const DIGEST_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;

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
    .select("id, token, property_type, town, email, email_opt_out_at, whatsapp, marketing_consent, est_value_low, est_value_high, flat_type, digest_last_sent_at, keys_date")
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
  let digests = 0;
  const now = Date.now();
  for (const w of watchers) {
    try {
      if (!w.town) continue;
      // Unsubscribed watchers are never mailed again.
      if (w.email_opt_out_at) continue;
      // Use the stored flat type (captured at save since My Home v1); older
      // watchers without one fall back to the historical 4 ROOM town proxy.
      const flat = isValidHdbFlatType(String(w.flat_type ?? "")) ? String(w.flat_type) : "4 ROOM";
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
      const site =
        process.env.NEXT_PUBLIC_SITE_URL ?? "https://fair-comparisons.com";

      if (move < MOVE_THRESHOLD) {
        // Monthly nurture: one calm My Home update while the value holds.
        const lastDigest = w.digest_last_sent_at ? new Date(String(w.digest_last_sent_at)).getTime() : 0;
        if (now - lastDigest < DIGEST_INTERVAL_MS) continue;

        const digestLink = `${site}/tools/valuation/result/${w.token}?utm_source=avm_monthly`;
        const range = `${fmtSgd(fresh.low)} to ${fmtSgd(fresh.high)}`;
        const digestHtml = emailShell({
          preheader: `Your ${w.town} estimate is holding steady.`,
          heading: `Your ${w.town} home, this month`,
          bodyHtml:
            p(
              `Our estimate for your HDB flat is <strong>${range}</strong>, holding steady since your last update (less than 2% movement, based on recent recorded sales in ${w.town}).`
            ) +
            muted(
              `This is a data estimate, not a valuation. Your My Home page has the full picture: recent comparable sales${w.keys_date ? ", your MOP countdown" : ""} and what agents in ${w.town} are selling for.`
            ),
          cta: { label: "Open My Home", href: digestLink },
          footerNote: `Sent monthly to ${w.email} because you asked to watch this valuation on FairComparisons.`,
          unsubscribeEmail: String(w.email),
        });
        await sendEmail({
          to: String(w.email),
          subject: `Your ${w.town} home: this month's estimate`,
          html: digestHtml,
          metric: "AVM Monthly Digest",
          properties: { lead_token: w.token },
        });
        await sb
          .from("sg_leads")
          .update({ digest_last_sent_at: new Date(now).toISOString() })
          .eq("id", w.id);
        digests += 1;
        continue;
      }

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
      const movePct = Math.round(move * 100);
      const rangeStr = `${fmtSgd(fresh.low)} to ${fmtSgd(fresh.high)}`;
      const html = emailShell({
        preheader: `Based on the latest transactions in ${w.town}.`,
        heading: `Your HDB estimate changed to ${rangeStr}`,
        bodyHtml:
          p(
            `Based on recent sales in ${w.town}, our estimate for your HDB flat is now <strong>${rangeStr}</strong> (${direction} ${movePct}% since your last check).`
          ) +
          muted(
            `This is a data estimate, not a valuation. If you are thinking of selling, an agent with a real record in ${w.town} will price it properly.`
          ),
        cta: { label: "Refresh your estimate", href: link },
        footerNote: `Sent to ${w.email} because you asked to watch this valuation on FairComparisons.`,
        unsubscribeEmail: String(w.email),
      });

      await sendEmail({
        to: String(w.email),
        subject: `Your ${w.town} home value moved ${direction} ${movePct}%`,
        html,
        metric: "AVM Update",
        properties: { lead_token: w.token, move_pct: movePct },
      });

      await sb
        .from("sg_leads")
        .update({ est_value_low: fresh.low, est_value_high: fresh.high, digest_last_sent_at: new Date(now).toISOString() })
        .eq("id", w.id);
      notified += 1;
    } catch (e) {
      console.error("[cron/avm-updates] watcher failed", w.id, e);
    }
  }

  return NextResponse.json({ ok: true, scanned: watchers.length, notified, digests });
}

function fmtSgd(n: number): string {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    maximumFractionDigits: 0,
  }).format(n);
}
