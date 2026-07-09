-- Migration: Add dedicated token column to nodes table
-- Run this against the incubator_os database

ALTER TABLE `nodes`
  ADD COLUMN `token` VARCHAR(64) NULL UNIQUE AFTER `type`,
  ADD INDEX `idx_nodes_token` (`token`);

-- Backfill existing financial_indicator_request tokens
UPDATE `nodes`
SET `token` = JSON_UNQUOTE(JSON_EXTRACT(`data`, '$.token'))
WHERE `type` = 'financial_indicator_request'
  AND JSON_EXTRACT(`data`, '$.token') IS NOT NULL;

-- Remove token from JSON data to avoid duplication
UPDATE `nodes`
SET `data` = JSON_REMOVE(`data`, '$.token')
WHERE `type` = 'financial_indicator_request';
