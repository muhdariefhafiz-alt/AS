-- ============================================================================
-- AGENCY LEAGUE TABLE CACHE (2026-07-02)
-- ============================================================================
-- Mirror of the migrations applied to the live (NL-shared) DB on 2026-07-02
-- (agency_league_stats_cache + add_agency_league_to_daily_refresh). The live
-- DB is authoritative; see supabase/README.md.
--
-- Backs /insights/best-property-agency-singapore: per-agency 12-month sales,
-- rental share and per-selling-agent efficiency, precomputed daily because the
-- full-table scan exceeds the anon API statement timeout. Same pattern as
-- agent_concentration_stats.
--
-- Methodology notes (also stated on the page):
--   * Attribution is the agent's CURRENT agency (CEA records carry no agency
--     at transaction time; agents who moved carry their record with them).
--   * The newest month is typically still filling (CEA publication lag). This
--     hits all agencies alike, so rankings hold; absolute counts understate.
--   * Records are per salesperson per side, not unique deals.

create table if not exists public.agency_league_stats (
  id int primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.agency_league_stats enable row level security;
drop policy if exists "public read agency league" on public.agency_league_stats;
create policy "public read agency league" on public.agency_league_stats
  for select to anon, authenticated using (true);
grant select on public.agency_league_stats to anon, authenticated;

create or replace function public.refresh_agency_league_stats()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_end date;
  v_start date;
  v_data jsonb;
begin
  -- Window: last 12 months present in the CEA record.
  select max(to_date(transaction_date,'MON-YYYY')) into v_end from sg_agent_transactions;
  v_start := v_end - interval '11 months';

  with t as (
    select a.agency_name, tx.represented, tx.transaction_type, tx.salesperson_reg_num
    from sg_agent_transactions tx
    join sg_agents a on a.cea_registration = tx.salesperson_reg_num
    where to_date(tx.transaction_date,'MON-YYYY') between v_start and v_end
      and a.agency_name is not null and a.agency_name <> ''
  ),
  per_agency as (
    select agency_name,
      count(*) filter (where transaction_type in ('RESALE','NEW SALE','SUB SALE')) sales,
      count(*) filter (where transaction_type in ('RESALE','NEW SALE','SUB SALE') and represented='SELLER') seller_sales,
      count(*) filter (where transaction_type not in ('RESALE','NEW SALE','SUB SALE')) rentals,
      count(distinct salesperson_reg_num) filter (where transaction_type in ('RESALE','NEW SALE','SUB SALE')) selling_agents
    from t group by 1
  ),
  roster as (
    select agency_name, count(*) roster_agents
    from sg_agents where agency_name is not null and agency_name <> ''
    group by 1
  ),
  enriched as (
    select p.agency_name, r.roster_agents, p.selling_agents, p.sales, p.seller_sales, p.rentals,
      round(100.0*p.selling_agents/nullif(r.roster_agents,0),1) pct_selling,
      round(p.sales::numeric/nullif(p.selling_agents,0),1) per_agent,
      round(100.0*p.rentals/nullif(p.rentals+p.sales,0),1) rental_pct,
      g.slug, g.google_rating, g.google_review_count
    from per_agency p
    join roster r using (agency_name)
    left join sg_agencies g on upper(g.name) = p.agency_name
  )
  select jsonb_build_object(
    'window_start', to_char(v_start,'Mon YYYY'),
    'window_end', to_char(v_end,'Mon YYYY'),
    'totals', (select jsonb_build_object(
        'agencies_with_sale', count(*) filter (where sales > 0),
        'sales', coalesce(sum(sales),0),
        'rentals', coalesce(sum(rentals),0)) from enriched),
    'by_sales', (select coalesce(jsonb_agg(e order by e.sales desc),'[]'::jsonb)
      from (select * from enriched order by sales desc limit 20) e),
    'by_efficiency', (select coalesce(jsonb_agg(e order by e.per_agent desc),'[]'::jsonb)
      from (select * from enriched where sales >= 100 order by per_agent desc limit 20) e)
  ) into v_data;

  insert into agency_league_stats (id, data, updated_at)
  values (1, v_data, now())
  on conflict (id) do update set data = excluded.data, updated_at = now();
end;
$$;

revoke all on function public.refresh_agency_league_stats() from public, anon, authenticated;

-- Registered in the daily pg_cron chain:
create or replace function public.run_daily_score_refresh()
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
set statement_timeout to '0'
as $function$
begin
  perform calculate_agent_scores();
  perform refresh_area_top_agents();
  perform refresh_agent_market_stats();
  perform refresh_agent_concentration_stats();
  perform refresh_agent_flags();
  perform refresh_agency_league_stats();
end;
$function$;
