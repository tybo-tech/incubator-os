# Sprint 007 — Results & Achievements

> **Program**: Incubator OS — Business Growth Tracking (Assessment → Target → Action → Result → Achievement)
> **Status**: Locked — Phase 1 complete (2026-09-15); ready for Phase 2
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

#### Tasks

- [ ] **2.1** Modify `GpsTargetTask::recalcTaskProgress()` so it **no longer writes** `manual_progress_percentage`, `status`, or `completed_at` to `gps_targets`.
- [ ] **2.2** Add `GpsTarget::taskProgress(int $id): array` returning `{ total, completed, percent }` as a **read-only** aggregate.
- [ ] **2.3** Add outcome-progress derivation: for `progress_mode='metric'` outcome progress is computed from actual vs baseline/target (Phase 3); `tasks` mode reports task % for **display only**; `manual` mode is unchanged.
- [ ] **2.4** Update `gps-target-tasks/{create,update,delete,reorder}.php` responses to include task % while leaving the parent target untouched.
- [ ] **2.5** Document (do not auto-fix) any target previously flipped to `completed` by task recalc; add a manual-review note to the migration README.

#### Exit Criteria

- [ ] Completing all tasks does **not** set the parent target `status='completed'` or populate `completed_at` (verified via API)
- [ ] A `tasks`-mode target still reports task completion % via the read aggregate
- [ ] A `manual`-mode target behaves exactly as before
- [ ] Existing task CRUD endpoints return the same fields plus task % — no regressions
- [ ] `php -l` clean

---

### Phase 3 — Actuals Calculation Service (Revenue Vertical Slice)

Derive actuals from financial records through the measure→account binding, implementing the **Measurement Contract** above in full.

#### Tasks

- [ ] **3.1** Create `services/TargetMeasurementService.php` — given a `gps_target` + its metric link + `metric_type_accounts` binding, resolve accounts **scoped to the target's company** and sum `company_financial_yearly_stats.m1…m12` for the period; return `{ actual, baseline, target, unit, direction, completeness, missing_months, calculation_version }`.
- [ ] **3.2** Implement period-reference parsing for `financial_year` / `quarter` / `custom` (`financial_years.id`, `<fy_id>:Q<n>`, `YYYY-MM-DD..YYYY-MM-DD`) for both baseline and target.
- [ ] **3.3** Implement overlapping-binding **deduplication by `account_id`** so no account is counted twice.
- [ ] **3.4** Implement completeness: `complete` only when all accounts resolve and all months present; otherwise `no_accounts` / `incomplete` with `missing_months[]`.
- [ ] **3.5** Implement formulas for `increase` / `decrease` / `maintain` (explicit absolute/percent tolerance) and the `target == baseline` guard (`invalid_definition`, never divide by zero).
- [ ] **3.6** Add endpoint `api-nodes/gps-targets/actual.php?gps_target_id=` returning the calculated `{ actual, baseline, target, unit, direction, completeness, missing_months, progress, calculation_version }`.
- [ ] **3.7** Extend `gps-target-metrics/{list,get}.php` responses with the computed actual (read-only; never persisted to `metric_records`).

#### Exit Criteria

- [ ] For a revenue target on the local demo company, the computed actual equals the manual `CompanyFinancialYearlyStatsService.calculateQuarterlyTotals` figure for the same account(s) and financial year (cross-checked)
- [ ] Account resolution is company-scoped — a binding cannot resolve another company's accounts (verified)
- [ ] Overlapping bindings that resolve to the same `account_id` are counted once (verified)
- [ ] `no_accounts` and `incomplete` (with `missing_months[]`) are returned correctly and never presented as an achieved low/zero value
- [ ] `increase`, `decrease` and `maintain` (absolute + percent) all compute correctly; `target == baseline` returns `invalid_definition` without error
- [ ] No writes occur to `metric_records`
- [ ] `php -l` clean

---

### Phase 4 — Achievements & Evidence Backend

Make outcomes first-class, dated, attributable, verifiable and correctable without data loss.

#### Tasks

- [ ] **4.1** Add `models/Achievement.php` — `WRITABLE`, validate `kind` / `category` / `verification_status` / `direction` enums, allow null `gps_target_id`, keep `achieved_on` separate from `recorded_at`, forbid `kind='decision'` from verification.
- [ ] **4.2** Add `models/AchievementEvidence.php` — `add()` / `listByAchievement()` / `delete()`; delete permitted **only while the parent achievement is `unverified`**; cascade on draft delete only.
- [ ] **4.3** Add endpoints `api-nodes/achievements/{list,get,create,update,delete,verify,revoke,supersede}.php` with company isolation. `verify`/`revoke` permitted for **System Administrator or an authorized coach scoped to the achievement's company**; `delete` permitted for **drafts only**; `recorded_by` / `verified_by` derived from the authenticated session (never the request body).
- [ ] **4.4** Add endpoints `api-nodes/achievement-evidence/{list,create,delete}.php`; `delete` returns `409` for verified achievements.
- [ ] **4.5** **Automatic snapshot at verification**: on `verify`, `TargetMeasurementService` computes the snapshot server-side and it is written to `achievement_evidence` (`source_type='metric_snapshot'`) in the **same transaction** as the status change; the snapshot contains periods, account bindings, completeness, and `calculation_version`. Verification fails if the snapshot cannot be produced.
- [ ] **4.6** Implement revocation/supersession: `revoke` sets `verification_status='revoked'` + `revoked_reason`/`revoked_by`/`revoked_at` and retains the record; `supersede` links `supersedes_id` to the original. Neither hard-deletes.
- [ ] **4.7** Add list endpoints `achievements/by-company.php?company_id=`, `achievements/by-target.php?gps_target_id=`, and `achievements/awaiting-review.php?company_id=` (measured targets with a completed period and no recorded outcome), each with evidence counts; decisions excluded from achievement counts.

#### Exit Criteria

- [ ] An achievement with `gps_target_id = NULL` is accepted and returned (qualitative path)
- [ ] `achieved_on` and `recorded_at` are stored and returned independently
- [ ] Verifying a measurable achievement writes a `metric_snapshot` evidence row **atomically** — a failed snapshot aborts the verification (no partial state)
- [ ] A non-authorized coach / non-SA cannot verify; an authorized coach **within the company** can
- [ ] Evidence delete returns `409` for verified achievements; drafts can be cleaned up
- [ ] Revoke retains the record with a reason; supersede links to the original; neither deletes
- [ ] A `decision` cannot be verified and is excluded from achievement counts
- [ ] `recorded_by` / `verified_by` reflect the authenticated user even when a different value is posted
- [ ] Cross-company requests return `403`
- [ ] `php -l` clean

---

### Phase 5 — Results Workspace UI

A company-level view of what actually changed — including what is **awaiting review**.

#### Tasks

- [ ] **5.1** Add route `company/:id/results` — lazy-loaded `ResultsPage` (standalone, OnPush, signals, `inject()`).
- [ ] **5.2** Render measurable achievements as **baseline → target → actual** with period, `completeness`, and evidence reference; render qualitative achievements as a dated outcome with supporting evidence.
- [ ] **5.3** Add **Measured targets awaiting review** (`achievements/awaiting-review.php`) as a first-class section, so entrepreneurs appear here **before** anyone manually creates an achievement. Show target, measure, period, computed actual, and completeness.
- [ ] **5.4** Keep **Decisions** visually separate from achievements (own section/filter) with an **event-date label** ("Decision date", not "Achieved on"); decisions never appear in achievement counts.
- [ ] **5.5** Toolbar + filter panel (Kind / Category / Verification / Period), search, Table ⇄ Grouped toggle (group by category or verification) — reuse `.sw-*` and `app-icon`.
- [ ] **5.6** Create / Edit achievement popup (view ⇄ edit): title, description, `achieved_on` (or event date for decisions), optional target link, kind, category, direction/unit for measurable, evidence attach/list.
- [ ] **5.7** Verify / Reject / Revoke actions with a `unverified` / `verified` / `rejected` / `revoked` badge; Revoke requires a reason.
- [ ] **5.8** `CompanyShell` nav: rename `GPS Targets` → `Targets`, add `Results`; confirm tab overflow still works.
- [ ] **5.9** Extend `DashboardNormalizedCardsComponent` with an Achievements/Results card and an awaiting-review count (non-destructive, same props/pattern).

#### Exit Criteria

- [ ] `company/:id/results` renders from normalized endpoints only
- [ ] Measured targets **awaiting review** appear without any manually-created achievement
- [ ] Measurable achievements show baseline → target → actual; qualitative achievements render without a target
- [ ] A target with missing financial periods renders `incomplete`, not a false achievement
- [ ] Decisions are visually distinct, labelled with an event date, and excluded from achievement counts
- [ ] Create → verify → revoke/delete round-trip behaves per the access rules
- [ ] `Results` tab present, `Targets` renamed, overflow intact, **0 console errors**
- [ ] Components are standalone/OnPush/signals with `@if`/`@for`; `ng build` passes

---

### Phase 6 — Financial-Screen Target Entry

Let entrepreneurs create targets directly from financial management.

#### Tasks

- [ ] **6.1** On the revenue screen (`revenue.component.ts`), add **Create target** and **Link existing target** actions, prefilled with the company, measure (`REVENUE_TOTAL` / `REVENUE_EXPORT`), and the period currently being viewed (financial year / quarter from `company_financial_yearly_stats`).
- [ ] **6.2** `Create target` → create the `gps_target` (`gps-targets/create.php`) and bind the measure in `gps_target_metrics` (period + direction + `period_total`) in one flow; prefer a transactional single request over two client calls.
- [ ] **6.3** `Link existing target` → attach the measure binding to a selected unlinked company target (reuse the dropdown pattern from SWOT).
- [ ] **6.4** Record provenance via `gps_target_sources` with `source_type='manual'` and a period/measure note.
- [ ] **6.5** Show an inline confirmation that the target is now in the central **Targets** workspace, with a link.
- [ ] **6.6** Handle the "no accounts / incomplete financials" case in the prefill (warn rather than guess a baseline).

#### Exit Criteria

- [ ] `Create target` on the revenue screen produces a metric-mode target with the measure, period, direction and baseline prefilled, visible in `Targets` and `Results`
- [ ] `Link existing target` attaches the binding to an existing target without duplicating it
- [ ] Provenance appears as a manual/financial origin, not a SWOT origin
- [ ] Missing financial periods produce a warning, not a fabricated baseline
- [ ] Locked revenue calculations are reused (no re-entry of revenue data); **no reads/writes to `metric_records`**
- [ ] Standalone/OnPush/signals; `ng build` passes

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
