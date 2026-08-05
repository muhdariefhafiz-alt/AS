-- Atomic receipt write, and a coverage number that means what it says.
--
-- Two problems with the first cut, both of which quietly corrupt the one thing
-- receipts exist to provide (an honest "who has seen this?"):
--
-- 1. WRITE RACE. The route did select-then-insert. The announcement's own
--    primary path fires two receipts within milliseconds (the impression on
--    mount, then the click), and an agent with two tabs fires two more. Both
--    read "no receipt", both insert, one loses on the primary key, and the lost
--    one is an acknowledgement. Rebuilt as a single INSERT ... ON CONFLICT DO
--    UPDATE so concurrent writes merge instead of racing, with seen_count
--    incremented in the statement rather than in JavaScript.
--
-- 2. COHORT. Coverage counted every agent row matching the audience, but an
--    in-app announcement can only ever reach an agent who can sign in, and only
--    a CLAIMED agent can. Counting the other 38,000 made every announcement
--    read as 0%, and offered a "not reached" follow-up list of people who have
--    no account. The cohort is now claimed, non-sandbox agents matching the
--    audience, which is the set that can actually receive it.
--
-- Coverage also now returns unseen_count separately from the (capped) unseen
-- list, because a UI that prints the length of a truncated list tells the
-- operator the gap is 25 no matter how big it really is.

create or replace function public.sg_record_broadcast_receipt(
  p_broadcast_id bigint,
  p_agent_id     bigint,
  p_action       text
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into sg_broadcast_receipts as r
    (broadcast_id, agent_id, first_seen_at, last_seen_at, seen_count, acknowledged_at, clicked_at)
  values (
    p_broadcast_id,
    p_agent_id,
    now(), now(), 1,
    case when p_action = 'seen' then null else now() end,
    case when p_action = 'click' then now() else null end
  )
  on conflict (broadcast_id, agent_id) do update set
    last_seen_at    = now(),
    seen_count      = r.seen_count + case when p_action = 'seen' then 1 else 0 end,
    -- First engagement wins: the interesting timestamp is when they acted, not
    -- the last time they reopened the archive.
    acknowledged_at = case when p_action <> 'seen' then coalesce(r.acknowledged_at, now()) else r.acknowledged_at end,
    clicked_at      = case when p_action = 'click'  then coalesce(r.clicked_at, now())      else r.clicked_at end;
$$;

revoke all on function public.sg_record_broadcast_receipt(bigint, bigint, text) from public, anon, authenticated;
grant execute on function public.sg_record_broadcast_receipt(bigint, bigint, text) to service_role;

create or replace function public.sg_broadcast_coverage()
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
with b as (
  select id, title, active, created_at, audience
  from sg_broadcasts
  order by created_at desc
  limit 20
),
-- Only claimed, non-sandbox agents can receive an in-app announcement, so they
-- are the denominator. Anyone else in the audience filter cannot sign in.
cohort as (
  select id, name, claimed_email, coalesce(subscription_tier, 'free') as tier, primary_area
  from sg_agents
  where claimed = true and is_sandbox = false
),
pairs as (
  select b.id as broadcast_id, c.id as agent_id, c.name as agent_name, c.claimed_email
  from b
  join cohort c
    on (b.audience->'claimed' is null or (b.audience->>'claimed')::boolean = true)
   and (b.audience->'tier' is null
        or jsonb_array_length(b.audience->'tier') = 0
        or c.tier in (select jsonb_array_elements_text(b.audience->'tier')))
   and (b.audience->'area' is null
        or jsonb_array_length(b.audience->'area') = 0
        or c.primary_area in (select jsonb_array_elements_text(b.audience->'area')))
),
joined as (
  select p.*, r.first_seen_at, r.acknowledged_at, r.clicked_at
  from pairs p
  left join sg_broadcast_receipts r
    on r.broadcast_id = p.broadcast_id and r.agent_id = p.agent_id
),
agg as (
  select
    broadcast_id,
    count(*)::int as eligible,
    count(*) filter (where first_seen_at is not null)::int as seen,
    count(*) filter (where acknowledged_at is not null)::int as acked,
    count(*) filter (where clicked_at is not null)::int as clicked,
    count(*) filter (where first_seen_at is null)::int as unseen_count,
    coalesce((
      select jsonb_agg(jsonb_build_object('name', u.agent_name, 'email', u.claimed_email))
      from (
        select agent_name, claimed_email from joined j2
        where j2.broadcast_id = joined.broadcast_id and j2.first_seen_at is null
        order by agent_name limit 25
      ) u
    ), '[]'::jsonb) as unseen
  from joined
  group by broadcast_id
)
select coalesce(jsonb_agg(jsonb_build_object(
    'id', b.id,
    'eligible', coalesce(agg.eligible, 0),
    'seen', coalesce(agg.seen, 0),
    'acked', coalesce(agg.acked, 0),
    'clicked', coalesce(agg.clicked, 0),
    'unseen_count', coalesce(agg.unseen_count, 0),
    'unseen', coalesce(agg.unseen, '[]'::jsonb)
  ) order by b.created_at desc), '[]'::jsonb)
from b
left join agg on agg.broadcast_id = b.id;
$$;

revoke all on function public.sg_broadcast_coverage() from public, anon, authenticated;
grant execute on function public.sg_broadcast_coverage() to service_role;

notify pgrst, 'reload schema';
