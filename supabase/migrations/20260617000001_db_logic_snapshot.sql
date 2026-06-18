-- ============================================================================
-- DB LOGIC SNAPSHOT  (captured 2026-06-17, project yhfdahkzukxglwikcdlo)
--
-- Until now the SG scoring engine + data getters lived ONLY in Supabase
-- (applied via the MCP, never mirrored in git). This file captures the live
-- definitions so the repo reflects production and the logic survives DB loss.
--
-- NOTE: this DB is SHARED with the NL sibling (MakelaarsScan); only the
-- SG-relevant functions are captured here. These are CREATE OR REPLACE, so the
-- file is a safe, idempotent snapshot. The authoritative copy is still the live
-- DB: when you change a function, change it via a new migration AND here.
-- recalculate_sg_agent_scores is the LEGACY scorer, superseded by
-- calculate_agent_scores; kept for completeness.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_agent_scores()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  p95_wv numeric;   -- 95th percentile of (capped) sale-weighted volume
  top_wv numeric;   -- max (capped) sale-weighted volume
  data_max date;    -- latest transaction month in the dataset (recency anchor)
begin
  -- Recency is measured against the dataset's freshest month, NOT now(), so the
  -- top bucket stays reachable and scores do not silently decay between imports.
  -- NOTE: use max(to_date(...)), never to_date(max(text)). The transaction_date
  -- column is TEXT "MON-YYYY", so a text max sorts lexicographically by month
  -- letter ("SEP" > "OCT") and returns the wrong month. That bug previously gave
  -- 77% of agents a wrong "last deal" date, corrupting recency and experience.
  select max(to_date(transaction_date, 'MON-YYYY')) into data_max from sg_agent_transactions;
  if data_max is null then data_max := current_date; end if;

  -- Volume is SALE-WEIGHTED (seller-side sale 1.0, buyer-side 0.5, rental 0.2)
  -- with a per-month concentration cap on secondary-market sales. One person
  -- cannot personally close more than ~12 resale/sub-sale deals in a calendar
  -- month; months above that are almost always team transactions logged under a
  -- leader (the data shows a single agent with 120 resale deals in one month).
  -- We scale the resale/sub-sale weight of any such month down to the cap so
  -- parked team volume cannot inflate an individual's score. New-sale (project
  -- launch) volume is left uncapped because high launch-month counts are
  -- structurally legitimate.
  with mon as (
    select
      salesperson_reg_num as reg,
      transaction_date as mon,
      count(*) filter (where transaction_type in ('RESALE','SUB-SALE')) as rs_count,
      sum(case when transaction_type in ('RESALE','SUB-SALE') and represented = 'SELLER' then 1.0
               when transaction_type in ('RESALE','SUB-SALE') then 0.5 else 0 end) as rs_w,
      sum(case when transaction_type = 'NEW SALE' and represented = 'SELLER' then 1.0
               when transaction_type = 'NEW SALE' then 0.5 else 0 end) as ns_w,
      sum(case when transaction_type not ilike '%sale%' then 0.2 else 0 end) as rent_w
    from sg_agent_transactions
    group by salesperson_reg_num, transaction_date
  ),
  wv as (
    select reg,
      sum( rs_w * (case when rs_count > 12 then 12.0 / rs_count else 1 end) + ns_w + rent_w ) as weighted_vol
    from mon
    group by reg
  )
  select percentile_cont(0.95) within group (order by weighted_vol), max(weighted_vol)
  into p95_wv, top_wv
  from wv;

  if p95_wv is null or p95_wv = 0 then p95_wv := 1; end if;
  if top_wv is null or top_wv <= p95_wv then top_wv := p95_wv + 1; end if;

  update sg_agents a set
    transaction_count = coalesce(t.txn_count, 0),
    sale_txns = coalesce(t.sale_txns, 0),
    sale_share = case when coalesce(t.txn_count,0) > 0 then round(t.sale_txns::numeric / t.txn_count, 4) else null end,
    seller_sales = coalesce(t.seller_sales, 0),
    seller_share = case when coalesce(t.txn_count,0) > 0 then round(t.seller_sales::numeric / t.txn_count, 4) else null end,
    specialization = t.top_prop_type,
    primary_area = coalesce(t.top_town, t.top_location),
    years_active = t.years,
    score = least(100, greatest(0, round(
      case when t.weighted_vol <= p95_wv
           then 24.0 * ln(1 + t.weighted_vol) / ln(1 + p95_wv)
           else 24 + least(6, 6.0 * (t.weighted_vol - p95_wv) / nullif(top_wv - p95_wv, 0))
      end
      + case
          when t.months_since_last <= 3 then 25
          when t.months_since_last <= 6 then 20
          when t.months_since_last <= 12 then 15
          when t.months_since_last <= 24 then 8
          else 3 end
      + least(15, least(8, t.prop_type_count * 2.5) + least(7, t.area_count * 1.5))
      + least(15, coalesce(t.years, 0) * 2.5)
      + case
          when t.google_rating is not null and t.google_review_count >= 5 then
            least(15, (4.0 * 10 + t.google_rating::numeric * t.google_review_count) / (10 + t.google_review_count) * 3)
          when t.google_rating is not null then least(15, t.google_rating::numeric * 2.5)
          else 5 end
    ))),
    score_breakdown = jsonb_build_object(
      'volume', round(
        case when t.weighted_vol <= p95_wv
             then 24.0 * ln(1 + t.weighted_vol) / ln(1 + p95_wv)
             else 24 + least(6, 6.0 * (t.weighted_vol - p95_wv) / nullif(top_wv - p95_wv, 0))
        end),
      'recency', case
          when t.months_since_last <= 3 then 25
          when t.months_since_last <= 6 then 20
          when t.months_since_last <= 12 then 15
          when t.months_since_last <= 24 then 8
          else 3 end,
      'diversity', least(15, least(8, t.prop_type_count * 2.5) + least(7, t.area_count * 1.5)),
      'experience', least(15, coalesce(t.years, 0) * 2.5),
      'reviews', case
          when t.google_rating is not null and t.google_review_count >= 5 then
            least(15, round((4.0 * 10 + t.google_rating::numeric * t.google_review_count) / (10 + t.google_review_count) * 3))
          when t.google_rating is not null then least(15, round(t.google_rating::numeric * 2.5))
          else 5 end,
      'transaction_count', coalesce(t.txn_count, 0),
      'weighted_volume', round(t.weighted_vol, 1),
      'max_month_sales', coalesce(t.max_month_sales, 0),
      'specialization', t.top_prop_type,
      'primary_area', coalesce(t.top_town, t.top_location)
    ),
    score_updated_at = now()
  from (
    with mon as (
      select
        salesperson_reg_num as reg,
        transaction_date as mon,
        count(*) filter (where transaction_type in ('RESALE','SUB-SALE')) as rs_count,
        sum(case when transaction_type in ('RESALE','SUB-SALE') and represented = 'SELLER' then 1.0
                 when transaction_type in ('RESALE','SUB-SALE') then 0.5 else 0 end) as rs_w,
        sum(case when transaction_type = 'NEW SALE' and represented = 'SELLER' then 1.0
                 when transaction_type = 'NEW SALE' then 0.5 else 0 end) as ns_w,
        sum(case when transaction_type not ilike '%sale%' then 0.2 else 0 end) as rent_w
      from sg_agent_transactions
      group by salesperson_reg_num, transaction_date
    ),
    wv as (
      select reg,
        sum( rs_w * (case when rs_count > 12 then 12.0 / rs_count else 1 end) + ns_w + rent_w ) as weighted_vol,
        max(rs_count) as max_month_sales
      from mon
      group by reg
    )
    select g.*, wv.weighted_vol, wv.max_month_sales, ag.google_rating, ag.google_review_count
    from (
      select
        salesperson_reg_num as reg,
        count(*) as txn_count,
        count(*) filter (where transaction_type ilike '%sale%') as sale_txns,
        count(*) filter (where transaction_type ilike '%sale%' and represented = 'SELLER') as seller_sales,
        count(distinct property_type) as prop_type_count,
        count(distinct case when town is not null and town != '-' then town end) as area_count,
        (select property_type from sg_agent_transactions t2
         where t2.salesperson_reg_num = sg_agent_transactions.salesperson_reg_num
         group by property_type order by count(*) desc limit 1) as top_prop_type,
        (select town from sg_agent_transactions t2
         where t2.salesperson_reg_num = sg_agent_transactions.salesperson_reg_num
         and town is not null and town != '-'
         group by town order by count(*) desc limit 1) as top_town,
        (select general_location from sg_agent_transactions t2
         where t2.salesperson_reg_num = sg_agent_transactions.salesperson_reg_num
         and general_location is not null and general_location != '-'
         group by general_location order by count(*) desc limit 1) as top_location,
        (max(to_date(transaction_date,'MON-YYYY')) - min(to_date(transaction_date,'MON-YYYY')))::numeric / 365.25 as years,
        (data_max - max(to_date(transaction_date,'MON-YYYY')))::numeric / 30.44 as months_since_last
      from sg_agent_transactions
      group by salesperson_reg_num
    ) g
    join wv on wv.reg = g.reg
    left join sg_agents a2 on a2.cea_registration = g.reg
    left join sg_agencies ag on ag.id = a2.agency_id
  ) t
  where a.cea_registration = t.reg;

end;
$function$;


CREATE OR REPLACE FUNCTION public.get_agent_market_study()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
with txn as (
  select count(*) total_rows,
         count(distinct salesperson_reg_num) ever_transacted,
         count(*) filter (where transaction_type ilike '%rent%' or transaction_type ilike '%lease%') rental_rows,
         count(*) filter (where transaction_type ilike '%sale%' or transaction_type ilike '%resale%') sale_rows,
         to_char(min(to_date(transaction_date,'MON-YYYY')),'MON-YYYY') min_date,
         to_char(max(to_date(transaction_date,'MON-YYYY')),'MON-YYYY') max_date,
         max(to_date(transaction_date,'MON-YYYY')) as data_max
  from sg_agent_transactions
),
active12 as (
  select count(distinct salesperson_reg_num) active_last12
  from sg_agent_transactions
  where to_date(transaction_date,'MON-YYYY') >= (select data_max from txn) - interval '12 months'
),
matched as (
  select count(*) register_matched from sg_agents a
  where exists (select 1 from sg_agent_transactions t where t.salesperson_reg_num = a.cea_registration)
),
per_agent as (
  select salesperson_reg_num, count(*) c from sg_agent_transactions group by 1
),
allconc as (
  select c, ntile(100) over (order by c desc) pct, sum(c) over () tot from per_agent
),
allshare as (
  select round(100.0*sum(c) filter (where pct<=1)/max(tot),1) top1,
         round(100.0*sum(c) filter (where pct<=5)/max(tot),1) top5,
         round(100.0*sum(c) filter (where pct<=10)/max(tot),1) top10,
         round(100.0*sum(c) filter (where pct<=20)/max(tot),1) top20,
         round(percentile_cont(0.5) within group (order by c)::numeric,1) median_active
  from allconc
),
sales_pa as (
  select salesperson_reg_num, count(*) c from sg_agent_transactions
  where transaction_type ilike '%sale%' or transaction_type ilike '%resale%'
  group by 1
),
salesconc as (
  select c, ntile(100) over (order by c desc) pct, sum(c) over () tot, count(*) over () n from sales_pa
),
salesshare as (
  select max(n) agents_who_sold, max(tot) total_sales,
         round(100.0*sum(c) filter (where pct<=1)/max(tot),1) s_top1,
         round(100.0*sum(c) filter (where pct<=10)/max(tot),1) s_top10,
         round(100.0*sum(c) filter (where pct<=20)/max(tot),1) s_top20,
         round(percentile_cont(0.5) within group (order by c)::numeric,1) s_median
  from salesconc
)
select jsonb_build_object(
  'register_total', (select count(*) from sg_agents),
  'ever_transacted', (select ever_transacted from txn),
  'register_matched', (select register_matched from matched),
  'active_last12', (select active_last12 from active12),
  'total_txns', (select total_rows from txn),
  'rental_rows', (select rental_rows from txn),
  'sale_rows', (select sale_rows from txn),
  'min_date', (select min_date from txn),
  'max_date', (select max_date from txn),
  'all_top1', (select top1 from allshare),
  'all_top5', (select top5 from allshare),
  'all_top10', (select top10 from allshare),
  'all_top20', (select top20 from allshare),
  'median_active', (select median_active from allshare),
  'agents_who_sold', (select agents_who_sold from salesshare),
  'total_sales', (select total_sales from salesshare),
  'sales_top1', (select s_top1 from salesshare),
  'sales_top10', (select s_top10 from salesshare),
  'sales_top20', (select s_top20 from salesshare),
  'sales_median', (select s_median from salesshare)
);
$function$;


CREATE OR REPLACE FUNCTION public.get_agent_track_record(reg_num text)
 RETURNS TABLE(total_txns bigint, earliest_txn text, latest_txn text, property_types jsonb, transaction_types jsonb, represented_roles jsonb, top_towns jsonb, top_districts jsonb)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH txns AS (
    SELECT * FROM sg_agent_transactions WHERE salesperson_reg_num = reg_num
  ),
  stats AS (
    SELECT
      count(*) as total_txns,
      min(transaction_date) as earliest_txn,
      max(transaction_date) as latest_txn
    FROM txns
  ),
  by_prop AS (
    SELECT jsonb_object_agg(property_type, cnt) as property_types
    FROM (SELECT property_type, count(*) as cnt FROM txns GROUP BY property_type ORDER BY cnt DESC) t
  ),
  by_txn_type AS (
    SELECT jsonb_object_agg(transaction_type, cnt) as transaction_types
    FROM (SELECT transaction_type, count(*) as cnt FROM txns GROUP BY transaction_type ORDER BY cnt DESC) t
  ),
  by_role AS (
    SELECT jsonb_object_agg(represented, cnt) as represented_roles
    FROM (SELECT represented, count(*) as cnt FROM txns GROUP BY represented ORDER BY cnt DESC) t
  ),
  by_town AS (
    SELECT jsonb_agg(jsonb_build_object('town', town, 'count', cnt) ORDER BY cnt DESC) as top_towns
    FROM (SELECT town, count(*) as cnt FROM txns WHERE town IS NOT NULL AND town != '-' GROUP BY town ORDER BY cnt DESC LIMIT 5) t
  ),
  by_district AS (
    SELECT jsonb_agg(jsonb_build_object('district', general_location, 'count', cnt) ORDER BY cnt DESC) as top_districts
    FROM (SELECT general_location, count(*) as cnt FROM txns WHERE general_location IS NOT NULL AND general_location != '-' GROUP BY general_location ORDER BY cnt DESC LIMIT 5) t
  )
  SELECT s.total_txns, s.earliest_txn, s.latest_txn,
    p.property_types, tt.transaction_types, r.represented_roles,
    tw.top_towns, d.top_districts
  FROM stats s, by_prop p, by_txn_type tt, by_role r, by_town tw, by_district d
$function$;


CREATE OR REPLACE FUNCTION public.get_agent_txn_record(p_reg text, p_lim integer DEFAULT 60)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT jsonb_build_object(
    'total',        count(*),
    'sales',        count(*) FILTER (WHERE transaction_type ILIKE '%sale%'),
    'seller_sales', count(*) FILTER (WHERE transaction_type ILIKE '%sale%' AND represented = 'SELLER'),
    'buyer_sales',  count(*) FILTER (WHERE transaction_type ILIKE '%sale%' AND represented = 'BUYER'),
    'rentals',      count(*) FILTER (WHERE transaction_type NOT ILIKE '%sale%'),
    'max_month_sales', COALESCE((
      SELECT max(c) FROM (
        SELECT count(*) c
        FROM sg_agent_transactions
        WHERE salesperson_reg_num = p_reg AND transaction_type IN ('RESALE','SUB-SALE')
        GROUP BY transaction_date
      ) z), 0),
    'recent', (
      SELECT jsonb_agg(r) FROM (
        SELECT
          transaction_date AS month,
          property_type,
          transaction_type,
          represented,
          COALESCE(NULLIF(town, '-'), NULLIF(general_location, '-'), district) AS area
        FROM sg_agent_transactions
        WHERE salesperson_reg_num = p_reg
        ORDER BY to_date(transaction_date, 'MON-YYYY') DESC NULLS LAST
        LIMIT p_lim
      ) r
    )
  )
  FROM sg_agent_transactions
  WHERE salesperson_reg_num = p_reg;
$function$;


CREATE OR REPLACE FUNCTION public.refresh_agent_concentration_stats()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
 SET statement_timeout TO '0'
AS $function$
declare
  v_data jsonb;
  v_window_start text;
  v_window_end text;
begin
  select to_char(min(to_date(transaction_date,'MON-YYYY')),'Mon YYYY'),
         to_char(max(to_date(transaction_date,'MON-YYYY')),'Mon YYYY')
  into v_window_start, v_window_end
  from sg_agent_transactions;

  drop table if exists _seg_stats;
  create temp table _seg_stats as
  with base as (
    select salesperson_reg_num as reg, property_type, transaction_type
    from sg_agent_transactions
    where transaction_type in ('RESALE','NEW SALE','SUB-SALE')
  ),
  labeled as (
    select reg, case
        when property_type='HDB' and transaction_type='RESALE' then 'HDB resale'
        when property_type in ('CONDOMINIUM_APARTMENTS','EXECUTIVE_CONDOMINIUM') and transaction_type='RESALE' then 'Private resale (condo/EC)'
        when transaction_type='NEW SALE' then 'New launch'
        when property_type in ('LANDED','STRATA_LANDED') and transaction_type in ('RESALE','SUB-SALE') then 'Landed resale'
        else 'Other sale' end as seg
    from base
    union all
    select reg, 'ALL home sales' from base
  ),
  agent_seg as (select seg, reg, count(*) sales from labeled group by seg, reg),
  ranked as (
    select seg, reg, sales,
      sum(sales) over (partition by seg) seg_total,
      count(*) over (partition by seg) seg_agents,
      row_number() over (partition by seg order by sales desc) rnk
    from agent_seg
  )
  select seg, seg_agents as agents, seg_total as sales,
    round(100.0*sum(sales) filter (where rnk <= ceil(seg_agents*0.01))/seg_total,1) as top1,
    round(100.0*sum(sales) filter (where rnk <= ceil(seg_agents*0.10))/seg_total,1) as top10,
    round(100.0*sum(sales) filter (where rnk <= ceil(seg_agents*0.20))/seg_total,1) as top20
  from ranked group by seg, seg_agents, seg_total;

  drop table if exists _hdb_top;
  create temp table _hdb_top as
  with hdb as (
    select salesperson_reg_num as reg, town
    from sg_agent_transactions
    where transaction_type='RESALE' and property_type='HDB' and town is not null and town<>'-'
  ),
  agent_tot as (select reg, count(*) deals, count(distinct town) towns from hdb group by reg),
  rk as (select reg, deals, towns, row_number() over (order by deals desc) rnk, count(*) over () n from agent_tot),
  top_agents as (select reg, deals, towns from rk where rnk <= ceil(n*0.01)),
  top_town as (select reg, max(c) ttd from (select reg, town, count(*) c from hdb group by reg, town) z group by reg)
  select t.reg, t.deals, t.towns, 100.0*tt.ttd/t.deals as top_town_share
  from top_agents t join top_town tt on tt.reg=t.reg;

  select jsonb_build_object(
    'window_start', v_window_start,
    'window_end', v_window_end,
    'all', (select to_jsonb(a) from _seg_stats a where seg='ALL home sales'),
    'segments', (select jsonb_agg(to_jsonb(a) order by a.sales desc) from _seg_stats a where seg not in ('ALL home sales','Other sale')),
    'hdb_total_towns', (select count(distinct town) from sg_agent_transactions where transaction_type='RESALE' and property_type='HDB' and town is not null and town<>'-'),
    'top_hdb', jsonb_build_object(
      'agents', (select count(*) from _hdb_top),
      'median_deals', (select round(percentile_cont(0.5) within group (order by deals)::numeric) from _hdb_top),
      'median_towns', (select round(percentile_cont(0.5) within group (order by towns)::numeric) from _hdb_top),
      'median_top_town_share', (select round(percentile_cont(0.5) within group (order by top_town_share)::numeric,1) from _hdb_top),
      'single_town_dominant', (select count(*) from _hdb_top where top_town_share >= 50),
      'spread_under30', (select count(*) from _hdb_top where top_town_share < 30),
      'max_towns', (select max(towns) from _hdb_top)
    ),
    'parking', (
      with mon as (
        select salesperson_reg_num reg, transaction_date,
          count(*) filter (where transaction_type in ('RESALE','SUB-SALE')) rs
        from sg_agent_transactions group by salesperson_reg_num, transaction_date
      )
      select jsonb_build_object(
        'max_month_resale', max(rs),
        'agentmonths_over12', count(*) filter (where rs > 12),
        'agents_flagged', count(distinct reg) filter (where rs > 12)
      ) from mon
    )
  ) into v_data;

  insert into public.agent_concentration_stats (id, data, updated_at)
  values (1, v_data, now())
  on conflict (id) do update set data = excluded.data, updated_at = excluded.updated_at;

  drop table if exists _seg_stats;
  drop table if exists _hdb_top;
end;
$function$;


CREATE OR REPLACE FUNCTION public.refresh_agent_flags()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
 SET statement_timeout TO '0'
AS $function$
begin
  with mon as (
    select salesperson_reg_num reg, transaction_date,
      count(*) filter (where transaction_type in ('RESALE','SUB-SALE')) rs
    from sg_agent_transactions group by salesperson_reg_num, transaction_date
  ),
  maxmon as (select reg, max(rs) max_rs from mon group by reg),
  agg as (
    select salesperson_reg_num reg,
      count(*) txns,
      count(*) filter (where transaction_type ilike '%sale%') sale_txns,
      count(*) filter (where transaction_type ilike '%sale%' and represented='SELLER') seller_sales,
      count(*) filter (where transaction_type ilike '%sale%' and represented='BUYER') buyer_sales,
      count(*) filter (where transaction_type = 'NEW SALE') new_sale
    from sg_agent_transactions group by salesperson_reg_num
  ),
  flags as (
    select a.reg,
      (
        select coalesce(jsonb_agg(f order by ord), '[]'::jsonb) from (
          select 1 ord, jsonb_build_object('t','team') f
            where coalesce(m.max_rs,0) > 12
          union all
          select 2, jsonb_build_object('t','buyer_side','pct', round(100.0*a.buyer_sales/nullif(a.seller_sales+a.buyer_sales,0)))
            where (a.seller_sales+a.buyer_sales) >= 20 and a.buyer_sales::numeric/nullif(a.seller_sales+a.buyer_sales,0) >= 0.7
          union all
          select 3, jsonb_build_object('t','new_launch','pct', round(100.0*a.new_sale/nullif(a.sale_txns,0)))
            where a.sale_txns >= 20 and a.new_sale::numeric/nullif(a.sale_txns,0) >= 0.6
          union all
          select 4, jsonb_build_object('t','rentals','pct', round(100.0*a.sale_txns/nullif(a.txns,0)))
            where a.txns >= 10 and a.sale_txns::numeric/nullif(a.txns,0) < 0.4
        ) z
      ) as flags_json
    from agg a left join maxmon m on m.reg = a.reg
  )
  update public.sg_agents s
  set agent_flags = f.flags_json
  from flags f
  where s.cea_registration = f.reg and s.agent_flags is distinct from f.flags_json;
end
$function$;


CREATE OR REPLACE FUNCTION public.refresh_agent_market_stats()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into agent_market_stats (id, data, updated_at)
  values (1, get_agent_market_study(), now())
  on conflict (id) do update set data = excluded.data, updated_at = excluded.updated_at;
end;
$function$;


CREATE OR REPLACE FUNCTION public.refresh_area_top_agents()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Sync score + sale_share + seller_share from the live agent record.
  UPDATE sg_area_top_agents t
  SET score = a.score, sale_share = a.sale_share, seller_share = a.seller_share, updated_at = now()
  FROM sg_agents a
  WHERE a.id = t.agent_id;

  -- Re-rank for SELLER surfaces with a 3-tier priority:
  --   1. Seller-active agents (>= 30% of all deals are seller-side sales)
  --   2. Sale-active agents (>= 40% sales, even if buyer-side)
  --   3. Everyone else (rental-heavy)
  WITH ranked AS (
    SELECT id, row_number() OVER (
      PARTITION BY area_type, area_name
      ORDER BY
        (COALESCE(seller_share, 0.2) >= 0.3) DESC,
        (COALESCE(sale_share, 0.5) >= 0.4) DESC,
        score DESC NULLS LAST,
        area_txns DESC NULLS LAST
    ) rn
    FROM sg_area_top_agents
  )
  UPDATE sg_area_top_agents t SET rank = ranked.rn
  FROM ranked WHERE ranked.id = t.id;
END;
$function$;


CREATE OR REPLACE FUNCTION public.run_daily_score_refresh()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
 SET statement_timeout TO '0'
AS $function$
begin
  perform calculate_agent_scores();
  perform refresh_area_top_agents();
  perform refresh_agent_market_stats();
  perform refresh_agent_concentration_stats();
  perform refresh_agent_flags();
end;
$function$;


-- LEGACY: superseded by calculate_agent_scores(). Kept for parity with prod.
CREATE OR REPLACE FUNCTION public.recalculate_sg_agent_scores()
 RETURNS TABLE(agents_scored bigint)
 LANGUAGE sql
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH stats AS (
    SELECT
      salesperson_reg_num as reg, count(*) as txn_count,
      count(DISTINCT property_type) as prop_types,
      count(DISTINCT CASE WHEN town != '-' THEN town END) as areas
    FROM sg_agent_transactions WHERE salesperson_reg_num IS NOT NULL
    GROUP BY salesperson_reg_num
  ),
  top_props AS (
    SELECT DISTINCT ON (reg) reg, top_prop FROM (
      SELECT salesperson_reg_num as reg, property_type as top_prop, count(*) as cnt
      FROM sg_agent_transactions GROUP BY 1, 2
    ) t ORDER BY reg, cnt DESC
  ),
  top_areas AS (
    SELECT DISTINCT ON (reg) reg, area FROM (
      SELECT salesperson_reg_num as reg, COALESCE(NULLIF(town, '-'), NULLIF(general_location, '-')) as area, count(*) as cnt
      FROM sg_agent_transactions WHERE COALESCE(NULLIF(town, '-'), NULLIF(general_location, '-')) IS NOT NULL GROUP BY 1, 2
    ) t ORDER BY reg, cnt DESC
  ),
  bench AS (
    SELECT percentile_cont(0.95) WITHIN GROUP (ORDER BY txn_count) as p95 FROM stats
  ),
  combined AS (
    SELECT
      s.reg, s.txn_count, tp.top_prop, ta.area,
      LEAST(100, GREATEST(10,
        LEAST(30, ROUND(30.0 * LN(1 + s.txn_count) / LN(1 + b.p95)))
        + 15
        + LEAST(15, ROUND(LEAST(8, s.prop_types * 2.5) + LEAST(7, s.areas * 1.5)))
        + (CASE WHEN s.txn_count > 200 THEN 15 WHEN s.txn_count > 100 THEN 12 WHEN s.txn_count > 50 THEN 9 WHEN s.txn_count > 20 THEN 6 ELSE 3 END)
        + 5
      )) as total_score,
      jsonb_build_object(
        'volume', LEAST(30, ROUND(30.0 * LN(1 + s.txn_count) / LN(1 + b.p95))),
        'recency', 15,
        'diversity', LEAST(15, ROUND(LEAST(8, s.prop_types * 2.5) + LEAST(7, s.areas * 1.5))),
        'experience', CASE WHEN s.txn_count > 200 THEN 15 WHEN s.txn_count > 100 THEN 12 WHEN s.txn_count > 50 THEN 9 WHEN s.txn_count > 20 THEN 6 ELSE 3 END,
        'reviews', 5
      ) as breakdown
    FROM stats s CROSS JOIN bench b
    LEFT JOIN top_props tp ON tp.reg = s.reg
    LEFT JOIN top_areas ta ON ta.reg = s.reg
  ),
  updated AS (
    UPDATE sg_agents SET
      transaction_count = c.txn_count, specialization = c.top_prop,
      primary_area = c.area, score = c.total_score,
      score_breakdown = c.breakdown, score_updated_at = now()
    FROM combined c WHERE sg_agents.cea_registration = c.reg
    RETURNING 1
  )
  SELECT count(*)::bigint as agents_scored FROM updated;
$function$;
