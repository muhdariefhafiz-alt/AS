-- Per-year sales/rentals counts for an agent's public activity-over-time chart
-- (PropKaki-parity visual). Cheap: filtered on the indexed salesperson_reg_num.
-- transaction_date is text "MON-YYYY".
create or replace function public.get_agent_activity_by_year(p_reg text)
returns jsonb
language sql stable
set search_path to 'public', 'pg_temp'
as $$
  select coalesce(jsonb_agg(row_to_json(y) order by y.year), '[]'::jsonb)
  from (
    select
      to_char(to_date(transaction_date, 'MON-YYYY'), 'YYYY') as year,
      count(*) filter (where transaction_type ilike '%sale%') as sales,
      count(*) filter (where transaction_type not ilike '%sale%') as rentals,
      count(*) as total
    from sg_agent_transactions
    where salesperson_reg_num = p_reg
      and transaction_date ~ '^[A-Za-z]{3}-[0-9]{4}$'
    group by 1
  ) y;
$$;
