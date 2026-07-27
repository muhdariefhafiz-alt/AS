-- Area Intelligence: one RPC behind the dashboard's CMA + farm-intelligence
-- panel. Two blocks:
--   farm    competition stats for an area over the last 12 months, computed
--           from per-agent-attributed CEA records (sg_agent_transactions,
--           MON-YYYY text dates parsed in SQL), including the calling agent's
--           own position in that window.
--   pricing district-market stats from URA caveats (sg_private_transactions,
--           MMYY contract dates), last 6 months. HDB town pricing is served
--           by the existing hdbValuation lib in JS, not here.
-- Honesty: no opaque saturation labels; the panel shows the ratios and the
-- window so the agent can judge. All aggregates in SQL (no 1000-row cap).

create or replace function public.sg_area_intel(
  p_area_type text,
  p_area text,
  p_reg text default null
)
returns jsonb
language sql
security definer
set search_path = public
as $$
with tx as (
  select
    salesperson_reg_num as reg,
    to_date(transaction_date, 'MON-YYYY') as d,
    property_type,
    (transaction_type not ilike '%RENTAL%') as is_sale
  from sg_agent_transactions
  where transaction_date ~ '^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)-[0-9]{4}$'
    and (
      (p_area_type = 'town' and nullif(town, '-') = upper(p_area))
      or (p_area_type = 'district'
          and nullif(district, '-') = lpad(regexp_replace(p_area, '\D', '', 'g'), 2, '0'))
    )
),
tx12 as (
  select * from tx where d > now() - interval '12 months'
),
per_agent as (
  select reg, count(*) as n, count(*) filter (where is_sale) as sales
  from tx12 group by reg
),
ranked as (
  select reg, n, sales, rank() over (order by n desc) as rnk,
         count(*) over () as agents
  from per_agent
),
top5 as (
  select coalesce(sum(n), 0) as n from (select n from per_agent order by n desc limit 5) t
),
priv as (
  select
    to_date('01' || contract_date, 'DDMMYY') as d,
    price,
    area_sqm as sqm,
    project
  from sg_private_transactions
  where p_area_type = 'district'
    and district = lpad(regexp_replace(p_area, '\D', '', 'g'), 2, '0')
    and contract_date ~ '^(0[1-9]|1[0-2])[0-9]{2}$'
),
priv6 as (
  select *, case when sqm > 0 then price / (sqm * 10.7639) else null end as psf
  from priv where d > now() - interval '6 months' and price is not null and price > 0
)
select jsonb_build_object(
  'farm', jsonb_build_object(
    'window_months', 12,
    'deals_12mo', (select count(*) from tx12),
    'sales_12mo', (select count(*) from tx12 where is_sale),
    'active_agents_12mo', (select count(distinct reg) from tx12),
    'deals_per_agent', (select case when count(distinct reg) = 0 then null
        else round(count(*)::numeric / count(distinct reg), 1) end from tx12),
    'top5_share_pct', (select case when (select count(*) from tx12) = 0 then null
        else round(100.0 * (select n from top5) / (select count(*) from tx12)) end),
    'hdb_deals_12mo', (select count(*) from tx12 where property_type = 'HDB'),
    'condo_deals_12mo', (select count(*) from tx12 where property_type like 'CONDO%' or property_type like 'EXECUTIVE%'),
    'landed_deals_12mo', (select count(*) from tx12 where property_type = 'LANDED'),
    'me', case when p_reg is null then null else (
      select jsonb_build_object('deals_12mo', r.n, 'sales_12mo', r.sales,
        'rank_by_deals', r.rnk, 'of_agents', r.agents)
      from ranked r where r.reg = p_reg
    ) end
  ),
  'pricing', case when p_area_type <> 'district' then null else jsonb_build_object(
    'window_months', 6,
    'n', (select count(*) from priv6),
    'median_price', (select percentile_cont(0.5) within group (order by price) from priv6),
    'p25_price', (select percentile_cont(0.25) within group (order by price) from priv6),
    'p75_price', (select percentile_cont(0.75) within group (order by price) from priv6),
    'median_psf', (select round((percentile_cont(0.5) within group (order by psf))::numeric) from priv6 where psf is not null),
    'recent', (select coalesce(jsonb_agg(x order by x_d desc), '[]'::jsonb) from (
      select jsonb_build_object(
        'project', initcap(lower(project)),
        'when', to_char(d, 'Mon YYYY'),
        'price', price,
        'psf', case when psf is not null then round(psf) else null end
      ) as x, d as x_d
      from priv6 order by d desc limit 5
    ) r)
  ) end
)
$$;

revoke all on function public.sg_area_intel(text, text, text) from public, anon, authenticated;
grant execute on function public.sg_area_intel(text, text, text) to service_role;
