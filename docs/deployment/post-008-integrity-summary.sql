-- =====================================================================
-- Incubator OS - Sprint 007/008 POST-MIGRATION INTEGRITY (SINGLE RESULT)
-- STAGE 1 of 2 - run this AFTER applying 2026-09-19-calendar-events.sql (008),
-- BEFORE applying 2026-09-23-sessions.sql (009).
-- =====================================================================
-- WHY THIS FILE: the full post-migration checker reads the session tables,
-- which do not exist until 009. MySQL resolves table references even inside a
-- guarded IF(), so running the full checker between 008 and 009 fails with
-- #1146. This stage-1 file therefore checks only the 007 and 008 objects.
-- After 009, run `post-migration-integrity-summary.sql` (stage 2) instead.
--
-- phpMyAdmin shows only the LAST statement's result grid, so this file is ONE
-- statement (a UNION ALL) - it always shows one grid.
--
-- HOW TO RUN (manual, phpMyAdmin):
--   1. Select `rbttaces_api` in the left tree.
--   2. SQL tab -> paste this whole file -> Go.
--   3. One grid appears: section | item | value.
--   4. Every item ending "(expect 0)" must be 0. Section A objects must be 1.
--
-- READ-ONLY. Writes nothing.
-- =====================================================================

SELECT 'A. STRUCTURE (expect 1)' AS section, 'metric_type_accounts' AS item,
  (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='metric_type_accounts') AS value
UNION ALL SELECT 'A. STRUCTURE (expect 1)', 'achievements',
  (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='achievements')
UNION ALL SELECT 'A. STRUCTURE (expect 1)', 'achievement_evidence',
  (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='achievement_evidence')
UNION ALL SELECT 'A. STRUCTURE (expect 1)', 'index uq_evidence_metric_snapshot',
  (SELECT COUNT(DISTINCT INDEX_NAME) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE()
     AND TABLE_NAME='achievement_evidence' AND INDEX_NAME='uq_evidence_metric_snapshot')
UNION ALL SELECT 'A. STRUCTURE (expect 1)', 'calendar_events',
  (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='calendar_events')
UNION ALL SELECT 'A. STRUCTURE (expect 1)', 'calendar_event_links',
  (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='calendar_event_links')
UNION ALL SELECT 'A. STRUCTURE (expect 1)', 'check chk_cal_time_shape',
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE()
     AND TABLE_NAME='calendar_events' AND CONSTRAINT_TYPE='CHECK' AND CONSTRAINT_NAME='chk_cal_time_shape')
UNION ALL SELECT 'A. STRUCTURE (expect 1)', 'fk fk_cal_company',
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE()
     AND TABLE_NAME='calendar_events' AND CONSTRAINT_TYPE='FOREIGN KEY' AND CONSTRAINT_NAME='fk_cal_company')
UNION ALL SELECT 'A. STRUCTURE (expect 1)', 'fk fk_cal_link_event',
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE()
     AND TABLE_NAME='calendar_event_links' AND CONSTRAINT_TYPE='FOREIGN KEY' AND CONSTRAINT_NAME='fk_cal_link_event')
UNION ALL SELECT 'A. STRUCTURE (expect 1)', 'gps_target_metrics measurement columns',
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
     AND TABLE_NAME='gps_target_metrics' AND COLUMN_NAME IN
     ('baseline_period_type','baseline_period_ref','target_period_type','target_period_ref',
      'direction','calculation_method','maintain_tolerance_value','maintain_tolerance_unit','calculation_version'))

-- ---- Invariants (each must be 0). These tables exist after 007 + 008. ----
UNION ALL SELECT 'B. INVARIANTS (expect 0)', 'duplicate metric snapshots',
  IFNULL((SELECT COUNT(*) FROM (
      SELECT achievement_id FROM achievement_evidence WHERE source_type='metric_snapshot'
      GROUP BY achievement_id HAVING COUNT(*)>1) x), 0)
UNION ALL SELECT 'B. INVARIANTS (expect 0)', 'orphan evidence (no parent achievement)',
  (SELECT COUNT(*) FROM achievement_evidence e LEFT JOIN achievements a ON a.id=e.achievement_id WHERE a.id IS NULL)
UNION ALL SELECT 'B. INVARIANTS (expect 0)', 'cross-company achievement target',
  (SELECT COUNT(*) FROM achievements a JOIN gps_targets t ON t.id=a.gps_target_id WHERE t.company_id<>a.company_id)
UNION ALL SELECT 'B. INVARIANTS (expect 0)', 'invalid calendar time shape',
  (SELECT COUNT(*) FROM calendar_events WHERE NOT (
     (all_day=1 AND start_date IS NOT NULL AND end_date IS NOT NULL AND start_at IS NULL AND end_at IS NULL)
  OR (all_day=0 AND start_at IS NOT NULL AND end_at IS NOT NULL AND timezone IS NOT NULL AND start_date IS NULL AND end_date IS NULL)))

-- ---- Readiness carried forward ----
UNION ALL SELECT 'C. 007 READINESS', 'seeded bindings',
  IFNULL((SELECT MAX(TABLE_ROWS) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='metric_type_accounts'), -1)
UNION ALL SELECT 'C. 007 READINESS', 'unresolved_account_rows',
  (SELECT COUNT(*) FROM company_financial_yearly_stats WHERE account_id IS NULL)
UNION ALL SELECT 'C. 007 READINESS', 'companies_with_export_accounts',
  (SELECT COUNT(DISTINCT company_id) FROM company_accounts WHERE account_type='export_revenue' AND is_active=1)

-- ---- Row counts (evidence; -1 = table absent) ----
UNION ALL SELECT 'D. ROW COUNTS (approx)', 'achievements',
  IFNULL((SELECT MAX(TABLE_ROWS) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='achievements'), -1)
UNION ALL SELECT 'D. ROW COUNTS (approx)', 'achievement_evidence',
  IFNULL((SELECT MAX(TABLE_ROWS) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='achievement_evidence'), -1)
UNION ALL SELECT 'D. ROW COUNTS (approx)', 'calendar_events',
  IFNULL((SELECT MAX(TABLE_ROWS) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='calendar_events'), -1)
UNION ALL SELECT 'D. ROW COUNTS (approx)', 'calendar_event_links',
  IFNULL((SELECT MAX(TABLE_ROWS) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='calendar_event_links'), -1);
