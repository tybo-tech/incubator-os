-- Achievements — Sprint 007 Phase 4 (schema guard)
-- Date: 2026-09-16
--
-- Adds a DB-level guarantee that an achievement can hold at most ONE metric snapshot.
-- The verification flow already takes a row lock (SELECT ... FOR UPDATE) and re-checks status;
-- this unique functional index makes duplicate snapshots impossible even under a race.
--
-- Implemented as a functional unique index (MySQL 8.0.13+) because a stored generated column
-- derived from `achievement_id` (a foreign-key column) is rejected by InnoDB (error 1215).
--
-- Guarded + idempotent (information_schema check; MySQL 8.0.43 does not reliably support
-- ADD INDEX IF NOT EXISTS).
--
-- Run locally:
--   Get-Content api-incubator-os/migrations/2026-09-16-achievements-snapshot-guard.sql -Raw | podman exec -i incubator-os-mysql-container mysql -u docker -pdocker incubator_os
--
-- Rollback (manual):
--   ALTER TABLE `achievement_evidence` DROP INDEX `uq_evidence_metric_snapshot`;

SET NAMES utf8mb4;

SET @hasidx := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'achievement_evidence'
    AND INDEX_NAME = 'uq_evidence_metric_snapshot'
);
SET @sql := IF(@hasidx = 0,
  'ALTER TABLE `achievement_evidence` ADD UNIQUE KEY `uq_evidence_metric_snapshot` ((CASE WHEN `source_type` = ''metric_snapshot'' THEN `achievement_id` ELSE NULL END))',
  'SELECT ''uq_evidence_metric_snapshot already exists'' AS note');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
