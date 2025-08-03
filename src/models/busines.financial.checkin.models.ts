// models/business.models.ts

/**
 * 🔎 Financial Check-In Smart Block
 * Captures periodic financial health of the business (monthly/quarterly/yearly).
 * Used to compute executive summaries and detect trends over time.
 */
export interface FinancialCheckIn {
  /** Year of the check-in (e.g. 2025) */
  year: number;

  /** Month (1–12) — optional if captured quarterly/yearly only */
  month?: number;

  /** Derived or selected quarter (Q1–Q4) */
  quarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4';

  /** Set true if this record represents pre-incubation baseline */
  is_pre_ignition?: boolean;

  /** Monthly average turnover (revenue) */
  turnover_monthly_avg?: number;

  /** Monthly average cost of sales */
  cost_of_sales?: number;

  /** Monthly operating expenses (salaries, rent, etc.) */
  business_expenses?: number;

  /** Monthly gross profit (auto-calculated = turnover - cost) */
  gross_profit?: number;

  /** Net profit before tax (auto = gross - expenses) */
  net_profit?: number;

  /** Gross Profit margin (as %) */
  gp_margin?: number;

  /** Net Profit margin (as %) */
  np_margin?: number;

  /** Cash available on hand */
  cash_on_hand?: number;

  /** Outstanding receivables (debtors) */
  debtors?: number;

  /** Outstanding payables (creditors) */
  creditors?: number;

  /** Inventory currently on hand */
  inventory_on_hand?: number;

  /** Net assets value = assets - liabilities */
  net_assets?: number;

  /** Working capital ratio = (CA - CL) / CL */
  working_capital_ratio?: number;

  /** Optional notes for qualitative insight */
  notes?: string;
}
