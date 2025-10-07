-- Make quarter and quarter_label editable instead of auto-calculated
-- This allows companies with different financial years to set their own quarters

USE incubator_os;

-- First, let's see the current structure
SHOW CREATE TABLE company_financials;

-- Drop the generated column constraints to make them regular fields
-- This will allow manual updates for companies with custom financial years

-- Step 1: Remove the generated column definitions
ALTER TABLE company_financials
MODIFY COLUMN quarter tinyint DEFAULT NULL,
MODIFY COLUMN quarter_label varchar(2) DEFAULT NULL;

-- Step 2: Update existing records to maintain current quarter values
-- (This preserves existing data while making fields editable)
UPDATE company_financials
SET
    quarter = QUARTER(period_date),
    quarter_label = CONCAT('Q', QUARTER(period_date))
WHERE quarter IS NULL OR quarter_label IS NULL;

-- Step 3: Add these fields to allow updates
-- quarter and quarter_label are now regular fields that can be manually set

-- Test the changes
SELECT
    id,
    period_date,
    quarter,
    quarter_label,
    QUARTER(period_date) as calculated_quarter,
    CONCAT('Q', QUARTER(period_date)) as calculated_label
FROM company_financials
WHERE id IN (1, 2, 3, 461)
ORDER BY id;

-- Verify the table structure
DESCRIBE company_financials;
