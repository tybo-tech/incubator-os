export interface ComplianceRecord {
  id: number;

  // Multi-tenant tracking
  tenantId?: number;
  clientId: number;
  programId?: number;
  cohortId?: number;
  companyId: number;
  financialYearId: number;

  // Core structure
  type: 'annual_return' | 'beneficial_ownership' | 'tax_registration' | 'bbbee_compliance' | 'statutory_task';
  period?: string;
  title?: string;
  subType?: string;

  // Dates
  date1?: string;
  date2?: string;
  date3?: string;

  // Numeric metrics
  count1?: number;
  count2?: number;
  amount1?: number;
  amount2?: number;
  amount3?: number;

  // Additional info
  level?: string;
  progress?: number;
  responsiblePerson?: string;
  status: string;
  notes?: string;
  metadata?: any;

  // Auditing
  createdAt: string;
  updatedAt: string;
  createdBy?: number;
  updatedBy?: number;
}
