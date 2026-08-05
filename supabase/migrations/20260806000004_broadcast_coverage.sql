-- Announcement coverage: for each announcement, how much of its cohort has
-- actually seen it, and exactly who has not.
--
-- The point of the receipts table is to turn "did everyone see it?" from a hope
-- into a number, and a number nobody can act on is only half the job. So this
-- also returns the names still missing, capped at a readable 25, which is the
-- operator's follow-up list: those are the agents to reach by email instead.
--
-- Sandbox agents are excluded from every count. A test account that has seen an
-- announcement must never flatter the coverage number.

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
  limit 50
),
-- Every (announcement, eligible agent) pair, by evaluating the audience filter
-- in SQL exactly as matchesAudience() evaluates it in JS.
pairs as (
  select b.id as broadcast_id, a.id as agent_id, a.name as agent_name, a.claimed_email
  from b
  join sg_agents a
    on a.is_sandbox = false
   and (b.audience->'claimed' is null
        or a.claimed = (b.audience->>'claimed')::boolean)
   and (b.audience->'tier' is null
        or coalesce(a.subscription_tier, 'free') in (
             select jsonb_array_elements_text(b.audience->'tier')))
   and (b.audience->'area' is null
        or a.primary_area in (
             select jsonb_array_elements_text(b.audience->'area')))
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
    coalesce(
      jsonb_agg(jsonb_build_object('name', agent_name, 'email', claimed_email))
        filter (where first_seen_at is null),
      '[]'::jsonb
    ) as unseen
  from joined
  group by broadcast_id
)
select coalesce(jsonb_agg(jsonb_build_object(
    'id', b.id,
    'title', b.title,
    'active', b.active,
    'eligible', coalesce(agg.eligible, 0),
    'seen', coalesce(agg.seen, 0),
    'acked', coalesce(agg.acked, 0),
    'clicked', coalesce(agg.clicked, 0),
    'unseen', coalesce(
      (select jsonb_agg(u) from (
         select u from jsonb_array_elements(coalesce(agg.unseen, '[]'::jsonb)) u limit 25
       ) t),
      '[]'::jsonb)
  ) order by b.created_at desc), '[]'::jsonb)
from b
left join agg on agg.broadcast_id = b.id;
$$;

revoke all on function public.sg_broadcast_coverage() from public, anon, authenticated;
grant execute on function public.sg_broadcast_coverage() to service_role;

notify pgrst, 'reload schema';
