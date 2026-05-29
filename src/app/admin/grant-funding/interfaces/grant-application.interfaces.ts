import { INode } from '../../../../models/schema';

// ─── Director ────────────────────────────────────────────────────────────────

export type SARace = 'african' | 'coloured' | 'indian_asian' | 'white' | 'other';

export interface IDirector {
  name: string;
  surname: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  race?: SARace;
  id_number?: string;
  date_of_birth?: string;

  // Contact details
  cell_phone?: string;
  alt_cell_phone?: string;
  phone?: string;
  alt_phone?: string;
  email?: string;

  // Next of kin
  kin_name?: string;
  kin_relationship?: 'spouse' | 'parent' | 'sibling' | 'child' | 'friend' | 'colleague' | 'other';
  kin_phone?: string;

  // Director's personal address
  address_line1?: string;
  address_line2?: string;
  suburb?: string;
  city?: string;
  district?: string;
  province?: string;
}

// ─── Application (main record) ───────────────────────────────────────────────

export type ApplicationStatus =
  | 'applied'
  | 'interview'
  | 'declined'
  | 'approved'
  | 'draft';       // kept for backward-compat

export interface IStatusHistoryEntry {
  status: string;       // dynamic workflow stage key
  timestamp: string;    // ISO 8601
  note?: string;
  reviewed_by?: string; // reviewer attribution for audit trail
}

export type ChecklistItemStatus = 'not_checked' | 'not_received' | 'partially_received' | 'received';

export interface IChecklistItem {
  id: string;
  label: string;
  /** Replaces the old boolean `checked` field with a meaningful 4-state status. */
  status: ChecklistItemStatus;
  /** Optional reviewer note per item (shown via inline textarea). */
  note?: string;
  required?: boolean; // defaults true; only required items gate checklist-enforced transitions
}

/**
 * Default checklist items for every new application.
 * Edit this array to change the defaults for all future applications.
 */
export const DEFAULT_CHECKLIST_ITEMS: Omit<IChecklistItem, 'status'>[] = [
  { id: 'certified_id',        label: 'Certified copy of ID for all directors',    required: true },
  { id: 'cipc_documents',      label: 'CIPC registration documents',                required: true },
  { id: 'bank_statements',     label: '12 months bank statements',                  required: true },
  { id: 'proof_of_address',    label: 'Proof of address (not older than 3 months)', required: true },
  { id: 'tax_clearance',       label: 'SARS tax clearance certificate',              required: true },
  { id: 'bbbee_certificate',   label: 'B-BBEE certificate',                         required: true },
];

export interface IGrantApplicationData {
  // Company basics
  company_name: string;
  trade_name?: string;
  registration_number?: string;
  industry_id?: number | null;
  industry_name?: string | null;

  // Physical address
  address_line1?: string;
  address_line2?: string;
  suburb?: string;
  city?: string;
  district?: string;
  municipality?: string;
  residential_area?: 'township' | 'rural' | 'urban';
  province?: string;

  // Directors (stored inline as array)
  directors?: IDirector[];

  // Ownership flags
  youth_owned?: boolean;
  black_owned?: boolean;
  black_women_owned?: boolean;

  // Workflow & status
  workflow_id?: string;
  status?: string;          // dynamic workflow stage key
  previous_status?: string; // stage before the last transition — used by 'reopen' action
  status_history?: IStatusHistoryEntry[];
  checklist?: IChecklistItem[];
  notes?: string;

  // Uploaded documents (stored inline — each entry is a document slot with an optional uploaded URL)
  documents?: IUploadedDocument[];

  // Presentation schedules this applicant has been assigned to (back-references)
  schedules?: IScheduleReference[];

  // Bank statement summary (denormalised — updated whenever a bank statement row is saved/deleted)
  bank_statement_months?: number;     // number of months with a non-zero value across all FY rows
  bank_statement_grand_total?: number; // sum of all monthly values across all FY rows
}

// ─── Document uploads ─────────────────────────────────────────────────────────

export interface IUploadedDocument {
  id: string;           // stable identifier (e.g. 'certified_id', or uuid for ad-hoc)
  label: string;        // human-readable document type / name
  url?: string;         // uploaded file URL — undefined means not yet uploaded
  uploaded_at?: string; // ISO timestamp of when the file was last uploaded
  required?: boolean;   // defaults true — required docs are visually highlighted
  note?: string;        // optional reviewer note
  tags?: string[];      // optional tags for organization (e.g. ['Legal', 'Financial'])
}

// ─── Schedule back-references ─────────────────────────────────────────────────

/** Lightweight reference stored on the applicant node when assigned to a schedule. */
export interface IScheduleReference {
  schedule_id: number;
  title: string;
  date: string;
  location?: string;
}

export const DEFAULT_UPLOAD_REQUIREMENTS: Omit<IUploadedDocument, 'url' | 'uploaded_at'>[] = [
  { id: 'cipc_registration',   label: 'CIPC Registration',           required: true  },
  { id: 'directors_share_cert', label: 'Directors share certificate', required: true  },
  { id: 'copy_of_id',          label: 'Copy of ID',                  required: true  },
];

// ─── Compliance (child node, one per application) ────────────────────────────

export type ComplianceStatus = 'valid' | 'invalid' | 'expired' | 'not_applicable';

export interface IGrantComplianceData {
  // B-BBEE
  bbbee_status?: ComplianceStatus;
  bbbee_expiry?: string;

  // Tax Clearance
  tax_clearance_status?: ComplianceStatus;
  tax_clearance_expiry?: string;

  // CIPC Registration
  cipc_status?: ComplianceStatus;
  cipc_registration_date?: string;
  cipc_renewal_date?: string;

  // SARS
  sars_registered?: boolean;
}

// ─── Financial Year ──────────────────────────────────────────────────────────

export interface IFinancialYear {
  id: number;
  name: string;
  fy_start_year: number;
  fy_end_year: number;
}

/** Predefined financial years (IDs match the backend financial_years table) */
export const FINANCIAL_YEARS: IFinancialYear[] = [
  { id: 2,  name: 'FY 2020/2021', fy_start_year: 2020, fy_end_year: 2021 },
  { id: 3,  name: 'FY 2021/2022', fy_start_year: 2021, fy_end_year: 2022 },
  { id: 4,  name: 'FY 2022/2023', fy_start_year: 2022, fy_end_year: 2023 },
  { id: 5,  name: 'FY 2023/2024', fy_start_year: 2023, fy_end_year: 2024 },
  { id: 1,  name: 'FY 2024/2025', fy_start_year: 2024, fy_end_year: 2025 },
  { id: 7,  name: 'FY 2025/2026', fy_start_year: 2025, fy_end_year: 2026 },
  { id: 8,  name: 'FY 2026/2027', fy_start_year: 2026, fy_end_year: 2027 },
  { id: 9,  name: 'FY 2027/2028', fy_start_year: 2027, fy_end_year: 2028 },
  { id: 10, name: 'FY 2028/2029', fy_start_year: 2028, fy_end_year: 2029 },
  { id: 11, name: 'FY 2029/2030', fy_start_year: 2029, fy_end_year: 2030 },
  { id: 12, name: 'FY 2030/2031', fy_start_year: 2030, fy_end_year: 2031 },
  { id: 13, name: 'FY 2031/2032', fy_start_year: 2031, fy_end_year: 2032 },
  { id: 14, name: 'FY 2032/2033', fy_start_year: 2032, fy_end_year: 2033 },
];

/** Month column definitions for a March–February financial year */
export const FY_MONTH_COLUMNS: { key: string; label: string }[] = [
  { key: 'm1',  label: 'Mar' },
  { key: 'm2',  label: 'Apr' },
  { key: 'm3',  label: 'May' },
  { key: 'm4',  label: 'Jun' },
  { key: 'm5',  label: 'Jul' },
  { key: 'm6',  label: 'Aug' },
  { key: 'm7',  label: 'Sep' },
  { key: 'm8',  label: 'Oct' },
  { key: 'm9',  label: 'Nov' },
  { key: 'm10', label: 'Dec' },
  { key: 'm11', label: 'Jan' },
  { key: 'm12', label: 'Feb' },
];

// ─── Bank Statement (child node, one per financial year) ─────────────────────

export interface IGrantBankStatementData {
  financial_year_id: number;
  financial_year_name: string;  // e.g. "FY 2024/2025"
  m1?: number;   // Mar (fy_start_year) — undefined = not captured, 0 = zero turnover
  m2?: number;   // Apr
  m3?: number;   // May
  m4?: number;   // Jun
  m5?: number;   // Jul
  m6?: number;   // Aug
  m7?: number;   // Sep
  m8?: number;   // Oct
  m9?: number;   // Nov
  m10?: number;  // Dec
  m11?: number;  // Jan (fy_end_year)
  m12?: number;  // Feb (fy_end_year)
  total_amount: number;
  notes?: string;
}

// ─── Workflow ─────────────────────────────────────────────────────────────────

export interface IWorkflowAction {
  key: string;                           // e.g. 'pass', 'decline'
  label: string;                         // UI button text
  target: string;                        // target stage key, or 'previous' sentinel
  variant?: 'primary' | 'danger' | 'secondary';
}

export interface IWorkflowStage {
  key: string;
  label: string;
  color: string;
  type: 'entry' | 'validation' | 'review' | 'evaluation' | 'final';
  /** Contextual instruction shown at the top of the stage panel. */
  instruction?: string;
  /**
   * Which content panels are visible at this stage.
   * Replaces the old `ui` boolean flags.
   * Known values: 'checklist' | 'documents' | 'bank_statements' | 'evaluation' | 'interview' | 'dynamic_form'
   */
  components?: string[];
  /**
   * When 'interview' is listed in components, this specifies which form template
   * to use for the interview questionnaire (form_template node id).
   */
  interview_template_id?: number;
  /**
   * When 'dynamic_form' is listed in components, this specifies which form template
   * to render as a general-purpose dynamic section (form_template node id).
   */
  form_template_id?: number;
  requires_checklist?: boolean;
  actions?: IWorkflowAction[];
}

export interface IWorkflow {
  id: string;
  name: string;
  stages: IWorkflowStage[];
}

export const GRANT_WORKFLOW_2026: IWorkflow = {
  id: 'grant-2026',
  name: 'Grant Funding 2026',
  stages: [
    {
      key: 'applied',
      label: 'Applied',
      color: 'blue',
      type: 'entry',
      instruction: 'Review the application and verify company details before starting due diligence.',
      components: [],
      actions: [
        { key: 'move_to_due_diligence', label: 'Start Due Diligence', target: 'due_diligence', variant: 'primary' },
        { key: 'decline',               label: 'Decline Application', target: 'declined',      variant: 'danger'  },
      ],
    },
    {
      key: 'due_diligence',
      label: 'Due Diligence',
      color: 'orange',
      type: 'validation',
      instruction: 'Verify all required documents before proceeding to the next stage.',
      components: ['checklist', 'documents'],
      requires_checklist: true,
      actions: [
        { key: 'pass',    label: 'Pass Due Diligence',  target: 'screening', variant: 'primary' },
        { key: 'decline', label: 'Decline Application', target: 'declined',  variant: 'danger'  },
      ],
    },
    {
      key: 'screening',
      label: 'Screening',
      color: 'purple',
      type: 'review',
      instruction: 'Assess the business potential by reviewing financial performance and turnover data.',
      components: ['bank_statements', 'evaluation'],
      actions: [
        { key: 'move_to_demo', label: 'Move to Demo',         target: 'demo',     variant: 'primary' },
        { key: 'decline',      label: 'Decline Application',  target: 'declined', variant: 'danger'  },
      ],
    },
    {
      key: 'demo',
      label: 'Demo',
      color: 'indigo',
      type: 'evaluation',
      instruction: 'Evaluate the live demo presentation and make a final funding decision.',
      components: ['evaluation'],
      actions: [
        { key: 'approve',  label: 'Mark as Approved',    target: 'approved', variant: 'primary' },
        { key: 'decline',  label: 'Decline Application', target: 'declined', variant: 'danger'  },
      ],
    },
    {
      key: 'approved',
      label: 'Approved',
      color: 'green',
      type: 'final',
      instruction: 'Application has been approved for grant funding.',
      components: [],
      actions: [
        { key: 'reopen', label: 'Reopen Application', target: 'previous', variant: 'secondary' },
      ],
    },
    {
      key: 'declined',
      label: 'Declined',
      color: 'red',
      type: 'final',
      instruction: 'Application has been declined. You may reopen it if the decision needs to be reversed.',
      components: [],
      actions: [
        { key: 'reopen', label: 'Reopen Application', target: 'previous', variant: 'secondary' },
      ],
    },
  ],
};

// ─── Node type constants ──────────────────────────────────────────────────────

export const GRANT_NODE_TYPES = {
  APPLICATION: 'grant_application',
  COMPLIANCE: 'grant_compliance',
  BANK_STATEMENT: 'grant_bank_statement',
  WORKFLOW: 'grant_workflow',
} as const;

// ─── Typed node aliases ───────────────────────────────────────────────────────

export type GrantApplication = INode<IGrantApplicationData>;
export type GrantCompliance = INode<IGrantComplianceData>;
export type GrantBankStatement = INode<IGrantBankStatementData>;

// ─── SA Province list ─────────────────────────────────────────────────────────

export const NOK_RELATIONSHIP_OPTIONS: { value: string; label: string }[] = [
  { value: 'spouse',    label: 'Spouse / Partner' },
  { value: 'parent',   label: 'Parent' },
  { value: 'sibling',  label: 'Sibling' },
  { value: 'child',    label: 'Child' },
  { value: 'friend',   label: 'Friend' },
  { value: 'colleague', label: 'Colleague' },
  { value: 'other',    label: 'Other' },
];

export const SA_PROVINCES: string[] = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'Northern Cape',
  'North West',
  'Western Cape',
];

/** South African population groups (Employment Equity Act / Stats SA classification) */
export const SA_RACES: { value: SARace; label: string }[] = [
  { value: 'african',      label: 'Black African' },
  { value: 'coloured',     label: 'Coloured' },
  { value: 'indian_asian', label: 'Indian or Asian' },
  { value: 'white',        label: 'White' },
  { value: 'other',        label: 'Other' },
];

/** Local municipalities (King Cetshwayo District — KwaZulu-Natal) */
export const SA_MUNICIPALITIES: string[] = [
  'City of Mhlathuze',
  'uMfolozi Municipality',
  'Mthonjaneni Municipality',
  'Inkandla Municipality',
  'Umlalazi Municipality',
];

/** Business residential area classification */
export const RESIDENTIAL_AREAS: { value: 'township' | 'rural' | 'urban' | 'peri_urban' | ''; label: string }[] = [
  { value: 'township', label: 'Township' },
  { value: 'rural',    label: 'Rural' },
  { value: 'urban',    label: 'Urban' },
  { value: 'peri_urban',    label: 'Peri-urban' },
];


