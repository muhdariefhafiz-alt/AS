# PRD: Paperwork Phase 2 (LOI, CEA prescribed forms, e-sign)

Date: 2026-08-05. Status: rev 2, post adversarial review (3-lens: legal accuracy, codebase feasibility, product craft; 22 findings applied). Builds on the shipped Phase 1 tenancy agreement generator (34eda3f, live since 27 Jul) and the Phase 1 spec (docs/strategy/paperwork-tool-spec-2026-07.md). Research basis: 5-agent primary-source sweep of 2026-08-05 (CEA/SSO/HDB/case law/competitors); citations inline and in section 13.

---

## 1. Problem statement

The agent office is built but empty: 5 claimed agents, 0 paying, 0 documents ever generated. An honest read of that zero: Phase 1 was never announced. Ops records show zero broadcasts since it shipped on 27 Jul and zero paperwork funnel events of any kind, so the datapoint measures discoverability, not demand. Distribution of the tool is therefore in scope for this PRD, not assumed away.

The binding constraint on the business is claims and habit, not features. Among the remaining build candidates, paperwork is the only one that maps to a weekly chore (roughly 130k rental contracts vs roughly 41k resales in 2025; rental paperwork is the recurring workload), which makes it the strongest candidate for a claim hook and retention loop we can attach to the dashboard. This PRD treats that as a hypothesis to be tested with a hard checkpoint (section 11), not as an article of faith.

Meanwhile the competitive window moved. PropKaki's Paperwork Assistant expanded from 8 to 31 documents between late July and 5 Aug 2026, is explicitly free with no sign-up, and covers CEA Forms 1-8, the DPTWG TA/OTP/S&P templates, 13 CEA checklists and the CDD form set. Template ACCESS is now a commodity. Two things remain unclaimed in the whole market:

1. **The rental LOI**: the single highest-frequency artifact, with no official CEA/DPTWG template and no PropKaki coverage.
2. **E-sign**: no independent agent tool in SG offers send-for-signature (only agency-internal systems like ERA's, since Dec 2020). E-sign is what converts a form-filler into a system of record, which is the lock-in PropKaki explicitly lacks ("no e-sign, so no workflow lock-in protecting the position", our July dossier, still true on 5 Aug). Demand is not hypothetical: of three executed real-world LOIs reviewed for this PRD (2021-2022 deals), two carry DocuSign envelope IDs. Agents already run this exact document through paid external e-sign; 2c moves that spend and that record into our tool.

Phase 2 therefore is not "more templates". It is: own the LOI-to-TA-to-EAA chain, make the prescribed-form moment effortless and compliant, close the deal with first-party e-sign, and actually put the tool in front of agents.

## 2. Strategic context (why this, why now)

- **Claim North Star.** The 30-day goal is activated claims (target 25-50). Paperwork is the "claim to get work done, not to be compared" funnel from the PropKaki dossier counter-strategy. Every document feature must feed claim conversion and first-week activation, and this PRD builds the activation path rather than assuming it.
- **Positioning shift forced by PropKaki.** With coverage free elsewhere, our differentiation is: prefill from the claimed profile (name, CEA reg, agency, contact), the LOI-to-TA-to-EAA chain that reuses deal data, stored history with status, and e-sign with an audit trail. We sell workflow and record, not access. Expected competitor response: PropKaki can ship a free LOI template within days of our launch (they added 23 documents in roughly ten days). The plan survives that because the artifact was never the moat; the chain, the stored record and e-sign are, and none of those work without an account and a profile. The week they ship an LOI, marketing shifts weight from "the only LOI tool" to "the only LOI that becomes a signed TA in the same tool".
- **The honest compliance pitch.** Section 44(1) Estate Agents Act 2010 is the bar: a right or cause of action to recover agreed sums, damages or other relief lies at the suit of the estate agent "if, and only if" an estate agency agreement in the prescribed form was entered into and, if written, properly executed, and the agent was licensed at the time. The bar covers any suit on the engagement, not just commission. PG 1/2011 para 9.1 is CEA's confirming guidance ("right to claim against his client will be affected under section 44"). Not using the form is not an offence (CEA's 2023 blog: "not mandatory, we strongly encourage"), so copy must never invent fine risk for skipping forms. CDD is the genuinely enforced duty, and must also be cited precisely: the 27 May 2025 case (S$15,000 + 9-month suspension) involved breaches including forgery, not CDD alone; pure-CDD enforcement in the 1 Jul 2025 censures drew S$5,000 and S$2,000 penalties; and the penalty regime that commenced 1 Jul 2025 allows up to S$100,000 per breach for a salesperson (S$200,000 for an agency) before a Disciplinary Committee. That last fact is the truthful motivator for the CDD fast-follow.

## 3. Goals

1. Make Paperwork the first-week activation moment for every new claim: generate a real document within 7 days of claiming. Built, not hoped for: first-session prompt + announcement are committed work items (2a).
2. Own the LOI chain: the only LOI in Singapore that is prefilled from a verified profile, becomes a TA in one tap, and (from 2c) gets signed in the same tool.
3. Cover the prescribed EAA moment (Forms 1-8) with built-in compliance guardrails no free PDF can offer.
4. Ship first-party e-sign for LOI, TA and EAA with a defensible audit trail, making us the only independent SG agent tool with send-for-signature.
5. Convert paperwork usage into subscription revenue via e-sign envelope quotas and document history, not via template paywalls.

## 4. Non-goals

- **HDB resale Option to Purchase.** Hard exclusion. It is a serialised, HDB-issued prescribed form (unique serial number, no amendments, obtainable only via the HDB Resale Portal after Intent to Sell). We never generate it or anything resembling it; we show guardrail copy and deep-link to the HDB Resale Portal.
- **Private resale OTP / S&P.** DPTWG standards exist and self-serve is lawful, but lawyers dominate, rental-heavy users rarely need it, and sale documents that operate as deeds/conveyances are the wrong place for our e-sign. Backlog, not Phase 2.
- **Viewing acknowledgment forms and standalone co-broke agreement forms.** No standard exists, prevalence unverified. Not built.
- **Commercial/industrial, overseas, collective-sale, developer-sale agency agreements.** No prescribed form applies (reg 11; see section 6, 2b scope labels); out of scope and labelled as such in the UI.
- **Legal advice.** The tool fills documents for the agent's review. Persistent disclaimer stays on every page (Phase 1 footer retained).
- **Reproducing CEA website assets or SSO image files.** See section 10; we transcribe legislative content, we never embed CEA's typeset PDFs, the AML annex layouts, or SSO's scanned images.
- **Ranking/score influence.** Documents never touch AgentScore, ranking or lead allocation (Phase 1 guarantee, unchanged).

## 5. Scope: the document set

| Document | Decision | Basis |
|---|---|---|
| Rental LOI (residential) | **Build, flagship (2a)** | Highest frequency; no official template; unclaimed by PropKaki today |
| CEA EAA Forms 7/8, then 1-6 | **Build (2b)**, transcribed from the Third Schedule | s 44 hook; PG 1/2011 guardrails are the differentiator; rental forms first |
| E-sign (LOI, TA, EAA) | **Build (2c)**, behind legal + security review gates | Market-wide gap; the lock-in layer |
| Distribution (announcement, first-session prompt, pre-claim demo) | **Build (2a/2b)** | The 0-docs datapoint is a discoverability failure; committed scope |
| CDD forms (Annex F A1-A4, B; U-forms later) | Fast-follow (2d) | Mandatory duty, real penalty ceiling since 1 Jul 2025; CEA templates are "suggested", we recreate fields |
| Commission invoice (agency-branded, GST toggle) | Fast-follow (2d) | Per-deal, greenfield, no official template |
| Tenancy agreement | Already live (Phase 1) | Gains: LOI prefill chain, e-sign |
| HDB resale OTP | **Never** | Serialised HDB form; guardrail + link out |
| Private OTP / S&P | Backlog | Lawyer-dominated; DPTWG reference exists if ever built |

## 6. Phasing

### Phase 2a: registry refactor + LOI + activation (ship first)

The Phase 1 code has four hardwired points that block ANY second document type (audit of 2026-08-05, all file:line claims re-verified by an independent reviewer):

- PATCH whitelists field keys against TENANCY_FIELD_KEYS regardless of doc_type (app/api/dashboard/documents/[id]/route.ts:48-57): a second type's fields would be silently dropped.
- POST create calls buildPrefill + tenancyTitle unconditionally (app/api/dashboard/documents/route.ts:79-80).
- DocumentsPanel imports TENANCY_SECTIONS directly, hardcodes docType 'tenancy_agreement', the TA header, titleFrom and the IRAS guidance card; there is no type picker (DocumentsPanel.tsx:4,63,147,168-174,278-281).
- renderPdf dispatches on a switch that knows one templateKey (app/lib/documents/build.ts:15-20).

Plus three softer hardwirings found in review: the Paperwork tab renders only when agent.cea_registration is set (app/dashboard/page.tsx:701, currently a blank tab otherwise), list rows show no document type (DocumentsPanel.tsx:254-266), and the Home-tab launcher and empty-state copy are TA-specific (page.tsx:650, DocumentsPanel.tsx:220-227).

**Work item 1: registry as the single dispatch point, split client/server.** Two modules, both keyed by doc_type with a templateKey reverse lookup (renderPdf dispatches on template_key today):

- Client-safe registry: labels, sections (FieldDef/Section lifted into a shared module, group literal widened beyond 'agent'), fieldKeys, guidance note, availability.
- Server registry: prefillFn, contentFn, titleFn, renderMode.

Acceptance check: pdf-lib never enters the client bundle (build.ts's server-only guarantee holds; verify via bundle analysis or an import-boundary lint). PATCH field whitelist, POST prefill/title, and the quota un-void re-check all become registry lookups.

**Work item 2: LOI document type (loi_residential_v1), drawn layout, no render.ts changes.** Field schema grounded in three executed real-world LOIs reviewed 2026-08-05 (two PropNex form LEG-AG-09.03 deals from 2021 and 2022, one OrangeTee & Tie form 141119CLD/AG/AL from 2022; personal details not retained), cross-checked against the published convention guides. The decisive structural finding: the LOI in practice is the AGENT'S instrument, issued on agency letterhead over the salesperson's name and CEA registration, addressed to the landlord, with the agency's commission protection built in. That is our moat made concrete: a generator that does not know the agent, agency and CEA reg cannot produce this document properly, and PropKaki has no accounts. Every convention below ships as an editable field with a hint, never fixed boilerplate (the two agency forms disagree with each other on several conventions):

- Issuer block (prefilled from the claimed profile): salesperson name, CEA reg no, designation, agency name; "Yours faithfully" signature block. Optional "SUBJECT TO CONTRACT" marker (OrangeTee practice, a meaningful non-binding signal).
- Addressee landlord block: name, address, NRIC optional (blank in one executed example; minimisation stance holds: collect only what the agent wants printed, never indexed or reused).
- Tenant name AND separate occupier(s) list with optional IDs (both agency forms distinguish tenant from occupiers; immigration-compliance clause references occupants).
- Property address; monthly rent in figures with optional amount-in-words (OrangeTee style), "inclusive of fixtures, fittings and maintenance" toggle.
- Term: months plus optional odd days (a real deal ran "24 months and 8 days"), commencement date, renewal-option toggle (months, at prevailing market rent mutually agreed).
- Good-faith/booking deposit: amount, payment method (PayNow / bank transfer, optional bank-account details block seen in practice), and a conversion select, because the two forms differ: converts into part of the security deposit (PropNex) OR into part of the first month's advance rental (OrangeTee).
- Security deposit (hint: convention 1 month per year of lease; the executed examples match: 1 month on a 12-month lease, 2 on 24) + advance rental months; payable at TA signing.
- Stamp duty borne-by select (tenant is the norm) with optional computed amount. Computation note: one 2021 agency form still printed the legacy "rent x months / 250" formula; we compute with current IRAS lease-duty rates via the existing stamp-duty calculator (P3), never the legacy formula.
- Cost-allocation clause toggles seen in all examples: utilities (water/electricity/gas), telecom/internet, cable TV, aircon servicing by tenant (quarterly, receipts to landlord), occupants' immigration compliance.
- Handover select: "as is where is" OR tenant requirements list (repeatable lines; real examples: professional cleaning before handover, aircon servicing before handover, itemised furniture/appliance provision, new appliance requests, N-day appliance warranty from commencement).
- Diplomatic/repatriation clause: include toggle, qualifying period (editable; the executed OrangeTee deal used after-first-12-months), trigger (ceases to be employed in Singapore), notice months (default 2), paired pro-rated commission reimbursement to the agency (the real forms reimburse the landlord's commission paid to the agency, amount editable).
- Minor repair cap per item (editable, default S$150-200 range hint) with excess borne by landlord.
- TA signing deadline in days (real examples used 5 and 7; default 7) with "unless extended by mutual agreement in writing".
- Failure mechanics, each editable: landlord fails to sign after terms agreed (refund good-faith deposit immediately; optional clause that landlord still pays the agency's commission), tenant fails to sign (deposit forfeited; optional forfeiture-split-to-agency clause, seen at 50% capped at the service fee), terms cannot be agreed in good faith (deposit returned without deduction, no claims either way).
- Optional no-parallel-negotiation covenant (landlord agrees not to court alternative tenants during the TA window; OrangeTee practice).
- Optional commission clause (landlord pays agency S$X, GST toggle, or the formula convention: 1 month gross rent + GST for a 12-24 month lease, half a month more per additional 12 months).
- Joint-and-several covenant when either side comprises multiple persons.
- Signature blocks: tenant and landlord each with optional witness (name + ID), company-stamp line for corporate lets, and the acknowledgment line ("sign and return the duplicate as acknowledgment of receipt of this LOI and the deposit").

The commission-protection and failure clauses are agency-flavoured legal terms; they ship as editable defaults and are explicitly inside the legal-review scope (section 10.7).

**Work item 3: the chain.** "Create tenancy agreement from this LOI" copies party, property and term fields into a new TA draft (linked_document_id records provenance). First concrete prefill-from-deal-data differentiator; cheap because both are our own field schemas.

**Work item 4: type picker + de-hardwiring UI.** Document-type chooser fed by availableDocTypes() (the API already returns it; the panel ignores it today). Registry-driven per-type guidance note (IRAS e-stamping stays on TA; LOI gets deposit-handling guidance; EAA gets the s 44 note), list-row type chips, launcher and empty-state copy. The cea_registration gate stays but renders an explainer instead of a blank tab.

**Work item 5: first-session activation.** The metric in section 11 needs a mechanism, so it is built here: post-claim landing highlights Paperwork with a one-tap "start an LOI" prefilled prompt; the dashboard Setup/Today hero (D2 completeness engine) gains a paperwork step. Claim-flow entry records a source parameter so paperwork-attracted claims are attributable.

**Work item 6: announcement.** Tell the existing claimed agents the tool exists (broadcast + email), and add Paperwork to the /for-agents/grow marketing surface with an interactive, watermarked pre-claim demo (sample LOI, static data, no generation without claiming). This is the deliberate resolution of the claim-wall trade-off: generation stays behind claiming (the session layer only resolves claimed agents; that wall is strategic, it feeds the North Star), but exposure no longer requires it.

### Phase 2b: CEA prescribed EAA forms (7/8 first, then 1-6)

**Rendering decision (changed from the July spec, corrected in review).** The spec assumed AcroForm filling of official PDFs. Byte-level inspection shows Form 1 is a FLAT PDF with no AcroForm dictionary and no version stamp, and CEA's site terms bar commercial reproduction of site content without written permission. The forms are subsidiary legislation (Third Schedule, Estate Agents (Estate Agency Work) Regulations 2010, S 644/2010), and SSO's Terms of Use cl 13 grants a conditional, revocable licence to reproduce Singapore legislation on electronic platforms. One correction from review: on SSO the Third Schedule is published as scanned page images, not machine-readable text. So:

- **Transcribe the forms from the Third Schedule as published on SSO** (OCR plus manual proofread against the SSO scans and the SSO PDF), rendered with our existing drawn-layout engine. The cl 13 licence covers the transcribed legislative content; SSO ToU cl 6 bars reproducing SSO's graphics and images, so the scans themselves are never embedded, and CEA's typeset PDFs are never used as the rendering source.
- Carry the required notices on generated output and in the tool: Singapore Government copyright acknowledgment with AGC permission statement, and a pointer that the authoritative current version lives on SSO. No suggestion of CEA or AGC endorsement anywhere.
- Ship order: Forms 7 and 8 (exclusive and non-exclusive leasing for a landlord and for a tenant, the rental-mandate pair) first, matching the target user; Forms 1-6 follow.

**Renderer extension (itemized; review flagged this as unbudgeted work).** render.ts's ContentBlock vocabulary needs new primitives for: immutable-clause blocks with inline editable blanks, selected-choice rendering, per-page initial boxes, and the overflow Additional Terms sheet rendered pink-tinted with the print instruction (black ink on pink paper, font no smaller than the prescribed terms).

**Compliance guardrails encoded in product** (the differentiation no static PDF has), with sources attributed precisely:

- Prescribed clauses rendered immutable: agents complete blanks and select choices only; no cancellation or variation of prescribed clauses (PG 1/2011 para 8; the form's own note: "The printed terms prescribed in this form of Agreement cannot be deleted or varied").
- Additional Terms as free text with the non-conflict warning displayed ("must not conflict with, vary or otherwise limit the prescribed terms").
- Amendments initialled and dated (PG 1/2011 para 8). Every-page initialling rendered as signing guidance, attributed to the forms' signing blocks and good practice, not to the practice guideline.
- Essential-field completeness gate: block finalise while property, price/rent, commission, validity dates or party names are empty (Code of Ethics para 9(2)(d) bars procuring signature with essential blanks).
- Prefill only the agent's non-negotiable particulars (name, CEA registration, agency) per the pre-typing rule; negotiable matters are never pre-set.
- Scope labels: residential only. The reg 11 enumerated exclusions (property outside Singapore, commercial/industrial, collective sales, developer sales) plus the reg 11(e) catch-all for work with no prescribed form (example from PG 1/2011's introduction: a tenant appointing an agent to find a replacement tenant), all listed as "no prescribed form applies, a free-form agreement is lawful here".

**Form picker UX:** agents do not think in form numbers. The picker asks two questions (Am I acting for: seller / buyer / landlord / tenant? Exclusive or non-exclusive?) and resolves to the right form with its official name shown.

**Revision monitor:** every generated document stores the stamp "Third Schedule (Forms 1-8) last amended by S 652/2019 wef 01/10/2019" (the Regulations were later amended by S 878/2023 and S 644/2025, but those did not touch regs 10-11 or the forms). Weekly cron watches the SSO amendment annotations and timeline for S 644/2010 plus the CEA agreements-page last-updated stamp (image diffs are useless; annotations are the signal; SSO automated access only within its permitted 3am-7am SGT window). On change: admin alert + affected-documents flag. This kills the silent-breakage risk that PropKaki carries.

**The pitch, verbatim guardrail:** "Under section 44 of the Estate Agents Act, an agent who skips the prescribed agreement cannot sue the client on the engagement, commission included." Cite s 44(1) directly. Never claim agents get fined for skipping the form (they do not).

### Phase 2c: first-party e-sign (LOI, TA, EAA)

**Legal position (verified 2026-08-05, must be re-verified at build start):**

- The ETA 2010 First Schedule still excludes contracts for the disposition of an interest in immovable property from Part 2 of the Act; a lease is such an interest. The 2021 amendment did not touch this. ECOMA 2025 (passed 15 Oct 2025, uncommenced as of 5 Aug 2026) will recognise e-signing only inside government prescribed systems (SLA Digital Conveyancing Portal, HDB Flat Portal) with Sign with Singpass; third-party platforms get no statutory recognition.
- Exclusion means no statutory recognition under Part 2, not invalidity: Singapore courts have upheld electronically concluded property contracts under s 6(d) Civil Law Act since SM Integrated Transware (2005, lease) and Joseph Mathew v Singh Chiranjeev (2010, CA, sale). E-signed TAs are routine market practice and IRAS e-stamping accepts them.
- The secure-electronic-record machinery in Part 3 (ss 17-19: agreed commercially reasonable security procedures and the s 19 presumptions) is not textually excluded by the First Schedule, which names Part 2 only. Our agreed-security-procedure clause targets that Part 3 machinery; whether it applies to tenancy documents is arguable either way, which is exactly why copy never relies on it.
- The prescribed EAA is a service contract, arguably not caught by the immovable-property exclusion at all, and CEA publicly endorsed signing it with Sign with Singpass (CEA blog, 9 Feb 2021). It is the legally easiest document to e-sign; we still confirm CEA's stance on third-party e-sign flows in writing (owner action).
- **Binding copy rule:** product copy states that electronically signed tenancy documents are enforceable under Singapore contract law (upheld by courts since 2005) and accepted for IRAS e-stamping, and that the ETA Part 2 statutory recognition of e-signatures does not apply to tenancy documents. Never claim "ETA-recognised" or "legally certified".

**Flow:**

1. Agent finalises a document, adds signers (role, name, email; roles per doc type: landlord/tenant for LOI and TA, client/salesperson for EAA).
2. Each signer gets a tokenised link (single-use, high-entropy, expiring, HMAC pattern consistent with agent-auth). Delivery: share via the agent (wa.me / copy link) plus optional direct email send.
3. Signer page: renders the PDF, requires an explicit consent-to-transact-electronically checkbox, captures typed name plus drawn signature and an "I intend to sign this document" affirmation, stamps signed_at, IP hash, user agent.
4. When all signers complete: document seals. Final PDF renders with signature blocks, watermark drops, a completion certificate page is appended (every event: created, sent, viewed, consented, signed, completed, with timestamps and the document SHA-256), the SHA-256 of the sealed bytes is stored, and the sealed object is written once to an immutable path. All parties get the copy.
5. The document contract text includes a clause that parties agree the platform's signing procedure is their agreed security procedure (the ETA ss 17-18 hook described above, plus a plain contract-law anchor).

**Non-happy paths (committed spec, not backlog):** a signer can decline (envelope enters declined state, agent notified); envelopes expire (state + notification); resend reissues tokens; a wrong signer email is corrected by voiding that signer, not the whole envelope; email delivery failures surface to the agent (the bounce webhook shipped in the email-health stack is wired to signer mail; silent non-delivery of a signing link is a known failure class on this platform). Signer emails are transactional messages triggered by the agent's request; section 10 records the PDPA/Spam Control basis.

**Integrity pre-work (required before any e-sign ships; done in 2a because it is cheap and correct now):**

- Full status transition matrix on PATCH: fields AND title editable only in draft (title is mutable at any status today, [id]/route.ts:58, and feeds the download filename). Finalised locks content; back-to-draft allowed only before any signer has signed; sent/signed remain server-driven only (correctly unreachable via PATCH today); un-void (void to draft or finalised) is forbidden for any document that ever sealed, so void-and-reissue is the only change path after sealing.
- Watermark rule, stated precisely to preserve Phase 1 behavior (US3 regression bar): watermark renders iff status is draft OR an envelope exists with signers pending. A finalised document with no envelope keeps rendering clean, exactly as Phase 1 wet-ink flow does today.
- Sealed-document serving: once sealed, GET pdf streams the sealed object verbatim; no re-render, no upsert overwrite, no pdf_path re-stamp (today the route re-renders from current fields and overwrites on every GET, pdf/route.ts:37-50). If a working-copy re-render survives at all, it moves behind a distinct route and renders watermarked "COPY, not the executed document".
- DELETE: plain delete is blocked for sealed documents. The retention-conscious path: agent-initiated removal deletes the sealed object AND exports/retains the event log per the retention policy, and storage cleanup enumerates both the working and sealed paths (today delete removes only pdf_path and cascades the events table, [id]/route.ts:94-110, which would destroy the audit trail and orphan sealed PII).
- Impersonation: signer-token creation and all envelope mutations reject impersonated admin sessions (consistent with existing 403s); note the pdf route's render-write is reachable under impersonation today (accepted for Phase 1 surfaces, closed for sealed docs by the serving change above).

**Launch preconditions for 2c (blockers, both external to code):**

1. **Legal review gate** (scope in section 10.7).
2. **Security review gate**: a threat-model pass on the signer-token lifecycle (entropy, replay, expiry, enumeration), verification that sealed-object paths are write-once at the storage-policy level rather than app convention, PDF-substitution-between-view-and-consent analysis, and rate limiting verified live (app/lib/rateLimit.ts falls back to per-instance memory it self-describes as decorative in serverless and fails open on Redis errors; Upstash provisioning is therefore a 2c launch precondition, not an assumption).
3. Ops: Klaviyo Flows created for the signer-invite and completion metrics (sendEmail is a Klaviyo event; a new metric silently sends nothing until a matching Flow exists), or signer mail is routed through a direct sender.

**Explicitly out of v1 e-sign:** Sign with Singpass integration (true Secure Electronic Signatures with statutory presumptions; requires a Singapore UEN, Singpass Developer Portal onboarding, unpublished fees; intersects the open entity-structure question). It is the designated upgrade path once volume and entity exist. Buy-side APIs (DocuSign from about USD 600/yr, Dropbox Sign from about USD 900/yr, USD 1.88-7.20 per envelope) are rejected for v1: our stack already covers rendering, storage and auth, and per-envelope costs erode a freemium tool.

### Phase 2d (fast-follows, scoped but not committed in this PRD)

- CDD digital workflow: Annex F Forms A1-A4 and B as structured capture with screening prompts and 5-year retention; trigger before agreement generation to match the timing rule; HDB-rental unrepresented-counterparty exemption noted. Recreate required fields, never CEA's layout. Pitch anchored to the real penalty regime (up to S$100,000 per breach for a salesperson before a Disciplinary Committee since 1 Jul 2025), never to the mischaracterized forgery case.
- Agency-branded commission invoice: agency name and UEN, GST-registered toggle (9%), EAA reference field, disclaimer that commission is payable to the agency.

## 7. User stories and acceptance criteria

**US1. LOI in two minutes (2a).** As a claimed rental agent with a tenant ready to commit, I create an LOI on my phone, prefilled with my details, with deposit and clause conventions suggested but editable, and share the PDF on WhatsApp.
- AC: P50 wall-clock from paperwork_started to paperwork_generated under 120 seconds for an agent's second-or-later LOI, under 4 minutes for the first (measured from the two funnel events; both already carry timestamps); agent block prefilled and collapsed; all convention values editable with hints; PDF carries the not-legal-advice footer; works at 375px width.

**US2. LOI to TA chain (2a).** As the same agent, once the landlord accepts, I create the TA from the LOI without retyping.
- AC: one action creates a TA draft with party, property, rent, term and deposit fields copied; linked_document_id records the source LOI; changed fields are editable as normal.

**US3. Type picker and zero regression (2a).** As an agent, I see the available document types with plain-language descriptions and pick one.
- AC: picker driven by the registry; unavailable types absent; per-type guidance note in the editor; list rows show a type chip; existing TA drafts and the finalised-clean-render wet-ink flow are byte-for-byte unaffected (regression E2E on the sandbox agent).

**US4. Finding the tool (2a).** As one of the existing claimed agents, I learn Paperwork exists without spelunking; as a new claimant, my first session points me at it.
- AC: broadcast + email announcing the suite goes out with 2a; post-claim first session surfaces a one-tap start-an-LOI prompt; the pre-claim demo on the marketing surface renders a watermarked sample LOI with static data and a claim CTA; claim flow records the source parameter.

**US5. The right prescribed form without knowing form numbers (2b).** As an agent taking a rental mandate from a landlord, I answer "acting for landlord, exclusive" and get the right form with its official name shown.
- AC: two-question resolver covers all shipped forms; prescribed clauses read-only; blanks and choices editable; Additional Terms free text with the non-conflict warning; overflow renders on the pink-tinted sheet with the print instruction; finalise blocked while essential fields are empty, with a checklist of what is missing; generated output carries the legislation-source notices and the stored source-version stamp.

**US6. Compliance confidence without scare tactics (2b).**
- AC: the s 44(1) explanation in the guidance note uses the CEA-blog framing (encouraged, not mandatory, but no prescribed form means no enforceable claim on the engagement); no fine-risk language anywhere; reg 11 out-of-scope scenarios listed with the catch-all example.

**US7. Send for signature (2c).** As an agent, I send the finalised TA to landlord and tenant and watch it complete.
- AC: per-signer links; signer page shows the full document before any signature action; consent checkbox required; typed plus drawn signature captured; status chips move draft, awaiting signatures (n of m), signed; declined and expired states exist with agent notification; resend reissues tokens; per-signer correction without voiding the envelope; sealed PDF with completion certificate; watermark until sealed; sealed document immutable and served verbatim; void-and-reissue is the only change path; signer routes validate and expire tokens and are rate-limited with live (not in-memory) limits.

**US8. Guardrails hold under adversarial use (all phases).**
- AC: HDB resale OTP requests (and lookalike attempts via LOI free text) surface the guardrail explainer and HDB Resale Portal link; impersonated admin sessions get 403 on every mutating route including signer-token creation; sandbox agents excluded from funnel events; quota enforced server-side including the un-void path; no document write path touches score or ranking tables; sealed documents survive the delete/void/title-edit attacks described in section 6.

## 8. Quota and monetization

Constraint: PropKaki gives 31 documents away free with no sign-up. Our generation sits behind claiming; that wall is a deliberate strategic trade-off (claims are the North Star and the session layer only resolves claimed agents), so the competitive answer to PropKaki's zero friction is the pre-claim demo plus generous in-wall quotas, not a template paywall. What they cannot copy without building accounts: prefill, the chain, stored history, e-sign.

**Recommendation (owner to confirm numbers):**
- Document generation, rolling 30 days: free 10, verified 30, professional unlimited, elite unlimited. Rationale: the habit target is 3+ documents per month and one deal chain (LOI + TA + EAA) is 3 documents, so the free tier must comfortably hold multiple deals; a cap at the habit target would strangle the metric the phase is judged on (Phase 1's free:1 is raised accordingly).
- E-sign envelopes become the monetized unit: free 1 per month, verified 5, professional 20, elite unlimited. The envelope is where willingness to pay lives (it replaces printing, scanning, chasing).
- Document history: never held hostage (Phase 1 stance): downgrade keeps read and download access to everything, pauses new generation beyond free quota and new envelope sends.

## 9. Data model and instrumentation changes

- sg_documents: no doc_type migration needed (app-level, no CHECK). Add linked_document_id (chain provenance; the spec's linked_viewing_id was never added and stays out until planner integration is real). Add source_version text (legislation stamp, 2b) and sealed_sha256 / sealed_path (2c).
- Status: reuse the existing CHECK values; sent serves as awaiting-signatures (DocumentsPanel badge relabels to "Awaiting signatures"; the only status-semantics reader is STATUS_STYLE). Declined/expired are envelope-level states on signers, not document statuses, so no CHECK migration.
- New table sg_document_signers (2c): role, name, email, sign_token hash, consent_at, signed_at, signature data, ip_hash, user_agent, declined_at, expires_at. RLS on, no policies, service-role only (house pattern).
- sg_document_events: start writing edited, sent, viewed, signed, declined, voided (created and finalised exist today); inserts remain fire-and-forget but get error logging.
- Funnel events: add paperwork_sent, paperwork_signed; fix paperwork_generated to log doc_type in metadata (today it logs template_key under that meaning); claim-flow source parameter for paperwork attribution.
- Storage: sealed-object immutable path convention enforced by storage policy (write-once), not app convention alone.

## 10. Legal and compliance guardrails (binding, with sources)

1. Administrative SaaS, not estate agency work, not legal advice. Disclaimer on every page (Phase 1 footer retained).
2. Prescribed forms transcribed from the Third Schedule of S 644/2010 (SSO scans, OCR + manual proofread) under SSO Terms of Use cl 13 with the required attribution notices. The licence is revocable, so the revision monitor doubles as a licence watch. SSO's own image files are never embedded (ToU cl 6). No reproduction of CEA website PDFs or CDD annex layouts without CEA written permission.
3. PG 1/2011 rules enforced in product with precise attribution (para 8: no cancellation of prescribed clauses, amendments initialled and dated; essential-blanks gate from Code of Ethics para 9(2)(d); pink overflow sheet and pre-typing rule per the guideline; every-page initialling as form-layout good practice).
4. E-sign copy rule from 6(2c): contract-law enforceability language only; the ETA Part 2 recognition does not apply to tenancy documents and copy never claims it; the Part 3 agreed-security-procedure clause is an anchor, not a marketing claim. Re-verify ECOMA commencement status at 2c build start and before any legal-explainer content ships.
5. HDB resale OTP: never generated; guardrail plus link out.
6. PDPA, in PDPA vocabulary: the agent is the organisation responsible for the party PII; we act as its data intermediary, and our agent terms of service must constitute the written processing contract that the intermediary carve-out depends on, while we retain direct obligations for protection and retention limitation. Party PII minimised; NRIC/passport fields optional, never indexed or reused; private bucket only; signer pages collect only what the signature record requires; retention policy (drafts auto-purge after N months, owner to set N; executed documents kept, deletable by the agent with the event-log retention rule from section 6; 5-year retention guidance surfaced for EAA and CDD records since electronic copies are expressly allowed). Signer emails are transactional messages sent at the agent's direction to named parties in a transaction they are part of; recorded here as the PDPA/Spam Control basis.
7. **Legal review gate, split by phase (review finding: the gate must precede the artifacts it covers).** One combined external session covers four artifacts: the Phase 1 TA clause set (already pending, section 14), the LOI clause set, EAA transcription fidelity, and the 2c signing-flow wording. Sequencing rule: 2a may ship before the review only with explicit owner sign-off accepting the interim risk, with the LOI labeled "standard-convention template, have parties seek advice for non-standard terms" (it already carries the not-legal-advice footer); 2b ships behind a visible "beta, pending legal review" label, and the compliance-differentiator marketing claims (Goal 3, US5/US6 framing on public surfaces) are held back until the review clears; 2c does not launch at all before the review and the security gate both clear. Plus a written query to CEA on third-party e-sign of prescribed forms (does not block 2a/2b).

## 11. Metrics and success thresholds

Instrumented via sg_funnel_events (sandbox excluded). Honest-sample-size rule: every percentage below is evaluated only once its cohort reaches 20 agents; until then the weekly report shows absolute counts, because at a 5-15 agent base a percentage flips on one person. "Active" means any dashboard session in the trailing 30 days.

- **Activation (primary):** share of newly claimed agents generating at least 1 document within 7 days of claiming. Target 40% (cohort n>=20). The first-session prompt is built in 2a (work item 5), so this measures a mechanism that exists.
- **Habit:** median documents per active paperwork user per 30 days. Target 3 or more after 2b.
- **Chain usage:** share of TAs created from an LOI. Target 30% or more of TAs by 60 days after 2a (validates the prefill differentiator).
- **E-sign (2c):** envelope completion rate (all signers signed within 72h of send). Target 70% or more. Envelope senders converting to paid within 60 days of first hitting the free envelope cap: target 20% or more.
- **First-session paperwork activation (renamed from claim attribution):** share of new claims whose first session includes a paperwork event, reported weekly alongside the North Star. The claim-flow source parameter separately reports claims that arrived via paperwork marketing surfaces; that is the true attribution signal.
- **Checkpoint with teeth (30 days after 2a ships):** if fewer than 10 agents (absolute count, not a percentage) have generated at least one document, 2c build pauses pending a wedge re-examination; 2b completes if already in flight (its transcription work is reusable regardless). This checkpoint can actually stop committed spend, unlike a kill criterion that only cancels uncommitted fast-follows.
- **Kill criterion (60 days after 2b):** if fewer than 25% of active claimed agents (n>=20, else absolute count judgment) have generated any document despite announcement + first-session flow, stop investing in 2d and hand the roadmap slot back to the demand-side priorities.

## 12. Scope and timeline assumptions

Solo-founder + Claude Code build cadence, consistent with Phase 1 (spec to live in one session):

- **2a (registry refactor + LOI + chain + picker + activation + announcement + integrity pre-work):** 1-2 sessions, including regression E2E on the existing TA flow. Migrations: linked_document_id only.
- **2b (Forms 7/8, then 1-6, + renderer extension + resolver + revision monitor):** 2-3 sessions. The long poles are the renderer primitives (itemized in 6.2b) and faithful OCR + proofread transcription of the statutory forms against the SSO scans; staging rental forms first delivers the target user before the full set is done.
- **2c (e-sign):** 2 sessions of build plus the two external gates (legal review, security review) and the Klaviyo Flow ops item; the gates are launch blockers for 2c only.
- Order: 2a strictly first (it carries the integrity pre-work and unblocks everything); 2b and 2c are independent after 2a, but 2b ships first while the reviews are scheduled.
- Deploy per standing mechanics: git push to origin main, clean-worktree tsc before push, browser verification, post-deploy checks.

## 13. Sources (primary unless noted)

- CEA agreements and checklists page; Form 1 PDF (byte-inspected: flat, no AcroForm, no version stamp); PG 1/2011 (paras 8, 9.1, introduction example).
- Estate Agents Act 2010 s 44(1)-(2); Estate Agents (Estate Agency Work) Regulations 2010 (S 644/2010) regs 10-11, Third Schedule (published on SSO as scanned images; last form amendment S 652/2019 wef 1 Oct 2019; the Regulations were later amended by S 878/2023 and S 644/2025 without touching regs 10-11 or the forms); Code of Ethics para 9(2)(d).
- CEA blog 9 Feb 2021 (Sign with Singpass for the prescribed EAA); CEA blog 23 Feb 2023 (templates "not mandatory"); CEA disciplinary case 27 May 2025 (S$15,000 + 9-month suspension for breaches including forgery and CDD failures; NOT a pure-CDD case); CEA censures 1 Jul 2025 (pure-CDD, S$5,000 and S$2,000); AML and Other Matters (Estate Agents and Developers) Act penalty regime from 1 Jul 2025 (up to S$100,000 per breach for a salesperson, S$200,000 for an estate agent, before a Disciplinary Committee).
- Estate Agents (PMLPFTF) Regulations 2021 (S 555/2021); CEA CDD guide rev 30 Jun 2025 (Annex D-G forms, "suggested").
- ETA 2010 (SSO current as at 5 Aug 2026): First Schedule items 1-4 (excluding Part 2 only), ss 4, 8, 17-19; Electronic Transactions (Amendment) Act 2021; ECOMA 2025 (Act 20 of 2025, uncommenced; Bill 11/2025 text; MinLaw second-reading speech: DCP pilot from early 2026, Sign with Singpass mandated, no recognition for private platforms).
- SM Integrated Transware v Schenker Singapore [2005] SGHC 58; Joseph Mathew v Singh Chiranjeev [2010] 1 SLR 338 (CA).
- HDB resale OTP rules (hdb.gov.sg: serialised form, Resale Portal only, no amendments).
- SSO Terms of Use cl 6 (no reproduction of SSO graphics/images), cl 13-14 (legislation reproduction licence, revocable); CEA Terms of Use s 6, 8 (no commercial reproduction of site content).
- LOI conventions: SingaporeLegalAdvice, Pinnacle, PropertyGuru guides, ISR (minor repairs), captain.legal (validity period). Conventions conflict on diplomatic-clause thresholds; encoded as editable fields.
- LOI ground truth: three executed SG residential LOIs reviewed 2026-08-05 (PropNex form LEG-AG-09.03, deals of Mar 2021 and Jul 2022; OrangeTee & Tie form 141119CLD/AG/AL, Jul 2022). Personal data not retained; structure only. Two of three executed via DocuSign. The two agency forms disagree on deposit terminology and conversion target, confirming the editable-field design.
- Market structure 2025: URA (private leasing about 90k+ contracts, resale 14,622, new sales 10,815), HDB (renting-out approvals 39,408, resale 26,169).
- Competitors (fetched 2026-08-05): propkaki.com/paperwork-assistant (31 documents, free, no sign-up, no e-sign; LOI absent); Ohmyhome documentation services (human service, half-month-rent or S$588/S$988+GST range); ERA in-house digital signing since Dec 2020; transacted.sg (S$97/mo, no paperwork); no paperwork features at levr.sg or mogul.sg.
- Codebase audit 2026-08-05, independently re-verified in review (file:line refs in section 6). Announcement gap verified in prod DB 2026-08-05: zero sg_broadcasts rows since 26 Jul, zero paperwork funnel events.

## 14. Open questions (owner decisions)

1. Quota numbers in section 8: confirm generation free 10 / verified 30 / professional+ unlimited, and envelopes 1/5/20/unlimited.
2. Interim-risk sign-off for shipping 2a's LOI before the combined legal review (section 10.7); and scheduling that review (one session covering TA + LOI + EAA fidelity + signing-flow; the TA review is already on your list).
3. Draft auto-purge window N for PDPA retention (recommend 6 months for drafts; executed documents kept until agent deletes).
4. Written query to CEA: third-party e-sign of prescribed forms, and (optional) permission for pixel-identical replicas. Send before 2c; 2a/2b do not wait on it.
5. Klaviyo Flows for signer-invite and completion metrics (2c precondition), or approve routing signer mail through a direct sender.
6. propkaki.com vs propkaki.sg entity split (Straits Intelligence Pte. Ltd. claims "official Propkaki platform" and a pending trademark): competitive-intel watch item only; no PRD impact.
