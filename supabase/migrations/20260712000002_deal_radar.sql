-- Deal Radar: an agent's saved farm areas + a daily prospecting feed built
-- entirely from real transaction rows we already hold (no synthesized data).
-- Applied to production via Supabase MCP on 2026-07-12.
create table if not exists public.sg_agent_farm_areas (
  id uuid primary key default gen_random_uuid(),
  agent_cea_no text not null references public.sg_agents(cea_registration) on delete cascade,
  area_type text not null check (area_type in ('district','town','project')),
  area_key text not null,
  created_at timestamptz not null default now(),
  unique (agent_cea_no, area_type, area_key)
);
create index if not exists sg_agent_farm_areas_cea_idx on public.sg_agent_farm_areas (agent_cea_no);
-- Service-role only: agent session is server-side, all writes via supabaseAdmin.
alter table public.sg_agent_farm_areas enable row level security;
revoke all on public.sg_agent_farm_areas from anon, authenticated;

-- deal_radar: unified, newest-first, per-source-interleaved prospecting feed
-- for one agent's saved areas. Every returned row is a verbatim transaction
-- row, only formatted, so it can always be re-selected to its source.
-- Private contract_date is URA MMYY text ("1025" = Oct 2025); parsed defensively.
-- mop_hdb = HDB units resold 55-60 months ago, whose owners are now reaching
-- their 5-year MOP window (real transaction, honest "reaching MOP" framing).
create or replace function public.deal_radar(p_cea text, p_window_days int default 180, p_limit int default 60)
returns table (source text, title text, subtitle text, price numeric, event_date date, area_key text, note text)
language sql stable security definer set search_path = public
as $$
  with areas as (
    select area_type, area_key from sg_agent_farm_areas where agent_cea_no = p_cea
  ),
  fresh_priv as (
    select 'fresh_private'::text as source,
      initcap(lower(t.project)) as title,
      t.property_type || ' · ' || coalesce(nullif(t.floor_range,''),'floor n/a') || ' · ' || round(t.area_sqm) || ' sqm' as subtitle,
      t.price, to_date(lpad(t.contract_date,4,'0'),'MMYY') as event_date, t.district as area_key,
      initcap(lower(coalesce(nullif(t.type_of_sale,''),'Sale'))) as note
    from sg_private_transactions t
    join areas a on a.area_type='district' and upper(a.area_key)=upper(t.district)
    where t.contract_date ~ '^[0-9]{3,4}$' and to_date(lpad(t.contract_date,4,'0'),'MMYY') >= (current_date - p_window_days)
  ),
  fresh_hdb as (
    select 'fresh_hdb'::text as source,
      initcap(lower(t.block || ' ' || t.street_name)) as title,
      t.flat_type || ' · ' || t.storey_range || ' · ' || round(t.floor_area_sqm) || ' sqm' as subtitle,
      t.resale_price as price, to_date(t.month || '-01','YYYY-MM-DD') as event_date, t.town as area_key, 'Resale'::text as note
    from sg_hdb_transactions t
    join areas a on a.area_type='town' and upper(a.area_key)=upper(t.town)
    where to_date(t.month || '-01','YYYY-MM-DD') >= (current_date - p_window_days)
  ),
  mop_hdb as (
    select 'mop_hdb'::text as source,
      initcap(lower(t.block || ' ' || t.street_name)) as title,
      t.flat_type || ' · ' || t.storey_range as subtitle,
      t.resale_price as price, to_date(t.month || '-01','YYYY-MM-DD') as event_date, t.town as area_key,
      'Bought ' || to_char(to_date(t.month || '-01','YYYY-MM-DD'),'Mon YYYY') || ', reaching 5-year MOP' as note
    from sg_hdb_transactions t
    join areas a on a.area_type='town' and upper(a.area_key)=upper(t.town)
    where to_date(t.month || '-01','YYYY-MM-DD') between (current_date - interval '60 months') and (current_date - interval '55 months')
  ),
  ranked as (
    select u.*, row_number() over (partition by u.source order by u.event_date desc, u.price desc nulls last) as rn
    from (select * from fresh_priv union all select * from fresh_hdb union all select * from mop_hdb) u
  )
  select source, title, subtitle, price, event_date, area_key, note
  from ranked
  order by rn asc, (source='mop_hdb') desc, event_date desc
  limit p_limit
$$;
revoke all on function public.deal_radar(text,int,int) from anon, authenticated;
