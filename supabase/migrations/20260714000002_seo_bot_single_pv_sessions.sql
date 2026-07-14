-- SEO bot classifier, final form. The stealth crawler carries a session_id but
-- does exactly 1 pageview per session, so flag rotating-UA + no-referrer + no-utm
-- rows that are sessionless OR in a single-pageview session. A real human who
-- browses >=2 pages (or arrives with a referrer, or on mobile) is never caught.
-- Backfilled with flag_stealth_bot_views(400): 276 -> ~9,454 bots flagged.
create or replace function public.flag_stealth_bot_views(p_days integer default 3)
returns integer language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare n integer;
begin
  with singles as (
    select session_id from page_views
    where host = 'fair-comparisons.com' and session_id is not null
      and created_at > now() - make_interval(days => p_days)
    group by session_id having count(*) = 1
  )
  update page_views pv set is_bot = true
  where not pv.is_bot
    and pv.created_at > now() - make_interval(days => p_days)
    and pv.host = 'fair-comparisons.com'
    and coalesce(pv.referrer,'') = ''
    and pv.utm_source is null
    and pv.user_agent ~ '^Mozilla/5\.0 \((Windows NT 10\.0; Win64; x64|Macintosh; Intel Mac OS X 10_15_7)\) AppleWebKit/537\.36 \(KHTML, like Gecko\) Chrome/1\d\d\.0\.0\.0 Safari/537\.36$'
    and (pv.session_id is null or pv.session_id in (select session_id from singles));
  get diagnostics n = row_count;
  return n;
end;
$function$;
