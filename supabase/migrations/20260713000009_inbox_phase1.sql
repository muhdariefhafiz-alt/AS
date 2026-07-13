-- Unified Inbox Phase 1: per-shortlist reply routing token + per-agent lead labels.
--
-- reply_token: an unguessable per-(agent, lead) routing key for two-way email.
-- When FC relays an agent's reply, the From/Reply-To local-part is
-- reply+{token}@reply.fair-comparisons.com and the inbound webhook maps the token
-- back to this shortlist row (which carries agent_id + lead_id). The raw shortlist
-- id is a small sequential integer, so it must never be used in a public reply
-- address (thread-injection risk); hence a dedicated 256-bit random hex token.
-- gen_random_uuid() is built in (no pgcrypto dependency); two concatenated uuids
-- give 256 bits of entropy as 64 hex chars.

alter table public.sg_lead_shortlist
  add column if not exists reply_token text;

alter table public.sg_lead_shortlist
  alter column reply_token
  set default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''));

update public.sg_lead_shortlist
  set reply_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
  where reply_token is null;

create unique index if not exists sg_lead_shortlist_reply_token_uniq
  on public.sg_lead_shortlist (reply_token);

-- Per-agent labels on an inbox item (the shortlist row).
--
-- Labels are PRIVATE to the agent: the same lead is shortlisted to several
-- agents, so a label keyed on lead_id/contact_id would leak one agent's private
-- tag to a competitor. Keyed on shortlist_id (which is 1:1 with an agent+lead).
-- Controlled vocabulary only (enforced app-side in app/lib/inbox-labels.ts), so
-- there is no free-tag management surface to build. Service-role only: RLS
-- enabled with no policy, exactly like sg_leads / sg_lead_shortlist / sg_contacts.

create table if not exists public.sg_lead_labels (
  id           bigint generated always as identity primary key,
  shortlist_id bigint not null references public.sg_lead_shortlist(id) on delete cascade,
  agent_id     bigint not null,
  label        text   not null,
  created_at   timestamptz not null default now(),
  unique (shortlist_id, label)
);
create index if not exists sg_lead_labels_agent_id_idx on public.sg_lead_labels (agent_id);
create index if not exists sg_lead_labels_shortlist_id_idx on public.sg_lead_labels (shortlist_id);
alter table public.sg_lead_labels enable row level security;
