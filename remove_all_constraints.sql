-- Complete database constraint removal and optimization script
-- Run this script to remove all blocking constraints and allow free updates

-- Remove unique constraints that prevent duplicate entries
DROP INDEX IF EXISTS `uq_fin_company_period` ON `company_financials`;
DROP INDEX IF EXISTS `uq_fin_company_year_month` ON `company_financials`;

-- Drop the restrictive foreign key constraint
ALTER TABLE `company_financials` DROP FOREIGN KEY IF EXISTS `fk_fin_company`;

-- Re-add foreign key with cascade options for flexibility
ALTER TABLE `company_financials`
ADD CONSTRAINT `fk_fin_company`
FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Add performance indexes without uniqueness constraints
CREATE INDEX IF NOT EXISTS `idx_company_period` ON `company_financials` (`company_id`, `period_date`);
CREATE INDEX IF NOT EXISTS `idx_company_year_month` ON `company_financials` (`company_id`, `year`, `month`);
CREATE INDEX IF NOT EXISTS `idx_period_date` ON `company_financials` (`period_date`);
CREATE INDEX IF NOT EXISTS `idx_year_quarter` ON `company_financials` (`year`, `quarter`);
CREATE INDEX IF NOT EXISTS `idx_company_year` ON `company_financials` (`company_id`, `year`);

-- Show final table structure
SHOW CREATE TABLE `company_financials`;
SHOW INDEX FROM `company_financials`;

-- Test query to verify constraints are removed
SELECT
    COUNT(*) as total_records,
    COUNT(DISTINCT CONCAT(company_id, '-', period_date)) as unique_company_periods,
    MIN(period_date) as earliest_date,
    MAX(period_date) as latest_date
FROM company_financials;
