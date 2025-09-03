// models/consolidated-assessment.models.ts

/**
 * 📊 Consolidated Assessment Models
 * Single record approach for storing all assessment data
 */

export interface ConsolidatedAssessmentResponse {
  /** Assessment ID */
  id: string;

  /** Company ID */
  company_id: number;

  /** Questionnaire ID */
  questionnaire_id: string;

  /** All responses from all sections */
  responses: { [questionId: string]: any };

  /** Section completion status */
  section_completion: { [sectionId: string]: SectionCompletionStatus };

  /** Overall assessment metadata */
  metadata: AssessmentMetadata;

  /** Timestamps */
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface SectionCompletionStatus {
  /** Section ID */
  section_id: string;

  /** Is section complete */
  is_complete: boolean;

  /** Last updated timestamp */
  last_updated: string;

  /** Completion timestamp */
  completed_at?: string;

  /** Number of answered questions in this section */
  answered_questions: number;

  /** Total questions in this section */
  total_questions: number;
}

export interface AssessmentMetadata {
  /** Current section index user is on */
  current_section_index: number;

  /** Overall completion percentage */
  overall_completion_percentage: number;

  /** Total answered questions across all sections */
  total_answered_questions: number;

  /** Total questions across all sections */
  total_questions: number;

  /** Is entire assessment complete */
  is_complete: boolean;

  /** Assessment start date */
  started_at: string;

  /** Last activity timestamp */
  last_activity: string;
}

/**
 * Migration helper to convert old section-based data to consolidated format
 */
export interface LegacyAssessmentData {
  introduction?: any;
  products_services?: any;
  strategy_cascade?: any;
  self_assessment?: any;
  sars_compliance?: any;
}

export interface MigrationResult {
  /** Consolidated assessment record */
  consolidatedAssessment: ConsolidatedAssessmentResponse;

  /** Migration success status */
  success: boolean;

  /** Any migration errors */
  errors: string[];

  /** Migrated sections count */
  migratedSections: number;
}
