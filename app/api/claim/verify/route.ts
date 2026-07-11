import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "../../../lib/email";
import { emailShell, p, rows, statCard } from "../../../lib/email-layout";
import { AGENT_TERMS_VERSION } from "../../../lib/agent-terms";
import { givenName } from "../../../lib/names";
import { issueAgentSession, AGENT_COOKIE, AGENT_SESSION_TTL_MS } from "../../../lib/agent-auth";

// Service role: reads/writes agent email + claimed_email during claim
// verification. Those columns are REVOKEd from the anon role.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Bump when the contact-consent wording materially changes, so we can tell who
// consented under which text.
const CONTACT_CONSENT_VERSION = "2026-07-v1";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  // Find claim request
  const { data: claim } = await supabase
    .from("sg_claim_requests")
    .select("id, agent_id, email, status, contact_consent")
    .eq("verification_token", token)
    .single();

  if (!claim) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 404 });
  }

  if (claim.status === "verified") {
    return NextResponse.redirect(new URL("/claim/success", req.url));
  }

  // Verify the claim
  await supabase
    .from("sg_claim_requests")
    .update({ status: "verified", verified_at: new Date().toISOString() })
    .eq("id", claim.id);

  // Mark agent as claimed
  await supabase
    .from("sg_agents")
    .update({
      claimed: true,
      claimed_email: claim.email,
      claimed_at: new Date().toISOString(),
      ...(claim.contact_consent
        ? {
            contact_consent_at: new Date().toISOString(),
            contact_consent_version: CONTACT_CONSENT_VERSION,
          }
        : {}),
    })
    .eq("id", claim.agent_id);

  // Fetch agent details for the welcome email payload
  const { data: agentFull } = await supabase
    .from("sg_agents")
    .select("name, slug, score, agency_name, cea_registration")
    .eq("id", claim.agent_id)
    .single();

  // Record the agent's acceptance of the platform terms (subscription model, no
  // success fee). Clicking the email-verified claim link is the e-signature:
  // identity is confirmed (CEA match at request time + verified email here).
  // fee_pct is recorded as 0: the subscription model takes no cut of any sale.
  await supabase.from("sg_agent_agreements").insert({
    agent_id: claim.agent_id,
    cea_registration: agentFull?.cea_registration ?? null,
    terms_version: AGENT_TERMS_VERSION,
    fee_pct: 0,
    signatory_name: agentFull?.name ?? null,
    signatory_email: claim.email,
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    user_agent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
    source: "claim",
  });

  // Fire Agent Claimed welcome with full HTML.
  // Consent: double opt-in (submitted email + clicked verification link).
  const profileUrl = `https://fair-comparisons.com/property-agents/agent/${agentFull?.slug ?? ""}`;
  const dashboardUrl = "https://fair-comparisons.com/dashboard";
  const claimedHtml = buildClaimedEmail(
    agentFull?.name ?? "",
    agentFull?.score ? Math.round(Number(agentFull.score)) : null,
    profileUrl,
    dashboardUrl,
  );
  // Await before the redirect: a fire-and-forget promise is dropped when the
  // Vercel lambda freezes after responding, so the Klaviyo event never lands.
  try {
    await sendEmail({
      to: claim.email,
      subject: agentFull?.name
        ? `${givenName(agentFull.name)}, your profile is live. 3 things to finish it.`
        : "Your profile is live. 3 things to finish it.",
      html: claimedHtml,
      metric: "Agent Claimed",
      properties: {
        agent_name: agentFull?.name ?? "",
        agent_slug: agentFull?.slug ?? "",
        agent_score: agentFull?.score ?? null,
        agency_name: agentFull?.agency_name ?? "",
        profile_url: profileUrl,
        dashboard_url: dashboardUrl,
      },
    });
  } catch (err) {
    console.error("[claim/verify] Klaviyo welcome event failed:", err);
  }

  // Log the freshly-claimed agent straight in: their email is now verified.
  try {
    const store = await cookies();
    store.set(AGENT_COOKIE, issueAgentSession(claim.email), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(AGENT_SESSION_TTL_MS / 1000),
    });
  } catch (err) {
    console.error("[claim/verify] session cookie set failed", err);
  }

  // Claiming changes the public profile (banner + ego-bait panel disappear,
  // claimed state shows); profiles are 12h-ISR so refresh now.
  if (agentFull?.slug) {
    revalidatePath(`/property-agents/agent/${agentFull.slug}`);
  }

  // Redirect to success page
  return NextResponse.redirect(new URL("/claim/success", req.url));
}

function buildClaimedEmail(
  name: string,
  score: number | null,
  profileUrl: string,
  dashboardUrl: string,
): string {
  const firstName = givenName(name);
  const bodyHtml = [
    p(
      `Your profile is live and sellers in your area can now invite you to quote.${
        score ? " Your AgentScore is computed only from your CEA record." : ""
      }`,
    ),
    score ? statCard(String(score), "Your AgentScore") : "",
    p("Agents who complete these three convert far more of the sellers who view them:"),
    rows(
      [
        "Add a professional photo",
        "Add your WhatsApp number (this is how seller leads reach you fastest)",
        "Write two lines on how you work",
      ],
      true,
    ),
  ].join("");

  return emailShell({
    preheader: "Add your photo and WhatsApp so sellers know who they are picking.",
    heading: `${firstName}, your profile is live. 3 things to finish it.`,
    bodyHtml,
    cta: { label: "Complete your profile", href: `${dashboardUrl}?utm_source=claimed&utm_medium=email` },
    footerNote: "You will get a short weekly report on your leads and views. Manage or turn off anytime.",
  });
}
