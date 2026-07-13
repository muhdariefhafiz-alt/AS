-- Agent-owned building marketing pages ("Building spotlights").
-- An agent claims a development (exclusive while published, first-come) and
-- adds unique editorial commentary. The canonical development page renders
-- the spotlight; the homepage features the latest published ones.
--
-- IMPORTANT: this is a MARKETING surface, never a ranking. AgentScore order,
-- search order and lead allocation are untouched by ownership of a page.
-- Quotas per subscription tier live in app/lib/buildingPages.ts.

create table if not exists public.sg_building_pages (
  id uuid primary key default gen_random_uuid(),
  agent_id bigint not null references public.sg_agents(id) on delete cascade,
  project_id bigint not null references public.sg_projects(id) on delete cascade,
  -- Copy of sg_projects.slug so public pages resolve in one lookup.
  slug text not null,
  headline text not null,
  commentary text not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

-- One live spotlight per development (exclusivity is the claim hook).
create unique index if not exists sg_building_pages_project_live
  on public.sg_building_pages (project_id) where status = 'published';
-- An agent holds at most one row per development (draft or live).
create unique index if not exists sg_building_pages_agent_project
  on public.sg_building_pages (agent_id, project_id);
create index if not exists sg_building_pages_agent on public.sg_building_pages (agent_id);
create index if not exists sg_building_pages_slug_live
  on public.sg_building_pages (slug) where status = 'published';

-- RLS: anon may read PUBLISHED pages only; drafts and all writes go through
-- the service-role client (supabaseAdmin) in the dashboard API.
alter table public.sg_building_pages enable row level security;

drop policy if exists "public read published building pages" on public.sg_building_pages;
create policy "public read published building pages"
  on public.sg_building_pages for select
  to anon, authenticated
  using (status = 'published');

grant select on public.sg_building_pages to anon, authenticated;
