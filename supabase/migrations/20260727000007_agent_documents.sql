-- Agent Paperwork tool: document system-of-record (Phase 1 = rental tenancy
-- agreement generate + store). See docs/strategy/paperwork-tool-spec-2026-07.md.
-- GUARDRAIL: this is administrative SaaS. Documents never touch AgentScore,
-- ranking, search order or lead allocation. Quotas gate a tool, not a ranking.

create table if not exists public.sg_documents (
  id uuid primary key default gen_random_uuid(),
  agent_id bigint not null references public.sg_agents(id) on delete cascade,
  doc_type text not null,                 -- 'tenancy_agreement' | future types
  template_key text not null,             -- versioned template, e.g. 'tenancy_residential_v1'
  title text not null,
  status text not null default 'draft' check (status in ('draft','finalised','sent','signed','void')),
  fields jsonb not null default '{}'::jsonb,
  linked_lead_id bigint null,             -- reserved for future LOI/chaining (sg_leads.id)
  pdf_path text null,                     -- object path in the agent-documents bucket
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sg_documents_agent_idx on public.sg_documents (agent_id, created_at desc);
alter table public.sg_documents enable row level security;
-- No policies: service-role only (the dashboard renders server-side).

create table if not exists public.sg_document_events (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.sg_documents(id) on delete cascade,
  event text not null,                    -- created | edited | finalised | sent | signed | voided
  actor text not null,                    -- agent email or signer role
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists sg_document_events_doc_idx on public.sg_document_events (document_id, created_at);
alter table public.sg_document_events enable row level security;

-- Private bucket for generated/stored documents (never world-readable; served
-- only via short-lived signed URLs to the owning agent).
insert into storage.buckets (id, name, public)
values ('agent-documents', 'agent-documents', false)
on conflict (id) do nothing;
