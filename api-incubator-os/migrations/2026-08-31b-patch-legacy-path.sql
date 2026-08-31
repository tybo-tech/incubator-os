-- Patch for installs that already ran 2026-08-31-normalized-swot-gps.sql before the legacy_path / current_company_id corrections
-- Idempotent — safe to run even if the main migration was already the corrected version (adds only if missing)
-- Run: mysql -u docker -pdocker incubator_os < migrations/2026-08-31b-patch-legacy-path.sql

SET NAMES utf8mb4;

-- Helper: add column if not exists via information_schema check
DELIMITER //

CREATE PROCEDURE patch_add_column_if_missing(IN tbl VARCHAR(64), IN col VARCHAR(64), IN ddl TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = col
  ) THEN
    SET @sql = ddl;
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //

CREATE PROCEDURE patch_add_unique_if_missing(IN tbl VARCHAR(64), IN idx_name VARCHAR(64), IN ddl TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND INDEX_NAME = idx_name
  ) THEN
    SET @sql = ddl;
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //

DELIMITER ;

-- swot_analyses: generated column + unique
CALL patch_add_column_if_missing('swot_analyses', 'current_company_id',
  'ALTER TABLE `swot_analyses` ADD COLUMN `current_company_id` INT GENERATED ALWAYS AS (CASE WHEN is_current = 1 THEN company_id ELSE NULL END) STORED COMMENT ''Enforces one current per company via UNIQUE'''
);
CALL patch_add_unique_if_missing('swot_analyses', 'uq_swot_current_company',
  'ALTER TABLE `swot_analyses` ADD UNIQUE KEY `uq_swot_current_company` (`current_company_id`)'
);

-- swot_items: legacy_path + unique
CALL patch_add_column_if_missing('swot_items', 'legacy_path',
  'ALTER TABLE `swot_items` ADD COLUMN `legacy_path` VARCHAR(255) DEFAULT NULL COMMENT ''Deterministic source identity e.g. internal.strengths[0]'' AFTER `legacy_source_key`'
);
CALL patch_add_unique_if_missing('swot_items', 'uq_swot_items_analysis_path',
  'ALTER TABLE `swot_items` ADD UNIQUE KEY `uq_swot_items_analysis_path` (`swot_analysis_id`, `legacy_path`)'
);

-- gps_targets: legacy_path + unique
CALL patch_add_column_if_missing('gps_targets', 'legacy_path',
  'ALTER TABLE `gps_targets` ADD COLUMN `legacy_path` VARCHAR(255) DEFAULT NULL COMMENT ''Deterministic source identity e.g. finance.targets[1]'' AFTER `legacy_node_id`'
);
CALL patch_add_unique_if_missing('gps_targets', 'uq_gps_targets_node_path',
  'ALTER TABLE `gps_targets` ADD UNIQUE KEY `uq_gps_targets_node_path` (`legacy_node_id`, `legacy_path`)'
);

-- gps_target_metrics: fix comment for current_value (no schema change needed, just ensure comment is updated)
-- MySQL cannot ALTER COMMENT without redefining column; we leave it as-is and document that current_value is cached snapshot only

DROP PROCEDURE IF EXISTS patch_add_column_if_missing;
DROP PROCEDURE IF EXISTS patch_add_unique_if_missing;
