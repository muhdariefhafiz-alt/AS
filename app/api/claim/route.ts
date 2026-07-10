import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "../../lib/email";
import { emailShell, p, muted } from "../../lib/email-layout";
import { givenName, titleName } from "../../lib/names";
import { checkRateLimit, clientIp } from "../../lib/rateLimit";

// Service role: this route reads agent contact PII (email/phone) to send a
// claim verification email. Those columns are REVOKEd from the anon role.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function generateToken(): string {
  // Cryptographically secure, URL-safe (~32 chars, 192 bits).
  return randomBytes(24).toString("base64url");
}

export async function POST(req: Request) {
  try {
    // Throttle claim attempts so the public CEA number cannot be used to
    // brute-force / spam claim emails.
    const ip = clientIp(req);
    const { limited } = await checkRateLimit(`claim:${ip}`, 5, 60 * 60 * 1000);
    if (limited) {
      return NextResponse.json(
        { error: "Too many claim attempts. Please try again later." },
        { status: 429 }
      );
    }

    const { agentId, email, phone, ceaNumber, contactConsent } = await req.json();

    if (!agentId || !email || !ceaNumber) {
      return NextResponse.json({ error: "Agent ID, email, and CEA registration number are required" }, { status: 400 });
    }
    if (contactConsent !== true) {
      return NextResponse.json(
        { error: "You must agree to be contacted to claim your profile." },
        { status: 400 }
      );
    }

    // Check agent exists
    const { data: agent } = await supabase
      .from("sg_agents")
      .select("id, name, claimed, cea_registration, email")
      .eq("id", agentId)
      .single();

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Verify CEA registration number matches
    if (
      !agent.cea_registration ||
      ceaNumber.trim().toLowerCase() !== agent.cea_registration.trim().toLowerCase()
    ) {
      return NextResponse.json(
        { error: "CEA registration number does not match this profile" },
        { status: 403 }
      );
    }

    if (agent.claimed) {
      return NextResponse.json({ error: "This profile has already been claimed" }, { status: 409 });
    }

    // Block duplicate in-flight requests (auto-verify pending OR manual review).
    const { data: existing } = await supabase
      .from("sg_claim_requests")
      .select("id, status")
      .eq("agent_id", agentId)
      .in("status", ["pending", "manual_review"])
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "A claim request is already pending for this profile" }, { status: 409 });
    }

    const token = generateToken();

    // Two verification paths:
    //  - On-file email exists: send a verify link there. Clicking it proves the
    //    claimant controls the agent's inbox (the CEA number alone is public, so
    //    it cannot be the only factor). Self-serve, status "pending".
    //  - No on-file email (true across the whole DB right now): we cannot prove
    //    ownership by email, so route to MANUAL ADMIN REVIEW rather than dead-
    //    ending. Status "manual_review"; an admin approves it in /admin/claims.
    const path: "pending" | "manual_review" = agent.email ? "pending" : "manual_review";

    const { error } = await supabase.from("sg_claim_requests").insert({
      agent_id: agentId,
      email,
      phone: phone || null,
      verification_token: token,
      status: path,
      contact_consent: true,
    });
    if (error) {
      return NextResponse.json({ error: "Failed to create claim request" }, { status: 500 });
    }

    if (path === "manual_review") {
      return NextResponse.json({
        success: true,
        review: true,
        message:
          "Claim request received. We could not auto-verify your email, so our team will review it and confirm by email within 1 business day.",
      });
    }

    // Auto-verify path: send the verification link to the ON-FILE email only.
    const verifyUrl = `https://fair-comparisons.com/api/claim/verify?token=${token}`;
    const verifyHtml = buildVerifyEmail(agent.name, verifyUrl);
    // Await the send: on Vercel a fire-and-forget promise is dropped once the
    // response returns (the lambda freezes), so the Klaviyo event never lands.
    try {
      await sendEmail({
        to: agent.email!,
        subject: `Verify your profile claim, ${givenName(agent.name)}`,
        html: verifyHtml,
        metric: "Claim Verification",
        properties: {
          agent_name: agent.name,
          agent_id: agentId,
          verify_url: verifyUrl,
        },
      });
    } catch (err) {
      console.error("[claim] Klaviyo verification event failed:", err);
    }

    return NextResponse.json({
      success: true,
      message: "Claim request submitted. Check your email for the verification link.",
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

function buildVerifyEmail(agentName: string, verifyUrl: string): string {
  const bodyHtml =
    p(
      `You asked to claim the FairComparisons profile for <strong>${titleName(agentName)}</strong>. Confirm it is you and your profile goes live in seconds.`
    ) + muted("If you did not request this, ignore this email. No changes will be made.");

  return emailShell({
    preheader: "One click confirms this profile is yours. Link expires in 24h.",
    heading: `Verify your profile claim, ${givenName(agentName)}`,
    bodyHtml,
    cta: { label: "Verify and claim profile", href: verifyUrl },
  });
}
