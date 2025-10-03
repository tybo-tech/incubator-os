-- Migration: Add ratio support fields to metric_types table
-- Date: 2025-10-03
-- Purpose: Add min_target, ideal_target, and formula_metadata columns for ratio calculations

-- Add the new columns
ALTER TABLE metric_types
  ADD COLUMN min_target DECIMAL(10,2) NULL COMMENT 'Minimum target value for ratios' AFTER period_type,
  ADD COLUMN ideal_target DECIMAL(10,2) NULL COMMENT 'Ideal/stretch target value for ratios' AFTER min_target,
  ADD COLUMN formula_metadata JSON NULL COMMENT 'JSON containing formula and variables for calculated metrics' AFTER ideal_target;

-- Update existing ratio records with targets and formulas
UPDATE metric_types SET
  min_target = 10.00,
  ideal_target = 15.00,
  formula_metadata = JSON_OBJECT(
    'formula', 'NET_PROFIT_BEFORE_TAX / REVENUE_TOTAL * 100',
    'variables', JSON_ARRAY('NET_PROFIT_BEFORE_TAX', 'REVENUE_TOTAL'),
    'display', JSON_OBJECT('unit', '%', 'decimals', 1),
    'description', 'Net profit as a percentage of total revenue'
  )
WHERE code = 'RATIO_PROFIT_MARGIN';

UPDATE metric_types SET
  min_target = 1.00,
  ideal_target = 2.00,
  formula_metadata = JSON_OBJECT(
    'formula', 'CURRENT_ASSETS / CURRENT_LIABILITIES',
    'variables', JSON_ARRAY('CURRENT_ASSETS', 'CURRENT_LIABILITIES'),
    'display', JSON_OBJECT('unit', 'ratio', 'decimals', 2),
    'description', 'Current assets divided by current liabilities'
  )
WHERE code = 'RATIO_CURRENT';

UPDATE metric_types SET
  min_target = 0.30,
  ideal_target = 0.60,
  formula_metadata = JSON_OBJECT(
    'formula', 'LIABILITIES_TOTAL / (ASSETS_TOTAL - LIABILITIES_TOTAL)',
    'variables', JSON_ARRAY('LIABILITIES_TOTAL', 'ASSETS_TOTAL'),
    'display', JSON_OBJECT('unit', 'ratio', 'decimals', 2),
    'description', 'Total debt divided by total equity'
  )
WHERE code = 'RATIO_DEBT_EQUITY';

-- Add index for performance on JSON queries
ALTER TABLE metric_types ADD INDEX idx_formula_metadata ((CAST(formula_metadata->'$.formula' AS CHAR(255))));

COMMIT;
