-- Google Calendar — Sprint 010 Phase 3
-- Date: 2026-09-24
-- Author: Sprint 010
--
-- Publish support for `google_event_sync`. This migration adds the storage the
-- outbound create path needs and nothing else.
--
-- WHAT THIS MIGRATION ADDS
--   1. `google_event_sync.conference_status` — Google's ASYNCHRONOUS conference
--      state, tracked separately from `sync_status`:
--        * `none`    — no conference was requested (a non-meeting event).
--        * `pending` — Google accepted the createRequest but the Meet link is
--                      not ready yet. Publishing is NOT "fully successful" while
--                      a conference is pending.
--        * `success` — the Meet conference exists (meet_url populated).
--        * `failure` — the calendar event exists but the conference failed.
--      `sync_status` describes the EVENT projection; `conference_status` describes
--      the Meet link. They are genuinely independent.
--   2. `google_event_sync.publish_claimed_at` + `publish_claim_token` — a SHORT
--      local lease so one event cannot be published twice concurrently. A claim
--      is acquired in a tiny transaction, the Google network call happens with NO
--      transaction held, and the result is written in a second tiny transaction
--      guarded by the claim token. A claim older than the TTL may be taken over,
--      so a crashed publish self-heals instead of wedging the row.
--
-- WHY A DETERMINISTIC GOOGLE EVENT ID (no schema column)
--   The publish service derives the Google event id deterministically from
--   (tenant, calendar_event_id). Re-inserting the same id makes Google answer
--   409 instead of creating a duplicate, so a "Google succeeded but the local
--   write failed" retry can recover the existing event. The id is recomputed, so
--   it needs no column. `meet_request_id` (Phase 1) is the equivalent stable key
--   for the conference.
--
-- Safe to re-run: guarded information_schema checks + an idempotent index create.
-- No existing column is dropped, retyped, or reordered; no row is touched.
--
-- Run locally:
--   Get-Content api-incubator-os/migrations/2026-09-24-google-calendar-phase3.sql -Raw | podman exec -i incubator-os-mysql-container mysql -u docker -pdocker incubator_os
-- Production (phpMyAdmin): import after 2026-09-24-google-calendar-phase2.sql.
--
-- ---------------------------------------------------------------------------
-- ROLLBACK (manual, reverse order):
--
--   DROP INDEX `idx_gsync_claim` ON `google_event_sync`;
--   ALTER TABLE `google_event_sync` DROP COLUMN `publish_claim_token`;
--   ALTER TABLE `google_event_sync` DROP COLUMN `publish_claimed_at`;
--   ALTER TABLE `google_event_sync` DROP COLUMN `conference_status`;
-- ---------------------------------------------------------------------------

SET NAMES utf8mb4;

-- --------------------------------------------------------
-- 1. conference_status
-- --------------------------------------------------------

SET @has_conf := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'google_event_sync'
    AND COLUMN_NAME = 'conference_status'
);
SET @sql := IF(@has_conf = 0,
  'ALTER TABLE `google_event_sync` ADD COLUMN `conference_status` ENUM(''none'',''pending'',''success'',''failure'') NOT NULL DEFAULT ''none'' COMMENT ''Async Meet conference state; independent of sync_status'' AFTER `meet_request_id`',
  'SELECT ''conference_status already exists'' AS note');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- --------------------------------------------------------
-- 2. publish lease (concurrency guard)
-- --------------------------------------------------------

SET @has_claim := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'google_event_sync'
    AND COLUMN_NAME = 'publish_claim_token'
);
SET @sql := IF(@has_claim = 0,
  'ALTER TABLE `google_event_sync` ADD COLUMN `publish_claim_token` CHAR(32) DEFAULT NULL COMMENT ''Per-attempt lease token; scopes the completion write'' AFTER `last_synced_at`',
  'SELECT ''publish_claim_token already exists'' AS note');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @has_claimed := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'google_event_sync'
    AND COLUMN_NAME = 'publish_claimed_at'
);
SET @sql := IF(@has_claimed = 0,
  'ALTER TABLE `google_event_sync` ADD COLUMN `publish_claimed_at` DATETIME DEFAULT NULL COMMENT ''When the lease was taken (UTC); stale leases may be taken over'' AFTER `publish_claim_token`',
  'SELECT ''publish_claimed_at already exists'' AS note');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- --------------------------------------------------------
-- 3. lease lookup index
-- --------------------------------------------------------

SET @has_claim_idx := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'google_event_sync'
    AND INDEX_NAME = 'idx_gsync_claim'
);
SET @sql := IF(@has_claim_idx = 0,
  'ALTER TABLE `google_event_sync` ADD INDEX `idx_gsync_claim` (`publish_claimed_at`)',
  'SELECT ''idx_gsync_claim already exists'' AS note');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
