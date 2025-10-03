-- Additional metric types needed for ratio calculations
-- These are the missing variables referenced in ratio formulas

INSERT INTO metric_types (id, group_id, code, name, description, unit, show_total, show_margin, graph_color, period_type) VALUES

-- Balance Sheet - Assets (group_id = 5)
(34, 5, 'CURRENT_ASSETS', 'Current Assets', 'Assets that can be converted to cash within one year', 'ZAR', 1, 0, '#2ca02c', 'YEARLY_SIDE_BY_SIDE'),
(35, 5, 'CASH_EQUIVALENTS', 'Cash & Equivalents', 'Cash and short-term liquid investments', 'ZAR', 1, 0, '#17becf', 'YEARLY_SIDE_BY_SIDE'),
(36, 5, 'ACCOUNTS_RECEIVABLE', 'Accounts Receivable', 'Money owed by customers', 'ZAR', 1, 0, '#ffbb78', 'YEARLY_SIDE_BY_SIDE'),
(37, 5, 'INVENTORY', 'Inventory', 'Goods held for sale', 'ZAR', 1, 0, '#98df8a', 'YEARLY_SIDE_BY_SIDE'),

-- Balance Sheet - Liabilities (group_id = 5)
(38, 5, 'CURRENT_LIABILITIES', 'Current Liabilities', 'Debts due within one year', 'ZAR', 1, 0, '#ff9896', 'YEARLY_SIDE_BY_SIDE'),
(39, 5, 'ACCOUNTS_PAYABLE', 'Accounts Payable', 'Money owed to suppliers', 'ZAR', 1, 0, '#c5b0d5', 'YEARLY_SIDE_BY_SIDE'),
(40, 5, 'SHORT_TERM_DEBT', 'Short-term Debt', 'Loans and credit due within one year', 'ZAR', 1, 0, '#f7b6d3', 'YEARLY_SIDE_BY_SIDE'),
(41, 5, 'LONG_TERM_DEBT', 'Long-term Debt', 'Loans and debt due after one year', 'ZAR', 1, 0, '#c7c7c7', 'YEARLY_SIDE_BY_SIDE');

-- Update the formula metadata for ratios that need these new variables
UPDATE metric_types SET
  formula_metadata = JSON_OBJECT(
    'formula', 'CURRENT_ASSETS / CURRENT_LIABILITIES',
    'variables', JSON_ARRAY('CURRENT_ASSETS', 'CURRENT_LIABILITIES'),
    'display', JSON_OBJECT('unit', 'ratio', 'decimals', 2),
    'description', 'Current assets divided by current liabilities'
  )
WHERE code = 'RATIO_CURRENT';

UPDATE metric_types SET
  formula_metadata = JSON_OBJECT(
    'formula', '(CASH_EQUIVALENTS + ACCOUNTS_RECEIVABLE) / CURRENT_LIABILITIES',
    'variables', JSON_ARRAY('CASH_EQUIVALENTS', 'ACCOUNTS_RECEIVABLE', 'CURRENT_LIABILITIES'),
    'display', JSON_OBJECT('unit', 'ratio', 'decimals', 2),
    'description', 'Most liquid assets divided by current liabilities'
  )
WHERE code = 'RATIO_QUICK';

-- Update AUTO_INCREMENT
ALTER TABLE metric_types AUTO_INCREMENT = 42;

COMMIT;
