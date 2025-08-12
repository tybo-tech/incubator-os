// models/business.assessment.models.ts

/**
 * 📋 Business Assessment Models
 * Comprehensive questionnaire data for business evaluation and onboarding
 */

export interface BusinessAssessment {
  /** Assessment ID */
  id?: string;

  /** Company ID this assessment belongs to */
  company_id: string;

  /** Assessment date */
  assessment_date: Date;

  /** Assessment type (initial, quarterly, annual, exit) */
  assessment_type: 'initial' | 'quarterly' | 'annual' | 'exit';

  /** Introduction section */
  introduction: BusinessIntroduction;

  /** Products and services */
  products_services: ProductsServicesAssessment;

  /** Self assessment ratings */
  self_assessment: SelfAssessment;

  /** SARS and compliance status */
  sars_status: SarsComplianceStatus;

  /** Additional sections (to be expanded) */
  additional_sections?: AssessmentSection[];

  /** Overall assessment score/status */
  overall_score?: number;
  overall_status?: 'excellent' | 'good' | 'needs_improvement' | 'critical';

  /** Assessment notes */
  notes?: string;

  /** Completed by */
  completed_by?: string;

  /** Assessment completion status */
  is_complete: boolean;
}

export interface BusinessIntroduction {
  /** Brief business description */
  business_description: string;

  /** Products/services summary */
  products_summary: string;

  /** Why business was started */
  business_motivation: string;

  /** Current business state */
  current_state: string;

  /** Years in operation */
  years_in_operation?: number;

  /** Business growth assessment */
  growth_assessment?: string;
}

export interface ProductsServicesAssessment {
  /** List of products and services offered */
  offerings: ProductServiceOffering[];

  /** Primary business focus */
  primary_focus?: string;

  /** Target market description */
  target_market?: string;

  /** Competitive advantages */
  competitive_advantages?: string[];
}

export interface ProductServiceOffering {
  /** Name of product/service */
  name: string;

  /** Category */
  category: string;

  /** Description */
  description?: string;

  /** Revenue contribution (%) */
  revenue_percentage?: number;

  /** Status */
  status: 'active' | 'development' | 'discontinued' | 'planned';
}

export interface SelfAssessment {
  /** Sales ability rating (1-10) */
  sales_ability: number;

  /** Marketing ability rating (1-10) */
  marketing_ability: number;

  /** Accounting understanding rating (1-10) */
  accounting_understanding: number;

  /** Leadership skills rating (1-10) */
  leadership_skills?: number;

  /** Technology skills rating (1-10) */
  technology_skills?: number;

  /** Financial management rating (1-10) */
  financial_management?: number;

  /** Operations management rating (1-10) */
  operations_management?: number;

  /** Customer service rating (1-10) */
  customer_service?: number;

  /** Overall confidence level */
  overall_confidence?: number;

  /** Areas for improvement */
  improvement_areas?: string[];

  /** Strengths */
  strengths?: string[];
}

export interface SarsComplianceStatus {
  /** VAT registration status */
  vat_status: 'compliant' | 'non_compliant' | 'not_applicable' | 'pending';

  /** PAYE status */
  paye_status: 'compliant' | 'non_compliant' | 'not_applicable' | 'pending';

  /** Income tax status */
  income_tax_status?: 'compliant' | 'non_compliant' | 'not_applicable' | 'pending';

  /** UIF status */
  uif_status?: 'compliant' | 'non_compliant' | 'not_applicable' | 'pending';

  /** Skills Development Levy status */
  sdl_status?: 'compliant' | 'non_compliant' | 'not_applicable' | 'pending';

  /** Workmen's Compensation status */
  compensation_status?: 'compliant' | 'non_compliant' | 'not_applicable' | 'pending';

  /** Tax clearance certificate */
  has_tax_clearance: boolean;

  /** Last compliance check date */
  last_check_date?: Date;

  /** Compliance notes */
  compliance_notes?: string;

  /** Outstanding issues */
  outstanding_issues?: ComplianceIssue[];
}

export interface ComplianceIssue {
  /** Issue type */
  type: 'vat' | 'paye' | 'income_tax' | 'uif' | 'sdl' | 'compensation' | 'other';

  /** Issue description */
  description: string;

  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';

  /** Due date for resolution */
  due_date?: Date;

  /** Status */
  status: 'open' | 'in_progress' | 'resolved' | 'overdue';

  /** Resolution notes */
  resolution_notes?: string;
}

export interface AssessmentSection {
  /** Section ID */
  id: string;

  /** Section name */
  name: string;

  /** Section data (flexible structure) */
  data: any;

  /** Section completion status */
  is_complete: boolean;

  /** Section order */
  order: number;
}

/**
 * Assessment scoring and analysis interfaces
 */
export interface AssessmentScore {
  /** Category */
  category: string;

  /** Score (0-100) */
  score: number;

  /** Weight in overall assessment */
  weight: number;

  /** Recommendations */
  recommendations?: string[];
}

export interface AssessmentAnalysis {
  /** Overall assessment score */
  overall_score: number;

  /** Category scores */
  category_scores: AssessmentScore[];

  /** Strengths identified */
  strengths: string[];

  /** Areas for improvement */
  improvement_areas: string[];

  /** Risk factors */
  risk_factors: string[];

  /** Recommended actions */
  recommended_actions: string[];

  /** Business readiness level */
  readiness_level: 'not_ready' | 'early_stage' | 'ready' | 'advanced';
}

/**
 * Helper interfaces for form management
 */
export interface AssessmentFormSection {
  /** Section identifier */
  section: string;

  /** Section title */
  title: string;

  /** Section description */
  description?: string;

  /** Is section required */
  required: boolean;

  /** Section completion status */
  completed: boolean;

  /** Section order */
  order: number;
}

export interface AssessmentProgress {
  /** Total sections */
  total_sections: number;

  /** Completed sections */
  completed_sections: number;

  /** Progress percentage */
  progress_percentage: number;

  /** Current section */
  current_section?: string;

  /** Estimated completion time */
  estimated_completion_time?: number;
}
