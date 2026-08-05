-- Paperwork feature tracker: one RPC feeding the admin Paperwork card.
--
-- Shaped by the adoption model this phase was built to, so the numbers answer
-- the questions that decide whether to keep investing:
--   Target      = claimed agents with a CEA registration (a document prints
--                 their registration, so an agent without one cannot use it).
--   Setup       = the letterhead is renderable (paperwork_setup).
--   Aha         = a first document reaching finalised with a real property and
--                 counterparty (paperwork_aha).
--   Habit       = 3 finalised documents across 2+ distinct properties inside
--                 60 days (paperwork_habit). 60 days, not 14: a rental agent
--                 papers a few deals a month, and a shorter window would report
--                 false negatives forever.
--   Chain       = tenancy agreements started from a letter of intent. This is
--                 the phase's core bet, so it gets its own number.
--   COUNTER     = share of finalised documents that never reached sent or
--                 signed. If that stays high we built something agents poke
--                 once, and every other number here is vanity.
--
-- Sandbox agents are excluded everywhere: a test document must never move an
-- adoption metric.

create or replace function public.sg_paperwork_tracker()
returns jsonb
language sql
security definer
set search_path = public
as $$
with
target as (
  select id from sg_agents
  where claimed = true and cea_registration is not null and is_sandbox = false
),
docs as (
  select d.*, (d.fields->>'premises_address') as addr
  from sg_documents d
  join sg_agents a on a.id = d.agent_id
  where a.is_sandbox = false
),
docs30 as (select * from docs where created_at > now() - interval '30 days'),
ev as (
  select e.event, e.agent_id, e.metadata, e.created_at
  from sg_funnel_events e
  join sg_agents a on a.id = e.agent_id
  where a.is_sandbox = false and e.event like 'paperwork%'
),
-- Funnel milestones, each counted once per agent by construction.
milestones as (
  select
    count(distinct agent_id) filter (where event = 'paperwork_setup') as setup,
    count(distinct agent_id) filter (where event = 'paperwork_aha') as aha,
    count(distinct agent_id) filter (where event = 'paperwork_habit') as habit,
    count(distinct agent_id) filter (where event = 'paperwork_chain_aha') as chain_aha,
    count(distinct agent_id) filter (where event = 'paperwork_first_sent') as first_sent,
    count(distinct agent_id) filter (where event = 'paperwork_first_signed') as first_signed,
    count(*) filter (where event = 'paperwork_quota_blocked') as quota_blocked
  from ev
),
-- Time to first document, per agent: the activation latency that says whether
-- the first session works.
first_doc as (
  select d.agent_id, min(d.created_at) as first_created
  from docs d group by d.agent_id
),
activation_latency as (
  select percentile_cont(0.5) within group (order by extract(epoch from (f.first_created - a.claimed_at)) / 3600.0) as median_hours
  from first_doc f
  join sg_agents a on a.id = f.agent_id
  where a.claimed_at is not null and f.first_created >= a.claimed_at
),
by_type as (
  select doc_type,
         count(*) as total,
         count(*) filter (where status in ('finalised','sent','signed')) as finalised_plus,
         count(*) filter (where status = 'signed') as signed
  from docs group by doc_type
),
-- The counter-metric. Only documents old enough to have moved are counted, so
-- a document finalised an hour ago is not held against the number.
stuck as (
  select
    count(*) filter (where status = 'finalised' and updated_at < now() - interval '14 days') as finalised_stale,
    count(*) filter (where status in ('finalised','sent','signed')) as finalised_plus_all,
    count(*) filter (where status in ('sent','signed')) as left_the_building
  from docs
),
chain as (
  select
    count(*) filter (where linked_document_id is not null) as chained,
    count(*) filter (where doc_type = 'tenancy_agreement') as tenancy_total
  from docs
),
demo as (
  select count(*) as samples_generated,
         count(distinct agent_slug) as distinct_agents
  from sg_funnel_events
  where event = 'loi_demo_generated' and created_at > now() - interval '30 days'
)
select jsonb_build_object(
  'generated_at', now(),
  'target_agents', (select count(*) from target),
  'documents_total', (select count(*) from docs),
  'documents_30d', (select count(*) from docs30),
  'agents_with_a_document', (select count(distinct agent_id) from docs),
  'funnel', (select to_jsonb(m) from milestones m),
  'median_hours_claim_to_first_document', (select round(median_hours::numeric, 1) from activation_latency),
  'by_type', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from by_type t),
  'chain', (select jsonb_build_object(
      'tenancy_from_loi', c.chained,
      'tenancy_total', c.tenancy_total,
      'chain_rate_pct', case when c.tenancy_total > 0
        then round(100.0 * c.chained / c.tenancy_total, 1) else null end)
    from chain c),
  'counter_metric', (select jsonb_build_object(
      'finalised_or_beyond', s.finalised_plus_all,
      'left_the_building', s.left_the_building,
      'never_left_pct', case when s.finalised_plus_all > 0
        then round(100.0 * (s.finalised_plus_all - s.left_the_building) / s.finalised_plus_all, 1) else null end,
      'finalised_and_stale_14d', s.finalised_stale)
    from stuck s),
  'public_demo_30d', (select to_jsonb(d) from demo d)
);
$$;

revoke all on function public.sg_paperwork_tracker() from public, anon, authenticated;
grant execute on function public.sg_paperwork_tracker() to service_role;

comment on function public.sg_paperwork_tracker() is
  'Admin Paperwork adoption tracker: setup/aha/habit funnel, chain rate, and the never-left-the-building counter-metric. Sandbox agents excluded.';
