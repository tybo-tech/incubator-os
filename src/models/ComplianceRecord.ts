/**
 * ComplianceRecord Interface
 *
 * ✅ MATCHES DATABASE TABLE EXACTLY - Uses snake_case throughout
 * ✅ No mapping required - Direct pass-through to API
 *
 * Database Table: compliance_records
 *
 * Purpose: Unified compliance tracking across all types:
 * - Annual Returns (CIPC)
 * - Tax Registrations (SARS: Income Tax, VAT, PAYE, UIF)
 * - B-BBEE Certificates
 * - Beneficial Ownership
 * - Statutory Tasks (COIDA, OHS, EE, etc.)
 */
export interface ComplianceRecord {
  id: number;

  // Multi-tenant & organizational hierarchy
  tenant_id?: number;
  client_id: number;
  program_id?: number;
  cohort_id?: number;
  company_id: number;
  financial_year_id: number;

  // Core structure
  type: 'annual_returns' | 'tax_returns' | 'bbbee_certificate' | 'cipc_registration' | 'vat_registration' | 'paye_registration' | 'uif_registration' | 'workmen_compensation' | 'other';
  period?: string;            // e.g., "FY2025", "Q1 2025"
  title?: string;             // e.g., "Annual Return 2025", "VAT Registration"
  sub_type?: string;          // Additional categorization

  // Flexible date fields (usage depends on compliance type)
  date_1?: string;            // e.g., Anniversary Date, Registration Date, Due Date
  date_2?: string;            // e.g., Due Date, Expiry Date, Submission Date
  date_3?: string;            // e.g., Filing Date, Renewal Date, Completion Date

  // Flexible numeric count fields
  count_1?: number;           // e.g., Black employees, Total directors
  count_2?: number;           // e.g., Total employees, Female directors

  // Flexible monetary amount fields
  amount_1?: number;          // e.g., Fee paid, Skills investment amount
  amount_2?: number;          // e.g., Procurement spend, Tax liability
  amount_3?: number;          // e.g., Additional costs, Penalties

  // Additional metadata
  level?: string;             // e.g., "B-BBEE Level 1", "EME", "QSE"
  progress?: number;          // Task completion percentage (0-100)
  responsible_person?: string; // Person assigned to this compliance item
  status: string;             // e.g., "Pending", "In Progress", "Completed", "Overdue"
  notes?: string;             // Additional notes and comments
  metadata?: any;             // JSON field for flexible data storage

  // Auditing timestamps
  created_at: string;
  updated_at: string;
  created_by?: number;
  updated_by?: number;
}
