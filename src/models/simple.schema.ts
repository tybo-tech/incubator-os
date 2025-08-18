/** =========================
 * Core Entities (DB-backed)
 * ========================= */

export interface Industry {
  id: number;
  name: string;
  parentId?: number | null;

  // Timestamps (ISO 8601, e.g. "2025-08-18T00:15:10Z")
  createdAt: string;
  updatedAt: string;

  // Optional when you load hierarchies
  parent?: Industry | null;
  children?: Industry[];
}

export type BbbeeValidStatus = 'Valid' | 'Expired' | 'No Date Captured' | string;
export type TaxValidStatus = 'Valid' | 'Expired' | 'No Date Captured' | string;

export interface ICompany {
  id: number;
  name: string;

  registrationNo?: string | null;
  bbbeeLevel?: string | null;
  cipcStatus?: string | null;

  serviceOffering?: string | null;
  description?: string | null;

  city?: string | null;
  suburb?: string | null;
  address?: string | null;
  postalCode?: string | null;
  businessLocation?: string | null;

  contactNumber?: string | null;
  emailAddress?: string | null;
  tradingName?: string | null;

  youthOwned?: boolean;
  blackOwnership?: boolean;
  blackWomenOwnership?: boolean;

  youthOwnedText?: string | null;         // e.g. "Yes"/"No"
  blackOwnershipText?: string | null;
  blackWomenOwnershipText?: string | null;

  complianceNotes?: string | null;

  hasValidBbbbee?: boolean;
  hasTaxClearance?: boolean;
  isSarsRegistered?: boolean;
  hasCipcRegistration?: boolean;

  bbbeeValidStatus?: BbbeeValidStatus | null;
  bbbeeExpiryDate?: string | null;        // date (YYYY-MM-DD)

  taxValidStatus?: TaxValidStatus | null;
  taxPinExpiryDate?: string | null;       // date (YYYY-MM-DD)

  vatNumber?: string | null;

  turnoverEstimated: number;              // stored as rands (e.g. 281826.00)
  turnoverActual: number;

  permanentEmployees: number;
  temporaryEmployees: number;

  locations?: string | null;

  createdAt: string;                      // datetime ISO
  updatedAt: string;

  industryId?: number | null;
  industry?: Industry | null;             // when joined
}

export type UserRole = 'Director' | 'Advisor' | 'Admin' | 'Staff' | string;
export type Race = 'Black' | 'Coloured' | 'Indian' | 'White' | 'Other' | '' | null;
export type Gender = 'Male' | 'Female' | 'Non-binary' | 'Other' | '' | null;
export type UserStatus = 'active' | 'inactive' | 'invited' | string;

export interface User {
  id: number;

  idType: string;               // e.g. "RSA_ID", "Passport"
  idNumber: string;

  companyId: number;

  fullName?: string | null;
  email?: string | null;
  phone?: string | null;

  username: string;
  role: UserRole;

  race?: Race;                  // per your defaults/logic
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
  | 'table'        // grid of columns (each column is a FieldDefinition)
  | 'file';        // optional, if you allow uploads later

export interface Option {
  value: string;               // machine value
  label: string;               // human label
}

export interface ValidationRule {
  // Simple, extensible validation hints
  required?: boolean;
  min?: number;
  max?: number;
  regex?: string;              // source pattern (use with care)
}

export interface FieldDefinition {
  key: string;                 // unique within its section
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
  width?: number;              // grid width hint (1-12, etc.)
  style?: Record<string, unknown>;

  validations?: ValidationRule;
  defaultValue?: unknown;
}

export interface SectionDefinition {
  key: string;                 // unique within the form
  title: string;
  description?: string;
  order?: number;
  fields: FieldDefinition[];
}

export type FormStatus = 'draft' | 'active' | 'archived';

export interface FormDefinition {
  id: number;
  key: string;                 // stable programmatic key, e.g. "onboarding_v1"
  name: string;                // human title
  description?: string;

  version: number;             // bump on schema change
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

  formId: number;              // FK → FormDefinition.id
  companyId: number;           // which company this submission belongs to
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



