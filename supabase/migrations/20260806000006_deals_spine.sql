-- The deal: the spine the agent dashboard was missing.
--
-- Until now the product had one surface per stage of an agent's job and no
-- thread running through them. A viewing lived in sg_viewings keyed by
-- agent_cea_no with a free-text property_label; a letter of intent lived in
-- sg_documents keyed by agent_id with the address buried in untyped JSONB. Two
-- records about the same flat, on the same afternoon, with no way to join them.
-- That is why the dashboard reads as a drawer of tools rather than a place of
-- work: the software did not know that a viewing and the offer that follows it
-- are the same deal.
--
-- A deal is deliberately thin. It is not a CRM record: no contact database, no
-- scoring, no custom fields. It carries only what is needed to say "this flat,
-- this counterparty, this stage" and to hang the real artefacts off.
--
-- Greenfield by design: every table this touches is empty in production
-- (sg_viewings 0, sg_documents 0), so there is nothing to backfill and no agent
-- habit to disrupt. That is exactly why now is the cheapest moment to do it.

create table if not exists public.sg_deals (
  id             uuid primary key default gen_random_uuid(),
  agent_id       bigint not null references public.sg_agents(id) on delete cascade,

  -- Stage is driven by real events (a FINALISED letter of intent, a SIGNED
  -- tenancy agreement), never by a dropdown an agent has to maintain and never
  -- by opening a blank form. The one exception is a deliberate manual override,
  -- recorded below.
  stage          text not null default 'enquiry'
                 check (stage in ('enquiry','viewing','offer','agreement','completed','lost')),

  -- The property IS the name of a deal. An agent standing in a flat does not
  -- want to invent a title. property_key is the normalised form used to decide
  -- whether a new viewing or document belongs to a deal that already exists.
  property_label text not null,
  property_key   text not null,
  postal_code    text,
  property_type  text,

  -- Who is on the other side, and which side the agent is acting for.
  counterparty_name    text,
  counterparty_contact text,
  side           text check (side in ('landlord','tenant','seller','buyer')),

  -- Free text on purpose: a rent and a sale price are different shapes and an
  -- agent mid-negotiation should not be forced into a number.
  rent_or_price  text,

  -- Which surface started it, so the operator can see which entry point builds
  -- the habit. Mirrors the paperwork entry vocabulary.
  source         text not null default 'manual',

  -- Set when an agent moves the stage by hand. A manual stage is a correction,
  -- not a lock: it is never re-applied by evidence that already happened, but a
  -- LATER real event (a signed tenancy agreement) still moves the deal on.
  -- Blocking everything after one correction froze deals permanently.
  stage_set_manually_at timestamptz,
  lost_reason    text,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  closed_at      timestamptz
);

create index if not exists sg_deals_agent_idx on public.sg_deals (agent_id, stage);
create index if not exists sg_deals_agent_key_idx on public.sg_deals (agent_id, property_key);
create index if not exists sg_deals_updated_idx on public.sg_deals (agent_id, updated_at desc);

-- The artefacts hang off the deal. Nullable, because a document or a viewing
-- created before this shipped, or by a path that cannot resolve a deal, must
-- still work rather than fail.
alter table public.sg_viewings  add column if not exists deal_id uuid references public.sg_deals(id) on delete set null;
alter table public.sg_documents add column if not exists deal_id uuid references public.sg_deals(id) on delete set null;

create index if not exists sg_viewings_deal_idx  on public.sg_viewings (deal_id);
create index if not exists sg_documents_deal_idx on public.sg_documents (deal_id);

-- Stage history, so "how long has this been sitting" and the operator's dwell
-- times are computed from recorded fact rather than inferred from updated_at.
create table if not exists public.sg_deal_events (
  id         bigint generated always as identity primary key,
  deal_id    uuid not null references public.sg_deals(id) on delete cascade,
  agent_id   bigint not null,
  from_stage text,
  to_stage   text not null,
  trigger    text not null,          -- document_finalised | document_signed | viewing_booked | lead_assigned | manual
  created_at timestamptz not null default now()
);

create index if not exists sg_deal_events_deal_idx on public.sg_deal_events (deal_id, created_at);

-- RLS on, no policy: service-role only, reached through session-gated routes.
-- Consistent with the rest of the agent spine.
alter table public.sg_deals enable row level security;
alter table public.sg_deal_events enable row level security;

notify pgrst, 'reload schema';

-- A deal that came from a seller lead keeps the link, so the enquiry and the
-- deal are not two unrelated records of the same instruction.
alter table public.sg_deals add column if not exists linked_lead_id bigint;
create index if not exists sg_deals_lead_idx on public.sg_deals (linked_lead_id);
