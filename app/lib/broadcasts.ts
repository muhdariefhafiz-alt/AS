import type { SupabaseClient } from "@supabase/supabase-js";

// Operator broadcasts: targeted in-app announcements to an agent cohort. The
// audience is a small filter over sg_agents fields, evaluated two ways: in JS
// against a single agent row (the dashboard banner) and as a Supabase query
// (the admin recipient count + email blast). v1 supports the cleanly-queryable
// dimensions: tier, claim status, and farm area.

export type BroadcastAudience = {
  tier?: string[]; // subscription_tier in (null tier counts as "free")
  claimed?: boolean; // claimed = ?
  area?: string[]; // primary_area in
};

export type Broadcast = {
  id: number;
  title: string;
  body: string;
  cta_label: string | null;
  cta_href: string | null;
  severity: string;
  audience: BroadcastAudience;
};

type AgentRow = {
  subscription_tier?: string | null;
  claimed?: boolean | null;
  primary_area?: string | null;
};

// Does an agent match a broadcast audience? An empty audience targets everyone.
export function matchesAudience(a: AgentRow, aud: BroadcastAudience): boolean {
  if (aud.tier?.length && !aud.tier.includes(a.subscription_tier ?? "free")) return false;
  if (aud.claimed != null && Boolean(a.claimed) !== aud.claimed) return false;
  if (aud.area?.length && !(a.primary_area && aud.area.includes(a.primary_area))) return false;
  return true;
}

// Human-readable audience summary for the composer + admin list.
export function describeAudience(aud: BroadcastAudience): string {
  const parts: string[] = [];
  if (aud.claimed === true) parts.push("claimed");
  else if (aud.claimed === false) parts.push("unclaimed");
  if (aud.tier?.length) parts.push(`tier: ${aud.tier.join("/")}`);
  if (aud.area?.length) parts.push(`area: ${aud.area.slice(0, 3).join("/")}${aud.area.length > 3 ? "..." : ""}`);
  return parts.length ? parts.join(", ") : "all agents";
}

// Active broadcasts an agent should see now (matched by audience, not dismissed).
export async function activeBroadcastsForAgent(
  sb: SupabaseClient,
  agent: AgentRow,
  agentId: number,
): Promise<Broadcast[]> {
  const nowIso = new Date().toISOString();
  const { data: rows } = await sb
    .from("sg_broadcasts")
    .select("id, title, body, cta_label, cta_href, severity, audience, ends_at")
    .eq("active", true)
    .lte("starts_at", nowIso)
    .order("created_at", { ascending: false });
  const live = (rows ?? []).filter((b) => !b.ends_at || b.ends_at > nowIso);
  const matched = live.filter((b) => matchesAudience(agent, (b.audience ?? {}) as BroadcastAudience));
  if (!matched.length) return [];

  const { data: dismissed } = await sb
    .from("sg_broadcast_dismissals")
    .select("broadcast_id")
    .eq("agent_id", agentId)
    .in("broadcast_id", matched.map((b) => b.id));
  const dismissedIds = new Set((dismissed ?? []).map((d) => Number(d.broadcast_id)));

  return matched
    .filter((b) => !dismissedIds.has(Number(b.id)))
    .map((b) => ({
      id: Number(b.id),
      title: String(b.title),
      body: String(b.body),
      cta_label: (b.cta_label as string | null) ?? null,
      cta_href: (b.cta_href as string | null) ?? null,
      severity: String(b.severity ?? "info"),
      audience: (b.audience ?? {}) as BroadcastAudience,
    }));
}
