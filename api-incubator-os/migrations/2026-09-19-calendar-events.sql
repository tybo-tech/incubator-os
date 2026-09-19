-- Calendar Events — Sprint 008 Phase 2
-- Date: 2026-09-19
-- Author: Sprint 008 Phase 2
--
-- Persists the generic calendar (appointments / deadlines / reviews / check-ins).
-- This is NOT a coaching-session model: a calendar event is an arbitrary dated
-- entry. A later phase introduces first-class Sessions and may associate a
-- meeting-category event with a session.
--
--   1. `calendar_events`       — company-scoped or system-wide dated events.
--   2. `calendar_event_links`  — optional link from an event to one existing
--      domain record (target / swot item / task / financial indicator /
--      achievement / achievement evidence).
--
-- DATE/TIME STORAGE CONTRACT (the reason this table is shaped this way):
--   * ALL-DAY events are stored as DATE columns (`start_date` / `end_date`,
--     inclusive). They are never midnight-UTC datetimes, so they round-trip
--     without shifting across timezones.
--   * TIMED events are stored as UTC DATETIME columns (`start_at` / `end_at`)
--     plus an IANA `timezone`. The client converts wall-clock ↔ UTC.
--   * A CHECK constraint enforces exactly one valid combination, so the two
--     shapes can never be mixed.
--
-- SCOPE / AUTHORIZATION:
--   * `company_id = NULL` means a system-wide event (visible in every company
--     calendar). It is NOT an authorization bypass — writes are restricted to
--     administrative roles and a system-wide event cannot carry links.
--   * `tenant_id` is server-derived (never accepted from the browser) and
--     mirrors the platform-wide tenant concept used by the financial tables.
--
-- CONCURRENCY / IDEMPOTENCY:
--   * `version` is an optimistic-concurrency counter; a stale update is rejected.
--   * `client_token` is an optional caller-supplied idempotency key, unique per
--     creator, so a retried create does not duplicate the event.
--
-- SOFT DELETE vs CANCEL:
--   * `deleted_at` removes an event from every listing (soft delete).
--   * `status = 'cancelled'` keeps the event visible but marked cancelled.
--     These are distinct operations.
--
-- Safe to re-run: both tables use IF NOT EXISTS and the CHECK constraint is
-- declared on the CREATE (MySQL cannot add it idempotently afterwards).
--
-- Run locally:
--   Get-Content api-incubator-os/migrations/2026-09-19-calendar-events.sql -Raw | podman exec -i incubator-os-mysql-container mysql -u docker -pdocker incubator_os
-- Production (phpMyAdmin): import the same file.
--
-- ---------------------------------------------------------------------------
-- ROLLBACK (manual, reverse order). Only drops what this migration created:
--
--   DROP TABLE IF EXISTS `calendar_event_links`;
--   DROP TABLE IF EXISTS `calendar_events`;
-- ---------------------------------------------------------------------------

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;

-- --------------------------------------------------------
-- 1. calendar_events
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `calendar_events` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `tenant_id` INT NOT NULL DEFAULT 1 COMMENT 'Tenant scope; always server-derived, never client-supplied',
  `company_id` INT DEFAULT NULL COMMENT 'FK -> companies.id; NULL = system-wide event (admin-authored only)',
  `created_by` INT NOT NULL COMMENT 'FK -> users.id; always server-derived from session',
  `updated_by` INT DEFAULT NULL COMMENT 'FK -> users.id; always server-derived from session',
  `assignee_user_id` INT DEFAULT NULL COMMENT 'FK -> users.id; validated against the event company',
  `assignee_label` VARCHAR(255) DEFAULT NULL COMMENT 'Free-text assignee (mirrors owner_label convention)',
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `category` ENUM('meeting','deadline','review','check_in','reminder','milestone','other') NOT NULL DEFAULT 'other',
  `status` ENUM('scheduled','completed','cancelled') NOT NULL DEFAULT 'scheduled' COMMENT 'Cancelled keeps the event visible; deleted_at removes it',
  `all_day` TINYINT(1) NOT NULL DEFAULT 0,
  `timezone` VARCHAR(64) DEFAULT NULL COMMENT 'IANA zone for timed events, e.g. Africa/Johannesburg',
  `location` VARCHAR(255) DEFAULT NULL,
  `start_date` DATE DEFAULT NULL COMMENT 'All-day start (inclusive). NULL for timed events',
  `end_date` DATE DEFAULT NULL COMMENT 'All-day end (inclusive). NULL for timed events',
  `start_at` DATETIME DEFAULT NULL COMMENT 'Timed start in UTC. NULL for all-day events',
  `end_at` DATETIME DEFAULT NULL COMMENT 'Timed end in UTC. NULL for all-day events',
  `version` INT NOT NULL DEFAULT 1 COMMENT 'Optimistic concurrency; incremented on every successful update',
  `client_token` VARCHAR(64) DEFAULT NULL COMMENT 'Optional idempotency key, unique per creator, for retried creates',
  `deleted_at` DATETIME DEFAULT NULL COMMENT 'Soft delete; NULL = live',
  `deleted_by` INT DEFAULT NULL COMMENT 'FK -> users.id; server-derived',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cal_tenant_start_date` (`tenant_id`, `start_date`),
  KEY `idx_cal_tenant_start_at` (`tenant_id`, `start_at`),
  KEY `idx_cal_company_start_date` (`company_id`, `start_date`),
  KEY `idx_cal_company_start_at` (`company_id`, `start_at`),
  KEY `idx_cal_assignee_start_date` (`assignee_user_id`, `start_date`),
  KEY `idx_cal_assignee_start_at` (`assignee_user_id`, `start_at`),
  KEY `idx_cal_status` (`status`),
  KEY `idx_cal_deleted` (`deleted_at`),
  KEY `idx_cal_creator` (`created_by`),
  UNIQUE KEY `uq_cal_client_token` (`created_by`, `client_token`),
  CONSTRAINT `fk_cal_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_cal_time_shape` CHECK (
    (`all_day` = 1 AND `start_date` IS NOT NULL AND `end_date` IS NOT NULL
                  AND `start_at` IS NULL AND `end_at` IS NULL)
    OR
    (`all_day` = 0 AND `start_at` IS NOT NULL AND `end_at` IS NOT NULL
                  AND `timezone` IS NOT NULL
                  AND `start_date` IS NULL AND `end_date` IS NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------
-- 2. calendar_event_links
-- --------------------------------------------------------
-- At most one row per (event, entity type, entity id). The linked record must
-- belong to the same company as the event and be accessible to the actor
-- (enforced in the service layer, because the target lives in six tables).

CREATE TABLE IF NOT EXISTS `calendar_event_links` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `calendar_event_id` BIGINT NOT NULL COMMENT 'FK -> calendar_events.id',
  `entity_type` ENUM('gps_target','swot_item','gps_target_task','financial_indicator','achievement','achievement_evidence') NOT NULL,
  `entity_id` BIGINT NOT NULL,
  `label` VARCHAR(255) DEFAULT NULL COMMENT 'Human label captured at link time',
  `created_by` INT DEFAULT NULL COMMENT 'FK -> users.id; server-derived',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cal_link` (`calendar_event_id`, `entity_type`, `entity_id`),
  KEY `idx_cal_link_entity` (`entity_type`, `entity_id`),
  CONSTRAINT `fk_cal_link_event` FOREIGN KEY (`calendar_event_id`) REFERENCES `calendar_events` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS=1;
