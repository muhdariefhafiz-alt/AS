import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { sendEmail } from "../../../lib/email";
import { sendWaAsync } from "../../../lib/whatsapp";
import { checkRateLimit } from "../../../lib/rateLimit";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, agent_ids } = body ?? {};

    if (typeof token !== "string" || token.length < 8 || token.length > 64) {
      return NextResponse.json({ error: "Invalid token." }, { status: 400 });
    }
    if (!Array.isArray(agent_ids) || agent_ids.length === 0) {
      return NextResponse.json(
        { error: "Pick at least one agent to invite." },
        { status: 400 }
      );
    }
    if (agent_ids.length > 3) {
      return NextResponse.json(
        { error: "You can invite up to 3 agents at a time." },
        { status: 400 }
      );
    }
    const ids = agent_ids.map(Number).filter((n) => Number.isFinite(n) && n > 0);
    if (ids.length !== agent_ids.length) {
      return NextResponse.json({ error: "Invalid agent ids." }, { status: 400 });
    }

    // Durable per-token cap (Redis-backed): 10 invite changes / 24h. The old
    // in-memory Map reset on every serverless cold start, so the cap was
    // effectively decorative; each invite sends up to 3 agent emails + WhatsApps.
    const { limited } = await checkRateLimit(
      `invite:${token}`,
      10,
      24 * 60 * 60 * 1000
    );
    if (limited) {
      return NextResponse.json(
        { error: "Too many invite changes. Contact support." },
        { status: 429 }
      );
    }

    const sb = supabaseAdmin();
    const { data: lead, error: leadErr } = await sb
      .from("sg_leads")
      .select(
        "id, status, property_type, town, district_code, full_name, email, postal_code, address_line, bedrooms, timeline, reason, est_value_low, est_value_high"
      )
      .eq("token", token)
      .single();
    if (leadErr || !lead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    // Confirm the picked agents are in this lead's shortlist (no random invites).
    const { data: existingShortlist, error: sErr } = await sb
      .from("sg_lead_shortlist")
      .select("id, agent_id, status, rank")
      .eq("lead_id", lead.id);
    if (sErr || !existingShortlist) {
      return NextResponse.json(
        { error: "Shortlist unavailable." },
        { status: 500 }
      );
    }
    const allowedIds = new Set(existingShortlist.map((r) => r.agent_id));
    const picked = ids.filter((id) => allowedIds.has(id));
    if (picked.length === 0) {
      return NextResponse.json(
        { error: "Those agents aren't in your shortlist." },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();
    // Mark picked agents as invited; mark the rest as not_picked.
    const updates = existingShortlist.map((r) => ({
      id: r.id,
      status: picked.includes(r.agent_id)
        ? "invited"
        : r.status === "suggested"
          ? "not_picked"
          : r.status,
      invited_at: picked.includes(r.agent_id) ? nowIso : null,
    }));
    for (const u of updates) {
      await sb
        .from("sg_lead_shortlist")
        .update({ status: u.status, invited_at: u.invited_at })
        .eq("id", u.id);
    }

    await sb.from("sg_leads").update({ status: "invited" }).eq("id", lead.id);
    await sb.from("sg_lead_events").insert({
      lead_id: lead.id,
      event_type: "select_agents",
      meta: { invited_ids: picked },
    });

    // Notify agents who were invited (email + WhatsApp in parallel).
    const { data: agents } = await sb
      .from("sg_agents")
      .select("id, name, email, whatsapp, claimed, slug")
      .in("id", picked);
    for (const a of agents ?? []) {
      const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fair-comparisons.com";
      const link = `${site}/dashboard?token=${token}&utm_source=notify&utm_medium=agent_invite`;
      const area = lead.town ?? lead.district_code ?? "your area";
      // WhatsApp lands in seconds; email is the durable record.
      if (a.whatsapp) {
        sendWaAsync({
          to: String(a.whatsapp),
          template: "agent_invite",
          variables: {
            agent_first_name: (a.name ?? "").split(" ")[0] || "Hi",
            area,
            property_type: lead.property_type,
            link,
          },
          metric: "Agent Notification",
          properties: { lead_token: token, agent_id: a.id, channel: "wa" },
        });
      }
      if (!a.email) continue;
      sendEmail({
        to: a.email,
        subject: `New seller in ${area} — quote within 24h`,
        html: agentInviteHtml({
          agentName: a.name ?? "",
          propertyType: lead.property_type,
          area,
          bedrooms: lead.bedrooms ?? null,
          timeline: lead.timeline,
          link,
        }),
        metric: "Agent Notification",
        properties: {
          lead_token: token,
          agent_id: a.id,
          property_type: lead.property_type,
        },
      }).catch((e) => console.error("[sell/invite] agent email failed", e));
    }

    return NextResponse.json({
      success: true,
      invited_count: picked.length,
    });
  } catch (err) {
    console.error("[sell/invite] unexpected", err);
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}

function agentInviteHtml({
  agentName,
  propertyType,
  area,
  bedrooms,
  timeline,
  link,
}: {
  agentName: string;
  propertyType: string;
  area: string;
  bedrooms: number | null;
  timeline: string | null;
  link: string;
}): string {
  const tlLabel: Record<string, string> = {
    asap: "ASAP",
    "1_3m": "Within 1–3 months",
    "3_6m": "Within 3–6 months",
    "6_12m": "Within 6–12 months",
    exploring: "Exploring",
  };
  const beds = bedrooms ? `${bedrooms}-bed ` : "";
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
    <p style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111827">${agentName}, you have been shortlisted.</p>
    <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6">
      A homeowner selected you to quote on selling their ${beds}${propertyType} in ${area}.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#4b5563;line-height:1.6">
      Timeline: <strong>${tlLabel[timeline ?? "exploring"] ?? timeline ?? "Exploring"}</strong><br>
      Submit a fee quote within 24 hours to stay in the running. No platform fee until completion.
    </p>
    <p style="margin:0 0 16px">
      <a href="${link}" style="display:inline-block;background:#1f44ff;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
        Submit your quote
      </a>
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}
