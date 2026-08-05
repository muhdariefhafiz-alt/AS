import type { SupabaseClient } from "@supabase/supabase-js";

// Operator announcements: targeted product news for an agent cohort. The
// audience is a small filter over sg_agents fields, evaluated two ways: in JS
// against a single agent row (the dashboard) and as a Supabase query (the admin
// recipient count + email blast). v1 supports the cleanly-queryable dimensions:
// tier, claim status, and farm area.
//
// DELIVERY MODEL. An announcement is not a banner that lives on the dashboard
// until someone kills it. It is delivered once, deliberately:
//
//   spotlight  exactly ONE announcement, the newest unacknowledged one, shown
//              as a focused card the agent closes. Never a stack: two banners
//              competing is two banners ignored, and the dashboard is a place
//              of work, not a noticeboard.
//   whatsNew   the announcements this agent is eligible for, behind one quiet
//              entry point. Closing an announcement archives it instead of
//              destroying it, so "I saw something about paperwork" is findable.
//
// Turning an announcement off stops it interrupting anyone; it does NOT delete
// it from the history of an agent who already saw it, which is why the archive
// keeps anything the agent holds a receipt for. An announcement that was turned
// off before that agent ever saw it stays hidden: to them it never happened.
//
// An announcement that is never acknowledged gets MAX_IMPRESSIONS chances at
// the spotlight and then stops interrupting: after that it is still in What's
// new, still marked unread, but it no longer takes the screen. Persistence
// past that point trains agents to close things without reading, which costs
// far more than the one announcement it was trying to land.

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
  // The secondary link: where an agent goes to read about the thing before
  // using it. Separate from the CTA because "do it" and "explain it first" are
  // different intents and one control cannot serve both.
  link_label: string | null;
  link_href: string | null;
  severity: string;
  created_at: string;
  audience: BroadcastAudience;
  // Per-agent state, resolved from the receipt.
  unread: boolean;
};

export type AnnouncementFeed = {
  spotlight: Broadcast | null;
  whatsNew: Broadcast[];
  unreadCount: number;
};

// How many times an unacknowledged announcement may take the screen before it
// retires to the What's new list.
export const MAX_IMPRESSIONS = 3;

// How far back What's new reaches. Older than this is history, not news.
const ARCHIVE_DAYS = 120;

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

type ReceiptRow = { broadcast_id: number; seen_count: number; acknowledged_at: string | null };

type BroadcastRow = {
  id: number;
  title: string;
  body: string;
  cta_label: string | null;
  cta_href: string | null;
  link_label: string | null;
  link_href: string | null;
  severity: string | null;
  audience: BroadcastAudience | null;
  created_at: string;
  ends_at: string | null;
  active: boolean;
};

/**
 * The announcement feed for one agent: the single card to show now, and the
 * full archive behind What's new.
 */
export async function announcementsForAgent(
  sb: SupabaseClient,
  agent: AgentRow,
  agentId: number,
): Promise<AnnouncementFeed> {
  const nowIso = new Date().toISOString();
  const since = new Date(Date.now() - ARCHIVE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: rows } = await sb
    .from("sg_broadcasts")
    .select("id, title, body, cta_label, cta_href, link_label, link_href, severity, audience, created_at, ends_at, active")
    .lte("starts_at", nowIso)
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  const matched = ((rows ?? []) as BroadcastRow[]).filter((b) =>
    matchesAudience(agent, (b.audience ?? {}) as BroadcastAudience),
  );
  if (!matched.length) return { spotlight: null, whatsNew: [], unreadCount: 0 };

  const { data: receiptRows } = await sb
    .from("sg_broadcast_receipts")
    .select("broadcast_id, seen_count, acknowledged_at")
    .eq("agent_id", agentId)
    .in("broadcast_id", matched.map((b) => b.id));
  const receipts = new Map<number, ReceiptRow>(
    ((receiptRows ?? []) as ReceiptRow[]).map((r) => [Number(r.broadcast_id), r]),
  );

  // Live now, or already part of this agent's history.
  const visible = matched.filter((b) => b.active || receipts.has(Number(b.id)));

  const whatsNew: Broadcast[] = visible.map((b) => {
    const r = receipts.get(Number(b.id));
    return {
      id: Number(b.id),
      title: String(b.title),
      body: String(b.body),
      cta_label: b.cta_label ?? null,
      cta_href: b.cta_href ?? null,
      link_label: b.link_label ?? null,
      link_href: b.link_href ?? null,
      severity: String(b.severity ?? "info"),
      created_at: String(b.created_at),
      audience: (b.audience ?? {}) as BroadcastAudience,
      unread: !r?.acknowledged_at,
    };
  });

  // The newest announcement that is still running, still unacknowledged, and
  // has not used up its chances to interrupt.
  const stillRunning = new Set(
    visible.filter((b) => b.active && (!b.ends_at || b.ends_at > nowIso)).map((b) => Number(b.id)),
  );
  const spotlight =
    whatsNew.find((b) => {
      if (!stillRunning.has(b.id)) return false;
      const r = receipts.get(b.id);
      return !r?.acknowledged_at && (r?.seen_count ?? 0) < MAX_IMPRESSIONS;
    }) ?? null;

  return { spotlight, whatsNew, unreadCount: whatsNew.filter((b) => b.unread).length };
}
