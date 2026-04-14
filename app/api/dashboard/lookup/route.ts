import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Lookup a claimed agent by email.
 * Returns agent profile data if email matches a claimed agent.
 */
export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const normalized = email.toLowerCase().trim();

    const { data: agent } = await supabase
      .from("sg_agents")
      .select("id, name, slug, bio, photo_url, whatsapp, score, agency_name, claimed, claimed_email")
      .eq("claimed", true)
      .eq("claimed_email", normalized)
      .single();

    if (!agent) {
      return NextResponse.json({ error: "No claimed profile found" }, { status: 404 });
    }

    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        slug: agent.slug,
        bio: agent.bio,
        photo_url: agent.photo_url,
        whatsapp: agent.whatsapp,
        score: agent.score,
        agency_name: agent.agency_name,
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
