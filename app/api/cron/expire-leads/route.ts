import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { sendEmail } from "../../../lib/email";

// Daily cron: expire stale leads (30d old, no activity in 14d, never
// instructed) and offer the seller a one-click restart. Keeps the funnel
// analytics honest and re-engages quiet sellers.

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

  if (!stale || stale.length === 0) {
    return NextResponse.json({ ok: true, expired: 0 });
  }

  let expired = 0;
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
          subject: "Still thinking of selling? Pick up where you left off",
          html: reactivateHtml({ name: lead.full_name ?? "", link }),
          metric: "Seller Reactivation",
          properties: { lead_token: lead.token },
        }).catch((e) => console.error("[cron/expire-leads] email failed", e));
      }
      expired += 1;
    } catch (e) {
      console.error("[cron/expire-leads] row failed", lead.id, e);
    }
  }

  return NextResponse.json({ ok: true, scanned: stale.length, expired });
}

function reactivateHtml({ name, link }: { name: string; link: string }): string {
  const first = name.split(" ")[0] || "";
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
    <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#111827">${first}, your agent comparison is still here.</p>
    <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6">
      When you're ready to sell, your ranked agents are one click away. Rankings update with the latest transaction data, so it's current.
    </p>
    <p style="margin:0 0 16px">
      <a href="${link}" style="display:inline-block;background:#1f44ff;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
        Pick up where I left off
      </a>
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}
