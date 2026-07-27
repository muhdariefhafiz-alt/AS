-- League stats v2: the first version scanned sg_agent_transactions three
-- times (once per window) and took ~18s, past any request-path timeout.
-- v2 does ONE pass into a per-agent aggregate, and the page never calls it:
-- a pg_cron job refreshes sg_league_snapshot daily, and the hub reads the
-- snapshot in milliseconds.

create or replace function public.sg_league_stats()
returns jsonb
language sql
security definer
set search_path = public
as $$
with per_agent as (
  select
    salesperson_reg_num as reg,
    count(*) as total,
    count(*) filter (where transaction_type not ilike '%RENTAL%') as sales_all,
    count(*) filter (where transaction_type not ilike '%RENTAL%' and represented = 'SELLER') as seller_all,
    count(*) filter (where transaction_type ilike '%RENTAL%') as rentals_all,
    count(*) filter (where transaction_type not ilike '%RENTAL%'
      and to_date(transaction_date, 'MON-YYYY') > now() - interval '12 months') as sales_12,
    count(*) filter (where transaction_type not ilike '%RENTAL%' and represented = 'SELLER'
      and to_date(transaction_date, 'MON-YYYY') > now() - interval '12 months') as seller_12,
    count(*) filter (where transaction_type ilike '%RENTAL%'
      and to_date(transaction_date, 'MON-YYYY') > now() - interval '12 months') as rentals_12,
    count(*) filter (where transaction_type not ilike '%RENTAL%'
      and to_date(transaction_date, 'MON-YYYY') > now() - interval '3 months') as sales_3,
    count(*) filter (where transaction_type not ilike '%RENTAL%' and represented = 'SELLER'
      and to_date(transaction_date, 'MON-YYYY') > now() - interval '3 months') as seller_3,
    count(*) filter (where transaction_type ilike '%RENTAL%'
      and to_date(transaction_date, 'MON-YYYY') > now() - interval '3 months') as rentals_3,
    max(to_date(transaction_date, 'MON-YYYY')) as latest
  from sg_agent_transactions
  where transaction_date ~ '^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)-[0-9]{4}$'
  group by salesperson_reg_num
),
hist as (
  select band, sort, count(*) as agents from (
    select case
      when total = 1 then '1 deal'
      when total between 2 and 4 then '2 to 4'
      when total between 5 and 9 then '5 to 9'
      when total between 10 and 19 then '10 to 19'
      when total between 20 and 49 then '20 to 49'
      when total between 50 and 99 then '50 to 99'
      when total between 100 and 199 then '100 to 199'
      else '200 or more' end as band,
    case
      when total = 1 then 1 when total <= 4 then 2 when total <= 9 then 3 when total <= 19 then 4
      when total <= 49 then 5 when total <= 99 then 6 when total <= 199 then 7 else 8 end as sort
    from per_agent
  ) b group by band, sort
),
boards as (
  select w, rn, sales, seller_side, rentals, reg from (
    select 'all' as w, sales_all as sales, seller_all as seller_side, rentals_all as rentals, reg,
      row_number() over (order by sales_all desc, seller_all desc) as rn from per_agent where sales_all > 0
    union all
    select '12mo', sales_12, seller_12, rentals_12, reg,
      row_number() over (order by sales_12 desc, seller_12 desc) from per_agent where sales_12 > 0
    union all
    select '3mo', sales_3, seller_3, rentals_3, reg,
      row_number() over (order by sales_3 desc, seller_3 desc) from per_agent where sales_3 > 0
  ) u where rn <= 8
),
board_named as (
  select b.w, b.rn, b.sales, b.seller_side, b.rentals, a.name, a.slug, a.agency_name, a.claimed
  from boards b join sg_agents a on a.cea_registration = b.reg
)
select jsonb_build_object(
  'freshness_month', (select to_char(max(latest), 'Mon YYYY') from per_agent),
  'register_total', (select count(*) from sg_agents),
  'agents_with_deals', (select count(*) from per_agent),
  'histogram', (select coalesce(jsonb_agg(jsonb_build_object(
      'band', h.band, 'agents', h.agents,
      'pct', round(100.0 * h.agents / (select count(*) from per_agent), 1)
    ) order by h.sort), '[]'::jsonb) from hist h),
  'boards', (select jsonb_object_agg(w, rows) from (
    select w, jsonb_agg(jsonb_build_object(
      'rank', rn, 'name', name, 'slug', slug, 'agency', agency_name,
      'claimed', claimed, 'sales', sales, 'seller_side', seller_side, 'rentals', rentals
    ) order by rn) as rows
    from board_named group by w
  ) g)
)
$$;

revoke all on function public.sg_league_stats() from public, anon, authenticated;
grant execute on function public.sg_league_stats() to service_role;

-- Snapshot the payload so the page read is instant.
create table if not exists public.sg_league_snapshot (
  id int primary key default 1 check (id = 1),
  payload jsonb not null,
  computed_at timestamptz not null default now()
);
alter table public.sg_league_snapshot enable row level security;
-- Service-role reads only (the hub renders server-side with supabaseAdmin).

create or replace function public.sg_refresh_league_snapshot()
returns void
language sql
security definer
set search_path = public
as $$
  insert into sg_league_snapshot (id, payload, computed_at)
  values (1, sg_league_stats(), now())
  on conflict (id) do update set payload = excluded.payload, computed_at = excluded.computed_at;
$$;

revoke all on function public.sg_refresh_league_snapshot() from public, anon, authenticated;
grant execute on function public.sg_refresh_league_snapshot() to service_role;

-- Daily refresh at 20:30 UTC (04:30 SGT), after the nightly data syncs.
select cron.schedule('league-snapshot-daily', '30 20 * * *', $$select public.sg_refresh_league_snapshot()$$);
