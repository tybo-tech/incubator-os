-- Remove all constraints from company_financials table to allow free updates
-- This will enable updating any field without constraint violations

USE incubator_os;

-- Remove the unique constraints that are blocking updates
ALTER TABLE `company_financials` DROP INDEX `uq_fin_company_period`;
ALTER TABLE `company_financials` DROP INDEX `uq_fin_company_year_month`;

-- Keep the foreign key constraint for data integrity but make it more flexible
-- First drop the existing foreign key
ALTER TABLE `company_financials` DROP FOREIGN KEY `fk_fin_company`;

-- Re-add the foreign key constraint but allow updates and set null on delete
ALTER TABLE `company_financials`
ADD CONSTRAINT `fk_fin_company`
FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Ensure all financial fields can accept NULL values (they already do)
-- This ensures maximum flexibility for updates

-- Add indexes for performance without uniqueness constraints
CREATE INDEX `idx_company_period` ON `company_financials` (`company_id`, `period_date`);
CREATE INDEX `idx_company_year_month` ON `company_financials` (`company_id`, `year`, `month`);
CREATE INDEX `idx_period_date` ON `company_financials` (`period_date`);
CREATE INDEX `idx_year_quarter` ON `company_financials` (`year`, `quarter`);

-- Show the current structure after changes
DESCRIBE `company_financials`;
SHOW INDEX FROM `company_financials`;
