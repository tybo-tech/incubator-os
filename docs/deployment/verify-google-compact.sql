-- Incubator OS - Sprint 010 Google Calendar verification (compact, single row)
--
-- READ-ONLY. Safe to run before and after the Google migrations (#22-#25).
-- Every read degrades to 0 when the object does not exist yet, so it never errors
-- on a pre-deploy database.
--
-- Expected: before deploy the objects read 0; after deploy every x_/has_ reads 1
-- and inv_plaintext_token stays 0 (a token must never be stored in plaintext).
--
-- phpMyAdmin: paste this whole single statement (ends with one `;`) and Go.

SELECT 'GOOGLE (010) verification' AS report, DATABASE() AS db, VERSION() AS mysql_version,
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
 -- A token must NEVER be stored without its cipher partner: a connection that has a
 -- cipher but no nonce/tag (or vice versa) is a corruption/invariant violation.
 (SELECT COUNT(*) FROM google_calendar_connections WHERE (access_token_cipher IS NULL) <> (access_token_nonce IS NULL OR access_token_tag IS NULL)) AS inv_broken_access_token,
 (SELECT COUNT(*) FROM google_calendar_connections WHERE refresh_token_cipher IS NOT NULL AND (refresh_token_nonce IS NULL OR refresh_token_tag IS NULL)) AS inv_broken_refresh_token;
