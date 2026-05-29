import { INode } from '../../../../models/schema';

// ─── Question Types ───────────────────────────────────────────────────────────

export type QuestionType =
  | 'text' | 'textarea' | 'boolean' | 'number' | 'select' | 'date' | 'rating' | 'currency'
  | 'applicant_picker'
  | 'user_picker';

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  text: 'Short Text',
  textarea: 'Long Text',
  boolean: 'Yes / No',
  number: 'Number',
  select: 'Select (options)',
  date: 'Date',
  rating: 'Rating (scale)',
  currency: 'Currency (R)',
  applicant_picker: 'Applicant Picker',
  user_picker: 'User Picker',
};

// ─── Picker field configuration ───────────────────────────────────────────────

export interface IPickerConfig {
  /**
   * applicant_picker: filter by one or more workflow stage keys
   * e.g. ['due_diligence', 'stage_1777464072202']
   * Empty/undefined = all stages.
   */
  stages?: string[];
  /**
   * user_picker: filter to specific roles.
   * e.g. ['Judge', 'Coordinator']
   * Empty/undefined = all roles.
   */
  roles?: string[];
  /** When true the user can type a free-text value instead of picking. */
  allowFreeText?: boolean;
  /** Placeholder shown in the search input. */
  placeholder?: string;
}

// ─── Question (tree node) ─────────────────────────────────────────────────────

/**
 * Node-level fields that a picker answer can be mapped to.
 * The picked value's numeric `id` will be written to this field on the submission node.
 */
export type MapsToField = 'company_id' | 'created_by';

export const MAPS_TO_LABELS: Record<MapsToField, string> = {
  company_id: 'Company ID (company_id)',
  created_by: 'Created By (created_by)',
};

export interface IFormQuestion {
  /** Stable identifier — do NOT randomise on every render. */
  id: string;
  /** The question text shown to the respondent. */
  label: string;
  type: QuestionType;
  /** Configuration for applicant_picker and user_picker field types. */
  pickerConfig?: IPickerConfig;
  /**
   * When set, the picked value's numeric `id` is written to this node-level field
   * at submission time. Only meaningful for applicant_picker and user_picker types.
   * e.g. 'company_id' | 'created_by'
   */
  mapsTo?: MapsToField;
  required: boolean;
  /** Only for type === 'select'. */
  options?: string[];
  /** Only for type === 'rating'. Number of points on the scale (default: 5). */
  scale?: number;
  /**
   * Conditional follow-up questions.
   * Each child's `visibleIf.value` is matched against THIS question's answer.
   */
  children?: IFormQuestion[];
  /**
   * Visibility condition — only set when this question is nested inside
   * a parent's `children[]`. The UI hides this question unless the
   * immediate parent's answer equals `visibleIf.value`.
   */
  visibleIf?: {
    value: any;
  };
  /**
   * Pre-populated answer value for new (blank) submissions.
   * boolean questions: true/false, select: option string, number: number.
   */
  default?: any;
  /**
   * When true, a non-passing answer blocks progression and flags a risk.
   * Used by decision-support rendering (e.g. due diligence forms).
   */
  isBlocking?: boolean;
}

// ─── Section ──────────────────────────────────────────────────────────────────

export interface IFormSection {
  id: string;
  title: string;
  order: number;
  questions: IFormQuestion[];
}

// ─── Template meta ────────────────────────────────────────────────────────────

export interface IFormTemplateMeta {
  /** Show the Interviewer Notes textarea in the submission UI. */
  notes_enabled?: boolean;
  /** If set, renders a decision selector in the submission footer. */
  decision?: {
    /** Field key used when storing the chosen value (e.g. "recommendation"). */
    field: string;
    options: string[];
  };
  /**
   * When true, multiple people can each submit their own copy of this form
   * (e.g. a panel of judges). The admin view shows per-judge submissions
   * and auto-calculates averages for numeric/rating questions.
   * A shareable judge link is generated from the applicant stage panel.
   */
  multi_judge?: boolean;
  /**
   * When true, the public form step 0 requires the respondent to pick their
   * company from the registered grant_application list instead of typing it.
   */
  require_company_selection?: boolean;
  /** Workflow stage keys to filter the applicant picker. Empty = all stages. */
  applicant_stages?: string[];
  /** When true, the respondent can type a company name not in the picker list. */
  allow_guest_company?: boolean;
  /**
   * When true, the public form step 0 requires the respondent to pick their
   * name from the registered user list instead of typing it.
   */
  require_user_selection?: boolean;
  /** System roles to filter the user picker. Empty = all roles. */
  user_roles?: string[];
  /** When true, the respondent can type a name not in the user picker list. */
  allow_guest_user?: boolean;
}

// ─── Template (stored as a node) ─────────────────────────────────────────────

export interface IFormTemplateData {
  name: string;
  description?: string;
  version: number;
  sections: IFormSection[];
  /** Optional behaviour hints consumed by the submission UI. */
  meta?: IFormTemplateMeta;
  /**
   * Set when this template was created from a built-in starter.
   * Matches the `key` field in `BUILT_IN_TEMPLATES`.
   * Used by the list UI to link saved copies back to their source.
   */
  built_in_key?: string;
}

// ─── Submission comment ───────────────────────────────────────────────────────

export interface IFormComment {
  id: string;
  text: string;
  author?: string;
  timestamp: string;
  /** If set, this comment belongs to a specific section. */
  section_id?: string;
}

// ─── Submission (child node — parent_id = template id, company_id = applicant company) ─────

export interface IFormSubmissionData {
  /** Node id of the FormTemplate this submission is based on. */
  form_template_id: number;
  /** Denormalised template name for display without extra lookup. */
  form_template_name: string;
  submitted_at: string;
  status: 'draft' | 'submitted';
  /**
   * Flat key-value map keyed by question id.
   * Even though the template is a tree, answers are intentionally flat
   * for easy querying and analytics.
   */
  answers: Record<string, any>;
  /**
   * Human-readable label for the respondent (company name or applicant name).
   * Set when the submission is created internally via the interview workflow.
   */
  applicant_label?: string;
  /**
   * Respondent identity — populated for external / public submissions.
   * Internal interview submissions leave this undefined.
   */
  respondent?: IFormResponseRespondent;
  meta?: {
    date?: string;
    check_in?: string;
    interviewer_notes?: string;
    /** Value chosen in the decision selector (if the template defines one). */
    decision?: string;
    comments?: IFormComment[];
  };
}

// ─── Respondent identity (filled by external submitters) ─────────────────────

export interface IFormResponseRespondent {
  /** Full name of the director / person completing the form. */
  director_name: string;
  email: string;
  company_name: string;
  /** CIPC company registration number. */
  registration_number: string;
}

// ─── Node types ───────────────────────────────────────────────────────────────

export const FORM_NODE_TYPES = {
  TEMPLATE: 'form_template',
  /**
   * All submissions — internal interviews, judge evaluations, and public/external
   * responses — share this single node type for consistent querying.
   * company_id = applicant (grant_application node id)
   * created_by = judge / user id (optional for anonymous public submissions)
   * data.respondent = present for external public submissions
   */
  SUBMISSION: 'form_submission',
} as const;

export type FormTemplate = INode<IFormTemplateData>;
export type FormSubmission = INode<IFormSubmissionData>;
