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
  assigned_to?: number; // user ID
  priority?: 'low' | 'medium' | 'high';
  status?: 'todo' | 'in_progress' | 'done';
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
    assigned_to: undefined,
    priority: 'medium',
    status: 'todo',
  };
}

// ✅ Utility function to calculate quarter based on program fiscal year
// Q1: April, May, June (4, 5, 6)
// Q2: July, August, September (7, 8, 9)
// Q3: October, November, December (10, 11, 12)
// Q4: January, February, March (1, 2, 3)
export function calculateQuarter(month: number): 'Q1' | 'Q2' | 'Q3' | 'Q4' {
  if (month >= 4 && month <= 6) return 'Q1';
  if (month >= 7 && month <= 9) return 'Q2';
  if (month >= 10 && month <= 12) return 'Q3';
  if (month >= 1 && month <= 3) return 'Q4';
  throw new Error('Invalid month number. Must be between 1 and 12.');
}

// ✅ Utility function to get fiscal year based on program calendar
// Fiscal year starts in April and ends in March
export function getFiscalYear(month: number, year: number): number {
  // If month is Jan-Mar, it belongs to the fiscal year that started in the previous calendar year
  if (month >= 1 && month <= 3) {
    return year - 1;
  }
  // If month is Apr-Dec, it belongs to the fiscal year that started in the current calendar year
  return year;
}

// ✅ Enhanced init function that auto-calculates quarter
export function initBankStatementWithQuarter(month?: number, year?: number): BankStatement {
  const currentDate = new Date();
  const targetMonth = month || (currentDate.getMonth() + 1);
  const targetYear = year || currentDate.getFullYear();

  return {
    year: targetYear,
    month: targetMonth,
    quarter: calculateQuarter(targetMonth),
    opening_balance: 0,
    closing_balance: 0,
    total_income: 0,
    total_expense: 0,
    account_name: '',
  };
}
