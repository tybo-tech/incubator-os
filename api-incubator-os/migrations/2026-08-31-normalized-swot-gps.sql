-- Normalized SWOT & GPS Model — Sprint 005
-- Preserves `nodes` as legacy archive. Creates 7 new tables.
-- Run: mysql -u docker -pdocker incubator_os < migrations/2026-08-31-normalized-swot-gps.sql

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;

-- --------------------------------------------------------
-- 1. swot_analyses — Assessment header (one per SWOT session)
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `swot_analyses` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `company_id` INT NOT NULL COMMENT 'FK -> companies.id',
  `analysis_date` DATETIME DEFAULT NULL COMMENT 'Assessment date from JSON analysis_date',
  `summary` TEXT DEFAULT NULL COMMENT 'Overall narrative summary',
  `status` ENUM('draft','completed','archived') NOT NULL DEFAULT 'draft',
  `is_current` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = appears on live dashboard; only one per company should be 1',
  `legacy_node_id` INT DEFAULT NULL COMMENT 'Source nodes.id for audit',
  `created_by` INT DEFAULT NULL COMMENT 'FK -> users.id',
  `updated_by` INT DEFAULT NULL COMMENT 'FK -> users.id',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_swot_analyses_company` (`company_id`),
  KEY `idx_swot_analyses_company_current` (`company_id`, `is_current`),
  KEY `idx_swot_analyses_status` (`status`),
  KEY `idx_swot_analyses_legacy` (`legacy_node_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------
-- 2. swot_items — Each Strength/Weakness/Opportunity/Threat is its own row
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `swot_items` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `swot_analysis_id` BIGINT NOT NULL COMMENT 'FK -> swot_analyses.id',
  `category` ENUM('strength','weakness','opportunity','threat') NOT NULL,
  `description` TEXT NOT NULL,
  `impact` ENUM('low','medium','high','critical') DEFAULT 'medium',
  `priority` ENUM('low','medium','high','critical') DEFAULT 'medium',
  `status` VARCHAR(50) NOT NULL DEFAULT 'identified' COMMENT 'identified, planning, in_progress, completed, monitoring, cancelled',
  `recommended_response` TEXT DEFAULT NULL COMMENT 'Rename of legacy action_required',
  `owner_user_id` INT DEFAULT NULL COMMENT 'FK -> users.id, nullable until resolved',
  `owner_label` VARCHAR(255) DEFAULT NULL COMMENT 'Preserves legacy free-text assigned_to: Owner, CFO, Ndu, etc.',
  `target_date` DATE DEFAULT NULL,
  `date_added` DATETIME DEFAULT NULL COMMENT 'Original JSON date_added',
  `legacy_source_key` VARCHAR(100) DEFAULT NULL COMMENT 'Original source_key for migration hint only',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_swot_items_analysis` (`swot_analysis_id`),
  KEY `idx_swot_items_category` (`category`),
  KEY `idx_swot_items_status` (`status`),
  KEY `idx_swot_items_priority` (`priority`),
  KEY `idx_swot_items_owner` (`owner_user_id`),
  CONSTRAINT `fk_swot_items_analysis` FOREIGN KEY (`swot_analysis_id`) REFERENCES `swot_analyses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------
-- 3. gps_targets — Each target is a first-class row, not trapped in JSON arrays
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `gps_targets` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `company_id` INT NOT NULL COMMENT 'FK -> companies.id, target belongs directly to company',
  `category` ENUM('strategy_general','finance','sales_marketing','personal_development') NOT NULL COMMENT 'Category is on the row, not a container',
  `title` VARCHAR(255) NOT NULL COMMENT 'Short dashboard label — first 80 chars of description if not provided',
  `description` TEXT NOT NULL COMMENT 'Full target statement',
  `priority` ENUM('low','medium','high','critical') DEFAULT 'medium',
  `impact` ENUM('low','medium','high','critical') DEFAULT NULL,
  `status` ENUM('not_started','in_progress','at_risk','completed','cancelled') NOT NULL DEFAULT 'not_started',
  `owner_user_id` INT DEFAULT NULL COMMENT 'FK -> users.id',
  `owner_label` VARCHAR(255) DEFAULT NULL COMMENT 'Preserves legacy assigned_to text',
  `due_date` DATE DEFAULT NULL,
  `progress_mode` ENUM('manual','tasks','metric') NOT NULL DEFAULT 'manual',
  `manual_progress_percentage` DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Used only when progress_mode=manual',
  `success_evidence_required` TEXT DEFAULT NULL COMMENT 'Rename of legacy evidence',
  `legacy_node_id` INT DEFAULT NULL COMMENT 'Source nodes.id for audit',
  `completed_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_gps_targets_company` (`company_id`),
  KEY `idx_gps_targets_company_category` (`company_id`, `category`),
  KEY `idx_gps_targets_status` (`status`),
  KEY `idx_gps_targets_due` (`due_date`),
  KEY `idx_gps_targets_priority` (`priority`),
  KEY `idx_gps_targets_progress_mode` (`progress_mode`),
  KEY `idx_gps_targets_legacy` (`legacy_node_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------
-- 4. gps_target_sources — Many-to-many SWOT <-> GPS (the key relationship table)
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `gps_target_sources` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `gps_target_id` BIGINT NOT NULL COMMENT 'FK -> gps_targets.id',
  `source_type` ENUM('swot_item','coaching','assessment','programme','funder','manual','legacy_unlinked') NOT NULL DEFAULT 'legacy_unlinked' COMMENT 'legacy_unlinked = migrated but no trustworthy link',
  `swot_item_id` BIGINT DEFAULT NULL COMMENT 'FK -> swot_items.id, filled only when source_type=swot_item',
  `notes` TEXT DEFAULT NULL COMMENT 'Optional reasoning for the link',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_gps_sources_target` (`gps_target_id`),
  KEY `idx_gps_sources_swot` (`swot_item_id`),
  KEY `idx_gps_sources_type` (`source_type`),
  UNIQUE KEY `uq_gps_sources_target_swot` (`gps_target_id`, `swot_item_id`),
  CONSTRAINT `fk_gps_sources_target` FOREIGN KEY (`gps_target_id`) REFERENCES `gps_targets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_gps_sources_swot` FOREIGN KEY (`swot_item_id`) REFERENCES `swot_items` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------
-- 5. gps_target_tasks — Tasks underneath the target
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `gps_target_tasks` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `gps_target_id` BIGINT NOT NULL COMMENT 'FK -> gps_targets.id',
  `title` VARCHAR(255) NOT NULL COMMENT 'Task statement',
  `description` TEXT DEFAULT NULL,
  `owner_user_id` INT DEFAULT NULL,
  `owner_label` VARCHAR(255) DEFAULT NULL,
  `due_date` DATE DEFAULT NULL,
  `status` ENUM('not_started','in_progress','completed','blocked') NOT NULL DEFAULT 'not_started',
  `sort_order` SMALLINT NOT NULL DEFAULT 0,
  `completed_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_gps_tasks_target` (`gps_target_id`),
  KEY `idx_gps_tasks_status` (`status`),
  KEY `idx_gps_tasks_due` (`due_date`),
  CONSTRAINT `fk_gps_tasks_target` FOREIGN KEY (`gps_target_id`) REFERENCES `gps_targets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------
-- 6. gps_target_updates — History of check-ins / progress reviews
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `gps_target_updates` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `gps_target_id` BIGINT NOT NULL COMMENT 'FK -> gps_targets.id',
  `progress_percentage` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `status` VARCHAR(50) NOT NULL DEFAULT 'not_started',
  `note` TEXT DEFAULT NULL,
  `recorded_by` INT DEFAULT NULL COMMENT 'FK -> users.id',
  `recorded_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_gps_updates_target` (`gps_target_id`),
  KEY `idx_gps_updates_recorded_at` (`recorded_at`),
  KEY `idx_gps_updates_status` (`status`),
  CONSTRAINT `fk_gps_updates_target` FOREIGN KEY (`gps_target_id`) REFERENCES `gps_targets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------
-- 7. gps_target_metrics — Link target to metric_types for performance measurement (future: metric_records)
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `gps_target_metrics` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `gps_target_id` BIGINT NOT NULL COMMENT 'FK -> gps_targets.id',
  `metric_type_id` BIGINT NOT NULL COMMENT 'FK -> metric_types.id (metric_types.id is BIGINT in newer schema)',
  `baseline_value` DECIMAL(14,2) DEFAULT NULL,
  `target_value` DECIMAL(14,2) NOT NULL,
  `current_value` DECIMAL(14,2) DEFAULT NULL COMMENT 'Read from metric_records or manual',
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_gps_metrics_target` (`gps_target_id`),
  KEY `idx_gps_metrics_type` (`metric_type_id`),
  UNIQUE KEY `uq_gps_metrics_target_type` (`gps_target_id`, `metric_type_id`),
  CONSTRAINT `fk_gps_metrics_target` FOREIGN KEY (`gps_target_id`) REFERENCES `gps_targets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
  -- FK to metric_types omitted to avoid type mismatch across schemas; enforced at app layer
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS=1;
