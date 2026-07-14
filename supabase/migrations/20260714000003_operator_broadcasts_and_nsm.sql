-- Operator broadcasts (targeted in-app announcements to an agent cohort) plus the
-- North Star / liquidity RPCs surfaced on the admin Overzicht tab. Applied to prod
-- via MCP on 2026-07-14; this file is the reproducible record of that DDL.

-- ---------------------------------------------------------------------------
-- Broadcasts: an operator composes a titled announcement, targets a cohort via
-- a small JSONB audience filter (tier / claimed / area), and matching agents see
-- a dismissible banner in their dashboard.
-- ---------------------------------------------------------------------------
create table if not exists public.sg_broadcasts (
  id          bigint generated always as identity primary key,
  title       text not null,
  body        text not null,
  cta_label   text,
  cta_href    text,
  severity    text not null default 'info',           -- info | success | warn
  audience    jsonb not null default '{}'::jsonb,      -- {tier?:[], claimed?:bool, area?:[]}
  active      boolean not null default true,
  starts_at   timestamptz not null default now(),
  ends_at     timestamptz,
  created_by  text,
  created_at  timestamptz not null default now()
);

create table if not exists public.sg_broadcast_dismissals (
  broadcast_id bigint not null references public.sg_broadcasts(id) on delete cascade,
  agent_id     bigint not null,
  dismissed_at timestamptz not null default now(),
  primary key (broadcast_id, agent_id)
);

create index if not exists sg_broadcasts_active_idx on public.sg_broadcasts (active, starts_at);

-- RLS on, no policy: reachable only through the service-role key (admin route +
-- session-gated dashboard routes). Consistent with the rest of the operator spine.
alter table public.sg_broadcasts enable row level security;
alter table public.sg_broadcast_dismissals enable row level security;

-- ---------------------------------------------------------------------------
-- North Star: timely first reply. The marketplace's promise to a seller is that
-- a shortlisted agent replies fast; timely_leads = leads whose first reply landed
-- within the SLA window.
-- ---------------------------------------------------------------------------
create or replace function public.sg_nsm_weekly(p_weeks integer default 8, p_sla_hours integer default 24)
returns table(week date, leads_with_reply integer, timely_leads integer, median_reply_hours numeric)
language sql stable security definer
set search_path to 'public', 'pg_temp'
as $function$
  with r as (
    select date_trunc('week', invited_at)::date week,
           lead_id,
           min(extract(epoch from (first_reply_at - invited_at))/3600.0) reply_hours
    from sg_lead_shortlist
    where invited_at is not null and first_reply_at is not null
      and invited_at >= now() - make_interval(weeks => p_weeks)
    group by 1, 2
  )
  select week,
         count(*)::int leads_with_reply,
         count(*) filter (where reply_hours <= p_sla_hours)::int timely_leads,
         round(percentile_cont(0.5) within group (order by reply_hours)::numeric, 1) median_reply_hours
  from r group by week order by week;
$function$;

-- ---------------------------------------------------------------------------
-- Liquidity: the seller funnel through the shortlist -> invite -> quote -> pick
-- stages over a trailing window, plus median time-to-first-quote.
-- ---------------------------------------------------------------------------
create or replace function public.sg_lead_liquidity(p_days integer default 30)
returns table(leads integer, shortlisted integer, invited integer, quoted integer, picked integer, median_ttfq_hours numeric)
language sql stable security definer
set search_path to 'public', 'pg_temp'
as $function$
  with l as (
    select id, created_at from sg_leads where created_at >= now() - make_interval(days => p_days)
  )
  select
    count(*)::int leads,
    count(*) filter (where exists (select 1 from sg_lead_shortlist s where s.lead_id = l.id))::int shortlisted,
    count(*) filter (where exists (select 1 from sg_lead_shortlist s where s.lead_id = l.id and s.invited_at is not null))::int invited,
    count(*) filter (where exists (select 1 from sg_lead_quotes q where q.lead_id = l.id))::int quoted,
    count(*) filter (where exists (select 1 from sg_lead_shortlist s where s.lead_id = l.id and s.picked_at is not null))::int picked,
    round(percentile_cont(0.5) within group (order by ttfq)::numeric, 1) median_ttfq_hours
  from l
  left join lateral (
    select extract(epoch from (min(q.created_at) - l.created_at))/3600.0 ttfq
    from sg_lead_quotes q where q.lead_id = l.id
  ) qf on true;
$function$;

grant execute on function public.sg_nsm_weekly(integer, integer) to service_role, authenticated;
grant execute on function public.sg_lead_liquidity(integer) to service_role, authenticated;
