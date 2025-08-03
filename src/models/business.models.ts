// models/business.models.ts

// ✅ Primary company object
export interface Company {
  name: string;
  registration_no: string;
  industry: string;
  vat_number?: string;
  bbbee_level?: string;
  bbbee_expiry_date?: string;
  address?: string;
  city?: string;
  suburb?: string;
  postal_code?: string;
  turnover_estimated?: number;
  turnover_actual?: number;
  permanent_employees?: number;
  temporary_employees?: number;
  description?: string;

  // Import-specific fields (can be normalized later)
  trading_name?: string;
  director_id_number?: string;
  contact_number?: string;
  email_address?: string;
  contact_person?: string;
  tax_pin_expiry_date?: string;
  tax_valid_status?: string;
  bbbee_valid_status?: string;
  black_ownership?: string;
  black_women_ownership?: string;
  youth_owned?: string;
  company_turnover_raw?: string; // Raw turnover string from import
  business_location?: string;
  service_offering?: string;
  cipc_status?: string;
  locations?: string;

  // Composite blocks
  compliance?: Compliance;
}

// ✅ Compliance block (stored inside `company.compliance`)
export interface Compliance {
  is_sars_registered: boolean;
  has_tax_clearance: boolean;
  has_cipc_registration: boolean;
  has_valid_bbbbee: boolean;
  notes?: string;
}

// ✅ Transaction block (stored as its own node)
export interface Transaction {
  type: 'income' | 'expense';
  amount: number;
  status: 'cleared' | 'pending' | 'reversed';
  method?: 'eft' | 'cash' | 'card';
  description?: string;
  reference?: string;
  transaction_date: string;
}

// ✅ BankStatement block (stored as its own node)
export interface BankStatement {
  year: number;
  month: number;
  quarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  opening_balance: number;
  closing_balance: number;
  total_income: number;
  total_expense: number;
  account_name?: string;
}

// ✅ Task block (stored as its own node)
export interface Task {
  title: string;
  description?: string;
  due_date: string;
  completed: boolean;
  assigned_to?: string; // person name/email (will map to IDs later)
  priority?: 'low' | 'medium' | 'high';
  status?: 'todo' | 'in_progress' | 'done';
  created_date?: string;
  company_id?: number; // link to company if task is company-specific
}

export function initCompany(): Company {
  return {
    name: '',
    registration_no: '',
    industry: '',
    vat_number: '',
    bbbee_level: '',
    bbbee_expiry_date: '',
    address: '',
    city: '',
    suburb: '',
    postal_code: '',
    turnover_estimated: 0,
    turnover_actual: 0,
    permanent_employees: 0,
    temporary_employees: 0,
    description: '',

    // Import fields
    trading_name: '',
    director_id_number: '',
    contact_number: '',
    email_address: '',
    contact_person: '',
    tax_pin_expiry_date: '',
    tax_valid_status: '',
    bbbee_valid_status: '',
    black_ownership: '',
    black_women_ownership: '',
    youth_owned: '',
    company_turnover_raw: '',
    business_location: '',
    service_offering: '',
    cipc_status: '',
    locations: '',

    compliance: {
      is_sars_registered: false,
      has_tax_clearance: false,
      has_cipc_registration: false,
      has_valid_bbbbee: false,
      notes: '',
    },
  };
}

export function initTransaction(): Transaction {
  return {
    type: 'income',
    amount: 0,
    status: 'pending',
    method: undefined,
    description: '',
    reference: '',
    transaction_date: new Date().toISOString().split('T')[0], // Default to today
  };
}

export function initBankStatement(): BankStatement {
  return {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1, // Months are 0-indexed
    opening_balance: 0,
    closing_balance: 0,
    total_income: 0,
    total_expense: 0,
    account_name: '',
  };
}

export function initTask(): Task {
  return {
    title: '',
    description: '',
    due_date: new Date().toISOString().split('T')[0], // Default to today
    completed: false,
    assigned_to: '',
    priority: 'medium',
    status: 'todo',
    created_date: new Date().toISOString().split('T')[0],
    company_id: undefined,
  };
}

// Utility function to calculate quarter from month
export function calculateQuarter(month: number): 'Q1' | 'Q2' | 'Q3' | 'Q4' {
  if (month >= 1 && month <= 3) return 'Q1';
  if (month >= 4 && month <= 6) return 'Q2';
  if (month >= 7 && month <= 9) return 'Q3';
  return 'Q4';
}
