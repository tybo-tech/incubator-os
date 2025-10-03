-- Additional ratio metric types for comprehensive financial analysis
-- Insert after running the main migration

INSERT INTO metric_types (id, group_id, code, name, description, unit, show_total, show_margin, graph_color, period_type, min_target, ideal_target, formula_metadata) VALUES

-- Profitability Ratios
(28, 6, 'RATIO_GROSS_MARGIN', 'Gross Profit Margin', 'Gross profit as a percentage of revenue', '%', 0, 0, '#2ca02c', 'YEARLY', 40.00, 60.00,
JSON_OBJECT(
  'formula', 'GROSS_PROFIT / REVENUE_TOTAL * 100',
  'variables', JSON_ARRAY('GROSS_PROFIT', 'REVENUE_TOTAL'),
  'display', JSON_OBJECT('unit', '%', 'decimals', 1),
  'description', 'Gross profit divided by total revenue'
)),

(29, 6, 'RATIO_OPERATING_MARGIN', 'Operating Profit Margin', 'Operating profit as a percentage of revenue', '%', 0, 0, '#d62728', 'YEARLY', 8.00, 15.00,
JSON_OBJECT(
  'formula', 'OPERATING_PROFIT / REVENUE_TOTAL * 100',
  'variables', JSON_ARRAY('OPERATING_PROFIT', 'REVENUE_TOTAL'),
  'display', JSON_OBJECT('unit', '%', 'decimals', 1),
  'description', 'Operating profit divided by total revenue'
)),

-- Liquidity Ratios
(30, 6, 'RATIO_QUICK', 'Quick Ratio', 'Quick assets divided by current liabilities', 'ratio', 0, 0, '#ff7f0e', 'YEARLY', 0.80, 1.20,
JSON_OBJECT(
  'formula', '(CASH_EQUIVALENTS + ACCOUNTS_RECEIVABLE) / CURRENT_LIABILITIES',
  'variables', JSON_ARRAY('CASH_EQUIVALENTS', 'ACCOUNTS_RECEIVABLE', 'CURRENT_LIABILITIES'),
  'display', JSON_OBJECT('unit', 'ratio', 'decimals', 2),
  'description', 'Most liquid assets divided by current liabilities'
)),

-- Efficiency Ratios
(31, 6, 'RATIO_ASSET_TURNOVER', 'Asset Turnover', 'Revenue per rand of assets', 'ratio', 0, 0, '#9467bd', 'YEARLY', 0.50, 1.00,
JSON_OBJECT(
  'formula', 'REVENUE_TOTAL / ASSETS_TOTAL',
  'variables', JSON_ARRAY('REVENUE_TOTAL', 'ASSETS_TOTAL'),
  'display', JSON_OBJECT('unit', 'ratio', 'decimals', 2),
  'description', 'How efficiently assets generate revenue'
)),

(32, 6, 'RATIO_ROA', 'Return on Assets', 'Net profit relative to total assets', '%', 0, 0, '#8c564b', 'YEARLY', 5.00, 10.00,
JSON_OBJECT(
  'formula', 'NET_PROFIT_BEFORE_TAX / ASSETS_TOTAL * 100',
  'variables', JSON_ARRAY('NET_PROFIT_BEFORE_TAX', 'ASSETS_TOTAL'),
  'display', JSON_OBJECT('unit', '%', 'decimals', 1),
  'description', 'Net profit as percentage of total assets'
)),

(33, 6, 'RATIO_ROE', 'Return on Equity', 'Net profit relative to equity', '%', 0, 0, '#e377c2', 'YEARLY', 10.00, 20.00,
JSON_OBJECT(
  'formula', 'NET_PROFIT_BEFORE_TAX / (ASSETS_TOTAL - LIABILITIES_TOTAL) * 100',
  'variables', JSON_ARRAY('NET_PROFIT_BEFORE_TAX', 'ASSETS_TOTAL', 'LIABILITIES_TOTAL'),
  'display', JSON_OBJECT('unit', '%', 'decimals', 1),
  'description', 'Net profit as percentage of shareholder equity'
));

-- Update AUTO_INCREMENT to continue from the highest inserted ID
ALTER TABLE metric_types AUTO_INCREMENT = 34;

COMMIT;
