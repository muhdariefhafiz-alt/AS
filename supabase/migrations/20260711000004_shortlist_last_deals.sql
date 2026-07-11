-- Batched last-deal lookup for the seller shortlist (sold evidence, roadmap
-- R10). transaction_date is TEXT like 'APR-2017'; naive max() sorts
-- lexicographically (the 40%-of-score bug class), so parse to real dates.
-- Security definer + service-role usage only; input is a small array of CEA
-- registration numbers.
--
-- Applied to production via Supabase MCP on 2026-07-11.
create or replace function public.shortlist_last_deals(regs text[])
returns table (
  reg text,
  last_txn date,
  last_sale date
)
language sql
stable
security definer
set search_path = public
as $$
  select
    salesperson_reg_num as reg,
    max(to_date(transaction_date, 'MON-YYYY')) as last_txn,
    max(to_date(transaction_date, 'MON-YYYY')) filter (
      where transaction_type ilike '%sale%'
        and transaction_type not ilike '%rental%'
    ) as last_sale
  from sg_agent_transactions
  where salesperson_reg_num = any(regs)
    and transaction_date ~ '^[A-Z]{3}-\d{4}$'
  group by salesperson_reg_num
$$;

revoke all on function public.shortlist_last_deals(text[]) from anon, authenticated;
