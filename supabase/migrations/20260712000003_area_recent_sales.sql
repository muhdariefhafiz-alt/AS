-- Recent sales for an area (HDB town or private district) for the co-branded
-- seller report. Exposes only block/street/price/date already shown publicly on
-- our area pages (open URA/HDB data, no owner PII). Security definer so the public
-- report page (anon client) can call it; parses the URA MMYY contract_date text.
-- Applied to production via Supabase MCP on 2026-07-12.
create or replace function public.area_recent_sales(p_type text, p_key text, p_limit int default 40)
returns table(kind text, title text, subtitle text, price numeric, event_date date)
language sql stable security definer set search_path = public
as $$
  select kind, title, subtitle, price, event_date from (
    select 'hdb'::text as kind,
      initcap(lower(t.block || ' ' || t.street_name)) as title,
      t.flat_type || ' · ' || t.storey_range as subtitle,
      t.resale_price as price, to_date(t.month || '-01','YYYY-MM-DD') as event_date
    from sg_hdb_transactions t
    where p_type = 'town' and upper(t.town) = upper(p_key)
    union all
    select 'private'::text,
      initcap(lower(t.project)),
      t.property_type || ' · ' || coalesce(nullif(t.floor_range,''),'floor n/a') || ' · ' || round(t.area_sqm) || ' sqm',
      t.price, to_date(lpad(t.contract_date,4,'0'),'MMYY')
    from sg_private_transactions t
    where p_type = 'district' and upper(t.district) = upper(p_key) and t.contract_date ~ '^[0-9]{3,4}$'
  ) u
  order by event_date desc, price desc
  limit greatest(1, least(p_limit, 100))
$$;
grant execute on function public.area_recent_sales(text,text,int) to anon, authenticated;
