-- "Drop your AgentNet PDF" falsification test: agents upload their PropertyGuru
-- AgentNet performance export (the only lawful route to their own listing
-- views/enquiries — no SG portal exposes an API). Primary purpose is to MEASURE
-- willingness before any funded parsing build. Sensitive data => private bucket,
-- service-role-only table (all access via the session-gated dashboard API).
create table if not exists public.sg_agent_perf_uploads (
  id uuid primary key default gen_random_uuid(),
  agent_id bigint not null references public.sg_agents(id) on delete cascade,
  source text not null default 'propertyguru_agentnet',
  filename text,
  storage_path text not null,
  status text not null default 'received' check (status in ('received','processing','parsed','failed')),
  extracted jsonb,
  created_at timestamptz not null default now()
);
create index if not exists sg_agent_perf_uploads_agent
  on public.sg_agent_perf_uploads (agent_id, created_at desc);

alter table public.sg_agent_perf_uploads enable row level security;
-- Intentionally no anon/authenticated policy: reads+writes go through the
-- service-role client behind the fc_agent session check.

-- Private bucket (performance exports are not public like agent photos).
insert into storage.buckets (id, name, public)
values ('agent-uploads', 'agent-uploads', false)
on conflict (id) do nothing;
