-- Pitch Kit: one RPC assembling an agent's verified record for the listing
-- pitch artifact (/pitch/[slug]/[type]/[key]) and the dashboard picker.
--
-- All date logic parses the TEXT transaction_date ('SEP-2025') via
-- to_date(.., 'MON-YYYY'): plain ORDER BY on that column is lexicographic and
-- wrong (documented trap). Aggregates run in SQL so the PostgREST 1000-row cap
-- can never truncate a big agent's record.
--
-- p_area_type/p_area null  -> picker mode: returns the agent's active areas
-- p_area_type/p_area given -> kit mode: adds in-area stats + recent deals

create or replace function public.sg_pitch_kit(
  p_reg text,
  p_area_type text default null,
  p_area text default null
)
returns jsonb
language sql
security definer
set search_path = public
as $$
with tx as (
  select
    to_date(transaction_date, 'MON-YYYY') as d,
    property_type,
    transaction_type,
    represented,
    nullif(town, '-') as town,
    nullif(district, '-') as district,
    (transaction_type not ilike '%RENTAL%') as is_sale
  from sg_agent_transactions
  where salesperson_reg_num = p_reg
    and transaction_date ~ '^[A-Z]{3}-[0-9]{4}$'
),
in_area as (
  select * from tx
  where p_area is not null and (
    (p_area_type = 'town' and town = upper(p_area))
    or (p_area_type = 'district' and district = lpad(regexp_replace(p_area, '\D', '', 'g'), 2, '0'))
  )
),
areas as (
  select area_type, area_name, n from (
    select 'town' as area_type, town as area_name, count(*) as n
    from tx where town is not null group by town
    union all
    select 'district', district, count(*)
    from tx where district is not null and district ~ '^[0-9]{2}$' group by district
  ) u
  order by n desc
  limit 8
)
select jsonb_build_object(
  'record', jsonb_build_object(
    'total', (select count(*) from tx),
    'total_sales', (select count(*) from tx where is_sale),
    'total_rentals', (select count(*) from tx where not is_sale),
    'last_24mo', (select count(*) from tx where d > now() - interval '24 months'),
    'sales_24mo', (select count(*) from tx where is_sale and d > now() - interval '24 months'),
    'seller_side_sales', (select count(*) from tx where is_sale and represented = 'SELLER'),
    'first_activity', (select to_char(min(d), 'Mon YYYY') from tx),
    'last_activity', (select to_char(max(d), 'Mon YYYY') from tx),
    'hdb_share_pct', (select case when count(*) = 0 then null
        else round(100.0 * count(*) filter (where property_type = 'HDB') / count(*)) end from tx)
  ),
  'areas', (select coalesce(jsonb_agg(jsonb_build_object(
      'area_type', a.area_type, 'area_name', a.area_name, 'deals', a.n)), '[]'::jsonb)
    from areas a),
  'in_area', case when p_area is null then null else jsonb_build_object(
    'deals', (select count(*) from in_area),
    'sales', (select count(*) from in_area where is_sale),
    'seller_side', (select count(*) from in_area where represented = 'SELLER'),
    'last_24mo', (select count(*) from in_area where d > now() - interval '24 months'),
    'last_deal', (select to_char(max(d), 'Mon YYYY') from in_area)
  ) end,
  'recent_deals', case when p_area is null then null else (
    select coalesce(jsonb_agg(x order by x_d desc), '[]'::jsonb) from (
      select jsonb_build_object(
        'when', to_char(d, 'Mon YYYY'),
        'property_type', property_type,
        'transaction_type', transaction_type,
        'represented', represented,
        'area', coalesce(town, 'D' || district)
      ) as x, d as x_d
      from in_area
      order by d desc
      limit 10
    ) r
  ) end
)
$$;

revoke all on function public.sg_pitch_kit(text, text, text) from public, anon, authenticated;
grant execute on function public.sg_pitch_kit(text, text, text) to service_role;
