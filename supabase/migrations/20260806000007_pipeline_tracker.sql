-- Pipeline tracker: does the deal spine actually move, or does it just exist?
--
-- The restructure claims that naming the agent's work after the agent's work
-- makes the work progress. That is a testable claim, and these are the numbers
-- that test it:
--
--   created           deals started, and by which entry point
--   by_stage          where they are sitting right now
--   median_dwell      how long a deal sits at each stage before moving. The
--                     honest read of whether a stage is a step or a wall.
--   conversion        stage to stage, computed from recorded transitions
--   reached_agreement the headline: deals that got to a signed lease
--   COUNTER stuck     deals untouched for 30 days or more. If this climbs while
--                     created climbs, we built a place to park work, not a
--                     place to do it.
--
-- Sandbox agents excluded everywhere, as with every other tracker.

create or replace function public.sg_pipeline_tracker()
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
with d as (
  select dl.*
  from sg_deals dl
  join sg_agents a on a.id = dl.agent_id
  where a.is_sandbox = false
),
ev as (
  select e.*
  from sg_deal_events e
  join sg_deals dl on dl.id = e.deal_id
  join sg_agents a on a.id = dl.agent_id
  where a.is_sandbox = false
),
-- Time spent at a stage = gap between entering it and the next transition.
-- A deal still sitting at its current stage counts up to now, because "it has
-- been there three weeks" is exactly the fact worth surfacing.
dwell as (
  select
    e.to_stage as stage,
    extract(epoch from (
      coalesce(lead(e.created_at) over (partition by e.deal_id order by e.created_at), now()) - e.created_at
    )) / 86400.0 as days
  from ev e
  -- Completed and lost are terminal: the gap after entering them is the deal's
  -- age, not time spent working the stage, and reporting it as dwell would show
  -- "Completed: 90 days median" for a deal that closed cleanly three months ago.
  where e.to_stage not in ('completed','lost')
),
conv as (
  select from_stage, to_stage, count(*)::int as n
  from ev where from_stage is not null
  group by 1, 2
)
select jsonb_build_object(
  'deals_total', (select count(*)::int from d),
  'deals_30d', (select count(*)::int from d where created_at > now() - interval '30 days'),
  'agents_with_a_deal', (select count(distinct agent_id)::int from d),
  'by_stage', coalesce((
    select jsonb_object_agg(stage, n) from (
      select stage, count(*)::int n from d group by stage
    ) t), '{}'::jsonb),
  'by_source', coalesce((
    select jsonb_object_agg(source, n) from (
      select source, count(*)::int n from d group by source
    ) t), '{}'::jsonb),
  'median_dwell_days', coalesce((
    select jsonb_object_agg(stage, round(med::numeric, 1)) from (
      select stage, percentile_cont(0.5) within group (order by days) as med
      from dwell group by stage
    ) t), '{}'::jsonb),
  'transitions', coalesce((
    select jsonb_agg(jsonb_build_object('from', from_stage, 'to', to_stage, 'n', n) order by n desc)
    from conv), '[]'::jsonb),
  'reached_agreement', (select count(*)::int from d where stage in ('agreement','completed')),
  'completed', (select count(*)::int from d where stage = 'completed'),
  'lost', (select count(*)::int from d where stage = 'lost'),
  -- COUNTER-METRIC. Open deals nobody has touched in a month.
  'stuck_30d', (select count(*)::int from d
                where stage in ('enquiry','viewing','offer','agreement')
                  and updated_at < now() - interval '30 days'),
  'docs_attached_pct', (
    select case when count(*) = 0 then null
           else round(100.0 * count(*) filter (where deal_id is not null) / count(*), 1) end
    from sg_documents doc
    join sg_agents a on a.id = doc.agent_id
    where a.is_sandbox = false
  )
);
$$;

revoke all on function public.sg_pipeline_tracker() from public, anon, authenticated;
grant execute on function public.sg_pipeline_tracker() to service_role;

notify pgrst, 'reload schema';
