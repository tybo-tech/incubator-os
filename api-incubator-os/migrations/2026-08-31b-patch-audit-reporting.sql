-- Patch for durable reporting — adds human-readable history fields to normalized_migration_audits
-- Run: mysql -u docker -pdocker incubator_os < migrations/2026-08-31b-patch-audit-reporting.sql
-- Idempotent via ADD COLUMN IF NOT EXISTS pattern using information_schema

SET NAMES utf8mb4;

-- Helper: add column if missing
DELIMITER $$
CREATE PROCEDURE add_audit_column_if_missing(IN col_name VARCHAR(64), IN col_def TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'normalized_migration_audits'
      AND COLUMN_NAME = col_name
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `normalized_migration_audits` ADD COLUMN `', col_name, '` ', col_def);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

CALL add_audit_column_if_missing('operation_type', "ENUM('schema_migration','data_migration','backfill','repair','cleanup') NOT NULL DEFAULT 'data_migration' COMMENT 'Human reporting type'");
CALL add_audit_column_if_missing('migration_key', "VARCHAR(100) DEFAULT NULL COMMENT 'Stable key e.g. 2026-08-31-normalized-swot-gps'");
CALL add_audit_column_if_missing('title', "VARCHAR(255) DEFAULT NULL COMMENT 'Human title e.g. Normalize SWOT and GPS records'");
CALL add_audit_column_if_missing('description', "TEXT DEFAULT NULL COMMENT 'Immutable why — durable two-year history'");
CALL add_audit_column_if_missing('environment', "ENUM('local','staging','production') DEFAULT NULL COMMENT 'Where it ran'");
CALL add_audit_column_if_missing('commit_sha', "VARCHAR(40) DEFAULT NULL COMMENT 'Git SHA that performed it'");

DROP PROCEDURE add_audit_column_if_missing;

-- Backfill existing rows with canonical description for the normalized migration
-- Note: environment is NOT backfilled here — supply deployment environment explicitly on first real run;
-- using 'local' as default would falsely label historical production records. New audits set environment via host detection.
UPDATE `normalized_migration_audits`
SET
  operation_type = COALESCE(operation_type, 'data_migration'),
  migration_key = COALESCE(migration_key, '2026-08-31-normalized-swot-gps'),
  title = COALESCE(title, 'Normalize SWOT and GPS records'),
  description = COALESCE(description, 'Migrated legacy SWOT analyses and GPS targets from JSON nodes into normalized relational tables to support individual identities, relationships, tasks, progress tracking and dashboard reporting. Legacy nodes were retained as an archive.')
WHERE description IS NULL OR migration_key IS NULL;
