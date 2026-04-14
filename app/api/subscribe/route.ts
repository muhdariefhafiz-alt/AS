import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service role key for server-side API route (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Simple in-memory rate limiting (per-process, resets on deploy)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 3; // max 3 subscribes per IP per hour
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { email, source, pagePath, districtTag, consent } = body;

    // Validate string lengths to prevent abuse
    if (typeof source === "string" && source.length > 100) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    if (typeof pagePath === "string" && pagePath.length > 500) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    if (typeof districtTag === "string" && districtTag.length > 100) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    // Validate email
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    // PDPA: consent must be explicitly true
    if (consent !== true) {
      return NextResponse.json(
        { error: "Consent is required to subscribe." },
        { status: 400 }
      );
    }

    // Upsert: if email exists, update source/page (don't create duplicate)
    const { error } = await supabase
      .from("sg_email_subscribers")
      .upsert(
        {
          email: email.toLowerCase().trim(),
          source: source || "footer",
          page_path: pagePath || null,
          district_tag: districtTag || null,
          consent: true,
          unsubscribed: false,
        },
        { onConflict: "email" }
      );

    if (error) {
      console.error("Subscribe error:", error);
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "You're subscribed! We'll send you relevant updates.",
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    );
  }
}
