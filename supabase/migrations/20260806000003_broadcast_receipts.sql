-- Announcement receipts: who actually saw an announcement, and what they did.
--
-- The old model recorded one thing, a dismissal, which is the least useful bit:
-- it told us an agent made the banner go away, never whether they read it, and
-- it destroyed the announcement for that agent forever. "Everyone has seen it"
-- was not a question the data could answer, so it was answered by hoping.
--
-- A receipt is per agent per announcement and records the whole arc:
--   first_seen_at / seen_count -> did it ever reach their screen, how often
--   acknowledged_at            -> they closed it deliberately (read, not lost)
--   clicked_at                 -> they went and used the thing
-- Coverage is then a fact the operator can read, and the agents who have not
-- seen it are a list you can act on rather than a blind spot.

create table if not exists public.sg_broadcast_receipts (
  broadcast_id    bigint not null references public.sg_broadcasts(id) on delete cascade,
  agent_id        bigint not null,
  first_seen_at   timestamptz not null default now(),
  last_seen_at    timestamptz not null default now(),
  seen_count      integer not null default 1,
  acknowledged_at timestamptz,
  clicked_at      timestamptz,
  primary key (broadcast_id, agent_id)
);

create index if not exists sg_broadcast_receipts_agent_idx on public.sg_broadcast_receipts (agent_id);

-- RLS on, no policy: service-role only, same as the rest of the operator spine.
alter table public.sg_broadcast_receipts enable row level security;

-- The dismissals table is superseded: acknowledged_at carries the same signal
-- plus the context that made it worth recording. Verified empty (0 rows) before
-- dropping, so nothing is lost.
drop table if exists public.sg_broadcast_dismissals;
