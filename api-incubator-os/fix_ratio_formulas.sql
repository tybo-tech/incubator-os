-- Fix the formula metadata for your existing ratios
-- Based on your current table structure and available metric codes

-- Fix RATIO_PROFIT_MARGIN - you have it calculating Gross Profit / Revenue
-- but the description says "Net profit as percentage of revenue"
-- Let's make it consistent with the description (Net Profit Margin)
UPDATE metric_types
SET formula_metadata = JSON_OBJECT(
    'formula', 'NET_PROFIT_BEFORE_TAX / REVENUE_TOTAL * 100',
    'variables', JSON_ARRAY('NET_PROFIT_BEFORE_TAX', 'REVENUE_TOTAL'),
    'display', JSON_OBJECT('unit', '%', 'decimals', 1),
    'description', 'Net profit as a percentage of revenue'
),
min_target = 10.00,
ideal_target = 15.00
WHERE code = 'RATIO_PROFIT_MARGIN';

-- Add a separate Gross Profit Margin ratio
INSERT INTO metric_types (group_id, code, name, description, unit, show_total, show_margin, graph_color, period_type, min_target, ideal_target, formula_metadata) VALUES
(6, 'RATIO_GROSS_MARGIN', 'Gross Profit Margin', 'Gross profit as a percentage of revenue', '%', 0, 0, '#2ca02c', 'YEARLY', 40.00, 60.00,
JSON_OBJECT(
    'formula', 'GROSS_PROFIT / REVENUE_TOTAL * 100',
    'variables', JSON_ARRAY('GROSS_PROFIT', 'REVENUE_TOTAL'),
    'display', JSON_OBJECT('unit', '%', 'decimals', 1),
    'description', 'Gross profit divided by total revenue'
));

-- Fix RATIO_CURRENT - this should use current assets/liabilities, not total assets/liabilities
-- For now, we'll use total assets/liabilities since you have that data
UPDATE metric_types
SET formula_metadata = JSON_OBJECT(
    'formula', 'ASSETS_TOTAL / LIABILITIES_TOTAL',
    'variables', JSON_ARRAY('ASSETS_TOTAL', 'LIABILITIES_TOTAL'),
    'display', JSON_OBJECT('unit', 'ratio', 'decimals', 2),
    'description', 'Total assets divided by total liabilities (simplified current ratio)'
),
min_target = 1.00,
ideal_target = 2.00
WHERE code = 'RATIO_CURRENT';

-- Fix RATIO_DEBT_EQUITY - needs to calculate equity from assets - liabilities
UPDATE metric_types
SET formula_metadata = JSON_OBJECT(
    'formula', 'LIABILITIES_TOTAL / (ASSETS_TOTAL - LIABILITIES_TOTAL)',
    'variables', JSON_ARRAY('LIABILITIES_TOTAL', 'ASSETS_TOTAL'),
    'display', JSON_OBJECT('unit', 'ratio', 'decimals', 2),
    'description', 'Total debt divided by equity (assets minus liabilities)'
),
min_target = 0.30,
ideal_target = 0.60
WHERE code = 'RATIO_DEBT_EQUITY';

-- Add Operating Profit Margin
INSERT INTO metric_types (group_id, code, name, description, unit, show_total, show_margin, graph_color, period_type, min_target, ideal_target, formula_metadata) VALUES
(6, 'RATIO_OPERATING_MARGIN', 'Operating Profit Margin', 'Operating profit as a percentage of revenue', '%', 0, 0, '#d62728', 'YEARLY', 8.00, 15.00,
JSON_OBJECT(
    'formula', 'OPERATING_PROFIT / REVENUE_TOTAL * 100',
    'variables', JSON_ARRAY('OPERATING_PROFIT', 'REVENUE_TOTAL'),
    'display', JSON_OBJECT('unit', '%', 'decimals', 1),
    'description', 'Operating profit divided by total revenue'
));

COMMIT;
