# Sprint 008 — Calendar & Appointments

> **Program**: Incubator OS — Scheduling layer (Appointment → Reminder → Follow-up)
> **Status**: 🚧 In progress — Phase 1 (mock-data visual calendar) delivered (session 026).
> **Duration**: Multi-phase.
> **Previous work**: Sprint 002–007 — normalized SWOT/GPS hierarchy, financial indicators, Results & Achievements (`achievements`, `achievement_evidence`, `metric_type_accounts`, target measurement).

---

## Objective

Give the platform a **first-class scheduling surface**. Today the system tracks what companies intend (targets), what they do (tasks), what changed (results/achievements) and what they spend (financials) — but has nowhere to record **when things are planned to happen**. Appointments, deadlines, reviews and follow-ups currently live outside the system (email, WhatsApp, personal calendars).

The sprint delivers:

1. A **visual month calendar** rendered per company, and a **global calendar** across every company.
2. An **agenda view** of upcoming appointments with search, category filters and scope filters.
3. **Appointment CRUD** — create, edit, delete, complete/cancel — with category colours, all-day and timed events, location and assignee.
4. **Lightweight links** from an appointment to an existing record (target, SWOT, task, financial, result, evidence) without coupling to those domains.
5. **Company vs system-wide scope** — an appointment can belong to one company or be visible in every company calendar.

**This phase is mock-data only.** There is no `calendar` backend table yet; events are generated locally and persisted to `localStorage`. The service contract mirrors the REST services so real endpoints can replace it without component changes.

---

## Existing Foundation (Locked)

Must **NOT** be redesigned. Reuse as-is.

* **Global `.sw-*` stylesheet** in `src/styles.scss` (`@layer components`), including the popup contract: `.sw-modal-card` flex column `overflow:hidden`; head/foot `flex:0 0 auto`; `.sw-modal-body` `flex:1; min-height:0; overflow-y:auto`.
* **Shared `app-icon`** (`src/app/shared/components/app-icon/app-icon.ts`) — single `ICON_PATHS` map, `1em` sizing, `currentColor`. No icon fonts.
* **`ViewStateService`** (`src/services/view-state.service.ts`) — `load(key, defaults)` / `save(key, state)`.
* **`CompanyShell` tab bar** (`app-tab-bar`, `TabItem`) and the global sidebar (`NavComponent`).
* **Lazy-loaded routes** under `AppShellComponent`; company routes are children of `CompanyShellComponent` at `company/:id`.

---

## Business Capabilities

| Capability | Introduces / Extends |
| --- | --- |
| Visual month calendar | **New** — company-scoped and global |
| Agenda view | **New** — upcoming, grouped by day |
| Appointment CRUD | **New** — mock, localStorage-backed |
| Appointment categories | **New** — meeting, deadline, review, check-in, reminder, milestone, other |
| Company vs system-wide scope | **New** — `company_id = null` means system-wide |
| Lightweight record links | **New** — `link_type` + `link_label` (no FK yet) |
| View persistence | **Extends** — `calendar-view:{companyId}` / `calendar-view:global` |

---

## Domain Model

### CalendarEvent (mock, front-end only)

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | `cal_<time>_<rand>` |
| `company_id` | number \| null | `null` = system-wide |
| `company_name` | string \| null | denormalised for display |
| `title` | string | required |
| `description` | string \| null | |
| `category` | enum | `meeting`, `deadline`, `review`, `check_in`, `reminder`, `milestone`, `other` |
| `date` | `YYYY-MM-DD` | local date, never UTC-shifted |
| `all_day` | boolean | |
| `start_time` / `end_time` | `HH:mm` \| null | ignored when `all_day` |
| `location` / `assignee` | string \| null | |
| `link_type` | enum \| null | `target`, `swot`, `task`, `financial`, `result`, `evidence` |
| `link_id` | number \| null | reserved for real FK |
| `link_label` | string \| null | human label for the linked record |
| `status` | enum | `scheduled`, `completed`, `cancelled` |
| `created_by` / `created_at` | string | |

### Invariants

* `title` and `date` are required.
* When `all_day` is true, `start_time`/`end_time` are ignored.
* An end time before the start time is rejected.
* A company calendar shows its own events **plus** system-wide (`company_id = null`) events.
* A global calendar shows all events; the scope filter narrows to system-wide or company-specific.

---

## Routes

| Route | Component | Scope |
| --- | --- | --- |
| `/calendar` | `CalendarPageComponent` | Global — all companies |
| `/company/:id/calendar` | `CalendarPageComponent` | Company — own + system-wide |

---

## Phases

### Phase 1 — Mock-data visual calendar ✅ (session 026)

* Models, utils, `CalendarService` (localStorage CRUD + deterministic seeding).
* `CalendarMonthComponent` (6-week Monday-first grid, category-coloured chips, overflow "+N more").
* `CalendarAgendaComponent` (upcoming, grouped by day).
* `CalendarDayModalComponent` (day drill-down) and `CalendarEventModalComponent` (full CRUD form).
* `CalendarPageComponent` (summary tiles, month/agenda toggle, search, filters, view persistence, CRUD orchestration).
* New icons: `calendar`, `calendar-days`, `clock`, `flag`, `bell`, `users`, `check-circle`, `map-pin`, `chevron-left`, `list-bullet`, `globe-alt`, `building-office`.
* Routes, global sidebar item, company shell tab.
* Verified: dev + production build clean, unit tests green, browser E2E CRUD confirmed.

### Phase 2 — Backend persistence (planned)

* Migration: `calendar_events` table (same shape as the mock, `company_id` nullable FK).
* Models + endpoints under `api-nodes/calendar-events/` (list, list-all, get, create, update, delete).
* `CalendarService` swaps localStorage for HTTP; component contract unchanged.
* Company isolation via `auth_require_company_access`; system-wide events SA-authored.

### Phase 3 — Notifications & integration (planned)

* Reminder outbox → email/notification job (see `email-job-builder` skill).
* Convert a check-in into a completed appointment; link to Mentorship Log Book.
* Auto-suggested appointments from target periods.

---

## Out of Scope (this phase)

* Real backend persistence (Phase 2).
* Recurring events.
* Week/day grid views (month + agenda only).
* Drag-and-drop rescheduling.
* External calendar sync (Google/Outlook).
* Attendance/RSVP.

---

## Definition of Done (Phase 1)

* [x] Month calendar renders 42 cells, Monday-first, stable height.
* [x] Global (`/calendar`) and company (`/company/:id/calendar`) scopes.
* [x] Agenda view groups upcoming events by day.
* [x] Create / edit / delete / complete / cancel via the popup contract.
* [x] Category colours, all-day + timed events, location, assignee.
* [x] Lightweight record linking.
* [x] View persistence via `ViewStateService`.
* [x] Popups never close on outside click; header/footer fixed, body scrolls.
* [x] Icons via shared `app-icon` only.
* [x] `ng build` (dev + production) clean; unit tests green; browser CRUD verified.
