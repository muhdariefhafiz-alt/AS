-- Provider-neutral account email for the calendar connection (Google OR
-- Microsoft; one connection per agent, provider column says which).
alter table public.sg_agent_calendar
  add column if not exists account_email text;
update public.sg_agent_calendar set account_email = google_email where account_email is null;
