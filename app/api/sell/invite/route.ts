import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "../../../lib/supabase";
import { sendEmail } from "../../../lib/email";
import { emailShell, p } from "../../../lib/email-layout";
import { sendWa, isWhatsAppLive } from "../../../lib/whatsapp";
import { isEmailUsable, isAgentReachable } from "../../../lib/reachability";
import { agentInviteUrl } from "../../../lib/agentInvite";
import { greetName, titleName } from "../../../lib/names";
import { checkRateLimit } from "../../../lib/rateLimit";

// One sg_lead_notifications row per (agent, channel) attempt. The outcome is
// the provider's real answer, never an assumption; seller-facing copy and the
// admin integrity view read these rows instead of trusting status='invited'.
type NotificationRow = {
  lead_id: number;
  agent_id: number;
  channel: "email" | "whatsapp" | "none";
  provider_message_id: string | null;
  outcome: "sent" | "dry_run" | "error" | "skipped_no_channel";
  error: string | null;
};

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

    // Fetch the picked agents BEFORE writing any status: whether an agent can
    // be marked 'invited' depends on whether we can actually reach them. The
    // old code stamped status='invited' unconditionally, so agents with no
    // contact channel were shown to the seller as contacted when nothing was
    // ever attempted.
    const { data: agents } = await sb
      .from("sg_agents")
      .select(
        "id, name, email, email_status, whatsapp, claimed, slug, claimed_email, subscription_tier, stripe_subscription_id, email_opt_out_at"
      )
      .in("id", picked);

    // Reachability per agent (lib/reachability): a usable email (not graded
    // dead by the MX sweep or a bounce), or WhatsApp once provisioned.
    const waLive = isWhatsAppLive();
    const reachableIds = new Set(
      (agents ?? []).filter(isAgentReachable).map((a) => Number(a.id))
    );
    const unreachable = (agents ?? [])
      .filter((a) => !reachableIds.has(Number(a.id)))
      .map((a) => ({ id: Number(a.id), name: String(a.name ?? "") }));

    if (reachableIds.size === 0) {
      // Nothing we send would reach anyone. Refuse honestly instead of
      // pretending the invite went out.
      await sb
        .from("sg_lead_shortlist")
        .update({ status: "unreachable" })
        .eq("lead_id", lead.id)
        .in("agent_id", picked);
      await sb.from("sg_lead_notifications").insert(
        picked.map((agentId) => ({
          lead_id: lead.id,
          agent_id: agentId,
          channel: "none",
          provider_message_id: null,
          outcome: "skipped_no_channel",
          error: null,
        }))
      );
      await sb.from("sg_lead_events").insert({
        lead_id: lead.id,
        event_type: "select_agents_unreachable",
        meta: { picked_ids: picked },
      });
      return NextResponse.json(
        {
          error:
            "None of the selected agents has verified contact details on FairComparisons yet, so we cannot send your request to them. Please pick a different agent from your shortlist.",
        },
        { status: 422 }
      );
    }

    const nowIso = new Date().toISOString();
    // Reachable picked agents become 'invited'; picked agents we cannot reach
    // become 'unreachable' (never shown to the seller as contacted); untouched
    // suggestions become 'not_picked'. invited_at is only written for rows
    // being invited now, so earlier invites keep their timestamp.
    for (const r of existingShortlist) {
      if (picked.includes(r.agent_id)) {
        if (reachableIds.has(r.agent_id)) {
          await sb
            .from("sg_lead_shortlist")
            .update({ status: "invited", invited_at: nowIso })
            .eq("id", r.id);
        } else {
          await sb
            .from("sg_lead_shortlist")
            .update({ status: "unreachable", invited_at: null })
            .eq("id", r.id);
        }
      } else if (r.status === "suggested") {
        await sb
          .from("sg_lead_shortlist")
          .update({ status: "not_picked" })
          .eq("id", r.id);
      }
    }

    await sb.from("sg_leads").update({ status: "invited" }).eq("id", lead.id);
    await sb.from("sg_lead_events").insert({
      lead_id: lead.id,
      event_type: "select_agents",
      meta: {
        invited_ids: picked.filter((id) => reachableIds.has(id)),
        unreachable_ids: unreachable.map((u) => u.id),
      },
    });

    // Notify reachable invited agents and record every attempt's REAL outcome.
    // Sends are awaited (not fire-and-forget) so provider rejections become
    // durable 'error' rows instead of vanishing into console.error.
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fair-comparisons.com";
    const notifications: NotificationRow[] = [];
    let notifiedCount = 0;
    for (const a of agents ?? []) {
      const agentId = Number(a.id);
      if (!reachableIds.has(agentId)) {
        notifications.push({
          lead_id: lead.id,
          agent_id: agentId,
          channel: "none",
          provider_message_id: null,
          outcome: "skipped_no_channel",
          error: null,
        });
        continue;
      }
      // Per-agent magic link: lands on the tokened brief + quote form and
      // claims an unclaimed profile on submit. The old /dashboard?token= CTA
      // walled every unclaimed agent behind a sign-in form.
      const link = agentInviteUrl(lead.id, agentId, "agent_invite");
      const area = lead.town ?? lead.district_code ?? "your area";
      let agentNotified = false;

      // WhatsApp lands in seconds; only attempted when provisioned, so a
      // dry-run is never recorded as contact.
      if (a.whatsapp && waLive) {
        try {
          const wa = await sendWa({
            to: String(a.whatsapp),
            template: "agent_invite",
            variables: {
              agent_first_name: greetName(a.name ?? "") || "Hi",
              area,
              property_type: lead.property_type,
              link,
            },
            metric: "Agent Notification",
            properties: { lead_token: token, agent_id: a.id, channel: "wa" },
          });
          notifications.push({
            lead_id: lead.id,
            agent_id: agentId,
            channel: "whatsapp",
            provider_message_id: wa.dry_run ? null : wa.id,
            outcome: wa.dry_run ? "dry_run" : "sent",
            error: null,
          });
          if (!wa.dry_run) agentNotified = true;
        } catch (e) {
          notifications.push({
            lead_id: lead.id,
            agent_id: agentId,
            channel: "whatsapp",
            provider_message_id: null,
            outcome: "error",
            error: String(e).slice(0, 500),
          });
        }
      }

      // Email is the durable record. sendEmail never throws; failures come
      // back as id='resend-error' and are recorded as such. Graded-dead
      // addresses (no_mx/bounced/complained) are never sent to: a guaranteed
      // bounce helps nobody and burns the sending domain.
      if (a.email && isEmailUsable(a.email, a.email_status)) {
        try {
          const res = (await sendEmail({
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
          })) as { id: string; error?: string };
          const failed =
            res.id === "resend-error" || res.id === "dry-run" ||
            res.id === "klaviyo-event-queued";
          notifications.push({
            lead_id: lead.id,
            agent_id: agentId,
            channel: "email",
            provider_message_id: failed ? null : res.id,
            // Klaviyo events and dry-runs are not proof anyone was emailed.
            outcome:
              res.id === "resend-error"
                ? "error"
                : failed
                  ? "dry_run"
                  : "sent",
            error: res.error ?? null,
          });
          if (!failed) agentNotified = true;
        } catch (e) {
          notifications.push({
            lead_id: lead.id,
            agent_id: agentId,
            channel: "email",
            provider_message_id: null,
            outcome: "error",
            error: String(e).slice(0, 500),
          });
        }
      }

      if (agentNotified) notifiedCount += 1;
    }

    if (notifications.length > 0) {
      const { error: notifErr } = await sb
        .from("sg_lead_notifications")
        .insert(notifications);
      if (notifErr) {
        console.error("[sell/invite] notification ledger insert failed", notifErr);
      }
    }

    // Profiles are 12h-ISR; a new pick must show in the ego-bait panel now,
    // not at the next revalidation window.
    for (const a of agents ?? []) {
      if (a.slug) revalidatePath(`/property-agents/agent/${a.slug}`);
    }

    // Written record for the seller: which agents were actually notified (by
    // name, from the ledger just written) and the permanent link to their
    // quotes page. Without this the seller's inbox never contains the URL
    // where everything happens next.
    if (lead.email && notifiedCount > 0) {
      const notifiedNames = (agents ?? [])
        .filter((a) =>
          notifications.some(
            (n) => n.agent_id === Number(a.id) && n.outcome === "sent"
          )
        )
        .map((a) => titleName(a.name ?? ""));
      const quotesUrl = `${site}/sell/quotes/${token}?utm_source=notify&utm_medium=invites_sent`;
      const first = (lead.full_name ?? "").split(" ")[0] || "";
      sendEmail({
        to: lead.email,
        subject: `We have emailed your ${notifiedCount} agent${notifiedCount === 1 ? "" : "s"}`,
        html: emailShell({
          preheader: "Each has 24 hours to send a fee quote. This is your record.",
          heading: `${first ? `${first}, your` : "Your"} request is with ${notifiedCount} agent${notifiedCount === 1 ? "" : "s"}.`,
          bodyHtml:
            p(
              `We emailed ${notifiedNames.join(", ")} your property brief and asked for a fee quote within 24 hours.`
            ) +
            (unreachable.length > 0
              ? p(
                  `We could not reach ${unreachable.map((u) => titleName(u.name)).join(", ")}: no verified contact details on FairComparisons. Your request was not sent to them.`
                )
              : "") +
            p(
              "We will email you the moment a quote arrives. If any agent stays silent, you can invite different agents from the same page."
            ),
          cta: { label: "Track your quotes", href: quotesUrl },
        }),
        metric: "Seller Invites Sent",
        properties: { lead_token: token, notified: notifiedCount },
      }).catch((e) => console.error("[sell/invite] seller record email failed", e));
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
      // Agents actually invited (reachable and marked invited), agents a
      // provider accepted a message for, and agents we could not reach at
      // all. The client shows the seller the truth, not picked.length.
      invited_count: reachableIds.size,
      notified_count: notifiedCount,
      unreachable: unreachable.map((u) => u.name),
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
      ? `${greetName(agentName) || titleName(agentName)}, you have been shortlisted.`
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
