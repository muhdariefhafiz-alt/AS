-- Indexation scoreboard for the agent-page universe (29,687 scored agents).
-- One row per day, written by /api/cron/index-coverage:
--   agent_pages_with_impressions : distinct /property-agents/agent/ URLs that
--     appeared in Google search results over the trailing 28 days (GSC page
--     dimension). The broadest honest "indexed and serving" proxy.
--   sample_size / sample_indexed : URL Inspection API on a rotating daily
--     sample of universe URLs; sample_indexed counts coverageState
--     "Submitted and indexed". Rolling windows over rows estimate the true
--     indexation rate without burning the 2k/day inspection quota.
--   sitemaps_submitted : how many sitemaps (root + agent shards) were
--     (re)submitted to GSC this run; 0 with a note = permission problem.
create table if not exists public.sg_index_coverage (
  date date primary key,
  agent_pages_with_impressions int,
  agent_clicks int,
  agent_impressions int,
  sample_size int,
  sample_indexed int,
  sitemaps_submitted int,
  notes jsonb,
  fetched_at timestamptz not null default now()
);

alter table public.sg_index_coverage enable row level security;
-- No policies: service-role only (admin tab renders server-side).
