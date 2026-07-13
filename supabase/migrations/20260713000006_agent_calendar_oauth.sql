-- Per-agent calendar OAuth connection (Google now, Microsoft later). One row
-- per agent. Holds OAuth tokens => RLS-locked with NO anon/authenticated
-- policy: only the service-role client (behind the fc_agent session check)
-- ever reads or writes this. Scope granted is calendar.events only.
create table if not exists public.sg_agent_calendar (
  agent_id bigint primary key references public.sg_agents(id) on delete cascade,
  provider text not null default 'google',
  google_email text,
  access_token text,
  refresh_token text,
  token_expiry timestamptz,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.sg_agent_calendar enable row level security;
-- Intentionally no policy: service-role only.
