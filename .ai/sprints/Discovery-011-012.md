# Discovery — On-Site Visits & Needs Analysis standardisation

> **Program**: Incubator OS — ESD / B-BBEE beneficiary support (Statement 400, Clause 4.15)
> **Status**: Discovery — **must be completed and signed off before Sprint 011 or Sprint 012 begins**
> **Baseline**: `main` (Sprint 010 Google Calendar delivered; Sessions + Calendar locked)
> **Inputs**: three source documents (see *Source Documents*)
> **Output**: a field-by-field **reuse / gap matrix**, canonical ownership, lifecycle and snapshot contracts
> **No production code is written in this phase.**

---

## Objective

The source documents duplicate data that already exists in Incubator OS and, in places, contradict
each other. Before any implementation, establish **one canonical owner for every fact**, decide which
existing foundation each new capability extends, and lock the rules that keep the two new features
from re-inventing Company, Calendar, Sessions, Tasks, Funding or Results.

This phase produces a decision document an implementation agent can execute without asking questions.

---

## Source Documents

| Ref | Document | Nature | Notes |
| --- | --- | --- | --- |
| **D1** | `DS_Corp_Onsite_Visit_Report_1` | Populated on-site visit report | South32 ESD Programme, DS Corp (Pty) Ltd, 10 Sep 2026, coach Marius Wilken |
| **D2** | `DIAGNOSTIC ASSESSMENT & NEEDS ANALYSIS` | 14-page template | Contains **template/example content — not verified beneficiary data**. Incomplete. Treat as a *field list*, not truth |
| **D3** | `Needs Analysis` (`ESD-NAT-2026-V1`) | 4-page framework template | Clean scoring framework + tier bands + example support plan |

**Warning (carried into both sprints):** D2's *current-state* answers are **template/example content — not
verified beneficiary data**; we have **not established** that they belong to any actual beneficiary.
Its value is the **question and section set** only. D1 is the supplied source for DS Corp-specific facts,
and its `[TBC]` fields remain unresolved — do not present them as confirmed.

---

## Existing Foundation (Locked)

Do not redesign. Reuse or expose.

| Area | Canonical owner | Evidence |
| --- | --- | --- |
| Business identity, registration, VAT, address, industry | `companies` table + `capabilities/company` | `db.sql:315-356`, `capabilities/company/Repository/CompanyRepository.php` |
| Directors | `users` via `UserRepository::listByCompany` | `capabilities/company/Repository/UserRepository.php:16-25` |
| Schedule + location + timezone | `calendar_events` (Calendar) | `migrations/2026-09-19-calendar-events.sql` |
| Google Meet projection | `google_event_sync` | Sprint 010 |
| Facilitator, participants, attendance | `sessions` + `session_participants` | `migrations/2026-09-23-sessions.sql:87-155` |
| Agenda, notes, decisions | `session_agenda_items`, `session_notes`, `session_decisions` | same migration |
| Agreed actions | `gps_target_tasks` + `session_entity_links` (`gps_target_task`) | `migrations/2026-08-31-normalized-swot-gps.sql:124-142` |
| Programme / sponsor / cohort enrolment | `categories` + `categories_item` | `db.sql:157-233` |
| Funding facts | `seed_funding`, `company_purchase`, `grant_scm_verification` (JSON nodes) + `company_purchases` (relational) | see *Duplication Register* |
| Outcomes / evidence | `achievements` + `achievement_evidence` | `migrations/2026-09-15-results-achievements.sql` |
| Measurable metrics | `gps_target_metrics` + `metric_type_accounts` | same migration |

---

## Source Documents → canonical mapping

### D1 — Site visit report

| D1 field | Canonical source | Action |
| --- | --- | --- |
| Business Name | `companies.name` | read |
| Director(s) / Founder(s) | `users` (role `Director`) | read |
| Date of Visit (scheduled) | linked `calendar_events` | read |
| Date of Visit (actual) | **new** — `session_visit_reports.actual_visit_date` | introduce |
| Visit Type (Scheduled) | **new** — `visit_kind` (`scheduled`/`ad_hoc`/`follow_up`) | introduce |
| Coach / Consultant | `sessions.facilitator_user_id`/`facilitator_label` | read |
| Attendees Present | `session_participants` + `attendance` | read |
| Location / Venue | event location, **new** `actual_location` override | introduce |
| Nature of Business | `companies.description` | read (expose) |
| Vision / Mission | `nodes.type='company_vision'` | read (expose) |
| Purpose of Grant Funding | funding records | read (project) |
| Disbursement / Supplier Payment Status | `seed_funding` / `grant_scm_verification` | read (project) |
| Compliance Notes | `companies.compliance_notes` | read |
| Current Operating Status | **new** — `session_visit_reports.operating_status` | introduce |
| Key Discussion Points | **new** — `session_visit_discussion_points` | introduce |
| Challenges Identified (+ impact) | **new** — `session_visit_challenges` | introduce |
| Options / Alternatives Considered | **new** — `session_visit_alternatives` | introduce |
| Coach Recommendations | **new** — `session_visit_recommendations` | introduce |
| Agreed Actions | `gps_target_tasks` via `session_entity_links` | reuse |
| Next Visit | **new** — follow-up Session link + method + target date | introduce |
| Sign-Off | **new** — `session_visit_signoffs` | introduce |
| Issued PDF | **new** — `session_visit_report_versions.snapshot_json` | introduce |
| Programme / Sponsor (South32) | `categories_item` enrolment → `categories` (`client`/`program`) | read (select) |

### D3 — Needs analysis (`ESD-NAT-2026-V1`)

| D3 structure | Canonical decision |
| --- | --- |
| Section 1 Beneficiary Profile | **reuse** Company + enrolment |
| Section 2 Scoring scale 1–5 | **new** — `assessment_framework_scales` |
| Section 3 Dimensions (A–D, max 80) | **new** — `assessment_criteria.dimension`; seed the criteria |
| Section 4 Tier bands (High/Growth/Ready) | **new** — tier rules on the framework |
| Section 5 Support plan (+ budgets) | **new** — `assessment_needs` → `assessment_interventions` |
| Section 6 Sign-off | **new** — `assessment_signoffs` |

### D2 — Diagnostic detail (questions only)

| D2 element | Canonical decision |
| --- | --- |
| 8 assessment domains (Compliance, Governance/ESG, Strategy, Financial, Product, Marketing, Technical, Human Capital, Assets) | map onto D3 dimensions as additional `assessment_criteria` |
| Baseline score 1–5 | same scale as D3 |
| Support Docs / Tools | `assessment_criteria.applicability_json` (what evidence is expected) |
| Current State Observations | `assessment_findings.observation` |
| Identified Gaps / Deficit | `assessment_findings.gap` |
| Priority Interventions + Action Plan | `assessment_needs` + `assessment_interventions` |
| Outputs vs Outcomes matrix | `assessment_expected_results` (`output`/`outcome`) |
| Budget / spend per intervention | `assessment_interventions.budget_amount` |
| Formal declaration sign-off | `assessment_signoffs` |

---

## Canonical ownership rules (locked)

1. **The Company profile owns current business facts.**
   `companies.description` is the single *nature of business* field. `company.service_offering` is the
   offering catalogue summary — a different fact. `nodes.type='company'` JSON `description` is legacy.
2. **Mission / vision / purpose / values stay in `company_vision`.**
   They are **exposed through the Company capability** — never copied into a visit or an assessment.
3. **The Calendar owns schedule. Visits and assessments store no second schedule.**
   Visits may store a *confirmed actual* date/location because "when it actually happened" is an
   observation, not a schedule.
4. **Sessions own the visit conversation.** A site visit **is** a Session with
   `session_type='site_visit'`; participants, attendance, notes, decisions and task links are reused.
5. **Tasks remain the execution layer.** Every agreed action is a `gps_target_task` under a target.
   Visits must not invent an action system.
6. **Assessments observe; the profile owns.** A finding that reveals a changed business description
   offers an explicit **“Update company profile”** action. Saving an assessment never silently
   overwrites the profile.
7. **Issued documents are snapshots.** Once a visit report or assessment is finalised, its rendered
   values are preserved. Later company edits or completed tasks must **not** rewrite the historical
   record.
8. **Funding states are separate:** committed → paid → delivered → utilised. Paying a supplier never
   implies delivery or utilisation.
9. **Assessment is a first-class entity, not a node.** `consolidated_assessment` is legacy; new work
   uses the normalized capability. GPS provenance gets a real `assessment_finding_id`.
10. **No logic goes in `api-nodes/`.** New endpoints are capability endpoints.

---

## Duplication Register (must be resolved or explicitly deferred)

| # | Duplication | Decision |
| --- | --- | --- |
| 1 | `companies.description` vs `service_offering` vs legacy node `description` | `description` = nature of business; `service_offering` = offerings; legacy node untouched |
| 2 | Vision/mission in `company_vision` node, absent from overview API | Expose through Company capability; keep node as storage |
| 3 | **Two purchase models**: `company_purchases` (table) vs `company_purchase` (node) | Sprint 011 **reads** both for the funding projection; a future sprint reconciles. Do not merge now |
| 4 | **Two form systems**: `form_nodes`/`form_sessions` vs `nodes.type='form_submission'`/`consolidated_assessment` | Sprint 012 introduces a normalized assessment; form infra is reused **for rendering only** |
| 5 | `consolidated_assessment` progress >100% and hardcoded /25 | Legacy; not migrated. Flagged, not fixed in these sprints |
| 6 | `session_entity_links.entity_type` canonical names vs frontend aliases (`target`/`swot`/`result`) | Reconcile in Sprint 012's link work; one mapping layer |
| 7 | `gps_target_sources.source_type='assessment'` with **no** assessment id | Sprint 012 adds `assessment_id` + `assessment_finding_id` |
| 8 | `sector_name` is a display alias, not a column | Documented; do not add a column |

---

## Contracts to lock (input to the sprint Exit Criteria)

### Visit contract

- `session_type` gains `site_visit`; report rows may only exist for a Session of that type.
- `visit_kind` (scheduled / ad hoc / follow-up) is independent of the Session lifecycle.
- The report has its own state: `draft` → `issued` → `acknowledged`. It may only be issued when the
  Session is `COMPLETED`.
- `incubator`-visibility notes are **never** rendered into a beneficiary-facing export.
- An issued report is immutable; a correction creates a **new version**.

### Assessment contract

- A framework is **versioned and published**; a published framework's criteria are immutable.
- A finding belongs to an assessment and a criterion; `(assessment_id, criterion_id)` is unique.
- Scores use the framework's scale. **Not applicable** is distinct from **unanswered** (NULL).
- The denominator is the sum of weights of **applicable** criteria; incomplete assessments do not
  produce a final tier.
- `assessment_type` is `baseline` or `reassessment`; reassessments compare per dimension to a chosen
  baseline.
- An intervention may link to a GPS target; a GPS target created from an assessment links back to the
  exact finding.
- Finalising an assessment freezes it and records a sign-off; corrections create a new version.

### Snapshot contract

Every issued/finalised document stores a `snapshot_json` of exactly what was rendered, plus
`issued_by` / `issued_at` / `version`. The snapshot is the audit record; live data keeps its own owner.

---

## Discovery tasks

- [x] **D.1** Walk every field in D1, D2 and D3 against the *Source Documents → canonical mapping*
      tables and confirm each line with a code read (`file_path:line`). → §1
- [x] **D.2** Inspect **representative company payloads** (`companies`, `company_vision`,
      `categories_item`, funding nodes) for the real beneficiary set — note conflicting values.
      Do **not** inspect live production records from the agent; use local/provided extracts. → §1.4, §2.4
- [x] **D.3** Confirm the sponsorship/enrolment rule: DS Corp → which `categories_item` row
      (`program_id`, `cohort_id`, `client_id`)? Record the exact selection rule. → §4, §7 U1/U2 (blocked: no company row)
- [x] **D.4** Confirm the funding projection: which tables/nodes are read for
      *committed / paid / delivered / utilised*, and reconcile table-vs-node purchase data for a
      sample beneficiary. → §2
- [x] **D.5** Select the assessment foundation and record the decision (normalized capability) with
      a one-paragraph rationale. → §3.6
- [x] **D.6** Reconcile the D3 1–5 scale against the D2 1–5 scale into **one** scale definition. → §3.1
- [x] **D.7** Agree the `assessment_criteria` seed set (D3 dimensions + D2 domains) with codes. → §3.4
- [x] **D.8** Resolve the `session_entity_links` canonical-name vs frontend-alias mapping. → §5.2
- [ ] **D.9** Sign off the ownership rules and contracts as the frozen input to Sprint 011 / 012.
      → blockers U1, U4, U5, U6 in §7

## Exit Criteria

- [x] Every field in D1, D2 and D3 appears in a mapping table with a **source** and an **action**.
- [x] Every item in the Duplication Register has a decision (fix now / defer with owner).
- [x] The three contracts (visit, assessment, snapshot) are agreed and written.
- [x] The `assessment_criteria` seed list is final with stable codes.
- [x] The enrolment selection rule and the funding projection rule are written.
- [ ] No open question remains that would force an implementation agent to guess.
      **Open:** U1 (DS Corp company/enrolment), U4 (`utilised` field choice), U5 (vision reachability),
      U6 (scale labels) — see §7.

---

## Definition of Done

- [ ] The matrices are complete and each row is code-verified.
- [ ] Canonical ownership is unambiguous.
- [ ] Sprint 011 and Sprint 012 can be executed without re-litigating ownership.

---

## Out of Scope

- Any production code, migration or endpoint.
- Merging the two purchase models, the two form systems, or migrating `consolidated_assessment`.
- Live production record inspection by the agent.
- Reconciling the **contents** of D2 (it is template/example content, not verified beneficiary data).

---

## Future Modules (Reserved)

| Module | Why deferred |
| --- | --- |
| Purchase data reconciliation (table vs node) | Needs a migration + dedupe pass; out of scope here |
| Legacy `consolidated_assessment` migration into the new capability | Requires a mapping exercise and progress repair |
| Multi-beneficiary sponsor reporting / portfolio roll-up | Separate reporting capability |
| SANAS audit export bundle | Depends on both sprints being complete |

---

# Discovery Evidence Package (D.1–D.9)

> Produced 2026-09-25. Every claim below was verified by code read and carries a `file_path:line` citation.
> This is the package to review before Sprint 011 Phase 1. **Nothing here is implemented yet.**

## Status

| Task | Status | Result |
| --- | --- | --- |
| D.1 Field trace (UI → API → storage) | ✅ complete | See §1 |
| D.2 Representative payloads / conflicts | ✅ complete | See §1.4, §2.4 |
| D.3 Enrolment rule | ⚠️ **partly blocked** | See §4.1 — DS Corp has no `companies` row and no `categories_item` enrolment |
| D.4 Funding projection | ✅ complete | See §2 — **`utilised` has no field anywhere** |
| D.5 Assessment foundation | ✅ decided | New normalized capability (see §3.6) |
| D.6 Scale reconciliation | ✅ resolved | See §3.1 — canonical wording chosen |
| D.7 Criteria seed set | ✅ drafted | See §3.4 |
| D.8 Link name/alias mapping | ✅ complete | See §5.2 |
| D.9 Sign-off | ✅ resolved (§7 decision register); binding on review | U1, U4, U5, U6, U8 now have code-checked resolutions |

---

## 1. Canonical fields — UI → API → storage

### 1.1 Two company surfaces, disjoint write capability

| Surface | Route | Data path |
| --- | --- | --- |
| **Current (Company Shell)** | `/company/:id` | Capability `api/company/...` (`get-overview`, `update-profile`) |
| **Legacy detail** | `/companies/:id` | Legacy `api-nodes/company/...` only |

- Current shell editor writes **13 fields** (`capabilities/company/Contracts/Requests/UpdateProfileRequest.php:6-20`).
- Legacy modal writes the full `Company::WRITABLE` list (`api-incubator-os/models/Company.php:9-20`).
- Fields the current shell **cannot** write at all: `description`, `vat_number`, `postal_code`, `locations`,
  all compliance flags, turnover, employees (evidence: `UpdateProfile.php:19-32` vs `Company.php:9-20`).

### 1.2 Field trace (selected)

| Field | UI reader (current) | API | Column / node | Writable via `update-profile`? |
| --- | --- | --- | --- | --- |
| Legal name | `company-profile-editor.component.ts:29` | capability `get-overview` | `companies.name` `db.sql:318` | ✅ `UpdateProfile.php:20` |
| Trading name | `company-profile-editor.component.ts:73` | same | `companies.trading_name` `db.sql:331` | ✅ `UpdateProfile.php:22` |
| Registration no | `company-profile-editor.component.ts:33` | same | `companies.registration_no` `db.sql:319` | ✅ `UpdateProfile.php:21` |
| **VAT number** | *no current-shell field*; `company-form-modal.component.ts:142` (legacy) | legacy only | `companies.vat_number` `db.sql:347` | ❌ |
| **Nature of business** | `business-description.component.ts:15` (fallback) | legacy read | `companies.description` `db.sql:323` | ❌ |
| Service offering | `company-profile-editor.component.ts:55` | capability | `companies.service_offering` `db.sql:322` | ✅ `UpdateProfile.php:30` |
| Industry | `company-information.component.ts:27` (as `sector_name`) | `list-companies.php:141-147` (join) | `companies.industry_id` `db.sql:355` → `industries.name` | ✅ as `industry_id` |
| CIPC status | `company-profile-editor.component.ts:42` | capability | `companies.cipc_status` `db.sql:321` | ❌ |
| Contact / address block | `contact-information.component.ts:15-28` | capability | `contact_person/contact_number/email_address/address/city/suburb/business_location` | ✅ (`UpdateProfile.php:23-29`) |
| B-BBEE level | `company-profile-editor.component.ts:60` | capability | `companies.bbbee_level` `db.sql:320` | ✅ `UpdateProfile.php:31` |
| Ownership flags | `company-overview.component.ts:109-121` | capability | `black_ownership` etc. `db.sql:332-337` | derived only (`CompanyRepository.php:104-157`) |
| Directors | `company-director-list.component.ts:37-89` | `get-overview` → `directors[]` | `users` rows `UserRepository.php:16-25` | via `register-director.php` only |

### 1.3 `sector_name` is a phantom field

`CompanyFormModal` posts `sector_name` (`company-form-modal.component.ts:111`) but `Company::filterWritable`
silently drops it because it is not in `WRITABLE` (`Company.php:352-370`). `get-company.php` (`SELECT *`,
`Company.php:143`) does not join `industries`, so `company.sector_name` is blank on the detail route.
**Decision:** document `sector_name` as a display alias; do not add a column.

### 1.4 Description vs service_offering — the conflict, precisely

| Storage | Key | Read by | Written by |
| --- | --- | --- | --- |
| `companies.description` | column | `business-description.component.ts:15` (fallback), `rich-company-card.component.ts:118-125`, executive report `company-report-section.component.ts:161` | legacy `update-company.php` only |
| `companies.service_offering` | column | `company-profile-editor.component.ts:55` (primary), `business-description.component.ts:15` (primary), report `:128` | capability `update-profile` **and** legacy |
| `nodes.type='company'` `data.description` | JSON | **no Angular reader** — archive only | legacy archive; migrated by `CompanyMigrator.php:112` |
| `nodes.type='company'` `data.service_offering` | JSON | none | migrated by `CompanyMigrator.php:111` |
| `consolidated_assessment` `intro_business_description` | JSON | `questionnaire.service.ts:316-356` | `questionnaire.service.ts:361-429` |
| `companies.description` (3rd semantic) | column | used as exact-match **cohort tag** in `Company::getAvailableForCohort` `Company.php:311-314` | — |

**The current shell displays `service_offering` only** (`company-profile-editor.component.ts:55`).
`description` is orphaned from the capability even though the Discovery plan designates it the canonical
*nature of business*.

### 1.5 Mission / vision — storage and the reachability problem

- **Storage:** `nodes.type='company_vision'`. Keys: `purpose_statement`, `vision_statement`,
  `mission_statement`, `core_values[]`, `value_proposition`, `target_market`, `competitive_advantage`,
  `long_term_goals`, `success_metrics[]`, `mentor_notes` (`business.models.ts:383-396`; sample `db.sql:2576`).
- **UI:** `StrategyTabComponent` → `VisionModalComponent` (`vision-modal.component.ts:37-180`), read view
  `VisionMissionSectionComponent`.
- **Reachability defect:** the Strategy tab button is **commented out** in
  `tabs-navigation.component.ts:81-91`, and the current shell
  (`company-shell.component.ts:100-177`) has **no Strategy tab at all**. The editor is effectively
  unreachable through normal navigation on both surfaces.
- **PHP ownership:** **zero** PHP files reference `company_vision` — it is generic node CRUD only.
- **`get-overview` does not return it:** `CompanyOverviewResponse.php:6-10` has exactly
  `company / directors / financialSummary`.
- **Other vision-like stores:** `consolidated_assessment.sc_winning_aspiration` (`questionnaire.service.ts:142-148`),
  `form_submission.answers.value_proposition` / `competitive_advantage` / `q_five_years`
  (`built-in-templates.ts:579`; `db.sql:2955,3316,3320,3325`).

**Decision (D.1/D.2):** `company_vision` remains the single owner. Sprint 011 exposes it read-only through the
Company capability **and must restore a reachable edit surface** (the current shell has none). Do **not** copy
vision into visits or assessments.

---

## 2. Funding — the four states

> **Evidence scope:** all row counts and the DS Corp data findings in this section come from the repository
> `api-incubator-os/db.sql` export and `docs/00track/` markdown, **viewed 2026-09-25 — not a live production
> read**. Code reconnaissance cannot establish current production data. Every count must be re-verified
> against production before it is acted on (see §7, Evidence-scope correction).

### 2.1 Every storage, and its key

| Storage | Physical key | Matches `companies.id`? | Rows seeded |
| --- | --- | --- | --- |
| `seed_funding` node | `company_id` | ✅ | 0 |
| `company_purchases` **table** | `company_id` | ✅ | 108 (`db.sql:1355-1463`) |
| `company_purchase` node | `company_id` | ✅ | 0 |
| `process_tracker` node | `company_id` | ✅ | 0 |
| `grant_scm_verification` node | **`parent_id`** (`scm-verification.service.ts:57-61`) | ⚠️ usually, else applicant node id | 0 |
| `supplier_collection` node | **`parent_id`** (`supplier.service.ts:30-34`) | ⚠️ same caveat | 0 |
| `grant_funding_request` node | `company_id` (JSON) | ✅ | 4 (`db.sql:2659-2662`) — **orphaned, no code reads it** |
| `grant_bank_statement` node | `parent_id` = applicant id | ❌ | 253 |
| `grant_compliance` node | `parent_id` = applicant id | ❌ | 4 |
| `grant_application` node | `company_id` (nullable) | ⚠️ null for DS Corp (`db.sql:2997`) | 344 |
| `metric_records` / `company_financial_yearly_stats` | `company_id` | ✅ | — (turnover, not grant) |
| `funds-received` component | — | — | **empty stub** `funds-received.component.ts:22` |

**`parent_id` is ambiguous:** the applicant shell passes `applicantCompanyId() || applicantId`
(`applicant-overview.component.ts:154`), so when a grant application has `company_id = NULL` the SCM/supplier
node is stored under the **applicant node id**, colliding with the `grant_bank_statement` parent space.
A join on `parent_id` across types is **unsafe**.

### 2.2 State evidence mapping

| State | Has fields? | Best field(s) | Notes |
| --- | --- | --- | --- |
| **committed** | ✅ | `seed_funding.approvedAmount`; `company_purchases.purchase_order`; `ScmPurchaseOrderProcessing.purchase_order_generated`/`.approved`; `grant_scm_verification.online_verification.approved`; `grant_application.status='approved'` | multiple stores |
| **paid** | ✅ | `ScmPaymentProcessing.payment_done`/`.proof_of_payment_sent`/`.bank_confirmation_received`; `seed_funding.disbursedAmount`/`payments[]`; `process_tracker.amountDisbursed` | ⚠️ `seed_funding.payments[]` carries **amount only — no date, reference or proof** (`seed-funding.model.ts:11`) |
| **delivered** | ✅ | `company_purchases.items_received`/`invoice_received`; `company_purchase.order.itemsReceived`; `ScmPaymentProcessing.delivery_note_received`; `process_tracker.steps.acknowledgementOfDeliverySigned` | multiple stores |
| **utilised** | ❌ **NONE** | — | **No field anywhere** records installed / in-use / producing-outcome. Closest proxies are `process_tracker.completionPercentage` (a process score) and `seed_funding.remainingBalance` (money left) |

**Locked decision (D.4):** `utilised` must be **introduced** by Sprint 011 — it is the state the DS Corp
report actually turns on. Committed/paid/delivered are derived from existing fields; utilised is new.

### 2.3 Double-counting risk

| Risk | Evidence | Reliable join key? |
| --- | --- | --- |
| `company_purchases` **table** vs `company_purchase` **node** — exact semantic twins | `db.sql:1334-1349` vs `company-purchase.model.ts:5-17` | ❌ no shared row id |
| Disbursement counted in `seed_funding.disbursedAmount` **and** `process_tracker.amountDisbursed` **and** SCM `payment_done` | `docs/00track/03-payments-tracker.data.md:10`, `04-process-tracker.data.md:10` | ❌ no payment/transaction id |
| Same rand as "itemized list" purchase and "payments tracker" payment | `02-itemized-list.data.md:21-23` vs `03-payments-tracker.data.md:10` | ❌ no invoice/PO number persisted |
| SCM quotation amount vs `company_purchases` amount | `scm-verification.models.ts:51` vs `db.sql:1362` | ⚠️ free-text supplier name only |

**Candidate join keys that exist:** `company_id` only (company-level). **Do not exist:** PO *number* only
booleans are stored; invoice *number* only inside the orphaned `grant_funding_request`; payment *reference*
only there and null. `ScmQuotation.id` is client-generated and never propagated.

**`company_purchases` and `company_purchase` are disjoint today (108 vs 0 rows), but both are live write
paths — this is the highest double-count hazard if both are ever populated.**

### 2.4 The DS Corp scenario

DS Corp exists **only** as `grant_application` node **2389**, `company_id NULL` (`db.sql:2997`).
There is **no `companies` row**, no purchases, no seed funding, no SCM, no process tracker for DS Corp.
The only DS Corp funding data lives in markdown under `docs/00track/`.

| Report claim | Representable today? | Missing |
| --- | --- | --- |
| "Supplier paid in full — shopfitting" | ⚠️ concept exists in SCM `payment_processing`, but no DS Corp node | per-supplier paid flag; payment reference; proof link |
| "Grant cannot remain unutilised" | ❌ | **a `utilised` field does not exist** |
| "Searching for premises" | ❌ | no premises-search field |

**Consequences for Sprint 011:** (a) the funding projection must tolerate a beneficiary with **no company
row** and report "unknown", never "zero"; (b) DS Corp must be linked to a `companies` row before a site visit
can be issued (invariant 5 requires a company + enrolment); (c) "searching for premises" is captured by the
visit's own operating-status / challenges sections, not by a funding field.

---

## 3. Assessment scoring

### 3.1 Scale reconciliation (D.6)

The requested wording "Critical Vulnerability / High Risk / …" **does not exist in the repo**. The D3 PDF and
D2 PDF both use a 1–5 scale but with different names. Existing repo scales, for reference:

| Source | Values |
| --- | --- |
| Growth-area threat | `Low Risk / Minor / Moderate / High Risk / Critical Threat` (`growth-areas-tab.component.ts:345`) |
| Key-result confidence | `1 Very Low … 5 Very High` (`key-result-modal.component.ts:205-209`) |
| **D2 (template/example)** | `1 Critical Vulnerability; 2 High Risk; 3 Moderate Risk; 4 Functional; 5 Optimized` |
| **D3 (framework)** | 1–5, labels unspecified in the PDF |

**Resolution:** adopt the following **canonical 1–5 descriptors** (D2's maturity wording, corrected from the
earlier draft "Critical Vulnerability / High Risk / Moderate Risk / Functional / Optimized"):

| Score | Label |
| --- | --- |
| 1 | **Critical Deficit** |
| 2 | **Basic / Emergent** |
| 3 | **Operational** |
| 4 | **Proficient** |
| 5 | **Best Practice** |

These labels live in the versioned framework (`assessment_scales.descriptors_json`); a framework may override
them without a schema change. **Missing and N/A remain separate from any score** and are never mapped onto a
label (§3.2).

### 3.2 Missing vs not-applicable (locked)

- `score IS NULL AND is_applicable = 1` → **unanswered** (blocks finalisation, §Scoring Contract).
- `is_applicable = 0` → **not applicable**, excluded from numerator **and** denominator.
- Never infer "not applicable" from a blank answer — the two must be recorded explicitly.

### 3.3 The legacy >100% defect (evidence, not migrated)

- `savePartialResponse` persists `Math.round((answeredCount / 25) * 100)`
  (`questionnaire.service.ts:389`) — denominator hardcoded `25`.
- The questionnaire actually defines **26** questions (`questionnaire.service.ts:30-307`), so a fully
  answered form yields **104%**.
- Secondary defect: the write key is `metadata.progress_percentage` (`:389`) but the read key is
  `metadata.overall_completion_percentage` (`:335`), which is never set — so the UI reads `0`.
- Same hardcoded `25` in `getTotalQuestionsCount` `:477`, `calculateProgressFromNodeData` `:556`,
  `calculateProgressPercentage` `:580`, `calculateSectionProgress` `:532`.
- **Confirmed legacy; flagged, not fixed, not migrated** (Duplication Register #5).

### 3.4 Criteria seed set (D.7 draft)

Framework `ESD-NAT-2026-V1`, `max_points = 80`, scale `1..5`, 4 dimensions × weight 4:

| Dim | Code | Criteria (seed) |
| --- | --- | --- |
| A `gov_compliance_fin` | Compliance & Statutory Reporting · Governance/ESG · Strategy Planning · Financial Management & Cashflow |
| B `tech_ops_safety` | Product & Service Development · Technical & Equipment Capacity · Quality & Safety Systems |
| C `human_capital` | Human Capital & Skills · Training & Development |
| D `market_commercial` | Marketing & Sales · Market Access & Client Concentration · Start-up Costs & Assets |

> Criterion codes, per-criterion weights (summing to each dimension weight) and each criterion's
> `evidence_expectation` are finalised in Sprint 012 Phase 1.2; this is the agreed *shape*, pending final
> weight sign-off at D.9.

### 3.5 Comparison pattern to imitate (D.5/D.8)

No assessment comparison exists. The implemented patterns are:
- **Financial side-by-side** — `FinancialComparisonService` + `FinancialYearComparisonComponent`, read-only,
  period columns + growth; migration `add_yearly_side_by_side_period_type.sql`.
- **GPS baseline vs target** — `gps_target_metrics.baseline_period_*` / `target_period_*`,
  `gps.service.ts:196-201`.
- **Achievement immutability** — `achievements.supersedes_id` self-FK, `verified` immutable,
  `achievement_evidence.snapshot_json` frozen in-transaction (`Achievement.php:139-170`).

**Decision:** Sprint 012 imitates the **achievements** pattern for the frozen version data, and the
**financial side-by-side** pattern for the comparison presentation.

### 3.6 Assessment foundation decision (D.5)

New normalized capability `capabilities/assessments`. Rationale: the form system has rating/scale **field
types** but **no scoring engine** (`IFormSession`/`ISessionFieldResponse` carry only raw values,
`form-system.models.ts:57-90`); the legacy questionnaire is a hardcoded 26-question node with the >100% defect;
and `business.assessment.models.ts` scoring types are **interfaces with no implementation**. None can host a
versioned, scored, comparable diagnostic without becoming that capability. Hence: new capability, reuse the
form renderer for presentation only.

---

## 4. Visit history (D.3-adjacent)

### 4.1 Scheduled vs actual vs system

| Class | Field | Meaning |
| --- | --- | --- |
| **Scheduled** | `calendar_events.start_date/end_date` (all-day) or `start_at/end_at`+`timezone` (timed) `2026-09-19-calendar-events.sql:75-80` | when it is meant to happen |
| **Actual occurrence** | **does not exist** | `sessions.started_at`/`completed_at` are *workspace lifecycle* instants (`2026-09-23-sessions.sql:102-103`), set by `SessionRepository::markStarted` (`:258-267`) — **not** a confirmed visit date |
| **System audit** | `created_at`/`updated_at` on every table; `session_activities.created_at` `:267`; Google sync timestamps | records when a row changed |

**Locked decision:** `session_visit_reports.actual_visit_date` + `actual_location` are **new**; never reuse
`started_at` as the visit date.

### 4.2 Sign-off and version referencing

- **No relational sign-off table exists.** Implemented sign-off is JSON on legacy nodes: `session_feedback`
  `client_signature` + `signature_data` (`session.models.ts:11-13`, `db.sql:2645-2646`) — **no `signed_at`,
  no signer user id**; grant-funding approvals `{name, role, status, signature, approval_date}`
  (`db.sql:2659-2662`); workflow `verified_by/verified_at` (`db.sql:1811-1816`).
- Reusable canvas: `signature-pad.component.ts`.
- **No issued-document snapshot exists.** The only implemented JSON snapshot is
  `achievement_evidence.snapshot_json`; PDFs are generated live from nodes
  (`assessment-export.service.ts:40,72-84`).

**Locked decision:** sign-off must reference the **exact issued version**, not just the report — the
acknowledgement row should carry `report_version_no` (or be keyed to
`session_visit_report_versions`), so an acknowledgement cannot silently apply to a later re-issue.

---

## 5. Traceability (D.8)

### 5.1 End-to-end chain, with the weak hops called out

| # | Hop | Link column | FK? | Company-scope check |
| --- | --- | --- | --- | --- |
| 1 | Finding → Source (SWOT) | `gps_target_sources.swot_item_id` | ✅ `2026-08-31-normalized-swot-gps.sql:117` | ✅ `GpsTargetSource::assertSameCompany` `:150-162` |
| 1b | Finding → Source (assessment/manual/coaching) | only `source_type` + `notes` | ❌ | ⚠️ none in model |
| 2 | Source → Target | `gps_target_sources.gps_target_id` | ✅ `:116` | ✅ endpoint guard |
| 3 | Target → Task | `gps_target_tasks.gps_target_id` | ✅ `:141` | ✅ endpoint `auth_require_target_access` `helpers/AuthGuard.php:107-119` |
| 4 | Target → Measure | `gps_target_metrics.gps_target_id` | ✅ `:183` | ✅ endpoint |
| 5 | Measure → Metric type | `gps_target_metrics.metric_type_id` | ❌ omitted `:184` | ⚠️ app-layer |
| 6 | Measure → Account binding | `metric_type_accounts.metric_type_id` | ❌ `2026-09-15-results-achievements.sql:52` | ⚠️ app-layer |
| 7 | Result actual | `company_financial_yearly_stats.(company_id, financial_year_id, account_id)` | n/a | ✅ `WHERE company_id=?` `TargetMeasurementService.php:454-462` |
| 8 | Target → Achievement | `achievements.gps_target_id` | ✅ `:109` | ✅ `Achievement::assertTargetSameCompany` `:372-381` |
| 9 | Achievement → Evidence | `achievement_evidence.achievement_id` | ✅ `:131` | ✅ via parent |
| 10 | Session → any entity | `session_entity_links.entity_type` + `entity_id` | ❌ polymorphic `2026-09-23-sessions.sql:239` | ✅ `CalendarLinkResolver` + `ManageSessionLinks.php:46-49`; ⚠️ **actor-reachability claimed (`:230-231`) but NOT implemented** |

**Locked decisions:** (a) Sprint 012 adds real `assessment_id` + `assessment_finding_id` to
`gps_target_sources`; (b) the hop-10 actor-reachability gap is recorded as a **known defect** — do not build
on the assumption it is enforced.

### 5.2 `session_entity_links` name/alias mapping (D.8)

Backend/DB canonical names (correct): `gps_target`, `swot_item`, `gps_target_task`, `financial_indicator`,
`achievement`, `achievement_evidence` (`2026-09-23-sessions.sql:238`).

Frontend aliases (drift): `'target' | 'swot' | 'task' | 'financial' | 'result' | 'evidence'`
(`session.models.ts:25-31`).

| UI alias | Canonical | 
| --- | --- |
| target | `gps_target` |
| swot | `swot_item` |
| task | `gps_target_task` |
| financial | `financial_indicator` |
| result | `achievement` |
| evidence | `achievement_evidence` |

**Locked decision:** one explicit alias map in the frontend model; the canonical string is always what is
sent and stored. No backend enum change.

---

## 6. Migration registry (D.9 input)

- Highest run order is **#25** `2026-09-24-google-calendar-phase4.sql` (`migrations/README.md:53`),
  **not yet production-verified**.
- **No orphan files; no README row without a file** — 25 files map to rows #1–#25.
- **#26 is free.** `2026-09-25-site-visits.sql` = #26 ✅.
- **#27 is free, but a plan defect must be fixed:** Sprint 012 assigns **two** files to #27
  (`2026-09-26-assessments-framework.sql` and `2026-09-26b-assessment-gps-provenance.sql`,
  `Sprint-012.md:311,385-388`). The README convention is **one row per file**. **Resolution: renumber to
  #27 (framework) and #28 (GPS provenance).**
- **Naming:** the `b` suffix currently means "patch to a prior migration"
  (`2026-08-31b-patch-*`). Sprint 012's second file is **not** a patch. **Resolution: use the phased
  convention** (`...-assessments-phase2.sql`) as google-calendar did (`README.md:50-53`).
- **Gate:** #26/#27/#28 verification must first confirm the #25 preflight, per the deployment policy.
  **#25 production verification is a deployment prerequisite**: #26 → #27 → #28 are ordered **after** #25 is
  verified in production, never before.

---

## 7. Decision register — resolved

> Resolutions below were code-checked where a workflow was claimed, **amended and approved at planning review
> on 2026-09-25**, and are now **binding** for Sprint 011 / Sprint 012. Approval is based on the supplied
> evidence summary; the approver has not independently re-run every row count (see the evidence-scope note).

| # | Decision | Resolution | Verified against code? |
| --- | --- | --- | --- |
| **U1** | DS Corp company/enrolment | Use the existing application→company promotion workflow. **Registration number is the primary match.** A **name-only match must be reviewed before linking or updating a company** — never auto-link on name. Create/update the `companies` row, set `company_id` on the `grant_application` node, then create the enrolment. **Confirm the programme/cohort from authoritative data — do not infer it.** **Production promotion/enrolment is a separate operator action and must NOT block starting local implementation.** | ✅ Workflow exists: `GrantApplicationService::dryRunImportToCompanies` (`GrantApplicationService.php:115-133`) matches by `registration_no` then `name`; `executeImportToCompanies` (`:166-190`) updates/creates the company and sets `company_id` on the node; `Company::getByRegistrationNo`/`getByName` (`Company.php:149,157`); undo path `undoImportToCompanies` (`:314`). ⚠️ The existing workflow is **not** review-gated on name-only matches — the amendment is a **new requirement** on top of it. |
| **U2** | Enrolment selection | Explicit user selection; the visit stores `categories_item_id`; never auto-pick. | ✅ |
| **U3** | No-funding-row projection | Return **`unknown`** per state, never `0`. | ✅ |
| **U4** | `utilised` representation | Capture utilisation **separately** as `unknown / not_started / partial / full`, with **observation date, explanation and evidence references**. The funding projection derives its utilisation state from these observations only. **Payment or delivery alone cannot establish utilisation.** | ✅ New field(s) — no existing equivalent (§2.2). |
| **U5** | Vision reachability | Expose existing `company_vision` through the Company capability; add editing to the current company profile. **A deterministic read (`updated_at DESC, id DESC`) alone does not resolve conflicting values.** Flag duplicates, **select the canonical record explicitly where values conflict**, and ensure the editor updates **that same** record. | ✅ Node read is unordered `SELECT *` (`Node.php:114-120`) and the UI silently takes `visions[0]` (`strategy-tab.component.ts:254-255`). |
| **U6** | Scale labels | Adopt **Critical Deficit / Basic-Emergent / Operational / Proficient / Best Practice**, stored in the versioned framework; missing and N/A stay separate. | ✅ §3.1 |
| **U7** | Migration numbering | **#27** = assessments framework; **#28** = GPS assessment provenance; use the `-phase2` naming, not the patch `b` suffix. | ✅ §6 |
| **U8** | Link actor-reachability | **Harden before the first new Session-link use — including Sprint 011 if applicable.** Company matching alone does not prove permission to access every linked record. Add a scoped fix + tests. **Must not be deferred to Sprint 012 only.** | ✅ Claim exists (`2026-09-23-sessions.sql:230-231`) but is not implemented (`ManageSessionLinks.php:45-49`). |

### U1 — name-match review gate (locked)

`dryRunImportToCompanies` currently falls back to a **name** match (`GrantApplicationService.php:127-133`) and
`executeImportToCompanies` then **updates that company** — with no review step. Locked rule: a **name-only**
match is surfaced for **explicit review**; only a **registration-number** match may proceed automatically.
A name-only match must never silently link or overwrite a company.

### U5 — multi-record vision resolution rule (to be locked)

The legacy reader takes the **first unordered row** (`strategy-tab.component.ts:254-255`; `Node.php:117`
`SELECT *` with no `ORDER BY`). Because ordering is non-deterministic, the rule must not depend on row order.

**Rule (locked):** a company has **at most one** *current* `company_vision` record.
- **Read:** select deterministically by `updated_at DESC, id DESC`. Determinism alone is **not** conflict
  resolution — it only makes the reader stable.
- **Duplicates:** flag companies with more than one `company_vision` record. Where duplicates hold
  **conflicting values**, an **explicit canonical selection** is recorded (which node id is authoritative);
  the reader returns that record; the others are preserved, not deleted.
- **Write:** the editor updates **the same canonical record**. It must not create a second record or write to
  whichever row sorts first.
- Existing duplicates remain reachable via the node archive; a one-off reconciliation report lists them.

### Evidence-scope correction (must be stated honestly)

Every row count and the "DS Corp has no company row" statement in §2.4 were established from the
**repository's `api-incubator-os/db.sql` dump** (and the `docs/00track/` markdown), **not** from a live query.
Code reconnaissance alone cannot establish current production data. Each such claim must be restated as:

> *Source: repository `db.sql` export, viewed 2026-09-25. Not a live production read.*

This applies to: `company_purchases` 108 rows, `grant_application` 344 rows, `company_vision` sample row,
and the DS Corp "no `companies` row" finding. **U1 must be executed against production data at deployment
time**, not assumed from the dump.

---

## 8. Decision outcomes

| # | Decision | Outcome | Owner |
| --- | --- | --- | --- |
| U1 | **DS Corp has no `companies` row / no enrolment.** A site visit cannot be issued without both. | ✅ Resolved in §7 — use the application→company promotion workflow (match by reg no, then name); confirm the enrolment from authoritative data | Product |
| U2 | Enrolment selection rule (D.3) — which `categories_item` for a multi-enrolment company? | Explicit user selection; report stores `categories_item_id`; never auto-pick. Confirmed. | Product |
| U3 | Funding projection when the beneficiary has no company/funding rows | Return **`unknown`** per state, never `0`. Confirmed as a rule. | Engineering |
| U4 | `utilised` state — which fields constitute it | ✅ Resolved in §7 — `unknown / not_started / partial / full` + observation date, explanation, evidence refs; payment/delivery cannot establish it | Product |
| U5 | Vision/mission **reachability** — editors currently unreachable | ✅ Resolved in §7 — expose via Company capability, add editing to the current profile, deterministic multi-record rule | Engineering |
| U6 | `assessment_scales.descriptors_json` exact labels | ✅ Resolved in §7 — Critical Deficit / Basic-Emergent / Operational / Proficient / Best Practice | Product |
| U7 | #27 vs #28 and the `b` naming | ✅ Resolved in §7 — #27 + #28, `-phase2` naming | Engineering |
| U8 | `session_entity_links` actor-reachability claimed but not enforced | ✅ Resolved in §7 — scoped hardening + tests **before** extending Session links | Engineering |

## 9. Definition of Done — evidence checklist

- [x] Every D1/D2/D3 field has a source and an action (§1, §2, §3).
- [x] Every duplication-register item has a decision.
- [x] The three contracts are written (visit, assessment, snapshot).
- [x] The criteria seed **shape** is agreed (§3.4); final weights at sign-off.
- [x] The enrolment and funding-projection rules are written (§7 U2/U3).
- [x] Migration numbering resolved (§6, §7 U7).
- [x] U1, U4, U5, U6, U8 have code-checked resolutions (§7).
- [ ] **Binding sign-off** on the §7 register — the only remaining step before Sprint 011 Phase 1.
- [ ] Migration **#25 production verification** confirmed as the prerequisite for #26–#28.
