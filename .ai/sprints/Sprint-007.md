# Sprint 007 — Results & Achievements

> **Program**: Incubator OS — Business Growth Tracking (Assessment → Target → Action → Result → Achievement)
> **Status**: Locked — Phase 6 complete + cross-cutting UX hardening (2026-09-16); ready for Phase 7
> **Duration**: Multi-phase (8 phases, sequential execution)
> **Previous work**: Sprint 002–006 — normalized SWOT/GPS hierarchy (`swot_analyses`, `swot_items`, `gps_targets`, `gps_target_sources`, `gps_target_tasks`, `gps_target_updates`, `gps_target_metrics`, `normalized_migration_audits`), 33 endpoints, dashboard cards, admin data-migration screen, production deployment, Notion-style SWOT/GPS workspaces with shared `.sw-*` styles and `app-icon`.

---

## Objective

Connect intent and activity to **measured outcomes**. Today the platform tracks what entrepreneurs intend to do (targets) and the work happening (tasks), but has no first-class link to what actually changed in the business.

This sprint delivers:

1. **Measured actuals** for targets, derived from authoritative sources — starting with revenue read from `company_financial_yearly_stats`, never re-entered into `metric_records`.
2. **Task progress separated from outcome progress**, so completing every task no longer auto-declares a business outcome achieved.
3. **Evidenced achievements** — dated, attributable, verifiable, with the measurement snapshot captured automatically at verification and preserved thereafter — including achievements with no prior target, and decisions recorded as distinct events.
4. **A company-level Results workspace** that surfaces recorded results and achievements **and measured targets awaiting review**, plus an in-target Actual/Achievements view.
5. **Financial-screen entry points** — `Create target` and `Link existing target` on the revenue screen, prefilled from the measure and period being viewed.

The sprint proves the **reusable pattern** — measure definition → account binding → period → calculation method → actual → evidenced achievement — with **two entry points** (SWOT finding → target, and financial measure → target) and **one complete vertical slice** (financial finding → target → tasks → calculated actual → evidenced achievement), plus a qualitative achievement with no target.

---

## Existing Foundation (Locked)

Must **NOT** be redesigned. Reuse as-is.

* **Normalized tables + models + endpoints**: `swot_analyses`, `swot_items`, `gps_targets`, `gps_target_sources`, `gps_target_tasks`, `gps_target_updates`, `gps_target_metrics`, `normalized_migration_audits`; `AuthGuard`, `auth_require_company_access`, `assertSameCompany`, transactional writes.
* **Angular normalized workspaces**: `company/:id/swot-v2` and `company/:id/gps-targets-v2` — table + grouped views, filter panel, multi-select bulk actions, view/edit popups, global `.sw-*` component stylesheet, shared `app-icon`.
* **`DashboardNormalizedCardsComponent`** and `CompanyShell` tab bar (`maxVisible`, overflow).
* **Admin migration screen** (`Admin → System Tools → Data Migration`) — SA-only, preview-gated, audited.
* **Financial data layer**: `company_financial_yearly_stats` (`account_id`, `financial_year_id`, `is_revenue`, `m1`…`m12`, generated `total_amount`), `CompanyFinancialYearlyStatsService` (`calculateQuarterlyTotals`, `getRevenueStats`), `revenue.component.ts` / `revenue-capture-helper.service.ts`, `company_accounts` (`account_type`: `domestic_revenue` / `export_revenue` / `expense` / `other`), `metric_types` (`period_type`: `QUARTERLY` / `YEARLY` / `YEARLY_SIDE_BY_SIDE`), `financial_years`.
* **Authoritative metric record shape**: `metric_records` columns are `client_id, company_id, program_id, cohort_id, metric_type_id, category_id, year_, q1…q4, total, margin_pct, unit, notes, title`. This is the only supported shape — there is no `year` / `quarter` / `value` / `note` column.

> **Dead code to remove, not reconcile**: `models/MetricRecord.php` inserts `year, quarter, value, note` — columns that do not exist in the live schema. Its only consumer, `api-nodes/enhanced-metrics.php`, is not referenced anywhere in `src/`. Both are unusable; the "two metric designs" question is already settled in favour of the `q1…q4` shape.

---

## Business Capabilities

| Capability | Introduces / Extends |
| --- | --- |
| Measure → source binding | **New** `metric_type_accounts` mapping (metric definition → financial account type) |
| Target measurement periods | **Extends** `gps_target_metrics` (baseline/target period, direction, calculation method, maintain tolerance, calculation version) |
| Calculated actuals (revenue) | **Extends** — derived from `company_financial_yearly_stats` via a reusable service |
| Task vs outcome progress | **Fixes** `GpsTargetTask::recalcTaskProgress` clobbering target status/progress |
| Results view (baseline → target → actual) | **New** company-level `Results` surface + per-target Actual panel |
| Targets awaiting review | **New** — measured targets with a completed period but no recorded outcome |
| Evidenced achievements | **New** `achievements` + `achievement_evidence` |
| Qualitative achievements (no target) | **New** — `achievements.gps_target_id` nullable |
| Decisions (dated, distinct) | **Extends** — `achievements.kind = decision`, excluded from achievement counts |
| Verification | **New** — `recorded_by` vs `verified_by` / `verification_status`, snapshot captured atomically |
| Financial-screen target entry | **New** — `Create target` / `Link existing target` on the revenue screen |

---

## Domain Model

```
company
├── company_accounts ......................... (locked) account_type: domestic|export|expense|other
├── financial_years ........................... (locked) periods for baseline/target
├── metric_types .............................. (locked) measure definitions (REVENUE_TOTAL, …)
│        │
│        └──< metric_type_accounts ............ (NEW) measure → account binding
│
├── swot_analyses / swot_items ................ (locked)
│        └── gps_target_sources ............... (locked) provenance (also used by financial entry)
│
└── gps_targets ............................... (locked)
        ├── gps_target_tasks .................. (locked) → task completion % (activity only)
        ├── gps_target_updates ................ (locked) progress notes / history
        ├── gps_target_metrics ................ (EXTENDED) + periods, direction, method, tolerance
        │        └──> TargetMeasurementService ──> actual (derived, never persisted)
        │
        └──< achievements ..................... (NEW, target nullable = qualitative; kind=decision = event)
                 └──< achievement_evidence .... (NEW: draft-editable, preserved once verified)
```

### Collections

| Collection | Owner | Key fields |
| --- | --- | --- |
| `gps_target_metrics` *(extend)* | target | `baseline_period_type` (`financial_year`/`quarter`/`custom`), `baseline_period_ref`, `target_period_type`, `target_period_ref`, `direction` (`increase`/`decrease`/`maintain`), `calculation_method` (**`period_total` only — this sprint**), `maintain_tolerance_value` (nullable), `maintain_tolerance_unit` (`absolute`/`percent`, nullable), `calculation_version` |
| `metric_type_accounts` *(new)* | measure | `id`, `metric_type_id`, `account_type` (`domestic_revenue`/`export_revenue`/`expense`/`other`), `account_id` (nullable), `is_revenue`, `combine_mode` (`sum`/`avg`/`latest`), `created_at` |
| `achievements` *(new)* | company | `id`, `company_id`, `gps_target_id` (nullable), `category` (target categories), `kind` (`result`/`achievement`/`decision`), `title`, `description`, `achieved_on` (date; **event date** — labelled "Decision date" for decisions), `baseline_value`, `target_value`, `actual_value`, `unit`, `direction`, `evidence_summary`, `recorded_by`, `recorded_at`, `verified_by`, `verified_at`, `verification_status` (`unverified`/`verified`/`rejected`/`revoked`), `supersedes_id` (nullable), `revoked_reason`, `revoked_by`, `revoked_at`, `created_at`, `updated_at` |
| `achievement_evidence` *(new)* | achievement | `id`, `achievement_id`, `source_type` (`metric_snapshot`/`financial_stat`/`note`/`url`/`file`), `label`, `reference`, `snapshot_json`, `created_by`, `created_at` |

### Lookup Collections

| Lookup | Values |
| --- | --- |
| `direction` | `increase`, `decrease`, `maintain` |
| `calculation_method` | **`period_total`** (implemented) — `closing_balance`, `headcount`, `ratio` reserved, **not selectable this sprint** |
| `maintain_tolerance_unit` | `absolute`, `percent` |
| `achievement.kind` | `result`, `achievement`, `decision` |
| `verification_status` | `unverified`, `verified`, `rejected`, `revoked` |
| `evidence.source_type` | `metric_snapshot`, `financial_stat`, `note`, `url`, `file` |
| `account_type` *(reused)* | `domestic_revenue`, `export_revenue`, `expense`, `other` |

### Collection Links

| From | To | Cardinality | Rule |
| --- | --- | --- | --- |
| `metric_type_accounts.metric_type_id` | `metric_types.id` | N:1 | measure definition |
| `metric_type_accounts.account_type` / `account_id` | `company_accounts.account_type` / `id` | N:1 | actuals source (resolved **per company**) |
| `achievements.gps_target_id` | `gps_targets.id` | N:1 **nullable** | qualitative achievements have no target |
| `achievements.supersedes_id` | `achievements.id` | N:1 **nullable** | correction chain for verified records |
| `achievements.company_id` | `companies.id` | N:1 | company isolation |
| `achievement_evidence.achievement_id` | `achievements.id` | N:1 | cascade **only while draft** |

### Invariants

* An achievement with `gps_target_id = NULL` is valid (businesses achieve valuable things they never planned).
* `achieved_on` is independent of `recorded_at`; corrections never mutate preserved evidence.
* Completing all tasks **must not** change a target's `status`, `completed_at`, or outcome progress.
* A measurable target's actual is **derived**, never stored as truth in `metric_records`.
* Revenue actuals come from `company_financial_yearly_stats`; **missing accounts or months ⇒ `completeness` ≠ `complete`, never treated as 0**.
* **Verified achievements and their evidence are immutable.** Only drafts (`unverified`) may have evidence deleted/edited and may be hard-deleted. A verified record is corrected by **revoking** it (`revoked_reason`, `revoked_by`, `revoked_at`) or **superseding** it (`supersedes_id`) — the original is retained.
* **A `decision` is an event, not an achievement.** It must not be counted as an achievement, must not imply its target succeeded, and uses an event-date label in the UI. Decisions are exempt from the achievement-verification workflow.
* A target with a past due date is simply **overdue** until its outcome is established — it is not an achievement.
* Company isolation enforced on every read and write (`auth_require_company_access`).
* `recorded_by` and `verified_by` are **always derived server-side** from the authenticated session — never accepted from the request body.

---

## Measurement Contract (revenue slice)

Non-negotiable rules for `TargetMeasurementService`. These are the contracts Phase 1 and Phase 3 must implement.

**Period references.** `baseline_period_type` / `target_period_type` ∈ `financial_year` | `quarter` | `custom`, stored with `*_period_ref`:
* `financial_year` → `financial_years.id` (e.g. `4`)
* `quarter` → `<financial_year_id>:Q<n>` (e.g. `4:Q3`)
* `custom` → `YYYY-MM-DD..YYYY-MM-DD`

**Account resolution (company-scoped).** A binding resolves only to accounts where `company_accounts.company_id = <target.company_id>`. A binding must **never** resolve another company's accounts.

**Overlapping-binding deduplication.** If multiple `metric_type_accounts` rows resolve to the same `account_id` (direct `account_id` and an `account_type` match), deduplicate by `account_id` — each account is counted once.

**Missing account / missing month.**
* No resolved accounts for the company → `completeness = 'no_accounts'`, `actual = null`.
* Any `m1…m12` in the period `NULL` → `completeness = 'incomplete'`, `actual` returned as partial and `missing_months[]` populated.
* `completeness = 'complete'` only when all accounts resolve and all months are present.
* The UI must render `no_accounts` / `incomplete` as such — never as an achieved low/zero value.

**Formulas.**
* `increase` → `(actual − baseline) / (target − baseline) × 100`
* `decrease` → `(baseline − actual) / (baseline − target) × 100`
* `maintain` → met when `|actual − baseline| ≤ tolerance`; tolerance is a **required** explicit selection (`maintain_tolerance_value` + `maintain_tolerance_unit`); absolute and percent are both supported and stored. No implicit percentage.

**Equal baseline and target.** For `increase` / `decrease`, `target == baseline` is an invalid definition: return `completeness = 'invalid_definition'` and require the definition be fixed — **never divide by zero**. For `maintain`, equal baseline/target is valid (the band applies).

**Calculation version.** A `calculation_version` constant (e.g. `rev1`) is stored with every snapshot so later formula changes remain traceable.

---

## Shared CRUD Pattern

Identical to the existing normalized workspaces — no new design language:

```
Toolbar (Table ⇄ Grouped · Search · Filter + count · Refresh · cross-links · + Add)
    │
    ├── Filter panel (collapsible)
    ├── Data table (sortable, multi-select, bulk actions)
    ├── Grouped view (same table via ngTemplateOutlet, per group)
    └── Popup (view ⇄ edit) for create/update/detail
```

Reuse the global `.sw-*` stylesheet in `src/styles.scss` and the shared `app-icon` component. Screens are **standalone, `OnPush`, signals / `computed()` / `inject()`, `@if` / `@for`** — never `*ngIf` / `*ngFor`.

---

## Architecture Decisions

1. **Introduce `metric_type_accounts`** — no measure→account link exists today; this is the gating dependency for derived actuals. Revenue bindings seeded in the migration.
2. **Extend `gps_target_metrics` in place** (additive columns) — no parallel measurement table.
3. **Decisions are achievements of `kind = decision`** — dated events. They share storage but are excluded from achievement counts, do not imply target success, and are UI-labelled as events. No new entity.
4. **Evidence is draft-editable, immutable once verified.** Draft cleanup is allowed (delete/edit evidence; hard-delete the draft). Verified achievements and evidence are preserved: corrections **revoke** (with reason) or **supersede**, never destroy.
5. **Snapshots are automatic and mandatory at verification.** For measurable achievements, `TargetMeasurementService` computes the snapshot server-side and it is saved **atomically** with the verification — including periods, account bindings, completeness, and `calculation_version`. No manual snapshot step, no verification without a snapshot.
6. **Progress is split**: `manual_progress_percentage` stays manual-only and is no longer written by task recalc; task completion and outcome progress are distinct values.
7. **`GpsTargetTask::recalcTaskProgress` stops writing target status/progress** — it may aggregate for display but must not mutate the parent.
8. **Verification permissions**: System Administrator, **or an explicitly authorized coach scoped to the achievement's company**. Recorder and verifier identities are derived from authentication.
9. **Delete `MetricRecord.php` + `api-nodes/enhanced-metrics.php`** (dead, schema-incompatible) — do not extend or reconcile.
10. **Actuals live in a PHP service** (`TargetMeasurementService`) shared by the target popup, the Results workspace, and the financial entry point — one calculation, three consumers.
11. **Two entry points, one model**: targets are created from a SWOT finding (existing) **or from the financial screen** (new), both binding a measure via `metric_type_accounts`; the financial entry writes provenance with `gps_target_sources.source_type = 'manual'`.
12. **Only implemented methods are exposed**: `calculation_method = period_total`; `closing_balance` / `headcount` / `ratio` are reserved and not selectable.
13. **Achievements are company-scoped and target-optional**, surfaced company-wide (Results) and per target (popup).
14. **No new dependencies**; no redesign of locked tables, endpoints, or styles. **Final nav label is `Targets`** (existing meeting decision) — routes unchanged.

---

## Routes

```
company/:id/overview              (unchanged)
company/:id/swot-v2               (unchanged)
company/:id/gps-targets-v2        (extended — popup gains Actual + Achievements + measure binding)
company/:id/results               (NEW — Results & Achievements workspace, incl. awaiting review)
company/:id/financial-*           (unchanged routes; revenue screen gains Create/Link target actions)
admin/tools                       (unchanged)
admin/system-tools/data-migration (unchanged)
```

Navigation changes (`CompanyShell.tabBar`): rename **`GPS Targets` → `Targets`**, add **`Results`**. Keep `TabBarComponent` overflow behaviour intact.

---

## Phases

### Phase 1 — Measurement Foundation: schema, mapping, dead-code removal

Build the authoritative measure→account binding and prepare the database.

**Status: ✅ Complete — 2026-09-15 (session 014). All tasks and exit criteria satisfied; see the Phase 1 Completion section at the end of this document.**

#### Tasks

- [x] **1.1** Create `migrations/2026-09-15-results-achievements.sql` — additive, idempotent, guarded: creates `metric_type_accounts`, `achievements`, `achievement_evidence`; `ALTER TABLE gps_target_metrics` adds `baseline_period_type`, `baseline_period_ref`, `target_period_type`, `target_period_ref`, `direction`, `calculation_method`, `maintain_tolerance_value`, `maintain_tolerance_unit`, `calculation_version`. Include rollback notes in a header comment.
- [x] **1.2** Seed revenue bindings in the migration: `REVENUE_TOTAL` → `domestic_revenue` + `export_revenue` (`sum`), `REVENUE_EXPORT` → `export_revenue` (`sum`), `REVENUE_ANNUAL` → `domestic_revenue` + `export_revenue` (`sum`).
- [x] **1.3** Add `models/MetricTypeAccount.php` — `WRITABLE`, `bind()`, `unbind()`, `listByType()`, `resolveAccounts(metric_type_id, company_id)` (**company-scoped**), `declare(strict_types=1)`, PDO injection.
- [x] **1.4** Extend `GpsTargetMetric.php` `WRITABLE` with the new columns; validate enums (`direction`, `calculation_method` = `period_total` only, `maintain_tolerance_unit`) and enforce a tolerance when `direction='maintain'`.
- [x] **1.5** Add endpoints `api-nodes/metric-type-accounts/{list,get,create,update,delete}.php` (System Administrator / migration-admin guarded, JSON, try-catch `400`).
- [x] **1.6** Delete `models/MetricRecord.php` and `api-nodes/enhanced-metrics.php`; confirm no remaining references; note removal in `migrations/README.md` and session docs.
- [x] **1.7** Update `migrations/README.md` with the new migration row and local pre-req command.

#### Exit Criteria

- [x] Migration applies cleanly to local `incubator_os` and is idempotent on re-run
- [x] `SHOW COLUMNS FROM gps_target_metrics` shows all nine new columns
- [x] `metric_type_accounts` contains the three revenue bindings; a **company-scoped** resolve for `REVENUE_TOTAL` returns only that company's `domestic_revenue` + `export_revenue` accounts
- [x] `calculation_method` accepts only `period_total`; an unsupported value is rejected
- [x] `direction='maintain'` without a tolerance value/unit is rejected
- [x] `MetricRecord` class + `enhanced-metrics.php` removed; no remaining references
- [x] `php -l` clean on every new/changed PHP file
- [x] `ng build` still passes (no frontend change required this phase)

---

### Phase 2 — Outcome / Task Progress Decoupling

Stop task completion from declaring business outcomes achieved.

**Status: ✅ Complete — 2026-09-15 (session 015). See the Phase 2 Completion section at the end of this document.**

#### Tasks

- [x] **2.1** Modify `GpsTargetTask::recalcTaskProgress()` so it **no longer writes** `manual_progress_percentage`, `status`, or `completed_at` to `gps_targets`. (The mutating method was removed; a comment records why it must not return.)
- [x] **2.2** Add `GpsTarget::taskProgress(int $id): array` returning `{ total, completed, percent }` as a **read-only** aggregate.
- [x] **2.3** Add outcome-progress derivation: for `progress_mode='metric'` outcome progress is computed from actual vs baseline/target (Phase 3); `tasks` mode reports task % for **display only**; `manual` mode is unchanged.
- [x] **2.4** Update `gps-target-tasks/{create,update,delete}.php` responses to include task % while leaving the parent target untouched (`reorder.php` returns an ordered array and does not affect completion — left unchanged).
- [x] **2.5** Document (do not auto-fix) any target previously flipped to `completed` by task recalc; add a manual-review note to the migration README.

#### Exit Criteria

- [x] Completing all tasks does **not** set the parent target `status='completed'` or populate `completed_at` (verified via API)
- [x] A `tasks`-mode target still reports task completion % via the read aggregate
- [x] A `manual`-mode target behaves exactly as before
- [x] Existing task CRUD endpoints return the same fields plus task % — no regressions
- [x] `php -l` clean

---

### Phase 3 — Actuals Calculation Service (Revenue Vertical Slice)

Derive actuals from financial records through the measure→account binding, implementing the **Measurement Contract** above in full.

> **Constraints carried from Phase 1/2 (recorded 2026-09-15):**
> 1. **Row presence does not establish monthly completeness.** With zero-filled months, an all-zero row is indistinguishable from a genuine zero; `completeness` is unknown unless another field or workflow confirms captured months. Do not infer completeness from month values.
> 2. **Null-`account_id` financial rows require a verified association before inclusion.** They cannot be attributed by `account_type` alone; either establish a demonstrable link/reconciliation or **exclude them and report the unresolved count**. Never silently total them.
> 3. Generated `total_amount` `COALESCE`s NULL → 0 and must not be used for completeness (read `m1…m12` directly).

**Status: ✅ Complete — 2026-09-15 (session 016). See the Phase 3 Completion section at the end of this document.**

#### Tasks

- [x] **3.1** Create `services/TargetMeasurementService.php` — company-scoped, deduplicated account resolution and period subtotals from `company_financial_yearly_stats`; returns per-period measurement + `calculation_version`. (Shape refined — see Phase 3 Completion.)
- [x] **3.2** Implement period-reference parsing for `financial_year` / `quarter` / `custom` (`financial_years.id`, `<fy_id>:Q<n>`, `YYYY-MM-DD..YYYY-MM-DD`) for both baseline and target. (`custom` supported only within a single financial year.)
- [x] **3.3** Implement overlapping-binding **deduplication by `account_id`** so no account is counted twice.
- [x] **3.4** Implement completeness with the review's distinctions: `no_accounts` / `partial_coverage` / `incomplete` / `unknown` / `complete` (plus `missing_months[]` and `unresolved_rows`).
- [x] **3.5** Implement formulas for `increase` / `decrease` / `maintain` (explicit absolute/percent tolerance) and the `target == baseline` guard (`invalid_definition`, never divide by zero).
- [x] **3.6** Add endpoint `api-nodes/gps-targets/actual.php?gps_target_id=`.
- [x] **3.7** Extend `gps-target-metrics/list.php` response with the computed actual (read-only; never persisted to `metric_records`).

#### Exit Criteria

- [x] For a revenue target, the computed actual equals the manual `CompanyFinancialYearlyStatsService.calculateQuarterlyTotals` grouping (cross-checked: Q1 = m1–m3, Q2 = m4–m6, full year = m1–m12)
- [x] Account resolution is company-scoped — a binding cannot resolve another company's accounts (verified)
- [x] Overlapping bindings that resolve to the same `account_id` are counted once (verified)
- [x] `no_accounts` and `incomplete` (with `missing_months[]`) are returned correctly and never presented as an achieved low/zero value
- [x] `increase`, `decrease` and `maintain` (absolute + percent) all compute correctly; `target == baseline` returns `invalid_definition` without error
- [x] No writes occur to `metric_records`
- [x] `php -l` clean

---

### Phase 4 — Achievements & Evidence Backend

Make outcomes first-class, dated, attributable, verifiable and correctable without data loss.

**Status: ✅ Complete — 2026-09-16 (session 017). See the Phase 4 Completion section at the end of this document.**

#### Tasks

- [x] **4.1** Add `models/Achievement.php` — `WRITABLE`, validate `kind` / `category` / `direction` enums, allow null `gps_target_id`, keep `achieved_on` separate from `recorded_at`, forbid `kind='decision'` from verification/rejection. (`verification_status` is lifecycle-only — never writable from input; same-company checks for the linked target and the superseded record.)
- [x] **4.2** Add `models/AchievementEvidence.php` — `add()` / `listByAchievement()` / `delete()`; **append-only** (add allowed on drafts and verified records); delete permitted **only while the parent is `unverified`**, else `ConflictException` → `409`; cascade on draft delete.
- [x] **4.3** Add endpoints `api-nodes/achievements/{list,get,create,update,delete,verify,reject,revoke,supersede,by-company,by-target,awaiting-review,counts}.php` with company isolation. Verification/approval actions are **System Administrator only** (see correction below); draft edit/delete for company users; identity always server-derived.
- [x] **4.4** Add endpoints `api-nodes/achievement-evidence/{list,create,delete}.php`; `delete` returns `409` for decided records (drafts return a deliberate success shape).
- [x] **4.5** **Automatic snapshot at verification**: on `verify`, `TargetMeasurementService` computes the snapshot server-side and it is written to `achievement_evidence` (`source_type='metric_snapshot'`) in the **same transaction** as the status change; the snapshot preserves periods, values, actual, unit, direction, tolerance, completeness, resolved account bindings, unresolved-row info, eligibility and `calculation_version`. Verification fails (rolls back, achievement unchanged) if the snapshot cannot be produced.
- [x] **4.6** Implement revocation/supersession: `revoke` requires a reason and sets `verification_status='revoked'` + `revoked_reason`/`revoked_by`/`revoked_at`, retaining the record and evidence; `supersede` creates a new draft linked via `supersedes_id`, leaving the original untouched. Neither hard-deletes.
- [x] **4.7** Add list endpoints `achievements/by-company.php`, `achievements/by-target.php`, `achievements/awaiting-review.php`, and `counts.php`; decisions are excluded from achievement counts.

#### Exit Criteria

- [x] An achievement with `gps_target_id = NULL` is accepted and returned (qualitative path)
- [x] `achieved_on` and `recorded_at` are stored and returned independently
- [x] Verifying a measurable achievement writes a `metric_snapshot` evidence row **atomically** — a failed snapshot aborts the verification (no partial state)
- [x] A non-SA cannot verify; **no Coach role exists in this system** (roles: Director / System Administrator / Judge), so the coach path is deferred and no role string was invented — verification is System Administrator scoped via `auth_require_company_access`
- [x] Evidence delete returns `409` for verified achievements; drafts can be cleaned up
- [x] Revoke retains the record with a reason; supersede links to the original; neither deletes
- [x] A `decision` cannot be verified (or rejected) and is excluded from achievement counts
- [x] `recorded_by` / `verified_by` reflect the authenticated user even when a different value is posted
- [x] Cross-company requests return `403`
- [x] `php -l` clean

---

### Phase 5 — Results Workspace UI

A company-level view of what actually changed — including what is **awaiting review**.

**Status: ✅ Complete — 2026-09-16 (session 018). See the Phase 5 Completion section at the end of this document.**

#### Tasks

- [x] **5.1** Add route `company/:id/results` — lazy-loaded `ResultsPage` (standalone, OnPush, signals, `inject()`).
- [x] **5.2** Render measurable records as **baseline → goal → actual** with unit, direction and the measurement `completeness` from the snapshot; render qualitative records as a dated outcome with evidence (no empty financial fields — they show "Qualitative").
- [x] **5.3** Add **Measured targets awaiting review** (`achievements/awaiting-review.php`) as its own scope, showing the target, computed baseline → goal → actual and completeness, with a "Record outcome" action — before any achievement is created.
- [x] **5.4** Keep **Decisions** visually separate (own scope) with an **event-date label** ("Decision date"); decisions show an "Event" state and are excluded from achievement counts.
- [x] **5.5** Toolbar + filter panel (Kind / Verification / Category / Target), search, Table ⇄ Grouped toggle (grouped by category) — reuses `.sw-*` and `app-icon`.
- [x] **5.6** Create / Edit record popup (view ⇄ edit): title, kind, category, achieved/event date, description, optional target link, optional measurement fields, evidence summary; evidence attach/list.
- [x] **5.7** Verify / Reject / Revoke / Supersede actions with `unverified` / `verified` / `rejected` / `revoked` badges; Revoke requires a reason.
- [x] **5.8** `CompanyShell` nav: renamed `GPS Targets` → `Targets`, added `Results`; tab overflow (`More`) intact.
- [x] **5.9** Extended `DashboardNormalizedCardsComponent` with a **Results & achievements** card (total + verified + decisions, via `counts.php`) and an "Open Results →" link.

#### Exit Criteria

- [x] `company/:id/results` renders from normalized endpoints only
- [x] Measured targets **awaiting review** appear without any manually-created achievement
- [x] Measurable records show baseline → goal → actual; qualitative records render without financial fields or a target
- [x] A target with missing financial periods renders `incomplete`, not a false achievement
- [x] Decisions are visually distinct, event-date labelled, and excluded from achievement counts
- [x] Create → verify → revoke/delete round-trip behaves per the access rules
- [x] `Results` tab present, `Targets` renamed, overflow intact, **0 runtime console errors**
- [x] Components are standalone/OnPush/signals with `@if`/`@for`; `ng build` passes

---

### Phase 6 — Financial-Screen Target Entry

Let entrepreneurs create targets directly from financial management.

**Status: ✅ Complete — 2026-09-16 (session 019). See the Phase 6 Completion section at the end of this document.**

#### Tasks

- [x] **6.1** On the revenue screen, added **Create revenue target** and **Link existing target** actions, prefilled with the company, measure (`REVENUE_TOTAL` / `REVENUE_EXPORT`) and the financial-year/quarter period.
- [x] **6.2** `Create target` creates the `gps_target` + metric binding (`period_total`) **in one transactional request** (`gps-targets/create-measured.php`).
- [x] **6.3** `Link existing target` attaches the binding to a selected company target (`gps-targets/link-measure.php`), upserting by (target, measure) so there is no duplication.
- [x] **6.4** Provenance recorded via `gps_target_sources` with `source_type='manual'` and a measure/period note (single row per target).
- [x] **6.5** Inline confirmation shows the new target's id with links to the **Targets** and **Results** workspaces.
- [x] **6.6** Prefill previews both periods through the measurement service and **warns** (`no_accounts` / `partial_coverage` / `unknown` / `incomplete` / unresolved rows) instead of fabricating a baseline.

#### Exit Criteria

- [x] `Create target` on the revenue screen produces a metric-mode target with the measure, period, direction and goal, visible in `Targets` and `Results`
- [x] `Link existing target` attaches the binding to an existing target without duplicating it
- [x] Provenance appears as a manual/financial origin, not a SWOT origin
- [x] Missing financial periods produce a warning, not a fabricated baseline
- [x] Locked revenue calculations are reused (no re-entry of revenue data); **no reads/writes to `metric_records`**
- [x] Standalone/OnPush/signals; `ng build` passes

---

### Phase 7 — Target Popup Integration

Bring measurement and achievement into the existing target detail.

#### Tasks

- [ ] **7.1** Extend the `gps-targets-v2` popup view with an **Actual** section for `metric`-mode targets (derived actual, baseline → target, period, `completeness`).
- [ ] **7.2** Add an **Achievements** section in the popup — list + add, reusing Phase 4 endpoints.
- [ ] **7.3** Measure-binding UI in popup edit mode: select `metric_type` + baseline/target period + direction + calculation method (`period_total`) + maintain tolerance when applicable.
- [ ] **7.4** Display **Task progress** and **Outcome progress** as two clearly-labelled figures (never merged into one bar).
- [ ] **7.5** Replace the remaining `prompt()` task editing on both workspaces with the inline popup editor (carried debt from Sprint 006).

#### Exit Criteria

- [ ] Popup shows separate task % and outcome % for the same target
- [ ] A metric-mode target displays a derived actual + completeness
- [ ] Binding a measure creates/extends `gps_target_metrics` and sets `progress_mode='metric'`; `maintain` requires a tolerance
- [ ] Achievements can be added and listed from the target popup
- [ ] No `prompt()` remains in `swot-hierarchy.page.ts` or `gps-hierarchy.page.ts`
- [ ] `ng build` passes; **0 console errors**

---

### Phase 8 — End-to-End Verification, Docs, Cleanup

Prove both entry points and the vertical slice, then hand over the pattern.

#### Tasks

- [ ] **8.1** Run the complete slice locally via the **SWOT entry point**: revenue **finding (SWOT) → target → tasks → calculated actual → evidenced achievement**.
- [ ] **8.2** Run the complete slice via the **financial entry point**: revenue screen → **Create target** (prefilled measure/period) → calculated actual → evidenced achievement. Confirm the target also appears in `Targets` and in **Results**.
- [ ] **8.3** Record one **qualitative** achievement with no target, and one **decision**; confirm the decision is excluded from achievement counts and labelled as an event.
- [ ] **8.4** Confirm a **measured target awaiting review** appears in Results before any achievement is created.
- [ ] **8.5** Playwright pass across `results` + `gps-targets-v2` + the revenue entry point; confirm **0 post-login console errors**.
- [ ] **8.6** Update `.ai/sessions/` (new session file), this sprint's progress, and `migrations/README.md`.
- [ ] **8.7** Confirm the `MetricRecord.php` removal orphaned no endpoints; `php -l` sweep and `ng build`.
- [ ] **8.8** Document the reusable pattern (measure → account binding → period → calculation method → actual → achievement) for employment, profitability, funding and qualitative milestones.

#### Exit Criteria

- [ ] Both entry points (SWOT and financial) produce a target that reaches a calculated actual and an evidenced achievement
- [ ] The financial entry point proves company + measure + period prefill
- [ ] A qualitative achievement and a decision are demonstrated; the decision is excluded from achievement counts
- [ ] A measured target appears under **awaiting review** before any achievement exists
- [ ] The full slice is demonstrated and screenshotted
- [ ] Every prior phase's exit criteria is satisfied
- [ ] Session + sprint + migration docs updated (Rule of Three)
- [ ] A production deployment plan is documented — **not executed** without explicit go-ahead
- [ ] `php -l` and `ng build` both clean

---

## Execution Order

```
Phase 1 ──> Measurement Foundation (schema, mapping, dead-code removal)
    │
    ▼
Phase 2 ──> Outcome / Task Progress Decoupling
    │
    ▼
Phase 3 ──> Actuals Calculation Service (revenue) + Measurement Contract
    │
    ▼
Phase 4 ──> Achievements & Evidence Backend (verify, snapshot, decisions)
    │
    ▼
Phase 5 ──> Results Workspace UI (incl. awaiting review)
    │
    ▼
Phase 6 ──> Financial-Screen Target Entry
    │
    ▼
Phase 7 ──> Target Popup Integration
    │
    ▼
Phase 8 ──> End-to-End Verification, Docs, Cleanup
```

Each phase must satisfy its **Exit Criteria** before the next phase begins.

---

## Target File Structure

```
api-incubator-os/
├── migrations/
│   └── 2026-09-15-results-achievements.sql          (NEW)
├── models/
│   ├── MetricTypeAccount.php                        (NEW)
│   ├── Achievement.php                              (NEW)
│   ├── AchievementEvidence.php                      (NEW)
│   ├── GpsTargetMetric.php                          (extend)
│   ├── GpsTargetTask.php                            (modify recalc)
│   ├── GpsTarget.php                                (add taskProgress)
│   └── MetricRecord.php                             (DELETE)
├── services/
│   └── TargetMeasurementService.php                 (NEW)
└── api-nodes/
    ├── metric-type-accounts/{list,get,create,update,delete}.php       (NEW)
    ├── achievements/{list,get,create,update,delete,verify,revoke,supersede,by-company,by-target,awaiting-review}.php (NEW)
    ├── achievement-evidence/{list,create,delete}.php                  (NEW)
    ├── gps-targets/actual.php                                        (NEW)
    ├── gps-targets/{create,update,get}.php                           (extend — financial entry prefill/binding)
    ├── gps-target-metrics/{list,get}.php                             (extend responses)
    ├── gps-target-tasks/{create,update,delete}.php                   (recalc change)
    └── enhanced-metrics.php                                          (DELETE)

src/
├── app/
│   ├── app.routes.ts                               (add company/:id/results)
│   ├── components/company-shell/
│   │   ├── company-shell.component.ts              (rename GPS Targets → Targets, add Results)
│   │   └── financial-shell/components/revenue.component.ts (add Create/Link target actions)
│   └── features/normalized/
│       ├── results/results.page.ts                 (NEW — incl. awaiting review + decisions)
│       ├── gps-hierarchy/gps-hierarchy.page.ts     (extend popup)
│       ├── dashboard-cards/dashboard-cards.component.ts (add Achievements + awaiting-review)
│       └── services/
│           ├── achievements.service.ts             (NEW)
│           └── gps.service.ts                      (extend: actual, achievements)
└── styles.scss                                     (extend .sw-* only if genuinely shared)
```

---

## Out of Scope

* Wiring actuals for measures **beyond revenue** (employment, profitability, funding) — the pattern is established, but only revenue is proven end-to-end in this sprint.
* Calculation methods beyond `period_total` (`closing_balance`, `headcount`, `ratio`) — reserved, not selectable.
* Automatic import of achievements from financial data without human review.
* A file-storage/upload backend — `achievement_evidence.source_type='file'` references an external asset id or URL only.
* **Funder-ready achievement export** — deferred. Verified evidence is preserved now so reliable exports can be added later.
* Retroactive auto-repair of targets previously marked `completed` by task recalc — documented and handled by manual review.
* Removing the legacy `nodes`-based SWOT/GPS screens.
* Multi-currency FX conversion (single currency as captured on the account/measure).
* Reworking the platform's metric definitions beyond the revenue binding.

---

## Future Modules (Reserved)

Documented to prevent architectural assumptions that would conflict with future work:

* Metric actuals for employment, profitability, funding and ratio measures (reusing `metric_type_accounts` + `TargetMeasurementService`).
* Achievement export (PDF / funder report) generated from `achievements` + `achievement_evidence`.
* Reminders / notifications on target review dates and overdue outcomes.
* An approval workflow beyond `verify` / `revoke` / `supersede`.
* Periodic automatic metric snapshots into `achievement_evidence` (`source_type='metric_snapshot'`) on a schedule.
* Additional `calculation_method` implementations.

---

## Definition of Done

The sprint is complete when:

- [ ] All 8 phases are complete and every phase exit criterion is satisfied
- [ ] A measurable target's actual is derived from `company_financial_yearly_stats` through `metric_type_accounts` — never re-entered into `metric_records`
- [ ] Account resolution is company-scoped; overlapping bindings are deduplicated; incomplete/missing data is reported as such, never as a false zero/achievement
- [ ] The Measurement Contract is implemented exactly: period refs, `increase`/`decrease`/`maintain` formulas, explicit tolerance, and the `target == baseline` guard
- [ ] Task completion and outcome progress are independent; finishing all tasks never auto-completes a target
- [ ] Achievements are dated (`achieved_on`), attributable (`recorded_by`), verifiable (`verified_by`), and may exist without a target; identities are server-derived
- [ ] The measurement snapshot is captured **automatically and atomically** on verification, with periods, account bindings, completeness and `calculation_version`
- [ ] Verified achievements and evidence are immutable; corrections **revoke** (with reason) or **supersede** — nothing verified is destroyed
- [ ] Verification is permitted for System Administrator or an authorized coach scoped to the company — consistent across backend, UI and this document
- [ ] Decisions are distinguishable from achievements, excluded from counts, and event-date labelled
- [ ] `company/:id/results` shows **measured targets awaiting review** alongside recorded results and achievements
- [ ] `Create target` / `Link existing target` on the revenue screen create a prefilled metric target visible in `Targets` and `Results`
- [ ] The `Targets` popup shows separate task % and outcome %, a derived actual, and its achievements
- [ ] Dead code removed: `models/MetricRecord.php` and `api-nodes/enhanced-metrics.php`
- [ ] Locked foundation untouched: no changes to existing table shapes beyond the additive `gps_target_metrics` columns; no changes to the shared `.sw-*` design language
- [ ] All new Angular code is standalone, `OnPush`, signals/`computed()`/`inject()`, `@if`/`@for`; lazy-loaded
- [ ] Company isolation enforced on every new endpoint; authorized actions (verify, measure binding) guarded
- [ ] `php -l` clean on all new/changed PHP; `ng build` passes; **0 console errors** on `results` and `targets`
- [ ] Session file + sprint progress + `migrations/README.md` updated (Rule of Three)
- [ ] Production deployment plan documented and **not executed** without explicit go-ahead

---

## Source Review — 2026-09-14 (code-verified)

**Verdict: the problem statement is correct. Three of its conclusions are too soft and two material facts are missing — all reflected in the spec above.**

### Claims confirmed against the code

| Claim | Evidence |
| --- | --- |
| The normalized model exists as described | Live DB: `gps_targets`, `gps_target_tasks`, `gps_target_sources`, `gps_target_updates`, `gps_target_metrics` |
| `current_value` is only a placeholder | `models/GpsTargetMetric.php:8` — *"cached snapshot only; … derive from metric_records instead of dual-maintaining"*; same note in the migration |
| Tasks mode auto-completes the parent target | `models/GpsTargetTask.php:150-152` — `done === total` ⇒ parent `status='completed'` + `completed_at` |
| Metric mode still displays the manual scalar | `gps-hierarchy.page.ts:229-263` renders `manual_progress_percentage` and labels it `% · progress_mode` |
| Revenue is already derived from monthly financials | `company_financial_yearly_stats` (`m1…m12`, generated `total_amount`) + `CompanyFinancialYearlyStatsService.calculateQuarterlyTotals` |
| `MetaValueSyncService` is destructive (no history) | `models/MetaValueSyncService.php:15` — delete-all-then-insert per node |
| Navigation points at the normalized screens | `company-shell.component.ts:107-113` (label currently `GPS Targets`) |

### Corrections — where the source review undersells

1. **"Both metric shapes coexist" is not an open design question — `MetricRecord.php` is dead, broken code.** The live `metric_records` table has `year_, q1…q4, total, margin_pct, unit, notes, title`. There is **no** `year`, `quarter`, `value`, or `note` column, yet `models/MetricRecord.php:18` inserts exactly those. Its only instantiator is `api-nodes/enhanced-metrics.php`, which has **zero** references from `src/`. The authoritative shape is already settled (`q1…q4`); the action is deletion (Phase 1.6), not reconciliation.
2. **Nothing exists for achievements or evidence.** No `achievements` / `results` / `outcome` tables and no evidence/attachment tables. `gps_targets.success_evidence_required` is a single text column with no structure behind it (`NormalizedMigrator.php:390` writes the legacy value into it). "Preserve the evidence used at review" requires new tables (Phase 4), not a field.
3. **One scalar is overloaded across all three progress modes.** `recalcTaskProgress` **overwrites** `manual_progress_percentage` (`GpsTargetTask.php:151/154/157`) and metric mode reads it. So "show task completion and outcome progress separately" is a **data-model change**, not a display tweak (Phase 2).

### Missing from the source review

1. **The hard part is not `metric_records` — it is the measure→account mapping.** `gps_target_metrics` stores a `metric_type_id` (a definition row), while revenue *data* lives in `company_financial_yearly_stats` keyed by `account_id` + `financial_year_id`. No table links a `metric_type` to the account(s) that feed it. `metric_types.period_type` and `company_accounts.account_type` (`domestic_revenue` / `export_revenue` / `expense` / `other`) are the bridge. This gating table is Phase 1; without it "reuse the revenue calculation" is not a service call but a mapping build.
2. **`gps_target_sources.source_type` is already richer than SWOT.** Enum: `swot_item, coaching, assessment, programme, funder, manual, legacy_unlinked` — reuse it for provenance rather than inventing parallel linking.

### Verified so the spec could be precise

* Live `metric_records` columns inspected directly (container `incubator-os-mysql-container`, DB `incubator_os`).
* `metric_types` present: `REVENUE_TOTAL` (ZAR, QUARTERLY), `REVENUE_EXPORT`, `REVENUE_ANNUAL`, plus employees, funds and ratios — revenue bindings seeded in Phase 1.2.
* `company_accounts.account_type` enum confirmed; `financial_years` (10 rows) available for baseline/target periods.
* Scope of this review: **source + live local schema only.** The deployed production database and runtime behaviour were **not** re-verified in this review (prod was last verified in the Sprint 006 deployment, session 010).

---

## Amendment Review — 2026-09-14 (reviewer feedback incorporated)

The four open questions from the source review are **resolved** and the five issues raised against `127561d` are **fixed**. The spec above is the amended, locked version.

### Question resolutions

| Question | Resolution adopted |
| --- | --- |
| Snapshot on verification? | **Automatic and mandatory for measurable achievements** — computed server-side and saved **atomically** with verification, including periods, account bindings, completeness, and `calculation_version` (Phase 4.5, Invariants, DoD). A failed snapshot aborts verification. |
| Maintain tolerance? | **Explicit absolute or percentage**, stored as a value + unit, **required** — never an implicit percentage (Phase 1.4, Measurement Contract, Lookups). |
| Funder export? | **Deferred.** Listed in Out of Scope; verified evidence is preserved now so exports can be added reliably later. |
| Final label? | **`Targets`** — consistent with the earlier meeting decision; **existing routes unchanged**. |

### Issues fixed

1. **Financial-screen entry point added** — new **Phase 6**: `Create target` / `Link existing target` on the revenue screen, prefilled with company, measure and period, provenance via `gps_target_sources.source_type='manual'`. Phase 8 now proves **both** entry points (SWOT and financial), and the Objective/DoD require it.
2. **Evidence vs deletion reconciled** — drafts (`unverified`) may be edited/deleted and hard-deleted; **verified achievements and evidence are immutable** and are corrected by **revoke** (with reason) or **supersede** (`supersedes_id`). Evidence delete returns `409` once verified (Architecture Decision 4, Invariants, Phase 4.2/4.4/4.6).
3. **Verification permissions made consistent** — **System Administrator or an authorized coach scoped to the achievement's company**, stated identically in Architecture Decision 8, Phase 4.3, Phase 4 exit criteria, Phase 5.7, and the Definition of Done. `recorded_by` / `verified_by` are **always derived from authentication**, never the request body.
4. **Measurement rules given precise contracts** — new **Measurement Contract** section: period-reference formats, company-scoped account resolution, overlapping-binding deduplication by `account_id`, missing-account/month behaviour (`no_accounts` / `incomplete` + `missing_months[]`), `increase`/`decrease`/`maintain` formulas, explicit tolerance, the `target == baseline` guard (`invalid_definition`, no divide-by-zero), and `calculation_method` restricted to the implemented `period_total`.
5. **Decisions made distinguishable** — `kind='decision'` is an event: excluded from achievement counts, cannot be verified, does not imply target success, and is UI-labelled with an event date ("Decision date"), not "Achieved on" (Invariants, Phase 4.1/4.7, Phase 5.4).

### Additionally

* **Results workspace extended** — **Phase 5.3** adds **Measured targets awaiting review** (`achievements/awaiting-review.php`), so entrepreneurs surface in Results before anyone manually creates an achievement. Phase 8.4 verifies this.
* **Phase count corrected** to **8** (financial entry inserted as Phase 6; popup and verification phases renumbered).

---

## Phase 1 Completion — 2026-09-15 (session 014)

**Status: ✅ Complete. All Phase 1 tasks and exit criteria satisfied. Stopped at the Phase 1 review gate — no production deployment.**

### Delivered

| Item | File |
| --- | --- |
| Migration (3 tables + 9 columns + seeded bindings + rollback notes) | `api-incubator-os/migrations/2026-09-15-results-achievements.sql` |
| Measure→account model (company-scoped resolve + dedup) | `api-incubator-os/models/MetricTypeAccount.php` |
| Measurement-field extension + validation + latent-bug fix | `api-incubator-os/models/GpsTargetMetric.php` |
| Guarded endpoints (SA-only) | `api-incubator-os/api-nodes/metric-type-accounts/{list,get,create,update,delete}.php` |
| Dead code removed | `api-incubator-os/models/MetricRecord.php`, `api-incubator-os/api-nodes/enhanced-metrics.php` |
| Docs | `api-incubator-os/migrations/README.md` (row #18, local command, financial-semantics notes) |

### Validation evidence

* **Migration idempotency** — applied to local `incubator_os`; second run emitted only `… exists` notes, exit 0, no errors.
* **Schema** — 3 tables present; all **9** new `gps_target_metrics` columns present with correct types/enums.
* **Seeded bindings** — 5 rows: `REVENUE_TOTAL` × {domestic_revenue, export_revenue}, `REVENUE_EXPORT` × {export_revenue}, `REVENUE_ANNUAL` × {domestic_revenue, export_revenue}, all `is_revenue=1`, `combine_mode=sum`.
* **Company-scoped resolution** — `resolveAccounts(REVENUE_TOTAL, 11)` → accounts `16,80` (all company 11, all domestic_revenue); `resolveAccounts(REVENUE_TOTAL, 59)` → accounts `1,88` and contains **neither** 16 nor 80.
* **Dedup** — adding an overlapping pinned binding for account 16 still returned account 16 **exactly once**; no duplicate account ids.
* **Validation** — `calculation_method='closing_balance'` rejected (`Unsupported calculation_method … implemented: period_total`); `direction='maintain'` without tolerance rejected; with tolerance accepted and stored.
* **Endpoint guard** — unauth → `401`; Director (non-admin) → `403`; SA → bindings JSON; `get.php?id=1` → binding; missing id → `404`.
* **`php -l`** — clean on both models + all 5 endpoints. **`ng build`** — passes.

### Issues found and fixed

1. **[BUG, pre-existing] `GpsTargetMetric::attach()` always returned `null`.** It read `lastInsertId()` *after* the `UPDATE gps_targets SET progress_mode='metric'`, and an UPDATE resets `lastInsertId()` to `0` on this MySQL/PDO build → `getById(0)` → `null`, which with `strict_types` + `array` return type is a fatal `TypeError`. Never surfaced because metric writes were out of scope ("read-only chips only") in Sprint 006. Fixed by capturing the id immediately after the INSERT.
2. **[DESIGN CLARITY] `account_id` on a global binding.** `metric_type_accounts` is keyed by measure (global), so a pinned `account_id` is company-specific. Implemented semantics: `account_id = NULL` resolves by `account_type` within the requested company; a pinned `account_id` matches that account **only when it belongs to the requested company** (otherwise ignored). Documented in the model and this spec.

### Financial-schema findings (drives Phase 3)

Inspected `company_financial_yearly_stats` before assuming missing vs zero:

* `m1…m12` are nullable, but **0 of 179** live rows have any NULL month — month-nullness alone cannot signal "not captured".
* Row **presence** per (`company_id`, `account_id`, `financial_year_id`) is the only structural "captured" signal; an all-zero row is indistinguishable from a true zero.
* Generated `total_amount` `COALESCE`s NULL→0, so it must **not** be used for completeness.
* `account_id` is NULL on **105 of 179** rows → resolve by `company_accounts.account_type` per company, not by `account_id`.
* No `export_revenue`/`expense` accounts exist yet (91 `domestic_revenue`, 1 `other`) → `export_revenue` bindings resolve to zero accounts and must surface as `no_accounts`, never `0`.

Recorded in `migrations/README.md` for Phase 3.

### Remaining issues / notes

* `config/headers.php:26` emits an `Undefined array key "REQUEST_METHOD"` warning under CLI only (test harness); harmless over Apache. Pre-existing, not introduced here.
* Production migration **not** applied (out of scope — Phase 1 review gate).

---

## Phase 2 Completion — 2026-09-15 (session 015)

**Status: ✅ Complete. All Phase 2 tasks and exit criteria satisfied. Stopped at the Phase 2 review gate — no production deployment.**

### Delivered

| Item | File |
| --- | --- |
| Parent mutation removed + rationale comment | `api-incubator-os/models/GpsTargetTask.php` |
| Read-only aggregate `taskProgress()` + embedded in `getById` | `api-incubator-os/models/GpsTarget.php` |
| Task endpoints return aggregate (additive) | `api-incubator-os/api-nodes/gps-target-tasks/{create,update,delete}.php` |
| Phase 3 constraints + auto-complete review note | `api-incubator-os/migrations/README.md` |

### Validation evidence

* **Model-level (transactional, rolled back)** — every case passed:
  * add tasks → parent unchanged; aggregate `0/2 = 0%`
  * complete 1 → `1/2 = 50%`; parent unchanged
  * **complete all → `2/2 = 100%`; parent stays `in_progress`, `completed_at` NULL, `manual_progress_percentage` 42** (the core requirement)
  * reopen → `1/2 = 50%`; parent unchanged
  * delete → aggregate recalculated; parent unchanged; no tasks → `0/0/0.0`
  * target with no tasks → `0/0/0.0`
  * manual-mode target untouched by task activity; explicit progress update still works
* **Endpoint-level (real POST through guard, SA session)** — `create` → task row + `task_progress {1,0,0}`; `update` (complete) → task row + `task_progress {1,1,100}` and parent still `in_progress / 42.00 / NULL`; `delete` → `{success,id}` + `task_progress {0,0,0}`. Temp target cleaned up.
* **`php -l`** clean on both models + all 5 task endpoints. **`ng build`** passes.

### Previously auto-completed targets (documented, not changed)

* Audit of the local DB: **1** target uses `progress_mode='tasks'` (id 49, company 10) — `status='in_progress'`, `completed_at` NULL, `manual_progress_percentage` 75, 4 tasks / 3 done. **No target is currently in an auto-completed state.**
* Detection query for other environments (manual review; do **not** auto-repair):
  ```sql
  SELECT id, company_id, status, completed_at, manual_progress_percentage
  FROM gps_targets
  WHERE progress_mode = 'tasks' AND status = 'completed';
  ```
* Historical `status`/`completed_at` values are **left unchanged** — this phase stops future mutation only.

### Compatibility notes

* Task endpoint responses are **strictly additive**: the task object is unchanged plus a new `task_progress` key; `delete.php` keeps `{success,id}` and adds `task_progress`. `reorder.php` is unchanged (returns the ordered array; it does not affect completion).
* `GpsTarget::getById()` (and therefore `gps-targets/get.php`, and `add()`'s return) now includes `task_progress` — additive, ignored by the current Angular interfaces.
* **[Intentional behaviour change]** For a `tasks`-mode target, the parent's `manual_progress_percentage` / `status` no longer follow task completion, so the workspace's **Progress** column no longer updates when tasks are ticked. This is the decoupling requested; the two-figure display split (Task progress vs Outcome progress) is **Phase 7**. No frontend code was changed this phase.

### Remaining issues / notes

* `config/headers.php:26` CLI-only `REQUEST_METHOD` warning persists (test harness); harmless over Apache, pre-existing.
* Production migration **not** applied (Phase 2 review gate).

---

## Phase 3 Completion — 2026-09-15 (session 016)

**Status: ✅ Complete. All Phase 3 tasks and exit criteria satisfied. Stopped at the Phase 3 review gate — no production deployment; no data altered.**

### Delivered

| Item | File |
| --- | --- |
| Read-only actuals service (company-scoped, dedup, per-period completeness, formulas) | `api-incubator-os/services/TargetMeasurementService.php` |
| Derived-actual endpoint | `api-incubator-os/api-nodes/gps-targets/actual.php` |
| Metric list now carries the derived actual | `api-incubator-os/api-nodes/gps-target-metrics/list.php` |

### Calculation examples (controlled fixtures)

| Direction | Baseline | Goal (`target_value`) | Actual | Result |
| --- | --- | --- | --- | --- |
| increase | 100 | 200 | 150 | 50% |
| decrease | 100 | 60 | 80 | 50% |
| maintain (absolute 10) | 100 | — | 105 | met (drift 5 ≤ 10) |
| maintain (percent 10%) | 100 | — | 115 | not met (drift 15 > 10) |
| maintain (percent, baseline 0) | 0 | — | 5 | `invalid_definition` (percent of zero) |
| increase (goal = baseline) | 100 | 100 | 150 | `invalid_definition` (no divide by zero) |

Period maths cross-checked against `CompanyFinancialYearlyStatsService.calculateQuarterlyTotals`: **Q1 = m1–m3 (`10+20+30=60`)**, **Q2 = m4–m6 (`40+50+60=150`)**, full year = m1–m12 (`780`). With `financial_years.start_month = 3`, Q2 labels **Jun, Jul, Aug**.

### Completeness model (per period)

`no_accounts` → `partial_coverage` → `incomplete` → `unknown` → `complete`, in that precedence:

* **`no_accounts`** — the bindings resolve to no accounts for the company.
* **`partial_coverage`** — only some required bindings resolve (e.g. `Revenue` needs `domestic_revenue` + `export_revenue`; the company has no `export_revenue` account). Subtotal is **partial revenue**, not combined revenue.
* **`incomplete`** — a resolved account has no row for the period, or a required month is NULL.
* **`unknown`** — rows exist but are entirely zero-filled: capture cannot be confirmed (legacy zero-fill).
* **`complete`** — all bindings resolve, all rows present, and the row is populated (at least one non-zero month) so its zeros are **confirmed**.

`authoritative` / `eligible_for_achievement` require **both** periods `complete` **and** zero unresolved rows in both. Progress is computed only when both periods are `complete`; if unresolved rows exist the value is non-authoritative.

### Validation evidence

* **43/43 controlled-fixture checks pass** (transactional, rolled back) covering: quarter boundaries, dedup, company isolation, partial coverage, no accounts, unresolved rows, unknown vs confirmed-zero, incomplete (NULL month / missing account), all six formula cases, separate baseline/target completeness, and unconfigured targets.
* **Cross-company isolation** — Director (company 1) reading company 11's target → `403`; unauth → `401`; missing `gps_target_id` → `400`; SA → well-formed JSON.
* **Read-only** — `TargetMeasurementService` contains no `INSERT`/`UPDATE`/`DELETE` and never references `metric_records` (grep-verified). No writes occurred to `metric_records`.
* **`php -l`** clean on the service and both endpoints.

### Contract changes (from the reviewed spec)

1. **Goal semantics corrected.** Progress now uses `gps_target_metrics.target_value` as the goal; the initial implementation wrongly used the target-period subtotal as the goal (caught by fixtures). Baseline = baseline-period subtotal, actual = target-period subtotal.
2. **Completeness expanded** from `complete/incomplete/no_accounts` to the five states above (adds `unknown` and `partial_coverage`), with `subtotal_is_partial` on every period.
3. **Authority gating**: `authoritative`/`eligible_for_achievement` require both periods `complete` **and** zero unresolved rows (per review); unresolved rows are excluded from subtotals and reported.
4. **`custom` periods** are supported only within a single financial year; multi-FY ranges return `invalid_period`.
5. **`maintain` + `percent` tolerance with a zero baseline** returns `invalid_definition`.

### What the existing local data supports (no backfill performed)

* **0 real metric links** (`gps_target_metrics` empty) → every current target reports `configured=false / no_measure_configured`.
* **105 of 179** financial rows have `account_id IS NULL` (unresolved) → excluded and reported; **4** rows are all-zero (`unknown`).
* **`Revenue` (REVENUE_TOTAL) is always `partial_coverage`**: no company has an `export_revenue` account, so the combined binding never fully resolves. Example — company 11 baseline fy4 / target fy1: `partial_coverage`, target subtotal `75,838` (domestic only), export binding unresolved, account "Secondary" has no row → `progress not_computed`, non-authoritative.
* A **domestic-only** measure could reach `complete` for a company whose accounts are all populated (e.g. company 59, fy1: both domestic accounts have rows) — this is the realistic path to an authoritative result.
* **Nothing was silently repaired or backfilled.**

### Remaining issues / notes

* The revenue slice cannot be demonstrated end-to-end on real data until (a) an `export_revenue` account exists or a domestic-only measure is bound, and (b) the null-`account_id` rows are reconciled or explicitly accepted as excluded.
* `gps-target-metrics/list.php` computes the actual once per `gps_target_id` request (cheap); no per-row recalculation.
* Production changes remain out of scope (Phase 3 review gate).

---

## Phase 4 Completion — 2026-09-16 (session 017)

**Status: ✅ Complete. All Phase 4 tasks and exit criteria satisfied. Stopped at the Phase 4 review gate — no production deployment; local data unchanged (fixtures created and removed).**

### Delivered

| Item | File |
| --- | --- |
| Achievement model (lifecycle, snapshot, races, same-company checks) | `api-incubator-os/models/Achievement.php` |
| Evidence model (append-only, draft-deletable) | `api-incubator-os/models/AchievementEvidence.php` |
| Achievements endpoints (13) | `api-incubator-os/api-nodes/achievements/{list,get,create,update,delete,verify,reject,revoke,supersede,by-company,by-target,awaiting-review,counts}.php` |
| Evidence endpoints (3) | `api-incubator-os/api-nodes/achievement-evidence/{list,create,delete}.php` |
| Schema guard (≤1 metric snapshot per achievement) | `api-incubator-os/migrations/2026-09-16-achievements-snapshot-guard.sql` |
| Auth helper | `api-incubator-os/helpers/AuthGuard.php` — `auth_is_system_administrator()` (existing role only) |
| Goal exposed in measurement output | `api-incubator-os/services/TargetMeasurementService.php` — `measure.target_value` |

### Endpoint contracts

| Endpoint | Method | Success | Errors |
| --- | --- | --- | --- |
| `achievements/create.php` | POST `{company_id,title,kind?,category?,gps_target_id?,achieved_on?,…}` | `200` draft | `400` validation · `403` company |
| `achievements/update.php` | POST `{id,…}` | `200` (draft) | `409` verified · `403` |
| `achievements/delete.php` | POST `{id}` | `{success,id}` (draft) | `409` verified · `404` |
| `achievements/get.php` | GET `?id=` | `200` achievement + `evidence[]` | `404` |
| `achievements/list.php` (`by-company`, `by-target`) | GET `?company_id=` / `?gps_target_id=` | `200` array | `403` |
| `achievements/verify.php` | POST `{id}` | `200` verified (+1 `metric_snapshot` if measurable) | `409` ineligible/decided/decision · `403` non-SA |
| `achievements/reject.php` | POST `{id}` | `200` rejected (**no** snapshot) | `409` · `403` |
| `achievements/revoke.php` | POST `{id,reason}` | `200` revoked | `400` missing reason · `409` not verified · `403` |
| `achievements/supersede.php` | POST `{id,…overrides}` | `200` new **draft** | `409` not verified · `403` |
| `achievements/counts.php` | GET `?company_id=` | `{total,by_status,decisions}` (decisions excluded) | `403` |
| `achievements/awaiting-review.php` | GET `?company_id=` | array of eligible measured targets w/o verified outcome | `403` |
| `achievement-evidence/create.php` | POST `{achievement_id,source_type,label?,reference?,snapshot_json?}` | `200` | `404` · `403` |
| `achievement-evidence/delete.php` | POST `{id}` | `{success,deleted,id}` (draft) | `409` decided · `404` |

All create/update/delete requests derive `recorded_by` / `verified_by` / timestamps from the authenticated session; posted `recorded_by`, `verified_by` and `verification_status` are ignored.

### Lifecycle & transaction evidence (40/40 fixture checks)

* **Qualitative** (no target) verifies with **no snapshot**; `achieved_on` returned independently of `recorded_at`.
* **Measurable eligible** verify writes exactly one `metric_snapshot`; `baseline=100 / target(goal)=200 / actual=150` copied to the record; unit `ZAR`, direction `increase`; snapshot carries periods, values, unit, direction, tolerance, completeness, resolved accounts, `unresolved_rows`, eligibility and `calculation_version=rev1`.
* **Rejection** sets `rejected` + decider with **no snapshot**.
* **Decision** verify **and** reject both refused (`409`); unchanged; excluded from counts (`decisions` reported separately).
* **Draft edit/delete succeed; verified edit/delete → `409`**; draft evidence delete returns `{success:true,deleted:true,id}`; verified evidence delete → `409`.
* **Revoke** requires a reason (`400` without) and preserves the record + evidence; revoking a non-verified record → `409`.
* **Supersede** creates a linked draft (`supersedes_id`) and leaves the original verified with its evidence intact; superseding a non-verified record → `409`.
* **Rollback on failed measurement**: ineligible measurement → `409`, achievement stays `unverified`, **zero snapshots**.
* **Repeated verification**: second call → `409`, exactly one snapshot; the DB **functional unique index** blocks a second `metric_snapshot` even if the lock were bypassed.
* **Race handling**: `verify`/`reject`/`revoke` take `SELECT … FOR UPDATE` on the achievement row, re-check `verification_status`, and perform snapshot + status change in one transaction.

### Authorization results (endpoint-level)

* Non-SA (Director, company 11) `verify` / `reject` → **`403`**.
* SA `verify` → `200` verified; `reject` → `200` rejected.
* Cross-company list (Director company 1 → company 11) → **`403`**.
* Linking a target from another company → `400` (`Linked target (company X) does not belong to this achievement's company`).
* Unauthenticated → `401`; missing id → `400`.

### Schema correction (required)

`achievement_evidence` now has a **functional unique index** `uq_evidence_metric_snapshot` over `(CASE WHEN source_type='metric_snapshot' THEN achievement_id END)` — enforcing at most one metric snapshot per achievement. A stored generated column was attempted first but InnoDB rejects it (error 1215) because it derives from the foreign-key column `achievement_id`; the functional index is the working equivalent. Guarded + idempotent.

### Contract correction

The sprint's original Phase 4 exit criterion referenced an "authorized coach". **No Coach role exists** in this system (roles: Director, System Administrator, Judge; "coaching" is a feature domain). Per the instruction not to introduce a guessed role string, verification/rejection/revocation/supersede are **System Administrator only**, scoped by the existing `auth_require_company_access` rule; the coach path is deferred until a real role and access rule exist. The exit criterion in this document has been corrected accordingly.

### Remaining issues / notes

* `awaiting-review` returns nothing on local data (current measurements are only partial coverage) — expected; the eligible path is proven with fixtures.
* Supersede/revoke are SA-only (approval-style). Allowing a company user to draft a correction that SA then verifies is a possible future relaxation.
* Frontend not yet wired to the achievements endpoints (Phase 5 UI).
* Production changes remain out of scope (Phase 4 review gate).

---

## Phase 5 Completion — 2026-09-16 (session 018)

**Status: ✅ Complete. All Phase 5 tasks and exit criteria satisfied. Stopped at the Phase 5 review gate — no production deployment; UI fixtures created and removed.**

### Delivered

| Item | File |
| --- | --- |
| Results workspace (table/grouped, filters, search, scopes, popup, evidence, lifecycle) | `src/app/features/normalized/results/results.page.ts` (new) |
| Achievements/evaluations API client | `src/app/features/normalized/services/achievements.service.ts` (new) |
| Route `company/:id/results` | `src/app/app.routes.ts` |
| Nav: `GPS Targets` → **`Targets`**, added **`Results`** | `src/app/components/company-shell/company-shell.component.ts` |
| Results dashboard card (counts, decisions excluded) | `src/app/features/normalized/dashboard-cards/dashboard-cards.component.ts` |
| Shared status/kind styles (`.sw-badge.result/achievement/decision`, `.sw-pill.status-*`, `.sw-trio`, `.sw-snapshot`, `.sw-await-row`) | `src/styles.scss` |

No migration was required for this phase (UI only) — the Phase 1/4 schema already covered every state.

### Workspace structure

Three clearly separated scopes: **Results & achievements** (`kind` result/achievement), **Decisions** (separate scope, "Event" state, excluded from totals), and **Awaiting review** (eligible measured targets with no decided outcome). Table and Grouped views (grouped by category), toolbar with Table/Grouped, search, filter panel (Kind / State / Category / Target), refresh, Targets cross-link and Add result. Row click opens the view popup; drafts show inline Edit/Delete.

### Lifecycle behaviour (verified in-browser on a fixture company)

* **Measurable verified record** renders `100 → 200 → 150 ZAR`, direction, unit, linked target and an evidence list containing the **measurement snapshot** (`calc rev1 · authoritative`, baseline/target periods + subtotals + completeness). Footer shows **Revoke… / Supersede**, no Edit (immutable).
* **Qualitative records** render "Qualitative" with no empty financial fields and work with no target.
* **Draft popup**: Edit + Delete draft + evidence add form (Note / Link / Financial statement / Asset reference; `metric_snapshot` is automatic and not manually addable; `file` references an asset ID or URL only — no binary upload). Evidence add and delete both verified.
* **Create → edit → delete** round-trip verified through the UI (count 5 → 6 → edit → delete → 5).
* **Rejected** and **Revoked** states render their badges; **Decision** renders the "Event" pill and is excluded from counts.
* **Verify (SA)** prompts that verification captures the current authoritative financial snapshot; an ineligible measurement surfaces the backend `409` message and the record is reloaded unchanged (no local mutation).

### Authorization behaviour

* **SA** (System Administrator): Verify / Reject on drafts, Revoke / Supersede on verified records.
* **Director** (company user): draft authoring only — Edit / Delete on drafts and Add/Delete evidence; **no** Verify / Reject / Revoke / Supersede controls.
* **Cross-company**: a Director opening another company's Results shows the `403` message in the alert without crashing (empty state renders). Unauthenticated → `401`.

### Browser evidence (Playwright)

* Empty state (company 10) · full table with all states · verified measurable snapshot popup · decisions scope · grouped view · mobile (640px) grouped view · Director controls.
* **Filter**: 5 rows → 2 with the "Verified" chip (badge `1`), Clear all works. **Search**: "export" → 1 row.
* **Nav**: `Targets` + `Results` present; `More` overflow intact; mobile tabs scroll horizontally.
* **Console**: 0 post-login runtime errors (only the pre-auth `401` and the intentional cross-company `403`).
* Fixtures (company 900201 + company-11 drafts) created for authoritative/rejected/revoked/decision states and **removed after verification** (0 achievements / 0 evidence remained). The local Director password was set to a known test value to exercise the non-SA path (local only).

### API/UI contract corrections

1. **Decisions show an "Event" state** rather than a verification state (they are never verified), and are excluded from counts — the model's `unverified` status is not meaningful for them.
2. **Evidence add is UI-gated to drafts** (per the Phase 5 lifecycle), even though the Phase 4 backend permits appending evidence to verified records; the UI treats verified records as immutable for evidence.
3. **Manual numeric entry** on drafts is allowed only as a fallback for records without a configured measure; measurable records linked to a configured target are populated from the authoritative snapshot at verification.

### Remaining issues / notes

* `awaiting-review` and measurable snapshots remain empty on un-fixtured local data (revenue is only `partial_coverage`), so demoing the measurable path requires the controlled fixture (as done here).
* Numeric inputs bind to `number | null` but accept raw strings from the DOM; the backend casts — a typed form control would be tidier.
* No production changes (review gate).

---

## Phase 6 Completion — 2026-09-16 (session 019)

**Status: ✅ Complete. All Phase 6 tasks and exit criteria satisfied. Stopped at the Phase 6 review gate — no production deployment.**

### Delivered

| Item | File |
| --- | --- |
| Financial target-entry UI (action bar + create/link popup + period preview) | `src/app/components/company-shell/financial-shell/components/financial-target-entry.component.ts` (new) |
| Embedded on the revenue screen | `revenue.component.ts` (import + action bar + year options) |
| Client methods | `src/app/features/normalized/services/gps.service.ts` (`measurePreview`, `createFromMeasure`, `linkMeasure`) |
| Read-only period preview (reuses the measurement service) | `api-incubator-os/api-nodes/gps-targets/measure-preview.php` (new) |
| Transactional create (target + binding + provenance) | `api-incubator-os/api-nodes/gps-targets/create-measured.php` (new) |
| Transactional link (binding + provenance, no duplication) | `api-incubator-os/api-nodes/gps-targets/link-measure.php` (new) |
| Public measurement hooks | `api-incubator-os/services/TargetMeasurementService.php` (`measurePeriodForMetric`, `metricTypeByCode`) |

No migration required (endpoints + UI only).

### Behaviour (verified)

* **Preview** (`measure-preview`): company 11 `REVENUE_TOTAL` fy1 → `partial_coverage`, subtotal `75,838`, coverage `1/2` (domestic resolves; export unresolved), accounts `16` present + `80` missing, `unresolved_rows 0`, month totals returned. Invalid period → `invalid_period` (no fabrication).
* **Create** (`create-measured`): created target `#131` → `progress_mode='metric'`, `metric_type_id=1`, `target_value=250000`, `direction=increase`, `calculation_method=period_total`, plus a single `gps_target_sources` row `source_type='manual'` with the note `Financial measure REVENUE_TOTAL · target period …`.
* **Link** (`link-measure`): attached the binding to existing target `#118` and created exactly **one** manual provenance row; a second call updated the binding and created **no** duplicate source.
* **Browser** (Playwright, company 11 revenue screen): action bar renders; create popup prefills Combined measure + FY periods and shows the read-only preview with the **partial-coverage warnings**; create succeeds and shows the inline "Target #131 now appears in the central Targets workspace (Results)" confirmation; the link popup lists company 11's targets (marking already-metric ones).
* `ng build` passes (dev + prod). **0 post-login runtime console errors** (only the pre-auth `401`).

### Measures offered

Export revenue (`REVENUE_EXPORT`) and Combined revenue (`REVENUE_TOTAL`). The UI explains that a **domestic-only measure is pending definition approval** — per the Phase 3 review, `REVENUE_TOTAL` remains combined and shows partial coverage where export accounts are absent; no unapproved measure was invented.

### ⚠ Incident: local company 11 data loss and restoration

While developing the Phase 5 UI fixtures, the **first run of a buggy fixture-cleanup script deleted company 11's local `company_accounts`, `company_financial_yearly_stats` and `gps_targets`** (it iterated a teardown over company 11 and failed later on a users FK). Company 10 and 59 were unaffected. Company 11's local data was **restored faithfully**:

* **Financial rows** — copied identical `company_accounts` (ids 16, 80) and `company_financial_yearly_stats` (ids 139, 209; totals 75,838 / 123,865) from the local `incubator_os_prod` clone.
* **Normalized SWOT/GPS** — the swot analysis + 8 items had survived; `gps_targets` (12) + `gps_target_sources` (12) were recreated with the audited migration CLI (`normalized-migrate-cli.php --action=migrate --companyIds=11`).

Verified after restoration: co11 = 1 analysis · 8 items · 12 targets · 12 sources · 2 accounts · 2 stats. An orphaned `progress_mode='metric'` (from a raw metric delete during testing) was reset to `manual`; 0 orphan metric-mode targets remain. No production data was involved.

### Remaining issues / notes

* Local revenue remains `partial_coverage` for Combined revenue (no `export_revenue` accounts in any company), so the combined subtotal is explicitly partial.
* The financial target-entry popup currently offers per-period (FY/quarter) selection from the years present on the revenue screen; a dedicated quarter-level entry point could be added later.
* Production changes remain out of scope (review gate).

---

## Cross-cutting UX hardening — 2026-09-16 (session 020)

**Status: ✅ Complete. Client-requested standards applied to the current surfaces and written into `AGENTS.md`.**

### Delivered

| Item | Where |
| --- | --- |
| Shared view-state persistence helper (`ios:view:` keys, safe load/save) | `src/services/view-state.service.ts` (new) |
| Persist view mode / filters / sort / grouping / expansion (SWOT) | `swot-hierarchy.page.ts` — key `swot-hierarchy-view:${cid}` |
| Persist view mode / filters / sort / grouping (Targets) | `gps-hierarchy.page.ts` — key `gps-hierarchy-view:${cid}` |
| Persist scope / view mode / filters / sort / grouping (Results) | `results.page.ts` — key `results-view:${cid}` |
| Popups no longer close on backdrop click | Results, Targets, SWOT `.sw-modal` + `financial-target-entry` |
| Revenue target entry surfaced on the client-aligned screen | `financial-indicators-page.component.ts` (legacy entry retained) |
| Conventions documented | `AGENTS.md` — legacy financials freeze, popup rule, view persistence |

### Behaviour (verified)

* Backdrop click keeps the **financial target-entry** dialog, the **Results** create dialog, the **Targets** create dialog and the **SWOT** editor open; each closes only via Cancel/Close/X.
* Switching **Targets → Grouped**, **SWOT → Grouped** and **Results → Grouped** then reloading restores Grouped (`aria-selected=true`); the corresponding `ios:view:*` keys are written and re-read.
* `financial-indicators` (company 10) renders **Create revenue target** / **Link existing target**; financial-year options come from `FinancialYearService`.
* Legacy revenue screen keeps its target-entry (decision: **keep both**); no legacy financial screen code was modified or deleted.
* `ng build` passes; 0 post-login runtime console errors.

### Notes

* The `financial-indicators` dialogs already required an explicit close — no change was needed there.
* Legacy financial-shell dialogs were deliberately left untouched (freeze); apply the popup rule there only on explicit request.
