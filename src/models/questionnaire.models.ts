// models/questionnaire.models.ts

/**
 * 📋 Business Questionnaire System
 * Flexible questionnaire framework for business assessments
 */

export interface BusinessQuestionnaire {
  /** Questionnaire ID */
  id: string;

  /** Questionnaire name/title */
  name: string;

  /** Description */
  description: string;

  /** Questionnaire version */
  version: string;

  /** Sections in this questionnaire */
  sections: QuestionnaireSection[];

  /** Is this questionnaire active */
  is_active: boolean;

  /** Questionnaire type */
  type: 'assessment' | 'checkin' | 'evaluation' | 'onboarding';
}

export interface QuestionnaireSection {
  /** Section ID */
  id: string;

  /** Section name */
  name: string;

  /** Section description */
  description?: string;

  /** Display order */
  order: number;

  /** Is this section required */
  required: boolean;

  /** Questions in this section */
  questions: QuestionnaireQuestion[];

  /** Section icon/color for UI */
  icon?: string;
  color?: string;
}

export interface QuestionnaireQuestion {
  /** Question ID */
  id: string;

  /** Question text */
  question: string;

  /** Question type */
  type: QuestionType;

  /** Display order within section */
  order: number;

  /** Is this question required */
  required: boolean;

  /** Question options (for dropdowns, radio, checkboxes) */
  options?: QuestionOption[];

  /** Validation rules */
  validation?: QuestionValidation;

  /** Help text or description */
  help_text?: string;

  /** Placeholder text */
  placeholder?: string;

  /** Conditional logic - show question only if condition is met */
  show_if?: ConditionalLogic;
}

export type QuestionType =
  | 'text'           // Single line text
  | 'textarea'       // Multi-line text
  | 'number'         // Numeric input
  | 'email'          // Email input
  | 'phone'          // Phone number
  | 'url'            // URL input
  | 'date'           // Date picker
  | 'dropdown'       // Select dropdown
  | 'radio'          // Radio buttons
  | 'checkbox'       // Checkboxes (multi-select)
  | 'rating'         // Rating scale (1-10)
  | 'scale'          // Custom scale
  | 'yesno'          // Yes/No toggle
  | 'file'           // File upload
  | 'currency'       // Money input
  | 'percentage';    // Percentage input

export interface QuestionOption {
  /** Option value */
  value: string;

  /** Display label */
  label: string;

  /** Is this option selected by default */
  default?: boolean;

  /** Additional data for the option */
  data?: any;
}

export interface QuestionValidation {
  /** Minimum length (for text) */
  min_length?: number;

  /** Maximum length (for text) */
  max_length?: number;

  /** Minimum value (for numbers) */
  min_value?: number;

  /** Maximum value (for numbers) */
  max_value?: number;

  /** Regular expression pattern */
  pattern?: string;

  /** Custom validation message */
  message?: string;
}

export interface ConditionalLogic {
  /** Question ID to check */
  question_id: string;

  /** Condition operator */
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';

  /** Value to compare against */
  value: any;
}

/**
 * Response Models
 */
export interface QuestionnaireResponse {
  /** Response ID */
  id?: string;

  /** Company ID */
  company_id: string;

  /** Questionnaire ID */
  questionnaire_id: string;

  /** Section responses */
  section_responses: SectionResponse[];

  /** Response date */
  response_date: Date;

  /** Who completed the questionnaire */
  completed_by?: string;

  /** Is questionnaire completed */
  is_complete: boolean;

  /** Completion percentage */
  completion_percentage: number;

  /** Time taken to complete (minutes) */
  completion_time?: number;
}

export interface SectionResponse {
  /** Section ID */
  section_id: string;

  /** Question responses */
  question_responses: QuestionResponse[];

  /** Is section completed */
  is_complete: boolean;

  /** Section completion date */
  completed_date?: Date;
}

export interface QuestionResponse {
  /** Question ID */
  question_id: string;

  /** Response value(s) */
  value: any;

  /** Response date */
  response_date: Date;

  /** Additional notes */
  notes?: string;
}

/**
 * Progress and Analytics
 */
export interface QuestionnaireProgress {
  /** Total sections */
  total_sections: number;

  /** Completed sections */
  completed_sections: number;

  /** Total questions */
  total_questions: number;

  /** Answered questions */
  answered_questions: number;

  /** Overall progress percentage */
  progress_percentage: number;

  /** Current section */
  current_section?: string;

  /** Estimated time remaining */
  estimated_time_remaining?: number;
}

export interface QuestionnaireAnalytics {
  /** Response summary */
  response_summary: ResponseSummary[];

  /** Completion rate */
  completion_rate: number;

  /** Average completion time */
  average_completion_time: number;

  /** Most skipped questions */
  most_skipped: string[];

  /** Section completion rates */
  section_completion_rates: { [section_id: string]: number };
}

export interface ResponseSummary {
  /** Question ID */
  question_id: string;

  /** Question text */
  question: string;

  /** Response count */
  response_count: number;

  /** Most common answers */
  common_answers: { value: any; count: number }[];

  /** Average rating (for rating questions) */
  average_rating?: number;
}

/**
 * UI Helper Interfaces
 */
export interface QuestionnaireFormData {
  /** Current section index */
  current_section_index: number;

  /** Form responses */
  responses: { [question_id: string]: any };

  /** Validation errors */
  errors: { [question_id: string]: string };

  /** Form dirty state */
  is_dirty: boolean;

  /** Form submission state */
  is_submitting: boolean;
}

export interface SectionNavigationItem {
  /** Section ID */
  section_id: string;

  /** Section name */
  name: string;

  /** Section order */
  order: number;

  /** Is section completed */
  completed: boolean;

  /** Is section current */
  current: boolean;

  /** Can navigate to this section */
  accessible: boolean;
}
