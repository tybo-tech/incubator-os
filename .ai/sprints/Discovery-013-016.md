# Discovery 013–016 — The Company Profile, Entrepreneur Loop, Coach Workspace and Reports

> **Program**: Incubator OS — ESD / B-BBEE beneficiary support
> **Status**: Draft — decisions D1–D6 need sign-off before Sprint 013 starts
> **Baseline**: `main` @ `4163b03` (directors, derived ownership, profile UI, production deploy)
> **Inputs**: product conversation of 2026-10-20 — "proper company profile fields", "links for
> entrepreneurs to fill in information", "reports we send out", "reports for coaches", "dashboard
> which is important for the coaches"
> **Sprints**: `Sprint-013.md` → `Sprint-014.md` → `Sprint-015.md` → `Sprint-016.md`

---

## 1. Why this arc

The application already captures a lot, but it captures it in **different places with different
owners**, and it does not yet answer the first question a coach or a funder asks:

> *Who is this business, what does it sell, to whom, at what price — and is it getting better?*

Today:

- The company record holds identity, contact, compliance and a 255-character `description`
  (`companies` in `api-incubator-os/db.sql:311-348`). **Sector** (`industry_id`) exists but the
  profile editor never shows it. **Buyer type**, **target market**, **products** and **pricing** do
  not exist as persisted company facts at all.
- Products, pricing and target customers are asked in the built-in form template
  (`src/app/admin/form-templates/built-in-templates.ts:101`, `:588`) and in the coaching guide
  (`src/app/components/coaching-guide/products-services.component.ts`), but those answers live in
  `nodes` / component memory and never become profile facts.
- The entrepreneur self-service pattern already exists — but only for financial indicators
  (`/financial/:token`, `capabilities/financial-indicators/Repository/FinancialIndicatorLinkRepository.php`).
  There is no way to ask an entrepreneur to complete or refresh their profile.
- Reporting is per-company and client-side (`src/services/pdf/*` posts HTML to `docs.tybo.co.za/pdf.php`).
  There is no report catalogue, no delivery log, and no scheduled distribution.
- The home screen is an aggregate reports page (`ReportsOverviewComponent`) built on the legacy
  `CohortReports` model (`api-incubator-os/api-nodes/reports/dashboard.php`). It shows programme
  totals, not **whose companies need attention this week**.
- There is **no Coach role** in the system and no coach-to-company assignment. The codebase says so
  explicitly (`api-incubator-os/helpers/AuthGuard.php:67`). Any "coach dashboard" that ignores this
  will either invent a role or show every company to everyone.

This arc fixes the foundation (profile), then closes the loop with the entrepreneur, then gives the
coach a workspace, then turns the data into reports.

---

## 2. The four sprints

| Sprint | Name | Question it answers | Primary output |
| --- | --- | --- | --- |
| **013** | Company Profile 360 | *Who is this business and what does it sell?* | Complete, structured, scored company profile |
| **014** | Entrepreneur Self-Service | *How does the entrepreneur keep it current without a coach retyping it?* | Secure, resumable submission links + review/apply |
| **015** | Coach Workspace | *Which companies need me this week, and why?* | Portfolio dashboard + explainable company health |
| **016** | Reports & Distribution | *What do we send to entrepreneurs, coaches and funders?* | Report catalogue, generation, delivery log, schedules |

Sequential, but not rigidly blocked:

```
Sprint 013 ──> Sprint 014 ──> Sprint 015 ──> Sprint 016
   profile        submissions      dashboard       reports
      │                │               │              │
      └── completeness ┴── change sets ┴── health ────┘
```

Sprint 015 consumes 013's `ProfileCompleteness` and 014's request statuses. Sprint 016 consumes
everything. Do not start 015's health scoring before 013's completeness projection exists.

---

## 3. Product principles

1. **The company profile owns current business facts.** Assessments, forms, coaching notes and
   submissions *observe* or *propose*; they never silently overwrite the profile. (Already the
   decision in `Discovery-011-012.md:117-131`.)
2. **Derived, never typed.** Ownership is derived from directors; profile completeness and company
   health must be derived from stored facts with a visible reason for every component. No one types
   a "health score".
3. **Every flag explains itself.** The ownership work established the pattern: a boolean plus a
   human-readable reason plus the contributing record IDs. Health, completeness and risk use the
   same shape.
4. **One truth per fact.** Sector is the existing `industries` taxonomy — not a new sector list.
   Buyer type is one enum. Products live in one table.
5. **Reuse the proven patterns.** Capability folders + thin endpoints, `TransactionManager`,
   `AuthGuard`, `.sw-*` popup contract, `app-icon`, `ViewStateService`, session auth.
6. **Small, resumable asks.** An entrepreneur should never face a 40-field form in one sitting.

---

## 4. Decisions to sign off

| # | Decision | Recommendation | Why |
| --- | --- | --- | --- |
| **D1** | "Coach" identity | **Do not add a Coach role.** Keep `Advisor`/`Staff`/`Coordinator`/`System Administrator` and introduce `company_assignments` (user ↔ company, role `lead`/`support`/`reviewer`). "Coach" is a display label on the assignment. | The system deliberately has no Coach role (`AuthGuard.php:67`). Adding one duplicates Advisor and breaks every existing guard. Assignments are needed regardless of the label. |
| **D2** | Where the profile lives | **Own tab** `/company/:id/profile` (position 2, after Overview), with a compact summary + completeness card on Overview. | The Overview is already dense. Directors got their own tab for the same reason. |
| **D3** | What a submission does | **Never auto-applies.** A submission creates a `submission_change` with a field-level diff; an authorised user reviews and applies. Applying writes a profile revision. | Prevents an entrepreneur (or a stale link) from overwriting verified facts. Matches principle 1. |
| **D4** | Health score | **Derived and explainable**, 0–100, five weighted components, each returning a reason + evidence. | A number without reasons is not actionable and cannot be defended to a funder. |
| **D5** | Server-side reports | Reuse the existing HTML→PDF service (`docs.tybo.co.za/pdf.php`) from the **backend**, store generated files outside the web root, serve via an authenticated/signed download. Fall back to a secure HTML report link. | No composer dependencies in `api-incubator-os/`; the client already depends on this service. |
| **D6** | Sector taxonomy | Reuse `industries` (`parent_id` hierarchy). Store the most specific active industry in `companies.industry_id`; display the full path. | The taxonomy already exists, is maintained in Admin → Industries, and is used for reporting. |

If D1 is rejected and a real `Coach` role is added, Sprint 015 Phase 1 changes: the role replaces
`assignment_role` for scoping, but `company_assignments` still carries the portfolio. Do not add a
role *and* leave access unscoped.

---

## 5. Current-state audit (what exists, what is missing)

| Area | Exists today | Gap this arc closes |
| --- | --- | --- |
| Company identity | `companies.name`, `trading_name`, `registration_no`, contact block, address, `industry_id` | Sector not surfaced; description 255 chars and not writable; no website/founded year |
| Positioning | `service_offering` (one line) | No long description, buyer type or target market |
| Offerings | Coaching-guide demo (in memory); form-template questions; `service_offering` text | No persisted products/services, no price, no active/inactive state |
| Profile quality | Financial summary has `capturedMonths`/`activeMonths` | No profile completeness, no gap list |
| Entrepreneur input | Financial indicator request link (`nodes` type `financial_indicator_request`, 7-day, single-use), `/financial/:token`, email dialog | Not generic; no profile scope; no drafts; no review/apply; no request inbox |
| Coach view | Aggregate `ReportsOverview` + `CohortReports` (programme/cohort totals) | No per-coach portfolio, no assignment, no attention queue, no explainable health |
| Company 360 | Overview + Directors + Assessment + SWOT/GPS/Results + Sessions + Compliance + Financial Indicators | No "at a glance" strip; health not summarised |
| Reporting | Client-side PDF exports (assessment, financial, SWOT, action plan, GPS), executive report, grant reports | No catalogue, no server generation, no delivery log, no schedules, no entrepreneur-facing report |
| Auth scoping | `auth_require_company_access` (admins all, others own company) | No staff-to-company assignment; Advisor is treated as a regular user and cannot access client companies |

### Two facts that shape the health model

- **Financial completeness cannot be inferred from zero-filled months.** `m1…m12` default to `0.00`
  and `total_amount` is a generated `COALESCE`, so an all-zero row looks identical to a real zero
  (`api-incubator-os/migrations/README.md:98-113`). Use **row presence + explicit captured months**
  (`FinancialSummary.activeMonths` / `capturedMonths`), never `total_amount`.
- **Sessions store no schedule.** Upcoming sessions resolve through
  `sessions.calendar_event_id → calendar_events` (`migrations/2026-09-23-sessions.sql:87-125`).
  A dashboard must not read a `sessions.start_at` that does not exist.

---

## 6. Data ownership after this arc

| Fact | Owner | Written by | Read by |
| --- | --- | --- | --- |
| Identity, sector, positioning, market | `companies` (Sprint 013) | `UpdateProfile` + apply-submission | Profile, Overview, reports, dashboard |
| Products, services, prices | `company_products_services` (013) | product commands + apply-submission | Profile, coaching guide, reports, dashboard |
| Profile completeness | derived (013) | — | Profile, Overview, dashboard |
| Entrepreneur submissions | `submission_links` / `submission_drafts` / `submission_changes` (014) | public endpoints + review commands | Profile request panel, dashboard |
| Coach assignment | `company_assignments` (015) | admin assignment screen | portfolio scope, nav, reports |
| Company health | derived (015), snapshots nightly | — | dashboard, reports |
| Report artefacts | `report_runs` / `report_deliveries` (016) | report commands + cron | reports UI, email |

**Never duplicated:** director ownership (already derived), compliance score, financial indicators,
GPS/Results. Reports and dashboards *read* these; they do not re-store them.

---

## 7. Locked architecture (do not redesign)

- `capabilities/{feature}/` + thin `api/{feature}/queries|commands/*.php`. **No new `api-nodes/`
  business logic.**
- `helpers/AuthGuard.php` + `helpers/Session.php`; tenant is server-derived (`1`).
- `core/Infrastructure/TransactionManager.php`; one transaction per command.
- `database` access via repository classes; no SQL in controllers.
- Angular standalone components, lazy routes under `CompanyShellComponent`, signals, `ViewStateService`.
- `.sw-modal` contract: fixed header/footer, scrollable body, **never close on backdrop click**.
- `app-icon` semantic names only (Font Awesome is forbidden in new work).
- Migrations: new dated, idempotent SQL files; never edit an applied migration; add rollback notes.
- `config/Database.php` and `mail/` credentials are production-specific and are **never uploaded**.
  New config must follow the same never-upload discipline.

---

## 8. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Profile becomes a second source of truth beside form answers | One-way flow: profile owns; forms/submissions propose. Reports read the profile. |
| Coach dashboard shows everything to everyone | Explicit scope resolver + assignment table + tests for Advisor/Staff/Director/Admin |
| Health score becomes a vanity metric | Reasons + evidence on every component; thresholds configurable in one class |
| Public submission links leak company data | 256-bit tokens stored hashed, scope-bound, expiring, revocable, rate-limited, audit-logged |
| Report generation blocks shared hosting | Queue/CLI worker, bounded batch size, timeout, retry, failure surfaced in the UI |
| A stale link overwrites coach-verified facts | Review/apply with diff + conflict detection; never auto-apply |
| Scope creep into "AI enrichment" or document vaults | Explicit Out of Scope in every sprint |

---

## 9. What "good" looks like at the end

- A coach opens `/portfolio` and sees their assigned companies ranked by need, each with the reason
  ("no financials captured for 2 months", "B-BBEE expired 12 days ago", "profile 45% complete").
- A coach opens a company and understands the business in one screen: sector, what it does, who it
  sells to, what it sells, prices, ownership, compliance, financial trend, next session.
- A coach sends one link; the entrepreneur completes or refreshes their profile on a phone, saves
  progress, and submits. The coach reviews a diff and applies it.
- A funder receives a programme report with the same numbers the coach sees — because both read the
  same derived projections.
- Nothing is retyped twice, and no number is stored twice.
