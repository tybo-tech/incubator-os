-- Migration: Repair/align `nodes.token` with the canonical definition
-- Date: 2026-09-14
--
-- Context:
--   `2026-07-09-add-token-column.sql` defines `nodes.token` as VARCHAR(64) NULL UNIQUE
--   plus INDEX `idx_nodes_token`. Production had drifted: `token` was VARCHAR(1000)
--   with no UNIQUE key and no index.
--
-- This patch is a guarded repair. It is safe to re-run and is a no-op on installs that
-- already match the canonical definition (e.g. local).
--
-- Prerequisite (checked 2026-09-14 before running in production):
--   non-null tokens: 3 · max length: 64 · duplicates: 0 · JSON `$.token` remaining: 0
--   → no truncation and no duplicate-key risk.

-- 1) Normalise column type to VARCHAR(64)
SET @col := (
  SELECT COLUMN_TYPE FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'nodes' AND COLUMN_NAME = 'token'
);
SET @sql := IF(@col IS NOT NULL AND @col <> 'varchar(64)',
  'ALTER TABLE `nodes` MODIFY COLUMN `token` VARCHAR(64) NULL',
  'SELECT ''nodes.token already varchar(64) (or missing)'' AS note');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2) Add UNIQUE key on token (MySQL permits multiple NULLs)
SET @uniq := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'nodes'
    AND INDEX_NAME = 'token' AND NON_UNIQUE = 0
);
SET @sql := IF(@uniq = 0,
  'ALTER TABLE `nodes` ADD UNIQUE KEY `token` (`token`)',
  'SELECT ''unique key token already exists'' AS note');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3) Add lookup index
SET @idx := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'nodes' AND INDEX_NAME = 'idx_nodes_token'
);
SET @sql := IF(@idx = 0,
  'ALTER TABLE `nodes` ADD INDEX `idx_nodes_token` (`token`)',
  'SELECT ''idx_nodes_token already exists'' AS note');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
