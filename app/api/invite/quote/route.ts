import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "../../../lib/supabase";
import { verifyInviteToken } from "../../../lib/agentInvite";
import { validateQuoteFields, submitQuoteCore } from "../../../lib/quotes";
import { checkRateLimit } from "../../../lib/rateLimit";

// Quote submission from a magic invite link (stage-1 claim gate).
//
// The signed token names exactly one (lead, agent) pair and only ever
// travelled to that agent's email address, so acting on it proves address
// ownership. Submitting a quote therefore also CLAIMS an unclaimed profile
// in the same step: claimed_email is set to the address the invite went to,
// contact consent is recorded from the required checkbox, and the address
// is graded 'verified'. No password, no separate verify loop.
//
// Funnel events (kill-criteria measurement, docs: brief_view -> magic_claim
// -> quote): invite_brief_view logs on the page, magic_claim + invite_quote
// log here.

const CONTACT_CONSENT_VERSION = "2026-07-v1";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const inviteToken = typeof body?.invite_token === "string" ? body.invite_token : null;
    const parsed = verifyInviteToken(inviteToken);
    if (!parsed) {
      return NextResponse.json(
        { error: "This invite link is invalid or has expired." },
        { status: 401 }
      );
    }
    const { leadId, agentId } = parsed;

    // Optional WhatsApp opt-in captured on the brief form. A provided number
    // from a claimed/claiming agent is an explicit opt-in for lead alerts.
    const waNum =
      typeof body?.whatsapp === "string" && body.whatsapp.trim().length >= 8
        ? body.whatsapp.trim().slice(0, 20)
        : null;

    // The consent checkbox is the agent's identity confirmation AND the PDPA
    // consent record. Refuse without it: an unchecked submit must never claim
    // a profile for someone.
    if (body?.contact_consent !== true) {
      return NextResponse.json(
        { error: "Please confirm your identity and consent to be contacted." },
        { status: 400 }
      );
    }

    const { limited } = await checkRateLimit(
      `invite-quote:${leadId}:${agentId}`,
      10,
      24 * 60 * 60 * 1000
    );
    if (limited) {
      return NextResponse.json(
        { error: "Too many attempts. Contact support." },
        { status: 429 }
      );
    }

    const v = validateQuoteFields(body ?? {});
    if (!v.ok) {
      return NextResponse.json({ error: v.error }, { status: 400 });
    }

    const sb = supabaseAdmin();
    const { data: agent } = await sb
      .from("sg_agents")
      .select("id, name, slug, email, claimed, claimed_email")
      .eq("id", agentId)
      .single();
    if (!agent) {
      return NextResponse.json({ error: "Agent not found." }, { status: 404 });
    }

    const { data: lead } = await sb
      .from("sg_leads")
      .select(
        "id, token, status, email, whatsapp, marketing_consent, full_name, property_type, town, district_code"
      )
      .eq("id", leadId)
      .single();
    if (!lead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }
    if (["instructed", "completed", "expired"].includes(String(lead.status))) {
      return NextResponse.json(
        { error: "This seller request has closed." },
        { status: 410 }
      );
    }

    const { data: shortlist } = await sb
      .from("sg_lead_shortlist")
      .select("id, status")
      .eq("lead_id", lead.id)
      .eq("agent_id", agent.id)
      .single();
    // 'quoted' is allowed: the upsert lets the agent revise their own quote.
    if (!shortlist || !["invited", "quoted"].includes(String(shortlist.status))) {
      return NextResponse.json(
        { error: "You were not invited to quote on this request." },
        { status: 403 }
      );
    }

    // Claim-on-submit for unclaimed profiles. The invite went to agent.email;
    // that address is now proven owned and consented.
    let claimedNow = false;
    if (!agent.claimed && agent.email) {
      const nowIso = new Date().toISOString();
      const { error: claimErr } = await sb
        .from("sg_agents")
        .update({
          claimed: true,
          claimed_email: agent.email,
          claimed_at: nowIso,
          contact_consent_at: nowIso,
          contact_consent_version: CONTACT_CONSENT_VERSION,
          email_status: "verified",
          email_validated_at: nowIso,
          // WhatsApp opt-in captured on the brief form (only when a number was
          // given). This is the compliant opt-in: claimed + consented + own
          // number.
          ...(waNum ? { whatsapp: waNum, whatsapp_opt_in_at: nowIso } : {}),
        })
        .eq("id", agent.id)
        .eq("claimed", false);
      if (claimErr) {
        console.error("[invite/quote] claim update failed", claimErr);
      } else {
        claimedNow = true;
        // Audit trail alongside banner claims; status 'verified' because the
        // magic link IS the email verification. verification_token is NOT
        // NULL on this table; the magic flow has no separate verify token, so
        // record a synthetic marker instead.
        const { error: auditErr } = await sb.from("sg_claim_requests").insert({
          agent_id: agent.id,
          email: agent.email,
          verification_token: `magic:${crypto.randomUUID()}`,
          status: "verified",
          verified_at: nowIso,
          contact_consent: true,
          source: "magic_invite",
        });
        if (auditErr) {
          console.error("[invite/quote] claim audit insert failed", auditErr);
        }
        await sb.from("sg_funnel_events").insert({
          event: "magic_claim",
          agent_id: agent.id,
          metadata: { lead_id: lead.id },
        });
      }
    } else if (waNum && agent.claimed) {
      // Already-claimed agent adding/updating their WhatsApp opt-in on the form.
      await sb
        .from("sg_agents")
        .update({ whatsapp: waNum, whatsapp_opt_in_at: new Date().toISOString() })
        .eq("id", agent.id);
    }

    const result = await submitQuoteCore({
      lead,
      agent,
      shortlistId: Number(shortlist.id),
      pct: v.pct,
      plan: v.plan,
      fields: body ?? {},
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    await sb.from("sg_funnel_events").insert({
      event: "invite_quote",
      agent_id: agent.id,
      metadata: { lead_id: lead.id, claimed_now: claimedNow },
    });

    // Claiming changes the public profile (claimed state, ego-bait panel
    // disappears); profiles are 12h-ISR so refresh now.
    if (claimedNow && agent.slug) {
      revalidatePath(`/property-agents/agent/${agent.slug}`);
    }

    return NextResponse.json({ success: true, claimed: claimedNow });
  } catch (err) {
    console.error("[invite/quote] unexpected", err);
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
