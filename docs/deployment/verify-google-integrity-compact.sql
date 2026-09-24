-- Incubator OS - Sprint 010 Google Calendar INTEGRITY verifier (compact, single row)
--
-- READ-ONLY. **Run ONLY AFTER the Google migrations (#22-#25) have been applied.**
-- This file references the Google tables directly, so on a pre-deploy database it
-- raises #1146 by design - that is the signal to use `verify-google-compact.sql`
-- (structure) instead until the tables exist.
--
-- Expected: every inv_* column is 0.
--   * inv_broken_access_token   - a connection with a cipher but no nonce/tag (or vice versa)
--   * inv_broken_refresh_token  - a refresh cipher without its nonce/tag
--   * inv_orphan_sync           - a projection whose calendar_event no longer exists
--   * inv_cross_tenant          - a projection whose connection and event disagree on tenant
--   * inv_connection_not_one_per_user - more than one connection for a user (should be impossible)
--
-- phpMyAdmin: paste this whole single statement (ends with one semicolon) and Go.

SELECT 'GOOGLE (010) integrity' AS report, DATABASE() AS db,
 (SELECT COUNT(*) FROM google_calendar_connections WHERE (access_token_cipher IS NULL) <> (access_token_nonce IS NULL OR access_token_tag IS NULL)) AS inv_broken_access_token,
 (SELECT COUNT(*) FROM google_calendar_connections WHERE refresh_token_cipher IS NOT NULL AND (refresh_token_nonce IS NULL OR refresh_token_tag IS NULL)) AS inv_broken_refresh_token,
 (SELECT COUNT(*) FROM google_event_sync s LEFT JOIN calendar_events e ON e.id = s.calendar_event_id WHERE e.id IS NULL) AS inv_orphan_sync,
 (SELECT COUNT(*) FROM google_event_sync s LEFT JOIN google_calendar_connections c ON c.id = s.connection_id WHERE c.id IS NULL) AS inv_orphan_connection,
 (SELECT COUNT(*) FROM google_event_sync s JOIN calendar_events e ON e.id = s.calendar_event_id WHERE s.tenant_id <> e.tenant_id) AS inv_cross_tenant,
 (SELECT COUNT(*) FROM (SELECT user_id FROM google_calendar_connections GROUP BY user_id HAVING COUNT(*) > 1) x) AS inv_connection_not_one_per_user,
 (SELECT COUNT(*) FROM google_event_sync) AS info_sync_rows,
 (SELECT COUNT(*) FROM google_calendar_connections) AS info_connection_rows;
