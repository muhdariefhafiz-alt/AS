import type { Tier } from "./tiers";

// Agent-owned building marketing pages ("Building spotlights").
//
// An agent claims a development and writes unique editorial commentary; the
// canonical development page renders it, clearly attributed as agent
// marketing content next to the neutral URA data. Exclusive while published
// (one live spotlight per development, first-come).
//
// GUARDRAILS (do not relax):
// - This is a MARKETING surface. It never changes AgentScore, search order
//   or lead allocation. Quotas gate a tool, not a ranking.
// - Commentary must be the agent's own text (min length below) so every
//   spotlight adds unique content, never templated duplicate copy.
// - The public template auto-displays the agent's name, CEA registration
//   number and agency alongside the commentary (CEA advertising guidelines).

export const BUILDING_PAGE_QUOTA: Record<Tier, number> = {
  free: 1, // seeds the flywheel: every claimed agent can hold one spotlight
  verified: 3,
  professional: 10,
  elite: 25,
};

export const MIN_COMMENTARY_CHARS = 350;
export const MAX_COMMENTARY_CHARS = 2400;
export const MAX_HEADLINE_CHARS = 90;

export type BuildingPage = {
  id: string;
  project_id: number;
  slug: string;
  headline: string;
  commentary: string;
  status: "draft" | "published";
  updated_at: string;
  published_at: string | null;
  project_name?: string;
  district?: string | null;
  txn_count?: number | null;
};
