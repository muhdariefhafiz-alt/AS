import { NextResponse } from "next/server";
import { isEmailUsable } from "../../../lib/reachability";
import { createClient } from "@supabase/supabase-js";
import { sendBatchEmails } from "../../../lib/email";
import {
  initialOutreach,
  competitorComparison,
  costComparison,
  areaLeader,
} from "../../../lib/outreach-templates";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Automated agent outreach cron.
 * Runs daily at 10am SGT (2am UTC).
 *
 * Drip campaign targeting top unclaimed agents:
 * - Touch 1: initialOutreach (score reveal + claim CTA)
 * - Touch 2: competitorComparison (claimed vs unclaimed, 7 days later)
 * - Touch 3: costComparison (PropertyGuru pricing vs free, 7 days later)
 * - Touch 4: areaLeader (final push with ranking position, 7 days later)
 *
 * Daily batch: 50 agents max (deliverability + rate limits).
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // HARD GATE. This drip was built with OUTREACH_RECIPIENT hardcoded to
  // hello@fair-comparisons.com as a placeholder, and for months its sends
  // died silently in Klaviyo while sg_outreach recorded agents as touched
  // (1,042 phantom rows / 340 agents by 2026-07-12). When Resend went live
  // the placeholder became a real daily 50-email flood into the owner inbox.
  // Enabling real outreach is a deliberate owner decision (recipients,
  // PDPA posture, copy) and requires clearing the phantom history first so
  // nobody gets a mid-sequence touch as their first-ever email.
  if (process.env.OUTREACH_ENABLED !== "true") {
    return NextResponse.json({
      ok: true,
      sent: 0,
      skipped: "OUTREACH_ENABLED is not 'true'. See route comment before enabling.",
    });
  }

  // Conservative rollout: cap via env (default 10/day, hard ceiling 50).
  const DAILY_LIMIT = Math.max(1, Math.min(50, Number(process.env.OUTREACH_DAILY_CAP ?? 10)));
  const DRIP_SEQUENCE = ["initialOutreach", "competitorComparison", "costComparison", "areaLeader"];
  const results: Record<string, unknown> = {};

  // --- 1. Get top unclaimed agents from area rankings ---
  const { data: candidates } = await supabase
    .from("sg_area_top_agents")
    .select("agent_slug, area_name, area_type, rank, score")
    .order("score", { ascending: false })
    .limit(500);

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, reason: "No candidates" });
  }

  // Dedupe by slug (agent can appear in multiple areas)
  const seen = new Set<string>();
  const uniqueCandidates = candidates.filter(c => {
    if (seen.has(c.agent_slug)) return false;
    seen.add(c.agent_slug);
    return true;
  });

  // Get agent details
  const slugs = uniqueCandidates.map(c => c.agent_slug);
  const { data: agents } = await supabase
    .from("sg_agents")
    .select("id, slug, name, score, transaction_count, primary_area, agency_name, cea_registration, percentile, claimed, email, email_status, email_opt_out_at")
    .in("slug", slugs);

  const agentMap = new Map((agents ?? []).map(a => [a.slug, a]));

  // Warmest-first: agents real sellers shortlisted in the last 30 days lead
  // the queue (their email opens with genuine demand, not cold ego-bait).
  const d30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: shortlisted } = await supabase
    .from("sg_lead_shortlist")
    .select("agent_id")
    .gte("created_at", d30);
  const shortlistedIds = new Set((shortlisted ?? []).map(r => r.agent_id));
  uniqueCandidates.sort((a, b) => {
    const aw = shortlistedIds.has(agentMap.get(a.agent_slug)?.id ?? -1) ? 0 : 1;
    const bw = shortlistedIds.has(agentMap.get(b.agent_slug)?.id ?? -1) ? 0 : 1;
    return aw - bw;
  });

  // Get existing outreach history
  const agentIds = (agents ?? []).filter(a => !a.claimed).map(a => a.id);
  const { data: history } = agentIds.length > 0
    ? await supabase
        .from("sg_outreach")
        .select("agent_id, campaign, sent_at")
        .in("agent_id", agentIds)
    : { data: [] };

  // Build history map: agent_id -> { campaigns sent, last sent date }
  const historyMap = new Map<number, { campaigns: Set<string>; lastSent: string | null }>();
  for (const h of history ?? []) {
    if (!historyMap.has(h.agent_id)) {
      historyMap.set(h.agent_id, { campaigns: new Set(), lastSent: null });
    }
    const entry = historyMap.get(h.agent_id)!;
    if (h.campaign) entry.campaigns.add(h.campaign);
    if (h.sent_at && (!entry.lastSent || h.sent_at > entry.lastSent)) {
      entry.lastSent = h.sent_at;
    }
  }

  // --- 2. Determine next template per agent ---
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  type Sendable = {
    agentId: number;
    agent: NonNullable<typeof agents>[number];
    template: string;
    rank: number;
    area: string;
  };

  const toSend: Sendable[] = [];

  for (const candidate of uniqueCandidates) {
    if (toSend.length >= DAILY_LIMIT) break;

    const agent = agentMap.get(candidate.agent_slug);
    if (!agent || agent.claimed) continue;
    if (!agent.score || Number(agent.score) < 30) continue;
    // Real-recipient suppression: must have a usable, non-opted-out email.
    if (!agent.email || agent.email_opt_out_at) continue;
    if (!isEmailUsable(agent.email, agent.email_status)) continue;

    const h = historyMap.get(agent.id);

    // Find next template in drip sequence
    let nextTemplate: string | null = null;

    if (!h || h.campaigns.size === 0) {
      nextTemplate = DRIP_SEQUENCE[0];
    } else {
      // Find the first template not yet sent
      for (const t of DRIP_SEQUENCE) {
        if (!h.campaigns.has(t)) {
          // Only send if last touch was 7+ days ago
          if (h.lastSent && h.lastSent < sevenDaysAgo) {
            nextTemplate = t;
          }
          break;
        }
      }
    }

    if (!nextTemplate) continue;

    toSend.push({
      agentId: agent.id,
      agent,
      template: nextTemplate,
      rank: candidate.rank,
      area: candidate.area_name,
    });
  }

  results.candidates_evaluated = uniqueCandidates.length;
  results.eligible = toSend.length;

  if (toSend.length === 0) {
    await logRun(results, 0);
    return NextResponse.json({ ok: true, sent: 0, ...results });
  }

  // --- 3. Generate emails using lib templates ---
  // Recipient is the agent's own email; the signed unsubscribe link must match
  // the `to` address exactly. (The old hello@ placeholder is gone: this route
  // only runs behind OUTREACH_ENABLED and only for suppression-checked agents.)
  const emailBatch = toSend.map(({ agent, template, rank, area }) => {
    const OUTREACH_RECIPIENT = String(agent.email);
    const agentData = {
      name: agent.name,
      slug: agent.slug,
      score: agent.score ? Number(agent.score) : null,
      transaction_count: agent.transaction_count,
      primary_area: agent.primary_area || area,
      agency_name: agent.agency_name,
      cea_registration: agent.cea_registration,
      percentile: agent.percentile,
    };

    let email: { subject: string; html: string };

    switch (template) {
      case "initialOutreach":
        email = initialOutreach(agentData, OUTREACH_RECIPIENT);
        break;
      case "competitorComparison":
        email = competitorComparison(agentData, OUTREACH_RECIPIENT);
        break;
      case "costComparison":
        email = costComparison(agentData, OUTREACH_RECIPIENT);
        break;
      case "areaLeader":
        email = areaLeader(agentData, rank, area, OUTREACH_RECIPIENT);
        break;
      default:
        email = initialOutreach(agentData, OUTREACH_RECIPIENT);
    }

    return {
      ...email,
      to: OUTREACH_RECIPIENT,
      metric: "Agent Outreach",
      properties: {
        agent_id: agent.id,
        agent_slug: agent.slug,
        template,
      },
      _meta: { agentId: agent.id, agentName: agent.name, cea: agent.cea_registration, score: agent.score, template },
    };
  });

  // --- 4. Send via Klaviyo in batches ---
  let sent = 0;
  const BATCH_SIZE = 10;

  for (let i = 0; i < emailBatch.length; i += BATCH_SIZE) {
    const batch = emailBatch.slice(i, i + BATCH_SIZE);
    try {
      await sendBatchEmails(batch.map(e => ({
        to: e.to,
        subject: e.subject,
        html: e.html,
        metric: e.metric,
        properties: e.properties,
      })));
      sent += batch.length;

      // Log each to sg_outreach
      const rows = batch.map(e => ({
        agent_id: e._meta.agentId,
        agent_name: e._meta.agentName,
        cea_registration: e._meta.cea,
        score: e._meta.score,
        campaign: e._meta.template,
        template: e._meta.template,
        status: "sent",
        sent_at: new Date().toISOString(),
        email_sent: true,
        email_sent_at: new Date().toISOString(),
        email_subject: e.subject,
        batch_id: new Date().toISOString().slice(0, 10),
      }));

      await supabase.from("sg_outreach").upsert(rows, {
        onConflict: "agent_id,campaign",
        ignoreDuplicates: false,
      });
    } catch (err) {
      console.error(`[outreach-cron] Batch ${i} failed:`, err);
    }
  }

  // --- 5. Summary ---
  const templateCounts: Record<string, number> = {};
  for (const s of toSend) {
    templateCounts[s.template] = (templateCounts[s.template] || 0) + 1;
  }

  results.sent = sent;
  results.by_template = templateCounts;

  await logRun(results, sent);

  return NextResponse.json({ ok: true, ...results });
}

async function logRun(results: Record<string, unknown>, sent: number) {
  await supabase.from("sg_funnel_events").insert({
    event: "cron_outreach",
    metadata: { ...results, sent, timestamp: new Date().toISOString() },
  });
}
