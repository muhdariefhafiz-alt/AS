import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { supabase, supabaseAdmin } from "../../lib/supabase";
import { checkRateLimit, clientIp } from "../../lib/rateLimit";
import { sendEmail } from "../../lib/email";
import { emailShell, p, muted } from "../../lib/email-layout";

// Open (community) agent reviews with anti-spam:
//   1. Honeypot field (bots fill it; humans don't).
//   2. Per-IP rate limit (3 review submissions / hour).
//   3. Email double-opt-in, review stays status='pending' (hidden by RLS)
//      until the reviewer clicks the verification link.
//   4. One review per email per agent (DB unique index).
//   5. Min comment length + length caps.
// Verified-completion reviews (from the seller funnel) are separate and carry
// the gold badge; these open reviews are verified_completion=false.

const TX_TYPES = new Set([
  "Bought a property",
  "Sold a property",
  "Rented a property",
  "Other",
]);

function isValidEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 254;
}

function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT || "fc-sg-default-salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

function makeToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .map((s) => s.charAt(0).toUpperCase())
      .join("")
      .slice(0, 4) || "Anonymous"
  );
}

export async function POST(request: Request) {
  try {
    const ip = clientIp(request);
    const { limited } = await checkRateLimit(`review:${ip}`, 3, 60 * 60 * 1000);
    if (limited) {
      return NextResponse.json(
        { error: "Too many review submissions. Try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const {
      agentId,
      reviewerName,
      reviewerEmail,
      rating,
      transactionType,
      comment,
      website, // honeypot, must be empty
    } = body ?? {};

    // Honeypot: a real user never fills this hidden field.
    if (typeof website === "string" && website.trim().length > 0) {
      // Pretend success so bots don't learn.
      return NextResponse.json({ success: true, message: "Thanks!" });
    }

    if (!agentId || !reviewerName || !rating) {
      return NextResponse.json(
        { error: "Name, rating, and email are required." },
        { status: 400 }
      );
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be 1-5." }, { status: 400 });
    }
    if (String(reviewerName).trim().length < 2 || String(reviewerName).length > 100) {
      return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
    }
    if (!reviewerEmail || !isValidEmail(String(reviewerEmail))) {
      return NextResponse.json(
        { error: "A valid email is required (we send a one-click confirmation)." },
        { status: 400 }
      );
    }
    if (!comment || String(comment).trim().length < 15) {
      return NextResponse.json(
        { error: "Please write at least 15 characters about your experience." },
        { status: 400 }
      );
    }
    if (String(comment).length > 2000) {
      return NextResponse.json(
        { error: "Review too long (max 2000 characters)." },
        { status: 400 }
      );
    }
    if (transactionType && !TX_TYPES.has(transactionType)) {
      return NextResponse.json({ error: "Invalid transaction type." }, { status: 400 });
    }

    const sb = supabaseAdmin();
    const emailLc = String(reviewerEmail).toLowerCase().trim();

    // Confirm the agent exists.
    const { data: agent } = await sb
      .from("sg_agents")
      .select("id, name, slug")
      .eq("id", agentId)
      .single();
    if (!agent) {
      return NextResponse.json({ error: "Agent not found." }, { status: 404 });
    }

    // One review per email per agent (covers pending + published).
    const { data: existing } = await sb
      .from("sg_agent_reviews")
      .select("id, status")
      .eq("agent_id", agentId)
      .eq("reviewer_email", emailLc)
      .maybeSingle();
    if (existing) {
      return NextResponse.json(
        { error: "You have already submitted a review for this agent." },
        { status: 409 }
      );
    }

    const token = makeToken();
    const { error: insErr } = await sb.from("sg_agent_reviews").insert({
      agent_id: agentId,
      reviewer_name: String(reviewerName).trim(),
      reviewer_email: emailLc,
      rating,
      rating_overall: rating,
      transaction_type: transactionType || null,
      comment: String(comment).trim(),
      seller_initials: initialsOf(String(reviewerName)),
      verified_completion: false,
      status: "awaiting_email", // hidden until the reviewer confirms their email
      approved: false,
      verify_token: token,
      verify_expires: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      ip_hash: hashIp(ip),
    });
    if (insErr) {
      console.error("[reviews] insert failed", insErr);
      return NextResponse.json(
        { error: "Could not submit review." },
        { status: 500 }
      );
    }

    // Send the one-click confirmation.
    const site =
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://fair-comparisons.com";
    const link = `${site}/api/reviews/verify?token=${token}`;
    const agentName = agent.name ?? "";
    const confirmHtml = emailShell({
      preheader: "One click confirms your review. Link expires in 7 days.",
      heading: `Confirm your review of ${agentName}`,
      bodyHtml: [
        p(
          "One click confirms your review. We check every submission before it appears, so only genuine reviews from a real email get published."
        ),
        muted("Didn't write this review? Ignore this email and nothing will be published."),
      ].join(""),
      cta: { label: "Confirm my review", href: link },
    });
    sendEmail({
      to: emailLc,
      subject: `Confirm your review of ${agentName}`,
      html: confirmHtml,
      metric: "Review Confirmation",
      properties: { agent_id: agent.id },
    }).catch((e) => console.error("[reviews] confirm email failed", e));

    return NextResponse.json({
      success: true,
      message:
        "Almost done. Check your email and click the confirmation link. We review every submission before it goes live.",
    });
  } catch (err) {
    console.error("[reviews] unexpected", err);
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId");
  if (!agentId) {
    return NextResponse.json({ error: "agentId required" }, { status: 400 });
  }

  // Public read: only published, non-completion (open) reviews. RLS also
  // enforces status='published'.
  const { data, error } = await supabase
    .from("sg_agent_reviews")
    .select("id, reviewer_name, rating, transaction_type, comment, created_at")
    .eq("agent_id", agentId)
    .eq("status", "published")
    .eq("verified_completion", false)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) {
    return NextResponse.json({ error: "Could not fetch reviews" }, { status: 500 });
  }
  return NextResponse.json({ reviews: data ?? [] });
}
