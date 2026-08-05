-- Paperwork Phase 2a: document chaining.
--
-- A rental deal is a sequence of documents (letter of intent, then the tenancy
-- agreement). linked_document_id records that a document was started from an
-- earlier one, so the chain is a fact on the row rather than something inferred
-- from field similarity. Additive and nullable: every Phase 1 row stays valid.
--
-- GUARDRAIL unchanged: documents are administrative SaaS and never touch
-- AgentScore, ranking, search order or lead allocation.

alter table public.sg_documents
  add column if not exists linked_document_id uuid null references public.sg_documents(id) on delete set null;

comment on column public.sg_documents.linked_document_id is
  'The document this one was created from (e.g. the LOI a tenancy agreement was chained from).';

create index if not exists sg_documents_linked_idx
  on public.sg_documents (linked_document_id)
  where linked_document_id is not null;
