import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { getAdminSession } from "../../../lib/admin-auth";
import { describeAudience, type BroadcastAudience } from "../../../lib/broadcasts";

// Operator broadcast admin: list recent broadcasts, preview a cohort's recipient
// count, create a broadcast, or deactivate one. Admin-session gated.

// Count agents who can actually RECEIVE an in-app announcement: claimed (only a
// claimed agent can sign in) and not the sandbox account. Counting the rest
// reported "reaches 38,297 agents" for an audience of five, which then made
// every coverage percentage look like a catastrophe. Null tier counts as
// "free". Inlined (not a generic helper) because Supabase's builder types are
// too deep to thread through.
function recipientQuery(sb: ReturnType<typeof supabaseAdmin>, aud: BroadcastAudience) {
  let q = sb
    .from("sg_agents")
    .select("id", { count: "exact", head: true })
    .eq("claimed", true)
    .eq("is_sandbox", false);
  if (aud.tier?.length) {
    q = aud.tier.includes("free")
      ? q.or(`subscription_tier.is.null,subscription_tier.in.(${aud.tier.join(",")})`)
      : q.in("subscription_tier", aud.tier);
  }
  // aud.claimed is deliberately not applied: the cohort is claimed-only by
  // construction above, so an "unclaimed" audience reaches nobody in-app.
  if (aud.area?.length) q = q.in("primary_area", aud.area);
  return q;
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sb = supabaseAdmin();
  const [{ data: rows }, { count: totalAgents }, { data: coverage }] = await Promise.all([
    sb.from("sg_broadcasts").select("id, title, body, severity, audience, active, starts_at, ends_at, created_at, created_by").order("created_at", { ascending: false }).limit(50),
    sb.from("sg_agents").select("id", { count: "exact", head: true }).eq("claimed", true).eq("is_sandbox", false),
    // Delivery reality per announcement: seen / read / clicked out of the
    // eligible cohort, plus the agents still missing. Without this the only
    // honest answer to "have they all seen it?" is "no idea".
    sb.rpc("sg_broadcast_coverage"),
  ]);
  type Coverage = { id: number; eligible: number; seen: number; acked: number; clicked: number; unseen_count: number; unseen: { name: string | null; email: string | null }[] };
  const byId = new Map<number, Coverage>(((coverage ?? []) as Coverage[]).map((c) => [Number(c.id), c]));
  const list = (rows ?? []).map((b) => ({
    ...b,
    audience_label: describeAudience((b.audience ?? {}) as BroadcastAudience),
    coverage: byId.get(Number(b.id)) ?? null,
  }));
  return NextResponse.json({ broadcasts: list, totalAgents: totalAgents ?? 0 });
}

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    action: "preview" | "create" | "deactivate";
    audience?: BroadcastAudience;
    id?: number;
    title?: string;
    text?: string;
    cta_label?: string;
    cta_href?: string;
    link_label?: string;
    link_href?: string;
    severity?: string;
    ends_at?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const sb = supabaseAdmin();

  if (body.action === "preview") {
    const { count } = await recipientQuery(sb, body.audience ?? {});
    return NextResponse.json({ recipients: count ?? 0 });
  }

  if (body.action === "deactivate") {
    if (!Number.isFinite(Number(body.id))) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    await sb.from("sg_broadcasts").update({ active: false }).eq("id", Number(body.id));
    return NextResponse.json({ ok: true });
  }

  if (body.action === "create") {
    const title = String(body.title ?? "").trim();
    const text = String(body.text ?? "").trim();
    if (!title || !text) return NextResponse.json({ error: "Title and body are required." }, { status: 400 });
    const severity = ["info", "success", "warn"].includes(String(body.severity)) ? String(body.severity) : "info";
    const { count } = await recipientQuery(sb, body.audience ?? {});
    const { data, error } = await sb
      .from("sg_broadcasts")
      .insert({
        title,
        body: text,
        cta_label: body.cta_label?.trim() || null,
        cta_href: body.cta_href?.trim() || null,
        link_label: body.link_label?.trim() || null,
        link_href: body.link_href?.trim() || null,
        severity,
        audience: body.audience ?? {},
        ends_at: body.ends_at || null,
        created_by: session.email,
      })
      .select("id")
      .maybeSingle();
    if (error) return NextResponse.json({ error: "Could not create broadcast." }, { status: 500 });
    return NextResponse.json({ ok: true, id: data?.id, recipients: count ?? 0 });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
