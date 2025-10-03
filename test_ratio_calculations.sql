-- Test SQL Query to verify ratio calculations
-- This query will compute ratios directly in MySQL using your existing data

-- Test 1: Check what metric records we have for company 11 in 2025
SELECT
    mt.code,
    mt.name,
    mr.total,
    mr.year_
FROM metric_records mr
JOIN metric_types mt ON mr.metric_type_id = mt.id
WHERE mr.company_id = 11
  AND mr.year_ = 2025
  AND mt.code IN ('GROSS_PROFIT', 'REVENUE_TOTAL', 'ASSETS_TOTAL', 'LIABILITIES_TOTAL')
ORDER BY mt.code;

-- Test 2: Calculate Gross Profit Margin (should be ~40% based on your data)
SELECT
    'Gross Profit Margin' as ratio_name,
    gp.total as gross_profit,
    rev.total as revenue_total,
    ROUND((gp.total / rev.total) * 100, 2) as calculated_percentage,
    rt.min_target,
    rt.ideal_target,
    CASE
        WHEN (gp.total / rev.total) * 100 >= rt.ideal_target THEN 'excellent'
        WHEN (gp.total / rev.total) * 100 >= rt.min_target THEN 'good'
        ELSE 'below_target'
    END as status
FROM metric_records gp
JOIN metric_types gp_type ON gp.metric_type_id = gp_type.id AND gp_type.code = 'GROSS_PROFIT'
JOIN metric_records rev ON rev.company_id = gp.company_id
    AND rev.program_id = gp.program_id
    AND rev.cohort_id = gp.cohort_id
    AND rev.year_ = gp.year_
JOIN metric_types rev_type ON rev.metric_type_id = rev_type.id AND rev_type.code = 'REVENUE_TOTAL'
JOIN metric_types rt ON rt.code = 'RATIO_PROFIT_MARGIN'
WHERE gp.company_id = 11
  AND gp.program_id = 2
  AND gp.cohort_id = 3
  AND gp.year_ = 2025;

-- Test 3: Calculate Current Ratio (Assets / Liabilities)
SELECT
    'Current Ratio' as ratio_name,
    assets.total as total_assets,
    liab.total as total_liabilities,
    ROUND(assets.total / liab.total, 2) as calculated_ratio,
    rt.min_target,
    rt.ideal_target,
    CASE
        WHEN (assets.total / liab.total) >= rt.ideal_target THEN 'excellent'
        WHEN (assets.total / liab.total) >= rt.min_target THEN 'good'
        ELSE 'below_target'
    END as status
FROM metric_records assets
JOIN metric_types assets_type ON assets.metric_type_id = assets_type.id AND assets_type.code = 'ASSETS_TOTAL'
JOIN metric_records liab ON liab.company_id = assets.company_id
    AND liab.program_id = assets.program_id
    AND liab.cohort_id = assets.cohort_id
    AND liab.year_ = assets.year_
JOIN metric_types liab_type ON liab.metric_type_id = liab_type.id AND liab_type.code = 'LIABILITIES_TOTAL'
JOIN metric_types rt ON rt.code = 'RATIO_CURRENT'
WHERE assets.company_id = 11
  AND assets.program_id = 2
  AND assets.cohort_id = 3
  AND assets.year_ = 2025;

-- Test 4: Show all configured ratios with their formulas
SELECT
    id,
    code,
    name,
    min_target,
    ideal_target,
    JSON_EXTRACT(formula_metadata, '$.formula') as formula,
    JSON_EXTRACT(formula_metadata, '$.variables') as variables,
    JSON_EXTRACT(formula_metadata, '$.unit') as unit
FROM metric_types
WHERE group_id = 6
  AND formula_metadata IS NOT NULL
ORDER BY name;
