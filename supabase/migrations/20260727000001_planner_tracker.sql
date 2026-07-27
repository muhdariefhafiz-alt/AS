-- Planner (scheduler) feature tracker: one RPC feeding the admin Planner tab.
-- TARS-shaped: Target = claimed agents with a CEA registration; Adoption is
-- split into passive (viewing requests RECEIVED) and active (the agent DID
-- something: copied their link, connected a calendar, confirmed a viewing);
-- Retention = active in >= 2 distinct weeks of the last 4 (viewings are
-- episodic, weekly is the natural frequency); Satisfaction proxies = confirm
-- rate and median hours from request to confirm (from viewing_confirmed
-- funnel events carrying viewing_id metadata).
--
-- Event taxonomy read by this RPC (written by app instrumentation):
--   booking_view          client, /book/[agentSlug] page load
--   planner_link_copied   client, dashboard PlannerPanel copy-link
--   viewing_confirmed / viewing_cancelled / viewing_completed
--                         server, /api/dashboard/viewings status change
--   calendar_connect      server, calendar OAuth callback (source=google|microsoft)
-- Source of truth for requests stays sg_viewings (server-written), never events.

create or replace function public.sg_planner_tracker()
returns jsonb
language sql
security definer
set search_path = public
as $$
with
target as (
  select id, cea_registration, name, slug, claimed
  from sg_agents
  where claimed = true and cea_registration is not null
),
v_all as (
  select v.*, a.id as agent_id
  from sg_viewings v
  left join sg_agents a on a.cea_registration = v.agent_cea_no
),
v30 as (
  select * from v_all where created_at > now() - interval '30 days'
),
ev as (
  select id, event, agent_id, source, metadata, created_at
  from sg_funnel_events
  where event in ('booking_view','planner_link_copied','viewing_confirmed',
                  'viewing_cancelled','viewing_completed','calendar_connect')
),
ev30 as (
  select * from ev where created_at > now() - interval '30 days'
),
-- Agent activity moments (active use, not passive demand), for retention.
agent_activity as (
  select e.agent_id, date_trunc('week', e.created_at) as wk, e.created_at
  from ev e
  where e.agent_id is not null
    and e.event in ('planner_link_copied','viewing_confirmed','viewing_completed',
                    'viewing_cancelled','calendar_connect')
),
confirm_latency as (
  select extract(epoch from (e.created_at - v.created_at)) / 3600.0 as hours
  from ev e
  join sg_viewings v on v.id::text = e.metadata->>'viewing_id'
  where e.event = 'viewing_confirmed'
    and e.created_at > now() - interval '90 days'
),
weeks as (
  select generate_series(
    date_trunc('week', now()) - interval '7 weeks',
    date_trunc('week', now()),
    interval '1 week') as wk
),
weekly as (
  select
    w.wk,
    (select count(*) from ev e where e.event = 'booking_view'
       and e.created_at >= w.wk and e.created_at < w.wk + interval '1 week') as booking_views,
    (select count(*) from sg_viewings v
       where v.created_at >= w.wk and v.created_at < w.wk + interval '1 week') as requests,
    (select count(*) from ev e where e.event = 'viewing_confirmed'
       and e.created_at >= w.wk and e.created_at < w.wk + interval '1 week') as confirms,
    (select count(distinct x.agent_id) from (
       select agent_id from v_all v2
         where v2.created_at >= w.wk and v2.created_at < w.wk + interval '1 week'
       union
       select agent_id from agent_activity aa
         where aa.created_at >= w.wk and aa.created_at < w.wk + interval '1 week'
     ) x where x.agent_id is not null) as active_agents
  from weeks w
),
per_agent as (
  select a.id, a.name, a.slug, a.claimed,
    exists (select 1 from sg_agent_calendar c where c.agent_id = a.id) as calendar_connected,
    (select count(*) from ev e where e.agent_id = a.id and e.event = 'booking_view'
       and e.created_at > now() - interval '30 days') as views_30d,
    (select count(*) from ev e where e.agent_id = a.id and e.event = 'planner_link_copied'
       and e.created_at > now() - interval '30 days') as copies_30d,
    (select count(*) from sg_viewings v where v.agent_cea_no = a.cea_registration
       and v.created_at > now() - interval '30 days') as requests_30d,
    (select count(*) from sg_viewings v where v.agent_cea_no = a.cea_registration
       and v.status in ('confirmed','completed')
       and v.created_at > now() - interval '30 days') as confirmed_30d,
    greatest(
      (select max(v.created_at) from sg_viewings v where v.agent_cea_no = a.cea_registration),
      (select max(e.created_at) from ev e where e.agent_id = a.id)
    ) as last_activity
  from sg_agents a
  where a.cea_registration is not null and (
    exists (select 1 from sg_viewings v where v.agent_cea_no = a.cea_registration)
    or exists (select 1 from sg_agent_calendar c where c.agent_id = a.id)
    or exists (select 1 from ev e where e.agent_id = a.id)
  )
)
select jsonb_build_object(
  'tars', jsonb_build_object(
    'target_claimed_agents', (select count(*) from target),
    'reach_booking_page_viewed_30d',
      (select count(distinct agent_id) from ev30 where event = 'booking_view' and agent_id is not null),
    'passive_requests_received_30d',
      (select count(distinct agent_id) from v30 where agent_id is not null),
    'active_adopted_30d',
      (select count(distinct agent_id) from ev30
        where agent_id is not null
          and event in ('planner_link_copied','viewing_confirmed','viewing_completed','calendar_connect')),
    'active_adopted_ever',
      (select count(distinct agent_id) from ev
        where agent_id is not null
          and event in ('planner_link_copied','viewing_confirmed','viewing_completed','calendar_connect')),
    'calendar_connected',
      (select count(distinct agent_id) from sg_agent_calendar),
    'retained_2plus_weeks_of_4',
      (select count(*) from (
         select agent_id from agent_activity
         where created_at > now() - interval '28 days'
         group by agent_id
         having count(distinct wk) >= 2
       ) r),
    'confirm_rate_30d_pct',
      (select case when count(*) = 0 then null
              else round(100.0 * count(*) filter (where status in ('confirmed','completed')) / count(*), 1)
              end
       from v30),
    'median_hours_to_confirm_90d',
      (select round((percentile_cont(0.5) within group (order by hours))::numeric, 1)
       from confirm_latency)
  ),
  'funnel_30d', jsonb_build_object(
    'booking_views',     (select count(*) from ev30 where event = 'booking_view'),
    'link_copies',       (select count(*) from ev30 where event = 'planner_link_copied'),
    'booking_requests',  (select count(*) from v30),
    'confirmed',         (select count(*) from v30 where status in ('confirmed','completed')),
    'cancelled',         (select count(*) from v30 where status = 'cancelled'),
    'awaiting_response', (select count(*) from v30 where status = 'requested'),
    'calendar_connects', (select count(*) from ev30 where event = 'calendar_connect')
  ),
  'weekly', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'week_start', to_char(w.wk, 'DD Mon'),
      'booking_views', w.booking_views,
      'requests', w.requests,
      'confirms', w.confirms,
      'active_agents', w.active_agents
    ) order by w.wk), '[]'::jsonb)
    from weekly w
  ),
  'agents', (
    select coalesce(jsonb_agg(to_jsonb(p) order by p.last_activity desc nulls last), '[]'::jsonb)
    from (select * from per_agent order by last_activity desc nulls last limit 20) p
  )
)
$$;

revoke all on function public.sg_planner_tracker() from public, anon, authenticated;
grant execute on function public.sg_planner_tracker() to service_role;
