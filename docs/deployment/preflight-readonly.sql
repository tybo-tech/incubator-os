-- =====================================================================
-- Incubator OS - Sprint 007/008/009 production PREFLIGHT (READ-ONLY)
-- =====================================================================
-- Purpose : decide, before any change, whether production can receive the
--           Results/Achievements (007), Calendar (008) and Sessions (009)
--           migrations. Every statement is a SELECT. Nothing is modified.
--
-- How to run (user, manual, phpMyAdmin only):
--   1. Open phpMyAdmin against the production database `rbttaces_api`.
--   2. Select that database in the left tree so it is the active schema.
--   3. Open the SQL tab and Run the WHOLE file once. Sections A-C, F, G and H
--      are fully self-guarded (they read only information_schema or wrap table
--      reads in prepared statements that degrade to a "missing" note). Sections
--      D and E read only pre-existing core tables (companies, users, gps_*,
--      metric_types, company_accounts, ...) that predate all three sprints, so
--      they are safe on any live Incubator OS database. If your phpMyAdmin
--      aborts early, run it in three passes instead:
--        PASS 1  Sections A-C  (pure information_schema - always safe)
--        PASS 2  Sections D-E  (pre-existing tables + guarded counts)
--        PASS 3  Sections F-H  (new tables + collision/column checks)
--   4. Record every result grid verbatim and hand it back for review.
--
-- HARD RULE: a migration classified PARTIAL - STOP or PRESENT BUT INVALID -
-- STOP must NOT be re-run blindly. Stop and report; a partial schema needs a
-- decision (reconcile or restore), never a blind import.
--
-- This file never writes, never drops, never alters and never reads a
-- protected file. It only queries information_schema + data tables.
-- =====================================================================

SET @db := DATABASE();

-- #####################################################################
-- PASS 1
-- #####################################################################

-- =====================================================================
-- SECTION A - Environment
-- =====================================================================
SELECT
  @db AS database_name,
  VERSION() AS mysql_version,
  @@sql_mode AS sql_mode,
  @@default_storage_engine AS default_engine,
  (SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = @db) AS schema_exists;

-- =====================================================================
-- SECTION B - Migration classification matrix
--   MISSING | PARTIAL - STOP | PRESENT | PRESENT BUT INVALID - STOP
--   exp_* are the object counts this preflight EXPECTS; got_* are live.
-- =====================================================================
SELECT '007a-results-achievements' AS migration,
  3 AS exp_tables,
  (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db
     AND TABLE_NAME IN ('metric_type_accounts','achievements','achievement_evidence')) AS got_tables,
  25 AS exp_columns,
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND
     CONCAT(TABLE_NAME,'.',COLUMN_NAME) IN (
       'metric_type_accounts.metric_type_id','metric_type_accounts.account_type','metric_type_accounts.account_id',
       'metric_type_accounts.combine_mode','metric_type_accounts.account_id_key',
       'achievements.company_id','achievements.kind','achievements.verification_status','achievements.supersedes_id',
       'achievements.achieved_on','achievements.gps_target_id','achievements.recorded_by','achievements.verified_by',
       'achievement_evidence.achievement_id','achievement_evidence.source_type','achievement_evidence.snapshot_json',
       'gps_target_metrics.baseline_period_type','gps_target_metrics.baseline_period_ref',
       'gps_target_metrics.target_period_type','gps_target_metrics.target_period_ref',
       'gps_target_metrics.direction','gps_target_metrics.calculation_method',
       'gps_target_metrics.maintain_tolerance_value','gps_target_metrics.maintain_tolerance_unit',
       'gps_target_metrics.calculation_version')) AS got_columns,
  3 AS exp_fks,
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=@db
     AND CONSTRAINT_TYPE='FOREIGN KEY'
     AND CONSTRAINT_NAME IN ('fk_achievements_target','fk_achievements_supersedes','fk_evidence_achievement')) AS got_fks,
  CASE
    WHEN (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db
            AND TABLE_NAME IN ('metric_type_accounts','achievements','achievement_evidence')) = 0
     AND (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db
            AND TABLE_NAME='gps_target_metrics' AND COLUMN_NAME IN ('calculation_version','baseline_period_type')) = 0
      THEN 'MISSING: safe to run 007a first'
    WHEN (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db
            AND TABLE_NAME IN ('metric_type_accounts','achievements','achievement_evidence')) = 3
     AND (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db
            AND CONCAT(TABLE_NAME,'.',COLUMN_NAME) IN ('metric_type_accounts.account_id_key',
              'achievements.verification_status','achievement_evidence.snapshot_json',
              'gps_target_metrics.calculation_version',
              'gps_target_metrics.baseline_period_type','gps_target_metrics.target_period_ref',
              'gps_target_metrics.direction','gps_target_metrics.maintain_tolerance_unit')) = 8
     AND (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=@db
            AND CONSTRAINT_TYPE='FOREIGN KEY'
            AND CONSTRAINT_NAME IN ('fk_achievements_target','fk_achievements_supersedes','fk_evidence_achievement')) = 3
      THEN 'PRESENT: safe to skip 007a'
    WHEN (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db
            AND TABLE_NAME IN ('metric_type_accounts','achievements','achievement_evidence')) = 3
      THEN 'PRESENT BUT INVALID - STOP: tables exist but structure differs'
    ELSE 'PARTIAL - STOP: some 007a objects exist; do not import blindly'
  END AS status

UNION ALL

SELECT '007b-snapshot-guard' AS migration,
  0 AS exp_tables,
  (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db
     AND TABLE_NAME='achievement_evidence') AS got_tables,
  0 AS exp_columns,
  0 AS got_columns,
  1 AS exp_fks,
  (SELECT COUNT(DISTINCT INDEX_NAME) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=@db
     AND TABLE_NAME='achievement_evidence' AND INDEX_NAME='uq_evidence_metric_snapshot') AS got_fks,
  CASE
    WHEN (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db
            AND TABLE_NAME='achievement_evidence') = 0
      THEN 'MISSING (blocked): run 007a first'
    WHEN (SELECT COUNT(DISTINCT INDEX_NAME) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=@db
            AND TABLE_NAME='achievement_evidence' AND INDEX_NAME='uq_evidence_metric_snapshot') = 1
      THEN 'PRESENT: safe to skip 007b'
    ELSE 'MISSING: safe to run 007b'
  END AS status

UNION ALL

SELECT '008-calendar-events' AS migration,
  2 AS exp_tables,
  (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db
     AND TABLE_NAME IN ('calendar_events','calendar_event_links')) AS got_tables,
  17 AS exp_columns,
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND
     CONCAT(TABLE_NAME,'.',COLUMN_NAME) IN (
       'calendar_events.tenant_id','calendar_events.company_id','calendar_events.created_by',
       'calendar_events.category','calendar_events.status','calendar_events.all_day',
       'calendar_events.timezone','calendar_events.start_date','calendar_events.end_date',
       'calendar_events.start_at','calendar_events.end_at','calendar_events.version',
       'calendar_events.client_token','calendar_events.deleted_at',
       'calendar_event_links.calendar_event_id','calendar_event_links.entity_type',
       'calendar_event_links.entity_id')) AS got_columns,
  2 AS exp_fks,
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=@db
     AND CONSTRAINT_TYPE='FOREIGN KEY'
     AND CONSTRAINT_NAME IN ('fk_cal_company','fk_cal_link_event')) AS got_fks,
  CASE
    WHEN (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db
            AND TABLE_NAME IN ('calendar_events','calendar_event_links')) = 0
      THEN 'MISSING: safe to run 008'
    WHEN (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db
            AND TABLE_NAME IN ('calendar_events','calendar_event_links')) = 2
     AND (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db
            AND CONCAT(TABLE_NAME,'.',COLUMN_NAME) IN ('calendar_events.all_day',
              'calendar_events.client_token','calendar_events.start_date','calendar_events.start_at',
              'calendar_event_links.entity_type')) = 5
     AND (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=@db
            AND CONSTRAINT_TYPE='CHECK' AND CONSTRAINT_NAME='chk_cal_time_shape') = 1
      THEN 'PRESENT: safe to skip 008'
    WHEN (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db
            AND TABLE_NAME IN ('calendar_events','calendar_event_links')) = 2
      THEN 'PRESENT BUT INVALID - STOP: tables exist but structure differs'
    ELSE 'PARTIAL - STOP: do not import blindly'
  END AS status

UNION ALL

SELECT '009-sessions' AS migration,
  7 AS exp_tables,
  (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db
     AND TABLE_NAME IN ('sessions','session_participants','session_agenda_items',
                        'session_notes','session_decisions','session_entity_links','session_activities')) AS got_tables,
  19 AS exp_columns,
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND
     CONCAT(TABLE_NAME,'.',COLUMN_NAME) IN (
       'sessions.tenant_id','sessions.company_id','sessions.calendar_event_id','sessions.status',
       'sessions.version','sessions.cancellation_reason','sessions.completed_at','sessions.cancelled_at',
       'session_participants.dedupe_key','session_participants.attendance',
       'session_agenda_items.sort_order','session_agenda_items.status',
       'session_notes.visibility','session_decisions.decision_date',
       'session_entity_links.entity_type','session_entity_links.entity_id','session_entity_links.relationship',
       'session_activities.action','session_activities.payload')) AS got_columns,
  2 AS exp_fks,
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=@db
     AND CONSTRAINT_TYPE='FOREIGN KEY'
     AND CONSTRAINT_NAME IN ('fk_sessions_company','fk_sessions_event')) AS got_fks,
  CASE
    WHEN (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db
            AND TABLE_NAME IN ('sessions','session_participants','session_agenda_items',
                               'session_notes','session_decisions','session_entity_links','session_activities')) = 0
      THEN 'MISSING: safe to run 009 (after 008)'
    WHEN (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db
            AND TABLE_NAME IN ('sessions','session_participants','session_agenda_items',
                               'session_notes','session_decisions','session_entity_links','session_activities')) = 7
     AND (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db
            AND CONCAT(TABLE_NAME,'.',COLUMN_NAME) IN ('sessions.calendar_event_id','sessions.status',
              'session_participants.dedupe_key','session_entity_links.relationship',
              'session_activities.payload')) = 5
     AND (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=@db
            AND CONSTRAINT_TYPE='FOREIGN KEY'
            AND CONSTRAINT_NAME IN ('fk_sessions_company','fk_sessions_event')) = 2
      THEN 'PRESENT: safe to skip 009'
    WHEN (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db
            AND TABLE_NAME IN ('sessions','session_participants','session_agenda_items',
                               'session_notes','session_decisions','session_entity_links','session_activities')) = 7
      THEN 'PRESENT BUT INVALID - STOP: tables exist but structure differs'
    ELSE 'PARTIAL - STOP: do not import blindly'
  END AS status;

-- =====================================================================
-- SECTION C - Calendar-before-Sessions dependency (explicit)
-- =====================================================================
SELECT '008 calendar_events must exist before 009 sessions' AS dependency_rule,
  (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db AND TABLE_NAME='calendar_events') AS calendar_events_present,
  (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db AND TABLE_NAME='sessions') AS sessions_present,
  CASE
    WHEN (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db AND TABLE_NAME='sessions') = 1
     AND (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db AND TABLE_NAME='calendar_events') = 0
      THEN 'VIOLATED - STOP: sessions present without calendar_events'
    ELSE 'OK'
  END AS verdict;

-- =====================================================================
-- SECTION D - Prerequisite tables owned by earlier sprints (all pre-date 007,
--   so they are expected to exist and are safe to count directly)
-- =====================================================================
SELECT 'companies' AS prerequisite_table, COUNT(*) AS row_count FROM companies
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'gps_targets', COUNT(*) FROM gps_targets
UNION ALL SELECT 'gps_target_metrics', COUNT(*) FROM gps_target_metrics
UNION ALL SELECT 'metric_types', COUNT(*) FROM metric_types
UNION ALL SELECT 'swot_analyses', COUNT(*) FROM swot_analyses
UNION ALL SELECT 'swot_items', COUNT(*) FROM swot_items
UNION ALL SELECT 'company_accounts', COUNT(*) FROM company_accounts
UNION ALL SELECT 'company_financial_yearly_stats', COUNT(*) FROM company_financial_yearly_stats
UNION ALL SELECT 'nodes', COUNT(*) FROM nodes;

-- =====================================================================
-- SECTION E - Sprint 007 data readiness (measure, never assume)
-- =====================================================================
SELECT 'Sprint 007 readiness' AS section,
  (SELECT COUNT(*) FROM company_financial_yearly_stats WHERE account_id IS NULL) AS unresolved_account_rows,
  (SELECT COUNT(DISTINCT company_id) FROM company_financial_yearly_stats WHERE account_id IS NULL) AS companies_with_unresolved_rows,
  (SELECT COUNT(*) FROM company_accounts WHERE account_type='domestic_revenue' AND is_active=1) AS domestic_account_rows,
  (SELECT COUNT(*) FROM company_accounts WHERE account_type='export_revenue' AND is_active=1) AS export_account_rows,
  (SELECT COUNT(DISTINCT company_id) FROM company_accounts
     WHERE account_type='export_revenue' AND is_active=1) AS companies_with_export_accounts;

-- Revenue measure definitions the seeded bindings rely on
SELECT id, code, name FROM metric_types
WHERE code IN ('REVENUE_TOTAL','REVENUE_EXPORT','REVENUE_ANNUAL');

-- Bindings actually seeded (only meaningful once metric_type_accounts exists)
SET @exists_mta := (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db AND TABLE_NAME='metric_type_accounts');
SET @s := IF(@exists_mta=1,
  'SELECT mta.id, mt.code AS measure_code, mta.account_type, mta.account_id, mta.combine_mode, mta.is_revenue
     FROM metric_type_accounts mta JOIN metric_types mt ON mt.id = mta.metric_type_id
     ORDER BY mt.code, mta.account_type',
  'SELECT ''metric_type_accounts not present yet'' AS note');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- #####################################################################
-- PASS 3
-- #####################################################################

-- =====================================================================
-- SECTION F - Existing data in the NEW tables (0 expected before first deploy)
--   Each count is guarded so a missing table cannot abort the preflight.
-- =====================================================================
SET @s := IF((SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db AND TABLE_NAME='achievements')=1,
  'SELECT ''achievements'' AS table_name, COUNT(*) AS row_count FROM achievements',
  'SELECT ''achievements'' AS table_name, ''missing'' AS row_count');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s := IF((SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db AND TABLE_NAME='achievement_evidence')=1,
  'SELECT ''achievement_evidence'' AS table_name, COUNT(*) AS row_count FROM achievement_evidence',
  'SELECT ''achievement_evidence'' AS table_name, ''missing'' AS row_count');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s := IF((SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db AND TABLE_NAME='metric_type_accounts')=1,
  'SELECT ''metric_type_accounts'' AS table_name, COUNT(*) AS row_count FROM metric_type_accounts',
  'SELECT ''metric_type_accounts'' AS table_name, ''missing'' AS row_count');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s := IF((SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db AND TABLE_NAME='calendar_events')=1,
  'SELECT ''calendar_events'' AS table_name, COUNT(*) AS row_count FROM calendar_events',
  'SELECT ''calendar_events'' AS table_name, ''missing'' AS row_count');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s := IF((SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db AND TABLE_NAME='calendar_event_links')=1,
  'SELECT ''calendar_event_links'' AS table_name, COUNT(*) AS row_count FROM calendar_event_links',
  'SELECT ''calendar_event_links'' AS table_name, ''missing'' AS row_count');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s := IF((SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db AND TABLE_NAME='sessions')=1,
  'SELECT ''sessions'' AS table_name, COUNT(*) AS row_count FROM sessions',
  'SELECT ''sessions'' AS table_name, ''missing'' AS row_count');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s := IF((SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db AND TABLE_NAME='session_activities')=1,
  'SELECT ''session_activities'' AS table_name, COUNT(*) AS row_count FROM session_activities',
  'SELECT ''session_activities'' AS table_name, ''missing'' AS row_count');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- =====================================================================
-- SECTION G - Collision / unexpected-object scan
--   Any row here is a name clash or a foreign object using a canonical name.
--   Investigate before migrating.
-- =====================================================================
SELECT TABLE_NAME, TABLE_TYPE, ENGINE, TABLE_ROWS
FROM information_schema.TABLES
WHERE TABLE_SCHEMA=@db
  AND TABLE_NAME IN (
    'metric_type_accounts','achievements','achievement_evidence',
    'calendar_events','calendar_event_links',
    'sessions','session_participants','session_agenda_items',
    'session_notes','session_decisions','session_entity_links','session_activities')
  AND (TABLE_TYPE <> 'BASE TABLE' OR ENGINE IS NULL OR ENGINE <> 'InnoDB');
-- Empty result = no collisions.

-- =====================================================================
-- SECTION H - gps_target_metrics measurement columns (007a additive set)
-- =====================================================================
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA=@db AND TABLE_NAME='gps_target_metrics'
  AND COLUMN_NAME IN (
    'baseline_period_type','baseline_period_ref','target_period_type','target_period_ref',
    'direction','calculation_method','maintain_tolerance_value','maintain_tolerance_unit',
    'calculation_version')
ORDER BY COLUMN_NAME;
-- Expect 9 rows when 007a is PRESENT; fewer when MISSING/PARTIAL.
