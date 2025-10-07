/** =========================
 * Core Entities (DB-backed)
 * ========================= */

export interface Industry {
  id: number;
  name: string;
  slug?: string; // Generated field
  parent_id?: number | null;
  description?: string | null;
  notes?: string | null;
  image_url?: string | null;
  icon_class?: string | null;
  color_theme?: string | null;
  background_theme?: string | null;
  tags?: any[] | null; // JSON field
  is_active?: boolean;
  display_order?: number;
  created_by?: number | null;

  // Timestamps (ISO 8601, e.g. "2025-08-18T00:15:10Z")
  created_at: string;
  updated_at: string;

  // Optional when you load hierarchies
  parent?: Industry | null;
  children?: Industry[];

  // Optional hierarchy stats (when loaded with hierarchy)
  children_count?: number;
  companies_count?: number;
  depth?: number;
}

export type CategoryType = 'client' | 'program' | 'cohort';

export interface ICategory {
  id: number;
  name: string;
  slug: string;
  type: CategoryType;
  description?: string | null;
  image_url?: string | null;
  parent_id?: number | null;
  depth: number;

  // Timestamps (ISO 8601, e.g. "2025-08-18T00:15:10Z")
  created_at: string;
  updated_at: string;

  // Optional when you load hierarchies/trees
  children?: ICategory[];
}

export type BbbeeValidStatus =
  | 'Valid'
  | 'Expired'
  | 'No Date Captured'
  | string;
export type TaxValidStatus = 'Valid' | 'Expired' | 'No Date Captured' | string;

export interface ICompany {
  id: number;
  name: string;
  registration_no: string | null;
  bbbee_level: string | null;
  cipc_status: string | null;
  service_offering: string | null;
  description: string | null;
  city: string | null;
  suburb: string | null;
  address: string | null;
  postal_code: string | null;
  business_location: string | null;
  contact_number: string | null;
  email_address: string | null;
  trading_name: string | null;

  youth_owned: boolean;
  black_ownership: boolean;
  black_women_ownership: boolean;

  youth_owned_text: string | null;
  black_ownership_text: string | null;
  black_women_ownership_text: string | null;

  compliance_notes: string | null;

  has_valid_bbbbee: boolean;
  has_tax_clearance: boolean;
  is_sars_registered: boolean;
  has_cipc_registration: boolean;

  bbbee_valid_status: string | null;
  bbbee_expiry_date: string | null; // format: YYYY-MM-DD
  tax_valid_status: string | null;
  tax_pin_expiry_date: string | null; // format: YYYY-MM-DD
  vat_number: string | null;

  turnover_estimated: number | null;
  turnover_actual: number | null;

  permanent_employees: number;
  temporary_employees: number;
  locations: string | null;

  created_at: string; // format: YYYY-MM-DD HH:mm:ss
  updated_at: string; // format: YYYY-MM-DD HH:mm:ss
  industry_id: number | null;

  // temp
  contact_person: string | null;
  sector_name: string | null;
}

export function initCompany(): ICompany{
  return {
    id: 0,
    name: '',
    registration_no: null,
    bbbee_level: null,
    cipc_status: null,
    service_offering: null,
    description: null,
    city: null,
    suburb: null,
    address: null,
    postal_code: null,
    business_location: null,
    contact_number: null,
    email_address: null,
    trading_name: null,

    youth_owned: false,
    black_ownership: false,
    black_women_ownership: false,

    youth_owned_text: null,
    black_ownership_text: null,
    black_women_ownership_text: null,

    compliance_notes: null,

    has_valid_bbbbee: false,
    has_tax_clearance: false,
    is_sars_registered: false,
    has_cipc_registration: false,

    bbbee_valid_status: null,
    bbbee_expiry_date: null,
    tax_valid_status: null,
    tax_pin_expiry_date: null,
    vat_number: null,

    turnover_estimated: null,
    turnover_actual: null,

    permanent_employees: 0,
    temporary_employees: 0,
    locations: null,

    created_at: '',
    updated_at: '',
    industry_id: null,

    // temp
    contact_person: null,
    sector_name: null,
  }
}

// Financial Records Interface for monthly/quarterly financial data
export interface IFinancialRecord {
  id: number;
  company_id: number;
  period_date: string; // format: YYYY-MM-DD
  year: number;
  month: number;
  turnover_monthly_avg: string; // decimal as string
  quarter: number;
  is_pre_ignition: boolean;
  quarter_label: string; // e.g., "Q1", "Q2", etc.

  // Financial metrics (nullable fields from your data)
  turnover: string | null; // decimal as string
  cost_of_sales: string | null;
  business_expenses: string | null;
  gross_profit: string | null;
  net_profit: string | null;
  gp_margin: string | null; // gross profit margin
  np_margin: string | null; // net profit margin

  // Balance sheet items
  cash_on_hand: string | null;
  debtors: string | null;
  creditors: string | null;
  inventory_on_hand: string | null;
  working_capital_ratio: string | null;
  net_assets: string | null;

  // Additional notes
  notes: string | null;

  // Timestamps
  created_at: string; // format: YYYY-MM-DD HH:mm:ss
  updated_at: string; // format: YYYY-MM-DD HH:mm:ss
}

export type UserRole = 'Director' | 'Advisor' | 'Admin' | 'Staff' | string;
export type Race =
  | 'Black'
  | 'Coloured'
  | 'Indian'
  | 'White'
  | 'Other'
  | ''
  | null;
export type Gender = 'Male' | 'Female' | 'Non-binary' | 'Other' | '' | null;
export type UserStatus = 'active' | 'inactive' | 'invited' | string;

export interface User {
  id: number;

  idType: string; // e.g. "RSA_ID", "Passport"
  idNumber: string;

  companyId: number;

  fullName?: string | null;
  email?: string | null;
  phone?: string | null;

  username: string;
  role: UserRole;

  race?: Race; // per your defaults/logic
  gender?: Gender;

  status: UserStatus;

  passwordHash?: string | null;

  createdAt: string;
  updatedAt: string;

  // Optional denormalized join
  company?: ICompany;
}

/** =========================
 * Dynamic Forms (Definitions)
 * ========================= */

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'currency'
  | 'date'
  | 'checkbox'
  | 'select'
  | 'chips'
  | 'table' // grid of columns (each column is a FieldDefinition)
  | 'file'; // optional, if you allow uploads later

export interface Option {
  value: string; // machine value
  label: string; // human label
}

export interface ValidationRule {
  // Simple, extensible validation hints
  required?: boolean;
  min?: number;
  max?: number;
  regex?: string; // source pattern (use with care)
}

export interface FieldDefinition {
  key: string; // unique within its section
  label: string;
  type: FieldType;

  placeholder?: string;
  helpText?: string;

  // For pickers
  options?: (string | Option)[];

  // For table fields: columns are FieldDefinitions, but no nested "table" type inside a table
  columns?: FieldDefinition[];

  // UI hints you may use on the front-end
  order?: number;
  width?: number; // grid width hint (1-12, etc.)
  style?: Record<string, unknown>;

  validations?: ValidationRule;
  defaultValue?: unknown;
}

export interface SectionDefinition {
  key: string; // unique within the form
  title: string;
  description?: string;
  order?: number;
  fields: FieldDefinition[];
}

export type FormStatus = 'draft' | 'active' | 'archived';

export interface FormDefinition {
  id: number;
  key: string; // stable programmatic key, e.g. "onboarding_v1"
  name: string; // human title
  description?: string;

  version: number; // bump on schema change
  status: FormStatus;

  // Entire structure is JSON in DB
  sections: SectionDefinition[];

  // Optional scoping (multi-tenant / program)
  tenantId?: number | null;

  createdAt: string;
  updatedAt: string;
}

/** =========================
 * Dynamic Forms (Submissions)
 * ========================= */

// Primitive value types allowed in submissions:
export type ValuePrimitive = string | number | boolean | null;
// A row in a table field:
export type TableRow = Record<string, ValuePrimitive>;
// Field value can be a primitive, array (e.g., chips), or table rows
export type FieldValue = ValuePrimitive | ValuePrimitive[] | TableRow[];

export type SubmissionStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export interface FormSubmission {
  id: number;

  formId: number; // FK → FormDefinition.id
  companyId: number; // which company this submission belongs to
  submittedByUserId?: number | null;

  // Version of the form used at submission time (so later schema changes don’t break old subs)
  formVersion: number;

  // Values keyed by section + field. Two shapes are common;
  // pick one and stick to it on the API. Here we support both for flexibility:

  /** Flat map: "sectionKey.fieldKey" → value */
  values?: Record<string, FieldValue>;

  /** Structured: sectionKey → { fieldKey → value } */
  sectionValues?: Record<string, Record<string, FieldValue>>;

  status: SubmissionStatus;

  createdAt: string;
  updatedAt: string;

  // Optional audit trail
  reviewedByUserId?: number | null;
  reviewedAt?: string | null;
  notes?: string | null;
}
