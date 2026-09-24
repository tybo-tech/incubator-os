-- Incubator OS - Sprint 010 Google Calendar STRUCTURE verifier (compact, single row)
--
-- READ-ONLY **and safe to run BEFORE and AFTER** the Google migrations (#22-#25).
--
-- Every value here comes from information_schema ONLY, so it never references the
-- Google tables by name and therefore never raises #1146 on a pre-deploy database.
--
-- Expected:
--   * BEFORE deploy: t_conn=0, t_sync=0 and every has_*/i_gsync_claim/sync_status_col = 0
--   * AFTER deploy:  t_conn=1, t_sync=1 and every has_*/i_gsync_claim/sync_status_col = 1
--
-- Data-level invariants (token/cipher integrity) live in
-- `verify-google-integrity-compact.sql`, which may only run once the tables exist.
--
-- phpMyAdmin: paste this whole single statement (ends with one semicolon) and Go.

SELECT 'GOOGLE (010) structure' AS report, DATABASE() AS db, VERSION() AS mysql_version,
 (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='google_calendar_connections') AS t_conn,
 (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='google_event_sync') AS t_sync,
 (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='google_event_sync' AND INDEX_NAME='idx_gsync_claim') AS i_gsync_claim,
 (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='google_event_sync' AND COLUMN_NAME='sync_status') AS sync_status_col,
 (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='google_event_sync' AND COLUMN_NAME='generation') AS has_generation,
 (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='google_event_sync' AND COLUMN_NAME='synced_event_version') AS has_synced_version,
 (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='google_event_sync' AND COLUMN_NAME='remote_etag') AS has_remote_etag,
 (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='google_event_sync' AND COLUMN_NAME='conflict_at') AS has_conflict_at,
 (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='google_event_sync' AND COLUMN_NAME='unpublished_at') AS has_unpublished_at,
 (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='google_event_sync' AND COLUMN_NAME='remote_outcome') AS has_remote_outcome,
 (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='google_event_sync' AND COLUMN_NAME='last_google_event_id') AS has_last_google_event_id,
 (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='google_event_sync' AND COLUMN_NAME='conference_status') AS has_conference_status,
 (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='google_event_sync' AND COLUMN_NAME='publish_claim_token') AS has_publish_claim,
 (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='google_calendar_connections' AND COLUMN_NAME='pending_account_email') AS has_pending_email,
 (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='google_calendar_connections' AND COLUMN_NAME='access_token_cipher') AS has_token_cipher_cols;
