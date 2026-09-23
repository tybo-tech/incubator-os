-- Google Calendar — Sprint 010 Phase 1
-- Date: 2026-09-24
-- Author: Sprint 010
--
-- Server-side Google Calendar OAuth connection + outbound event synchronization
-- foundation. This migration creates the STORAGE only; the OAuth flow, the Google
-- client and the sync services arrive in later phases.
--
-- WHY DEDICATED TABLES (and not columns on `calendar_events`)
--   `calendar_events` is FROZEN: it carries the `chk_cal_time_shape` CHECK and a
--   reviewed all-day/timed storage contract. Google is a PROJECTION of a local
--   event, so its sync metadata lives beside it rather than inside it. This keeps
--   the calendar domain free of OAuth concerns and lets a local event be edited
--   with no knowledge of Google.
--
-- STRUCTURES
--   1. `google_calendar_connections` — one encrypted OAuth connection per user.
--   2. `google_event_sync`           — the projection of one local calendar event
--                                      into one Google Calendar event.
--
-- SECURITY CONTRACT (enforced in code; the schema stores the parts)
--   * Tokens are encrypted with AES-256-GCM. The ciphertext, nonce, authentication
--     tag and key version are stored in SEPARATE columns — never concatenated, and
--     never in a plaintext column.
--   * Tokens are never returned to the browser and never logged.
--   * The encryption key is a separate 32-byte secret from the Google client
--     secret. `key_version` allows rotation without re-encrypting every row.
--
-- DOMAIN RULES
--   * One user has at most one connection: UNIQUE (user_id).
--   * One local calendar event has at most one Google projection: UNIQUE
--     (calendar_event_id).
--   * `status`: connected | needs_reconnect | revoked. A revoked/expired refresh
--     token moves the connection to `needs_reconnect`; no sync is attempted until
--     the user reconnects.
--   * `sync_status`: pending | synced | conflict | failed | detached.
--     `pending` = the Google conference is still being created; `conflict` = a
--     Google-side edit (etag mismatch) that must not overwrite local data;
--     `detached` = the Google event was removed/unpublished but the local event
--     remains.
--   * Local is the source of truth. Google is never read back into local data.
--
-- Safe to re-run: every table uses IF NOT EXISTS, and no existing table is
-- ALTERed. No guarded information_schema checks are needed.
--
-- Run locally:
--   Get-Content api-incubator-os/migrations/2026-09-24-google-calendar.sql -Raw | podman exec -i incubator-os-mysql-container mysql -u docker -pdocker incubator_os
-- Production (phpMyAdmin): import the same file, after 2026-09-23-sessions.sql.
--   Requires the operator to also create config/google.local.php on the server
--   (see config/google.local.example.php). No Google secret is part of this file.
--
-- ---------------------------------------------------------------------------
-- ROLLBACK (manual, reverse order). Only drops what this migration created:
--
--   DROP TABLE IF EXISTS `google_event_sync`;
--   DROP TABLE IF EXISTS `google_calendar_connections`;
--
-- Before dropping, revoke stored tokens upstream and optionally delete the
-- Google events referenced by `google_event_sync.google_event_id`.
-- ---------------------------------------------------------------------------

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;

-- --------------------------------------------------------
-- 1. google_calendar_connections
-- --------------------------------------------------------
-- One row per connected user. `scope` records what was actually granted so a
-- scope change can be detected. `token_expires_at` drives transparent refresh.
-- `last_error` is a short, secret-free diagnostic (never a token or raw body).

CREATE TABLE IF NOT EXISTS `google_calendar_connections` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `tenant_id` INT NOT NULL DEFAULT 1 COMMENT 'Tenant scope; always server-derived, never client-supplied',
  `user_id` INT NOT NULL COMMENT 'FK -> users.id; one connection per user',
  `google_account_email` VARCHAR(255) DEFAULT NULL COMMENT 'Connected Google account address (display only)',
  `google_calendar_id` VARCHAR(255) NOT NULL DEFAULT 'primary' COMMENT 'Target calendar, normally "primary"',
  `access_token_cipher` TEXT DEFAULT NULL COMMENT 'AES-256-GCM ciphertext (base64); never plaintext',
  `access_token_nonce` VARCHAR(64) DEFAULT NULL COMMENT 'Base64 12-byte GCM nonce; unique per encryption',
  `access_token_tag` VARCHAR(64) DEFAULT NULL COMMENT 'Base64 16-byte GCM authentication tag',
  `refresh_token_cipher` TEXT DEFAULT NULL COMMENT 'AES-256-GCM ciphertext (base64); never plaintext',
  `refresh_token_nonce` VARCHAR(64) DEFAULT NULL COMMENT 'Base64 12-byte GCM nonce; unique per encryption',
  `refresh_token_tag` VARCHAR(64) DEFAULT NULL COMMENT 'Base64 16-byte GCM authentication tag',
  `key_version` INT NOT NULL DEFAULT 1 COMMENT 'Encryption key version used for these tokens (rotation)',
  `token_expires_at` DATETIME DEFAULT NULL COMMENT 'Access-token expiry (UTC); drives transparent refresh',
  `scope` VARCHAR(512) DEFAULT NULL COMMENT 'Granted OAuth scopes, space-delimited',
  `status` ENUM('connected','needs_reconnect','revoked') NOT NULL DEFAULT 'connected',
  `last_error` VARCHAR(255) DEFAULT NULL COMMENT 'Secret-free diagnostic only; never a token or raw body',
  `last_refreshed_at` DATETIME DEFAULT NULL COMMENT 'Last successful access-token refresh (UTC)',
  `connected_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `revoked_at` DATETIME DEFAULT NULL,
  `version` INT NOT NULL DEFAULT 1 COMMENT 'Optimistic concurrency',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_gconn_user` (`user_id`),
  KEY `idx_gconn_tenant` (`tenant_id`),
  KEY `idx_gconn_status` (`status`),
  KEY `idx_gconn_expiry` (`token_expires_at`),
  CONSTRAINT `fk_gconn_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------
-- 2. google_event_sync
-- --------------------------------------------------------
-- The projection of one local calendar event into Google. `meet_request_id` is a
-- stable UUID sent to Google as `conferenceData.createRequest.requestId`, so a
-- retried publish never creates a second conference. `etag` is Google's
-- concurrency token used with `If-Match` on the way out.

CREATE TABLE IF NOT EXISTS `google_event_sync` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `tenant_id` INT NOT NULL DEFAULT 1 COMMENT 'Tenant scope; always server-derived, never client-supplied',
  `calendar_event_id` BIGINT NOT NULL COMMENT 'FK -> calendar_events.id; the local source of truth',
  `connection_id` BIGINT NOT NULL COMMENT 'FK -> google_calendar_connections.id; publisher''s connection',
  `google_calendar_id` VARCHAR(255) NOT NULL DEFAULT 'primary' COMMENT 'Calendar the Google event lives in',
  `google_event_id` VARCHAR(1024) DEFAULT NULL COMMENT 'Google Calendar event id; NULL until first publish',
  `google_event_url` VARCHAR(1024) DEFAULT NULL COMMENT 'Google event htmlLink (display only)',
  `meet_url` VARCHAR(1024) DEFAULT NULL COMMENT 'Google Meet join URL when a conference was created',
  `meet_conference_id` VARCHAR(255) DEFAULT NULL COMMENT 'Google conference id',
  `meet_request_id` VARCHAR(64) DEFAULT NULL COMMENT 'Stable UUID for conferenceData.createRequest.requestId',
  `etag` VARCHAR(255) DEFAULT NULL COMMENT 'Google event etag; used for If-Match optimistic concurrency',
  `sync_status` ENUM('pending','synced','conflict','failed','detached') NOT NULL DEFAULT 'pending',
  `last_error` VARCHAR(255) DEFAULT NULL COMMENT 'Secret-free diagnostic only; never a token or raw body',
  `last_synced_at` DATETIME DEFAULT NULL COMMENT 'Last successful Google write (UTC)',
  `version` INT NOT NULL DEFAULT 1 COMMENT 'Optimistic concurrency',
  `created_by` INT NOT NULL COMMENT 'FK -> users.id; who first published',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_gsync_event` (`calendar_event_id`),
  KEY `idx_gsync_connection` (`connection_id`),
  KEY `idx_gsync_status` (`sync_status`),
  KEY `idx_gsync_tenant` (`tenant_id`),
  KEY `idx_gsync_google_event` (`google_event_id`(191)),
  CONSTRAINT `fk_gsync_event` FOREIGN KEY (`calendar_event_id`) REFERENCES `calendar_events` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_gsync_connection` FOREIGN KEY (`connection_id`) REFERENCES `google_calendar_connections` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS=1;
