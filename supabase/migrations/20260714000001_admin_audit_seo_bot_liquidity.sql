-- Admin dashboard audit fixes (Wave A).
--
-- 1. SEO bot classifier widened. The stealth desktop-Chrome-version-rotation
--    crawler (referrer-less, session per hit) also hits agent-profile paths, but
--    flag_stealth_bot_views only checked /contact + /sell, so those rows inflated
--    every SEO headline ~36x (14,499 shown vs ~real). The predicate is
--    conservative (desktop-only exact UA, null referrer/utm), so the path filter
--    is dropped and single-pageview-session detection added (see the follow-up
--    migration for the final form).
--
-- 2. Liquidity aggregation moved server-side. LiquidityTab pulled up to 38k agent
--    rows + all view rows into JS, both silently capped at PostgREST's 1000-row
--    limit, so supply and demand were ~5x undercounted and nondeterministic.

create or replace function public.sg_liquidity_by_district()
returns table(area text, agents_total int, agents_claimed int, agents_paid int, views_30d int, wa_clicks_30d int)
language sql stable security definer set search_path to 'public','pg_temp'
as $function$
  with sup as (
    select coalesce(nullif(btrim(primary_area),''),'Unknown') area,
           count(*) total,
           count(*) filter (where claimed) claimed,
           count(*) filter (where subscription_tier is not null and subscription_tier <> 'free') paid
    from sg_agents group by 1
  ),
  ev as (
    select coalesce(nullif(btrim(a.primary_area),''),'Unknown') area,
           count(*) filter (where e.event = 'profile_view') views_30d,
           count(*) filter (where e.event = 'whatsapp_click') wa_30d
    from sg_funnel_events e join sg_agents a on a.id = e.agent_id
    where e.created_at >= now() - interval '30 days' and e.agent_id is not null
    group by 1
  )
  select s.area, s.total::int, s.claimed::int, s.paid::int,
         coalesce(ev.views_30d,0)::int, coalesce(ev.wa_30d,0)::int
  from sup s left join ev on ev.area = s.area;
$function$;

create or replace function public.sg_seller_demand_by_area()
returns table(area text, leads_30d int)
language sql stable security definer set search_path to 'public','pg_temp'
as $function$
  select coalesce(nullif(btrim(town),''), nullif(btrim(district_code),''), 'Unknown') area,
         count(*)::int
  from sg_leads where created_at >= now() - interval '30 days' group by 1;
$function$;

grant execute on function public.sg_liquidity_by_district() to service_role, authenticated;
grant execute on function public.sg_seller_demand_by_area() to service_role, authenticated;
