-- Debug script to check your current ratio setup
-- Run these queries one by one to verify everything is correct

-- 1. Check if you have the new columns
DESCRIBE metric_types;

-- 2. Check your ratio configurations
SELECT
    id,
    code,
    name,
    min_target,
    ideal_target,
    JSON_PRETTY(formula_metadata) as formula_pretty
FROM metric_types
WHERE group_id = 6
ORDER BY id;

-- 3. Check what metric records you have for company 11 in 2025
SELECT
    mt.code,
    mt.name,
    mr.total,
    mr.q1, mr.q2, mr.q3, mr.q4
FROM metric_records mr
JOIN metric_types mt ON mr.metric_type_id = mt.id
WHERE mr.company_id = 11
  AND mr.year_ = 2025
  AND mr.total IS NOT NULL
ORDER BY mt.code;

-- 4. Manual calculation test for Gross Profit Margin
-- Based on your formula: GROSS_PROFIT / REVENUE_TOTAL
SELECT
    'Manual Calculation Test' as test_name,
    gp.total as gross_profit,
    rev.total as revenue_total,
    ROUND((gp.total / rev.total) * 100, 2) as gross_margin_percentage
FROM metric_records gp
JOIN metric_types gp_mt ON gp.metric_type_id = gp_mt.id AND gp_mt.code = 'GROSS_PROFIT'
JOIN metric_records rev ON rev.company_id = gp.company_id
    AND rev.program_id = gp.program_id
    AND rev.cohort_id = gp.cohort_id
    AND rev.year_ = gp.year_
JOIN metric_types rev_mt ON rev.metric_type_id = rev_mt.id AND rev_mt.code = 'REVENUE_TOTAL'
WHERE gp.company_id = 11
  AND gp.year_ = 2025;

-- 5. Check if there are any issues with formula_metadata JSON structure
SELECT
    code,
    name,
    JSON_VALID(formula_metadata) as is_valid_json,
    JSON_EXTRACT(formula_metadata, '$.formula') as extracted_formula,
    JSON_EXTRACT(formula_metadata, '$.variables') as extracted_variables
FROM metric_types
WHERE group_id = 6
  AND formula_metadata IS NOT NULL;

-- 6. Find any missing metric codes referenced in formulas
-- This will help identify if your variables don't match actual metric codes
SELECT DISTINCT
    JSON_UNQUOTE(JSON_EXTRACT(variables.value, '$')) as variable_code,
    CASE
        WHEN mt_check.code IS NOT NULL THEN '✅ Found'
        ELSE '❌ Missing'
    END as status
FROM metric_types rt
CROSS JOIN JSON_TABLE(
    JSON_EXTRACT(rt.formula_metadata, '$.variables'),
    '$[*]' COLUMNS (value JSON PATH '$')
) as variables
LEFT JOIN metric_types mt_check ON mt_check.code = JSON_UNQUOTE(JSON_EXTRACT(variables.value, '$'))
WHERE rt.group_id = 6
  AND rt.formula_metadata IS NOT NULL
ORDER BY variable_code;
