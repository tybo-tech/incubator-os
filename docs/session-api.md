# Session API — Sprint 009

A **calendar event** answers “When is something happening?”. A **Session** answers
why the meeting exists, what should be reviewed, what was discussed and decided,
which business records were involved, and what execution work came out of it.

Incubator OS remains the operational source of truth; the calendar remains the
scheduling layer. A Session **references** existing domains — it never copies them.

**Architecture:** capability layer (`api-incubator-os/capabilities/sessions/`)
exposed by thin endpoints (`api-incubator-os/api/sessions/`), following the same
convention as Company / FinancialIndicators / Calendar. Authentication reuses the
Sprint 008 bridge to the repository's real session guard (`helpers/AuthGuard.php`).

> Sessions **do not** use `api-nodes/`, legacy node/meta-value storage, or the
> legacy `mentorship_session` / `session_feedback` node types. `form_sessions`
> belongs to the form-building feature and is unrelated.

---

## Domain rules

1. A Session belongs to **exactly one company** (`company_id NOT NULL`); there is no system-wide Session.
2. A Session links to **at most one** company calendar event (`calendar_event_id NULL UNIQUE`).
3. Only a **company** event in the **`meeting`** category may become a Session.
4. One calendar event has **at most one** Session.
5. Session company and calendar-event company must **match**.
6. **Rescheduling happens through the calendar event.** Sessions store no schedule columns; every Session read joins the event.
7. Deleting a calendar event linked to a Session returns **`409 SESSION_LINKED`**.
8. Cancelling a Session **cancels its linked calendar event**.
9. Completing a meeting task does **not** complete a Target.
10. A **decision** is not an Achievement.
11. Financial values remain in the measurement domain (link-only).
12. Achievement verification continues through the existing workflow; verified records/evidence stay immutable.
13. Tasks remain the execution layer beneath Targets — there is no session-action system.

---

## Lifecycle

| From | To | Guard |
| --- | --- | --- |
| PREPARING | IN_PROGRESS | — |
| PREPARING | CANCELLED | **reason required** |
| IN_PROGRESS | COMPLETED | closing summary optional |
| IN_PROGRESS | CANCELLED | **reason required** |
| COMPLETED | — | terminal, **frozen** |
| CANCELLED | — | terminal, **frozen** |

- Every other transition → `409` with `code = SESSION_INVALID_TRANSITION`.
- **Completed and cancelled Sessions are frozen**: agenda, notes, decisions,
  links, participants, attendance, preparation fields and closing summary are
  read-only → `409 SESSION_FROZEN`.
- **Reopening is deliberately not implemented.** The repository has no auditable
  reopen mechanism, so inventing one was out of scope. The append-only
  `session_activities` table is the hook a future reopen would log to.

---

## Endpoint inventory

Base: `{ApiBase}api/sessions` (local `http://localhost:8080/`, prod `https://app.rbttacesd.co.za/api/`).

### Queries

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/queries/list.php?company_id=` | Company timeline. Optional `status`, `session_type`, `facilitator_user_id`, `search`. `company_id` **required**. |
| GET | `/queries/upcoming.php?start=&end=` | Upcoming Sessions the actor can access. Optional `company_id`. Bounded range required. |
| GET | `/queries/get.php?id=` | Full detail (visibility-filtered notes). |
| GET | `/queries/brief.php?id=` | Server-built, read-only preparation brief. |
| GET | `/queries/backlinks.php?entity_type=&entity_id=` | Sessions linking a business record (authz-filtered to the viewer). |
| GET | `/queries/eligible-events.php?company_id=&start=&end=` | Company `meeting` events convertible to a Session. |

### Commands

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/commands/create.php` | Session **+ its calendar event in one transaction**. |
| POST | `/commands/convert.php` | Attach an eligible existing meeting event; **idempotent**. |
| POST | `/commands/update.php?id=` | Preparation fields (optimistic concurrency). |
| POST | `/commands/agenda.php?id=&action=add\|update\|reorder\|delete` | Agenda items. |
| POST | `/commands/notes.php?id=&action=add\|update\|delete` | Notes (visibility-gated). |
| POST | `/commands/decisions.php?id=&action=record\|update\|delete` | Decisions. |
| POST | `/commands/links.php?id=&action=add\|remove` | Business-entity links. |
| POST | `/commands/participants.php?id=&action=add\|update\|remove\|attendance` | Participants + attendance. |
| POST | `/commands/start.php?id=` | PREPARING → IN_PROGRESS. |
| POST | `/commands/complete.php?id=` | IN_PROGRESS → COMPLETED (`closingSummary`). |
| POST | `/commands/cancel.php?id=` | → CANCELLED (`cancellationReason`) + cancels the linked event. |

Commands return the capability `CommandResult` envelope
(`{success, message, data, auditId, warnings}`); queries return DTO arrays or the
brief object.

All requests are sent with `withCredentials` so the PHP session cookie travels.
Server-derived and never accepted from the browser: **actor, tenant, creator,
timestamps, accessible-company scope**. `companyId` is a target scope only.

---

## Atomicity

`create` writes the Session and its company calendar event inside **one**
transaction (`TransactionManager`). A failure on either side rolls back both, so a
Session never exists without its event and an event created for a Session is never
orphaned. `convert` runs in one transaction as well.

---

## Date/time

Sessions carry **no** schedule columns. The linked event follows the Sprint 008
contract: all-day = `DATE` columns; timed = UTC `DATETIME` + IANA `timezone`.
`event` in a Session response is the calendar's own projection.

---

## Linked records

| Frontend label | Canonical `entity_type` | Owning source |
| --- | --- | --- |
| Target | `gps_target` | `gps_targets.company_id` |
| SWOT | `swot_item` | `swot_items` → `swot_analyses.company_id` |
| Task | `gps_target_task` | `gps_target_tasks` → `gps_targets.company_id` |
| Financial | `financial_indicator` | `nodes` where `type='financial_indicators'` |
| Result | `achievement` | `achievements.company_id` |
| Evidence | `achievement_evidence` | `achievement_evidence` → `achievements.company_id` |

Relationships: `AGENDA`, `DISCUSSED`, `CREATED`, `UPDATED`, `REVIEWED`, `EVIDENCE`.
Resolution reuses the Calendar capability's `CalendarLinkResolver`, so the two
capabilities cannot drift. Every link must exist, belong to the Session company,
belong to the tenant, and be reachable by the actor. Duplicate identical links
(same entity + relationship) return `409`; the same entity under a different
relationship is allowed. A unique key is the database backstop.

**Creating** a record from the workspace uses that record's own API (Targets,
Results, Financial Indicators); the Session then adds a `CREATED` link. Sessions
contain **no** duplicate creation logic.

---

## Preparation brief

`brief.php` is a read model: it queries the canonical tables/models directly and
writes nothing. Sections: previous completed Session (+ its decisions) · open and
overdue tasks · active/overdue Targets · current SWOT items · financial
measurement coverage (last 12 months present/missing) · achievements awaiting
review (via the `Achievement` model, so eligibility matches the achievement
workflow) · recently verified achievements · records explicitly linked to this
Session. **No data is copied into Session tables.**

---

## Authorization matrix

Roles are **Director / System Administrator / Coordinator / Judge** — there is no
"Coach", so none was invented. "Authorized coach" maps to the administrative roles.

| Action | SA / Coordinator | Director / Judge |
| --- | --- | --- |
| Manage Sessions (tenant-wide) | ✅ | ❌ |
| Manage Sessions in own company | ✅ | ✅ |
| View shared Session content | ✅ | ✅ (own company) |
| View `incubator` notes | ✅ | ❌ **never** |
| Write `incubator` notes | ✅ | ❌ 403 |
| Edit a shared note | any | only own (author) |
| Convert / create / cancel | ✅ | ✅ own company |
| Link an entity | only if already authorized for it | same |
| Achievements/Targets/financial mutations | existing domain permissions | existing domain permissions |

Session access **never** grants access to a linked entity; backlinks respect the
viewer's authorization. `incubator` notes are filtered in the repository query, so
they cannot leak through any endpoint.

---

## Status codes

| Code | Meaning |
| --- | --- |
| 200 / 201 | Success (query/update/delete / create/convert) |
| 400 | Malformed request (e.g. missing `id`) |
| 401 | No active session |
| 403 | Forbidden (other company, incubator note, cross-company link) |
| 404 | Session / sub-resource / linked record not found |
| 409 | Invalid transition, frozen Session, conflict, duplicate link/participant, `SESSION_LINKED` |
| 422 | Structured validation failure `{error, errors:{field:message}}` |

Machine-readable `code` values: `SESSION_LINKED`, `SESSION_INVALID_TRANSITION`,
`SESSION_FROZEN`.

---

## Calendar integration

- The calendar list exposes `sessionId` on an event, but only when the Sessions
  capability is deployed (a table existence check keeps a calendar-only install
  working unchanged).
- Deleting a linked event returns `409 SESSION_LINKED`; the Calendar capability
  depends only on a tiny `CalendarSessionGuard` interface, and the Sessions
  capability supplies the implementation (dependency inversion).
- Cancelling a Session cancels the linked event in the same transaction.

---

## Migration path

Run order **#21**, after `2026-09-19-calendar-events.sql`.

```powershell
Get-Content api-incubator-os/migrations/2026-09-23-sessions.sql -Raw | podman exec -i incubator-os-mysql-container mysql -u docker -pdocker incubator_os
```

Idempotent: every table uses `IF NOT EXISTS`. Verified safe on repeated runs.

Tables: `sessions`, `session_participants`, `session_agenda_items`,
`session_notes`, `session_decisions`, `session_entity_links`, `session_activities`.

### Rollback

```sql
DROP TABLE IF EXISTS `session_activities`;
DROP TABLE IF EXISTS `session_entity_links`;
DROP TABLE IF EXISTS `session_decisions`;
DROP TABLE IF EXISTS `session_notes`;
DROP TABLE IF EXISTS `session_agenda_items`;
DROP TABLE IF EXISTS `session_participants`;
DROP TABLE IF EXISTS `sessions`;
```

Dropping `sessions` cascades to every child table. No existing table is modified
(the Sprint 008 calendar tables are additive-only here).

---

## Verification

- `api-incubator-os/tests/Sessions.ps1` — **105/105** assertions against the real
  schema and live endpoints.
- `api-incubator-os/tests/CalendarEvents.ps1` — **65/65** (no regression).
- Browser E2E (Director, company 11) — schedule, workspace Prepare/Run/Close/History,
  agenda, participant, note, decision, link, start, complete, freeze, cancel-cascade,
  calendar indicator, deep link, reload persistence, note isolation — **zero console errors**.
- Calendar unit tests 11/11; Session service tests 9/9; production build clean.
