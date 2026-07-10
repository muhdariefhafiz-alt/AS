import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { sendEmail } from "../../../lib/email";
import { emailShell, p } from "../../../lib/email-layout";
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
      .select(
        "id, name, email, whatsapp, claimed, slug, claimed_email, subscription_tier, stripe_subscription_id, email_opt_out_at"
      )
      .in("id", picked);
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fair-comparisons.com";
    for (const a of agents ?? []) {
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
        subject: `New seller in ${area}: quote within 24h`,
        html: agentInviteHtml({
          agentName: a.name ?? "",
          propertyType: lead.property_type,
          area,
          bedrooms: lead.bedrooms ?? null,
          timeline: lead.timeline,
          estValueLow: lead.est_value_low ?? null,
          estValueHigh: lead.est_value_high ?? null,
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

    // E1 upgrade prompt (docs/email-lifecycle.md): once a free agent has been
    // invited by 3+ sellers lifetime, send a one-time "see plans" nudge.
    // Best-effort: this hook must never fail the invite response.
    try {
      for (const a of agents ?? []) {
        const isFree =
          a.subscription_tier == null || a.subscription_tier === "free";
        if (!isFree || a.stripe_subscription_id) continue;
        // Marketing send: honour the unsubscribe flag (app/unsubscribe sets it).
        if (a.email_opt_out_at) continue;
        const to = a.claimed_email ?? a.email;
        if (!to) continue;

        const { count } = await sb
          .from("sg_lead_shortlist")
          .select("id", { count: "exact", head: true })
          .eq("agent_id", a.id)
          .not("invited_at", "is", null);
        const leadCount = count ?? 0;
        if (leadCount < 3) continue;

        const { data: prior } = await sb
          .from("sg_funnel_events")
          .select("id")
          .eq("event", "upgrade_prompt_sent")
          .eq("agent_id", a.id)
          .limit(1);
        if (prior && prior.length > 0) continue;

        // Record the send BEFORE sending: if the insert fails we skip (no
        // orphan duplicates from concurrent invites); if the send then fails
        // we err toward never re-nagging rather than double-sending.
        const { error: markErr } = await sb
          .from("sg_funnel_events")
          .insert({ event: "upgrade_prompt_sent", agent_id: a.id });
        if (markErr) continue;

        const firstName = (a.name ?? "").split(" ")[0] || "";
        const pricingUrl = `${site}/for-agents?utm_source=notify&utm_medium=agent_upgrade#pricing`;
        await sendEmail({
          to,
          subject: firstName
            ? `You have received ${leadCount} seller leads, ${firstName}`
            : `You have received ${leadCount} seller leads`,
          html: emailShell({
            preheader: "Upgrade to respond faster and show sellers more.",
            heading: `You have received ${leadCount} seller leads`,
            bodyHtml:
              p(
                `Sellers keep picking you: <strong>${leadCount}</strong> have invited you to quote so far.`
              ) +
              p(
                `A subscription never changes your ranking. Your rank is earned on the CEA record and cannot be bought, for anyone. A subscription just gives you better tools to win the sellers who already found you.`
              ),
            cta: { label: "See plans", href: pricingUrl },
            footerNote:
              "You are receiving this because sellers on FairComparisons invited you to quote.",
            unsubscribeEmail: to,
          }),
          metric: "Agent Upgrade",
          properties: { agent_id: a.id, lead_count: leadCount },
        });
      }
    } catch (e) {
      console.error("[sell/invite] upgrade prompt failed", e);
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

// B1 Agent new seller lead (docs/email-lifecycle.md). Transactional: no unsubscribe.
function agentInviteHtml({
  agentName,
  propertyType,
  area,
  bedrooms,
  timeline,
  estValueLow,
  estValueHigh,
  link,
}: {
  agentName: string;
  propertyType: string;
  area: string;
  bedrooms: number | null;
  timeline: string | null;
  estValueLow: number | null;
  estValueHigh: number | null;
  link: string;
}): string {
  const tlLabel: Record<string, string> = {
    asap: "ASAP",
    "1_3m": "Within 1-3 months",
    "3_6m": "Within 3-6 months",
    "6_12m": "Within 6-12 months",
    exploring: "Exploring",
  };
  const timelineLabel = timeline ? (tlLabel[timeline] ?? timeline) : null;
  const fmt = (n: number) => `S$${Math.round(n).toLocaleString("en-SG")}`;
  const low = Number(estValueLow);
  const high = Number(estValueHigh);
  const estValueRange =
    Number.isFinite(low) && low > 0 && Number.isFinite(high) && high > 0
      ? `${fmt(low)} to ${fmt(high)}`
      : Number.isFinite(low) && low > 0
        ? fmt(low)
        : Number.isFinite(high) && high > 0
          ? fmt(high)
          : null;
  const beds = bedrooms ? `${bedrooms}-bed ` : "";

  const preheaderParts = [propertyType];
  if (estValueRange) preheaderParts.push(estValueRange);
  if (timelineLabel) preheaderParts.push(`timeline ${timelineLabel}`);

  const detailParts: string[] = [];
  if (timelineLabel) detailParts.push(`Timeline: <strong>${timelineLabel}</strong>.`);
  if (estValueRange) detailParts.push(`Estimated value: ${estValueRange}.`);

  return emailShell({
    preheader: `${preheaderParts.join(", ")}.`,
    heading: agentName
      ? `${agentName}, you have been shortlisted.`
      : "You have been shortlisted.",
    bodyHtml:
      p(
        `A homeowner selected you to quote on selling their ${beds}${propertyType} in ${area}.`
      ) +
      (detailParts.length > 0 ? p(detailParts.join(" ")) : "") +
      p(
        "Send a fee quote within 24 hours to stay in the running. No platform fee until completion."
      ),
    cta: { label: "Submit your quote", href: link },
  });
}
