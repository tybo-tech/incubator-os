-- Results & Achievements — Sprint 007 Phase 1
-- Date: 2026-09-15
-- Author: Sprint 007 Phase 1
--
-- Creates the measure→source binding and the results/achievements foundation:
--   1. `metric_type_accounts`  — binds a metric_type (measure definition) to a financial
--      account source (`account_type`, optional pinned `account_id`).
--   2. `achievements`          — dated, attributable, verifiable outcomes (kind = result|achievement|decision).
--   3. `achievement_evidence`  — evidence rows preserved at review (append-only once verified).
--   4. Extends `gps_target_metrics` with measurement fields (periods, direction, method, tolerance, version).
--   5. Seeds revenue bindings for REVENUE_TOTAL / REVENUE_EXPORT / REVENUE_ANNUAL.
--
-- Safe to re-run: tables use IF NOT EXISTS, column adds are guarded via information_schema,
-- and bindings seed with ON DUPLICATE KEY UPDATE on a stable unique key.
--
-- Run locally:
--   Get-Content api-incubator-os/migrations/2026-09-15-results-achievements.sql -Raw | podman exec -i incubator-os-mysql-container mysql -u docker -pdocker incubator_os
-- Production (phpMyAdmin): import the same file.
--
-- ---------------------------------------------------------------------------
-- ROLLBACK (manual, reverse order). Only drop what this migration created —
-- never drop `gps_target_metrics` itself (it predates this migration).
--
--   DROP TABLE IF EXISTS `achievement_evidence`;
--   DROP TABLE IF EXISTS `achievements`;
--   DROP TABLE IF EXISTS `metric_type_accounts`;
--   ALTER TABLE `gps_target_metrics`
--     DROP COLUMN `baseline_period_type`,
--     DROP COLUMN `baseline_period_ref`,
--     DROP COLUMN `target_period_type`,
--     DROP COLUMN `target_period_ref`,
--     DROP COLUMN `direction`,
--     DROP COLUMN `calculation_method`,
--     DROP COLUMN `maintain_tolerance_value`,
--     DROP COLUMN `maintain_tolerance_unit`,
--     DROP COLUMN `calculation_version`;
-- ---------------------------------------------------------------------------

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;

-- --------------------------------------------------------
-- 1. metric_type_accounts — measure → financial account source binding
-- --------------------------------------------------------
-- A binding is global to the measure definition (metric_type). `account_type` is
-- resolved per company at read time (company-scoped). `account_id` is an optional
-- pin to one specific `company_accounts.id`; NULL means "resolve by account_type".
-- `account_id_key` makes the unique key treat NULL account_id as 0 (MySQL UNIQUE treats NULLs as distinct).

CREATE TABLE IF NOT EXISTS `metric_type_accounts` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `metric_type_id` BIGINT NOT NULL COMMENT 'FK -> metric_types.id (enforced at app layer)',
  `account_type` ENUM('domestic_revenue','export_revenue','expense','other') NOT NULL COMMENT 'company_accounts.account_type to resolve against',
  `account_id` INT DEFAULT NULL COMMENT 'Optional pin to a specific company_accounts.id; NULL = resolve by account_type per company',
  `is_revenue` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Filter for company_financial_yearly_stats.is_revenue',
  `combine_mode` ENUM('sum','avg','latest') NOT NULL DEFAULT 'sum' COMMENT 'How multiple source rows combine',
  `account_id_key` INT GENERATED ALWAYS AS (COALESCE(`account_id`, 0)) STORED COMMENT 'NULL-safe key for the unique constraint',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_mta_metric_type` (`metric_type_id`),
  KEY `idx_mta_account_type` (`account_type`),
  KEY `idx_mta_account` (`account_id`),
  UNIQUE KEY `uq_mta_type_accttype_acct` (`metric_type_id`, `account_type`, `account_id_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------
-- 2. achievements — dated, attributable, verifiable outcomes
-- --------------------------------------------------------
-- gps_target_id NULL = qualitative achievement (no prior target).
-- kind = decision is an event, not an achievement; it is excluded from achievement counts
-- and cannot be verified (enforced at app layer).
-- achieved_on is the event date and is independent of recorded_at.
-- A verified record is corrected by revoke (with reason) or supersede — never destroyed.

CREATE TABLE IF NOT EXISTS `achievements` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `company_id` INT NOT NULL COMMENT 'FK -> companies.id',
  `gps_target_id` BIGINT DEFAULT NULL COMMENT 'FK -> gps_targets.id; NULL = qualitative achievement',
  `category` ENUM('strategy_general','finance','sales_marketing','personal_development') DEFAULT NULL,
  `kind` ENUM('result','achievement','decision') NOT NULL DEFAULT 'result' COMMENT 'decision = dated event, excluded from achievement counts',
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `achieved_on` DATE DEFAULT NULL COMMENT 'Event date (labelled "Decision date" for kind=decision)',
  `baseline_value` DECIMAL(14,2) DEFAULT NULL,
  `target_value` DECIMAL(14,2) DEFAULT NULL,
  `actual_value` DECIMAL(14,2) DEFAULT NULL,
  `unit` VARCHAR(16) DEFAULT NULL,
  `direction` ENUM('increase','decrease','maintain') DEFAULT NULL,
  `evidence_summary` TEXT DEFAULT NULL,
  `recorded_by` INT DEFAULT NULL COMMENT 'FK -> users.id; always server-derived from session',
  `recorded_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `verified_by` INT DEFAULT NULL COMMENT 'FK -> users.id; always server-derived from session',
  `verified_at` DATETIME DEFAULT NULL,
  `verification_status` ENUM('unverified','verified','rejected','revoked') NOT NULL DEFAULT 'unverified',
  `supersedes_id` BIGINT DEFAULT NULL COMMENT 'FK -> achievements.id; set when this record supersedes another',
  `revoked_reason` TEXT DEFAULT NULL,
  `revoked_by` INT DEFAULT NULL,
  `revoked_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_achievements_company` (`company_id`),
  KEY `idx_achievements_target` (`gps_target_id`),
  KEY `idx_achievements_kind` (`kind`),
  KEY `idx_achievements_status` (`verification_status`),
  KEY `idx_achievements_achieved_on` (`achieved_on`),
  KEY `idx_achievements_supersedes` (`supersedes_id`),
  CONSTRAINT `fk_achievements_target` FOREIGN KEY (`gps_target_id`) REFERENCES `gps_targets` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_achievements_supersedes` FOREIGN KEY (`supersedes_id`) REFERENCES `achievements` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------
-- 3. achievement_evidence — evidence preserved at review
-- --------------------------------------------------------
-- Append-only once the parent achievement is verified (enforced at app layer).
-- Delete cascades when a draft achievement is removed.

CREATE TABLE IF NOT EXISTS `achievement_evidence` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `achievement_id` BIGINT NOT NULL COMMENT 'FK -> achievements.id',
  `source_type` ENUM('metric_snapshot','financial_stat','note','url','file') NOT NULL DEFAULT 'note',
  `label` VARCHAR(255) DEFAULT NULL,
  `reference` VARCHAR(512) DEFAULT NULL COMMENT 'URL, asset id, or free reference',
  `snapshot_json` JSON DEFAULT NULL COMMENT 'Measurement snapshot captured at verification (periods, account bindings, completeness, calculation_version)',
  `created_by` INT DEFAULT NULL COMMENT 'FK -> users.id; server-derived from session',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_evidence_achievement` (`achievement_id`),
  KEY `idx_evidence_source_type` (`source_type`),
  CONSTRAINT `fk_evidence_achievement` FOREIGN KEY (`achievement_id`) REFERENCES `achievements` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------
-- 4. gps_target_metrics — measurement fields (guarded, additive)
-- --------------------------------------------------------
-- Each ADD is guarded on information_schema so the migration is idempotent on re-run
-- (MySQL 8.0.43 does not reliably support ADD COLUMN IF NOT EXISTS).

SET @t := 'gps_target_metrics';

SET @has := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME='baseline_period_type');
SET @sql := IF(@has=0, 'ALTER TABLE `gps_target_metrics` ADD COLUMN `baseline_period_type` ENUM(''financial_year'',''quarter'',''custom'') DEFAULT NULL COMMENT ''Baseline period kind''', 'SELECT ''baseline_period_type exists'' AS note');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @has := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME='baseline_period_ref');
SET @sql := IF(@has=0, 'ALTER TABLE `gps_target_metrics` ADD COLUMN `baseline_period_ref` VARCHAR(64) DEFAULT NULL COMMENT ''financial_years.id | <fy_id>:Qn | YYYY-MM-DD..YYYY-MM-DD''', 'SELECT ''baseline_period_ref exists'' AS note');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @has := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME='target_period_type');
SET @sql := IF(@has=0, 'ALTER TABLE `gps_target_metrics` ADD COLUMN `target_period_type` ENUM(''financial_year'',''quarter'',''custom'') DEFAULT NULL COMMENT ''Target period kind''', 'SELECT ''target_period_type exists'' AS note');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @has := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME='target_period_ref');
SET @sql := IF(@has=0, 'ALTER TABLE `gps_target_metrics` ADD COLUMN `target_period_ref` VARCHAR(64) DEFAULT NULL COMMENT ''financial_years.id | <fy_id>:Qn | YYYY-MM-DD..YYYY-MM-DD''', 'SELECT ''target_period_ref exists'' AS note');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @has := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME='direction');
SET @sql := IF(@has=0, 'ALTER TABLE `gps_target_metrics` ADD COLUMN `direction` ENUM(''increase'',''decrease'',''maintain'') DEFAULT NULL COMMENT ''Success direction''', 'SELECT ''direction exists'' AS note');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @has := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME='calculation_method');
SET @sql := IF(@has=0, 'ALTER TABLE `gps_target_metrics` ADD COLUMN `calculation_method` ENUM(''period_total'') DEFAULT NULL COMMENT ''Implemented: period_total only (others reserved)''', 'SELECT ''calculation_method exists'' AS note');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @has := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME='maintain_tolerance_value');
SET @sql := IF(@has=0, 'ALTER TABLE `gps_target_metrics` ADD COLUMN `maintain_tolerance_value` DECIMAL(14,2) DEFAULT NULL COMMENT ''Required when direction=maintain''', 'SELECT ''maintain_tolerance_value exists'' AS note');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @has := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME='maintain_tolerance_unit');
SET @sql := IF(@has=0, 'ALTER TABLE `gps_target_metrics` ADD COLUMN `maintain_tolerance_unit` ENUM(''absolute'',''percent'') DEFAULT NULL COMMENT ''Required when direction=maintain''', 'SELECT ''maintain_tolerance_unit exists'' AS note');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @has := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME='calculation_version');
SET @sql := IF(@has=0, 'ALTER TABLE `gps_target_metrics` ADD COLUMN `calculation_version` VARCHAR(16) DEFAULT NULL COMMENT ''Formula version stored with snapshots''', 'SELECT ''calculation_version exists'' AS note');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- --------------------------------------------------------
-- 5. Seed revenue bindings (idempotent via stable unique key)
-- --------------------------------------------------------
-- Matched by metric_types.code (ids may differ per environment).
--   REVENUE_TOTAL  -> domestic_revenue + export_revenue (sum)
--   REVENUE_EXPORT -> export_revenue (sum)
--   REVENUE_ANNUAL -> domestic_revenue + export_revenue (sum)

INSERT INTO `metric_type_accounts` (`metric_type_id`, `account_type`, `account_id`, `is_revenue`, `combine_mode`)
SELECT mt.id, 'domestic_revenue', NULL, 1, 'sum' FROM `metric_types` mt WHERE mt.code = 'REVENUE_TOTAL'
ON DUPLICATE KEY UPDATE `is_revenue`=VALUES(`is_revenue`), `combine_mode`=VALUES(`combine_mode`);

INSERT INTO `metric_type_accounts` (`metric_type_id`, `account_type`, `account_id`, `is_revenue`, `combine_mode`)
SELECT mt.id, 'export_revenue', NULL, 1, 'sum' FROM `metric_types` mt WHERE mt.code = 'REVENUE_TOTAL'
ON DUPLICATE KEY UPDATE `is_revenue`=VALUES(`is_revenue`), `combine_mode`=VALUES(`combine_mode`);

INSERT INTO `metric_type_accounts` (`metric_type_id`, `account_type`, `account_id`, `is_revenue`, `combine_mode`)
SELECT mt.id, 'export_revenue', NULL, 1, 'sum' FROM `metric_types` mt WHERE mt.code = 'REVENUE_EXPORT'
ON DUPLICATE KEY UPDATE `is_revenue`=VALUES(`is_revenue`), `combine_mode`=VALUES(`combine_mode`);

INSERT INTO `metric_type_accounts` (`metric_type_id`, `account_type`, `account_id`, `is_revenue`, `combine_mode`)
SELECT mt.id, 'domestic_revenue', NULL, 1, 'sum' FROM `metric_types` mt WHERE mt.code = 'REVENUE_ANNUAL'
ON DUPLICATE KEY UPDATE `is_revenue`=VALUES(`is_revenue`), `combine_mode`=VALUES(`combine_mode`);

INSERT INTO `metric_type_accounts` (`metric_type_id`, `account_type`, `account_id`, `is_revenue`, `combine_mode`)
SELECT mt.id, 'export_revenue', NULL, 1, 'sum' FROM `metric_types` mt WHERE mt.code = 'REVENUE_ANNUAL'
ON DUPLICATE KEY UPDATE `is_revenue`=VALUES(`is_revenue`), `combine_mode`=VALUES(`combine_mode`);

SET FOREIGN_KEY_CHECKS=1;
