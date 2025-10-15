export type RatioCategory =
  | 'profitability'
  | 'liquidity'
  | 'solvency'
  | 'efficiency';

export interface FinancialRatio {
  /* =============================
     Primary & Hierarchy
  ============================== */
  id: number;
  tenant_id?: number | null;
  client_id: number;
  company_id: number;
  program_id?: number | null;
  cohort_id?: number | null;

  /* =============================
     Context
  ============================== */
  year_: number;
  group_name: string; // e.g. 'Profitability Ratios'
  title: string; // e.g. 'Gross Profit Margin'

  /* =============================
     Variables
  ============================== */
  variable1_name?: string | null;
  variable1_value?: number | null;
  variable2_name?: string | null;
  variable2_value?: number | null;

  /* =============================
     Calculated & Targets
  ============================== */
  ratio_value?: number | null;
  min_target?: number | null;
  ideal_target?: number | null;
  notes?: string | null;

  /* =============================
     Audit & Control
  ============================== */
  status_id: number;
  created_by?: number | null;
  updated_by?: number | null;
  created_at?: string; // ISO timestamp
  updated_at?: string; // ISO timestamp
}

export type Ratios = {
  profitability: FinancialRatio[];
  liquidity: FinancialRatio[];
  solvency: FinancialRatio[];
  efficiency: FinancialRatio[];
};

export const MOCK_RATIOS: Ratios = {
  profitability: [
    {
      id: 1,
      tenant_id: null,
      client_id: 1,
      company_id: 11,
      program_id: 2,
      cohort_id: 3,
      year_: 2025,
      group_name: 'Profitability Ratios',
      title: 'Gross Profit Margin',
      variable1_name: 'Gross Profit',
      variable1_value: 32000,
      variable2_name: 'Revenue',
      variable2_value: 60000,
      ratio_value: 53.3,
      min_target: 40,
      ideal_target: 45,
      notes: '(Gross Profit ÷ Revenue) × 100',
      status_id: 1,
      created_by: 1,
      updated_by: 1,
      created_at: '2025-10-12T09:15:00Z',
      updated_at: '2025-10-12T09:15:00Z',
    },
    {
      id: 2,
      tenant_id: null,
      client_id: 1,
      company_id: 11,
      program_id: 2,
      cohort_id: 3,
      year_: 2025,
      group_name: 'Profitability Ratios',
      title: 'Net Profit Margin',
      variable1_name: 'Net Profit Before Tax',
      variable1_value: 3200,
      variable2_name: 'Revenue',
      variable2_value: 60000,
      ratio_value: 5.3,
      min_target: 5,
      ideal_target: 10,
      notes: '(Net Profit ÷ Revenue) × 100',
      status_id: 1,
      created_by: 1,
      updated_by: 1,
      created_at: '2025-10-12T09:15:00Z',
      updated_at: '2025-10-12T09:15:00Z',
    },
  ],
  liquidity: [
    {
      id: 3,
      tenant_id: null,
      client_id: 1,
      company_id: 11,
      program_id: 2,
      cohort_id: 3,
      year_: 2025,
      group_name: 'Liquidity Ratios',
      title: 'Current Ratio',
      variable1_name: 'Liquid Assets',
      variable1_value: 20000,
      variable2_name: 'Medium-term Liabilities',
      variable2_value: 15000,
      ratio_value: 133.3,
      min_target: 100,
      ideal_target: 200,
      notes: '(Liquid Assets ÷ Liabilities) × 100',
      status_id: 1,
      created_by: 1,
      updated_by: 1,
      created_at: '2025-10-12T09:15:00Z',
      updated_at: '2025-10-12T09:15:00Z',
    },
    {
      id: 4,
      tenant_id: null,
      client_id: 1,
      company_id: 11,
      program_id: 2,
      cohort_id: 3,
      year_: 2025,
      group_name: 'Liquidity Ratios',
      title: 'Quick Ratio',
      variable1_name: 'Cash + Receivables',
      variable1_value: 18000,
      variable2_name: 'Short-term Liabilities',
      variable2_value: 3000,
      ratio_value: 600,
      min_target: 100,
      ideal_target: 150,
      notes: '(Cash + Receivables ÷ Liabilities) × 100',
      status_id: 1,
      created_by: 1,
      updated_by: 1,
      created_at: '2025-10-12T09:15:00Z',
      updated_at: '2025-10-12T09:15:00Z',
    },
  ],
  solvency: [
    {
      id: 5,
      tenant_id: null,
      client_id: 1,
      company_id: 11,
      program_id: 2,
      cohort_id: 3,
      year_: 2025,
      group_name: 'Solvency Ratios',
      title: 'Leverage Ratio',
      variable1_name: 'Total Liabilities',
      variable1_value: 15000,
      variable2_name: 'Total Equity',
      variable2_value: 10000,
      ratio_value: 150,
      min_target: 100,
      ideal_target: 120,
      notes: '(Total Liabilities ÷ Equity) × 100',
      status_id: 1,
      created_by: 1,
      updated_by: 1,
      created_at: '2025-10-12T09:15:00Z',
      updated_at: '2025-10-12T09:15:00Z',
    },
    {
      id: 6,
      tenant_id: null,
      client_id: 1,
      company_id: 11,
      program_id: 2,
      cohort_id: 3,
      year_: 2025,
      group_name: 'Solvency Ratios',
      title: 'Debt Service Coverage Ratio',
      variable1_name: 'Operating Profit',
      variable1_value: 6400,
      variable2_name: 'Total Debt Service',
      variable2_value: 2000,
      ratio_value: 320,
      min_target: 150,
      ideal_target: 200,
      notes: '(Operating Profit ÷ Debt Service) × 100',
      status_id: 1,
      created_by: 1,
      updated_by: 1,
      created_at: '2025-10-12T09:15:00Z',
      updated_at: '2025-10-12T09:15:00Z',
    },
  ],
  efficiency: [
    {
      id: 7,
      tenant_id: null,
      client_id: 1,
      company_id: 11,
      program_id: 2,
      cohort_id: 3,
      year_: 2025,
      group_name: 'Efficiency Ratios',
      title: 'Return on Assets',
      variable1_name: 'Net Profit Before Tax',
      variable1_value: 3200,
      variable2_name: 'Total Assets',
      variable2_value: 25000,
      ratio_value: 12.8,
      min_target: 10,
      ideal_target: 20,
      notes: '(Net Profit ÷ Total Assets) × 100',
      status_id: 1,
      created_by: 1,
      updated_by: 1,
      created_at: '2025-10-12T09:15:00Z',
      updated_at: '2025-10-12T09:15:00Z',
    },
    {
      id: 8,
      tenant_id: null,
      client_id: 1,
      company_id: 11,
      program_id: 2,
      cohort_id: 3,
      year_: 2025,
      group_name: 'Efficiency Ratios',
      title: 'Return on Investment',
      variable1_name: 'Net Profit Before Tax',
      variable1_value: 3200,
      variable2_name: 'Total Equity',
      variable2_value: 10000,
      ratio_value: 32,
      min_target: 20,
      ideal_target: 30,
      notes: '(Net Profit ÷ Total Equity) × 100',
      status_id: 1,
      created_by: 1,
      updated_by: 1,
      created_at: '2025-10-12T09:15:00Z',
      updated_at: '2025-10-12T09:15:00Z',
    },
    {
      id: 9,
      tenant_id: null,
      client_id: 1,
      company_id: 11,
      program_id: 2,
      cohort_id: 3,
      year_: 2025,
      group_name: 'Efficiency Ratios',
      title: 'Asset Turnover Ratio',
      variable1_name: 'Revenue',
      variable1_value: 60000,
      variable2_name: 'Total Assets',
      variable2_value: 25000,
      ratio_value: 240,
      min_target: 150,
      ideal_target: 250,
      notes: '(Revenue ÷ Total Assets) × 100',
      status_id: 1,
      created_by: 1,
      updated_by: 1,
      created_at: '2025-10-12T09:15:00Z',
      updated_at: '2025-10-12T09:15:00Z',
    },
  ],
};
