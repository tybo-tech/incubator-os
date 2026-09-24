# Incubator OS - Sprint 007/008/009 Rollback Matrix

**Critical rule (read first).**

> **Do not casually drop Calendar, Session, Achievement, or Evidence tables after production users have
> written data.** Once real records exist, dropping a table destroys production data and, for
> achievements, an immutable audit record. Prefer:
>
> 1. Restore backed-up application files.
> 2. Restore the previous frontend bundle.
> 3. Disable affected navigation (hide the tab/route) rather than deleting data.
> 4. Keep forward-compatible additive tables in place.
> 5. Forward-fix schema or code problems.
>
> Dropping tables is permitted **only** before live writes, or through an explicitly approved database
> restore. **Verified Achievement snapshots (`achievement_evidence.snapshot_json`) must never be
> silently destroyed or mutated.**

Rollback sources:
- Database: the Step 2 backup `rbttaces_api-pre-007009-<date>.sql`.
- Files: the Step 3 backups of `api/` and the Angular bundle, stored outside the web root.
- Git: previous commits `34a0dd5` (before 008/009), `2fa0052` (after 007, before 008/009).

| Sprint | Last commit | Roll back code to |
|---|---|---|
| 007 | `2fa0052` (in `34a0dd5`) | `2fa0052` |
| 008 | `6420d11` | `34a0dd5` |
| 009 | `2732e3b` | `6420d11` |

---

## 1. Failure before any file deployment (migration stage)

| Situation | Data written? | Rollback |
|---|---|---|
| Migration fails mid-file | No (or only its own new tables) | The migrations create **new** tables + additive nullable columns. Investigate the error. If a partial table exists, drop only that half-created table (it is empty), then fix and re-run. **Do not** drop pre-existing tables. |
| Migration applied but integrity check fails | No live writes yet | Drop the offending **new** table(s) only (still empty), re-apply. For `gps_target_metrics` columns, drop only the 9 additive columns. |
| Preflight said PARTIAL - STOP | Unchanged | Do nothing destructive. Reconcile the partial schema manually against the migration, or restore the DB backup if drift is unexplained. |

New tables are safe to drop **only** while empty and before any application write:
`metric_type_accounts`, `achievements`, `achievement_evidence`, `calendar_events`,
`calendar_event_links`, `sessions`, `session_participants`, `session_agenda_items`, `session_notes`,
`session_decisions`, `session_entity_links`, `session_activities`.

Reverse dependency order for a pre-write drop (as documented in each migration header):

```
DROP TABLE IF EXISTS session_activities;
DROP TABLE IF EXISTS session_entity_links;
DROP TABLE IF EXISTS session_decisions;
DROP TABLE IF EXISTS session_notes;
DROP TABLE IF EXISTS session_agenda_items;
DROP TABLE IF EXISTS session_participants;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS calendar_event_links;
DROP TABLE IF EXISTS calendar_events;
ALTER TABLE achievement_evidence DROP INDEX uq_evidence_metric_snapshot;
DROP TABLE IF EXISTS achievement_evidence;
DROP TABLE IF EXISTS achievements;
DROP TABLE IF EXISTS metric_type_accounts;
ALTER TABLE gps_target_metrics
  DROP COLUMN baseline_period_type, DROP COLUMN baseline_period_ref,
  DROP COLUMN target_period_type, DROP COLUMN target_period_ref,
  DROP COLUMN direction, DROP COLUMN calculation_method,
  DROP COLUMN maintain_tolerance_value, DROP COLUMN maintain_tolerance_unit,
  DROP COLUMN calculation_version;
```

> Only use the block above when **no production writes exist**. Otherwise use the file-restore path.

## 2. Backend failure before Angular deployment

| Situation | Rollback |
|---|---|
| A backend endpoint errors (missing dependency, fatal) | Re-upload the backed-up versions of the affected files. The new endpoints are additive; the previous frontend does not call them, so restoring files fully reverts behaviour. |
| Authentication/isolation failure | **HARD STOP.** Restore the backed-up `api/helpers/AuthGuard.php`, `api/models/User.php` (if touched), and the affected capability files. Do not proceed. |
| SQL/exception details leak to clients | Restore the affected error-responder files (`CalendarErrorResponder.php`, `SessionErrorResponder.php`). |

The backend is safe to revert by file restore because nothing in the new code mutates existing rows on
its own; it only serves the new tables.

## 3. Angular failure after backend success

| Situation | Rollback |
|---|---|
| New bundle breaks the app | Restore the previous `index.html` + `main-*.js` + `styles-*.css` + `chunk-*.js` from the Step 3 backup. The backend stays; old frontend ignores new endpoints. |
| One screen broken (e.g. Sessions) | Fastest safe fix: hide the Sessions tab/route in the deployed bundle, or restore the previous bundle. Prefer forward-fix over full revert. |
| Two `main-*` bundles served (stale cache) | Purge only the static app cache; confirm one `main-*.js` is referenced by `index.html`. |

## 4. Calendar failure after records exist

| Situation | Rollback |
|---|---|
| Date/time shifting | **HARD STOP.** Do not delete events. Restore the previous frontend bundle and/or the calendar backend files. Investigate the time-shape columns; the data itself is not corrupt (all-day is `DATE`, timed is UTC). |
| Cross-company leak | **HARD STOP.** Restore the calendar access-policy file; keep data. |
| Broken event create/edit | Restore the affected `capabilities/calendar/**` and `api/calendar/**` files. **Keep `calendar_events` data.** |

**Never** drop `calendar_events` / `calendar_event_links` once events exist - Sessions may reference them
(`fk_sessions_event`), and production users may have real appointments.

## 5. Sessions failure after records exist

| Situation | Rollback |
|---|---|
| Atomicity failure (Session without event / orphan event) | Do not drop tables. Restore the previous sessions capability files; report the orphan rows and reconcile manually. |
| Isolation failure | **HARD STOP.** Restore `SessionAccessPolicy`/repository files; keep data. |
| Broken lifecycle | Restore the affected command files. Cancel (with reason) any disposable Sessions; keep real ones. |

**Never** drop the session tables once Sessions exist. Cancelling is the lifecycle terminal; there is no
delete endpoint by design.

## 6. Results/Achievements failure after verified snapshots exist

| Situation | Rollback |
|---|---|
| Verification defect | Restore the affected model/endpoint files. **Do not touch existing verified records.** |
| Snapshot guard causing a regression | Restore application files. Do **not** drop `uq_evidence_metric_snapshot` while verified snapshots exist without explicit approval - the guard is a protection, not the cause of most issues. |
| Measurement calculation wrong | Restore `TargetMeasurementService.php` / `MetricTypeAccount.php`. Existing snapshots are historical and remain valid as captured. |

> **Immutable audit rule:** a verified `metric_snapshot` and the verified outcome are append-only history.
> A code downgrade does not delete them; a schema rollback would destroy them. Treat verified snapshots
> as irreversible.

## 7. Whole-package rollback (last resort)

Only with explicit human approval and a confirmed restorable backup:

1. Put the site in maintenance mode.
2. Restore the previous Angular bundle.
3. Restore the previous backend files.
4. If and only if **no production writes** exist in the new tables: run the pre-write drop block (section 1).
5. Otherwise: restore the `rbttaces_api-pre-007009-<date>.sql` backup **only after** confirming with the
   business that data written since the backup may be lost, or export the new-table data first.

---

## 8. Hard-stop conditions (repeat)

Stop and report immediately on: schema mismatch · authentication failure · company/tenant isolation
failure · missing dependency · unexpected migration row changes · generic 500 responses · SQL/exception
details exposed to clients · broken Results/Achievement flows · calendar timezone/date shifting ·
Session/calendar atomicity failure.

---

## 9. Google Calendar failure (Sprint 010)

Google is a **projection**, never the source of truth. Incubator OS commits a local
Calendar/Session change even when Google is down; a Google failure records a
visible, retryable state and never rolls back the local change. This shapes the
rollback:

| Situation | Rollback |
|---|---|
| Google migration fails mid-file | Migrations #22–#25 create **new** tables and add **columns to those same new tables** only. If a partial table exists it is empty: drop only the half-created new table, fix, re-run. **Do not** drop any pre-existing table. |
| A Google backend file errors | Restore the backed-up `capabilities/google-calendar/**`, `api/google-calendar/**` and `config/google.php` files. The endpoints are additive; the previous frontend does not call them, so restoring files fully reverts behaviour. |
| A token/etag/claim token leaks, or a non-owner can manage a mapping | **HARD STOP.** Restore the affected `Contracts/`/`Services/` files (`GoogleConnectionResponse`, `GoogleEventSyncResponse`, `SecretRedactor`, `GoogleAccessPolicy`). Keep data. |
| A hook edit breaks Calendar or Sessions | Restore the eight Layer-6 files from the Step 3 backup. The hook is optional and defaults to a no-op, so pre-Google behaviour returns exactly. **Keep Calendar/Session data.** |
| `503 GOOGLE_NOT_CONFIGURED` after deploy | Expected when `config/google.local.php` is absent/invalid. This is fail-closed, not a rollback trigger — supply valid credentials (or leave Google disabled). |
| Angular Google UI broken | Restore the previous frontend bundle. The Google endpoints remain but the old bundle does not call them. |
| `needs_reconnect` / the 7-day Testing token expiry | Routine in Testing mode: the operator reconnects. Not a rollback trigger. |

**Revoke before dropping.** If you must drop the Google tables (pre-write only,
or an approved restore), first **revoke the stored tokens upstream** (the operator's
Google Account → Security → Third-party access), then optionally delete the created
Google events.

### Pre-write drop (only when no publication exists)

```sql
DROP TABLE IF EXISTS `google_event_sync`;
DROP TABLE IF EXISTS `google_calendar_connections`;
```

> Dropping `google_calendar_connections` cascades to `google_event_sync` by FK. No
> pre-existing table is touched.

### Never

- **Never drop `google_event_sync` / `google_calendar_connections` once a user has
  published** without an explicit, approved data-restore decision — it destroys the
  audit mapping.
- **Never delete a Google event as a "rollback"** unless the operator deliberately
  wants the projection gone; the local Calendar/Session record is authoritative and
  must remain.
- **Never widen the OAuth scope or introduce a shared/multi-user Google connection
  as a fix.** That is a future tenant-owned feature with its own migration and
  authorization model (see `docs/google-calendar-api.md`).

### Hard-stop conditions specific to Sprint 010

Add to section 8: a token/ciphertext/client secret exposed in a response or log ·
`connection_id`/`etag`/claim token exposed to the browser · a non-owner able to
publish/sync/unpublish another organiser's mapping · Google events or invitations
created for the wrong company/Session.

Rollback source of truth is the Step 2/3 backups plus the previous commit
`747576e` (pre-010, post-009) in Git.
