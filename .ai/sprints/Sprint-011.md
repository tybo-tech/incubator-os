# Sprint 011 — Site Visits (structured on-site visit reports)

> **Program**: Incubator OS — ESD / B-BBEE beneficiary support
> **Status**: Draft — ready for implementation **after Discovery-011-012 sign-off**
> **Baseline**: `main` (Sprint 010 delivered; Calendar + Sessions + Google Calendar locked)
> **Depends on**: `.ai/sprints/Discovery-011-012.md` (ownership rules + contracts)
> **Duration**: Multi-phase (6 phases, sequential execution)
> **Inputs**: `DS_Corp_Onsite_Visit_Report_1` (D1)
> **Previous work (locked capabilities)**: Company, Calendar, Sessions (`sessions` + 6 child tables), Google Calendar, normalized SWOT/GPS (`gps_targets`/`gps_target_tasks`), Results/Achievements, Categories/Cohorts.

---

## Objective

Turn an on-site entrepreneur visit into a **first-class, structured, auditable record** inside the existing
Session workspace, so the DS Corp report can be produced **without retyping data that already exists** and
**without creating duplicate action items**.

This sprint delivers:

1. A **`site_visit` Session type** — a site visit *is* a Session, so facilitator, participants, attendance,
   the linked calendar event (and therefore Google Meet) are reused, not rebuilt.
2. A **structured visit report** attached one-to-one to that Session: visit classification, actual
   visit date/location, operating status, discussion points, challenges + impact, alternatives,
   recommendations, next-visit follow-up, sign-offs.
3. **Programme/sponsor binding** — the report names the company's enrolment (`categories_item`), so a
   company with several enrolments produces an unambiguous report.
4. A **read-only funding position projection** — committed / paid / delivered / utilised, built from the
   existing funding records and **never** stored on the report.
5. **Company profile read/write gaps closed** — nature of business (`description`) becomes editable, and
   mission/vision/purpose/values are exposed through the Company capability (still stored in `company_vision`).
6. **Agreed actions reuse `gps_target_tasks`** linked through the existing `session_entity_links`.
7. **Issued report snapshots** — an issued report is frozen and preserved; company edits or completed tasks
   never rewrite history.
8. **Beneficiary-facing sign-off and export**, with `incubator`-visibility notes excluded from any export.

**Explicitly not this sprint:** the Needs Analysis diagnostic (Sprint 012); reconciling the two purchase
models; migrating `consolidated_assessment`.

---

## Existing Foundation (Locked)

Must **NOT** be redesigned. Reuse or expose only.

* **Capability convention** — `capabilities/{feature}/` (Contracts / Repository / Services / Application)
  exposed by thin `api/{feature}/queries|commands/{file}.php` endpoints. `dependsOn` manifest in `feature.json`.
  **No logic goes in `api-nodes/`.**
* **`helpers/AuthGuard.php`** — `auth_require_user($db)`, `auth_require_company_access`. Tenant is the
  server-derived constant `1`.
* **`core/Infrastructure/TransactionManager.php`** — command handlers own the transaction; repositories never
  open nested transactions; cross-capability reuse opens no transaction of its own.
* **`sessions`** — schema is **frozen** except for the `session_type` enum widening in Phase 1. Lifecycle
  `PREPARING → IN_PROGRESS → COMPLETED` / `CANCELLED`, terminal states frozen, `version` optimistic
  concurrency. Sessions store **no schedule**; the linked `calendar_events` row owns it.
* **`session_participants` / `session_agenda_items` / `session_notes` / `session_decisions` /
  `session_entity_links` / `session_activities`** — reuse as-is.
* **`calendar_events`** — schema frozen; location/timezone come from the event.
* **`gps_targets` / `gps_target_tasks`** — the execution layer. Agreed actions are tasks; the visit only links.
* **`categories` / `categories_item`** — the enrolment model. The report binds to a `categories_item` row.
* **`company_vision` node** — mission/vision storage; read-only for this sprint.
* **Angular** — lazy routes under `CompanyShellComponent`; `.sw-*` popup contract (never close on outside
  click; fixed head/foot, only body scrolls); `app-icon`; `ViewStateService`.

---

## Business Capabilities

| Capability | Introduces / Extends |
| --- | --- |
| Sessions | **Extends** — adds the `site_visit` `session_type` value and its validation |
| Site visit report | **Introduces** — one structured report per site-visit Session, with lifecycle and sign-offs |
| Visit report snapshot | **Introduces** — an immutable issued version per report |
| Visit funding projection | **Introduces** — a read-only committed/paid/delivered/utilisation view |
| Company profile | **Extends** — `description` writable, `company_vision` readable |
| Agreed actions | **Reuses** — `gps_target_tasks` + `session_entity_links` |
| Site visits UI | **Introduces** — Angular list + report workspace + editor + sign-off |

---

## Domain Model

```
companies ──1:N── sessions (session_type='site_visit') ──1:1── calendar_events
     │                     │                                        │
     │                     ├──1:N── session_participants            └──0:1── google_event_sync
     │                     ├──1:N── session_notes / agenda / decisions
     │                     ├──1:N── session_entity_links ──> gps_targets / gps_target_tasks
     │                     │
     │                     └──1:1── session_visit_reports
     │                                  │
     │                                  ├──1:N── session_visit_items (sectioned)
     │                                  ├──1:N── session_visit_signoffs
     │                                  └──1:N── session_visit_report_versions
     │
     └──1:N── categories_item ──> categories (client / program / cohort)
                       ▲
                       │ categories_item_id (nullable FK; required to issue)
                       └── session_visit_reports
```

### Collections

| Collection | Owner | Key fields |
| --- | --- | --- |
| `session_visit_reports` | `capabilities/sessions` | `session_id` (UNIQUE), `company_id`, `categories_item_id`, `visit_kind`, `actual_visit_date`, `actual_location`, `operating_status`, `status` (`draft`\|`issued`\|`acknowledged`), `current_version`, `next_visit_target_date`, `follow_up_method`, `follow_up_session_id`, `issued_by`, `issued_at`, `acknowledged_by`, `acknowledged_at`, `version` |
| `session_visit_items` | `capabilities/sessions` | `report_id`, `section` (`discussion`\|`challenge`\|`alternative`\|`recommendation`), `sort_order`, `title`, `detail`, `impact` |
| `session_visit_signoffs` | `capabilities/sessions` | `report_id`, `report_version_no` (the issued version acknowledged), `role` (`coach`\|`beneficiary`\|`sponsor`), `name`, `designation`, `signed_at`, `signature_ref`; UNIQUE `(report_id, role)` |
| `session_visit_report_versions` | `capabilities/sessions` | `report_id`, `version_no`, `snapshot_json`, `rendered_doc_ref`, `issued_by`, `issued_at`; UNIQUE `(report_id, version_no)` |

All new tables carry `tenant_id INT NOT NULL DEFAULT 1` and `created_at`/`updated_at`.

### Lookup Collections

| Lookup | Values | Source |
| --- | --- | --- |
| `visit_kind` | `scheduled`, `ad_hoc`, `follow_up` | enum column |
| report `status` | `draft`, `issued`, `acknowledged` | enum column |
| `follow_up_method` | `call`, `visit`, `check_in`, `email` | enum column |
| `section` | `discussion`, `challenge`, `alternative`, `recommendation` | enum column |
| sign-off `role` | `coach`, `beneficiary`, `sponsor` | enum column |
| `sessions.session_type` (new value) | `site_visit` | enum widened in Phase 1 |

### Collection Links

| Link | Kind | Cascade |
| --- | --- | --- |
| `session_visit_reports.session_id` → `sessions.id` | FK, UNIQUE | `ON DELETE CASCADE` |
| `session_visit_reports.company_id` → `companies.id` | FK | `ON DELETE CASCADE` |
| `session_visit_reports.categories_item_id` → `categories_item.id` | FK | `ON DELETE SET NULL` |
| `session_visit_reports.follow_up_session_id` → `sessions.id` | FK | `ON DELETE SET NULL` |
| `session_visit_items.report_id` → `session_visit_reports.id` | FK | `ON DELETE CASCADE` |
| `session_visit_signoffs.report_id` → `session_visit_reports.id` | FK | `ON DELETE CASCADE` |
| `session_visit_report_versions.report_id` → `session_visit_reports.id` | FK | `ON DELETE CASCADE` |

### Invariants

1. A report exists **only** for a Session whose `session_type = 'site_visit'`.
2. One Session has **at most one** report (`UNIQUE session_id`).
3. `report.company_id` always equals `report.session.company_id`.
4. Report content is editable **only** while `status = 'draft'`.
5. **Issue requires:** the Session is `COMPLETED`, `categories_item_id` is set, and `actual_visit_date` is set.
6. Issuing writes a **snapshot** and `current_version` increments; **versions are immutable**.
7. `acknowledged` is reachable only from `issued`; acknowledgement never reopens content, and the
   acknowledgement records the **exact issued `report_version_no`** so it cannot silently apply to a later
   re-issue (Discovery §4.2).
8. A snapshot is built from the report, the Session, the linked event, the company profile and the linked
   actions **at issue time**; it never contains `incubator`-visibility notes.
9. `follow_up_session_id` must reference a Session of the **same company**.
10. `categories_item_id` must belong to the same company and be `active`.
11. Agreed actions are `gps_target_tasks` (or `gps_targets`) linked via `session_entity_links` — the visit
    creates **no** action records of its own.
12. The funding position is **never persisted** on the report; it is derived on read.

---

## Architecture Decisions

1. **The backend extension lives in `capabilities/sessions`**, not a new capability. A site visit is a Session
   with a structured report sub-resource; Sessions already owns the workspace, participants, notes, decisions,
   entity links, activities and the transaction pattern. Introducing a separate capability would duplicate all
   of that and force cross-capability transactions. The **frontend** gets a dedicated `features/site-visits/`
   feature; backend and frontend boundaries are independent.
2. **One generic `session_visit_items` table with a `section` discriminator**, not four near-identical tables.
   Each section is `(title, detail, impact)`; the editor is one reusable list component reused four times.
   This keeps the migration small and the API uniform.
3. **New endpoints are session sub-resource endpoints under `api/sessions/`** following the existing
   `?id=&action=` convention and the `CommandResult` envelope. No new route prefix.
4. **`session_type` enum widening is additive** — `ALTER TABLE sessions MODIFY COLUMN session_type ENUM(...)`
   adding `site_visit`; no value removed or reordered. `SessionVocabulary::TYPES` and the Angular
   `SESSION_TYPES` list gain the value.
5. **The visit report is created lazily** on first save; a site-visit Session may exist before any report
   content is written. Issue is the only transition that hardens content.
6. **Programme/sponsor is an explicit `categories_item` selection**, not inferred. A company with multiple
   enrolments must choose; the report never picks the first.
7. **Funding position is a read model.** `VisitContextService` reads the funding sources directly (the way
   Sessions' `brief.php` already reads canonical tables) and returns a DTO; nothing is copied.
8. **Actions are linked, not owned.** The UI creates tasks through the existing Targets/tasks API and then
   adds the `session_entity_links` row — mirroring how the Session workspace already creates records.
9. **Snapshots freeze truth.** `snapshot_json` stores the exact rendered report; live company/task edits do
   not mutate it. This is the B-BBEE audit record.
10. **`incubator`-visibility notes are excluded at the query level**, so they cannot leak into a snapshot or
    an export.
11. **Export uses DOMPDF** (the repo's established document path) to render the snapshot to a PDF; the export
    is read-only and version-addressable.

---

## API Contract

Base `{ApiBase}api/sessions`. All requests use `withCredentials`. Server-derived and never accepted from the
browser: actor, tenant, creator, timestamps, accessible-company scope, snapshot contents.

### Queries

| Method | Endpoint | Returns |
| --- | --- | --- |
| `GET` | `queries/visit-list.php?company_id=` | Site-visit Sessions + report summary. Filters: `report_status`, `visit_kind`, `from`, `to`, `search`. `company_id` required for a company list. |
| `GET` | `queries/visit-report.php?id=` | Full report detail: session, event projection, report header, four item sections, sign-offs, follow-up, linked actions, version count. Returns an **empty draft shape** when no report row exists yet. |
| `GET` | `queries/visit-context.php?company_id=&categories_item_id=` | Read-only composite: company nature-of-business + vision/mission/purpose/values + funding position + the company's enrolment options. |
| `GET` | `queries/visit-versions.php?id=` | Issued snapshots: `version_no`, `issuedBy`, `issuedAt`, `renderedDocRef`. |
| `GET` | `queries/visit-export.php?id=&version=` | The selected (default current) snapshot as a PDF. `incubator` notes excluded. |

### Commands

| Endpoint | Body | Purpose |
| --- | --- | --- |
| `commands/create.php` | `{ companyId, sessionType:"site_visit", subject, ... }` | **Existing** create endpoint, now accepting `site_visit`. Session + calendar event in one transaction (unchanged atomicity). |
| `commands/visit-save.php?id=` | report header fields | Upsert the draft report header (visit kind, actual date/location, operating status, enrolment, follow-up). |
| `commands/visit-sections.php?id=&action=add\|update\|reorder\|delete&section=` | item fields | Manage `session_visit_items` for a section. |
| `commands/visit-signoff.php?id=&action=set\|clear` | `{ role, name, designation, signatureRef }` | Set/clear a sign-off. |
| `commands/visit-issue.php?id=` | `{ version }` | `draft → issued`: validate, snapshot, increment version. |
| `commands/visit-acknowledge.php?id=` | `{ version }` | `issued → acknowledged`: record beneficiary acknowledgement. |

### HTTP outcomes

| Status | When |
| --- | --- |
| `200` / `201` | Success (`CommandResult` envelope) |
| `400` | Malformed request (missing `id` / bad `section`) |
| `401` | No active session |
| `403` | Other company / company access denied |
| `404` | Session / report / version not found |
| `409` | `VISIT_NOT_DRAFT`, `VISIT_ALREADY_ISSUED`, `VISIT_NOT_ISSUED`, `VISIT_SESSION_NOT_COMPLETED`, stale `version`, duplicate sign-off role |
| `422` | Structured validation `{error, errors:{field:message}}` — e.g. missing enrolment/actual date on issue |

Machine-readable codes: `VISIT_TYPE_MISMATCH`, `VISIT_NOT_DRAFT`, `VISIT_ALREADY_ISSUED`, `VISIT_NOT_ISSUED`,
`VISIT_SESSION_NOT_COMPLETED`, `VISIT_ENROLMENT_REQUIRED`, `VISIT_ACTUAL_DATE_REQUIRED`.

---

## Permission Matrix

Roles are **Director / System Administrator / Coordinator / Judge** (no "Coach" role exists; do not invent one).

| Action | SA / Coordinator | Director / Judge |
| --- | --- | --- |
| View a site visit | ✅ | ✅ (own company) |
| Create / edit a draft report | ✅ | ✅ (own company) |
| Issue / acknowledge | ✅ | ✅ (own company) |
| Read `incubator` notes | ✅ | ❌ never |
| Export a report | ✅ | ✅ (own company; snapshot only) |

---

## Routes

| Surface | Route | Change |
| --- | --- | --- |
| Company site visits | `company/:id/site-visits` | New list page (view mode, filters, search) |
| Site visit workspace | `company/:id/site-visits/:sessionId` | New report workspace |
| Company sessions | `company/:id/sessions` | Unchanged; `site_visit` becomes a selectable type and a link to the report |
| Company shell nav | — | New "Site Visits" nav item |

---

## Phases

### Phase 1 — Schema, enum and vocabulary

Add the `site_visit` session type and the visit report tables in a single idempotent migration.

#### Tasks

- [ ] **1.1** Add migration `api-incubator-os/migrations/2026-09-25-site-visits.sql` — run order **#26**.
  Additive `ALTER` of `sessions.session_type` to
  `ENUM('coaching','progress_review','financial_review','assessment','workshop','other','site_visit')`;
  creates `session_visit_reports`, `session_visit_items`, `session_visit_signoffs`,
  `session_visit_report_versions` with the FK/UNIQUE/index set in the Domain Model. Guard the enum widen via
  `information_schema` so a re-run is safe. Header documents rollback (drop the 4 tables; the enum value may
  remain harmlessly — document it).
- [ ] **1.2** Add the run-order #26 row to `api-incubator-os/migrations/README.md`.
- [ ] **1.3** Extend `capabilities/sessions/Contracts/SessionVocabulary.php` — add `SITE_VISIT = 'site_visit'`
  to `SessionType` and its label. No other vocabulary changes.
- [ ] **1.4** Extend `capabilities/sessions/Services/SessionValidator.php` so `site_visit` is a valid
  `session_type`. A `site_visit` Session still obeys every existing rule (company event, `meeting` category).
- [ ] **1.5** Add `capabilities/sessions/Contracts/VisitVocabulary.php` — `VisitKind`, `VisitReportStatus`,
  `FollowUpMethod`, `VisitSection`, `VisitSignoffRole` constants + labels + `isValid()` helpers.
- [ ] **1.6** Add `capabilities/sessions/Contracts/VisitReportResponse.php` and
  `VisitReportSummaryResponse.php` DTOs (report shape + list summary), including a
  `withFundingPosition()`/context shape used by `visit-context.php`.

#### Exit Criteria

- [ ] Migration #26 applies **twice** safely; creates 4 tables, the FKs, the UNIQUE keys and the section index;
  the only existing table altered is `sessions` (enum widen only).
- [ ] `site_visit` is accepted by `create.php`; every other type behaviour is unchanged.
- [ ] `php -l` passes on every new/changed file.
- [ ] Sessions regression `105/105` and Calendar regression `65/65` remain green.

---

### Phase 2 — Visit report repository, state machine and commands

Build the report read/write surface on top of the existing Session service stack.

#### Tasks

- [ ] **2.1** Add `capabilities/sessions/Repository/VisitReportRepository.php` — `findBySession`,
  `createDraft`, `updateHeader` (optimistic `version`), `setStatus`, `listByCompany` (filters/pagination),
  item CRUD (`addItem`, `updateItem`, `reorderItems`, `deleteItem`, `listItems`), sign-off `upsert`/`clear`,
  version `insertVersion`/`listVersions`/`findVersion`. No transactions.
- [ ] **2.2** Add `capabilities/sessions/Services/VisitReportStateMachine.php` — `draft → issued →
  acknowledged`; illegal transitions return the `VISIT_*` codes. `issued`/`acknowledged` freeze content.
- [ ] **2.3** Add `capabilities/sessions/Services/VisitReportValidator.php` —
  type/company match, enrolment belongs to company and is `active`, actual date required to issue, section
  item required fields, sign-off role validity.
- [ ] **2.4** Add `capabilities/sessions/Services/VisitReportService.php` — orchestrates repository +
  validator + state machine + the snapshot builder; reuses the existing `CommandResult`/audit conventions and
  writes a `session_activities` entry (`visit.report.saved` / `.issued` / `.acknowledged`) in the same
  transaction.
- [ ] **2.5** Add `capabilities/sessions/Services/VisitSnapshotBuilder.php` — assembles `snapshot_json` from
  the report, Session, event schedule/location, company profile, linked actions (tasks/targets) and sign-offs.
  **Never** queries `incubator`-visibility notes.
- [ ] **2.6** Add endpoints `api/sessions/queries/visit-list.php`, `visit-report.php`, `visit-versions.php`;
  `api/sessions/commands/visit-save.php`, `visit-sections.php`, `visit-signoff.php`, `visit-issue.php`,
  `visit-acknowledge.php` + `_bootstrap.php` shared include, following the existing sessions endpoint pattern
  (`include_once` → `auth_require_user` / `auth_require_company_access` → manual DI).
- [ ] **2.7** Ensure `queries/get.php` and `queries/list.php` expose `visitReportStatus` on a `site_visit`
  Session (a light join), so the Sessions UI can show a report chip without a second call.

#### Exit Criteria

- [ ] `visit-report.php` returns a full report for a completed site visit and an empty draft shape when no
  report exists; it **never** returns `incubator` notes.
- [ ] Saving a draft updates the header and each section independently; `version` guards concurrent edits.
- [ ] `visit-issue.php` rejects a non-`COMPLETED` Session (`VISIT_SESSION_NOT_COMPLETED`), a missing
  enrolment (`VISIT_ENROLMENT_REQUIRED`) and a missing actual date (`VISIT_ACTUAL_DATE_REQUIRED`).
- [ ] Issuing writes exactly one immutable snapshot and increments `current_version`; a second issue returns
  `VISIT_ALREADY_ISSUED`.
- [ ] Any content write after issue returns `VISIT_NOT_DRAFT`; acknowledgement is allowed from `issued` only.
- [ ] Every mutation writes a `session_activities` row with the actor.
- [ ] Cross-company access returns `403`; unknown ids return `404`.

---

### Phase 3 — Company profile gaps and the funding-position projection

Close the reuse gaps the visit report depends on.

#### Tasks

- [ ] **3.1** Extend `capabilities/company/Contracts/Requests/UpdateProfileRequest.php` with `?string
  $description` and map it in `Application/Commands/UpdateProfile.php` to the `description` column
  (already in the repository `WRITABLE` list).
- [ ] **3.2** Add `capabilities/company/queries/get-vision.php` + `Application/Queries/GetVision.php` +
  `Contracts/Responses/CompanyVisionResponse.php` — resolve the company `company_vision` node and return
  `{ purposeStatement, visionStatement, missionStatement, coreValues[], valueProposition, targetMarket,
  competitiveAdvantage, longTermGoals, successMetrics[], lastUpdated }`. Read-only.
- [ ] **3.3** Add `capabilities/sessions/Services/VisitContextService.php` — a read model that composes
  company nature-of-business + vision (via the Company capability contract) + **funding position** +
  enrolment options. Funding position derives `committed`, `disbursed`, `paid`, `delivered`, `utilised`,
  `outstanding` and a `supplierPaid` flag from `seed_funding`, `company_purchase` / `company_purchases` and
  `grant_scm_verification` reads, keeping the four states **separate** (Discovery rule 8).
  **Evidence-driven constraints (Discovery §2):** `utilised` has **no existing field** — introduce an
  explicit utilisation observation on the visit/funding projection rather than inferring it from
  `process_tracker.completionPercentage`; when the beneficiary has no company/funding rows, return
  **`unknown` per state, never `0`**; do **not** sum `company_purchases` (table) and `company_purchase`
  (node) together — they are semantic twins with no shared row id (double-count hazard).
- [ ] **3.3b** Add the minimum field needed to record **`utilised`** (Discovery unresolved U4) — the chosen
  representation (visit operating-status utilisation flag and/or a funding-utilisation marker) must be
  agreed at Discovery sign-off before this task starts.
- [ ] **3.4** Add endpoint `api/sessions/queries/visit-context.php` returning the `VisitContextService`
  payload.
- [ ] **3.5** Add `Application/Commands` support so the UI can create an agreed action through the existing
  GPS task API and then link it: no new action tables — reuse `session_entity_links`
  (`gps_target_task`, relationship `CREATED`). Confirm the existing link endpoint accepts the task link.
- [ ] **3.6** Extend `src/app/components/companies/company-detail/strategy-tab` only if needed to read the new
  vision DTO; do not migrate the write path (the node write stays). **Also restore a reachable vision
  edit/read surface in the current Company Shell** — the Strategy tab button is commented out
  (`tabs-navigation.component.ts:81-91`) and the shell has no strategy tab, so the editor is currently
  unreachable (Discovery §1.5, unresolved U5).

#### Exit Criteria

- [ ] `update-profile.php` persists `description`; a round-trip read returns the saved value.
- [ ] `get-vision.php` returns the company's `company_vision` values or a safe null shape.
- [ ] `visit-context.php` returns funding states that are individually distinguishable — a paid-but-not-delivered
  case reads `paid = true`, `delivered = false`, `utilised = false`; a beneficiary with no funding rows reads
  `unknown` for every state (**never** `0`); no cross-store amount is summed (no double-counting).
- [ ] No funding value is written by any visit endpoint.
- [ ] A task created through the existing task API can be linked to the visit and is returned in the report.
- [ ] An acknowledgement records the exact issued `report_version_no`.

---

### Phase 4 — Snapshot, sign-off, export and audit

Make the report a defensible audit document.

#### Tasks

- [ ] **4.1** Finalise `VisitSnapshotBuilder` output shape: `{ header, session, schedule, company, vision,
  funding, discussions[], challenges[], alternatives[], recommendations[], actions[], followUps, signoffs[],
  generatedAt, generatedBy }`. Document the shape in `docs/site-visit-api.md`.
- [ ] **4.2** Add `capabilities/sessions/Services/VisitReportExporter.php` — render a snapshot to PDF via the
  repo's DOMPDF path; the export reads the **snapshot**, never live tables.
- [ ] **4.3** Add endpoint `api/sessions/queries/visit-export.php` streaming the PDF with a safe filename and
  `Content-Disposition`; version-addressable.
- [ ] **4.4** Persist `rendered_doc_ref` on the version row after a successful export (a reference, not a copy).
- [ ] **4.5** Ensure the audit trail is complete: issue, acknowledgement and export each produce a
  `session_activities` entry; no snapshot content is logged.
- [ ] **4.6** Write `docs/site-visit-api.md` — endpoints, lifecycle, invariants, codes, snapshot shape, the
  funding-state rule and the `incubator`-notes exclusion.

#### Exit Criteria

- [ ] An issued report exports as a PDF whose contents match `snapshot_json` exactly.
- [ ] Editing the company name (or completing a linked task) after issue does **not** change the exported PDF.
- [ ] An `incubator`-visibility note on the session appears in **no** snapshot or export (assert in tests).
- [ ] Export without issue returns a clear error/`409`, not an empty document.

---

### Phase 5 — Angular site visit surfaces

Build the frontend.

#### Tasks

- [ ] **5.1** Add `src/app/features/site-visits/models/site-visit.models.ts` — report, section item, sign-off,
  funding-position, context and enum types mirroring the backend DTOs.
- [ ] **5.2** Add `src/app/features/site-visits/services/site-visit.service.ts` — list, report, context,
  versions, save, sections, signoff, issue, acknowledge, export. `withCredentials` on every call; map error
  codes to safe messages.
- [ ] **5.3** Add `site-visits-page.component.ts` — the company list (filters, search, view mode, loading/empty
  states) with `ViewStateService` persistence key `site-visits-view:${companyId}`.
- [ ] **5.4** Add `site-visit-workspace.component.ts` — the report workspace: header (company, schedule from the
  event, facilitator, attendees from participants), profile context, funding panel, the four section editors,
  actions panel, follow-up, sign-offs, and the issue/acknowledge/export actions with the correct gating.
- [ ] **5.5** Add `visit-section-list.component.ts` — one reusable add/edit/reorder/delete list used four times
  (discussion, challenge, alternative, recommendation).
- [ ] **5.6** Add `visit-signoff-dialog.component.ts` and `visit-issue-confirm.component.ts`, both following the
  `.sw-*` popup contract (no outside-click close; fixed head/foot, scrollable body; focus on open).
- [ ] **5.7** Add the routes `company/:id/site-visits` and `company/:id/site-visits/:sessionId`, and a
  "Site Visits" entry in `CompanyShellComponent` nav.
- [ ] **5.8** Add `site_visit` to the Sessions page type filter/labels and a link from a site-visit Session row
  to its report workspace.
- [ ] **5.9** Create agreed actions through the existing task flow and link them; render task status live
  (the report shows current status; the snapshot keeps the issued status).
- [ ] **5.10** Show `description` in the company profile editor if absent (Phase 3 made it writable) and add the
  vision read where the workspace needs it.

#### Exit Criteria

- [ ] A site visit can be created (type `site_visit`), opened, edited section by section, signed off, issued,
  acknowledged and exported end to end with **zero console errors**.
- [ ] The workspace shows existing company details (name, directors, description, vision) and the linked
  event's schedule **without retyping**.
- [ ] A new agreed action is created via the task flow and appears in the report; its status updates live.
- [ ] Popups keep the fixed head/foot + scrollable body contract at a 620px-tall viewport and do not close on
  outside click.
- [ ] List view state survives a refresh and company navigation.
- [ ] Production build is clean with no new budget warning.

---

### Phase 6 — Verification, documentation and deployment package

Prove the sprint and make it shippable.

#### Tasks

- [ ] **6.1** Add `api-incubator-os/tests/SiteVisits.php` — service/endpoint assertions covering the lifecycle,
  invariants, funding states, snapshot immutability and the `incubator`-note exclusion.
- [ ] **6.2** Add `api-incubator-os/tests/SiteVisits.ps1` combined runner (offline where possible) aggregating
  the visit suites + Sessions/Calendar regressions.
- [ ] **6.3** Add the migration #26 row, the deployment steps and rollback to
  `docs/sprint-011-site-visits-deployment.md`.
- [ ] **6.4** Update `docs/session-api.md` with the `site_visit` type and the report sub-resource; cross-link
  `docs/site-visit-api.md`.
- [ ] **6.5** Extend the Angular manifest, backend manifest, FileZilla checklist, rollback matrix and smoke
  tests with the Sprint 011 layer.
- [ ] **6.6** Add a verifier `docs/deployment/verify-site-visits-compact.sql` (structure) and
  `...-integrity-compact.sql` (invariants), following the two-file split lesson from Sprint 010.
- [ ] **6.7** Update `.ai/sprints/Sprint-011.md` and write the session record.

#### Exit Criteria

- [ ] `api-incubator-os/tests/SiteVisits.ps1` passes fully; Sessions `105/105` and Calendar `65/65` unchanged.
- [ ] Migration #26 applies twice safely and the structure/integrity verifiers return clean.
- [ ] PHP lint clean across all touched files.
- [ ] Production build clean; no new budget warning.
- [ ] `docs/site-visit-api.md` and the deployment runbook are complete.

---

## Execution Order

```
Phase 1 ──> Schema, enum and vocabulary
    │
    ▼
Phase 2 ──> Report repository, state machine and commands
    │
    ▼
Phase 3 ──> Company profile gaps + funding projection
    │
    ▼
Phase 4 ──> Snapshot, sign-off, export and audit
    │
    ▼
Phase 5 ──> Angular site visit surfaces
    │
    ▼
Phase 6 ──> Verification, documentation, deployment package
```

Each phase must satisfy its **Exit Criteria** before the next phase begins. Phase 5 depends on the endpoints
from Phases 2–4; Phase 4 depends on Phase 2's snapshot write; Phase 2 depends on Phase 1's schema.

---

## Target File Structure

```
api-incubator-os/
├── migrations/
│   └── 2026-09-25-site-visits.sql                      # run order #26
├── capabilities/sessions/
│   ├── Contracts/
│   │   ├── VisitVocabulary.php
│   │   ├── VisitReportResponse.php
│   │   └── VisitReportSummaryResponse.php
│   ├── Repository/
│   │   └── VisitReportRepository.php
│   ├── Services/
│   │   ├── VisitReportStateMachine.php
│   │   ├── VisitReportValidator.php
│   │   ├── VisitReportService.php
│   │   ├── VisitSnapshotBuilder.php
│   │   ├── VisitReportExporter.php
│   │   └── VisitContextService.php
│   └── (existing SessionVocabulary / SessionValidator extended)
├── capabilities/company/
│   ├── Application/Queries/GetVision.php               # new
│   ├── Contracts/Responses/CompanyVisionResponse.php   # new
│   └── (UpdateProfileRequest / UpdateProfile extended)
├── api/sessions/
│   ├── queries/visit-list.php  visit-report.php  visit-context.php
│   │            visit-versions.php  visit-export.php
│   └── commands/visit-save.php  visit-sections.php  visit-signoff.php
│                visit-issue.php  visit-acknowledge.php
└── tests/
    ├── SiteVisits.php
    └── SiteVisits.ps1

src/app/features/site-visits/
├── models/site-visit.models.ts
├── services/site-visit.service.ts
├── site-visits-page.component.ts
└── components/
    ├── site-visit-workspace.component.ts
    ├── visit-section-list.component.ts
    ├── visit-signoff-dialog.component.ts
    └── visit-issue-confirm.component.ts
```

---

## Out of Scope

- The Needs Analysis diagnostic (Sprint 012).
- Reconciling `company_purchases` (table) vs `company_purchase` (node).
- Migrating `consolidated_assessment` or repairing its progress values.
- Merging the two form systems.
- Multi-beneficiary / portfolio roll-up reporting.
- Reopening a completed Session (Sessions rule: not supported).
- Any change to Calendar or Google Calendar behaviour.
- A SANAS audit export bundle.

---

## Future Modules (Reserved)

| Module | Why deferred |
| --- | --- |
| Visit report templates by programme | The criteria/framework work belongs with Sprint 012's versioning |
| Digital signature capture | `signature_ref` is a placeholder; real e-signature is its own sprint |
| Offline/mobile visit capture | Requires an offline store and conflict strategy |
| Bulk visit import (Excel) | Needs a validated import pipeline and dry-run/undo |
| Portfolio of visits across companies | Reporting capability, not a visit capability |

---

## Definition of Done

The implementation is complete when:

- [ ] Phases 1–6 are complete and every Exit Criteria item is satisfied and evidenced.
- [ ] A `site_visit` Session and its report are created, edited, issued, acknowledged and exported end to end.
- [ ] No company detail, participant, attendance or action is retyped — all are read or linked.
- [ ] Agreed actions are `gps_target_tasks`; the visit owns no action system.
- [ ] The funding position is derived and never stored; its four states stay separate.
- [ ] An issued report is immutable; post-issue company/task changes do not alter it or its export.
- [ ] `incubator`-visibility notes never appear in a snapshot or export.
- [ ] Existing foundation is not redesigned: Calendar/Google untouched; Sessions' existing behaviour unchanged.
- [ ] Migration #26 is idempotent and verifier-clean; Sessions `105/105` and Calendar `65/65` unregressed.
- [ ] PHP lint clean; production build clean with no new budget warning.
- [ ] `docs/site-visit-api.md`, the deployment runbook and the sprint/session records are updated.
