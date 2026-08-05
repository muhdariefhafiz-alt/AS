-- Precomputed per-property-type market stats + top agents for
-- /property-agents/best-by-type/* pages. Read server-side via supabaseAdmin().
-- Heavy aggregate NEVER runs on the request path: this snapshot is populated
-- by refresh_type_market_stats() (run once at migration time; re-runnable by
-- cron later if these pages ever need fresher-than-deploy numbers).
--
-- Applied to prod 2026-08-05 via apply_migration (sg_type_market_stats_snapshot).

create table if not exists public.sg_type_market_stats (
  type_slug text primary key,
  property_types text[] not null,
  rental_only boolean not null default false,
  ranking_basis text not null,              -- 'sales' | 'rentals'
  sales_12mo integer not null default 0,
  rentals_12mo integer not null default 0,
  active_agents_12mo integer not null default 0,
  active_sale_agents_12mo integer not null default 0,
  active_rental_agents_12mo integer not null default 0,
  top5_share_pct numeric(5,1),
  top_agents jsonb not null default '[]'::jsonb,
  window_start date not null,
  window_end date not null,
  refreshed_at timestamptz not null default now()
);

alter table public.sg_type_market_stats enable row level security;
revoke all on public.sg_type_market_stats from public;
revoke all on public.sg_type_market_stats from anon;
revoke all on public.sg_type_market_stats from authenticated;
grant select on public.sg_type_market_stats to service_role;

create or replace function public.refresh_type_market_stats()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_end date;
  v_start date;
  cfg record;
begin
  -- Window = last 12 complete data months, anchored on the newest month in the
  -- data (transaction_date is TEXT 'MON-YYYY'; regex-guard + to_date, never
  -- lexicographic).
  select max(to_date(transaction_date, 'MON-YYYY')) into v_end
  from sg_agent_transactions
  where transaction_date ~ '^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)-[0-9]{4}$';
  if v_end is null then
    return;
  end if;
  v_start := v_end - interval '11 months';

  -- 'apartment' and 'condo' share CONDOMINIUM_APARTMENTS: CEA records group
  -- condominiums and apartments into one private non-landed category, and the
  -- pages say so explicitly.
  for cfg in
    select * from (values
      ('hdb'::text,            array['HDB']::text[],                    false),
      ('condo',                array['CONDOMINIUM_APARTMENTS'],         false),
      ('apartment',            array['CONDOMINIUM_APARTMENTS'],         false),
      ('executive-condo',      array['EXECUTIVE_CONDOMINIUM'],          false),
      ('landed',               array['LANDED'],                         false),
      ('rental',               null::text[],                            true)
    ) as c(slug, ptypes, rental_only)
  loop
    insert into public.sg_type_market_stats as s (
      type_slug, property_types, rental_only, ranking_basis,
      sales_12mo, rentals_12mo,
      active_agents_12mo, active_sale_agents_12mo, active_rental_agents_12mo,
      top5_share_pct, top_agents, window_start, window_end, refreshed_at
    )
    with base as (
      select
        t.salesperson_reg_num as reg,
        (t.transaction_type in ('RESALE', 'NEW SALE', 'SUB-SALE')) as is_sale,
        to_date(t.transaction_date, 'MON-YYYY') as m
      from sg_agent_transactions t
      where t.transaction_date ~ '^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)-[0-9]{4}$'
        and t.salesperson_reg_num is not null
        and (cfg.ptypes is null or t.property_type = any (cfg.ptypes))
        and (not cfg.rental_only or t.transaction_type in ('WHOLE RENTAL', 'ROOM RENTAL'))
        and to_date(t.transaction_date, 'MON-YYYY') between v_start and v_end
    ),
    per_agent as (
      select
        reg,
        count(*) filter (where is_sale)::int as sales_12mo,
        count(*) filter (where not is_sale)::int as rentals_12mo,
        max(m) as last_txn
      from base
      group by reg
    ),
    ranked as (
      select p.*,
        (case when cfg.rental_only then p.rentals_12mo else p.sales_12mo end) as basis
      from per_agent p
    ),
    totals as (
      select
        coalesce(sum(sales_12mo), 0)::int as sales,
        coalesce(sum(rentals_12mo), 0)::int as rentals,
        count(*)::int as active,
        count(*) filter (where sales_12mo > 0)::int as active_sale,
        count(*) filter (where rentals_12mo > 0)::int as active_rental,
        coalesce(sum(basis), 0)::int as basis_total
      from ranked
    ),
    top5 as (
      select coalesce(sum(basis), 0)::int as top5_basis
      from (select basis from ranked order by basis desc limit 5) x
    ),
    top_list as (
      select coalesce(jsonb_agg(jsonb_build_object(
          'slug', r.slug,
          'display_name', r.display_name,
          'agency_name', r.agency_name,
          'score', r.score,
          'claimed', r.claimed,
          'sales_12mo', r.sales_12mo,
          'rentals_12mo', r.rentals_12mo,
          'last_txn', r.last_txn
        ) order by r.rn), '[]'::jsonb) as agents
      from (
        select a.slug,
          case when a.marketing_name_status = 'approved'
                    and nullif(trim(a.marketing_name), '') is not null
               then a.marketing_name else a.name end as display_name,
          a.agency_name,
          case when a.score is not null and a.score > 0
               then round(a.score)::int end as score,
          coalesce(a.claimed, false) as claimed,
          rk.sales_12mo, rk.rentals_12mo,
          to_char(rk.last_txn, 'Mon YYYY') as last_txn,
          row_number() over (
            order by rk.basis desc,
              (case when cfg.rental_only then rk.sales_12mo else rk.rentals_12mo end) desc,
              a.score desc nulls last,
              a.slug
          ) as rn
        from ranked rk
        join sg_agents a on a.cea_registration = rk.reg
        where rk.basis > 0
          and coalesce(a.is_hidden, false) = false
          and coalesce(a.is_sandbox, false) = false
        order by rn
        limit 30
      ) r
    )
    select
      cfg.slug,
      coalesce(cfg.ptypes, array['HDB','CONDOMINIUM_APARTMENTS','EXECUTIVE_CONDOMINIUM','LANDED','STRATA_LANDED']),
      cfg.rental_only,
      case when cfg.rental_only then 'rentals' else 'sales' end,
      t.sales, t.rentals,
      t.active, t.active_sale, t.active_rental,
      round(100.0 * f.top5_basis / nullif(t.basis_total, 0), 1),
      tl.agents,
      v_start, v_end, now()
    from totals t
    cross join top5 f
    cross join top_list tl
    on conflict (type_slug) do update set
      property_types = excluded.property_types,
      rental_only = excluded.rental_only,
      ranking_basis = excluded.ranking_basis,
      sales_12mo = excluded.sales_12mo,
      rentals_12mo = excluded.rentals_12mo,
      active_agents_12mo = excluded.active_agents_12mo,
      active_sale_agents_12mo = excluded.active_sale_agents_12mo,
      active_rental_agents_12mo = excluded.active_rental_agents_12mo,
      top5_share_pct = excluded.top5_share_pct,
      top_agents = excluded.top_agents,
      window_start = excluded.window_start,
      window_end = excluded.window_end,
      refreshed_at = excluded.refreshed_at;
  end loop;
end;
$$;

revoke all on function public.refresh_type_market_stats() from public;
revoke all on function public.refresh_type_market_stats() from anon;
revoke all on function public.refresh_type_market_stats() from authenticated;
grant execute on function public.refresh_type_market_stats() to service_role;

-- Populate once now (cron not needed yet).
select public.refresh_type_market_stats();

notify pgrst, 'reload schema';
