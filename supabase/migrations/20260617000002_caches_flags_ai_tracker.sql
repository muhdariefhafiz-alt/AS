-- ============================================================================
-- SCHEMA SNAPSHOT: caches, agent flags, AI tracker, pg_cron (2026-06-17)
-- Companion to 20260617000001_db_logic_snapshot.sql. Captures the tables/columns
-- /policies/cron that back the scoring engine, the data studies, the agent flags
-- and the AI-answer tracker, so the repo mirrors the live (NL-shared) DB.
-- Idempotent (IF NOT EXISTS / OR REPLACE). The live DB remains authoritative.
-- ============================================================================

-- --- Study caches (single-row jsonb snapshots refreshed by the daily cron) ---
create table if not exists public.agent_market_stats (
  id int primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_concentration_stats (
  id int primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.agent_concentration_stats enable row level security;
drop policy if exists "public read concentration stats" on public.agent_concentration_stats;
create policy "public read concentration stats" on public.agent_concentration_stats
  for select to anon, authenticated using (true);
grant select on public.agent_concentration_stats to anon, authenticated;

-- --- Per-agent integrity/relevance flags (team-attributed, buyer-side, etc.) ---
-- Populated by refresh_agent_flags(); read by ranking lists + the profile.
alter table public.sg_agents add column if not exists agent_flags jsonb not null default '[]'::jsonb;
grant select (agent_flags) on public.sg_agents to anon, authenticated;

-- --- AI-answer share-of-voice tracker (isolated from the NL ai_tracker_*) ---
create table if not exists public.sg_ai_tracker_brands (
  id bigserial primary key,
  domain text not null,
  name text not null,
  name_pattern text,
  kind text not null default 'competitor',   -- self | agency | portal
  is_active boolean not null default true
);
create table if not exists public.sg_ai_tracker_queries (
  id bigserial primary key,
  query text not null,
  category text,                              -- selection | cost | diy
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.sg_ai_tracker_runs (
  id bigserial primary key,
  query_id bigint references public.sg_ai_tracker_queries(id) on delete cascade,
  surface text not null,                      -- google_aio | chatgpt | perplexity
  captured_at timestamptz not null default now(),
  aio_present boolean,
  answer_excerpt text,
  ref_count int,
  cost_usd numeric(10,5) default 0,
  raw jsonb
);
create table if not exists public.sg_ai_tracker_brand_hits (
  id bigserial primary key,
  run_id bigint references public.sg_ai_tracker_runs(id) on delete cascade,
  query_id bigint,
  surface text,
  brand_domain text,
  brand_kind text,
  cited boolean not null default false,
  mentioned boolean not null default false,
  captured_at timestamptz not null default now()
);
create index if not exists sg_ai_hits_surface_idx on public.sg_ai_tracker_brand_hits(surface, brand_domain);

create or replace view public.sg_ai_tracker_sov_latest as
with latest as (
  select distinct on (query_id, surface) id as run_id, query_id, surface
  from public.sg_ai_tracker_runs
  order by query_id, surface, captured_at desc
),
per_query as (
  select l.surface, l.query_id, h.brand_domain, h.brand_kind,
         bool_or(h.cited) as cited, bool_or(h.mentioned) as mentioned
  from latest l
  join public.sg_ai_tracker_brand_hits h on h.run_id = l.run_id
  group by l.surface, l.query_id, h.brand_domain, h.brand_kind
),
totals as (select surface, count(*) as total_queries from latest group by surface)
select pq.surface, pq.brand_domain, pq.brand_kind,
  count(*) filter (where pq.cited or pq.mentioned) as present_queries,
  count(*) filter (where pq.cited) as cited_queries,
  count(*) filter (where pq.mentioned) as mentioned_queries,
  t.total_queries,
  round(100.0 * count(*) filter (where pq.cited or pq.mentioned) / nullif(t.total_queries,0), 1) as presence_pct
from per_query pq join totals t on t.surface = pq.surface
group by pq.surface, pq.brand_domain, pq.brand_kind, t.total_queries
order by pq.surface, presence_pct desc;

insert into public.sg_ai_tracker_brands (domain, name, name_pattern, kind) values
  ('fair-comparisons.com','FairComparisons','fair[- ]?comparisons','self'),
  ('propertyguru.com.sg','PropertyGuru','property\s?guru','portal'),
  ('99.co','99.co','99\.co|\b99 co\b','portal'),
  ('srx.com.sg','SRX','\bsrx\b','portal'),
  ('ohmyhome.com','Ohmyhome','oh\s?my\s?home','portal'),
  ('propnex.com','PropNex','prop\s?nex','agency'),
  ('era.com.sg','ERA','era realty|era singapore','agency'),
  ('huttonsgroup.com','Huttons','huttons','agency'),
  ('orangetee.com','OrangeTee','orange\s?tee','agency')
on conflict do nothing;

insert into public.sg_ai_tracker_queries (query, category) values
  ('best property agent singapore','selection'),
  ('how to choose a property agent in singapore','selection'),
  ('how to find a good property agent singapore','selection'),
  ('best property agent to sell HDB','selection'),
  ('top property agents singapore','selection'),
  ('which property agency is best in singapore','selection'),
  ('how to check if a property agent is good singapore','selection'),
  ('how to compare property agents singapore','selection'),
  ('property agent commission singapore','cost'),
  ('how much is property agent commission singapore','cost'),
  ('should I use a property agent to sell my house singapore','diy'),
  ('do I need an agent to sell my HDB','diy'),
  ('is it worth using a property agent in singapore','diy'),
  ('how to sell HDB without agent','diy'),
  ('property agent vs DIY singapore','diy')
on conflict do nothing;

-- --- Daily refresh via pg_cron (the Vercel cron times out on these heavy fns) ---
create extension if not exists pg_cron;
-- Re-run cron.schedule manually if recreating; it upserts by job name:
--   select cron.schedule('daily-score-refresh', '0 18 * * *',
--     $cmd$ select public.run_daily_score_refresh(); $cmd$);
