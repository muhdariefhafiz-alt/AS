-- Planner: viewing appointments an agent receives via their public /book page.
-- RLS-locked from anon/authenticated; all writes go through supabaseAdmin (the
-- public /api/book route and the session-gated dashboard). Applied via MCP 2026-07-12.
create table if not exists public.sg_viewings (
  id uuid primary key default gen_random_uuid(),
  agent_cea_no text not null references public.sg_agents(cea_registration) on delete cascade,
  property_label text not null,
  viewing_at timestamptz not null,
  attendee_name text not null,
  attendee_contact text not null,
  message text,
  status text not null default 'requested' check (status in ('requested','confirmed','completed','cancelled')),
  source text not null default 'book_page',
  created_at timestamptz not null default now()
);
create index if not exists sg_viewings_agent_idx on public.sg_viewings (agent_cea_no, viewing_at);
alter table public.sg_viewings enable row level security;
revoke all on public.sg_viewings from anon, authenticated;
