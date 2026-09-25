-- Site Visits — Sprint 011 Phase 1
-- Date: 2026-09-25
-- Author: Sprint 011
--
-- Structured on-site visit reports attached one-to-one to a Session.
--
-- A site visit IS a Session (`session_type = 'site_visit'`). Facilitator,
-- participants, attendance, the linked calendar event and its Google Meet
-- projection, notes, decisions and entity links are all reused from Sprint 009 /
-- Sprint 010 — this migration adds ONLY the structured report that turns a visit
-- into an auditable document.
--
-- WHAT THIS MIGRATION DOES
--   1. Widens `sessions.session_type` (additive) with `site_visit`.
--   2. Creates `session_visit_reports`          — one structured report per visit Session.
--   3. Creates `session_visit_items`            — sectioned content (discussion / challenge /
--                                                 alternative / recommendation).
--   4. Creates `session_visit_signoffs`         — who signed, and WHICH issued version.
--   5. Creates `session_visit_report_versions`  — immutable issued snapshots (audit record).
--
-- DOMAIN RULES (enforced in the service layer; schema enforces what it can)
--   * A report exists only for a Session whose `session_type = 'site_visit'`.
--   * One Session has at most one report (`UNIQUE session_id`).
--   * `company_id` must equal the Session's company (service layer).
--   * Content is editable only while `status = 'draft'`.
--   * Issuing snapshots the report into `session_visit_report_versions` and
--     increments `current_version`; versions are immutable.
--   * A sign-off records the EXACT issued `report_version_no` so an
--     acknowledgement cannot silently apply to a later re-issue.
--   * Funding states are NEVER stored on the report — the funding position is
--     derived on read.
--
-- The enum widen is additive: no existing value is removed or reordered, so
-- existing Sessions are unaffected.
--
-- Safe to re-run: the enum widen is information_schema-guarded and every table
-- uses IF NOT EXISTS. No existing table is altered except the additive enum.
--
-- Run locally:
--   Get-Content api-incubator-os/migrations/2026-09-25-site-visits.sql -Raw | podman exec -i incubator-os-mysql-container mysql -u docker -pdocker incubator_os
-- Production (phpMyAdmin): import after 2026-09-24-google-calendar-phase4.sql.
--
-- ---------------------------------------------------------------------------
-- ROLLBACK (manual, reverse order). Drops only what this migration created.
-- The `site_visit` enum value may remain harmlessly; restore the original enum
-- ONLY after removing any Session using it:
--
--   DROP TABLE IF EXISTS `session_visit_report_versions`;
--   DROP TABLE IF EXISTS `session_visit_signoffs`;
--   DROP TABLE IF EXISTS `session_visit_items`;
--   DROP TABLE IF EXISTS `session_visit_reports`;
--   -- DELETE FROM `sessions` WHERE `session_type` = 'site_visit';
--   -- ALTER TABLE `sessions`
--   --   MODIFY COLUMN `session_type` ENUM('coaching','progress_review','financial_review','assessment','workshop','other') NOT NULL DEFAULT 'other';
-- ---------------------------------------------------------------------------

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;

-- --------------------------------------------------------
-- 1. sessions.session_type — add site_visit (additive)
-- --------------------------------------------------------

SET @has_site_visit := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'sessions'
    AND COLUMN_NAME = 'session_type'
    AND COLUMN_TYPE LIKE '%site_visit%'
);
SET @sql := IF(@has_site_visit = 0,
  'ALTER TABLE `sessions` MODIFY COLUMN `session_type` ENUM(''coaching'',''progress_review'',''financial_review'',''assessment'',''workshop'',''other'',''site_visit'') NOT NULL DEFAULT ''other''',
  'SELECT ''session_type already includes site_visit'' AS note');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- --------------------------------------------------------
-- 2. session_visit_reports
-- --------------------------------------------------------
-- The report header. `status` is the visit-report lifecycle, independent of the
-- Session lifecycle (`draft` -> `issued` -> `acknowledged`). `current_version`
-- points at the latest issued snapshot. `follow_up_session_id` links the next
-- visit Session (same company). Funding values are NOT stored here.

CREATE TABLE IF NOT EXISTS `session_visit_reports` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `tenant_id` INT NOT NULL DEFAULT 1 COMMENT 'Tenant scope; always server-derived, never client-supplied',
  `session_id` BIGINT NOT NULL COMMENT 'FK -> sessions.id; the site_visit Session this report belongs to (UNIQUE)',
  `company_id` INT NOT NULL COMMENT 'FK -> companies.id; must equal the Session company',
  `categories_item_id` BIGINT DEFAULT NULL COMMENT 'FK -> categories_item.id; the programme/cohort enrolment the visit concerns. Required to issue.',
  `visit_kind` ENUM('scheduled','ad_hoc','follow_up') NOT NULL DEFAULT 'scheduled' COMMENT 'Classification of the visit; NOT the Session lifecycle',
  `actual_visit_date` DATE DEFAULT NULL COMMENT 'When the visit actually occurred (confirmed), distinct from the scheduled calendar date. Required to issue.',
  `actual_location` VARCHAR(255) DEFAULT NULL COMMENT 'Confirmed visit location; overrides the calendar event location when set',
  `operating_status` TEXT DEFAULT NULL COMMENT 'What was observed about how the business is currently operating',
  `status` ENUM('draft','issued','acknowledged') NOT NULL DEFAULT 'draft',
  `current_version` INT NOT NULL DEFAULT 0 COMMENT 'Latest issued snapshot version; 0 = never issued',
  `next_visit_target_date` DATE DEFAULT NULL COMMENT 'Target date for the follow-up visit',
  `follow_up_method` ENUM('call','visit','check_in','email') DEFAULT NULL,
  `follow_up_session_id` BIGINT DEFAULT NULL COMMENT 'FK -> sessions.id; the next visit Session (same company)',
  `issued_by` INT DEFAULT NULL COMMENT 'FK -> users.id; server-derived',
  `issued_at` DATETIME DEFAULT NULL COMMENT 'When the report was issued (UTC)',
  `acknowledged_by` INT DEFAULT NULL COMMENT 'FK -> users.id; server-derived',
  `acknowledged_at` DATETIME DEFAULT NULL COMMENT 'When the beneficiary acknowledged the issued report (UTC)',
  `version` INT NOT NULL DEFAULT 1 COMMENT 'Optimistic concurrency; incremented on every successful draft update',
  `created_by` INT NOT NULL COMMENT 'FK -> users.id; always server-derived',
  `updated_by` INT DEFAULT NULL COMMENT 'FK -> users.id; always server-derived',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_visit_report_session` (`session_id`),
  KEY `idx_visit_report_company_status` (`company_id`, `status`),
  KEY `idx_visit_report_company_date` (`company_id`, `actual_visit_date`),
  KEY `idx_visit_report_enrolment` (`categories_item_id`),
  KEY `idx_visit_report_followup` (`follow_up_session_id`),
  KEY `idx_visit_report_tenant_company` (`tenant_id`, `company_id`),
  CONSTRAINT `fk_visit_report_session` FOREIGN KEY (`session_id`) REFERENCES `sessions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_visit_report_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_visit_report_enrolment` FOREIGN KEY (`categories_item_id`) REFERENCES `categories_item` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_visit_report_followup` FOREIGN KEY (`follow_up_session_id`) REFERENCES `sessions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------
-- 3. session_visit_items
-- --------------------------------------------------------
-- One generic sectioned item table rather than four near-identical tables. The
-- `section` discriminator drives the editor (one reusable list used four times).
-- `impact` carries the report's "impact on the business" column for challenges.

CREATE TABLE IF NOT EXISTS `session_visit_items` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `report_id` BIGINT NOT NULL COMMENT 'FK -> session_visit_reports.id',
  `section` ENUM('discussion','challenge','alternative','recommendation') NOT NULL,
  `sort_order` SMALLINT NOT NULL DEFAULT 0 COMMENT 'Authoritative order within the section',
  `title` VARCHAR(255) NOT NULL,
  `detail` TEXT DEFAULT NULL,
  `impact` TEXT DEFAULT NULL COMMENT 'Impact on the business (used by challenge items; nullable elsewhere)',
  `created_by` INT DEFAULT NULL COMMENT 'FK -> users.id; server-derived',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_visit_items_report_section` (`report_id`, `section`, `sort_order`),
  CONSTRAINT `fk_visit_items_report` FOREIGN KEY (`report_id`) REFERENCES `session_visit_reports` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------
-- 4. session_visit_signoffs
-- --------------------------------------------------------
-- A sign-off references the EXACT issued version it applies to
-- (`report_version_no`), so an acknowledgement cannot silently carry over to a
-- later re-issue. UNIQUE (report_id, role): one sign-off per role per report.

CREATE TABLE IF NOT EXISTS `session_visit_signoffs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `report_id` BIGINT NOT NULL COMMENT 'FK -> session_visit_reports.id',
  `report_version_no` INT DEFAULT NULL COMMENT 'The issued snapshot version this sign-off applies to (NULL while still a draft)',
  `role` ENUM('coach','beneficiary','sponsor') NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `designation` VARCHAR(255) DEFAULT NULL,
  `signed_at` DATETIME DEFAULT NULL COMMENT 'When the sign-off was recorded (UTC)',
  `signature_ref` VARCHAR(512) DEFAULT NULL COMMENT 'Reference to a signature artefact; real e-signature is a future module',
  `created_by` INT DEFAULT NULL COMMENT 'FK -> users.id; server-derived',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_visit_signoff_role` (`report_id`, `role`),
  KEY `idx_visit_signoff_report` (`report_id`),
  CONSTRAINT `fk_visit_signoff_report` FOREIGN KEY (`report_id`) REFERENCES `session_visit_reports` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------
-- 5. session_visit_report_versions
-- --------------------------------------------------------
-- The immutable audit record. `snapshot_json` is built at issue time from the
-- report, Session, linked event, company profile, linked actions and sign-offs.
-- It NEVER contains `incubator`-visibility notes. Later company or task changes
-- do not rewrite a stored version.

CREATE TABLE IF NOT EXISTS `session_visit_report_versions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `report_id` BIGINT NOT NULL COMMENT 'FK -> session_visit_reports.id',
  `version_no` INT NOT NULL COMMENT 'Monotonic per report; matches session_visit_reports.current_version when current',
  `snapshot_json` LONGTEXT NOT NULL COMMENT 'The exact rendered report at issue time (JSON). The audit record.',
  `rendered_doc_ref` VARCHAR(512) DEFAULT NULL COMMENT 'Reference to an exported artefact; NOT a copy of the content',
  `issued_by` INT NOT NULL COMMENT 'FK -> users.id; server-derived',
  `issued_at` DATETIME NOT NULL COMMENT 'When this version was issued (UTC)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_visit_version` (`report_id`, `version_no`),
  KEY `idx_visit_version_report` (`report_id`),
  CONSTRAINT `fk_visit_version_report` FOREIGN KEY (`report_id`) REFERENCES `session_visit_reports` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS=1;
