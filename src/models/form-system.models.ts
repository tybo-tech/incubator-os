/** =========================
 * Form System Interfaces
 * ========================= */

export type ScopeType = 'global' | 'client' | 'program' | 'cohort';
export type FormStatus = 'draft' | 'published' | 'archived';
export type NodeType = 'tab' | 'section' | 'row' | 'field';
export type FieldType =
  | 'text' | 'textarea' | 'number' | 'email' | 'phone' | 'url' | 'date'
  | 'dropdown' | 'radio' | 'checkbox' | 'rating' | 'scale' | 'yesno'
  | 'file' | 'currency' | 'percentage';
export type SessionStatus =
  | 'draft' | 'submitted' | 'advisor_verified' | 'program_approved' | 'cancelled';

export interface IForm {
  id: number;
  form_key: string;
  title: string;
  description?: string | null;
  scope_type: ScopeType;
  scope_id?: number | null;
  version: number;
  status: FormStatus;
  created_at: string;
  updated_at: string;
}

export interface IFormNode {
  id: number;
  form_id: number;
  parent_id?: number | null;
  depth: number;
  node_type: NodeType;
  node_key: string;
  title?: string | null;
  description?: string | null;
  sort_order: number;

  // JSON configuration objects
  settings_json?: any | null;
  layout_class?: string | null;

  // Field-specific properties (null for non-fields)
  field_type?: FieldType | null;
  placeholder?: string | null;
  required?: boolean | null;
  default_json?: any | null;
  options_json?: any | null;
  validation_json?: any | null;
  visibility_json?: any | null;
  metric_key?: string | null;

  // Optional when loading hierarchies
  children?: IFormNode[];
}

export interface IFormSession {
  id: number;
  categories_item_id: number;
  form_id: number;
  session_date: string; // Date format: YYYY-MM-DD
  status: SessionStatus;
  started_at: string;
  submitted_at?: string | null;
  verified_by?: number | null;
  verified_at?: string | null;
  approved_by?: number | null;
  approved_at?: string | null;
  created_by?: number | null;
  notes?: string | null;
}

export interface ISessionFieldResponse {
  id: number;
  session_id: number;
  field_node_id: number;
  value_text?: string | null;
  value_num?: number | null;
  value_date?: string | null; // Date format: YYYY-MM-DD
  value_bool?: boolean | null;
  value_json?: any | null;
  file_url?: string | null;
  created_at: string;
  updated_at: string;

  // Optional when joined with form nodes
  node_key?: string;
  field_type?: FieldType;
  title?: string;
}

/** =========================
 * Request/Response DTOs
 * ========================= */

export interface FormSearchFilters {
  form_key?: string;
  title?: string;
  scope_type?: ScopeType;
  scope_id?: number;
  status?: FormStatus;
}

export interface FormSessionSearchFilters {
  categories_item_id?: number;
  form_id?: number;
  status?: SessionStatus;
  session_date_from?: string;
  session_date_to?: string;
}

export interface FormNodeReorderRequest {
  node_ids: number[];
}

export interface SaveResponsesRequest {
  responses: Partial<ISessionFieldResponse>[];
}

export interface FormSessionWorkflowRequest {
  verified_by?: number;
  approved_by?: number;
}

/** =========================
 * Form Builder Types
 * ========================= */

export interface FormFieldOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

export interface FormFieldValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  custom?: string;
}

export interface FormFieldVisibility {
  field_id?: number;
  operator?: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value?: any;
  logic?: 'and' | 'or';
}

export interface FormNodeSettings {
  cols?: number;
  width?: string;
  badge?: {
    text: string;
    color: string;
  };
  help_text?: string;
  collapsible?: boolean;
  default_collapsed?: boolean;
}

/** =========================
 * Integration with Category System
 * ========================= */

// Extended category item interface to include form session info
export interface ICategoryItemWithSession {
  id: number;
  cohort_id: number;
  program_id: number;
  client_id: number | null;
  company_id: number;
  status: 'active' | 'completed' | 'withdrawn';
  joined_at: string;
  left_at?: string | null;
  notes?: string | null;
  added_by_user_id?: number | null;

  // Optional joined data
  company_name?: string;
  cohort_name?: string;
  program_name?: string;
  client_name?: string;

  // Form session data
  form_sessions?: IFormSession[];
  active_sessions?: IFormSession[];
  completed_sessions?: IFormSession[];
}

// Company detail context for dynamic form loading
export interface CompanyFormContext {
  company_id: number;
  categories_item_id?: number; // Current enrollment context
  program_id?: number;
  cohort_id?: number;
  client_id?: number;
}

// Dynamic form tab structure for company details
export interface CompanyFormTab {
  form: IForm;
  nodes: IFormNode[];
  session?: IFormSession;
  responses?: ISessionFieldResponse[];
  is_active: boolean;
  can_edit: boolean;
}

// Program form configuration
export interface ProgramFormConfig {
  program_id: number;
  program_name: string;
  forms: IForm[];
  default_form_id?: number;
  form_order?: number[];
}
