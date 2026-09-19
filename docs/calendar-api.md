# Calendar API — Sprint 008 Phase 2

The calendar persists generic dated entries (appointments, deadlines, reviews,
check-ins) per company and system-wide. It is **not** a coaching-session model:
a calendar event is an arbitrary dated entry. A later phase introduces
first-class Sessions and may associate a meeting-category event with a session.

**Architecture:** capability layer (`api-incubator-os/capabilities/calendar/`)
exposed by thin endpoints (`api-incubator-os/api/calendar/`), following the
`capabilities/` + `api/` convention already used by Company and
FinancialIndicators. Authentication uses the repository's real session guard
(`helpers/AuthGuard.php`), which the capability endpoints for those two features
did not have.

> Legacy `api-nodes/` storage is **not** used and the Angular client has no
> knowledge of `nodes` — the calendar lives in real relational tables.

---

## Endpoint inventory

Base: `{ApiBase}api/calendar` (local `http://localhost:8080/`, prod `https://app.rbttacesd.co.za/api/`).

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/queries/list.php` | required | List events overlapping a bounded range |
| GET | `/queries/get.php?id=` | required | Get one event |
| POST | `/commands/create.php` | required | Create an event |
| POST | `/commands/update.php?id=` | required | Update an event (optimistic concurrency) |
| POST | `/commands/delete.php?id=` | required | Soft-delete an event |

All requests are sent with `withCredentials` so the PHP session cookie travels.

### `list.php` query parameters

| Param | Required | Notes |
| --- | --- | --- |
| `start` | ✅ | `YYYY-MM-DD`, inclusive |
| `end` | ✅ | `YYYY-MM-DD`, inclusive; must be ≥ `start` |
| `company_id` | – | A company scope. Omitted = global (every accessible company + system-wide) |
| `category` | – | Allowlisted category |
| `status` | – | `scheduled` \| `completed` \| `cancelled` |
| `search` | – | Substring match on title / description / location |
| `assignee_user_id` | – | Exact assignee |

An unbounded request is rejected (`422`) — the UI only ever asks for the visible
month grid plus a 120-day agenda horizon.

Returns a **bare JSON array** of `CalendarEventResponse`. Commands return the
capability `CommandResult` envelope (`{success, message, data, auditId, warnings}`).

---

## Date/time storage contract

This is the part of the schema that exists specifically to avoid timezone bugs.

| Event kind | Stored as | Returned as |
| --- | --- | --- |
| All-day | `start_date` / `end_date` **DATE** (inclusive) | `startDate` / `endDate` = `YYYY-MM-DD` |
| Timed | `start_at` / `end_at` **DATETIME in UTC** + IANA `timezone` | `startAt` / `endAt` = ISO-8601 `...Z`, plus `timezone` |

- An all-day date is **never** stored as midnight UTC, so it cannot shift across
  timezones.
- A `CHECK` constraint (`chk_cal_time_shape`) enforces exactly one valid
  combination: all-day ⇒ dates only; timed ⇒ UTC datetimes + timezone only.
  Mixed shapes are rejected by MySQL as well as the service validator.
- The Angular service converts wall-clock ↔ UTC using the host's real offset, so
  DST is handled by the platform.

---

## Authorization matrix

Roles in this system are **Director / System Administrator / Coordinator /
Judge** — there is no "Coach", so none was invented.

| Action | System Administrator / Coordinator | Director / Judge |
| --- | --- | --- |
| List own company + system-wide | ✅ | ✅ (own company only) |
| List every company (global view) | ✅ (tenant-wide) | ❌ (restricted to `users.company_id`) |
| Get / update / delete a company event | ✅ | ✅ if it is their company |
| Create/update a **system-wide** event (`companyId = null`) | ✅ | ❌ `403` |
| Link an event to a record in another company | ❌ `403` | ❌ `403` |
| Read an event in another tenant | ❌ `404` (invisible) | ❌ `404` |

Server-derived and **never accepted from the browser**: actor id, tenant id,
accessible-company scope, creator, and all timestamps.

`company_id = NULL` means system-wide: it is included in every company listing as
a read, but it is **not** an authorization bypass — only administrators may write
it, and a system-wide event may not carry links (a link is inherently
company-owned, so allowing it would leak one company's records into every
calendar).

---

## Optimistic concurrency, idempotency, and cancellation

- **`version`** — an integer incremented on every successful update/delete. Send
  the version you read back on update (`version` in the body) and the server
  rejects a stale write with `409`.
- **`clientToken`** — optional caller-supplied idempotency key, unique per
  creator (`uq_cal_client_token`). A retried create returns the existing event
  instead of duplicating it.
- **Soft delete vs cancel** — `DELETE` sets `deleted_at` (removed from every
  listing); `status = 'cancelled'` keeps the event visible but marked cancelled.
  These are distinct operations.

---

## Linked records

At most one row per `(event, entity type, entity id)`. Canonical entity types
(the frontend maps its own labels to these):

| Frontend label | Canonical `entity_type` | Owning source |
| --- | --- | --- |
| Target | `gps_target` | `gps_targets.company_id` |
| SWOT | `swot_item` | `swot_items` → `swot_analyses.company_id` |
| Task | `gps_target_task` | `gps_target_tasks` → `gps_targets.company_id` |
| Financial | `financial_indicator` | `nodes` where `type='financial_indicators'` |
| Result | `achievement` | `achievements.company_id` |
| Evidence | `achievement_evidence` | `achievement_evidence` → `achievements.company_id` |

Every link is verified to exist, belong to the **same company** as the event, and
be reachable by the actor. Cross-company links return `403`; a missing or deleted
linked record returns `404`.

---

## Status codes

| Code | Meaning |
| --- | --- |
| 200 / 201 | Success (list/get/update/delete / create) |
| 400 | Malformed request (e.g. missing `id`) |
| 401 | No active session |
| 403 | Forbidden (other company, or non-admin system-wide) |
| 404 | Event or linked record not found (also used to hide other-tenant rows) |
| 409 | Optimistic-concurrency conflict |
| 422 | Validation failure — structured `{error, errors:{field:message}}` |

---

## Migration path

| Order | File | What |
| ---: | --- | --- |
| 20 | `migrations/2026-09-19-calendar-events.sql` | `calendar_events` + `calendar_event_links`, indexes, CHECK constraint |

Applied **#1–#19** are unchanged. Run #20 locally:

```powershell
Get-Content api-incubator-os/migrations/2026-09-19-calendar-events.sql -Raw | podman exec -i incubator-os-mysql-container mysql -u docker -pdocker incubator_os
```

Idempotent: both tables use `IF NOT EXISTS`; the `CHECK` is declared on the
`CREATE` (MySQL cannot add it idempotently afterwards). Re-running is a no-op —
verified locally.

### Rollback

```sql
DROP TABLE IF EXISTS `calendar_event_links`;
DROP TABLE IF EXISTS `calendar_events`;
```

Dropping `calendar_events` cascades to `calendar_event_links`. No other table is
touched.

---

## Verification

- `api-incubator-os/tests/CalendarEvents.ps1` — **65/65** backend integration
  assertions against the real MySQL schema and live PHP endpoints (lifecycle,
  UTC/all-day round-trips, overlap queries, month/year boundaries, scoping,
  filters, validation, concurrency, idempotency, links, tenant isolation,
  authorization).
- Browser E2E — **23/23** against the real API (login, global + company calendar,
  create/edit/delete through the UI, reload persistence, day modal, agenda,
  structured validation, zero console errors).
- `ng build --configuration production` — clean, no budget warnings.
