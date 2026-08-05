-- Broadcasts get a second, quieter link.
--
-- A launch banner has two jobs that pull in opposite directions: send the agent
-- straight into the thing (one tap, no reading), and let the agent who wants to
-- understand it first go read. One CTA cannot do both, and collapsing them
-- costs whichever half of the cohort you did not pick. cta_* stays the action;
-- link_* is the write-up.

alter table public.sg_broadcasts add column if not exists link_label text;
alter table public.sg_broadcasts add column if not exists link_href  text;
