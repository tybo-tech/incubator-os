# Sprint 009 — First-class company Sessions, integrated with the calendar

> **Program**: Incubator OS — Session workspace layer (Appointment → Session → Execution)
> **Status**: ✅ Delivered (session 028) — awaiting production deployment.
> **Baseline**: `6420d11` (Sprint 008 calendar complete: global + company calendar, PHP/MySQL persistence, tenant/company isolation, all-day + timed events, entity links, optimistic concurrency)
> **Duration**: Multi-phase.

## Delivery summary

| Area | Result |
| --- | --- |
| Migration | `2026-09-23-sessions.sql` (run order #21), 7 tables, idempotent |
| Backend | `capabilities/sessions/` + `api/sessions/` (6 queries, 11 commands) |
| Calendar integration | `sessionId` indicator, `409 SESSION_LINKED`, cancel cascade |
| Preparation brief | Server read model over existing domains (no copies) |
| Angular | Sessions tab, company page, 4-phase workspace, deep link |
| Backend tests | **105/105** (`tests/Sessions.ps1`); calendar regression **65/65** |
| Frontend tests | Session service 9/9; calendar 11/11 (9 unrelated baseline failures untouched) |
| Browser E2E | All flows verified, **zero console errors** |
| Production build | Clean, no budget warnings |
| Docs | `docs/session-api.md`, `.ai/sessions/028-2026-09-23.md` |
| Deployment package | `docs/sprint-007-009-production-deployment.md` + `docs/deployment/` (preflight, integrity, manifests, smoke tests, rollback) — prepared; **preflight accepted 2026-09-23** (007 PRESENT/skip, 008+009 MISSING/apply, no blocker); production execution pending operator |

Deferred (unchanged from plan): Google/Outlook OAuth, external sync, webhooks,
recurrence, reminders, transcription, AI summaries, email notifications,
completed-Session reopening.


## Product framing

A calendar event answers **“When is something happening?”** A **Session** answers
why the meeting exists, what should be reviewed, what was discussed and decided,
which business records were involved, and what execution work came out of it.

Incubator OS remains the operational source of truth; the calendar remains the
scheduling layer. Sessions **reference** existing domains — they never copy them.

## Inspected baseline (Phase 1)

| Area | Finding | Consequence |
| --- | --- | --- |
| Backend generations | `capabilities/` + `api/` (DDD, camelCase DTOs, `CommandResult`) is the newer convention used by Company / FinancialIndicators / Calendar; `api-nodes/` is the older model+endpoint layer | Sessions use the **capability** layer, like Calendar |
| Auth | `capabilities/` endpoints had **no auth** until Sprint 008 bridged `helpers/AuthGuard.php` | Sessions reuse the **same bridge**; no auth-infra rewrite |
| Calendar | `calendar_events` (company or system-wide) + `calendar_event_links` | Sessions link to **one company meeting event**; the calendar gets `sessionId` + `SESSION_LINKED` + cancel cascade |
| Roles | `users.role` ∈ **Director / System Administrator / Coordinator / Judge** — **no Coach** | “Authorized coach” maps to admin (SA/Coordinator); no Coach invented |
| Company access | `auth_is_admin()` tenant-wide; everyone else limited to own `users.company_id` | Same policy, extracted into `SessionAccessPolicy` |
| Targets/Tasks | `gps_targets` + `gps_target_tasks` (tasks are the execution layer, `gps_target_id` FK) | Sessions **link** to them; never create a competing action system |
| SWOT | `swot_analyses` → `swot_items` | Link only |
| Financial | financial indicators in `nodes` (`type='financial_indicators'`); measurement in `gps_target_metrics` | Link only; values stay in the measurement domain |
| Achievements | `achievements` (`kind=result\|achievement\|decision`) + `achievement_evidence`; verified = immutable; `decision` is an event, not verifiable | Sessions **cannot** create/verify achievements; a Session decision is a separate `session_decisions` row |
| Activity | `recent_activities` (tenant/company/user/module/action/reference_id/description) — **no index, no structured payload, mutable** | Reused for the central dashboard feed; a dedicated **append-only** `session_activities` carries the structured per-session timeline (see rationale below) |
| Legacy session-ish tables | `form_sessions` = form submissions; `mentorship_session` / `session_feedback` = `nodes` JSON rows | **Not** reused as the Session model; no node/meta storage |

## Locked domain rules

1. A Session belongs to **exactly one company** (`company_id NOT NULL`). No system-wide Sessions.
2. A Session links to **at most one** company-scoped calendar event (`calendar_event_id NULL UNIQUE`).
3. Only a **company** event in the **`meeting`** category may become a Session. System-wide, non-meeting, deleted, inaccessible or already-linked events are rejected.
4. One calendar event has **at most one** Session (UNIQUE + app check).
5. Session company and calendar-event company must **match**.
6. **Rescheduling happens through the calendar event.** Sessions store **no** schedule columns; every Session view reads the linked event’s schedule.
7. Deleting a calendar event linked to a Session returns **`409 SESSION_LINKED`** (cancel the Session instead).
8. Cancelling a Session **cancels its linked calendar event**.
9. Completing a meeting task **does not** complete a Target.
10. A **decision** is not an Achievement (`session_decisions` is its own table).
11. Financial values remain in the measurement domain (link-only).
12. Achievement verification continues through the existing workflow; verified records/evidence stay immutable.
13. Tasks remain the execution layer beneath Targets — **no** session-action system.

## Lifecycle

`PREPARING` → `IN_PROGRESS` → `COMPLETED`, and `CANCELLED` from either of the first two.

| From | To | Guard |
| --- | --- | --- |
| preparing | in_progress | — |
| preparing | cancelled | reason required |
| in_progress | completed | closing summary optional |
| in_progress | cancelled | **reason required** |
| completed | * | **frozen** |
| cancelled | * | **frozen** |

- Every other transition → `409` (`SESSION_INVALID_TRANSITION`).
- **Completed Sessions are frozen**: agenda, notes, decisions, links, participants,
  attendance, preparation fields and closing summary are all read-only afterward.
- **Reopening is deferred.** The repository’s audit mechanism cannot support a
  controlled, auditable reopen today; inventing one is out of scope. The
  append-only `session_activities` table is the hook a future reopen would log to.

## Storage contract (Phase 2)

Ordered after `2026-09-19-calendar-events.sql` → **run order #21**.

| # | Table | Purpose |
| --- | --- | --- |
| 1 | `sessions` | the workspace; nullable UNIQUE `calendar_event_id`; lifecycle + summaries + facilitator + `version` |
| 2 | `session_participants` | internal user **or** external attendee snapshot; role + attendance |
| 3 | `session_agenda_items` | ordered topics, status, presenter |
| 4 | `session_notes` | structured notes, `visibility = shared \| incubator`, `version` |
| 5 | `session_decisions` | decision text, date, rationale, recorder, `version` |
| 6 | `session_entity_links` | canonical entity types + relationship; UNIQUE prevents identical duplicates |
| 7 | `session_activities` | **append-only** structured timeline |

**Why a dedicated activity table.** `recent_activities` is a flat dashboard feed:
no index, no structured payload, no immutability, and `reference_id` is `INT`
(Session ids are `BIGINT`). It cannot accurately represent a Session timeline, so
per the brief’s carve-out a dedicated append-only table is used. `recent_activities`
is still written for the existing dashboard feed (`module='sessions'`).

Indexes cover company timelines, status, facilitator, calendar-event lookup,
session ordering, agenda ordering, and linked-entity/backlink lookup.

## API contract (Phase 3)

Base `{ApiBase}api/sessions`.

### Queries
| Endpoint | Returns |
| --- | --- |
| `queries/list.php` (`company_id` required) | `SessionSummary[]` (status/type/facilitator/date filters) |
| `queries/upcoming.php` | `SessionSummary[]` — upcoming, actor-scoped, bounded horizon |
| `queries/get.php?id=` | `SessionResponse` (visibility-filtered notes, agenda, participants, decisions, links, timeline) |
| `queries/brief.php?id=` | `PreparationBrief` — server-built, read-only |
| `queries/backlinks.php?entity_type=&entity_id=` | sessions linking that record (authz-filtered) |
| `queries/eligible-events.php?company_id=` | company `meeting` events convertible to a Session |

### Commands
| Endpoint | Purpose |
| --- | --- |
| `commands/create.php` | Session **+ its calendar event in one transaction** (rollback both on failure) |
| `commands/convert.php` | attach an eligible existing `meeting` event; idempotent on retry |
| `commands/update.php` | preparation fields (subject/purpose/type/facilitator/summary) |
| `commands/agenda.php` | `action = add \| update \| reorder \| delete` |
| `commands/notes.php` | `action = add \| update \| delete` (visibility-gated) |
| `commands/decisions.php` | `action = record \| update \| delete` |
| `commands/links.php` | `action = add \| remove` |
| `commands/participants.php` | `action = add \| update \| remove \| attendance` |
| `commands/start.php` | `PREPARING → IN_PROGRESS` |
| `commands/complete.php` | `IN_PROGRESS → COMPLETED` (closing summary) |
| `commands/cancel.php` | `→ CANCELLED` (reason) + cancels the linked calendar event |

Server-derived, never accepted from the browser: actor, tenant, creator,
timestamps, and the accessible-company scope. `company_id` is a target scope only.

### Linked entities
Every linked record must **exist**, belong to the Session company, belong to the
tenant, and be reachable by the actor — resolved through the canonical current
table (reusing Sprint 008’s `CalendarLinkResolver`).

## Preparation brief (Phase 4)

Server-built, read-only, reusing existing read models — **nothing copied into
Session tables**:
previous completed Session summary · previous decisions · open and overdue tasks ·
active/overdue Targets · current SWOT items · financial measurement coverage ·
achievements awaiting review · recently verified achievements · records linked to
this Session’s agenda.

## Permissions (Phase 6)

| Action | SA / Coordinator | Director / Judge |
| --- | --- | --- |
| Manage Sessions (tenant-wide) | ✅ | ❌ |
| Manage Sessions in own company | ✅ | ✅ |
| View shared Session content | ✅ | ✅ (own company) |
| View `incubator` notes | ✅ | ❌ **never** |
| Create/verify Targets, tasks, financials, achievements | via existing domain permissions | via existing domain permissions |
| Link an entity | only if already authorized for that entity | same |

Session access never grants access to a linked entity; backlinks respect the
viewer’s authorization.

## Verification (Phase 7)

Backend (`api-incubator-os/tests/Sessions.ps1`) and browser E2E per the sprint
brief’s checklist. The nine unrelated baseline Angular failures stay documented
and are not repaired.

## Explicitly deferred (out of scope)

Google Calendar OAuth · Microsoft Outlook OAuth · external calendar
synchronisation · webhooks · recurrence · automated reminders · transcription ·
AI summaries · email notifications · **completed-Session reopening**.

---

## Definition of Done

* [x] Idempotent migration (#21) applies twice safely.
* [x] Session + calendar-event creation is atomic (rollback proves it).
* [x] Convert eligible meeting event; duplicate/non-meeting/system-wide rejected.
* [x] Company/calendar mismatch rejected.
* [x] Lifecycle transition matrix enforced; invalid transitions `409`.
* [x] Completion freezes operational content.
* [x] Cancellation updates the linked calendar event.
* [x] Deleting a linked calendar event returns `409 SESSION_LINKED`.
* [x] Participant + attendance lifecycle.
* [x] Agenda ordering.
* [x] Shared vs incubator-only note isolation.
* [x] Decision lifecycle.
* [x] Every supported entity link; cross-company + cross-tenant rejected.
* [x] Preparation brief respects company and role scope.
* [x] Unauthorized list/detail/mutation rejected; optimistic concurrency `409`.
* [x] Tenant isolation.
* [x] Angular: Sessions tab, company page, workspace (Prepare/Run/Close/History), calendar Session indicator + “Open session workspace”.
* [x] Shared content visible to the right company user; internal note hidden.
* [x] Cancel Session reflected in the calendar; reload persistence; zero console errors.
* [x] Production build clean.
* [x] Docs: sprint, session log, `docs/session-api.md`, migration README row, deployment + rollback manifest.
* [ ] Production deployment (next session).
