import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { sendEmail } from "../../../lib/email";
import { emailShell, p } from "../../../lib/email-layout";
import { escapeHtml } from "../../../lib/escapeHtml";

// Daily cron: expire stale leads (30d old, no activity in 14d, never
// instructed) and offer the seller a one-click restart. Keeps the funnel
// analytics honest and re-engages quiet sellers.
//
// Also sends the single 48h shortlist reminder (doc A5 notes): leads still
// "shortlisted" 48h after creation get one nudge, suppressed forever after
// via a "shortlist_reminder" event.

const ACTIVE_STATES = ["shortlisted", "invited", "quoted", "reshortlisted"];

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const sb = supabaseAdmin();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const { data: stale } = await sb
    .from("sg_leads")
    .select("id, token, status, full_name, email, updated_at, created_at")
    .in("status", ACTIVE_STATES)
    .lt("created_at", thirtyDaysAgo)
    .limit(500);

  let expired = 0;

  if (stale && stale.length > 0) {
    const fourteenDaysAgo = Date.now() - 14 * 86_400_000;

    for (const lead of stale) {
      try {
        // Skip if there was a recent event (seller still engaged).
        const { data: recentEvent } = await sb
          .from("sg_lead_events")
          .select("created_at")
          .eq("lead_id", lead.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const lastActivity = recentEvent
          ? new Date(recentEvent.created_at).getTime()
          : new Date(lead.updated_at ?? lead.created_at).getTime();
        if (lastActivity > fourteenDaysAgo) continue;

        await sb.from("sg_leads").update({ status: "expired" }).eq("id", lead.id);
        await sb.from("sg_lead_events").insert({
          lead_id: lead.id,
          event_type: "lead_expired",
          meta: { prior_status: lead.status },
        });

        if (lead.email) {
          const site =
            process.env.NEXT_PUBLIC_SITE_URL ?? "https://fair-comparisons.com";
          const link = `${site}/sell/shortlist/${lead.token}?utm_source=reactivation`;
          sendEmail({
            to: lead.email,
            subject: "Still selling your home?",
            html: emailShell({
              preheader:
                "Your ranked shortlist is still here. Pick up where you left off.",
              heading: "Still selling your home?",
              bodyHtml:
                p(
                  "A while back you started comparing agents for your home sale. Your shortlist, ranked on real CEA sales, is still ready."
                ) +
                p(
                  "Whenever you are ready, pick up to 3 agents and we will get you fee quotes. No pressure, no cost."
                ),
              cta: { label: "Resume your shortlist", href: link },
              unsubscribeEmail: lead.email,
            }),
            metric: "Seller Reactivation",
            properties: { lead_token: lead.token },
          }).catch((e) => console.error("[cron/expire-leads] email failed", e));
        }
        expired += 1;
      } catch (e) {
        console.error("[cron/expire-leads] row failed", lead.id, e);
      }
    }
  }

  // 48h shortlist reminder (doc A5 notes): status still "shortlisted", no
  // agent invited, one reminder ever. The "shortlist_reminder" event is the
  // permanent suppression record.
  const fortyEightHoursAgo = new Date(Date.now() - 2 * 86_400_000).toISOString();
  const { data: pending } = await sb
    .from("sg_leads")
    .select("id, token, full_name, email, property_type, town, district_code, created_at")
    .eq("status", "shortlisted")
    .lt("created_at", fortyEightHoursAgo)
    .limit(500);

  let reminded = 0;

  for (const lead of pending ?? []) {
    try {
      if (!lead.email) continue;

      const { data: alreadyReminded } = await sb
        .from("sg_lead_events")
        .select("created_at")
        .eq("lead_id", lead.id)
        .eq("event_type", "shortlist_reminder")
        .limit(1)
        .maybeSingle();
      if (alreadyReminded) continue;

      const site =
        process.env.NEXT_PUBLIC_SITE_URL ?? "https://fair-comparisons.com";
      const link = `${site}/sell/shortlist/${lead.token}?utm_source=shortlist_reminder`;
      const first = (lead.full_name ?? "").split(" ")[0] || "";
      const propertyType: string = lead.property_type ?? "";
      const area: string = lead.town ?? lead.district_code ?? "your area";

      sendEmail({
        to: lead.email,
        subject: `${first ? `${first}, your` : "Your"} ${propertyType ? `${propertyType} ` : ""}shortlist is still ready`,
        html: emailShell({
          preheader: `Your shortlist is still ready: agents ranked on real sales in ${escapeHtml(area)}.`,
          heading: `${first ? `${escapeHtml(first)}, your` : "Your"} ${propertyType ? `${escapeHtml(propertyType)} ` : ""}shortlist is still ready`,
          bodyHtml:
            p(
              `We ranked the agents who actually sell ${propertyType ? `${escapeHtml(propertyType)} ` : ""}in ${escapeHtml(area)} on their CEA record. Your shortlist is still ready.`
            ) +
            p(
              "Pick up to 3 and we will ask them to send you a fee quote. No obligation, and you only ever hear from the ones you choose."
            ),
          cta: { label: "View your shortlist", href: link },
          unsubscribeEmail: lead.email,
        }),
        metric: "Seller Shortlist Ready",
        properties: { reminder: true },
      }).catch((e) =>
        console.error("[cron/expire-leads] reminder email failed", e)
      );

      await sb.from("sg_lead_events").insert({
        lead_id: lead.id,
        event_type: "shortlist_reminder",
      });
      reminded += 1;
    } catch (e) {
      console.error("[cron/expire-leads] reminder row failed", lead.id, e);
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: stale?.length ?? 0,
    expired,
    reminded,
  });
}
