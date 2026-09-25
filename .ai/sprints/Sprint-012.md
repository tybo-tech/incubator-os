# Sprint 012 — Needs Analysis (versioned diagnostic & intervention traceability)

> **Program**: Incubator OS — ESD / B-BBEE beneficiary support (Statement 400, Clause 4.15)
> **Status**: Draft — ready for implementation **after Discovery-011-012 sign-off and Sprint 011**
> **Baseline**: `main` (Sprint 011 Site Visits delivered)
> **Depends on**: `.ai/sprints/Discovery-011-012.md`; **Sprint 011** (company profile gaps, task links, snapshot/export patterns)
> **Duration**: Multi-phase (6 phases, sequential execution)
> **Inputs**: `Needs Analysis` (D3, `ESD-NAT-2026-V1`) and `DIAGNOSTIC ASSESSMENT & NEEDS ANALYSIS` (D2 — questions only)
> **Previous work (locked capabilities)**: Company, Categories/Cohorts, Sessions, normalized SWOT/GPS (`gps_targets`/`gps_target_tasks`), Results/Achievements (`achievements`, `achievement_evidence`), metric bindings.

---

## Objective

Replace the duplicated, node-based assessment material with **one versioned diagnostic capability** that can
produce a DS Corp-style diagnostic from the two source templates, score it with explicit rules, and trace every
intervention to the finding that caused it and the result it produced.

This sprint delivers:

1. A **versioned, published assessment framework** — dimensions, criteria, a score scale and tier bands.
2. **Repeatable assessments** — a `baseline` and later `reassessment`s, comparable per dimension and per criterion.
3. **Structured findings** — per criterion: score, applicable/not-applicable, observation, identified gap, evidence.
4. **An explicit scoring engine** — missing vs not-applicable, weighted denominators, incomplete handling, tiering.
5. **Prioritised needs and agreed interventions** — with budgets, owners and links to funding.
6. **Expected results** — short-term **outputs** and long-term **outcomes**, reusing Results/Achievements for
   measurable outcomes.
7. **Traceability** — a GPS target created from an assessment records the exact `assessment_id` +
   `assessment_finding_id` (closing the existing provenance gap where `source_type='assessment'` has no id).
8. **Finalisation, sign-off and export** — a frozen, auditable assessment version.

**Explicitly not this sprint:** migrating the legacy `consolidated_assessment` nodes; the two form systems;
Sprint 011's visit report; SANAS audit bundles.

---

## Existing Foundation (Locked)

Must **NOT** be redesigned. Reuse or expose only.

* **Capability convention** — `capabilities/{feature}/` + thin `api/{feature}/queries|commands/{file}.php`
  endpoints. **No logic in `api-nodes/`.**
* **`helpers/AuthGuard.php`** — `auth_require_user`, `auth_require_company_access`. Tenant `1`, server-derived.
* **`core/Infrastructure/TransactionManager.php`** — command handlers own the transaction.
* **`companies` / `users`** — identity and directors; do not duplicate.
* **`categories` / `categories_item`** — enrolment (`client`/`program`/`cohort`). Assessments bind to an enrolment.
* **`gps_targets` / `gps_target_tasks` / `gps_target_sources`** — the execution layer. `gps_target_sources`
  already allows `source_type='assessment'`; this sprint adds the missing concrete provenance columns.
* **`achievements` / `achievement_evidence`** — measurable outcomes and evidence; reuse, do not reinvent.
* **`company_vision`, Sessions, Calendar** — read-only context.
* **Angular** — lazy routes under `CompanyShellComponent`; `.sw-*` popup contract; `app-icon`; `ViewStateService`.
* **Legacy `consolidated_assessment` node + `questionnaire.service.ts`** — **do not modify**; the new capability
  supersedes them by *addition*, not replacement. Their migration is reserved.

---

## Business Capabilities

| Capability | Introduces / Extends |
| --- | --- |
| Assessment framework | **Introduces** — versioned dimensions, criteria, scale and tier bands |
| Assessment | **Introduces** — a repeatable, company-scoped, enrolment-bound diagnostic with a lifecycle |
| Diagnostic findings | **Introduces** — per-criterion score/observation/gap/evidence |
| Scoring engine | **Introduces** — explicit weighted scoring, applicability and incomplete rules |
| Needs & interventions | **Introduces** — prioritised needs, agreed interventions, budgets, owners |
| Expected results | **Introduces** — outputs/outcomes per intervention; outcomes reuse Achievements |
| Assessment snapshots | **Introduces** — frozen finalised versions + sign-off + export |
| Findings / Results / Achievements | **Extends** — assessment provenance on GPS sources |
| Assessment UI | **Introduces** — list, scoring workspace, needs/interventions, comparison, sign-off |

---

## Domain Model

```
assessment_frameworks ──1:N── assessment_framework_dimensions ──1:N── assessment_criteria
        │  └──1:1── assessment_scales (per framework)                          │
        │                                                                     │
        │  ┌──────────────────────────────────────────────────────────────────┘
        ▼  ▼
companies ──1:N── assessments (framework_id, assessment_type, categories_item_id)
                      │  ├──1:N── assessment_findings (criterion_id UNIQUE per assessment)
                      │  ├──1:N── assessment_needs
                      │  │            └──1:N── assessment_interventions ──0:1── gps_targets
                      │  │                                   └──1:N── assessment_expected_results ──0:1── achievements
                      │  ├──0:1── baseline_assessment_id ──> assessments (self FK)
                      │  └──1:N── assessment_versions (frozen snapshots)
                      └──1:N── assessment_signoffs
```

### Collections

| Collection | Owner | Key fields |
| --- | --- | --- |
| `assessment_frameworks` | `capabilities/assessments` | `framework_key` (UNIQUE, e.g. `ESD-NAT-2026-V1`), `title`, `version` (INT), `status` (`draft`\|`published`\|`archived`), `max_points`, `tier_json`, `source_ref`, `published_at`, `published_by`, `created_by` |
| `assessment_framework_dimensions` | same | `framework_id`, `code`, `title`, `sort_order`, `weight` |
| `assessment_criteria` | same | `framework_id`, `dimension_id`, `code`, `title`, `description`, `assessment_domain`, `weight`, `sort_order`, `evidence_expectation`; UNIQUE `(framework_id, code)` |
| `assessment_scales` | same | `framework_id`, `min_score`, `max_score`, `descriptors_json` (1–5 labels: **Critical Deficit / Basic-Emergent / Operational / Proficient / Best Practice**) |
| `assessments` | same | `company_id`, `categories_item_id`, `framework_id`, `assessment_type` (`baseline`\|`reassessment`), `baseline_assessment_id`, `assessment_date`, `assessor_user_id`, `title`, `status` (`draft`\|`in_progress`\|`finalised`), `current_version`, `finalised_at`, `finalised_by`, `version` |
| `assessment_findings` | same | `assessment_id`, `criterion_id`, `score` (NULL = unanswered), `is_applicable`, `observation`, `gap`, `evidence_ref`, `version`; UNIQUE `(assessment_id, criterion_id)` |
| `assessment_needs` | same | `assessment_id`, `dimension_code`, `priority`, `title`, `rationale`, `sort_order` |
| `assessment_interventions` | same | `assessment_id`, `need_id`, `intervention_type`, `title`, `description`, `responsible_user_id`, `responsible_label`, `budget_amount`, `funding_ref`, `gps_target_id` |
| `assessment_expected_results` | same | `intervention_id`, `result_type` (`output`\|`outcome`), `metric`, `target_value`, `target_period`, `achievement_id` |
| `assessment_versions` | same | `assessment_id`, `version_no`, `snapshot_json`, `score_json`, `dimension_scores_json`, `final_score`, `percentage`, `tier`, `finalised_by`, `finalised_at`; UNIQUE `(assessment_id, version_no)` |
| `assessment_signoffs` | same | `assessment_id`, `role` (`assessor`\|`reviewer`\|`beneficiary`\|`sponsor`), `name`, `designation`, `signed_at`; UNIQUE `(assessment_id, role)` |

All new tables carry `tenant_id INT NOT NULL DEFAULT 1` and `created_at`/`updated_at`.

### Lookup Collections

| Lookup | Values | Source |
| --- | --- | --- |
| framework `status` | `draft`, `published`, `archived` | enum column |
| assessment `status` | `draft`, `in_progress`, `finalised` | enum column |
| `assessment_type` | `baseline`, `reassessment` | enum column |
| `priority` | `critical`, `high`, `medium`, `low` | enum column |
| `intervention_type` | `grant`, `training`, `mentorship`, `compliance`, `working_capital`, `market_access`, `other` | enum column |
| `result_type` | `output`, `outcome` | enum column |
| sign-off `role` | `assessor`, `reviewer`, `beneficiary`, `sponsor` | enum column |
| tier band | defined in `tier_json` — `High Support`, `Growth`, `Enterprise Ready` | framework data |

### Collection Links

| Link | Kind | Cascade |
| --- | --- | --- |
| `assessment_framework_dimensions.framework_id` → `assessment_frameworks.id` | FK | `ON DELETE CASCADE` |
| `assessment_criteria.framework_id` / `.dimension_id` | FK | `ON DELETE CASCADE` |
| `assessment_scales.framework_id` | FK, UNIQUE | `ON DELETE CASCADE` |
| `assessments.company_id` → `companies.id` | FK | `ON DELETE CASCADE` |
| `assessments.categories_item_id` → `categories_item.id` | FK | `ON DELETE SET NULL` |
| `assessments.framework_id` → `assessment_frameworks.id` | FK | `ON DELETE RESTRICT` |
| `assessments.baseline_assessment_id` → `assessments.id` | FK | `ON DELETE SET NULL` |
| `assessment_findings.assessment_id` / `.criterion_id` | FK | `ON DELETE CASCADE` |
| `assessment_needs.assessment_id` / `assessment_interventions.need_id` | FK | `ON DELETE CASCADE` |
| `assessment_interventions.gps_target_id` → `gps_targets.id` | FK | `ON DELETE SET NULL` |
| `assessment_expected_results.achievement_id` → `achievements.id` | FK | `ON DELETE SET NULL` |
| `assessment_versions.assessment_id` / `assessment_signoffs.assessment_id` | FK | `ON DELETE CASCADE` |
| `gps_target_sources.assessment_id` / `.assessment_finding_id` | FK (new) | `ON DELETE SET NULL` |

### Invariants

1. A criterion belongs to exactly one dimension and one framework; codes are unique within a framework.
2. A **published** framework is immutable; any change creates a new framework `version`.
3. An assessment references a **published** framework and belongs to exactly one company.
4. `assessment.company_id` must equal the enrolment's `company_id`.
5. `(assessment_id, criterion_id)` is unique; a finding's criterion must belong to the assessment's framework.
6. **Unanswered is not not-applicable.** `score IS NULL` with `is_applicable = 1` is *unanswered*;
   `is_applicable = 0` is *not applicable* and is excluded from the denominator.
7. The denominator sums **weights of applicable criteria only**, multiplied by the scale `max_score`.
8. An assessment with any unanswered applicable criterion is **incomplete** and cannot be finalised or tiered.
9. `assessment_type = 'reassessment'` may carry a `baseline_assessment_id`; that baseline must be
   `finalised`, the same company and the same framework.
10. Finalising writes an immutable `assessment_versions` row and freezes the assessment; corrections create a
    **new version** (the prior version is retained).
11. An intervention's `gps_target_id` (when set) must belong to the same company; creating it also writes a
    `gps_target_sources` row with `source_type='assessment'`, `assessment_id` and `assessment_finding_id`.
12. `funding_ref` is a **reference string only** — no funding amount is stored on an intervention beyond its
    own `budget_amount`; the funding position is never inferred as realised here.
13. Expected-result `achievement_id` (when set) must belong to the same company; the assessment never
    creates or verifies an achievement itself.
14. Legacy nodes (`consolidated_assessment`, `form_submission`) are never read or written by this capability.

---

## Architecture Decisions

1. **A new capability pair** `capabilities/assessments/` + `api/assessments/` (feature `Assessments`,
   `dependsOn: ["Companies", "GpsTargets", "Achievements", "Categories"]`). Assessments are a first-class
   domain with their own lifecycle, versioning and scoring; none of the existing owners should host it.
2. **The framework is data, not code.** Dimensions, criteria, weights, scale descriptors and tier bands live
   in tables and are **versioned**; the scoring engine is generic. Adding D2's domains is a data change.
3. **Score is a plain number; applicability is a separate flag.** This makes "missing" and "N/A"
   distinguishable and fixes the legacy >100% defect without migrating it.
4. **Scoring is a pure service** (`AssessmentScoringService`) — given findings + framework it returns raw,
   per-dimension, percentage, completeness and tier. It writes nothing, so it can be unit-tested directly.
5. **Interventions link outward, they do not own execution.** A target is created through the existing GPS
   API and then linked; outcomes reuse Achievements. The assessment never mutates those domains.
6. **Provenance is written in the same transaction as the link.** Creating a target from a finding writes both
   `assessment_interventions.gps_target_id` and the `gps_target_sources` row, so the finding→target chain is
   never half-written.
7. **Finalisation is a version, not a flag.** The audit record is `assessment_versions.snapshot_json`; the
   live assessment can be superseded without losing history.
8. **Comparison is derived on read** from two finalised versions' `dimension_scores_json`; nothing extra is
   stored.
9. **Export reuses the Sprint 011 DOMPDF path** and reads the frozen version only.
10. **The form/questionnaire UI is reused for presentation patterns only** — the scoring grid is bespoke because
    it must show score + applicability + observation + gap per criterion with live weighting, which the
    existing form renderer does not model.
11. **Enrolment is explicit**, exactly as in Sprint 011 — never the first enrolment.

---

## Scoring Contract (locked)

Given a framework (dimensions → criteria → weights, scale `min..max`) and an assessment's findings:

* `contribution(criterion) = is_applicable ? (score × weight) : 0`
* `dimensionRaw(d) = Σ contribution(c)` for criteria in `d`
* `dimensionMax(d) = Σ weight(c) × scale.max_score` for **applicable** criteria in `d`
* `frameworkRaw = Σ dimensionRaw(d)`; `frameworkMax = Σ dimensionMax(d)`
* `percentage = frameworkMax > 0 ? round(frameworkRaw / frameworkMax × 100, 1) : 0`
* `complete = every applicable criterion has a non-NULL score`
* `tier`: `complete ? bandFor(percentage) : null` using the framework `tier_json` bands
* `notApplicable` criteria are excluded from both numerator and denominator.

**Seed framework `ESD-NAT-2026-V1`** (D3 + D2 domains), `max_points = 80`, scale `1..5`:

| Dim | Code | Title | Weight |
| --- | --- | --- | --- |
| A | `gov_compliance_fin` | Governance, Compliance & Financial | 4 |
| B | `tech_ops_safety` | Technical, Operations & Safety | 4 |
| C | `human_capital` | Human Capital & Skills | 4 |
| D | `market_commercial` | Market Access & Commercial | 4 |

Tier bands: `< 50%` → High Support · `50–74.9%` → Growth · `≥ 75%` → Enterprise Ready.
Criteria are seeded from D3's four dimensions plus D2's domains (Compliance & Statutory Reporting, Governance
ESG, Strategy Planning, Financial Management & Cashflow, Product & Service Development, Marketing & Sales,
Technical & Equipment Capacity, Human Capital & Skills, Start-up Costs & Assets). Every criterion carries an
`evidence_expectation`. Weights within a dimension sum to the dimension weight.

---

## API Contract

Base `{ApiBase}api/assessments`. `withCredentials` everywhere. Server-derived: actor, tenant, timestamps,
scorer identity, version contents.

### Queries

| Method | Endpoint | Returns |
| --- | --- | --- |
| `GET` | `queries/frameworks.php` | Published/archived frameworks with dimensions, criteria, scale and tier bands. |
| `GET` | `queries/list.php?company_id=` | Company assessments (type, framework, status, score, tier, date). |
| `GET` | `queries/get.php?id=` | Full assessment: findings by dimension, live score, needs, interventions, results, sign-offs. |
| `GET` | `queries/score.php?id=` | The pure scoring result (raw, per dimension, percentage, complete, tier). |
| `GET` | `queries/comparison.php?baseline_id=&reassessment_id=` | Per-dimension and per-criterion deltas between two finalised assessments. |
| `GET` | `queries/versions.php?id=` | Finalised versions (`version_no`, score, tier, finalisedBy/At). |
| `GET` | `queries/export.php?id=&version=` | The frozen version rendered as PDF. |

### Commands

| Endpoint | Body | Purpose |
| --- | --- | --- |
| `commands/create.php` | `{ companyId, frameworkId, categoriesItemId, assessmentType, baselineAssessmentId?, assessmentDate?, title? }` | Create a draft assessment bound to a published framework. |
| `commands/finding.php?id=` | `{ criterionId, score, isApplicable, observation, gap, evidenceRef, version }` | Upsert one finding (optimistic `version`). |
| `commands/needs.php?id=&action=add\|update\|delete\|reorder` | need fields | Manage prioritised needs. |
| `commands/interventions.php?id=&action=add\|update\|delete` | intervention fields | Manage interventions. |
| `commands/results.php?id=&action=add\|update\|delete` | result fields | Manage expected outputs/outcomes. |
| `commands/link-target.php?id=` | `{ interventionId, targetId }` or `{ interventionId, createFromFinding }` | Link (or create + link) a GPS target and write the `gps_target_sources` provenance row. |
| `commands/signoff.php?id=&action=set\|clear` | `{ role, name, designation }` | Set/clear a sign-off. |
| `commands/finalise.php?id=` | `{ version }` | `draft/in_progress → finalised`: require complete, snapshot, version++. |
| `commands/supersede.php?id=` | `{ version }` | Create a new draft version from a finalised assessment. |
| `commands/framework-publish.php` | `{ frameworkId, version }` | Publish a draft framework (SA/Coordinator only). |

### HTTP outcomes

| Status | When |
| --- | --- |
| `200` / `201` | Success (`CommandResult` envelope) |
| `400` | Malformed request |
| `401` | No active session |
| `403` | Other company / framework publish not permitted |
| `404` | Assessment / finding / criterion / version not found |
| `409` | `ASSESSMENT_FROZEN`, `ASSESSMENT_INCOMPLETE`, `ASSESSMENT_INVALID_TRANSITION`, `ASSESSMENT_BASELINE_MISMATCH`, `FRAMEWORK_NOT_PUBLISHED`, `FRAMEWORK_IMMUTABLE`, stale `version`, duplicate criterion/sign-off |
| `422` | Structured validation `{error, errors:{field:message}}` |

Machine-readable codes: `ASSESSMENT_FROZEN`, `ASSESSMENT_INCOMPLETE`, `ASSESSMENT_INVALID_TRANSITION`,
`ASSESSMENT_BASELINE_MISMATCH`, `FRAMEWORK_NOT_PUBLISHED`, `FRAMEWORK_IMMUTABLE`, `CRITERION_MISMATCH`.

---

## Permission Matrix

Roles are **Director / System Administrator / Coordinator / Judge** (no "Coach" role exists).

| Action | SA / Coordinator | Director / Judge |
| --- | --- | --- |
| Publish / archive a framework | ✅ | ❌ |
| View frameworks | ✅ | ✅ |
| Create / edit an assessment in own company | ✅ | ✅ |
| Finalise / supersede / sign off | ✅ | ✅ (own company) |
| Link a target / create from a finding | only if already authorised for Targets | same |
| Read another company's assessment | ✅ | ❌ |
| Export a finalised version | ✅ | ✅ (own company) |

Assessment access **never** grants access to a linked target/achievement; links respect the viewer's
authorisation, mirroring Sessions.

---

## Routes

| Surface | Route | Change |
| --- | --- | --- |
| Company assessments | `company/:id/assessments` | New list page |
| Assessment workspace | `company/:id/assessments/:assessmentId` | New scoring workspace |
| Assessment comparison | `company/:id/assessments/:assessmentId/compare/:baselineId` | New comparison view |
| Company shell nav | — | New "Assessments" nav item |
| Legacy assessment tab | `company/:id/assessment` | **Untouched**; a note may link to the new capability |

---

## Phases

### Phase 1 — Framework schema and seed

Create the framework, dimension, criterion and scale tables and seed `ESD-NAT-2026-V1`.

#### Tasks

- [ ] **1.1** Add migration `api-incubator-os/migrations/2026-09-26-assessments-framework.sql` — run order **#27**.
  (Numbering corrected by Discovery: the GPS-provenance file becomes **#28**, one file per run order.)
  Creates `assessment_frameworks`, `assessment_framework_dimensions`, `assessment_criteria`,
  `assessment_scales` with the FKs/UNIQUE/indexes from the Domain Model. Idempotent (`IF NOT EXISTS` +
  guarded checks). Header documents rollback (drop the 4 tables).
- [ ] **1.2** Seed `ESD-NAT-2026-V1` (status `published`, `max_points = 80`, tier bands) with its scale
  descriptors, 4 dimensions (weights 4 each) and the criterion set derived from D3 + D2, each with a stable
  `code`, `weight` and `evidence_expectation`. Seeds use `ON DUPLICATE KEY UPDATE` on `framework_key`/`code`.
- [ ] **1.3** Add the run-order #27 row to `api-incubator-os/migrations/README.md`.
- [ ] **1.4** Add `capabilities/assessments/feature.json` (`Assessments`, queries/commands,
  `dependsOn: ["Companies","GpsTargets","Achievements","Categories"]`).
- [ ] **1.5** Add `Contracts/AssessmentVocabulary.php` — statuses, types, priorities, intervention types,
  result types, sign-off roles, tier labels + validators.
- [ ] **1.6** Add `Contracts/FrameworkResponse.php`, `AssessmentResponse.php`, `AssessmentScoreResponse.php`,
  `AssessmentComparisonResponse.php`, `AssessmentVersionResponse.php`.

#### Exit Criteria

- [ ] Migration #27 applies **twice** safely; creates 4 tables + seeds the framework, 4 dimensions and the
  criterion set without duplicating on re-run.
- [ ] The seed's dimension weights sum to 16 so a full score of 5 yields 80/80 = 100%.
- [ ] `php -l` clean on every new file.

---

### Phase 2 — Assessment repository, scoring engine and lifecycle

Build the read/write core and the pure scorer.

#### Tasks

- [ ] **2.1** Add `Repository/AssessmentRepository.php` — framework/dimension/criterion/scale reads;
  assessment CRUD; finding upsert/list; needs/interventions/results CRUD; version insert/list; sign-off
  upsert/clear. No transactions.
- [ ] **2.2** Add `Services/AssessmentScoringService.php` — the pure Scoring Contract implementation
  (contribution, dimension raw/max, percentage, completeness, tier). No persistence.
- [ ] **2.3** Add `Services/AssessmentStateMachine.php` — `draft → in_progress → finalised`; finalised frozen;
  `supersede` creates a new draft. Illegal transitions return `ASSESSMENT_INVALID_TRANSITION`.
- [ ] **2.4** Add `Services/AssessmentValidator.php` — published-framework requirement, company/enrolment match,
  criterion-belongs-to-framework, baseline rules, finalise completeness.
- [ ] **2.5** Add `Services/AssessmentService.php` — orchestration, `CommandResult` envelope, audit writes.
- [ ] **2.6** Add `Services/FrameworkService.php` — read framework, publish a draft (immutability guard),
  archive. Publish/archive are SA/Coordinator-only.
- [ ] **2.7** Add `Services/AssessmentSnapshotBuilder.php` — freeze `snapshot_json`, `score_json`,
  `dimension_scores_json`, score/percentage/tier into `assessment_versions`.
- [ ] **2.8** Add endpoints `api/assessments/queries/{frameworks,list,get,score,versions}.php` and
  `api/assessments/commands/{create,finding,needs,interventions,results,signoff,finalise,supersede,framework-publish}.php`
  + `_bootstrap.php`, following the existing endpoint pattern.

#### Exit Criteria

- [ ] `score.php` returns the same result as a direct `AssessmentScoringService` unit test for the same input.
- [ ] A not-applicable criterion is excluded from numerator and denominator; an unanswered applicable criterion
  makes the assessment `complete = false`.
- [ ] Finalising an incomplete assessment returns `409 ASSESSMENT_INCOMPLETE` and writes nothing.
- [ ] Finalising a complete assessment writes exactly one immutable version and freezes the assessment; a
  content write afterwards returns `ASSESSMENT_FROZEN`.
- [ ] A framework can be published once; a second publish or any edit to a published framework returns
  `FRAMEWORK_IMMUTABLE`.
- [ ] A `baseline` with no baseline id and a `reassessment` with a baseline from another company/framework is
  rejected (`ASSESSMENT_BASELINE_MISMATCH`).

---

### Phase 3 — Needs, interventions and result traceability

Connect the diagnostic to execution without duplicating it.

#### Tasks

- [ ] **3.1** Implement needs/interventions/results CRUD through `AssessmentService` with the same draft-only
  guard and version conventions.
- [ ] **3.2** Add `Services/InterventionLinkService.php` — link an existing `gps_target_id`, or create a target
  through the GPS repository and link it; in **one transaction** write `assessment_interventions.gps_target_id`
  and the `gps_target_sources` row (`source_type='assessment'`, `assessment_id`, `assessment_finding_id`).
- [ ] **3.3** Add migration `api-incubator-os/migrations/2026-09-26b-assessments-phase2-gps-provenance.sql` — additive,
  `information_schema`-guarded `ALTER TABLE gps_target_sources` adding `assessment_id BIGINT NULL` and
  `assessment_finding_id BIGINT NULL` with FKs (`ON DELETE SET NULL`) + indexes. Run order **#28** (separate
  file; the `b` patch suffix is reserved for patches and the phased `-phase2` convention is used instead —
  Discovery §6). Rollback documented.
- [ ] **3.4** Add `Application/Commands/LinkAssessmentTarget.php` + endpoint `commands/link-target.php`.
- [ ] **3.5** Add `Services/ResultLinkService.php` — link an existing `achievement_id` to an outcome result;
  never create/verify achievements here.
- [ ] **3.6** Ensure `docs/` records the `assessment_id`/`assessment_finding_id` provenance on
  `gps_target_sources` and the `source_type='assessment'` write path.
- [ ] **3.7** **Harden Session link actor-reachability before extending any Session link use** (Discovery U8).
  `session_entity_links.entity_id` is polymorphic with no FK, and the migration comment claims linked records
  must be "reachable by the actor" (`2026-09-23-sessions.sql:230-231`) but `ManageSessionLinks.php:45-49`
  enforces **company match only**. Add an explicit actor-reachability check for the link types this sprint
  touches (at minimum `gps_target`, `gps_target_task`) plus tests. If the fix is deferred, record it as a
  **known defect** and do **not** rely on reachability being enforced.

#### Exit Criteria

- [ ] Creating a target from a finding writes the target, the intervention link and the source row atomically;
  a failure writes none.
- [ ] `gps_target_sources` for that target has non-null `assessment_id` and `assessment_finding_id`.
- [ ] Linking the same target twice does not duplicate the source row.
- [ ] An outcome result links an existing achievement; no achievement is created by any assessment endpoint.
- [ ] A target from another company is rejected.

---

### Phase 4 — Comparison, finalisation, sign-off and export

Make the diagnostic auditable and comparable.

#### Tasks

- [ ] **4.1** Add `Services/AssessmentComparisonService.php` — derive per-dimension and per-criterion deltas
  between two finalised versions of the same framework/company.
- [ ] **4.2** Add endpoint `api/assessments/queries/comparison.php`.
- [ ] **4.3** Add `Services/AssessmentExporter.php` — render a frozen `assessment_versions.snapshot_json` to PDF
  via the repo's DOMPDF path; `queries/export.php` streams it; version-addressable.
- [ ] **4.4** Complete the audit trail: create, each finding/needs/intervention/result mutation, finalise,
  supersede, sign-off and export each produce a structured audit entry with the actor; snapshot content is
  never logged.
- [ ] **4.5** Write `docs/assessment-api.md` — endpoints, framework/versioning rules, the Scoring Contract,
  lifecycle, codes, provenance chain and the incomplete/NA rules.

#### Exit Criteria

- [ ] Comparison between a baseline and a reassessment returns correct per-dimension and per-criterion deltas.
- [ ] Comparison of assessments from different frameworks/companies returns a clear error, not a wrong delta.
- [ ] Export of a finalised assessment matches `snapshot_json`; editing live data afterwards does not change it.
- [ ] Export of an unfinalised assessment returns a clear error/`409`.
- [ ] Every mutation is auditable; no snapshot payload appears in any log.

---

### Phase 5 — Angular assessment surfaces

Build the frontend.

#### Tasks

- [ ] **5.1** Add `src/app/features/assessments/models/assessment.models.ts` — framework, assessment, finding,
  need, intervention, result, score, comparison, version and enum types.
- [ ] **5.2** Add `src/app/features/assessments/services/assessment.service.ts` — every endpoint with
  `withCredentials`, safe error-code mapping.
- [ ] **5.3** Add `assessments-page.component.ts` — company list (type, framework, status, score, tier, date)
  with filters, search and loading/empty states; `ViewStateService` key `assessments-view:${companyId}`.
- [ ] **5.4** Add `assessment-workspace.component.ts` — dimension-grouped scoring grid: per criterion the
  score control (scale), an applicable/not-applicable toggle, observation, identified gap and evidence; a live
  score panel (raw, per dimension, percentage, completeness, tier); needs/interventions/results panels; sign-off;
  finalise/export gating.
- [ ] **5.5** Add `assessment-comparison.component.ts` — baseline vs reassessment per-dimension and per-criterion
  movement with clear "improved/stalled/declined" indicators.
- [ ] **5.6** Add `intervention-editor.component.ts` and `assessment-signoff-dialog.component.ts` following the
  `.sw-*` popup contract (no outside-click close; fixed head/foot, scrollable body; focus on open).
- [ ] **5.7** Add routes `company/:id/assessments`, `.../:assessmentId`, `.../:assessmentId/compare/:baselineId`,
  and an "Assessments" nav item; add a link/note from the legacy assessment tab to the new capability (legacy
  code untouched).
- [ ] **5.8** Create a target from a finding through the existing Targets flow and link it; show the live target
  status in the workspace and the frozen status in a finalised version.
- [ ] **5.9** Add a disabled/"not applicable" state that is visually distinct from "unanswered", with icon +
  text (never colour alone).

#### Exit Criteria

- [ ] A baseline assessment can be created, scored criterion by criterion, saved, given needs/interventions/
  results, signed off, finalised and exported end to end with **zero console errors**.
- [ ] A reassessment can be created against the baseline and compared; deltas are correct.
- [ ] The live score panel matches `score.php` exactly and reflects not-applicable exclusions.
- [ ] Finalise is blocked with a clear message while any applicable criterion is unanswered.
- [ ] A target created from a finding appears in the workspace and carries assessment provenance.
- [ ] Popups keep the fixed head/foot + scrollable body contract at a 620px-tall viewport and do not close on
  outside click. List view state survives refresh and company navigation.
- [ ] Production build is clean with no new budget warning.

---

### Phase 6 — Verification, documentation and deployment package

Prove the sprint and make it shippable.

#### Tasks

- [ ] **6.1** Add `api-incubator-os/tests/Assessments.php` — unit coverage of the Scoring Contract (weights,
  NA, unanswered, tiers, denominators, month-boundary-style edge cases) plus capability/endpoint assertions.
- [ ] **6.2** Add `api-incubator-os/tests/Assessments.ps1` combined runner aggregating the assessment suite +
  GPS/Results/Sessions/Calendar regressions.
- [ ] **6.3** Add the migration #27 + #28 rows, deployment steps and rollback to
  `docs/sprint-012-assessments-deployment.md`.
- [ ] **6.4** Cross-link `docs/assessment-api.md` from `docs/session-api.md`/relevant docs; update the sprint
  and session records.
- [ ] **6.5** Extend the Angular manifest, backend manifest, FileZilla checklist, rollback matrix and smoke
  tests with the Sprint 012 layer.
- [ ] **6.6** Add `docs/deployment/verify-assessments-compact.sql` (structure) and
  `...-integrity-compact.sql` (invariants: unique findings, published-framework immutability, provenance
  non-null when `source_type='assessment'`).

#### Exit Criteria

- [ ] `api-incubator-os/tests/Assessments.ps1` passes fully; GPS/Results/Sessions/Calendar regressions unchanged.
- [ ] Migration #27 and #28 apply twice safely; both verifiers return clean.
- [ ] PHP lint clean across all touched files.
- [ ] Production build clean; no new budget warning.
- [ ] `docs/assessment-api.md` and the deployment runbook are complete.

---

## Execution Order

```
Phase 1 ──> Framework schema and seed
    │
    ▼
Phase 2 ──> Assessment repository, scoring engine and lifecycle
    │
    ▼
Phase 3 ──> Needs, interventions and result traceability
    │
    ▼
Phase 4 ──> Comparison, finalisation, sign-off and export
    │
    ▼
Phase 5 ──> Angular assessment surfaces
    │
    ▼
Phase 6 ──> Verification, documentation, deployment package
```

Each phase must satisfy its **Exit Criteria** before the next phase begins. Phase 3 depends on Phase 2's
assessment/finding CRUD; Phase 4 depends on Phase 2's version write and Phase 3's links; Phase 5 depends on
the endpoints from Phases 2–4.

---

## Target File Structure

```
api-incubator-os/
├── migrations/
│   ├── 2026-09-26-assessments-framework.sql            # run order #27
│   └── 2026-09-26b-assessments-phase2-gps-provenance.sql # run order #28
├── capabilities/assessments/
│   ├── feature.json
│   ├── Contracts/
│   │   ├── AssessmentVocabulary.php
│   │   ├── FrameworkResponse.php
│   │   ├── AssessmentResponse.php
│   │   ├── AssessmentScoreResponse.php
│   │   ├── AssessmentComparisonResponse.php
│   │   └── AssessmentVersionResponse.php
│   ├── Repository/
│   │   └── AssessmentRepository.php
│   ├── Services/
│   │   ├── AssessmentScoringService.php
│   │   ├── AssessmentStateMachine.php
│   │   ├── AssessmentValidator.php
│   │   ├── AssessmentService.php
│   │   ├── FrameworkService.php
│   │   ├── AssessmentSnapshotBuilder.php
│   │   ├── AssessmentComparisonService.php
│   │   ├── AssessmentExporter.php
│   │   ├── InterventionLinkService.php
│   │   └── ResultLinkService.php
│   └── Application/Commands/
│       ├── CreateAssessment.php
│       ├── UpsertFinding.php
│       ├── ManageNeeds.php
│       ├── ManageInterventions.php
│       ├── ManageResults.php
│       ├── LinkAssessmentTarget.php
│       ├── FinaliseAssessment.php
│       └── SupersedeAssessment.php
├── api/assessments/
│   ├── queries/{frameworks,list,get,score,comparison,versions,export}.php
│   └── commands/{create,finding,needs,interventions,results,link-target,signoff,finalise,supersede,framework-publish}.php
└── tests/
    ├── Assessments.php
    └── Assessments.ps1

src/app/features/assessments/
├── models/assessment.models.ts
├── services/assessment.service.ts
├── assessments-page.component.ts
└── components/
    ├── assessment-workspace.component.ts
    ├── assessment-comparison.component.ts
    ├── intervention-editor.component.ts
    └── assessment-signoff-dialog.component.ts
```

---

## Out of Scope

- The site visit report (Sprint 011).
- Migrating or reading `consolidated_assessment` nodes; repairing their progress values.
- The `form_definitions`/`form_nodes` form system and `form_submission` nodes.
- Reconciling `company_purchases` (table) vs `company_purchase` (node).
- Automatically creating or verifying Achievements from an assessment (the link is manual).
- Real funding disbursement triggered by an intervention.
- Portfolio/multi-company diagnostic roll-up.
- SANAS audit export bundles.

---

## Future Modules (Reserved)

| Module | Why deferred |
| --- | --- |
| Legacy `consolidated_assessment` import into the new capability | Needs a mapping + progress-repair exercise |
| Additional frameworks (per programme/funder) | The framework tables support it; content is a future data task |
| Scheduled reassessment reminders | Needs an email/cron job (see the email-job-builder pattern) |
| Automated metric-backed outcomes | Requires binding expected results to `metric_type_accounts` |
| Digital signature capture | `signoff` is a placeholder; e-signature is its own sprint |

---

## Definition of Done

The implementation is complete when:

- [ ] Phases 1–6 are complete and every Exit Criteria item is satisfied and evidenced.
- [ ] A published versioned framework drives a baseline and a reassessment that can be compared.
- [ ] Scoring is explicit: not-applicable excluded, unanswered blocks finalisation, tier derived from bands.
- [ ] Every intervention traces to the finding that caused it and to the target it produced.
- [ ] Outcomes reuse Achievements; the assessment creates no achievement and no financial transaction.
- [ ] Finalised assessments are immutable; corrections create a new version; exports read the frozen version.
- [ ] `gps_target_sources` carries a real `assessment_id` + `assessment_finding_id` for
  `source_type='assessment'`.
- [ ] Legacy assessment/questionnaire code is untouched; no regression in GPS, Results, Sessions or Calendar.
- [ ] Migration #27 + #28 are idempotent and verifier-clean.
- [ ] PHP lint clean; production build clean with no new budget warning.
- [ ] `docs/assessment-api.md`, the deployment runbook and the sprint/session records are updated.
