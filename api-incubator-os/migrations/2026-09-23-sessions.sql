-- Sessions — Sprint 009 Phase 2
-- Date: 2026-09-23
-- Author: Sprint 009
--
-- First-class company Sessions integrated with the Sprint 008 calendar.
--
-- A calendar event answers "When is something happening?". A Session answers why
-- we are meeting, what should be reviewed, what was discussed and decided, which
-- business records were involved, and what execution work came out of it.
--
-- Incubator OS stays the operational source of truth; the calendar stays the
-- scheduling layer. A Session REFERENCES existing domains — it never copies them.
--
-- STRUCTURES
--   1. `sessions`               — the workspace; at most one company calendar event.
--   2. `session_participants`   — internal user OR external attendee snapshot.
--   3. `session_agenda_items`   — ordered topics.
--   4. `session_notes`          — structured notes with a controlled visibility.
--   5. `session_decisions`      — recorded decisions (NOT achievements).
--   6. `session_entity_links`   — canonical links to existing business records.
--   7. `session_activities`     — append-only structured timeline.
--
-- DOMAIN RULES (enforced in the service layer; schema enforces the invariants it can)
--   * A Session belongs to exactly one company (`company_id NOT NULL`). There is
--     no system-wide Session.
--   * `calendar_event_id` is NULLABLE + UNIQUE: one calendar event -> at most one
--     Session, and a Session -> at most one calendar event.
--   * Only a company event in the `meeting` category may be linked. System-wide,
--     non-meeting, deleted, inaccessible or already-linked events are rejected.
--   * Session company must equal the calendar event company.
--   * RESCHEDULING HAPPENS THROUGH THE CALENDAR EVENT: Sessions store no schedule
--     columns. Every Session view reads the linked event's schedule.
--   * Deleting a calendar event linked to a Session returns 409 SESSION_LINKED.
--   * Cancelling a Session cancels its linked calendar event.
--   * Completing a meeting task does not complete a Target.
--   * A decision is not an Achievement (own table; achievements stay immutable
--     once verified).
--
-- LIFECYCLE
--   PREPARING -> IN_PROGRESS -> COMPLETED
--   PREPARING -> CANCELLED
--   IN_PROGRESS -> CANCELLED (reason required)
--   COMPLETED / CANCELLED are terminal. Completed Sessions are frozen (read-only).
--   Reopening is deliberately not supported (no auditable mechanism exists yet).
--
-- WHY A DEDICATED ACTIVITY TABLE
--   `recent_activities` is a flat dashboard feed: no index, no structured
--   payload, no immutability guarantees, and `reference_id` is INT while Session
--   ids are BIGINT. It cannot accurately represent a Session timeline, so this
--   migration adds the append-only `session_activities`. The dashboard feed is
--   still written (module = 'sessions') for continuity.
--
-- SOFT DELETE
--   `deleted_at` / `deleted_by` are included for parity with `calendar_events`
--   (the same capability family). No delete endpoint is exposed this sprint:
--   CANCELLED is the lifecycle terminal. The columns are reserved.
--
-- Safe to re-run: every table uses IF NOT EXISTS. No ALTERs, so no guarded
-- information_schema checks are needed.
--
-- Run locally:
--   Get-Content api-incubator-os/migrations/2026-09-23-sessions.sql -Raw | podman exec -i incubator-os-mysql-container mysql -u docker -pdocker incubator_os
-- Production (phpMyAdmin): import the same file, after 2026-09-19-calendar-events.sql.
--
-- ---------------------------------------------------------------------------
-- ROLLBACK (manual, reverse order). Only drops what this migration created:
--
--   DROP TABLE IF EXISTS `session_activities`;
--   DROP TABLE IF EXISTS `session_entity_links`;
--   DROP TABLE IF EXISTS `session_decisions`;
--   DROP TABLE IF EXISTS `session_notes`;
--   DROP TABLE IF EXISTS `session_agenda_items`;
--   DROP TABLE IF EXISTS `session_participants`;
--   DROP TABLE IF EXISTS `sessions`;
-- ---------------------------------------------------------------------------

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;

-- --------------------------------------------------------
-- 1. sessions
-- --------------------------------------------------------
-- `status` is the uppercase lifecycle named in the sprint brief. Schedule data
-- lives on the linked calendar event (rule: rescheduling via the calendar).
-- `version` is optimistic concurrency, mirroring `calendar_events`.

CREATE TABLE IF NOT EXISTS `sessions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `tenant_id` INT NOT NULL DEFAULT 1 COMMENT 'Tenant scope; always server-derived, never client-supplied',
  `company_id` INT NOT NULL COMMENT 'FK -> companies.id; a Session always belongs to exactly one company',
  `calendar_event_id` BIGINT DEFAULT NULL COMMENT 'FK -> calendar_events.id; NULL = no event linked yet (UNIQUE: one event -> one Session)',
  `session_type` ENUM('coaching','progress_review','financial_review','assessment','workshop','other') NOT NULL DEFAULT 'other',
  `subject` VARCHAR(255) NOT NULL COMMENT 'Why we are meeting (short)',
  `purpose` TEXT DEFAULT NULL COMMENT 'Preparation: objective of the Session',
  `status` ENUM('PREPARING','IN_PROGRESS','COMPLETED','CANCELLED') NOT NULL DEFAULT 'PREPARING',
  `preparation_summary` TEXT DEFAULT NULL COMMENT 'Preparation: what should be reviewed',
  `closing_summary` TEXT DEFAULT NULL COMMENT 'Closing: what came out of the Session',
  `cancellation_reason` TEXT DEFAULT NULL COMMENT 'Required when a Session is cancelled',
  `facilitator_user_id` INT DEFAULT NULL COMMENT 'FK -> users.id; server-derived validation',
  `facilitator_label` VARCHAR(255) DEFAULT NULL COMMENT 'Free-text facilitator (mirrors owner_label convention)',
  `version` INT NOT NULL DEFAULT 1 COMMENT 'Optimistic concurrency; incremented on every successful update',
  `started_at` DATETIME DEFAULT NULL COMMENT 'When the Session moved to IN_PROGRESS (UTC)',
  `completed_at` DATETIME DEFAULT NULL COMMENT 'When the Session moved to COMPLETED (UTC)',
  `cancelled_at` DATETIME DEFAULT NULL COMMENT 'When the Session moved to CANCELLED (UTC)',
  `cancelled_by` INT DEFAULT NULL COMMENT 'FK -> users.id; server-derived',
  `created_by` INT NOT NULL COMMENT 'FK -> users.id; always server-derived from session',
  `updated_by` INT DEFAULT NULL COMMENT 'FK -> users.id; always server-derived from session',
  `deleted_at` DATETIME DEFAULT NULL COMMENT 'Reserved soft-delete (CANCELLED is the lifecycle terminal this sprint)',
  `deleted_by` INT DEFAULT NULL COMMENT 'FK -> users.id; reserved',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sessions_calendar_event` (`calendar_event_id`),
  KEY `idx_sessions_company_status` (`company_id`, `status`),
  KEY `idx_sessions_company_created` (`company_id`, `created_at`),
  KEY `idx_sessions_tenant_company` (`tenant_id`, `company_id`),
  KEY `idx_sessions_facilitator` (`facilitator_user_id`),
  KEY `idx_sessions_status` (`status`),
  KEY `idx_sessions_deleted` (`deleted_at`),
  CONSTRAINT `fk_sessions_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_sessions_event` FOREIGN KEY (`calendar_event_id`) REFERENCES `calendar_events` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------
-- 2. session_participants
-- --------------------------------------------------------
-- An internal participant references a user; an external attendee is a snapshot
-- (name/email) and does NOT need an Incubator OS account.
-- `dedupe_key` is a generated, deterministic key so the same attendee cannot be
-- added twice: internal by user id, external by lowercased email (fallback name).

CREATE TABLE IF NOT EXISTS `session_participants` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `session_id` BIGINT NOT NULL COMMENT 'FK -> sessions.id',
  `participant_type` ENUM('internal','external') NOT NULL DEFAULT 'external',
  `user_id` INT DEFAULT NULL COMMENT 'FK -> users.id; set for internal participants',
  `name` VARCHAR(255) NOT NULL COMMENT 'Snapshot of the attendee name',
  `email` VARCHAR(255) DEFAULT NULL COMMENT 'Snapshot of the attendee email',
  `role` VARCHAR(64) DEFAULT NULL COMMENT 'Participant role, e.g. facilitator / director / observer',
  `attendance` ENUM('invited','attended','absent','apology') NOT NULL DEFAULT 'invited',
  `dedupe_key` VARCHAR(320) GENERATED ALWAYS AS (
      CASE WHEN `user_id` IS NOT NULL
           THEN CONCAT('u:', `user_id`)
           ELSE CONCAT('e:', LOWER(COALESCE(NULLIF(`email`, ''), `name`)))
      END
  ) STORED COMMENT 'NULL-safe deterministic identity for the unique key',
  `created_by` INT DEFAULT NULL COMMENT 'FK -> users.id; server-derived',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_session_participant` (`session_id`, `dedupe_key`),
  KEY `idx_participants_session` (`session_id`),
  KEY `idx_participants_user` (`user_id`),
  CONSTRAINT `fk_participants_session` FOREIGN KEY (`session_id`) REFERENCES `sessions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------
-- 3. session_agenda_items
-- --------------------------------------------------------
-- Ordered topics. `sort_order` is authoritative; the API reorders by renumbering.
-- `status` tracks whether the topic was covered during the Session.

CREATE TABLE IF NOT EXISTS `session_agenda_items` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `session_id` BIGINT NOT NULL COMMENT 'FK -> sessions.id',
  `sort_order` SMALLINT NOT NULL DEFAULT 0,
  `topic` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `status` ENUM('pending','covered','deferred') NOT NULL DEFAULT 'pending',
  `presenter_user_id` INT DEFAULT NULL COMMENT 'FK -> users.id; optional owner/presenter',
  `presenter_label` VARCHAR(255) DEFAULT NULL COMMENT 'Free-text presenter (mirrors owner_label convention)',
  `created_by` INT DEFAULT NULL COMMENT 'FK -> users.id; server-derived',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_agenda_session_order` (`session_id`, `sort_order`),
  CONSTRAINT `fk_agenda_session` FOREIGN KEY (`session_id`) REFERENCES `sessions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------
-- 4. session_notes
-- --------------------------------------------------------
-- CONTROLLED VISIBILITY:
--   shared     -> visible to company users with company access
--   incubator  -> visible ONLY to Incubator team (admin roles); never a company user
-- `version` protects edits (optimistic concurrency per note).

CREATE TABLE IF NOT EXISTS `session_notes` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `session_id` BIGINT NOT NULL COMMENT 'FK -> sessions.id',
  `visibility` ENUM('shared','incubator') NOT NULL DEFAULT 'shared',
  `content` TEXT NOT NULL,
  `author_user_id` INT DEFAULT NULL COMMENT 'FK -> users.id; server-derived',
  `author_label` VARCHAR(255) DEFAULT NULL COMMENT 'Snapshot of the author name',
  `version` INT NOT NULL DEFAULT 1 COMMENT 'Optimistic concurrency for note edits',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notes_session_visibility` (`session_id`, `visibility`, `created_at`),
  CONSTRAINT `fk_notes_session` FOREIGN KEY (`session_id`) REFERENCES `sessions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------
-- 5. session_decisions
-- --------------------------------------------------------
-- A decision is an event, not an Achievement: it lives here and is never counted
-- as or converted into an achievement.

CREATE TABLE IF NOT EXISTS `session_decisions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `session_id` BIGINT NOT NULL COMMENT 'FK -> sessions.id',
  `decision_text` TEXT NOT NULL,
  `decision_date` DATE NOT NULL COMMENT 'When the decision applies / was taken',
  `rationale` TEXT DEFAULT NULL,
  `recorded_by` INT DEFAULT NULL COMMENT 'FK -> users.id; server-derived',
  `recorded_by_label` VARCHAR(255) DEFAULT NULL COMMENT 'Snapshot of the recorder name',
  `version` INT NOT NULL DEFAULT 1 COMMENT 'Optimistic concurrency for decision edits',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_decisions_session_date` (`session_id`, `decision_date`),
  CONSTRAINT `fk_decisions_session` FOREIGN KEY (`session_id`) REFERENCES `sessions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------
-- 6. session_entity_links
-- --------------------------------------------------------
-- Controlled link to an existing business record. Entity types are the canonical
-- repository names already used by `calendar_event_links` (NOT frontend labels),
-- so the resolver is shared. The linked record must exist, belong to the Session
-- company, belong to the tenant, and be reachable by the actor.
-- UNIQUE prevents an identical link (same entity + same relationship) twice;
-- the same entity may be linked under different relationships.

CREATE TABLE IF NOT EXISTS `session_entity_links` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `session_id` BIGINT NOT NULL COMMENT 'FK -> sessions.id',
  `entity_type` ENUM('gps_target','swot_item','gps_target_task','financial_indicator','achievement','achievement_evidence') NOT NULL,
  `entity_id` BIGINT NOT NULL,
  `relationship` ENUM('AGENDA','DISCUSSED','CREATED','UPDATED','REVIEWED','EVIDENCE') NOT NULL DEFAULT 'DISCUSSED',
  `label` VARCHAR(255) DEFAULT NULL COMMENT 'Human label captured at link time',
  `created_by` INT DEFAULT NULL COMMENT 'FK -> users.id; server-derived',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_session_link` (`session_id`, `entity_type`, `entity_id`, `relationship`),
  KEY `idx_session_link_entity` (`entity_type`, `entity_id`),
  KEY `idx_session_link_session` (`session_id`),
  CONSTRAINT `fk_session_link_session` FOREIGN KEY (`session_id`) REFERENCES `sessions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------
-- 7. session_activities — append-only timeline
-- --------------------------------------------------------
-- Written on every meaningful change (create, convert, prepare, start, complete,
-- cancel, agenda/note/decision/link/attendance). Never updated, never deleted.
-- `company_id` is denormalised so a company timeline is a single indexed scan.

CREATE TABLE IF NOT EXISTS `session_activities` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `session_id` BIGINT NOT NULL COMMENT 'FK -> sessions.id',
  `company_id` INT NOT NULL COMMENT 'Denormalised -> companies.id for company timelines',
  `actor_user_id` INT DEFAULT NULL COMMENT 'FK -> users.id; server-derived',
  `actor_label` VARCHAR(255) DEFAULT NULL COMMENT 'Snapshot of the actor name',
  `action` VARCHAR(64) NOT NULL COMMENT 'e.g. created, converted, started, completed, cancelled, agenda.added',
  `detail` VARCHAR(512) DEFAULT NULL COMMENT 'Short human-safe description',
  `payload` JSON DEFAULT NULL COMMENT 'Structured change payload (never a secret)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_activities_session` (`session_id`, `created_at`),
  KEY `idx_activities_company` (`company_id`, `created_at`),
  CONSTRAINT `fk_activities_session` FOREIGN KEY (`session_id`) REFERENCES `sessions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS=1;
