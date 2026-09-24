-- Google Calendar — Sprint 010 Phase 4
-- Date: 2026-09-24
-- Author: Sprint 010
--
-- Reschedule, cancellation cascade, conflict protection and unpublish support for
-- `google_event_sync`. Storage only; no data is modified.
--
-- WHAT THIS MIGRATION ADDS
--   1. `sync_status` gains two values:
--        * `update_pending` — a local change (reschedule or cancel) is waiting to
--                             be pushed to Google. Retryable; the local change is
--                             already committed. Used for transient failures.
--        * `unpublished`    — the Google copy was removed on purpose and the
--                             mapping is retained for audit. The local event and
--                             Session are untouched.
--   2. `generation` — the publication generation. The deterministic Google event
--      id embeds the generation, so a republish after an unpublish NEVER reuses a
--      Google event id that Google may have permanently tombstoned. A new
--      generation also receives a new conference request id.
--   3. `synced_event_version` — the local `calendar_events.version` the current
--      Google projection reflects. Makes reschedule idempotent (a repeat with the
--      same version is a no-op and sends no email) and lets a stale worker detect
--      that the local event moved on before it records completion.
--   4. `remote_etag` — the CURRENT remote etag observed, kept alongside the last
--      known `etag`. Conflict protection stores the two etags, NOT a snapshot of
--      the external event, so no attendee or description data is copied.
--   5. `conflict_at` — when an etag conflict was recorded, so the UI can say
--      "Google event changed externally" without exposing provider internals.
--   6. `unpublished_at` + `remote_outcome` — the unpublish timestamp and the
--      secret-free remote result (`deleted`, `already_absent`, `failed`).
--   7. `last_google_event_id` — the previous Google event id, retained for audit
--      after an unpublish clears the active id.
--
-- Safe to re-run: information_schema-guarded ADD COLUMN and enum MODIFY. No
-- column is dropped or reordered; no row is touched.
--
-- Run locally:
--   Get-Content api-incubator-os/migrations/2026-09-24-google-calendar-phase4.sql -Raw | podman exec -i incubator-os-mysql-container mysql -u docker -pdocker incubator_os
-- Production (phpMyAdmin): import after 2026-09-24-google-calendar-phase3.sql.
--
-- ---------------------------------------------------------------------------
-- ROLLBACK (manual, reverse order):
--
--   ALTER TABLE `google_event_sync` DROP COLUMN `last_google_event_id`;
--   ALTER TABLE `google_event_sync` DROP COLUMN `remote_outcome`;
--   ALTER TABLE `google_event_sync` DROP COLUMN `unpublished_at`;
--   ALTER TABLE `google_event_sync` DROP COLUMN `conflict_at`;
--   ALTER TABLE `google_event_sync` DROP COLUMN `remote_etag`;
--   ALTER TABLE `google_event_sync` DROP COLUMN `synced_event_version`;
--   ALTER TABLE `google_event_sync` DROP COLUMN `generation`;
--   -- Restore the original enum ONLY after removing rows using the new values:
--   DELETE FROM `google_event_sync` WHERE `sync_status` IN ('update_pending','unpublished');
--   ALTER TABLE `google_event_sync`
--     MODIFY COLUMN `sync_status` ENUM('pending','synced','conflict','failed','detached')
--     NOT NULL DEFAULT 'pending';
-- ---------------------------------------------------------------------------

SET NAMES utf8mb4;

-- --------------------------------------------------------
-- 1. sync_status — add update_pending + unpublished
-- --------------------------------------------------------

SET @has_update_pending := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'google_event_sync'
    AND COLUMN_NAME = 'sync_status'
    AND COLUMN_TYPE LIKE '%update_pending%'
);
SET @sql := IF(@has_update_pending = 0,
  'ALTER TABLE `google_event_sync` MODIFY COLUMN `sync_status` ENUM(''pending'',''synced'',''conflict'',''failed'',''detached'',''update_pending'',''unpublished'') NOT NULL DEFAULT ''pending''',
  'SELECT ''sync_status already includes update_pending/unpublished'' AS note');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- --------------------------------------------------------
-- 2..7. new columns
-- --------------------------------------------------------

SET @has_gen := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'google_event_sync' AND COLUMN_NAME = 'generation'
);
SET @sql := IF(@has_gen = 0,
  'ALTER TABLE `google_event_sync` ADD COLUMN `generation` INT NOT NULL DEFAULT 1 COMMENT ''Publication generation; embedded in the deterministic Google event id so a republish never reuses a tombstoned id'' AFTER `meet_request_id`',
  'SELECT ''generation already exists'' AS note');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @has_sev := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'google_event_sync' AND COLUMN_NAME = 'synced_event_version'
);
SET @sql := IF(@has_sev = 0,
  'ALTER TABLE `google_event_sync` ADD COLUMN `synced_event_version` INT DEFAULT NULL COMMENT ''Local calendar_events.version the Google projection reflects; drives idempotent reschedule'' AFTER `etag`',
  'SELECT ''synced_event_version already exists'' AS note');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @has_retag := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'google_event_sync' AND COLUMN_NAME = 'remote_etag'
);
SET @sql := IF(@has_retag = 0,
  'ALTER TABLE `google_event_sync` ADD COLUMN `remote_etag` VARCHAR(255) DEFAULT NULL COMMENT ''Current remote etag observed after a conflict; NOT a snapshot of the external event'' AFTER `synced_event_version`',
  'SELECT ''remote_etag already exists'' AS note');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @has_conflict_at := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'google_event_sync' AND COLUMN_NAME = 'conflict_at'
);
SET @sql := IF(@has_conflict_at = 0,
  'ALTER TABLE `google_event_sync` ADD COLUMN `conflict_at` DATETIME DEFAULT NULL COMMENT ''When an etag conflict was recorded (UTC); display-only'' AFTER `remote_etag`',
  'SELECT ''conflict_at already exists'' AS note');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @has_unpub_at := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'google_event_sync' AND COLUMN_NAME = 'unpublished_at'
);
SET @sql := IF(@has_unpub_at = 0,
  'ALTER TABLE `google_event_sync` ADD COLUMN `unpublished_at` DATETIME DEFAULT NULL COMMENT ''When the Google copy was removed on purpose (UTC)'' AFTER `conflict_at`',
  'SELECT ''unpublished_at already exists'' AS note');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @has_outcome := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'google_event_sync' AND COLUMN_NAME = 'remote_outcome'
);
SET @sql := IF(@has_outcome = 0,
  'ALTER TABLE `google_event_sync` ADD COLUMN `remote_outcome` VARCHAR(64) DEFAULT NULL COMMENT ''Secret-free result of the last remote delete: deleted/already_absent/failed'' AFTER `unpublished_at`',
  'SELECT ''remote_outcome already exists'' AS note');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @has_last_geid := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'google_event_sync' AND COLUMN_NAME = 'last_google_event_id'
);
SET @sql := IF(@has_last_geid = 0,
  'ALTER TABLE `google_event_sync` ADD COLUMN `last_google_event_id` VARCHAR(1024) DEFAULT NULL COMMENT ''Previous Google event id, retained for audit after an unpublish clears the active id'' AFTER `remote_outcome`',
  'SELECT ''last_google_event_id already exists'' AS note');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
