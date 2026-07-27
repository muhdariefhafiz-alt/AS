# Paperwork tool spec: rental-TA-first document system-of-record

Date: 2026-07-27
Status: proposal for build (Phase 1 buildable now)
Author context: follows the PropKaki dossier (docs/strategy/propkaki-competitive-dossier-2026-07.md). The subscription-value analysis concluded Paperwork is the highest-frequency, most lock-in-capable, most on-thesis agent tool, and the rental tenancy agreement is the wedge (rentals are ~63% of SG agent activity in our own data).

## 1. Thesis and the one mechanic that matters

PropKaki shipped Paperwork as a **stateless fill-and-download wrapper**: no pre-fill from real data, no stored history, no signing. That is a novelty, not a subscription. It fails the retention test because the agent generates a PDF once and owes the tool nothing afterward.

Our version wins on one mechanic: **turn documents into the agent's system of record.** Three compounding layers, each raising switching cost:

1. **Pre-fill** parties, property and agent details from data we already hold, so ours starts filled where theirs starts blank.
2. **Store** every document the agent has produced, searchable, versioned. Leaving now means abandoning their paper trail.
3. **Sign + track** (draft -> sent -> signed -> countersigned), so signatures and status become state the agent cannot recreate elsewhere.

Frequency is the reason this is worth building at all: an agent touches a tenancy agreement, an OTP, or a CEA prescribed form on **every deal**. Nothing else in the Operate suite is close on frequency, and the lock-in ladder above is what converts that frequency into renewals.

Guardrail on the framing (do not lose this): the paid gate is the tool and its quotas. It never touches AgentScore, ranking, search order or lead allocation. Same rule as Building Pages.

## 2. Scope and phasing

Deliberately sequenced so each phase ships standalone value and the lock-in deepens.

- **Phase 1 (build now): Rental TA generator + store.** One document type (residential tenancy agreement), our own template, pre-filled where we can, generated to PDF, stored per agent, downloadable and shareable as a link. This alone beats PropKaki (they do not pre-fill or store) and hits the 63%-of-activity workflow.
- **Phase 2: CEA prescribed forms + OTP.** Add the fixed government AcroForm PDFs (Estate Agency Agreements, the CEA forms an agent must use) and a standard OTP/tenancy-offer letter, filled via pdf-lib. Broadens from "every rental" to "every deal."
- **Phase 3: First-party e-sign (the lock-in).** Tokenised signing links, captured signature, audit trail, status tracking. This is where the system-of-record becomes the thing an agent will not leave. Gated behind a legal-positioning review (see section 9).

Each phase is independently shippable; Phase 1 does not depend on 2 or 3.

## 3. Data model

New tables (mirror the sg_building_pages conventions: RLS on, service-role only, agent_id FK, status enum, timestamps).

```
sg_documents
  id                uuid pk
  agent_id          bigint not null            -- owner (sg_agents.id)
  doc_type          text not null              -- 'tenancy_agreement' | 'cea_form_x' | 'otp' ...
  template_key      text not null              -- versioned template id, e.g. 'tenancy_residential_v1'
  title             text not null              -- agent-facing label, e.g. "TA - 12 Bedok Rise #05-01"
  status            text not null default 'draft'  -- draft | finalised | sent | signed | void
  fields            jsonb not null default '{}'     -- all filled values (see field schema below)
  linked_lead_id    bigint null                -- provenance of pre-fill (sg_leads.id), nullable
  linked_viewing_id bigint null                -- provenance (sg_viewings.id), nullable
  pdf_path          text null                  -- Supabase Storage object path of the rendered PDF
  created_at        timestamptz default now()
  updated_at        timestamptz default now()

sg_document_signers            -- Phase 3
  id             uuid pk
  document_id    uuid not null
  role           text not null    -- 'landlord' | 'tenant' | 'salesperson'
  name           text not null
  email          text null
  sign_token     text unique      -- tokenised signing link
  signed_at      timestamptz null
  signature_blob text null        -- stored signature image path or typed-name record
  ip_hash        text null        -- audit
  user_agent     text null        -- audit

sg_document_events             -- immutable audit trail (Phase 3, also useful Phase 1 for "sent")
  id            uuid pk
  document_id   uuid not null
  event         text not null    -- created | edited | finalised | sent | viewed | signed | voided
  actor         text not null    -- agent email or signer role
  metadata      jsonb
  created_at    timestamptz default now()
```

Template versioning is non-negotiable: `template_key` pins the exact clause set a document was generated from, so a later template revision never silently changes an already-issued agreement. Store the template definitions in code (versioned files), not the DB.

Storage: reuse Supabase Storage. New private bucket `agent-documents` (the photos bucket `agent-photos` is public; documents must be private, served only via signed URLs to the owning agent and via sign_token to signers). PDFs are never world-readable.

## 4. Pre-fill map (honest about what is real)

Verified against the live schema. Three blocks, three honesty levels.

**Agent block (always auto):** from `sg_agents` for the signed-in agent.
| TA field | Source column |
|---|---|
| Salesperson name | sg_agents.name / marketing_name |
| CEA registration no. | sg_agents.cea_registration |
| Estate agency | sg_agents.agency_name |
| Salesperson contact | sg_agents.whatsapp, claimed_email |

**Property block (auto when linked, else manual):** when the agent starts a document from a lead or viewing, pre-fill from it; otherwise typed.
| TA field | Source |
|---|---|
| Property address | sg_leads.address_line, postal_code / sg_viewings.property_label |
| Postal / district / town | sg_leads.postal_code, district_code, town |
| Property type / bedrooms | sg_leads.property_type, bedrooms, flat_type |
| Project (for condos) | sg_projects.name, street, district |
| Handover / keys date | sg_leads.keys_date |

**Parties block (partial auto):**
| TA field | Source |
|---|---|
| Tenant name + contact | sg_viewings.attendee_name/attendee_contact (the viewer is often the prospective tenant), or sg_contacts.full_name/phone/email/whatsapp, or typed |
| Landlord name + contact | usually the owner; not reliably in our DB in the seller-funnel era -> typed in v1 |

**Commercial terms (manual in v1):** rent amount, payment day, deposit months, term start/end, diplomatic/minor-repair clause threshold, inventory -> typed. We do not hold these today.

Honest framing for the UI and for the pitch: the **agent block is fully auto, the property block auto-fills whenever the document is started from an existing lead or viewing, and the rest is typed once and then reused.** Pre-fill coverage grows automatically as the unified inbox / sg_contacts CRM fills. Do not claim "auto-generated agreements"; claim "starts filled with everything we already know, remembers the rest."

## 5. Generation approach

- Add **pdf-lib** (pure JS, serverless-safe, no headless Chrome). For our own templates (tenancy agreement, OTP), lay out with pdf-lib drawing or fill an AcroForm template PDF. For CEA prescribed forms (Phase 2), fill the official AcroForm fields so the government form is used unaltered.
- Do NOT add puppeteer/headless-chrome (heavy, cold-start and memory issues on Vercel Pro; our maxDuration cap is ~340s and these blow build/runtime budgets).
- **Draft watermark**: any PDF whose document.status is draft/finalised-but-unsigned renders a light "DRAFT - not executed" watermark until all signers have signed. Removes the risk of an unsigned template circulating as if executed.
- Render on demand from `fields` + `template_key`; cache the rendered object in Storage at `pdf_path`. Re-render on edit.

## 6. E-sign and the system-of-record (Phase 3)

Lightweight first-party e-sign, not DocuSign (cost and overkill for v1; revisit if enterprise agencies demand it):

- Agent finalises -> generates a `sign_token` per signer -> shares the signing link (wa.me / email, reusing our send infra).
- Signer opens the link, reviews the PDF, signs (typed name + drawn signature captured to `signature_blob`), we stamp `signed_at`, `ip_hash`, `user_agent` into sg_document_signers and append a sg_document_events row.
- When all signers have signed, the watermark drops and the executed PDF is sealed (no further edits; a new version requires voiding and reissuing).
- The **audit trail** (who signed, when, from where) is the defensibility artifact and the retention hook.

This is the layer that makes the tool sticky. It is also the layer with the most legal nuance (section 9), so it ships last and behind a positioning review.

## 7. Tier gating and the claim / renewal hook

Mirror BUILDING_PAGE_QUOTA. Documents per rolling month:

```
DOCUMENT_QUOTA: { free: 1, verified: 5, professional: 20, elite: unlimited }
```

- **Claim hook:** an unclaimed agent who lands on the tool can generate 1 document but must **claim their profile** to save, store or send it (attach utility to claiming, exactly the dossier's counter-move: "to unlock unlimited Paperwork forms, claim it"). This converts the tool into a claim funnel.
- **Renewal hook:** the stored document history and any pending signatures live behind the subscription. Downgrade keeps read access to past documents (never hold their records hostage) but pauses new generation beyond the free quota and pauses e-sign sending. Honest and non-punitive, consistent with the billing work already shipped.
- Server-side gate in the API route (like inbox-quota / building-pages), never client-only.

## 8. UI

New **DocumentsPanel** in the dashboard Grow (or a new "Paperwork") tab, structurally cloning BuildingPagesPanel:
- Empty state: "Draw up a tenancy agreement in two minutes. Starts filled with your details."
- New-document flow: pick type -> (optional) link a lead/viewing to pre-fill -> a single guided form (agent block pre-filled and collapsed, property block pre-filled when linked, parties + terms typed) -> preview PDF -> save/finalise -> (Phase 3) send for signing.
- Document list: title, type, status chip (draft/sent/signed), updated date, download, resend, void.
- Built to the interactive/animated standard (fc-scene framing, staged reveal), same as the other Grow panels.

## 9. Regulatory guardrails and PDPA (must not relax)

- **We are administrative SaaS, not estate agency work and not legal advice.** The tool fills templates and standard forms; it never advises on terms, never recommends clauses as legally optimal, never holds client money. A persistent disclaimer: "This generates a standard document for your review. It is not legal advice. Have parties seek independent advice for non-standard terms."
- **CEA prescribed forms must be used unaltered.** We fill the official AcroForm fields; we never change the substance or wording of a prescribed form. AML/CFT CDD: we may provide the CDD form for the agent to complete; we do not perform CDD.
- **E-sign positioning (the one to get right before Phase 3):** Singapore's Electronic Transactions Act excludes certain instruments from its e-signature presumption, and dispositions of interests in immovable property sit in a grey zone that plausibly touches leases. E-signed tenancy agreements are widely used and generally enforceable **by the parties' agreement under ordinary contract law**, but do not lean on an ETA statutory presumption. Practical consequence for the spec: (a) position the tool as facilitating signing with a robust audit trail, not as certifying legal validity; (b) get a one-time legal review of the signing-flow wording before Phase 3 launch; (c) Phases 1-2 (generate + store + share for offline signing) carry none of this risk and can ship first.
- **PDPA:** stored documents contain party PII. We act as a data intermediary for the agent. Requirements: purpose limitation (documents used only to render/store/sign), the agent is the controller, security (private bucket + signed URLs only), a retention policy (auto-purge drafts after N months; let agents delete), and consent capture in the flow. **Minimise NRIC**: SG tenancy agreements often carry NRIC/passport; PDPC's NRIC rules are strict. v1 should avoid storing full NRIC where the template allows (collect only what the document requires, mask in the stored `fields` where possible), and never index or reuse NRIC.
- No Wft-style exposure (that is the NL constraint); the SG line is CEA licensing, which does not bite SaaS that neither performs agency work nor holds money.

## 10. Instrumentation

Funnel events (sg_funnel_events, same pattern as the rest): `paperwork_view`, `paperwork_started` (with doc_type), `paperwork_generated`, `paperwork_sent`, `paperwork_signed`. These give the retention read (documents per agent per month) and the claim-conversion read (unclaimed -> claim on the save gate). Exclude sandbox as we now do elsewhere.

## 11. Build plan (Phase 1)

1. Migration: sg_documents (+ sg_document_events), RLS on/service-only, `agent-documents` private bucket.
2. lib/documents: DOCUMENT_QUOTA, doc_type registry, tenancy template (tenancy_residential_v1) field schema + pdf-lib renderer, draft watermark.
3. Pre-fill resolver: given agent + optional lead/viewing id, build the initial `fields` from the verified column map (section 4).
4. API routes (agent-session gated, quota enforced server-side): create/list/get/update/finalise/delete + a signed-download route.
5. DocumentsPanel + dashboard tab wiring, to the animated standard.
6. Instrumentation + claim gate on save.
7. Verify (tsc/lint/browser, fake sandbox agent E2E), adversarial review, deploy, cleanup.

## 12. Open questions / owner decisions

- Tool placement: new "Paperwork" tab vs. inside Grow? (Recommend its own tab given frequency.)
- Free-tier document quota: 1/month (claim-gated save) as proposed, or 0 with claim required to generate at all? (Recommend 1 to seed the habit.)
- Phase 3 e-sign: first-party (proposed) vs. integrate a provider once agencies ask. Needs the legal-positioning review either way.
- Which CEA forms to prioritise in Phase 2 (the estate-agency-agreement set first, since that is signed at mandate, before any TA).
- NRIC handling: confirm the v1 tenancy template can omit/mask full NRIC.
```
