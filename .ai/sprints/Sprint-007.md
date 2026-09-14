# Sprint 007 — Results & Achievements

> **Program**: Incubator OS — Business Growth Tracking (Assessment → Target → Action → Result → Achievement)
> **Status**: Locked — ready for implementation
> **Duration**: Multi-phase (7 phases, sequential execution)
> **Previous work**: Sprint 002–006 — normalized SWOT/GPS hierarchy (`swot_analyses`, `swot_items`, `gps_targets`, `gps_target_sources`, `gps_target_tasks`, `gps_target_updates`, `gps_target_metrics`, `normalized_migration_audits`), 33 endpoints, dashboard cards, admin data-migration screen, production deployment, Notion-style SWOT/GPS workspaces with shared `.sw-*` styles and `app-icon`.

---

## Objective

Connect intent and activity to **measured outcomes**. Today the platform tracks what entrepreneurs intend to do (targets) and the work happening (tasks), but has no first-class link to what actually changed in the business.

This sprint delivers:

1. **Measured actuals** for targets, derived from authoritative sources — starting with revenue read from `company_financial_yearly_stats`, never re-entered into `metric_records`.
2. **Task progress separated from outcome progress**, so completing every task no longer auto-declares a business outcome achieved.
3. **Evidenced achievements** — dated, attributable, verifiable, with evidence preserved at review time — including achievements with no prior target.
4. **A company-level Results workspace** plus an in-target Actual/Achievements view.

The sprint proves **one complete vertical slice** — financial finding → target → tasks → calculated actual → evidenced achievement — as the reusable pattern for employment, profitability, funding, and qualitative milestones.

---

## Existing Foundation (Locked)

Must **NOT** be redesigned. Reuse as-is.

* **Normalized tables + models + endpoints**: `swot_analyses`, `swot_items`, `gps_targets`, `gps_target_sources`, `gps_target_tasks`, `gps_target_updates`, `gps_target_metrics`, `normalized_migration_audits`; `AuthGuard`, `auth_require_company_access`, `assertSameCompany`, transactional writes.
* **Angular normalized workspaces**: `company/:id/swot-v2` and `company/:id/gps-targets-v2` — table + grouped views, filter panel, multi-select bulk actions, view/edit popups, global `.sw-*` component stylesheet, shared `app-icon`.
* **`DashboardNormalizedCardsComponent`** and `CompanyShell` tab bar (`maxVisible`, overflow).
* **Admin migration screen** (`Admin → System Tools → Data Migration`) — SA-only, preview-gated, audited.
* **Financial data layer**: `company_financial_yearly_stats` (`account_id`, `financial_year_id`, `is_revenue`, `m1`…`m12`, generated `total_amount`), `CompanyFinancialYearlyStatsService` (`calculateQuarterlyTotals`, `getRevenueStats`), `revenue.component.ts`, `company_accounts` (`account_type`: `domestic_revenue` / `export_revenue` / `expense` / `other`), `metric_types` (`period_type`: `QUARTERLY` / `YEARLY` / `YEARLY_SIDE_BY_SIDE`), `financial_years`.
* **Authoritative metric record shape**: `metric_records` columns are `client_id, company_id, program_id, cohort_id, metric_type_id, category_id, year_, q1…q4, total, margin_pct, unit, notes, title`. This is the only supported shape — there is no `year` / `quarter` / `value` / `note` column.

> **Dead code to remove, not reconcile**: `models/MetricRecord.php` inserts `year, quarter, value, note` — columns that do not exist in the live schema. Its only consumer, `api-nodes/enhanced-metrics.php`, is not referenced anywhere in `src/`. Both are unusable; the "two metric designs" question is already settled in favour of the `q1…q4` shape.

---

## Business Capabilities

| Capability | Introduces / Extends |
| --- | --- |
| Measure → source binding | **New** `metric_type_accounts` mapping (metric definition → financial account type) |
| Target measurement periods | **Extends** `gps_target_metrics` (baseline/target period, direction, calculation method) |
| Calculated actuals (revenue) | **Extends** — derived from `company_financial_yearly_stats` via a reusable service |
| Task vs outcome progress | **Fixes** `GpsTargetTask::recalcTaskProgress` clobbering target status/progress |
| Results view (baseline → target → actual) | **New** company-level `Results` surface + per-target Actual panel |
| Evidenced achievements | **New** `achievements` + `achievement_evidence` |
| Qualitative achievements (no target) | **New** — `achievements.gps_target_id` nullable |
| Decisions (dated) | **Extends** — `achievements.kind = decision` |
| Verification | **New** — `recorded_by` vs `verified_by` / `verification_status` |

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
│        └── gps_target_sources ............... (locked) provenance
│
└── gps_targets ............................... (locked)
        ├── gps_target_tasks .................. (locked) → task completion % (activity only)
        ├── gps_target_updates ................ (locked) progress notes / history
        ├── gps_target_metrics ................ (EXTENDED) + periods, direction, method
        │        └──> TargetMeasurementService ──> actual (derived, never persisted)
        │
        └──< achievements ..................... (NEW, target nullable = qualitative)
                 └──< achievement_evidence .... (NEW, append-only)
```

### Collections

| Collection | Owner | Key fields |
| --- | --- | --- |
| `gps_target_metrics` *(extend)* | target | `baseline_period_type` (`financial_year`/`quarter`/`custom`), `baseline_period_ref`, `target_period_type`, `target_period_ref`, `direction` (`increase`/`decrease`/`maintain`), `calculation_method` (`period_total`/`closing_balance`/`headcount`/`ratio`/`manual`) |
| `metric_type_accounts` *(new)* | measure | `id`, `metric_type_id`, `account_type` (`domestic_revenue`/`export_revenue`/`expense`/`other`), `account_id` (nullable), `is_revenue`, `combine_mode` (`sum`/`avg`/`latest`), `created_at` |
| `achievements` *(new)* | company | `id`, `company_id`, `gps_target_id` (nullable), `category` (target categories), `kind` (`result`/`achievement`/`decision`), `title`, `description`, `achieved_on` (date), `baseline_value`, `target_value`, `actual_value`, `unit`, `direction`, `evidence_summary`, `recorded_by`, `recorded_at`, `verified_by`, `verified_at`, `verification_status` (`unverified`/`verified`/`rejected`), `created_at`, `updated_at` |
| `achievement_evidence` *(new)* | achievement | `id`, `achievement_id`, `source_type` (`metric_snapshot`/`financial_stat`/`note`/`url`/`file`), `label`, `reference`, `snapshot_json`, `created_by`, `created_at` |

### Lookup Collections

| Lookup | Values |
| --- | --- |
| `direction` | `increase`, `decrease`, `maintain` |
| `calculation_method` | `period_total`, `closing_balance`, `headcount`, `ratio`, `manual` |
| `achievement.kind` | `result`, `achievement`, `decision` |
| `verification_status` | `unverified`, `verified`, `rejected` |
| `evidence.source_type` | `metric_snapshot`, `financial_stat`, `note`, `url`, `file` |
| `account_type` *(reused)* | `domestic_revenue`, `export_revenue`, `expense`, `other` |

### Collection Links

| From | To | Cardinality | Rule |
| --- | --- | --- | --- |
| `metric_type_accounts.metric_type_id` | `metric_types.id` | N:1 | measure definition |
| `metric_type_accounts.account_type` / `account_id` | `company_accounts.account_type` / `id` | N:1 | actuals source |
| `achievements.gps_target_id` | `gps_targets.id` | N:1 **nullable** | qualitative achievements have no target |
| `achievements.company_id` | `companies.id` | N:1 | company isolation |
| `achievement_evidence.achievement_id` | `achievements.id` | N:1 | delete cascades |

### Invariants

* An achievement with `gps_target_id = NULL` is valid (businesses achieve valuable things they never planned).
* `achieved_on` is independent of `recorded_at`; corrections never mutate preserved evidence.
* Completing all tasks **must not** change a target's `status`, `completed_at`, or outcome progress.
* A measurable target's actual is **derived**, never stored as truth in `metric_records`.
* Revenue actuals come from `company_financial_yearly_stats`. Missing months ⇒ `completeness: incomplete`, **never** treated as 0.
* `achievement_evidence` is append-only; deleting an achievement cascades its evidence.
* Company isolation enforced on every read and write (`auth_require_company_access`).
* A target with a past due date is simply **overdue** until its outcome is established — it is not an achievement.

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
3. **Decisions are achievements of `kind = decision`** — dated entries with the chosen course and reason; follow-up work becomes tasks. No new entity.
4. **`achievement_evidence` is append-only** so the evidence used at review survives later financial corrections.
5. **Progress is split**: `manual_progress_percentage` stays manual-only and is no longer written by task recalc; task completion and outcome progress are distinct values.
6. **`GpsTargetTask::recalcTaskProgress` stops writing target status/progress** — it may aggregate for display but must not mutate the parent.
7. **Delete `MetricRecord.php` + `api-nodes/enhanced-metrics.php`** (dead, schema-incompatible) — do not extend or reconcile.
8. **Actuals live in a PHP service** (`TargetMeasurementService`) shared by the target popup and the Results workspace — one calculation, two consumers.
9. **Achievements are company-scoped and target-optional**, surfaced both company-wide (Results) and per target (popup).
10. **No new dependencies**; no redesign of locked tables, endpoints, or styles.

---

## Routes

```
company/:id/overview              (unchanged)
company/:id/swot-v2               (unchanged)
company/:id/gps-targets-v2        (extended — popup gains Actual + Achievements + measure binding)
company/:id/results               (NEW — Results & Achievements workspace)
admin/tools                       (unchanged)
admin/system-tools/data-migration (unchanged)
```

Navigation changes (`CompanyShell.tabBar`): rename **`GPS Targets` → `Targets`**, add **`Results`**. Keep `TabBarComponent` overflow behaviour intact.

---

## Phases

### Phase 1 — Measurement Foundation: schema, mapping, dead-code removal

Build the authoritative measure→account binding and prepare the database.

#### Tasks

- [ ] **1.1** Create `migrations/2026-09-15-results-achievements.sql` — additive, idempotent, guarded: creates `metric_type_accounts`, `achievements`, `achievement_evidence`; `ALTER TABLE gps_target_metrics` adds `baseline_period_type`, `baseline_period_ref`, `target_period_type`, `target_period_ref`, `direction`, `calculation_method`. Include rollback notes in a header comment.
- [ ] **1.2** Seed revenue bindings in the migration: `REVENUE_TOTAL` → `domestic_revenue` + `export_revenue` (`sum`), `REVENUE_EXPORT` → `export_revenue` (`sum`), `REVENUE_ANNUAL` → `domestic_revenue` + `export_revenue` (`sum`).
- [ ] **1.3** Add `models/MetricTypeAccount.php` — `WRITABLE`, `bind()`, `unbind()`, `listByType()`, `resolveAccounts(metric_type_id)`, `declare(strict_types=1)`, PDO injection.
- [ ] **1.4** Extend `GpsTargetMetric.php` `WRITABLE` with the new columns and validate enums consistently with `GpsTarget` normalisation.
- [ ] **1.5** Add endpoints `api-nodes/metric-type-accounts/{list,get,create,update,delete}.php` (System Administrator / migration-admin guarded, JSON, try-catch `400`).
- [ ] **1.6** Delete `models/MetricRecord.php` and `api-nodes/enhanced-metrics.php`; confirm no remaining references; note removal in `migrations/README.md` and session docs.
- [ ] **1.7** Update `migrations/README.md` with the new migration row and local pre-req command.

#### Exit Criteria

- [ ] Migration applies cleanly to local `incubator_os` and is idempotent on re-run
- [ ] `SHOW COLUMNS FROM gps_target_metrics` shows all six new columns
- [ ] `metric_type_accounts` contains the three revenue bindings; a resolve call for `REVENUE_TOTAL` returns `domestic_revenue` + `export_revenue`
- [ ] `MetricRecord` class + `enhanced-metrics.php` removed; no remaining references
- [ ] `php -l` clean on every new/changed PHP file
- [ ] `ng build` still passes (no frontend change required this phase)

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

Derive actuals from financial records through the measure→account binding.

#### Tasks

- [ ] **3.1** Create `services/TargetMeasurementService.php` — given a `gps_target` + its metric link + `metric_type_accounts` binding, resolve accounts and sum `company_financial_yearly_stats.m1…m12` for the **target period**; return `{ actual, baseline, target, unit, direction, completeness, missing_months }`.
- [ ] **3.2** Resolve `baseline` from `baseline_period_type` / `baseline_period_ref` (financial year / quarter / custom).
- [ ] **3.3** Compute outcome progress from direction: `increase` → `(actual − baseline) / (target − baseline)`; `decrease` → inverse; `maintain` → tolerance band.
- [ ] **3.4** Add endpoint `api-nodes/gps-targets/actual.php?gps_target_id=` returning the calculated `{ actual, baseline, target, unit, direction, completeness, missing_months, progress }`.
- [ ] **3.5** Extend `gps-target-metrics/{list,get}.php` responses with the computed actual (read-only; never persisted).
- [ ] **3.6** Enforce incomplete handling: if any month in the period is null, `completeness = incomplete` and the actual is labelled as such — never rendered as 0.

#### Exit Criteria

- [ ] For a revenue target on the local demo company, the computed actual equals the manual `CompanyFinancialYearlyStatsService.calculateQuarterlyTotals` figure for the same account(s) and financial year (cross-checked)
- [ ] Missing months are returned explicitly; `incomplete` is never presented as an achieved low/zero value
- [ ] A `decrease`-direction target (e.g. cost reduction) computes the correct progress
- [ ] No writes occur to `metric_records`
- [ ] `php -l` clean

---

### Phase 4 — Achievements & Evidence Backend

Make outcomes first-class, dated, attributable and verifiable.

#### Tasks

- [ ] **4.1** Add `models/Achievement.php` — `WRITABLE`, validate `kind` / `category` / `verification_status` / `direction` enums, allow null `gps_target_id`, keep `achieved_on` separate from `recorded_at`, manage `verified_by` / `verified_at` / `verification_status`.
- [ ] **4.2** Add `models/AchievementEvidence.php` — append-only `add()` / `listByAchievement()` / `delete()`; cascade on achievement delete.
- [ ] **4.3** Add endpoints `api-nodes/achievements/{list,get,create,update,delete,verify}.php` with company isolation; `verify` restricted to System Administrator / coach.
- [ ] **4.4** Add endpoints `api-nodes/achievement-evidence/{list,create,delete}.php`.
- [ ] **4.5** Support review snapshots: when `source_type='metric_snapshot'`, persist the computed `{ actual, baseline, target, unit, period }` JSON in `snapshot_json`.
- [ ] **4.6** Add company/target list endpoints `achievements/by-company.php?company_id=` and `achievements/by-target.php?gps_target_id=` (newest `achieved_on` first), including evidence counts.

#### Exit Criteria

- [ ] An achievement with `gps_target_id = NULL` is accepted and returned (qualitative path)
- [ ] `achieved_on` and `recorded_at` are stored and returned independently
- [ ] `verify` sets `verified_by` / `verified_at` / `verification_status`; a non-SA cannot verify
- [ ] Evidence rows are append-only; deleting an achievement removes its evidence
- [ ] Cross-company requests return `403`
- [ ] `php -l` clean

---

### Phase 5 — Results Workspace UI

A company-level view of what actually changed.

#### Tasks

- [ ] **5.1** Add route `company/:id/results` — lazy-loaded `ResultsPage` (standalone, OnPush, signals, `inject()`).
- [ ] **5.2** Render measurable achievements as **baseline → target → actual** with period, `completeness`, and evidence reference; render qualitative achievements as a dated outcome with supporting evidence.
- [ ] **5.3** Toolbar + filter panel (Kind / Category / Verification / Period), search, Table ⇄ Grouped toggle (group by category or verification) — reuse `.sw-*` and `app-icon`.
- [ ] **5.4** Create / Edit achievement popup (view ⇄ edit): title, description, `achieved_on`, optional target link, kind, category, direction/unit for measurable, evidence attach/list, `recorded_by`.
- [ ] **5.5** Verify / Reject action for SA with a verification badge (`unverified` / `verified` / `rejected`).
- [ ] **5.6** `CompanyShell` nav: rename `GPS Targets` → `Targets`, add `Results`; confirm tab overflow still works.
- [ ] **5.7** Extend `DashboardNormalizedCardsComponent` with an Achievements/Results card (non-destructive, same props/pattern).

#### Exit Criteria

- [ ] `company/:id/results` renders achievements exclusively from normalized endpoints
- [ ] Measurable achievements show baseline → target → actual; qualitative achievements render without a target
- [ ] A target with missing financial periods renders `incomplete`, not a false achievement
- [ ] Create → verify → delete round-trip succeeds
- [ ] `Results` tab present, `Targets` renamed, overflow intact, **0 console errors**
- [ ] Components are standalone/OnPush/signals with `@if`/`@for`; `ng build` passes

---

### Phase 6 — Target Popup Integration

Bring measurement and achievement into the existing target detail.

#### Tasks

- [ ] **6.1** Extend the `gps-targets-v2` popup view with an **Actual** section for `metric`-mode targets (derived actual, baseline → target, period, `completeness`).
- [ ] **6.2** Add an **Achievements** section in the popup — list + add, reusing Phase 4 endpoints.
- [ ] **6.3** Measure-binding UI in popup edit mode: select `metric_type` + baseline/target period + direction + calculation method (writes the extended `gps_target_metrics` fields and switches `progress_mode` to `metric`).
- [ ] **6.4** Display **Task progress** and **Outcome progress** as two clearly-labelled figures (never merged into one bar).
- [ ] **6.5** Replace the remaining `prompt()` task editing on both workspaces with the inline popup editor (carried debt from Sprint 006).

#### Exit Criteria

- [ ] Popup shows separate task % and outcome % for the same target
- [ ] A metric-mode target displays a derived actual + completeness
- [ ] Binding a measure creates/extends `gps_target_metrics` and sets `progress_mode='metric'`
- [ ] Achievements can be added and listed from the target popup
- [ ] No `prompt()` remains in `swot-hierarchy.page.ts` or `gps-hierarchy.page.ts`
- [ ] `ng build` passes; **0 console errors**

---

### Phase 7 — End-to-End Verification, Docs, Cleanup

Prove the vertical slice and hand over the pattern.

#### Tasks

- [ ] **7.1** Run the complete slice locally: revenue **finding (SWOT) → target → tasks → calculated actual → evidenced achievement**, plus one **qualitative** achievement with no target.
- [ ] **7.2** Playwright pass across `results` + `gps-targets-v2`; confirm **0 post-login console errors**.
- [ ] **7.3** Update `.ai/sessions/` (new session file) and this sprint's progress; update `migrations/README.md`.
- [ ] **7.4** Confirm the `MetricRecord.php` removal orphaned no endpoints; `php -l` sweep and `ng build`.
- [ ] **7.5** Document the reusable pattern (measure definition → account binding → period → calculation method → actual → achievement) for employment, profitability, funding and qualitative milestones.

#### Exit Criteria

- [ ] The full slice is demonstrated and screenshotted (measurable + qualitative)
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
Phase 3 ──> Actuals Calculation Service (revenue)
    │
    ▼
Phase 4 ──> Achievements & Evidence Backend
    │
    ▼
Phase 5 ──> Results Workspace UI
    │
    ▼
Phase 6 ──> Target Popup Integration
    │
    ▼
Phase 7 ──> End-to-End Verification, Docs, Cleanup
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
    ├── metric-type-accounts/{list,get,create,update,delete}.php   (NEW)
    ├── achievements/{list,get,create,update,delete,verify,by-company,by-target}.php (NEW)
    ├── achievement-evidence/{list,create,delete}.php              (NEW)
    ├── gps-targets/actual.php                                    (NEW)
    ├── gps-targets/{create,update,get}.php                       (extend responses)
    ├── gps-target-metrics/{list,get}.php                         (extend responses)
    ├── gps-target-tasks/{create,update,delete}.php               (recalc change)
    └── enhanced-metrics.php                                      (DELETE)

src/
├── app/
│   ├── app.routes.ts                               (add company/:id/results)
│   ├── components/company-shell/
│   │   └── company-shell.component.ts              (rename GPS Targets → Targets, add Results)
│   └── features/normalized/
│       ├── results/
│       │   └── results.page.ts                     (NEW)
│       ├── gps-hierarchy/gps-hierarchy.page.ts     (extend popup)
│       ├── dashboard-cards/dashboard-cards.component.ts (add Achievements card)
│       └── services/
│           ├── achievements.service.ts             (NEW)
│           └── gps.service.ts                      (extend: actual, achievements)
└── styles.scss                                     (extend .sw-* only if genuinely shared)
```

---

## Out of Scope

* Wiring actuals for measures **beyond revenue** (employment, profitability, funding) — the pattern is established, but only revenue is proven end-to-end in this sprint.
* Automatic import of achievements from financial data without human review.
* A file-storage/upload backend — `achievement_evidence.source_type='file'` references an external asset id or URL only.
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
* An approval workflow beyond `verify` / `reject`.
* Periodic automatic metric snapshots into `achievement_evidence` (`source_type='metric_snapshot'`) on a schedule.

---

## Definition of Done

The sprint is complete when:

- [ ] All 7 phases are complete and every phase exit criterion is satisfied
- [ ] A measurable target's actual is derived from `company_financial_yearly_stats` through `metric_type_accounts` — never re-entered into `metric_records`
- [ ] Incomplete financial periods are reported as `incomplete`, never as a false zero/achievement
- [ ] Task completion and outcome progress are independent; finishing all tasks never auto-completes a target
- [ ] Achievements are dated (`achieved_on`), attributable (`recorded_by`), verifiable (`verified_by`), and may exist without a target
- [ ] Evidence captured at review is preserved append-only and traceable after later financial corrections
- [ ] `company/:id/results` renders baseline → target → actual for measurable achievements and dated outcomes for qualitative ones
- [ ] The `Targets` popup shows separate task % and outcome %, a derived actual, and its achievements
- [ ] Dead code removed: `models/MetricRecord.php` and `api-nodes/enhanced-metrics.php`
- [ ] Locked foundation untouched: no changes to existing table shapes beyond the additive `gps_target_metrics` columns; no changes to the shared `.sw-*` design language
- [ ] All new Angular code is standalone, `OnPush`, signals/`computed()`/`inject()`, `@if`/`@for`; lazy-loaded
- [ ] Company isolation enforced on every new endpoint; SA-only actions (verify, measure binding) guarded
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

### Open questions for the reviewer

* Should a measurable achievement auto-snapshot the derived actual into `achievement_evidence` at verification time, or only on explicit action? (Spec: supported, explicit.)
* Should `direction='maintain'` use an absolute or percentage tolerance band?
* Do funders need achievement export in this sprint, or is that correctly deferred to Future Modules?
* Is `Targets` the final label, or does the existing meeting decision name it something else?
