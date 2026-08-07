-- Make the magic sign-in link actually single-use.
--
-- The login email tells the agent "the link expires in 24 hours and can be used
-- once". Only the first half was true. The token was a stateless HMAC over
-- {email, kind, exp}, so nothing recorded that it had been spent: it kept
-- working for its full 24 hours, and every use minted a fresh 30-DAY session.
--
-- That matters because a magic link travels through channels the agent does not
-- control: a forwarded mail, a shared or agency inbox (common in Singapore
-- agencies), a mail archive or backup, synced browser history, or a support
-- thread the agent pasted it into. Anyone reaching it after the fact got the
-- agent's whole dashboard: seller-lead PII and contact details, the pipeline,
-- documents, and the ability to act as them.
--
-- A promise the code does not keep is worse than no promise, because the agent
-- reasonably treats the link as spent and stops being careful with it.
--
-- One row per redeemed link. jti is the primary key, so the second redemption
-- loses the insert race rather than needing a read-then-write check.

create table if not exists public.sg_magic_link_redemptions (
  jti         uuid primary key,
  email       text not null,
  redeemed_at timestamptz not null default now()
);

create index if not exists sg_magic_link_redemptions_email_idx
  on public.sg_magic_link_redemptions (email, redeemed_at desc);

-- RLS on, no policy: service-role only, reached solely from the login route.
-- Consistent with the rest of the agent spine.
alter table public.sg_magic_link_redemptions enable row level security;

notify pgrst, 'reload schema';
