-- =====================================================================
-- Incubator OS - Sprint 007/008/009 POST-MIGRATION INTEGRITY (READ-ONLY)
-- =====================================================================
-- Run immediately after each migration, and again after all four. Every
-- statement is a SELECT. Nothing is modified.
--
-- How to run (user, manual, phpMyAdmin only):
--   Open phpMyAdmin against `rbttaces_api`, select it, SQL tab, paste, Go.
--
-- Interpret the output:
--   * "EXPECTED: 0 rows" queries  -> any returned row is a defect. STOP and
--     report it, and do NOT deploy code on top of a broken schema.
--   * "INFO" queries -> record the numbers as evidence of the deployed state.
-- =====================================================================

SET @db := DATABASE();

-- =====================================================================
-- A - Structure landed (EXPECTED: 4 rows, all present=1)
-- =====================================================================
SELECT 'table' AS kind, 'metric_type_accounts' AS object_name,
  EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db AND TABLE_NAME='metric_type_accounts') AS present
UNION ALL SELECT 'table','achievements',
  EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db AND TABLE_NAME='achievements')
UNION ALL SELECT 'table','achievement_evidence',
  EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db AND TABLE_NAME='achievement_evidence')
UNION ALL SELECT 'index','uq_evidence_metric_snapshot',
  EXISTS(SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=@db
         AND TABLE_NAME='achievement_evidence' AND INDEX_NAME='uq_evidence_metric_snapshot')
UNION ALL SELECT 'table','calendar_events',
  EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db AND TABLE_NAME='calendar_events')
UNION ALL SELECT 'table','calendar_event_links',
  EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db AND TABLE_NAME='calendar_event_links')
UNION ALL SELECT 'check','chk_cal_time_shape',
  EXISTS(SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=@db
         AND TABLE_NAME='calendar_events' AND CONSTRAINT_TYPE='CHECK' AND CONSTRAINT_NAME='chk_cal_time_shape')
UNION ALL SELECT 'table','sessions',
  EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db AND TABLE_NAME='sessions')
UNION ALL SELECT 'table','session_participants',
  EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db AND TABLE_NAME='session_participants')
UNION ALL SELECT 'table','session_agenda_items',
  EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db AND TABLE_NAME='session_agenda_items')
UNION ALL SELECT 'table','session_notes',
  EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db AND TABLE_NAME='session_notes')
UNION ALL SELECT 'table','session_decisions',
  EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db AND TABLE_NAME='session_decisions')
UNION ALL SELECT 'table','session_entity_links',
  EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db AND TABLE_NAME='session_entity_links')
UNION ALL SELECT 'table','session_activities',
  EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=@db AND TABLE_NAME='session_activities')
UNION ALL SELECT 'fk','fk_sessions_event',
  EXISTS(SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=@db
         AND TABLE_NAME='sessions' AND CONSTRAINT_TYPE='FOREIGN KEY' AND CONSTRAINT_NAME='fk_sessions_event');

-- =====================================================================
-- B - Sprint 007: at most ONE metric snapshot per achievement
--     EXPECTED: 0 rows.  (Defence-in-depth: the app also row-locks.)
-- =====================================================================
SELECT achievement_id, COUNT(*) AS snapshot_count
FROM achievement_evidence
WHERE source_type='metric_snapshot'
GROUP BY achievement_id
HAVING snapshot_count > 1;

-- =====================================================================
-- C - Sprint 007: no orphan evidence  (EXPECTED: 0)
-- =====================================================================
SELECT COUNT(*) AS orphan_evidence
FROM achievement_evidence e
LEFT JOIN achievements a ON a.id = e.achievement_id
WHERE a.id IS NULL;

-- =====================================================================
-- D - Sprint 007: no orphan / cross-company achievement target (EXPECTED: 0)
-- =====================================================================
SELECT COUNT(*) AS cross_company_achievement_target
FROM achievements a
JOIN gps_targets t ON t.id = a.gps_target_id
WHERE t.company_id <> a.company_id;

-- =====================================================================
-- E - Sprint 008: calendar time-shape invariant (EXPECTED: 0)
--     Mirrors chk_cal_time_shape so we can see any violation as a row.
-- =====================================================================
SELECT COUNT(*) AS invalid_time_shape
FROM calendar_events
WHERE NOT (
  (all_day = 1 AND start_date IS NOT NULL AND end_date IS NOT NULL
               AND start_at IS NULL AND end_at IS NULL)
  OR
  (all_day = 0 AND start_at IS NOT NULL AND end_at IS NOT NULL
               AND timezone IS NOT NULL
               AND start_date IS NULL AND end_date IS NULL)
);

-- Also cross-check the declared CHECK exists (EXPECTED: 1)
SELECT COUNT(*) AS check_declared
FROM information_schema.TABLE_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA=@db AND TABLE_NAME='calendar_events'
  AND CONSTRAINT_TYPE='CHECK' AND CONSTRAINT_NAME='chk_cal_time_shape';

-- =====================================================================
-- F - Sprint 009: Sessions integrity (all EXPECTED: 0 rows)
-- =====================================================================

-- F1: a Session must never be linked to an event in another company
SELECT s.id AS session_id, s.company_id AS session_company, e.company_id AS event_company
FROM sessions s
JOIN calendar_events e ON e.id = s.calendar_event_id
WHERE e.company_id IS NOT NULL AND e.company_id <> s.company_id;

-- F2: every Session must carry tenant_id
SELECT COUNT(*) AS sessions_missing_tenant FROM sessions WHERE tenant_id IS NULL;

-- F3: no duplicate link (schema enforces, this proves it)
SELECT session_id, entity_type, entity_id, relationship, COUNT(*) AS c
FROM session_entity_links
GROUP BY session_id, entity_type, entity_id, relationship
HAVING c > 1;

-- F4: no duplicate participant (schema enforces)
SELECT session_id, dedupe_key, COUNT(*) AS c
FROM session_participants
GROUP BY session_id, dedupe_key
HAVING c > 1;

-- F5: every activity row belongs to a Session and carries a company
SELECT COUNT(*) AS orphan_activities
FROM session_activities a
LEFT JOIN sessions s ON s.id = a.session_id
WHERE s.id IS NULL;

-- F6: child rows must never reference a missing Session
SELECT 'participants' AS child, COUNT(*) AS orphans FROM session_participants p
  LEFT JOIN sessions s ON s.id=p.session_id WHERE s.id IS NULL
UNION ALL SELECT 'agenda', COUNT(*) FROM session_agenda_items x
  LEFT JOIN sessions s ON s.id=x.session_id WHERE s.id IS NULL
UNION ALL SELECT 'notes', COUNT(*) FROM session_notes x
  LEFT JOIN sessions s ON s.id=x.session_id WHERE s.id IS NULL
UNION ALL SELECT 'decisions', COUNT(*) FROM session_decisions x
  LEFT JOIN sessions s ON s.id=x.session_id WHERE s.id IS NULL
UNION ALL SELECT 'links', COUNT(*) FROM session_entity_links x
  LEFT JOIN sessions s ON s.id=x.session_id WHERE s.id IS NULL;

-- =====================================================================
-- G - INFO: Sprint 007 readiness carried forward (report, do not repair)
-- =====================================================================
SELECT
  (SELECT COUNT(*) FROM metric_type_accounts) AS seeded_bindings,
  (SELECT COUNT(*) FROM company_financial_yearly_stats WHERE account_id IS NULL) AS unresolved_account_rows,
  (SELECT COUNT(DISTINCT company_id) FROM company_accounts
     WHERE account_type='export_revenue' AND is_active=1) AS companies_with_export_accounts;

-- =====================================================================
-- H - INFO: deployed row counts (evidence of the post-migration state)
-- =====================================================================
SELECT 'achievements' AS table_name, COUNT(*) AS row_count FROM achievements
UNION ALL SELECT 'achievement_evidence', COUNT(*) FROM achievement_evidence
UNION ALL SELECT 'calendar_events', COUNT(*) FROM calendar_events
UNION ALL SELECT 'calendar_event_links', COUNT(*) FROM calendar_event_links
UNION ALL SELECT 'sessions', COUNT(*) FROM sessions
UNION ALL SELECT 'session_participants', COUNT(*) FROM session_participants
UNION ALL SELECT 'session_agenda_items', COUNT(*) FROM session_agenda_items
UNION ALL SELECT 'session_notes', COUNT(*) FROM session_notes
UNION ALL SELECT 'session_decisions', COUNT(*) FROM session_decisions
UNION ALL SELECT 'session_entity_links', COUNT(*) FROM session_entity_links
UNION ALL SELECT 'session_activities', COUNT(*) FROM session_activities;
