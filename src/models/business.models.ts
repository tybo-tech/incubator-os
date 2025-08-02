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
