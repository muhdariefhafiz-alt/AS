-- 12-month HDB town evidence for /sell/hdb/[town] landing pages.
-- Replaces a capped PostgREST select (1000-row max silently truncated medians
-- and counts for high-volume towns, e.g. Tampines showed "1000 sales" for a
-- real 1,754). Aggregate runs in SQL, indexed by town (idx_sg_hdb_town).
-- Service-role only: called from server components via supabaseAdmin().
-- Applied to prod 2026-08-05 via MCP apply_migration.
create or replace function public.get_hdb_town_recent_stats(t_name text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_from text := to_char(date_trunc('month', current_date) - interval '11 months', 'YYYY-MM');
  v_prior_from text := to_char(date_trunc('month', current_date) - interval '23 months', 'YYYY-MM');
  v_result jsonb;
begin
  with cur as (
    select id, month, block, street_name, flat_type, storey_range, floor_area_sqm, resale_price
    from sg_hdb_transactions
    where town = upper(t_name) and month >= v_from
  ),
  prior as (
    select resale_price
    from sg_hdb_transactions
    where town = upper(t_name) and month >= v_prior_from and month < v_from
  )
  select jsonb_build_object(
    'from_month', v_from,
    'thru_month', (select max(month) from cur),
    'count_12mo', (select count(*) from cur),
    'median_12mo', (select round(percentile_cont(0.5) within group (order by resale_price)) from cur),
    'prior_count', (select count(*) from prior),
    'prior_median', (select round(percentile_cont(0.5) within group (order by resale_price)) from prior),
    'by_type', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.txns desc)
      from (
        select flat_type, count(*)::int as txns,
          round(percentile_cont(0.5) within group (order by resale_price)) as median_price
        from cur
        group by flat_type
      ) r
    ), '[]'::jsonb),
    'recent', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.month desc, r.id desc)
      from (
        select id, month, block, street_name, flat_type, storey_range, floor_area_sqm, resale_price
        from cur
        order by month desc, id desc
        limit 6
      ) r
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function public.get_hdb_town_recent_stats(text) from public;
revoke all on function public.get_hdb_town_recent_stats(text) from anon;
revoke all on function public.get_hdb_town_recent_stats(text) from authenticated;
grant execute on function public.get_hdb_town_recent_stats(text) to service_role;

notify pgrst, 'reload schema';
