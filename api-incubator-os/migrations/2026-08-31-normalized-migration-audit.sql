-- Normalized migration audit log — Sprint 005 hardening
-- Admin HTTP preview/migrate should leave a traceable record for future Admin UI (Preview -> Run).
-- Run: mysql -u docker -pdocker incubator_os < migrations/2026-08-31-normalized-migration-audit.sql

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;

CREATE TABLE IF NOT EXISTS `normalized_migration_audits` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` INT DEFAULT NULL COMMENT 'FK -> users.id, who ran preview/migrate',
  `user_email` VARCHAR(255) DEFAULT NULL,
  `user_role` VARCHAR(100) DEFAULT NULL,
  `action` ENUM('preview','migrate','migrate-all','clear','counts') NOT NULL,
  `company_ids` JSON DEFAULT NULL COMMENT 'Requested companyIds array, e.g. [59,11]',
  `confirm_provided` VARCHAR(100) DEFAULT NULL COMMENT 'Confirmation string for migrate, if any',
  `result_summary` JSON DEFAULT NULL COMMENT 'Full migrator summary (counts, duplicates_flagged, rolled_back, etc.)',
  `errors` JSON DEFAULT NULL COMMENT 'errors array from migrator, if any',
  `status` ENUM('success','error') NOT NULL DEFAULT 'success',
  `error_message` TEXT DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_user` (`user_id`),
  KEY `idx_audit_action` (`action`),
  KEY `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS=1;
