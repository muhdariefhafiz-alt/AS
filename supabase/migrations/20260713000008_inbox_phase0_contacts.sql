-- Unified Inbox Phase 0: the contact identity spine + the reply signal.
--
-- sg_contacts is the person-level record that later phases hang a cross-channel
-- relationship timeline on. Today an "inbox item" is a per-form lead row and
-- inbound events are orphaned; this table is the missing spine. PII, so it is
-- service-role only (RLS enabled, no policy), exactly like sg_leads.

create table if not exists public.sg_contacts (
  id            bigint generated always as identity primary key,
  phone_norm    text,
  email_norm    text,
  whatsapp_norm text,
  full_name     text,
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Identity keys: resolve phone-first, then email. Partial-unique so a null key
-- never collides. A person with the same phone or email is the same contact.
create unique index if not exists sg_contacts_phone_uniq
  on public.sg_contacts (phone_norm) where phone_norm is not null;
create unique index if not exists sg_contacts_email_uniq
  on public.sg_contacts (email_norm) where email_norm is not null;

alter table public.sg_contacts enable row level security;

-- Link every lead to the resolved contact.
alter table public.sg_leads
  add column if not exists contact_id bigint references public.sg_contacts(id);
create index if not exists sg_leads_contact_id_idx on public.sg_leads (contact_id);

-- Reply signal: the Phase-0 North Star ("a lead received a timely first reply")
-- is measured off the first time the agent marks a reply sent on their row.
alter table public.sg_lead_shortlist
  add column if not exists first_reply_at timestamptz;

-- Backfill: resolve existing leads to contacts (phone-first, then email),
-- mirroring app/lib/contacts.ts exactly. Existing-contact key columns are never
-- mutated here, so the partial unique indexes cannot be violated.
do $backfill$
declare
  r   record;
  cid bigint;
  p   text;
  e   text;
  w   text;
begin
  for r in
    select id, phone, whatsapp, email, full_name, created_at
    from public.sg_leads
    order by created_at asc
  loop
    -- last 8 digits (SG local number), preferring phone then whatsapp
    p := nullif(right(regexp_replace(coalesce(nullif(r.phone, ''), r.whatsapp, ''), '\D', '', 'g'), 8), '');
    e := lower(nullif(btrim(r.email), ''));
    w := nullif(regexp_replace(coalesce(r.whatsapp, ''), '\D', '', 'g'), '');
    cid := null;

    if p is not null then
      select id into cid from public.sg_contacts where phone_norm = p limit 1;
    end if;
    if cid is null and e is not null then
      select id into cid from public.sg_contacts where email_norm = e limit 1;
    end if;

    if cid is null then
      insert into public.sg_contacts (phone_norm, email_norm, whatsapp_norm, full_name, first_seen_at, last_seen_at)
      values (p, e, w, r.full_name, r.created_at, r.created_at)
      returning id into cid;
    else
      update public.sg_contacts
        set full_name    = coalesce(full_name, r.full_name),
            last_seen_at  = greatest(last_seen_at, r.created_at),
            updated_at    = now()
        where id = cid;
    end if;

    update public.sg_leads set contact_id = cid where id = r.id;
  end loop;
end
$backfill$;
