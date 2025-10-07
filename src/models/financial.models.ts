/* ============================================================================
 * FINANCIAL MODELS — Inkubeta Financial Module
 * ============================================================================
 * Covers:
 * - CompanyRevenueSummary
 * - CompanyProfitSummary
 * - CompanyFinancialItem (unified model)
 * - FinancialCategory
 * ============================================================================
 */

export interface BaseAudit {
  id?: number;
  tenant_id?: number | null;
  client_id: number;
  company_id: number;
  program_id?: number | null;
  cohort_id?: number | null;
  status_id?: number;
  created_by?: number | null;
  updated_by?: number | null;
  created_at?: string;
  updated_at?: string;
}

/* ============================================================================
 * 1. Company Revenue Summary
 * ============================================================================
 */
export interface CompanyRevenueSummary extends BaseAudit {
  year_: number;
  q1?: number | null;
  q2?: number | null;
  q3?: number | null;
  q4?: number | null;
  total?: number | null;
  export_q1?: number | null;
  export_q2?: number | null;
  export_q3?: number | null;
  export_q4?: number | null;
  export_total?: number | null;
  margin_pct?: number | null;
  unit?: string | null;
  notes?: string | null;
  title?: string | null;
}

/* ============================================================================
 * 2. Company Profit Summary
 * ============================================================================
 */
export interface CompanyProfitSummary extends BaseAudit {
  year_: number;
  q1?: number | null;
  q2?: number | null;
  q3?: number | null;
  q4?: number | null;
  total?: number | null;
  margin_pct?: number | null;
  type?: 'gross' | 'operating' | 'net' | 'before_tax'; // optional: profit type
  notes?: string | null;
  title?: string | null;
}

/* ============================================================================
 * 3. Company Financial Item (Unified Model)
 * ============================================================================
 * Represents costs, assets, liabilities, and equity in one structure.
 */
export interface CompanyFinancialItem extends BaseAudit {
  year_: number;
  item_type: 'direct_cost' | 'operational_cost' | 'asset' | 'liability' | 'equity';
  category_id?: number | null;
  name: string;
  amount?: number;
  note?: string | null;

  // Optional populated field for UI (category dropdown)
  category_name?: string;
}

/* ============================================================================
 * 4. Financial Category
 * ============================================================================
 * Shared between costing and balance sheet dropdowns.
 */
export interface FinancialCategory {
  id?: number;
  name: string;
  item_type: 'direct_cost' | 'operational_cost' | 'asset' | 'liability' | 'equity';
  description?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}
