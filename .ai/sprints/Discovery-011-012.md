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
| **D2** | `DIAGNOSTIC ASSESSMENT & NEEDS ANALYSIS` | 14-page template | Incomplete and populated from an **unrelated industrial beneficiary** — treat as *field list*, not truth |
| **D3** | `Needs Analysis` (`ESD-NAT-2026-V1`) | 4-page framework template | Clean scoring framework + tier bands + example support plan |

**Warning (carried into both sprints):** D2's *current-state* answers do **not** describe DS Corp.
Its value is the **question and section set** only. D1 is the only document whose answers are real.

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

- [ ] **D.1** Walk every field in D1, D2 and D3 against the *Source Documents → canonical mapping*
      tables and confirm each line with a code read (`file_path:line`).
- [ ] **D.2** Inspect **representative company payloads** (`companies`, `company_vision`,
      `categories_item`, funding nodes) for the real beneficiary set — note conflicting values.
      Do **not** inspect live production records from the agent; use local/provided extracts.
- [ ] **D.3** Confirm the sponsorship/enrolment rule: DS Corp → which `categories_item` row
      (`program_id`, `cohort_id`, `client_id`)? Record the exact selection rule.
- [ ] **D.4** Confirm the funding projection: which tables/nodes are read for
      *committed / paid / delivered / utilised*, and reconcile table-vs-node purchase data for a
      sample beneficiary.
- [ ] **D.5** Select the assessment foundation and record the decision (normalized capability) with
      a one-paragraph rationale.
- [ ] **D.6** Reconcile the D3 1–5 scale against the D2 1–5 scale into **one** scale definition.
- [ ] **D.7** Agree the `assessment_criteria` seed set (D3 dimensions + D2 domains) with codes.
- [ ] **D.8** Resolve the `session_entity_links` canonical-name vs frontend-alias mapping.
- [ ] **D.9** Sign off the ownership rules and contracts as the frozen input to Sprint 011 / 012.

## Exit Criteria

- [ ] Every field in D1, D2 and D3 appears in a mapping table with a **source** and an **action**.
- [ ] Every item in the Duplication Register has a decision (fix now / defer with owner).
- [ ] The three contracts (visit, assessment, snapshot) are agreed and written.
- [ ] The `assessment_criteria` seed list is final with stable codes.
- [ ] The enrolment selection rule and the funding projection rule are written.
- [ ] No open question remains that would force an implementation agent to guess.

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
- Reconciling the **contents** of D2 (it describes the wrong beneficiary).

---

## Future Modules (Reserved)

| Module | Why deferred |
| --- | --- |
| Purchase data reconciliation (table vs node) | Needs a migration + dedupe pass; out of scope here |
| Legacy `consolidated_assessment` migration into the new capability | Requires a mapping exercise and progress repair |
| Multi-beneficiary sponsor reporting / portfolio roll-up | Separate reporting capability |
| SANAS audit export bundle | Depends on both sprints being complete |
