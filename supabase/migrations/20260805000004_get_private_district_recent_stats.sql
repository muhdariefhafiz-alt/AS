-- 12-month private (URA caveat) district evidence for /sell/condo/[district]
-- landing pages. Replaces a capped PostgREST select that had three defects:
-- the 1000-row max silently truncated counts and medians for high-volume
-- districts; the caller passed unpadded district codes ("9" never matches the
-- stored "09", so D01-D09 pages saw zero rows); and it ordered raw MMYY text
-- (contract_date), which is not chronological, with no month window at all.
-- contract_date parsing (DDMMYY via a leading '01', format guard regex) and
-- district normalisation (lpad of digits) mirror the proven sg_area_intel.
-- Service-role only: called from server components via supabaseAdmin().
-- NOT YET APPLIED to prod as of 2026-08-05: this session had no Supabase MCP
-- or SQL access. Apply via MCP apply_migration or the dashboard SQL editor
-- (project yhfdahkzukxglwikcdlo); until then privateAreaStats falls back to
-- the empty-stats path and condo pages render without figures.
create or replace function public.get_private_district_recent_stats(d_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_district text := lpad(regexp_replace(d_code, '\D', '', 'g'), 2, '0');
  v_from date := (date_trunc('month', current_date) - interval '11 months')::date;
  v_prior_from date := (date_trunc('month', current_date) - interval '23 months')::date;
  v_result jsonb;
begin
  with base as (
    select id, to_date('01' || contract_date, 'DDMMYY') as sale_month,
           project, property_type, area_sqm, floor_range, price
    from sg_private_transactions
    where district = v_district
      and contract_date ~ '^(0[1-9]|1[0-2])[0-9]{2}$'
      and price is not null and price > 0
  ),
  cur as (
    select * from base where sale_month >= v_from
  ),
  prior as (
    select price from base where sale_month >= v_prior_from and sale_month < v_from
  )
  select jsonb_build_object(
    'from_month', to_char(v_from, 'YYYY-MM'),
    'thru_month', (select to_char(max(sale_month), 'YYYY-MM') from cur),
    'count_12mo', (select count(*) from cur),
    'median_12mo', (select round(percentile_cont(0.5) within group (order by price)) from cur),
    'prior_count', (select count(*) from prior),
    'prior_median', (select round(percentile_cont(0.5) within group (order by price)) from prior),
    'top_projects', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.txns desc)
      from (
        select project, count(*)::int as txns,
          round(percentile_cont(0.5) within group (order by price)) as median_price
        from cur
        where project is not null and project <> ''
        group by project
        order by count(*) desc
        limit 8
      ) r
    ), '[]'::jsonb),
    'recent', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.month desc, r.id desc)
      from (
        select id, to_char(sale_month, 'YYYY-MM') as month, project,
               property_type, area_sqm, floor_range, price
        from cur
        order by sale_month desc, id desc
        limit 6
      ) r
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function public.get_private_district_recent_stats(text) from public;
revoke all on function public.get_private_district_recent_stats(text) from anon;
revoke all on function public.get_private_district_recent_stats(text) from authenticated;
grant execute on function public.get_private_district_recent_stats(text) to service_role;

notify pgrst, 'reload schema';
