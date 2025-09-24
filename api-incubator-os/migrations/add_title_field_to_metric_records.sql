-- Add title field to metric_records table for category support
-- This field will store the category name for records that belong to categorized metric types

ALTER TABLE `metric_records`
ADD COLUMN `title` VARCHAR(128) NULL AFTER `note`;

-- Add index for better performance when querying by title
ALTER TABLE `metric_records`
ADD INDEX `idx_title` (`title`);

-- Add composite index for common query patterns
ALTER TABLE `metric_records`
ADD INDEX `idx_company_metric_year_title` (`company_id`, `metric_type_id`, `year`, `title`);
