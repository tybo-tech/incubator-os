-- Google Calendar — Sprint 010 Phase 2
-- Date: 2026-09-24
-- Author: Sprint 010
--
-- OAuth lifecycle support for the Google Calendar connection.
--
-- WHAT THIS MIGRATION ADDS
--   1. `google_calendar_connections.status` gains two values:
--        * `disconnected`     — kept for audit identity (a connection may not be
--                               hard-deleted while google_event_sync rows exist).
--        * `account_mismatch` — a reconnect used a DIFFERENT Google account while
--                               published mappings exist; reconciliation required.
--   2. `google_calendar_connections.pending_account_email` — the newly presented
--      Google account during an account-mismatch, so reconciliation can be
--      explicit. The existing account and tokens are left untouched.
--   3. `google_oauth_states` — short-lived, single-use OAuth `state` records.
--
-- WHY A STATE TABLE (amends the Sprint 010 brief)
--   The brief originally described a stateless HMAC-signed `state`. A stateless
--   signature cannot enforce ONE-TIME CONSUMPTION: any captured state remains
--   valid until it expires, however many times it is replayed. The locked Phase 2
--   boundary requires state to be random, short-lived, SINGLE-USE and bound to the
--   authenticated tenant/user, so the state is now an opaque 256-bit random value
--   stored server-side and consumed atomically. Integrity comes from
--   unguessability plus server-side lookup, not from a signature.
--
-- Safe to re-run: guarded information_schema checks for the enum and column; the
-- new table uses IF NOT EXISTS. No existing table is dropped or rebuilt.
--
-- Run locally:
--   Get-Content api-incubator-os/migrations/2026-09-24-google-calendar-phase2.sql -Raw | podman exec -i incubator-os-mysql-container mysql -u docker -pdocker incubator_os
-- Production (phpMyAdmin): import after 2026-09-24-google-calendar.sql.
--
-- ---------------------------------------------------------------------------
-- ROLLBACK (manual, reverse order):
--
--   DROP TABLE IF EXISTS `google_oauth_states`;
--   -- Restore the original enum ONLY after removing any rows using the new values:
--   DELETE FROM `google_calendar_connections`
--     WHERE `status` IN ('disconnected','account_mismatch');
--   ALTER TABLE `google_calendar_connections` DROP COLUMN `pending_account_email`;
--   ALTER TABLE `google_calendar_connections`
--     MODIFY COLUMN `status` ENUM('connected','needs_reconnect','revoked')
--     NOT NULL DEFAULT 'connected';
-- ---------------------------------------------------------------------------

SET NAMES utf8mb4;

-- --------------------------------------------------------
-- 1. connections.status — add disconnected + account_mismatch
-- --------------------------------------------------------
-- Guarded: only redefines the enum when the new values are absent.

SET @has_disconnected := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'google_calendar_connections'
    AND COLUMN_NAME = 'status'
    AND COLUMN_TYPE LIKE '%disconnected%'
);
SET @sql := IF(@has_disconnected = 0,
  'ALTER TABLE `google_calendar_connections` MODIFY COLUMN `status` ENUM(''connected'',''needs_reconnect'',''revoked'',''disconnected'',''account_mismatch'') NOT NULL DEFAULT ''connected''',
  'SELECT ''status enum already includes disconnected/account_mismatch'' AS note');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- --------------------------------------------------------
-- 2. connections.pending_account_email
-- --------------------------------------------------------

SET @has_pending := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'google_calendar_connections'
    AND COLUMN_NAME = 'pending_account_email'
);
SET @sql := IF(@has_pending = 0,
  'ALTER TABLE `google_calendar_connections` ADD COLUMN `pending_account_email` VARCHAR(255) DEFAULT NULL COMMENT ''Google account presented during an account-mismatch; tokens untouched until reconciled'' AFTER `google_account_email`',
  'SELECT ''pending_account_email already exists'' AS note');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- --------------------------------------------------------
-- 3. google_oauth_states
-- --------------------------------------------------------
-- Opaque 256-bit random `state`, bound to the authenticated tenant/user and a
-- validated internal return path. `consumed_at` makes consumption single-use via
-- an atomic UPDATE. Rows are short-lived; expired rows are cleaned opportunistically.

CREATE TABLE IF NOT EXISTS `google_oauth_states` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `state_hash` CHAR(64) NOT NULL COMMENT 'SHA-256 hex of the opaque state; the raw value is never stored',
  `tenant_id` INT NOT NULL DEFAULT 1 COMMENT 'Server-derived tenant binding',
  `user_id` INT NOT NULL COMMENT 'FK -> users.id; the session user that began the flow',
  `return_path` VARCHAR(512) NOT NULL DEFAULT '/' COMMENT 'Validated internal path to send the browser back to',
  `expires_at` DATETIME NOT NULL COMMENT 'Short-lived (UTC); a state past this is rejected',
  `consumed_at` DATETIME DEFAULT NULL COMMENT 'Set atomically on first use; makes the state single-use',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_gstate_hash` (`state_hash`),
  KEY `idx_gstate_user` (`user_id`),
  KEY `idx_gstate_expiry` (`expires_at`),
  CONSTRAINT `fk_gstate_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
