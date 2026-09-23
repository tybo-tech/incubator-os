-- =====================================================================
-- Incubator OS - Sprint 007/008/009 PREFLIGHT (READ-ONLY, SINGLE RESULT)
-- =====================================================================
-- WHY THIS FILE: phpMyAdmin's SQL tab shows only the LAST statement's result
-- grid. A multi-statement script therefore appears to "return nothing". This
-- file is ONE statement (a UNION ALL), so phpMyAdmin always shows one grid.
--
-- HOW TO RUN (manual, phpMyAdmin):
--   1. Select the production database `rbttaces_api` in the left tree.
--   2. SQL tab -> paste this whole file -> Go.
--   3. One grid appears: SECTION | ITEM | VALUE.
--   4. Screenshot / export that grid and hand it back.
--
-- READ-ONLY. Writes nothing. Reads no protected file.
-- =====================================================================

SELECT 'A. ENVIRONMENT' AS section, 'database' AS item, DATABASE() AS value
UNION ALL SELECT 'A. ENVIRONMENT', 'mysql_version', VERSION()
UNION ALL SELECT 'A. ENVIRONMENT', 'default_engine', @@default_storage_engine
UNION ALL SELECT 'A. ENVIRONMENT', 'mysql_8_0_16_ok',
  IF(CAST(SUBSTRING_INDEX(VERSION(),'.',2) AS DECIMAL(4,1)) >= 8.0 AND
     CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(VERSION(),'.',3),'.',-1) AS UNSIGNED) >= 16 OR
     CAST(SUBSTRING_INDEX(VERSION(),'.',1) AS UNSIGNED) > 8, 'YES', 'NO - STOP')

-- ---- 007a Results/Achievements ----
UNION ALL SELECT 'B. 007a RESULTS/ACHIEVEMENTS',
  'tables_present (expect 3)',
  (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()
     AND TABLE_NAME IN ('metric_type_accounts','achievements','achievement_evidence'))
UNION ALL SELECT 'B. 007a RESULTS/ACHIEVEMENTS',
  'gps_target_metrics_new_columns (expect 9)',
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
     AND TABLE_NAME='gps_target_metrics' AND COLUMN_NAME IN
     ('baseline_period_type','baseline_period_ref','target_period_type','target_period_ref',
      'direction','calculation_method','maintain_tolerance_value','maintain_tolerance_unit','calculation_version'))
UNION ALL SELECT 'B. 007a RESULTS/ACHIEVEMENTS',
  'fks_present (expect 3)',
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE()
     AND CONSTRAINT_TYPE='FOREIGN KEY'
     AND CONSTRAINT_NAME IN ('fk_achievements_target','fk_achievements_supersedes','fk_evidence_achievement'))
UNION ALL SELECT 'B. 007a RESULTS/ACHIEVEMENTS', 'status',
  CASE
    WHEN (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()
            AND TABLE_NAME IN ('metric_type_accounts','achievements','achievement_evidence'))=0
     AND (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
            AND TABLE_NAME='gps_target_metrics' AND COLUMN_NAME='calculation_version')=0
      THEN 'MISSING - safe to apply 007a'
    WHEN (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()
            AND TABLE_NAME IN ('metric_type_accounts','achievements','achievement_evidence'))=3
      THEN 'PRESENT - skip 007a'
    ELSE 'PARTIAL - STOP'
  END

-- ---- 007b snapshot guard ----
UNION ALL SELECT 'C. 007b SNAPSHOT GUARD', 'uq_evidence_metric_snapshot (expect 1)',
  (SELECT COUNT(DISTINCT INDEX_NAME) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE()
     AND TABLE_NAME='achievement_evidence' AND INDEX_NAME='uq_evidence_metric_snapshot')
UNION ALL SELECT 'C. 007b SNAPSHOT GUARD', 'status',
  CASE
    WHEN (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()
            AND TABLE_NAME='achievement_evidence')=0 THEN 'BLOCKED - run 007a first'
    WHEN (SELECT COUNT(DISTINCT INDEX_NAME) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE()
            AND TABLE_NAME='achievement_evidence' AND INDEX_NAME='uq_evidence_metric_snapshot')=1
      THEN 'PRESENT - skip 007b'
    ELSE 'MISSING - safe to apply 007b'
  END

-- ---- 008 Calendar ----
UNION ALL SELECT 'D. 008 CALENDAR', 'tables_present (expect 2)',
  (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()
     AND TABLE_NAME IN ('calendar_events','calendar_event_links'))
UNION ALL SELECT 'D. 008 CALENDAR', 'chk_cal_time_shape (expect 1)',
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE()
     AND CONSTRAINT_TYPE='CHECK' AND CONSTRAINT_NAME='chk_cal_time_shape')
UNION ALL SELECT 'D. 008 CALENDAR', 'fks_present (expect 2)',
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE()
     AND CONSTRAINT_TYPE='FOREIGN KEY' AND CONSTRAINT_NAME IN ('fk_cal_company','fk_cal_link_event'))
UNION ALL SELECT 'D. 008 CALENDAR', 'status',
  CASE
    WHEN (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()
            AND TABLE_NAME IN ('calendar_events','calendar_event_links'))=0
      THEN 'MISSING - safe to apply 008'
    WHEN (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()
            AND TABLE_NAME IN ('calendar_events','calendar_event_links'))=2
     AND (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE()
            AND CONSTRAINT_TYPE='CHECK' AND CONSTRAINT_NAME='chk_cal_time_shape')=1
      THEN 'PRESENT - skip 008'
    ELSE 'PARTIAL - STOP'
  END

-- ---- 009 Sessions ----
UNION ALL SELECT 'E. 009 SESSIONS', 'tables_present (expect 7)',
  (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()
     AND TABLE_NAME IN ('sessions','session_participants','session_agenda_items','session_notes',
                        'session_decisions','session_entity_links','session_activities'))
UNION ALL SELECT 'E. 009 SESSIONS', 'fks_present (expect 2)',
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE()
     AND CONSTRAINT_TYPE='FOREIGN KEY' AND CONSTRAINT_NAME IN ('fk_sessions_company','fk_sessions_event'))
UNION ALL SELECT 'E. 009 SESSIONS', 'calendar_before_sessions',
  CASE
    WHEN (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sessions')=1
     AND (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='calendar_events')=0
      THEN 'VIOLATED - STOP'
    ELSE 'OK'
  END
UNION ALL SELECT 'E. 009 SESSIONS', 'status',
  CASE
    WHEN (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()
            AND TABLE_NAME IN ('sessions','session_participants','session_agenda_items','session_notes',
                               'session_decisions','session_entity_links','session_activities'))=0
      THEN 'MISSING - safe to apply 009 (AFTER 008)'
    WHEN (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()
            AND TABLE_NAME IN ('sessions','session_participants','session_agenda_items','session_notes',
                               'session_decisions','session_entity_links','session_activities'))=7
      THEN 'PRESENT - skip 009'
    ELSE 'PARTIAL - STOP'
  END

-- ---- Prerequisites ----
UNION ALL SELECT 'F. PREREQUISITES', 'companies',
  (SELECT COUNT(*) FROM companies)
UNION ALL SELECT 'F. PREREQUISITES', 'users',
  (SELECT COUNT(*) FROM users)
UNION ALL SELECT 'F. PREREQUISITES', 'gps_targets',
  (SELECT COUNT(*) FROM gps_targets)
UNION ALL SELECT 'F. PREREQUISITES', 'metric_types',
  (SELECT COUNT(*) FROM metric_types)
UNION ALL SELECT 'F. PREREQUISITES', 'company_accounts',
  (SELECT COUNT(*) FROM company_accounts)
UNION ALL SELECT 'F. PREREQUISITES', 'company_financial_yearly_stats',
  (SELECT COUNT(*) FROM company_financial_yearly_stats)

-- ---- Sprint 007 readiness (measured live, not assumed) ----
UNION ALL SELECT 'G. 007 READINESS', 'unresolved_account_rows (account_id IS NULL)',
  (SELECT COUNT(*) FROM company_financial_yearly_stats WHERE account_id IS NULL)
UNION ALL SELECT 'G. 007 READINESS', 'companies_with_unresolved_rows',
  (SELECT COUNT(DISTINCT company_id) FROM company_financial_yearly_stats WHERE account_id IS NULL)
UNION ALL SELECT 'G. 007 READINESS', 'export_account_rows (is_active=1)',
  (SELECT COUNT(*) FROM company_accounts WHERE account_type='export_revenue' AND is_active=1)
UNION ALL SELECT 'G. 007 READINESS', 'companies_with_export_accounts',
  (SELECT COUNT(DISTINCT company_id) FROM company_accounts WHERE account_type='export_revenue' AND is_active=1)

-- ---- Existing data in the new tables (0 expected on a first deploy) ----
-- Uses information_schema.TABLE_ROWS (approximate for InnoDB) so a missing
-- table cannot error the statement. -1 means the table does not exist yet.
UNION ALL SELECT 'H. EXISTING NEW-TABLE DATA (approx rows)', 'achievements',
  IFNULL((SELECT MAX(TABLE_ROWS) FROM information_schema.TABLES
          WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='achievements'), -1)
UNION ALL SELECT 'H. EXISTING NEW-TABLE DATA (approx rows)', 'achievement_evidence',
  IFNULL((SELECT MAX(TABLE_ROWS) FROM information_schema.TABLES
          WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='achievement_evidence'), -1)
UNION ALL SELECT 'H. EXISTING NEW-TABLE DATA (approx rows)', 'metric_type_accounts',
  IFNULL((SELECT MAX(TABLE_ROWS) FROM information_schema.TABLES
          WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='metric_type_accounts'), -1)
UNION ALL SELECT 'H. EXISTING NEW-TABLE DATA (approx rows)', 'calendar_events',
  IFNULL((SELECT MAX(TABLE_ROWS) FROM information_schema.TABLES
          WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='calendar_events'), -1)
UNION ALL SELECT 'H. EXISTING NEW-TABLE DATA (approx rows)', 'sessions',
  IFNULL((SELECT MAX(TABLE_ROWS) FROM information_schema.TABLES
          WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sessions'), -1)
-- (-1 means the table does not exist yet.)

-- ---- Collision scan ----
UNION ALL SELECT 'I. COLLISIONS', 'non_innodb_or_non_table_objects (expect 0)',
  (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()
     AND TABLE_NAME IN ('metric_type_accounts','achievements','achievement_evidence',
        'calendar_events','calendar_event_links','sessions','session_participants',
        'session_agenda_items','session_notes','session_decisions','session_entity_links','session_activities')
     AND (TABLE_TYPE <> 'BASE TABLE' OR ENGINE IS NULL OR ENGINE <> 'InnoDB'))

-- ---- Deployment readiness ----
UNION ALL SELECT 'J. VERDICT', '007a_action',
  CASE WHEN (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()
          AND TABLE_NAME IN ('metric_type_accounts','achievements','achievement_evidence'))=3
       THEN 'SKIP' ELSE 'APPLY' END
UNION ALL SELECT 'J. VERDICT', '007b_action',
  CASE WHEN (SELECT COUNT(DISTINCT INDEX_NAME) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE()
          AND TABLE_NAME='achievement_evidence' AND INDEX_NAME='uq_evidence_metric_snapshot')=1
       THEN 'SKIP' ELSE 'APPLY (after 007a)' END
UNION ALL SELECT 'J. VERDICT', '008_action',
  CASE WHEN (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()
          AND TABLE_NAME IN ('calendar_events','calendar_event_links'))=2
       THEN 'SKIP' ELSE 'APPLY' END
UNION ALL SELECT 'J. VERDICT', '009_action',
  CASE WHEN (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()
          AND TABLE_NAME IN ('sessions','session_participants','session_agenda_items','session_notes',
                             'session_decisions','session_entity_links','session_activities'))=7
       THEN 'SKIP' ELSE 'APPLY (after 008)' END
UNION ALL SELECT 'J. VERDICT', 'any_partial_blocker',
  CASE
    WHEN ((SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()
             AND TABLE_NAME IN ('metric_type_accounts','achievements','achievement_evidence')) BETWEEN 1 AND 2)
      OR ((SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()
             AND TABLE_NAME IN ('calendar_events','calendar_event_links'))=1)
      OR ((SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()
             AND TABLE_NAME IN ('sessions','session_participants','session_agenda_items','session_notes',
                                'session_decisions','session_entity_links','session_activities')) BETWEEN 1 AND 6)
      THEN 'YES - STOP AND REPORT'
    ELSE 'NO'
  END;
