# Incubator OS — Sprint 010 (Google Calendar) Production Deployment Package

**Status: PREPARED AND VERIFIED LOCALLY — NOT DEPLOYED.**
No production action has been taken or authorised. Deployment halts at a hard
hold-point until the read-only preflight is reviewed.

| Field | Value |
|---|---|
| Repository | `incubator-os` |
| Branch | `main` |
| Prepared at HEAD | `747576e` |
| Phase 1 (foundation) | `41ceea8` |
| Phase 2 (OAuth) | `e041934` |
| Phase 3 (publish + Meet) | `c440039` |
| Phase 4 (sync/cancel/conflict/unpublish) | `759cec4` |
| Phase 5 (Angular UI) | `747576e` |
| Production site | `https://app.rbttacesd.co.za` |
| Production API base | `https://app.rbttacesd.co.za/api/` |
| Production database | `rbttaces_api` |
| Server root folder | `/app.rbttacesd.co.za` |
| Local reference DB | `incubator_os` (MySQL 8.0.43) |

> This document describes a manual procedure for a human operator using
> phpMyAdmin (SQL) and FileZilla (files). It contains **no** production
> credentials and no commands that read protected files (`php.ini`, `.htaccess`,
> `.env`, logs, server config). No secret value is ever placed in the repository,
> a document or a chat message.

---

## 0. The central-account operating model (locked — read before deploying)

Sprint 010 connects Google Calendar through **one designated central account**
operated by an Incubator OS administrator / service user.

- **One owner.** A single designated admin/service user owns the connection. The
  connection is per Incubator OS user; the event mapping stores the owning
  `connection_id`.
- **OAuth only.** The central Google account is connected **exclusively through
  the OAuth consent flow**. Incubator OS never asks for, stores or transmits the
  Google account password, and no password field exists.
- **No shared password.** Enable **2FA / a passkey** on the account. Rotate the
  password that was previously exposed in a plaintext notes file and keep it out
  of every file and message. (Local cleanup has already removed the value from
  `docs/0001notes.md`; the operator must still **rotate** it and enable 2FA.)
- **View vs manage.** Any user who can access an event can **see the projection
  and use the Join-Meet / Open links**. Only the **owner** of the publishing
  connection may **publish, sync or unpublish**. This is enforced server-side
  (`ownedByViewer` + `assertOwnConnection`) and shown read-only in the UI.
- **Multi-user / organization-wide publishing is a FUTURE enhancement.** It will be
  a first-class **tenant-owned connection** (service account with domain-wide
  delegation, or a company-scoped connection) with its own migration,
  authorization model and consent. It must **not** be introduced quietly during
  documentation or deployment. See
  [`../google-calendar-api.md`](../google-calendar-api.md), "Reserved future modules".

Google Cloud Console setup, scopes, verification lead time and the **7-day
Testing-mode refresh-token expiry** are detailed in
[`../google-cloud-console-setup.md`](../google-cloud-console-setup.md).

---

## 1. What is being deployed

Sprint 010 is delivered as five sequential phases, deployed together because the
Angular surface (Phase 5) depends on the endpoints from Phases 2–4.

| Phase | Feature | Backend | Frontend | Migration |
|---|---|---|---|---|
| 1 | Foundation (crypto, config, schema, client seam) | `capabilities/google-calendar/**` (contracts, repos, `TokenCipher`, `CurlGoogleApiClient`, `FakeGoogleApiClient`, `GoogleApiClientFactory`), `config/google.php` | — | `2026-09-24-google-calendar.sql` |
| 2 | OAuth connect/callback/disconnect | `OAuthService`, `GoogleOAuthStateRepository`, `ReturnPathValidator`, `GoogleAccessPolicy`, `api/google-calendar/{connect,callback,disconnect,queries/connection}` | — | `…-phase2.sql` |
| 3 | Publish + automatic Meet link | `GoogleEventSyncService` (publish), `GoogleEventMapper`, `GoogleAttendeeResolver`, `GoogleSessionContext`, `PublishCalendarEventToGoogle`, `api/google-calendar/commands/publish.php` | — | `…-phase3.sql` |
| 4 | Reschedule / cancel / conflict / unpublish | `GoogleEventSyncService` (sync/cancelEvent/unpublish), `GoogleCancelHook`, `capabilities/calendar/Contracts/GoogleEventSyncHook.php`, calendar + session hook wiring, `Sync…`/`Unpublish…` commands + endpoints | — | `…-phase4.sql` |
| 5 | Angular connection + per-event sync UI | presentation context on `GoogleEventSyncResponse` + `GoogleEventSyncService::present()` | `features/calendar/{models,services,components}` + `calendar-page`, `features/sessions/*` | — |

The only changes to **pre-existing** files are additive hook wiring in the
Calendar and Sessions capabilities (see section 4).

---

## 2. Dependency chain

### 2.1 Migration dependencies (locked order)

```
22. 2026-09-24-google-calendar.sql          (Phase 1) - independent (needs companies/users)
23. 2026-09-24-google-calendar-phase2.sql   (Phase 2) - REQUIRES 22
24. 2026-09-24-google-calendar-phase3.sql   (Phase 3) - REQUIRES 22
25. 2026-09-24-google-calendar-phase4.sql   (Phase 4) - REQUIRES 22
```

All four are **idempotent**: every `CREATE TABLE` is `IF NOT EXISTS`, every enum /
column add is guarded by `information_schema` checks, and no existing column is
dropped, retyped or reordered. Each was applied **twice** locally with no error.

| Claim | Evidence |
|---|---|
| Idempotent | Guarded `information_schema` checks; `IF NOT EXISTS` on the two tables |
| Re-running is safe | Applied twice locally, exit 0 |
| Additive only | #23–#25 alter only `google_calendar_connections` / `google_event_sync`; no pre-existing table is touched |
| Rollback is reverse order | #22 drops both new tables; #23–#25 are column/enum additions to those same tables |

### 2.2 MySQL version requirements

| Feature used | Minimum | Local verified |
|---|---|---|
| `JSON` columns, enum alters, generated guard columns | 5.7 | 8.0.43 ✅ |
| `information_schema` guarded `ALTER` pattern | 5.7 | 8.0.43 ✅ |

No `CHECK` constraint or functional index is introduced by Sprint 010 (that was
Sprint 008/009), so the **8.0.16** floor from the prior sprint is unchanged. The
preflight still reports `VERSION()`; confirm 8.0.16+ before applying anything.

### 2.3 Backend code dependencies (deploy order)

Endpoints `include_once` their dependencies, so this order is for safe progressive
upload, not strict runtime linkage.

```
Layer 1  Contracts / value objects        (12 files)  - no dependencies
Layer 2  Repositories                      (3 files)  - depend on Layer 1
Layer 3  Services, policies, helpers       (14 files) - depend on Layers 1-2
Layer 4  Application commands              (3 files)  - depend on Layers 1-3
Layer 5  Config loader + feature manifest  (2 files)  - config has no deps; manifest is documentation
Layer 6  Calendar/Sessions hook wiring     (8 files)  - additive edits to EXISTING files
Layer 7  Public PHP endpoints              (9 files)  - depend on Layers 1-6
```

Deployable total: **51 files**. Full per-file list with SHA-256:
[`deployment/backend-manifest-sha256.md`](deployment/backend-manifest-sha256.md),
section A2.

### 2.4 Frontend dependencies

Angular is a compiled SPA. It is deployed **after** the backend and **after** the
migrations pass, because the Calendar/Sessions screens call the new endpoints.
The build output is uploaded per
[`deployment/angular-manifest-sha256.md`](deployment/angular-manifest-sha256.md).

---

## 3. Read-only production preflight

Run the existing compact verifier and the Google **structure** verifier **before any
change**.

| File | When | Expect |
|---|---|---|
| [`deployment/preflight-compact.sql`](deployment/preflight-compact.sql) | Before any change | prior-sprint objects present; `any_partial_blocker = NO` |
| [`deployment/verify-google-compact.sql`](deployment/verify-google-compact.sql) | Before **and** after the Google migrations | Google **structure** only (`information_schema`); see below |
| [`deployment/verify-google-integrity-compact.sql`](deployment/verify-google-integrity-compact.sql) | **After** the Google migrations only | data invariants all `0` |

> **Why two Google files (learned in the live preflight, 2026-09-24).** MySQL
> resolves every table named in a query at parse time. The first single-file
> verifier referenced `google_calendar_connections` directly in its integrity
> lines, so on the pre-deploy database it raised `#1146 - Table ... doesn't exist`
> instead of a clean row. The verifier is therefore split:
> **`verify-google-compact.sql` is `information_schema`-only** (safe before and
> after — it never names a Google table in a `FROM`), and
> **`verify-google-integrity-compact.sql`** (which does read the Google tables)
> runs **only after** they exist. Local proof: the structure file returns all
> zeros against a pre-010 schema (`incubator_os_prod`) with no `#1146`.

The Google **structure** verifier returns **one row**. Expected values:

| Column | Pre-deploy | Post-deploy |
|---|---|---|
| `t_conn` | `0` | `1` |
| `t_sync` | `0` | `1` |
| `t_oauth_states` | `0` | `1` (created by #23) |
| `i_gsync_claim` | `0` | `1` |
| `sync_status_col` | `0` | `1` |
| `has_generation` / `has_synced_version` / `has_remote_etag` | `0` | `1` |
| `has_conflict_at` / `has_unpublished_at` / `has_remote_outcome` / `has_last_google_event_id` | `0` | `1` |
| `has_conference_status` / `has_publish_claim` / `has_publish_claimed_at` | `0` | `1` |
| `has_pending_email` / `has_token_cipher_cols` | `0` | `1` |
| `enum_sync_status_extended` | `0` | `1` (`update_pending` + `unpublished`) |
| `enum_conn_status_extended` | `0` | `1` (`disconnected` + `account_mismatch`) |
| `enum_conference_status` | `0` | `1` |

> Column existence alone does not prove an enum was widened, so the verifier also
> confirms the three enum values (`enum_*`), and it confirms `google_oauth_states`
> (`t_oauth_states`, created by #23) — the table the first preflight pass did not
> check.

The Google **integrity** verifier (post-deploy) returns every `inv_*` as `0`:
`inv_broken_access_token`, `inv_broken_refresh_token`, `inv_orphan_sync`,
`inv_orphan_connection`, `inv_cross_tenant`, `inv_connection_not_one_per_user`.

### 3.1 Classification

| Classification | Meaning | Action |
|---|---|---|
| `MISSING` | No Google objects exist | Safe to apply |
| `PRESENT` | All expected objects exist | Skip (re-running is harmless) |
| `PARTIAL - STOP` | Some objects exist | **HARD STOP.** Reconcile manually |
| `PRESENT BUT INVALID - STOP` | Tables exist but structure differs | **HARD STOP.** Investigate drift |

### 3.2 Hard hold-point

> No migration and no file may be deployed until the preflight is reviewed. If any
> Google migration reads `PARTIAL - STOP` or `PRESENT BUT INVALID - STOP`, stop and
> report.

---

## 4. Pre-existing files touched (additive only)

These are **existing** production files that Sprint 010 edits. They are uploaded as
CREATE-or-REPLACE but the change is confined to an optional, best-effort hook.

| File | Change | Safety |
|---|---|---|
| `capabilities/calendar/Application/Commands/UpdateCalendarEvent.php` | optional `?GoogleEventSyncHook`, run **after** commit | Hook defaults to a no-op; a Google failure never throws |
| `capabilities/calendar/Application/Commands/DeleteCalendarEvent.php` | same | same |
| `api/calendar/commands/update.php` | wires `calendar_projection_hook` | additive |
| `api/calendar/commands/delete.php` | wires `calendar_projection_hook` | additive |
| `capabilities/sessions/Application/Commands/CancelSession.php` | optional hook, post-commit | additive; cancellation reason never leaves Incubator OS |
| `capabilities/sessions/Services/SessionCalendarGateway.php` | returns the committed event row | return-shape only |
| `api/sessions/_bootstrap.php` | includes the hook interface | additive include |
| `api/sessions/commands/cancel.php` | wires `sessions_projection_hook` | additive |

`capabilities/calendar` declares the **hook interface** only; it never includes a
`google-calendar` file. Verified by search.

> **Rollback of these files is a plain file restore** (Step 3 backup): without the
> hook wiring the pre-Google behaviour returns exactly, because the hook is
> optional and the default is a no-op.

---

## 5. Deployment procedure (manual, ordered)

> Steps 1–6 are read-only/backup. Steps 7+ change production. Do not skip the
> hold-point.

### Step 1 — Confirm maintenance window
Notify users; confirm no active data entry. Note the start time.

### Step 2 — Back up the database
phpMyAdmin → `rbttaces_api` → Export → SQL → save
`rbttaces_api-pre-010-<date>.sql`. Confirm the file exists, is non-trivial, and is
restorable (open the first lines).

### Step 3 — Back up every production file that will be replaced
Download the current production copies of:
- `api/capabilities/` (whole folder, if present) and `api/config/google.php`
- `api/api/google-calendar/` (if present from an earlier attempt)
- the touched `api/api/calendar/` and `api/api/sessions/` files
- the current Angular doc root (`index.html` + `main-*.js` + `styles-*.css` + `chunk-*.js`)

Store these backups **outside** the web root.

### Step 4 — Record the current production state
Record the current `index.html` and `main-*.js` filenames from the live site, and
the preflight output (section 3) verbatim.

### Step 5 — Run the read-only preflight
- [`deployment/preflight-compact.sql`](deployment/preflight-compact.sql)
- [`deployment/verify-google-compact.sql`](deployment/verify-google-compact.sql)

Save both rows.

### Step 6 — Decide (HARD HOLD-POINT)
- MySQL < 8.0.16 → **STOP.**
- Any sprint object `PARTIAL - STOP`/`PRESENT BUT INVALID - STOP` → **STOP** and report.
- Any calendar-before-sessions violation → **STOP.**
- Otherwise continue with the Google migrations classified `MISSING`, in order.

### Step 7 — Apply only the missing migrations, in locked order

```
1. 2026-09-24-google-calendar.sql          -> APPLY  (run order #22)
2. 2026-09-24-google-calendar-phase2.sql   -> APPLY  (run order #23)
3. 2026-09-24-google-calendar-phase3.sql   -> APPLY  (run order #24)
4. 2026-09-24-google-calendar-phase4.sql   -> APPLY  (run order #25)
```

In phpMyAdmin: select `rbttaces_api`, SQL tab, paste one migration file, Go. Do one
at a time.

> **Expected output:** each DDL reports *"MySQL returned an empty result set"* —
> normal for `CREATE TABLE`/`SET`. A benign *"#1681 Integer display width is
> deprecated"* may appear on MySQL 8. Only a red `#NNNN` error matters. If a query
> reports an empty result, **refresh the phpMyAdmin page** and re-run (editor
> glitch, not a data problem).

### Step 8 — Verify the migrations

Run **[`deployment/verify-google-compact.sql`](deployment/verify-google-compact.sql)**
(structure): `t_conn=1`, `t_sync=1`, `t_oauth_states=1`, `i_gsync_claim=1`,
`sync_status_col=1`, all `has_*=1`, and all three `enum_*_extended`=1.

Then run
**[`deployment/verify-google-integrity-compact.sql`](deployment/verify-google-integrity-compact.sql)**
(integrity — only valid now that the tables exist): every `inv_*` must be `0`.

Do not proceed until both pass.

### Step 9 — Place the Google credentials on the server

Create `config/google.local.php` on the server (same folder as the committed
`config/google.php`; **gitignored — never upload it from source control**), copying
the shape from `config/google.local.example.php`:
`client_id`, `client_secret`, `encryption_key` (`base64(random_bytes(32))`,
**separate** from the client secret), `key_version = 1`, `default_calendar_id =
primary`. See [`../google-cloud-console-setup.md`](../google-cloud-console-setup.md),
section 5.

> **Fails closed.** If any value is missing or the AES key is not a valid 32-byte
> base64 value, every Google endpoint returns `503 GOOGLE_NOT_CONFIGURED`. This is
> the intended state until the operator supplies the credentials — do **not** work
> around it.

### Step 10 — Upload backend files in dependency order
Using FileZilla, upload the files in
[`deployment/backend-manifest-sha256.md`](deployment/backend-manifest-sha256.md) in
Layer 1 → Layer 7 order into the production `/api/` folder (path mapping in
section 6).

**Must NOT be overwritten** (production-specific settings differ from local).
None of these appear in the manifest — confirm before any bulk upload:

```
api/config/Database.php
api/config/headers.php
api/common/common.php
api/models/User.php
api/api-nodes/imports/index.php
api/api-nodes/imports/read-json.php
api/api-nodes/imports/normalizers.php
api/api-nodes/imports/*.json
```

Also never upload: local `.env` files, server logs (`error_log`), temp/backup files
(`*.bak`, `*.tmp`), IDE folders, local upload/storage folders, container-only
configuration unless required, and the test harness (`api-incubator-os/tests/*`).

### Step 11 — Run the Google smoke tests
Run section G of [`deployment/smoke-tests.md`](deployment/smoke-tests.md). Do not
deploy the frontend until they pass.

### Step 12 — Deploy the Angular build last
Build locally (`npm run prod`), then upload the contents of
`dist/nodes/browser/` per
[`deployment/angular-manifest-sha256.md`](deployment/angular-manifest-sha256.md)
into the Angular doc root.

### Step 13 — Clear only safe caches
Hard-refresh the browser (Ctrl+F5). Purge only the static app paths if a CDN
fronts the site. Do not clear database or server caches you cannot identify.

### Step 14 — Post-deployment verification and evidence
Run the full [`deployment/smoke-tests.md`](deployment/smoke-tests.md), capture the
post-migration integrity output, the deployed `main-*.js` hash, and update
`.ai/sessions/` with the deployment session.

---

## 6. FileZilla upload manifest (exact)

**Production upload root for the backend: the existing `/api/` folder.**

| Repository | Production | Example |
|---|---|---|
| `api-incubator-os/api/...` | `/api/api/...` | `api-incubator-os/api/google-calendar/commands/publish.php` → `/api/api/google-calendar/commands/publish.php` |
| `api-incubator-os/capabilities/...` | `/api/capabilities/...` | `.../capabilities/google-calendar/Services/TokenCipher.php` → `/api/capabilities/google-calendar/Services/TokenCipher.php` |
| `api-incubator-os/config/google.php` | `/api/config/google.php` | committed loader (no secrets) |

> **Preventing accidental `/api/api/` nesting:** the double `api` is correct **only**
> for repository paths that already contain `api/`. Navigate INTO `/api/` and upload
> `capabilities/`, `api/`, `config/google.php` as subfolders/files. Never upload the
> `api-incubator-os` folder itself, and **never** upload `config/google.local.php`.

The exact repository→destination pairs, with per-file SHA-256, are in
[`deployment/backend-manifest-sha256.md`](deployment/backend-manifest-sha256.md).

---

## 7. Rollback strategy

See [`deployment/rollback-matrix.md`](deployment/rollback-matrix.md), section 9
(Sprint 010). Summary:

> **Do not drop the Google tables once a user has published.** Prefer restoring the
> backed-up files, restoring the previous frontend bundle, disabling the Google UI,
> and forward-fixing. Dropping is permitted **only before live writes**, or through
> an explicitly approved database restore.

Before dropping the tables (pre-write only): **revoke the stored tokens upstream**
(the operator's Google Account → Security → Third-party access), then optionally
delete the created Google events, then:

```sql
DROP TABLE IF EXISTS `google_event_sync`;
DROP TABLE IF EXISTS `google_calendar_connections`;
```

Rollback source of truth is the Step 2/3 backups plus the previous commit
`747576e` (pre-010 deployment, post-009) in Git.

---

## 8. Hard-stop conditions

Stop immediately and report if any of these occur:

| # | Condition |
|---|---|
| 1 | Schema mismatch: any Google migration reads `PARTIAL - STOP` / `PRESENT BUT INVALID - STOP` |
| 2 | Authentication failure: authenticated requests return 401, or unauthenticated return 200 |
| 3 | Company/tenant isolation failure: a user sees or writes another company's data |
| 4 | Missing dependency: a Google endpoint returns a PHP include/fatal error |
| 5 | A token, ciphertext, client secret, `connection_id`, `etag` or claim token appears in any response or log |
| 6 | A non-owner is able to publish/sync/unpublish another organiser's mapping (authorization failure) |
| 7 | Generic 500 responses on any deployed Google endpoint |
| 8 | SQL or exception details exposed to clients (raw SQLSTATE / stack trace) |
| 9 | Google events or invitations created for the wrong company/Session (attendee/resolution failure) |
| 10 | Calendar timezone/date shifting reappears (all-day event moves a day) |

---

## 9. Local verification performed (before commit)

| Check | Result |
|---|---|
| Combined offline runner `tests/GoogleCalendar.ps1` | **488/488** across 9 suites |
| Phase 1 / 2 / 3 / 4 / 5 service suites | 62 / 73 / 108 / 92 / 34 |
| Phase 2 / 3 / 4 / 5 HTTP suites | 23 / 26 / 33 / 37 |
| PHP lint (all backend files) | 620/620 clean |
| Migrations #22–#25 | applied twice locally, idempotent |
| Production Angular build | clean, no new budget warning |
| Browser E2E (connect → publish → sync → conflict → remove → republish) | zero console errors |
| Network | **none** — offline fake only |

---

## 10. Production hold-point status

**Preflight: NOT YET RUN for the Google migrations.** This package is prepared and
locally verified; no production action has been taken.

| Migration | Decision |
|---|---|
| 22 `2026-09-24-google-calendar.sql` | **APPLY** (after preflight) |
| 23 `2026-09-24-google-calendar-phase2.sql` | **APPLY** (after #22) |
| 24 `2026-09-24-google-calendar-phase3.sql` | **APPLY** (after #23) |
| 25 `2026-09-24-google-calendar-phase4.sql` | **APPLY** (after #24) |
| `config/google.local.php` | **OPERATOR STEP** — create on the server, never upload |
| Google Cloud Console (client, redirect URIs, scopes, test users) | **OPERATOR STEP** — see the console runbook |
| 2FA + password rotation for the central account | **OPERATOR STEP** — required |

Nothing has been executed by the agent. The remaining hold-point is the operator's
continuation of section 5.

### 10.1 Operator execution log

**Database stage: COMPLETE (operator, 2026-09-24).** Preflight clean (prior sprints
all `PRESENT`, Google all `MISSING`); migrations **#22 → #23 → #24 → #25** applied in
order with no red error; post-migration structure verifier **all 21 columns = 1**;
integrity verifier **all `inv_* = 0`**. See
[`sprint-010-deployment-operator-runbook.md`](sprint-010-deployment-operator-runbook.md)
for the linear credentials → backend → frontend → token → smoke path.

| Step | Status |
|---|---|
| Preflight (prior sprints) | ✅ clean — no partial/invalid |
| Google structure preflight | ✅ all `MISSING` |
| #22 google-calendar | ✅ applied |
| #23 google-calendar-phase2 | ✅ applied |
| #24 google-calendar-phase3 | ✅ applied |
| #25 google-calendar-phase4 | ✅ applied |
| Structure verify (post) | ✅ 21/21 = 1 |
| Integrity verify (post) | ✅ all `inv_* = 0` |
| Central account rotate + 2FA | ☐ operator |
| OAuth client + redirect URI | ☐ operator |
| `config/google.local.php` | ☐ operator |
| Backend upload (51 files) | ☐ operator |
| Angular upload (73 files) | ☐ operator |
| Connect (Google token) | ☐ operator |
| Smoke tests G0–G12 | ☐ operator |
| Evidence + cleanup | ☐ operator |
