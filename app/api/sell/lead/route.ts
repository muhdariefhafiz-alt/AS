import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { supabaseAdmin } from "../../../lib/supabase";
import { buildShortlist, makeLeadToken, type PropertyType } from "../../../lib/sellMatch";
import { sendEmail } from "../../../lib/email";
import { sendWaAsync } from "../../../lib/whatsapp";
import { checkRateLimit, clientIp } from "../../../lib/rateLimit";
import { escapeHtml } from "../../../lib/escapeHtml";

// Per-IP rate limit: 5 lead submissions / hour (Redis-backed when configured).
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;

function isValidEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 254;
}

const PROP_TYPES: PropertyType[] = ["HDB", "CONDO", "LANDED", "EC"];
const TIMELINES = ["asap", "1_3m", "3_6m", "6_12m", "exploring"];
const REASONS = ["upgrade", "downsize", "relocate", "investment", "other"];

function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT || "fc-sg-default-salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

function isSgPhone(p: string): boolean {
  const digits = p.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    const { limited } = await checkRateLimit(
      `sell-lead:${ip}`,
      RATE_LIMIT,
      RATE_WINDOW_MS
    );
    if (limited) {
      return NextResponse.json(
        { error: "Too many submissions. Try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const {
      property_type,
      bedrooms,
      district_code,
      town,
      postal_code,
      address_line,
      est_value_low,
      est_value_high,
      timeline,
      reason,
      current_mop_status,
      full_name,
      email,
      phone,
      whatsapp,
      pdpa_consent,
      marketing_consent,
      source,
      utm_campaign,
      requested_agent_id,
    } = body ?? {};

    // Required fields
    if (!PROP_TYPES.includes(property_type)) {
      return NextResponse.json(
        { error: "Property type is required." },
        { status: 400 }
      );
    }
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }
    if (!full_name || typeof full_name !== "string" || full_name.length > 120) {
      return NextResponse.json(
        { error: "Please enter your name." },
        { status: 400 }
      );
    }
    if (phone && !isSgPhone(phone)) {
      return NextResponse.json(
        { error: "Phone number looks invalid." },
        { status: 400 }
      );
    }
    if (pdpa_consent !== true) {
      return NextResponse.json(
        { error: "You must agree to data sharing to receive a shortlist." },
        { status: 400 }
      );
    }
    if (!town && !district_code) {
      return NextResponse.json(
        { error: "Tell us the HDB town or district your property is in." },
        { status: 400 }
      );
    }
    if (timeline && !TIMELINES.includes(timeline)) {
      return NextResponse.json({ error: "Invalid timeline." }, { status: 400 });
    }
    if (reason && !REASONS.includes(reason)) {
      return NextResponse.json({ error: "Invalid reason." }, { status: 400 });
    }
    if (
      bedrooms !== undefined &&
      bedrooms !== null &&
      (typeof bedrooms !== "number" || bedrooms < 1 || bedrooms > 12)
    ) {
      return NextResponse.json({ error: "Invalid bedrooms." }, { status: 400 });
    }
    if (postal_code && !/^\d{6}$/.test(String(postal_code))) {
      return NextResponse.json(
        { error: "Postal code should be 6 digits." },
        { status: 400 }
      );
    }

    const sb = supabaseAdmin();

    // Build shortlist BEFORE the insert — if we can't match, no point creating a lead.
    let shortlist = await buildShortlist({
      property_type,
      town: town ?? null,
      district_code: district_code ?? null,
    });

    // Per-agent "Request an introduction" CTA (anti-leakage): the seller started
    // from a specific agent's profile. Guarantee that agent is in the shortlist,
    // pinned at the top, even if they don't rank for the seller's area. This turns
    // "I'll just google them" into a tracked, fee-attributable introduction.
    const ridNum = Number(requested_agent_id);
    let requestedId: number | null =
      Number.isInteger(ridNum) && ridNum > 0 ? ridNum : null;
    if (requestedId) {
      const existing = shortlist.find((a) => a.agent_id === requestedId);
      if (existing) {
        // Already matched for this area — float them to the top.
        shortlist = [
          existing,
          ...shortlist.filter((a) => a.agent_id !== requestedId),
        ];
      } else {
        // Not in the area shortlist — inject from sg_agents so the seller still
        // gets the agent they asked for, plus area agents to compare against.
        const { data: ra } = await sb
          .from("sg_agents")
          .select("id, name, slug, agency_name, cea_registration, score, transaction_count")
          .eq("id", requestedId)
          .maybeSingle();
        if (ra) {
          const base = Number(ra.score ?? 0);
          shortlist = [
            {
              agent_id: Number(ra.id),
              agent_name: String(ra.name ?? ""),
              agent_slug: String(ra.slug ?? ""),
              cea_reg: String(ra.cea_registration ?? ""),
              agency_name: String(ra.agency_name ?? ""),
              score: base,
              total_txns: Number(ra.transaction_count ?? 0),
              area_txns: 0,
              area_focus_pct: 0,
              area_property_types: null,
              rank_match: 0,
              source_area: "",
              score_components: {
                base_score: base,
                type_bonus: 0,
                locality_bonus: 0,
                composite: base,
              },
            },
            ...shortlist,
          ].slice(0, 8); // requested agent + up to 7 area agents to compare
        } else {
          // Invalid/unknown agent id — ignore the pin, fall back to area match.
          requestedId = null;
        }
      }
    }

    if (shortlist.length === 0) {
      // Demand with no supply: the top liquidity leak. Track it as an event even
      // though no lead row is created (the seller bounced here).
      await sb.from("sg_lead_events").insert({
        lead_id: null,
        event_type: "shortlist_empty",
        meta: {
          property_type,
          town: town ?? null,
          district_code: district_code ?? null,
          source: source ?? null,
        },
      });
      return NextResponse.json(
        {
          error:
            "We could not find ranked agents for that area yet. Try a nearby town or district.",
        },
        { status: 422 }
      );
    }

    const token = makeLeadToken();

    const { data: lead, error: leadErr } = await sb
      .from("sg_leads")
      .insert({
        token,
        status: "shortlisted",
        property_type,
        bedrooms: bedrooms ?? null,
        district_code: district_code ?? null,
        town: town ?? null,
        postal_code: postal_code ?? null,
        address_line: address_line ?? null,
        est_value_low: est_value_low ?? null,
        est_value_high: est_value_high ?? null,
        timeline: timeline ?? null,
        reason: reason ?? null,
        current_mop_status: current_mop_status ?? null,
        full_name,
        email: String(email).toLowerCase().trim(),
        phone: phone ?? null,
        whatsapp: whatsapp ?? null,
        pdpa_consent: true,
        marketing_consent: marketing_consent === true,
        source: source ?? null,
        utm_campaign: utm_campaign ?? null,
        requested_agent_id: requestedId,
        user_agent: req.headers.get("user-agent") ?? null,
        ip_hash: hashIp(ip),
      })
      .select("id, token")
      .single();
    if (leadErr || !lead) {
      console.error("[sell/lead] insert failed", leadErr);
      return NextResponse.json(
        { error: "Could not save your request. Please try again." },
        { status: 500 }
      );
    }

    // Rank by final position (the pinned requested agent sits at index 0 → rank 1).
    // The requested agent is flagged "requested" so the shortlist UI can pre-select
    // and badge them; everyone else stays "suggested".
    const shortlistRows = shortlist.map((a, i) => ({
      lead_id: lead.id,
      agent_id: a.agent_id,
      rank: i + 1,
      score_at_shortlist: a.score_components.composite,
      status: a.agent_id === requestedId ? "requested" : "suggested",
    }));
    const { error: shortlistErr } = await sb
      .from("sg_lead_shortlist")
      .insert(shortlistRows);
    if (shortlistErr) {
      console.error("[sell/lead] shortlist insert failed", shortlistErr);
      // Don't fail the request — the seller can still see results from the
      // returned shortlist; we'll log the gap.
    }

    await sb.from("sg_lead_events").insert({
      lead_id: lead.id,
      event_type: "submit_form",
      meta: {
        property_type,
        town: town ?? null,
        district_code: district_code ?? null,
        shortlist_size: shortlist.length,
        source: source ?? null,
        utm_campaign: utm_campaign ?? null,
      },
    });

    // Per-agent funnel event: each shortlisted agent received a lead.
    // First-lead-per-agent is the earliest such event for that agent.
    await sb.from("sg_lead_events").insert(
      shortlist.map((a) => ({
        lead_id: lead.id,
        agent_id: a.agent_id,
        event_type: "lead_received",
        meta: { rank: a.rank_match, area: town ?? district_code ?? null },
      }))
    );

    // Fire confirmation email + WhatsApp in parallel.
    const site =
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://fair-comparisons.com";
    const shortlistLink = `${site}/sell/shortlist/${lead.token}?utm_source=notify`;
    const area = town ?? district_code ?? "your area";

    if (whatsapp && marketing_consent === true) {
      sendWaAsync({
        to: String(whatsapp),
        template: "seller_shortlist_ready",
        variables: {
          seller_first_name: String(full_name).split(" ")[0] || "Hi",
          property_type,
          area,
          link: shortlistLink,
        },
        metric: "Seller Shortlist Ready",
        properties: {
          lead_token: lead.token,
          channel: "wa",
        },
      });
    }

    sendEmail({
      to: String(email).toLowerCase().trim(),
      subject: `Your ${shortlist.length} matched agents are ready`,
      html: confirmationHtml({
        name: full_name,
        token: lead.token,
        propertyType: property_type,
        area,
        count: shortlist.length,
      }),
      metric: "Seller Shortlist Ready",
      properties: {
        lead_token: lead.token,
        property_type,
        area: town ?? district_code ?? null,
        shortlist_size: shortlist.length,
      },
    }).catch((e) => console.error("[sell/lead] email failed", e));

    return NextResponse.json({
      success: true,
      token: lead.token,
      shortlist_size: shortlist.length,
    });
  } catch (err) {
    console.error("[sell/lead] unexpected", err);
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}

function confirmationHtml({
  name,
  token,
  propertyType,
  area,
  count,
}: {
  name: string;
  token: string;
  propertyType: string;
  area: string;
  count: number;
}): string {
  const site =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://fair-comparisons.com";
  const link = `${site}/sell/shortlist/${token}?utm_source=email&utm_medium=transactional`;
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
    <p style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111827">${escapeHtml(name)}, your shortlist is ready.</p>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6">
      Based on actual CEA transaction records, we identified ${count} agents who consistently sell ${escapeHtml(propertyType)} property in ${escapeHtml(area)}. Pick up to 3 to invite. They will submit a fee quote within 24 hours.
    </p>
    <p style="margin:0 0 24px">
      <a href="${link}" style="display:inline-block;background:#1f44ff;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
        View your shortlist
      </a>
    </p>
    <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5">
      Free for sellers. Agents only pay if you complete a sale through them.
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}
