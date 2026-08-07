-- Farm-area suggestions from the agent's OWN transaction record.
--
-- Deal Radar inner-joins sg_agent_farm_areas, which held zero rows platform
-- wide, so the product's only daily-shaped feed returned nothing for every
-- agent while asking them to type in areas we could already see. 77.6% of the
-- register has at least one area with real history; the setup step should be
-- confirming what we know, not composing it.
--
-- Axis semantics mirror deal_radar() itself: towns feed the HDB half (still
-- ingesting daily), districts feed the private half. Districts are returned
-- ZERO-PADDED ('06'), which is how both sg_private_transactions and
-- sg_agent_transactions store them; the API route normalises picker input to
-- match.
--
-- Window: last 24 months first, because "where you work now" beats "where you
-- worked in 2015". Falls back to lifetime when the 24-month record is empty,
-- so a returning agent still gets suggestions rather than a blank picker.
--
-- No double counting: each axis counts its own column independently and the
-- two are never summed (the pitch-kit UNION taught us that lesson).

create or replace function public.sg_farm_area_suggestions(p_reg text)
returns table (area_type text, area_key text, deals int, last_deal text)
language sql
security definer
set search_path = public, pg_temp
as $$
with tx as (
  select town, district,
         to_date(transaction_date, 'MON-YYYY') as d
  from sg_agent_transactions
  where salesperson_reg_num = p_reg
),
recent as (select * from tx where d > now() - interval '24 months'),
pick as (select * from recent
         union all
         select * from tx where not exists (select 1 from recent)),
by_town as (
  select 'town'::text as area_type, town as area_key, count(*)::int as deals, max(d) as last
  from pick where town is not null and town <> '-' group by town
),
by_district as (
  select 'district'::text, lpad(district, 2, '0'), count(*)::int, max(d)
  from pick where district is not null and district <> '-' group by district
)
select area_type, area_key, deals, to_char(last, 'Mon YYYY') as last_deal
from (select * from by_town union all select * from by_district) u
order by deals desc, last desc
limit 6;
$$;

revoke all on function public.sg_farm_area_suggestions(text) from public, anon, authenticated;
grant execute on function public.sg_farm_area_suggestions(text) to service_role;

notify pgrst, 'reload schema';
