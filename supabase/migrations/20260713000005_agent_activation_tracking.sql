-- Lifecycle ACTIVATION flow tracking: which onboarding email a newly-claimed
-- agent last received. The agent-activation cron advances the step; stops when
-- the profile is complete or step 4 is reached. Sends go via Resend (same path
-- as digest/outreach); every email carries a signed unsubscribe.
alter table public.sg_agents
  add column if not exists activation_step smallint not null default 0,
  add column if not exists activation_last_sent_at timestamptz;
