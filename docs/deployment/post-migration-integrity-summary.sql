-- =====================================================================
-- Incubator OS - Sprint 007/008/009 POST-MIGRATION INTEGRITY (SINGLE RESULT)
-- =====================================================================
-- WHY THIS FILE: phpMyAdmin's SQL tab shows only the LAST statement's result
-- grid. This file is ONE statement (a UNION ALL) so phpMyAdmin always shows
-- one grid. Run it after each migration and again after all four.
--
-- HOW TO RUN (manual, phpMyAdmin):
--   1. Select `rbttaces_api` in the left tree.
--   2. SQL tab -> paste this whole file -> Go.
--   3. One grid appears: section | item | value.
--   4. Any item whose name ends in "(expect 0)" must be 0. Anything else is a
--      defect - STOP and report; do not deploy code on a broken schema.
--
-- NOTE: run this AFTER the migrations. It reads the deployed tables directly,
-- so it requires 007 (and, for the session checks, 008+009) to be applied. Use
-- `preflight-summary-readonly.sql` for the pre-migration check.
--
-- READ-ONLY. Writes nothing.
-- =====================================================================

SELECT 'A. STRUCTURE' AS section, 'metric_type_accounts' AS item,
  (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='metric_type_accounts') AS value
UNION ALL SELECT 'A. STRUCTURE', 'achievements',
  (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='achievements')
UNION ALL SELECT 'A. STRUCTURE', 'achievement_evidence',
  (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='achievement_evidence')
UNION ALL SELECT 'A. STRUCTURE', 'index uq_evidence_metric_snapshot',
  (SELECT COUNT(DISTINCT INDEX_NAME) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE()
     AND TABLE_NAME='achievement_evidence' AND INDEX_NAME='uq_evidence_metric_snapshot')
UNION ALL SELECT 'A. STRUCTURE', 'calendar_events',
  (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='calendar_events')
UNION ALL SELECT 'A. STRUCTURE', 'calendar_event_links',
  (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='calendar_event_links')
UNION ALL SELECT 'A. STRUCTURE', 'check chk_cal_time_shape',
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE()
     AND TABLE_NAME='calendar_events' AND CONSTRAINT_TYPE='CHECK' AND CONSTRAINT_NAME='chk_cal_time_shape')
UNION ALL SELECT 'A. STRUCTURE', 'sessions',
  (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sessions')
UNION ALL SELECT 'A. STRUCTURE', 'session_participants',
  (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='session_participants')
UNION ALL SELECT 'A. STRUCTURE', 'session_agenda_items',
  (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='session_agenda_items')
UNION ALL SELECT 'A. STRUCTURE', 'session_notes',
  (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='session_notes')
UNION ALL SELECT 'A. STRUCTURE', 'session_decisions',
  (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='session_decisions')
UNION ALL SELECT 'A. STRUCTURE', 'session_entity_links',
  (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='session_entity_links')
UNION ALL SELECT 'A. STRUCTURE', 'session_activities',
  (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='session_activities')
UNION ALL SELECT 'A. STRUCTURE', 'fk fk_sessions_event',
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE()
     AND TABLE_NAME='sessions' AND CONSTRAINT_TYPE='FOREIGN KEY' AND CONSTRAINT_NAME='fk_sessions_event')

-- ---- Invariants (each must be 0). Guarded with IFNULL/EXISTS so a missing
--      table reports -1 instead of aborting the statement. ----
UNION ALL SELECT 'B. INVARIANTS (expect 0)', 'duplicate metric snapshots',
  IFNULL((SELECT COUNT(*) FROM (
      SELECT achievement_id FROM achievement_evidence WHERE source_type='metric_snapshot'
      GROUP BY achievement_id HAVING COUNT(*)>1) x), 0)
UNION ALL SELECT 'B. INVARIANTS (expect 0)', 'orphan evidence (no parent achievement)',
  IF(NULLIF((SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='achievement_evidence'),0) IS NULL, -1,
     (SELECT COUNT(*) FROM achievement_evidence e LEFT JOIN achievements a ON a.id=e.achievement_id WHERE a.id IS NULL))
UNION ALL SELECT 'B. INVARIANTS (expect 0)', 'cross-company achievement target',
  IF(NULLIF((SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='achievements'),0) IS NULL, -1,
     (SELECT COUNT(*) FROM achievements a JOIN gps_targets t ON t.id=a.gps_target_id WHERE t.company_id<>a.company_id))
UNION ALL SELECT 'B. INVARIANTS (expect 0)', 'invalid calendar time shape',
  IF(NULLIF((SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='calendar_events'),0) IS NULL, -1,
     (SELECT COUNT(*) FROM calendar_events WHERE NOT (
        (all_day=1 AND start_date IS NOT NULL AND end_date IS NOT NULL AND start_at IS NULL AND end_at IS NULL)
     OR (all_day=0 AND start_at IS NOT NULL AND end_at IS NOT NULL AND timezone IS NOT NULL AND start_date IS NULL AND end_date IS NULL))))
UNION ALL SELECT 'B. INVARIANTS (expect 0)', 'sessions missing tenant_id',
  IF(NULLIF((SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sessions'),0) IS NULL, -1,
     (SELECT COUNT(*) FROM sessions WHERE tenant_id IS NULL))
UNION ALL SELECT 'B. INVARIANTS (expect 0)', 'duplicate session links',
  IFNULL((SELECT COUNT(*) FROM (
      SELECT session_id FROM session_entity_links
      GROUP BY session_id, entity_type, entity_id, relationship HAVING COUNT(*)>1) y), 0)
UNION ALL SELECT 'B. INVARIANTS (expect 0)', 'duplicate session participants',
  IFNULL((SELECT COUNT(*) FROM (
      SELECT session_id FROM session_participants
      GROUP BY session_id, dedupe_key HAVING COUNT(*)>1) z), 0)
UNION ALL SELECT 'B. INVARIANTS (expect 0)', 'orphan session activities',
  IF(NULLIF((SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='session_activities'),0) IS NULL, -1,
     (SELECT COUNT(*) FROM session_activities a LEFT JOIN sessions s ON s.id=a.session_id WHERE s.id IS NULL))

-- ---- Readiness carried forward ----
UNION ALL SELECT 'C. 007 READINESS', 'seeded bindings',
  IFNULL((SELECT MAX(TABLE_ROWS) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='metric_type_accounts'), -1)
UNION ALL SELECT 'C. 007 READINESS', 'unresolved_account_rows',
  (SELECT COUNT(*) FROM company_financial_yearly_stats WHERE account_id IS NULL)
UNION ALL SELECT 'C. 007 READINESS', 'companies_with_export_accounts',
  (SELECT COUNT(DISTINCT company_id) FROM company_accounts WHERE account_type='export_revenue' AND is_active=1)

-- ---- Deployed row counts (evidence). -1 = table absent. ----
UNION ALL SELECT 'D. ROW COUNTS', 'achievements (approx)',
  IFNULL((SELECT MAX(TABLE_ROWS) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='achievements'), -1)
UNION ALL SELECT 'D. ROW COUNTS', 'achievement_evidence (approx)',
  IFNULL((SELECT MAX(TABLE_ROWS) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='achievement_evidence'), -1)
UNION ALL SELECT 'D. ROW COUNTS', 'calendar_events (approx)',
  IFNULL((SELECT MAX(TABLE_ROWS) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='calendar_events'), -1)
UNION ALL SELECT 'D. ROW COUNTS', 'sessions (approx)',
  IFNULL((SELECT MAX(TABLE_ROWS) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sessions'), -1)
UNION ALL SELECT 'D. ROW COUNTS', 'session_activities (approx)',
  IFNULL((SELECT MAX(TABLE_ROWS) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='session_activities'), -1);
