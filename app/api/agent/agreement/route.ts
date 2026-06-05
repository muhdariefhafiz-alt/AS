import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { checkRateLimit, clientIp } from "../../../lib/rateLimit";
import { AGENT_TERMS_VERSION } from "../../../lib/agent-terms";
import { PLATFORM_FEE_PCT } from "../../../lib/fee";

// Records a signed blanket agent agreement. One row per signing (audit trail).
// Identity = cea_registration + email match against sg_agents (same loose
// pattern as /api/sell/completion/log and /api/dashboard/lookup).

/** GET /api/agent/agreement?cea=R000000A -> { signed, version, acceptedAt } */
export async function GET(req: Request) {
  const cea = new URL(req.url).searchParams.get("cea")?.trim();
  if (!cea) return NextResponse.json({ signed: false });
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("sg_agent_agreements")
    .select("terms_version, accepted_at, signatory_name")
    .eq("cea_registration", cea)
    .order("accepted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return NextResponse.json({
    signed: !!data && data.terms_version === AGENT_TERMS_VERSION,
    version: data?.terms_version ?? null,
    acceptedAt: data?.accepted_at ?? null,
    signatoryName: data?.signatory_name ?? null,
    currentVersion: AGENT_TERMS_VERSION,
  });
}

/**
 * POST /api/agent/agreement
 * Body: { ceaRegistration, email, signatoryName, accept:true, source? }
 */
export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    const { limited } = await checkRateLimit(`agreement:${ip}`, 10, 60 * 60 * 1000);
    if (limited) return NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429 });

    const body = await req.json();
    const ceaRegistration = String(body?.ceaRegistration ?? "").trim();
    const email = String(body?.email ?? "").toLowerCase().trim();
    const signatoryName = String(body?.signatoryName ?? "").trim();
    const accept = body?.accept === true;
    const source = typeof body?.source === "string" ? body.source.slice(0, 30) : "self-serve";

    if (!ceaRegistration || !email || !signatoryName) {
      return NextResponse.json({ error: "CEA registration, email and your full name are required." }, { status: 400 });
    }
    if (!accept) {
      return NextResponse.json({ error: "You must accept the agreement to sign." }, { status: 400 });
    }
    if (signatoryName.length < 2 || signatoryName.length > 80) {
      return NextResponse.json({ error: "Please type your full name as your signature." }, { status: 400 });
    }

    const sb = supabaseAdmin();
    const { data: agent } = await sb
      .from("sg_agents")
      .select("id, name, email, claimed_email, cea_registration")
      .eq("cea_registration", ceaRegistration)
      .single();
    if (!agent) {
      return NextResponse.json({ error: "No agent found for that CEA registration." }, { status: 404 });
    }
    // Once an agent has claimed (verified email ownership), ONLY their
    // claimed_email authenticates; the scraped public email no longer works,
    // which closes impersonation of claimed agents. Unclaimed agents may still
    // use their on-file email.
    const matches = agent.claimed_email
      ? String(agent.claimed_email).toLowerCase() === email
      : !!agent.email && String(agent.email).toLowerCase() === email;
    if (!matches) {
      return NextResponse.json(
        { error: "That email does not match the CEA registration on file. Use the email on your CEA record or your claimed-profile email." },
        { status: 403 }
      );
    }

    // Already signed the current version? Return the existing acceptance.
    const { data: existing } = await sb
      .from("sg_agent_agreements")
      .select("terms_version, accepted_at")
      .eq("agent_id", agent.id)
      .eq("terms_version", AGENT_TERMS_VERSION)
      .order("accepted_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ ok: true, alreadySigned: true, version: AGENT_TERMS_VERSION, acceptedAt: existing.accepted_at });
    }

    const acceptedAt = new Date().toISOString();
    await sb.from("sg_agent_agreements").insert({
      agent_id: agent.id,
      cea_registration: ceaRegistration,
      terms_version: AGENT_TERMS_VERSION,
      fee_pct: PLATFORM_FEE_PCT,
      signatory_name: signatoryName,
      signatory_email: email,
      ip,
      user_agent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
      source,
    });
    await sb.from("sg_lead_events").insert({
      agent_id: agent.id,
      event_type: "agent_agreement_signed",
      meta: { terms_version: AGENT_TERMS_VERSION, fee_pct: PLATFORM_FEE_PCT, source },
    });

    return NextResponse.json({ ok: true, version: AGENT_TERMS_VERSION, acceptedAt });
  } catch (err) {
    console.error("[agent/agreement] error", err);
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
