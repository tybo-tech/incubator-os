/* ============================================================================
 * FINANCIAL MODELS — Inkubeta Financial Module
 * ============================================================================
 * Covers:
 * - BaseAudit
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
 * Mirrors DB columns exactly (gross, operating, and npbt sections).
 */
export interface CompanyProfitSummary extends BaseAudit {
  year_: number;

  // --- Gross Profit ---
  gross_q1?: number | null;
  gross_q2?: number | null;
  gross_q3?: number | null;
  gross_q4?: number | null;
  gross_total?: number | null;
  gross_margin?: number | null;

  // --- Operating Profit ---
  operating_q1?: number | null;
  operating_q2?: number | null;
  operating_q3?: number | null;
  operating_q4?: number | null;
  operating_total?: number | null;
  operating_margin?: number | null;

  // --- Net Profit Before Tax ---
  npbt_q1?: number | null;
  npbt_q2?: number | null;
  npbt_q3?: number | null;
  npbt_q4?: number | null;
  npbt_total?: number | null;
  npbt_margin?: number | null;

  // --- Shared ---
  unit?: string | null;
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
  item_type: FinancialItemType;
  category_id?: number | null;
  name: string;
  amount?: number;
  note?: string | null;

  // Optional populated field for UI (category dropdown)
  category_name?: string;
}

export type FinancialItemType = 'direct_cost' | 'operational_cost' | 'asset' | 'liability' | 'equity';

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

/* ============================================================================
 * 5. Profit Display Interfaces (used by ProfitsComponent)
 * ============================================================================
 */
export type ProfitType = 'gross' | 'operating' | 'npbt';

export interface ProfitDisplayRow {
  id?: number;
  year: number;
  type: ProfitType;
  q1: number | null;
  q2: number | null;
  q3: number | null;
  q4: number | null;
  total: number | null;
  margin_pct: number | null;
  isEditing?: boolean;
  isNew?: boolean;
  justSaved?: boolean; // Visual feedback for successful saves
  isPendingSave?: boolean; // Indicates row has unsaved changes
}

export interface ProfitSectionData {
  type: ProfitType;
  displayName: string;
  rows: ProfitDisplayRow[];
  icon: string;
  color: string;
}

/* ============================================================================
 * 6. Service Support Interfaces
 * ============================================================================
 */
export interface ICompanyProfitSummaryFilters {
  company_id: number;
  year_?: number;
  type?: 'gross' | 'operating' | 'npbt';
  client_id?: number;
  program_id?: number | null;
  cohort_id?: number | null;
  status_id?: number;
  order_by?: 'year_' | 'total' | 'margin_pct' | 'type' | 'created_at' | 'updated_at';
  order_dir?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

// New interface representing the actual database record
export interface CompanyProfitRecord extends CompanyProfitSummary {
  // UI state
  isEditing?: boolean;
  isNew?: boolean;
  hasChanges?: boolean;
}

// Section data for display purposes
export interface ProfitSectionDisplay {
  type: ProfitType;
  label: string;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  total: number;
  margin: number;
}

export interface ProfitCalculationResult {
  total: number;
  marginPct: number;
}

export interface ProfitSaveData {
  company_id: number;
  client_id: number;
  program_id: number;
  cohort_id: number;
  year_: number;
  type: ProfitType;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  total: number;
  margin_pct: number;
}

// Unified database record format (matches your actual database structure)
export interface UnifiedProfitRecord {
  id?: number;
  tenant_id?: number | null;
  client_id: number;
  company_id: number;
  program_id: number;
  cohort_id: number;
  year_: number;

  // Gross profit fields
  gross_q1: number;
  gross_q2: number;
  gross_q3: number;
  gross_q4: number;
  gross_total: number;
  gross_margin: number;

  // Operating profit fields
  operating_q1: number;
  operating_q2: number;
  operating_q3: number;
  operating_q4: number;
  operating_total: number;
  operating_margin: number;

  // Net profit before tax fields
  npbt_q1: number;
  npbt_q2: number;
  npbt_q3: number;
  npbt_q4: number;
  npbt_total: number;
  npbt_margin: number;

  // Metadata fields
  unit?: string;
  notes?: string | null;
  title?: string | null;
  status_id?: number;
  created_by?: number | null;
  updated_by?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface ApiResponse<T = any> {
  data?: T[];
  [key: string]: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface FormatOptions {
  showCurrency?: boolean;
  showPercentage?: boolean;
  decimalPlaces?: number;
  locale?: string;
}

export interface BatchUpdateResponse {
  success: boolean;
  message?: string;
  updated_count?: number;
  error?: string;
  errors?: string[];
  results?: Array<{
    id: number;
    success: boolean;
    data?: any;
    error?: string;
  }>;
}
