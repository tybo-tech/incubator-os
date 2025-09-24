We’ll keep it flexible so each metric type can define how it should be tracked (quarterly vs yearly). Later we can add half-yearly if needed.

🟢 Step 1: Alter metric_types

Let’s add a period_type column that defines whether the metric is QUARTERLY or YEARLY.

ALTER TABLE metric_types
ADD COLUMN period_type ENUM('QUARTERLY','YEARLY') NOT NULL DEFAULT 'QUARTERLY';


QUARTERLY → uses Q1–Q4 + totals (Revenue, Profit, Employees, etc.)

YEARLY → uses only total (Direct Costs, Operational Costs, Balance Sheet, etc.)

🟢 Step 2: Insert the New Groups

We already have Revenue, Profits, and Employees.
Let’s add some more top-level groups to mirror the tabs in your screenshot:

INSERT INTO metric_groups (client_id, code, name, description, show_total, show_margin, graph_color, order_no)
VALUES
(1, 'COST_STRUCTURE', 'Cost Structure', 'Tracks company costs such as direct costs and operational costs.', 1, 0, '#9467bd', 3),
(1, 'BALANCE_SHEET', 'Balance Sheet', 'Tracks company assets, liabilities, and equity.', 1, 0, '#8c564b', 4),
(1, 'RATIOS', 'Ratios', 'Financial ratios such as current ratio, quick ratio, debt-to-equity, etc.', 1, 0, '#e377c2', 5),
(1, 'FUNDS_RECEIVED', 'Funds Received', 'Grants, investments, and other funds received by the company.', 1, 0, '#7f7f7f', 6);

🟢 Step 3: Insert Metric Types for Cost Structure

We’ll use YEARLY here since costs are often tracked as annual totals:

INSERT INTO metric_types (group_id, code, name, description, unit, show_total, show_margin, graph_color, period_type)
VALUES
((SELECT id FROM metric_groups WHERE code = 'COST_STRUCTURE'), 'DIRECT_COSTS', 'Direct Costs', 'Cost of goods/services sold (COGS).', 'ZAR', 1, 0, '#bcbd22', 'YEARLY'),
((SELECT id FROM metric_groups WHERE code = 'COST_STRUCTURE'), 'OPERATING_COSTS', 'Operational Costs', 'Overhead and operating expenses.', 'ZAR', 1, 0, '#17becf', 'YEARLY');

🟢 Step 4: Example Records (Company 11, Program 2, Cohort 3)
-- Direct Costs (Yearly)
INSERT INTO metric_records 
(client_id, company_id, program_id, cohort_id, metric_type_id, year_, total, unit)
VALUES
(1, 11, 2, 3, (SELECT id FROM metric_types WHERE code='DIRECT_COSTS'), 2024, 28000, 'ZAR'),
(1, 11, 2, 3, (SELECT id FROM metric_types WHERE code='DIRECT_COSTS'), 2025, 31000, 'ZAR');

-- Operational Costs (Yearly)
INSERT INTO metric_records 
(client_id, company_id, program_id, cohort_id, metric_type_id, year_, total, unit)
VALUES
(1, 11, 2, 3, (SELECT id FROM metric_types WHERE code='OPERATING_COSTS'), 2024, 25600, 'ZAR'),
(1, 11, 2, 3, (SELECT id FROM metric_types WHERE code='OPERATING_COSTS'), 2025, 27000, 'ZAR');

🟢 Summary

Now your metrics engine supports:

Quarterly tracking → Revenue, Profits, Employees (with Q1–Q4).

Yearly tracking → Cost Structure, Balance Sheet, Ratios, Funds Received.

And the UI can simply check period_type in metric_types to know whether to render:

Quarterly grid (Q1–Q4 + total)

Yearly input (just total)


-- ================================
-- Metric Types: Balance Sheet + Funds Received
-- ================================
INSERT INTO metric_types (group_id, code, name, description, unit, show_total, show_margin, graph_color, period_type)
VALUES
-- Balance Sheet
(5, 'ASSETS_TOTAL', 'Total Assets', 'Sum of all assets owned by the company.', 'ZAR', 1, 0, '#1f77b4', 'YEARLY'),
(5, 'LIABILITIES_TOTAL', 'Total Liabilities', 'Sum of all debts and obligations owed by the company.', 'ZAR', 1, 0, '#ff7f0e', 'YEARLY'),
(5, 'EQUITY_TOTAL', 'Total Equity', 'Residual interest in assets after deducting liabilities.', 'ZAR', 1, 0, '#2ca02c', 'YEARLY'),

-- Funds Received
(7, 'FUNDS_GRANTS', 'Grants Received', 'Grant funding received by the company.', 'ZAR', 1, 0, '#9467bd', 'YEARLY'),
(7, 'FUNDS_INVESTMENTS', 'Investments Received', 'Equity or capital investments received.', 'ZAR', 1, 0, '#8c564b', 'YEARLY'),
(7, 'FUNDS_LOANS', 'Loans Received', 'Loans and credit facilities received.', 'ZAR', 1, 0, '#e377c2', 'YEARLY');

-- ================================
-- Metric Records: Balance Sheet
-- ================================

-- 2024
INSERT INTO metric_records (client_id, company_id, program_id, cohort_id, metric_type_id, year_, total, unit)
VALUES
(1, 11, 2, 3, (SELECT id FROM metric_types WHERE code='ASSETS_TOTAL'), 2024, 500000, 'ZAR'),
(1, 11, 2, 3, (SELECT id FROM metric_types WHERE code='LIABILITIES_TOTAL'), 2024, 200000, 'ZAR'),
(1, 11, 2, 3, (SELECT id FROM metric_types WHERE code='EQUITY_TOTAL'), 2024, 300000, 'ZAR');

-- 2025
INSERT INTO metric_records (client_id, company_id, program_id, cohort_id, metric_type_id, year_, total, unit)
VALUES
(1, 11, 2, 3, (SELECT id FROM metric_types WHERE code='ASSETS_TOTAL'), 2025, 600000, 'ZAR'),
(1, 11, 2, 3, (SELECT id FROM metric_types WHERE code='LIABILITIES_TOTAL'), 2025, 250000, 'ZAR'),
(1, 11, 2, 3, (SELECT id FROM metric_types WHERE code='EQUITY_TOTAL'), 2025, 350000, 'ZAR');

-- ================================
-- Metric Records: Funds Received
-- ================================

-- 2024
INSERT INTO metric_records (client_id, company_id, program_id, cohort_id, metric_type_id, year_, total, unit)
VALUES
(1, 11, 2, 3, (SELECT id FROM metric_types WHERE code='FUNDS_GRANTS'), 2024, 75000, 'ZAR'),
(1, 11, 2, 3, (SELECT id FROM metric_types WHERE code='FUNDS_INVESTMENTS'), 2024, 50000, 'ZAR'),
(1, 11, 2, 3, (SELECT id FROM metric_types WHERE code='FUNDS_LOANS'), 2024, 30000, 'ZAR');

-- 2025
INSERT INTO metric_records (client_id, company_id, program_id, cohort_id, metric_type_id, year_, total, unit)
VALUES
(1, 11, 2, 3, (SELECT id FROM metric_types WHERE code='FUNDS_GRANTS'), 2025, 100000, 'ZAR'),
(1, 11, 2, 3, (SELECT id FROM metric_types WHERE code='FUNDS_INVESTMENTS'), 2025, 60000, 'ZAR'),
(1, 11, 2, 3, (SELECT id FROM metric_types WHERE code='FUNDS_LOANS'), 2025, 40000, 'ZAR');
