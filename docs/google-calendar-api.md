# Google Calendar API — Sprint 010

Incubator OS projects Calendar events outbound into Google Calendar. Incubator OS
is the **source of truth**: a Google event is a projection of a local
`calendar_events` row, never the reverse. This sprint is **outbound only** — there
is no inbound sync, no `watch` channels, no webhooks.

**Architecture:** capability layer (`api-incubator-os/capabilities/google-calendar/`)
exposed by thin endpoints (`api-incubator-os/api/google-calendar/`). The Calendar
capability declares a `GoogleEventSyncHook` **interface** and never depends on a
Google file; the Google capability implements the hook. Authentication uses the
repository session guard (`helpers/AuthGuard.php`).

> **No secret is ever returned, logged or stored in plaintext.** Tokens are
> encrypted at rest with AES-256-GCM (ciphertext, nonce and tag in **separate**
> columns). See "Security contract" below.

---

## Connection ownership model (read this first)

Google Calendar is connected through **one designated central account** operated
by an Incubator OS administrator / service user. This is a deliberate operating
model for the current sprint:

- **One owner.** A single designated admin/service user owns the Google
  connection. The connection is **per Incubator OS user** (`UNIQUE(user_id)`), and
  the mapping stores the owning `connection_id`.
- **OAuth only.** The central Google account is connected **exclusively through
  the OAuth consent flow**. Incubator OS never asks for, stores or transmits the
  Google account password.
- **Nobody types the password into Incubator OS.** No password field exists. The
  operator enables **2FA / a passkey** on the account and keeps the password out
  of any file, message or document.
- **Others can view, only the owner can manage.** Any user who may access the
  event can **see the projection and use the Join-Meet / Open-in-Google links**.
  Only the owner of the publishing connection may **publish, sync or remove** that
  mapping. This is enforced on the server (`ownedByViewer` + `assertOwnConnection`)
  and reflected in the UI (read-only).
- **Multi-user / organization-wide publishing is a FUTURE enhancement.** It will
  arrive as a **tenant-owned connection** (a service account with domain-wide
  delegation, or a company-scoped connection) — a first-class feature with its own
  migration, authorization model and consent. It must **not** be introduced
  quietly during documentation or deployment. See "Reserved future modules".

---

## Endpoint inventory

Base: `{ApiBase}api/google-calendar` (local `http://localhost:8080/`, prod
`https://app.rbttacesd.co.za/api/`).

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/queries/connection.php` | required | The acting user's Google connection status |
| GET | `/queries/event.php?id=` | required | The Google projection of one event (view-authorized) |
| POST | `/commands/connect.php` | required | Begin OAuth; returns `authUrl` |
| GET | `/commands/callback.php` | required | Google's redirect; stores the connection, 302s back |
| POST | `/commands/disconnect.php` | required | Disconnect the acting user's connection |
| POST | `/commands/publish.php?id=` | required | Create (or safely re-return) the Google event |
| POST | `/commands/sync.php?id=` | required | Push local changes to the Google event (PATCH) |
| POST | `/commands/unpublish.php?id=` | required | Remove the Google copy, keep local records |

All requests are sent with `withCredentials` so the PHP session cookie travels.

`connect`/`disconnect` manage the **connection**; `publish`/`sync`/`unpublish`
manage an **event projection**. They are separate concerns: disconnecting does not
unpublish, and unpublishing does not disconnect.

### `queries/connection.php`

Returns the ONLY shape the browser receives for a connection — status and the
connected account email. It **never** includes a token, ciphertext, nonce, tag or
configuration value.

```json
{
  "status": "connected",
  "googleAccountEmail": "incubatorosapp@gmail.com",
  "calendarId": "primary",
  "connectedAt": "2026-09-24T08:00:00Z",
  "lastSyncedAt": "2026-09-24T09:12:00Z",
  "needsReconnect": false,
  "pendingAccountEmail": null
}
```

`status` values: `disconnected` · `connected` · `needs_reconnect` · `revoked` ·
`account_mismatch`.

### `queries/event.php?id=`

Returns the projection plus the **presentation context** the UI needs. Requires
access to the event (the same authorization as viewing it).

```json
{
  "success": true,
  "data": {
    "calendarEventId": 42,
    "syncStatus": "synced",
    "conferenceStatus": "success",
    "published": true,
    "fullySynced": true,
    "googleEventId": "inc…g1",
    "googleCalendarId": "primary",
    "googleEventUrl": "https://calendar.google.com/event?eid=…",
    "meetUrl": "https://meet.google.com/…",
    "lastSyncedAt": "2026-09-24T09:12:00Z",
    "lastError": null,
    "version": 4,
    "everPublished": true,
    "isMeeting": true,
    "attendeeCount": 4,
    "willSendInvitations": true,
    "ownedByViewer": true,
    "syncedEventVersion": 4,
    "upToDate": true
  },
  "warnings": []
}
```

The presentation fields are **derived** (a pure read — no Google call, no writes):

| Field | Meaning |
| --- | --- |
| `everPublished` | Has this event ever been published (even if later removed)? Drives "Add again". |
| `isMeeting` | The local event's category is `meeting` (a Meet link is expected). |
| `attendeeCount` | How many attendees Google would notify (organiser excluded, deterministic). |
| `willSendInvitations` | Will publish/sync email invitation updates? |
| `ownedByViewer` | Does the acting viewer own the connection (may manage it)? |
| `syncedEventVersion` | The local event version the projection reflects, if any. |
| `upToDate` | The projection reflects the event's **current** version (Google matches Incubator OS). |

### Commands

All commands return the capability `CommandResult` envelope
(`{success, message, data, auditId, warnings}`); `data` is the same projection
shape as `queries/event.php`.

- `publish.php?id=` — idempotent: an already-published event returns the existing
  projection, never a second Google event or conference. Requests a Meet link for
  `meeting` events. A **republish after unpublish** uses a **new generation** (new
  deterministic id + new conference request id), so a Google-tombstoned id is
  never reused.
- `sync.php?id=` — idempotent by `synced_event_version`: a repeat with the same
  local version sends nothing (no email). A cancelled local event delegates to the
  cancellation path.
- `unpublish.php?id=` — deliberately removes the Google copy while retaining the
  local event, Session and audit history; the sync row is kept as `unpublished`.

---

## Sync states

Two independent statuses describe one event projection:

**`syncStatus` — where the local change has reached:**

| Value | Meaning | UI |
| --- | --- | --- |
| `pending` | The Google conference is still being created | "Creating Google Meet link…" |
| `synced` | The projection matches the local event | "In Google Calendar" |
| `update_pending` | A transient failure; the local change is safe and retryable | "Retry sync" |
| `conflict` | A Google-side edit (etag mismatch); nothing overwritten | "Changed externally in Google Calendar" |
| `failed` | A hard failure (e.g. reconnect required) | "Reconnect Google Calendar" |
| `detached` | The Google event was removed/cancelled externally | — |
| `unpublished` | Deliberately removed; the row is kept for audit | "Removed from Google Calendar" |

**`conferenceStatus` — the async Meet conference (independent of the above):**
`none` · `pending` · `success` · `failure`.

`fullySynced` is the single answer to "is publishing complete?": it is false while
a conference is still `pending`, so a half-finished publish is never reported as
complete. A PATCH does not send `conferenceData`, so a PATCH response lacking
conference info never downgrades a meeting to `pending`.

---

## Date/time contract (all-day exclusivity)

The Calendar date/time contract does not change; Google's rules are layered on it:

| Event kind | Incubator OS | Sent to Google |
| --- | --- | --- |
| All-day | `start_date` / `end_date` DATE (inclusive) | `start.date` = start; `end.date` = **end + 1 day** (Google's exclusive end) |
| Timed | UTC `start_at` / `end_at` + IANA `timezone` | `start.dateTime` / `end.dateTime` with the `timeZone`; wall-time preserved, including across DST |

- Google's all-day `end.date` is **exclusive**; Incubator OS stores an
  **inclusive** end. The mapper adds exactly one day on the way out so the
  round-trip is lossless.
- A timed event keeps its IANA wall time; the platform handles DST.

---

## Error codes

Google failures are mapped to secret-free codes by `GoogleErrorResponder`. The
raw Google response body is never echoed.

| HTTP | `code` | Meaning |
| --- | --- | --- |
| 401 | `GOOGLE_RECONNECT_REQUIRED` | The refresh token is invalid/revoked; reconnect. |
| 403 | (message only) | The actor may not manage this connection/mapping. |
| 409 | `GOOGLE_NOT_CONNECTED` | No usable connection; publish refused without contacting Google. |
| 409 | `GOOGLE_ACCOUNT_MISMATCH` | A reconnect used a different Google account while mappings exist. |
| 409 | `GOOGLE_PUBLISH_IN_PROGRESS` | A concurrent publish holds the lease; Google was not contacted. |
| 409 | `GOOGLE_OPERATION_IN_PROGRESS` | Another operation holds the event's lease; retry shortly. |
| 409 | `GOOGLE_NOT_PUBLISHED` | Nothing to sync/cancel/unpublish. |
| 409 | `GOOGLE_SYNC_CONFLICT` | A Google-side edit; nothing overwritten. |
| 422 | `GOOGLE_OAUTH_STATE` | The OAuth state was missing/expired/reused/cross-user. |
| 422 | `GOOGLE_SCOPE_MISSING` | The required Calendar scope was not granted. |
| 429 | `GOOGLE_API_RATE_LIMITED` | Google rate limit. |
| 500 | `GOOGLE_TOKEN_UNREADABLE` | A stored token could not be decrypted; fails closed. |
| 502 | `GOOGLE_API_*` | A Google server/network error. |
| 503 | `GOOGLE_NOT_CONFIGURED` | Credentials absent on the server (`google_configured()` false). |

The OAuth **callback** never puts an error in the URL. It redirects with a single
safe result code (`?google=`):

| Code | Meaning |
| --- | --- |
| `connected` | A connection was stored. |
| `denied` | The user declined consent. |
| `scope_missing` | The Calendar scope was not granted. |
| `invalid` | The state was missing/expired/reused/cross-user. |
| `account_mismatch` | A different Google account was used while mappings exist. |
| `failed` | Google or the provider failed. |

`ReturnPathValidator` guarantees the redirect is a same-origin relative path inside
the app; only the path (no query) is honoured, preventing open redirects.

---

## Authorization

| Action | Owner of the connection | Other user with event access | No event access |
| --- | --- | --- | --- |
| Read the projection | ✅ | ✅ (read-only) | ❌ 404 |
| Use Join-Meet / Open links | ✅ | ✅ | ❌ |
| Publish / sync / unpublish | ✅ | ❌ 403 | ❌ 404 |
| Manage the connection (connect/disconnect) | ✅ (own only) | ❌ | ❌ |

- Publishing/syncing requires the same authorization as editing the event, plus a
  usable connection that belongs to the actor (unless it is a server-side
  cancellation of an existing mapping, which uses the stored connection).
- **Ownership is per-connection, not per-role.** Even an administrator cannot
  sync/unpublish a mapping whose connection belongs to another user.
- Sessions stay internal: the Session's participants become Google attendees, but
  the Session's incubator-only notes/decisions/reasons are never sent to Google.

---

## Security contract

- Tokens are encrypted with **AES-256-GCM**; ciphertext, nonce, tag and key
  version are stored in **separate** columns. The encryption key is a **separate
  secret** from the Google client secret and must decode to exactly 32 bytes.
- Tokens, authorization codes, client secrets and refresh tokens appear in **no**
  response, log or error message (`SecretRedactor`).
- The browser receives **only** the safe DTOs above — never a token, ciphertext,
  `connection_id`, `etag`, claim token or raw remote error.
- The OAuth state is 256-bit random, single-use, short-lived (10 min) and bound to
  the user + tenant; it is checked **before** a code is exchanged.
- The redirect URI is taken **only** from configuration; a client-supplied value
  is never used.
- Conflict stores only the two etags (local + remote); **no external snapshot**
  (no attendee or description data) is kept, and local data is never reverted to
  Google's version.
- `config/google.php` **fails closed**: when the local credentials are absent or
  invalid, every endpoint returns `503 GOOGLE_NOT_CONFIGURED`.

---

## Configuration

`config/google.php` (committed loader, no secrets) resolves credentials from the
gitignored `config/google.local.php`, with environment variables overriding:

```
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_ENCRYPTION_KEY,
GOOGLE_KEY_VERSION, GOOGLE_DEFAULT_CALENDAR_ID
```

The redirect URI is derived from `APP_URL`:
`{APP_URL}/api/api/google-calendar/commands/callback.php`.

The scope set is locked in `Contracts/GoogleScopes.php`: `openid`, `email`,
`https://www.googleapis.com/auth/calendar.events` (a **sensitive** scope — see the
[Google Cloud Console setup](google-cloud-console-setup.md)).

There is no fake client in production. `config/google.local.php` may set
`use_fake => true` (or `GOOGLE_FAKE=1`) **only** for local/offline testing, where
it selects the deterministic `FakeGoogleApiClient` and can never cause a network
call.

---

## Migrations

| Order | File | What |
| ---: | --- | --- |
| 22 | `2026-09-24-google-calendar.sql` | `google_calendar_connections` + `google_event_sync` (encrypted token columns, per-event projection) |
| 23 | `2026-09-24-google-calendar-phase2.sql` | Connection `status` values (`disconnected`, `account_mismatch`) + `pending_account_email` |
| 24 | `2026-09-24-google-calendar-phase3.sql` | `conference_status` + `publish_claim_token`/`publish_claimed_at` (publish lease) + `idx_gsync_claim` |
| 25 | `2026-09-24-google-calendar-phase4.sql` | `generation`, `synced_event_version`, `remote_etag`, `conflict_at`, `unpublished_at`, `remote_outcome`, `last_google_event_id`; `sync_status` gains `update_pending` + `unpublished` |

All four are **idempotent** (guarded `information_schema` checks; no existing
column dropped, retyped or reordered). Full runbook:
[`sprint-010-google-calendar-deployment.md`](sprint-010-google-calendar-deployment.md).

### Rollback

```sql
-- Only before any production write exists in the new tables:
DROP TABLE IF EXISTS `google_event_sync`;
DROP TABLE IF EXISTS `google_calendar_connections`;
```

Dropping is permitted **only before live writes**, or through an explicitly
approved database restore. Before dropping, revoke the stored tokens upstream and
optionally delete the created Google events. Once a production user has published,
prefer restoring files / disabling navigation and forward-fixing — never drop the
tables. See [`deployment/rollback-matrix.md`](deployment/rollback-matrix.md).

---

## Verification

- `api-incubator-os/tests/GoogleCalendar.ps1` — the combined **offline** runner
  (`GOOGLE_FAKE=1`, no network) covering the whole sprint.
- Service suites (offline, real MySQL fixtures):
  `GoogleCalendarPhase1.php` **62/62**, `GoogleCalendarPhase2.php` **73/73**,
  `GoogleCalendarPhase3.php` **108/108**, `GoogleCalendarPhase4.php` **92/92**,
  `GoogleCalendarPhase5.php` **34/34**.
- HTTP suites (live endpoints, offline fake):
  `GoogleCalendarPhase2Http.ps1` **23/23**, `GoogleCalendarPhase3Http.ps1`
  **26/26**, `GoogleCalendarPhase4Http.ps1` **33/33**, `GoogleCalendarPhase5Http.ps1`
  **37/37**.
- `ng build --configuration production` — clean, no new budget warning; browser
  walkthrough of every state with **zero console errors**.

---

## Reserved future modules (do not implement yet)

Documented so this sprint does not make conflicting assumptions:

- **Tenant-owned / organization-wide connection** — a service account with
  domain-wide delegation, or a company-scoped connection, enabling multiple users
  to publish under one Incubator OS account. This is the sanctioned path to
  multi-user publishing and needs its own migration, authorization model and
  consent. It is **not** a documentation-time change.
- **Google Meet API post-meeting intelligence** — conference records,
  participants, attendance, recordings and transcripts.
- **Inbound sync** — Google `watch` + webhook ingestion with a reconciliation
  policy (last-writer vs conflict) yet to be decided.
- **Composer / `google/apiclient` migration** — replacing `CurlGoogleApiClient`
  behind the unchanged `GoogleApiClient` interface.
