-- League stats for the /property-agents hub: the deals-distribution
-- histogram and time-windowed activity boards, computed from per-agent
-- CEA records. Deliberately better than volume-count directories:
--   - boards are SALES-led (rentals shown separately, never summed in),
--   - seller-side sales are a visible column,
--   - the data freshness month is returned and displayed,
--   - the copy frames these as ACTIVITY, distinct from AgentScore.
-- Heavy scan over 1.34M rows: called only at ISR revalidate (12h), never
-- per-request.

create or replace function public.sg_league_stats()
returns jsonb
language sql
security definer
set search_path = public
as $$
with tx as (
  select
    salesperson_reg_num as reg,
    to_date(transaction_date, 'MON-YYYY') as d,
    represented,
    (transaction_type not ilike '%RENTAL%') as is_sale
  from sg_agent_transactions
  where transaction_date ~ '^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)-[0-9]{4}$'
),
per_agent_total as (
  select reg, count(*) as n from tx group by reg
),
hist as (
  select band, sort, count(*) as agents from (
    select case
      when n = 1 then '1 deal'
      when n between 2 and 4 then '2 to 4'
      when n between 5 and 9 then '5 to 9'
      when n between 10 and 19 then '10 to 19'
      when n between 20 and 49 then '20 to 49'
      when n between 50 and 99 then '50 to 99'
      when n between 100 and 199 then '100 to 199'
      else '200 or more' end as band,
    case
      when n = 1 then 1 when n <= 4 then 2 when n <= 9 then 3 when n <= 19 then 4
      when n <= 49 then 5 when n <= 99 then 6 when n <= 199 then 7 else 8 end as sort
    from per_agent_total
  ) b group by band, sort
),
board as (
  select w.window_key, t.reg,
    count(*) filter (where t.is_sale) as sales,
    count(*) filter (where t.is_sale and t.represented = 'SELLER') as seller_side,
    count(*) filter (where not t.is_sale) as rentals
  from (values
    ('12mo', interval '12 months'),
    ('3mo', interval '3 months'),
    ('all', null::interval)
  ) as w(window_key, win)
  join tx t on (w.win is null or t.d > now() - w.win)
  group by w.window_key, t.reg
),
board_ranked as (
  select b.*, row_number() over (partition by b.window_key order by b.sales desc, b.seller_side desc) as rn
  from board b
  where b.sales > 0
),
board_named as (
  select br.window_key, br.rn, br.sales, br.seller_side, br.rentals,
    a.name, a.slug, a.agency_name, a.claimed
  from board_ranked br
  join sg_agents a on a.cea_registration = br.reg
  where br.rn <= 8
)
select jsonb_build_object(
  'freshness_month', (select to_char(max(d), 'Mon YYYY') from tx),
  'register_total', (select count(*) from sg_agents),
  'agents_with_deals', (select count(*) from per_agent_total),
  'histogram', (select coalesce(jsonb_agg(jsonb_build_object(
      'band', h.band, 'agents', h.agents,
      'pct', round(100.0 * h.agents / (select count(*) from per_agent_total), 1)
    ) order by h.sort), '[]'::jsonb) from hist h),
  'boards', (select jsonb_object_agg(w, rows) from (
    select window_key as w, jsonb_agg(jsonb_build_object(
      'rank', rn, 'name', name, 'slug', slug, 'agency', agency_name,
      'claimed', claimed, 'sales', sales, 'seller_side', seller_side, 'rentals', rentals
    ) order by rn) as rows
    from board_named
    group by window_key
  ) g)
)
$$;

revoke all on function public.sg_league_stats() from public, anon, authenticated;
grant execute on function public.sg_league_stats() to service_role;
