import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { getAgentSession } from "../../../lib/agent-auth";
import {
  BUILDING_PAGE_QUOTA,
  MIN_COMMENTARY_CHARS,
  MAX_COMMENTARY_CHARS,
  MAX_HEADLINE_CHARS,
} from "../../../lib/buildingPages";
import type { Tier } from "../../../lib/tiers";

// Building spotlights CRUD for the agent dashboard. All writes go through the
// service-role client after the fc_agent session + row-ownership checks.
// Marketing surface only: nothing here touches score, rank or lead flow.

const PAGE_COLS = "id, project_id, slug, headline, commentary, status, updated_at, published_at";

async function quotaFor(agentId: number): Promise<{ tier: Tier; quota: number; used: number }> {
  const sb = supabaseAdmin();
  const [{ data: agent }, { count }] = await Promise.all([
    sb.from("sg_agents").select("subscription_tier").eq("id", agentId).single(),
    sb.from("sg_building_pages").select("id", { count: "exact", head: true }).eq("agent_id", agentId),
  ]);
  const tier = (agent?.subscription_tier ?? "free") as Tier;
  return { tier, quota: BUILDING_PAGE_QUOTA[tier] ?? BUILDING_PAGE_QUOTA.free, used: count ?? 0 };
}

export async function GET(req: Request) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const sb = supabaseAdmin();

  // ?q= doubles as the development search box in the create form.
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (q) {
    if (q.length < 2) return NextResponse.json({ projects: [] });
    const { data } = await sb
      .from("sg_projects")
      .select("id, name, slug, street, district, txn_count")
      .ilike("name", `%${q}%`)
      .order("txn_count", { ascending: false })
      .limit(8);
    return NextResponse.json({ projects: data ?? [] });
  }

  const [{ data: pages }, quota] = await Promise.all([
    sb
      .from("sg_building_pages")
      .select(`${PAGE_COLS}, sg_projects(name, district, txn_count)`)
      .eq("agent_id", session.agentId)
      .order("updated_at", { ascending: false }),
    quotaFor(session.agentId),
  ]);

  return NextResponse.json({
    ...quota,
    pages: (pages ?? []).map((p) => {
      const proj = p.sg_projects as unknown as { name: string; district: string | null; txn_count: number | null } | null;
      return {
        id: p.id, project_id: p.project_id, slug: p.slug, headline: p.headline,
        commentary: p.commentary, status: p.status, updated_at: p.updated_at,
        published_at: p.published_at, project_name: proj?.name ?? p.slug,
        district: proj?.district ?? null, txn_count: proj?.txn_count ?? null,
      };
    }),
  });
}

function validateContent(headline: unknown, commentary: unknown, publishing: boolean): string | null {
  if (typeof headline !== "string" || headline.trim().length < 8) return "Headline must be at least 8 characters.";
  if (headline.trim().length > MAX_HEADLINE_CHARS) return `Headline must be at most ${MAX_HEADLINE_CHARS} characters.`;
  if (typeof commentary !== "string") return "Commentary is required.";
  if (commentary.trim().length > MAX_COMMENTARY_CHARS) return `Commentary must be at most ${MAX_COMMENTARY_CHARS} characters.`;
  if (publishing && commentary.trim().length < MIN_COMMENTARY_CHARS)
    return `Commentary must be at least ${MIN_COMMENTARY_CHARS} characters before publishing, so every spotlight adds real, unique local insight.`;
  return null;
}

export async function POST(req: Request) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const sb = supabaseAdmin();

  let body: { projectId?: number; headline?: string; commentary?: string; publish?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const projectId = Number(body.projectId);
  if (!Number.isFinite(projectId) || projectId <= 0) return NextResponse.json({ error: "Pick a development first." }, { status: 400 });

  const publish = body.publish === true;
  const contentError = validateContent(body.headline, body.commentary, publish);
  if (contentError) return NextResponse.json({ error: contentError }, { status: 400 });

  const { tier, quota, used } = await quotaFor(session.agentId);
  if (used >= quota) {
    return NextResponse.json(
      { error: `Your ${tier} plan includes ${quota} building page${quota === 1 ? "" : "s"} and you already have ${used}. Upgrade to add more.` },
      { status: 403 },
    );
  }

  const { data: project } = await sb.from("sg_projects").select("id, slug, name").eq("id", projectId).single();
  if (!project) return NextResponse.json({ error: "Development not found." }, { status: 404 });

  if (publish) {
    const { count } = await sb
      .from("sg_building_pages")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("status", "published");
    if ((count ?? 0) > 0) return NextResponse.json({ error: "Another agent already presents this development. Pick a different building or save as draft." }, { status: 409 });
  }

  const { data: created, error } = await sb
    .from("sg_building_pages")
    .insert({
      agent_id: session.agentId,
      project_id: projectId,
      slug: project.slug,
      headline: (body.headline as string).trim(),
      commentary: (body.commentary as string).trim(),
      status: publish ? "published" : "draft",
      published_at: publish ? new Date().toISOString() : null,
    })
    .select(PAGE_COLS)
    .single();

  if (error) {
    // 23505 = unique violation: either the agent already has a row for this
    // development, or a concurrent publish won the exclusive live slot.
    if (error.code === "23505") {
      return NextResponse.json({ error: "You already have a page for this development, or another agent just published one." }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not save the page." }, { status: 500 });
  }
  return NextResponse.json({ page: created });
}

export async function PATCH(req: Request) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const sb = supabaseAdmin();

  let body: { id?: string; headline?: string; commentary?: string; status?: "draft" | "published" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: "Missing page id" }, { status: 400 });

  const { data: existing } = await sb
    .from("sg_building_pages")
    .select(PAGE_COLS)
    .eq("id", body.id)
    .eq("agent_id", session.agentId)
    .single();
  if (!existing) return NextResponse.json({ error: "Page not found" }, { status: 404 });

  const nextHeadline = body.headline !== undefined ? body.headline : existing.headline;
  const nextCommentary = body.commentary !== undefined ? body.commentary : existing.commentary;
  const nextStatus = body.status === "draft" || body.status === "published" ? body.status : existing.status;

  const contentError = validateContent(nextHeadline, nextCommentary, nextStatus === "published");
  if (contentError) return NextResponse.json({ error: contentError }, { status: 400 });

  if (nextStatus === "published" && existing.status !== "published") {
    const { count } = await sb
      .from("sg_building_pages")
      .select("id", { count: "exact", head: true })
      .eq("project_id", existing.project_id)
      .eq("status", "published")
      .neq("id", existing.id);
    if ((count ?? 0) > 0) return NextResponse.json({ error: "Another agent already presents this development." }, { status: 409 });
  }

  const { data: updated, error } = await sb
    .from("sg_building_pages")
    .update({
      headline: String(nextHeadline).trim(),
      commentary: String(nextCommentary).trim(),
      status: nextStatus,
      updated_at: new Date().toISOString(),
      published_at: nextStatus === "published" ? (existing.published_at ?? new Date().toISOString()) : existing.published_at,
    })
    .eq("id", existing.id)
    .eq("agent_id", session.agentId)
    .select(PAGE_COLS)
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Another agent just published a page for this development." }, { status: 409 });
    return NextResponse.json({ error: "Could not update the page." }, { status: 500 });
  }
  return NextResponse.json({ page: updated });
}

export async function DELETE(req: Request) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: "Missing page id" }, { status: 400 });

  const { error } = await supabaseAdmin()
    .from("sg_building_pages")
    .delete()
    .eq("id", body.id)
    .eq("agent_id", session.agentId);
  if (error) return NextResponse.json({ error: "Could not delete the page." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
