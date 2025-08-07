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

// New OKR initialization functions
export function initOKRTask(): OKRTask {
  return {
    company_id: '',
    key_result_id: '',
    title: '',
    description: '',
    assigned_to: '',
    due_date: new Date().toISOString().split('T')[0],
    priority: 'medium',
    status: 'not_started',
    estimated_hours: 0,
    actual_hours: 0,
    dependencies: [],
    tags: [],
    impact_weight: 5,
    background_color: 'white',
    created_date: new Date().toISOString().split('T')[0],
    completed_date: '',
    notes: '',
  };
}

export function initObjectiveTask(): ObjectiveTask {
  return {
    company_id: '',
    objective_id: '',
    title: '',
    description: '',
    assigned_to: '',
    due_date: new Date().toISOString().split('T')[0],
    priority: 'medium',
    status: 'not_started',
    progress_percentage: 0,
    created_date: new Date().toISOString().split('T')[0],
    completed_date: '',
    notes: '',
  };
}

export function initGrowthArea(): GrowthArea {
  return {
    company_id: '',
    area: '',
    type: 'opportunity',
    description: '',
    impact_area: '',
    rating: 3,
    mentor_notes: '',
  };
}

export function initCompanyVision(): CompanyVision {
  return {
    company_id: '',
    vision_statement: '',
    mission_statement: '',
    core_values: [],
    value_proposition: '',
    target_market: '',
    competitive_advantage: '',
    long_term_goals: '',
    success_metrics: [],
    last_updated: new Date().toISOString().split('T')[0],
    mentor_notes: '',
  };
}

export function initProductService(): ProductService {
  return {
    company_id: '',
    name: '',
    type: 'product',
    category: '',
    description: '',
    target_customers: '',
    pricing_model: '',
    current_status: 'concept',
    revenue_contribution: 0,
    launch_date: '',
    end_date: '',
    features: [],
    challenges: [],
    opportunities: [],
    mentor_notes: '',
  };
}

export function initStrategicGoal(): StrategicGoal {
  return {
    company_id: '',
    title: '',
    description: '',
    category: 'growth',
    priority: 'medium',
    timeline: '6_months',
    target_date: new Date().toISOString().split('T')[0],
    current_status: 'not_started',
    progress_percentage: 0,
    success_criteria: [],
    key_milestones: [],
    dependencies: [],
    responsible_person: '',
    budget_required: 0,
    expected_outcome: '',
    mentor_notes: '',
  };
}

export function initObjective(): Objective {
  return {
    company_id: '',
    title: '',
    description: '',
    category: 'growth',
    priority: 'medium',
    quarter: 'Q1',
    year: new Date().getFullYear(),
    current_status: 'not_started',
    responsible_person: '',
    created_date: new Date().toISOString().split('T')[0],
    mentor_notes: '',
  };
}

export function initKeyResult(): KeyResult {
  return {
    company_id: '',
    objective_id: '',
    title: '',
    description: '',
    metric_type: 'number',
    baseline_value: 0,
    target_value: 100,
    current_value: 0,
    unit: '',
    confidence_level: 3,
    status: 'not_started',
    progress_percentage: 0,
    responsible_person: '',
    created_date: new Date().toISOString().split('T')[0],
    target_date: new Date().toISOString().split('T')[0],
    mentor_notes: '',
  };
}

export function initFinancialTarget(): FinancialTarget {
  const currentYear = new Date().getFullYear();
  return {
    company_id: '',
    year: currentYear,
    quarter: undefined,
    target_turnover: 0,
    target_net_profit: 0,
    gp_margin_target: 0,
    target_description: '',
    milestone_notes: '',
    created_date: new Date().toISOString().split('T')[0],
    last_updated: new Date().toISOString().split('T')[0],
    mentor_notes: '',
  };
}

export function initHRSnapshot(): HRSnapshot {
  const currentDate = new Date();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  return {
    company_id: '',
    year: currentDate.getFullYear(),
    month: monthNames[currentDate.getMonth()] as any,
    permanent_employees: 0,
    temporary_employees: 0,
    interns_volunteers: 0,
    total_employees: 0,
    payroll_cost: 0,
    key_hires: '',
    departures: '',
    growth_notes: '',
    recorded_date: new Date().toISOString().split('T')[0],
    mentor_notes: '',
  };
}

// Utility function to calculate quarter from month
export function calculateQuarter(month: number): 'Q1' | 'Q2' | 'Q3' | 'Q4' {
  if (month >= 1 && month <= 3) return 'Q1';
  if (month >= 4 && month <= 6) return 'Q2';
  if (month >= 7 && month <= 9) return 'Q3';
  return 'Q4';
}


export interface GrowthArea {
  company_id: string;
  area: string;
  type: 'weakness' | 'opportunity' | 'threat' | 'strength';
  description: string;
  impact_area: string;
  rating: number;
  mentor_notes?: string;
}

// ✅ Phase 1: Vision & Strategy Models

// 🎯 Company Vision - Core purpose and direction
export interface CompanyVision {
  company_id: string;
  vision_statement: string;
  mission_statement: string;
  core_values: string[];
  value_proposition: string;
  target_market: string;
  competitive_advantage: string;
  long_term_goals: string;
  success_metrics: string[];
  last_updated: string;
  mentor_notes?: string;
}

// 🛍️ Products & Services - Offering catalog
export interface ProductService {
  company_id: string;
  name: string;
  type: 'product' | 'service';
  category: string;
  description: string;
  target_customers: string;
  pricing_model: string;
  current_status: 'concept' | 'development' | 'testing' | 'launched' | 'discontinued';
  revenue_contribution?: number; // Percentage of total revenue
  launch_date?: string;
  end_date?: string;
  features: string[];
  challenges: string[];
  opportunities: string[];
  mentor_notes?: string;
}

// 🎯 Strategic Goals - Long-term objectives
export interface StrategicGoal {
  company_id: string;
  title: string;
  description: string;
  category: 'growth' | 'financial' | 'operational' | 'market' | 'product' | 'team';
  priority: 'low' | 'medium' | 'high' | 'critical';
  timeline: '3_months' | '6_months' | '1_year' | '2_years' | '5_years';
  target_date: string;
  current_status: 'not_started' | 'in_progress' | 'on_track' | 'at_risk' | 'completed' | 'cancelled';
  progress_percentage: number;
  success_criteria: string[];
  key_milestones: string[];
  dependencies: string[];
  responsible_person?: string;
  budget_required?: number;
  expected_outcome: string;
  mentor_notes?: string;
}

// 🎯 Objective - High-level qualitative goal (OKR style)
export interface Objective {
  company_id: string;
  title: string;
  description: string;
  category: 'growth' | 'financial' | 'operational' | 'market' | 'product' | 'team';
  priority: 'low' | 'medium' | 'high' | 'critical';
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  year: number;
  current_status: 'not_started' | 'in_progress' | 'on_track' | 'at_risk' | 'completed' | 'cancelled';
  responsible_person?: string;
  created_date: string;
  mentor_notes?: string;
}

// 📊 Key Result - Measurable outcome that tracks objective progress
export interface KeyResult {
  company_id: string;
  objective_id: string; // Links to the parent objective
  title: string;
  description?: string;
  metric_type: 'number' | 'percentage' | 'currency' | 'boolean';
  baseline_value: number;
  target_value: number;
  current_value: number;
  unit?: string; // e.g., "followers", "users", "$", "%"
  confidence_level: 1 | 2 | 3 | 4 | 5; // How confident are we we'll hit this?
  status: 'not_started' | 'in_progress' | 'on_track' | 'at_risk' | 'completed' | 'cancelled';
  progress_percentage: number; // Auto-calculated from current vs target
  responsible_person?: string;
  created_date: string;
  target_date: string;
  mentor_notes?: string;
}

// 📋 OKRTask - Specific actionable items under a Key Result (renamed to avoid conflict)
export interface OKRTask {
  company_id: string;
  key_result_id: string; // Links to the parent key result
  title: string;
  description?: string;
  assigned_to?: string;
  due_date: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
  estimated_hours?: number;
  actual_hours?: number;
  dependencies?: string[];
  tags?: string[];
  impact_weight?: number; // How much this task contributes to KR completion (1-10)
  background_color?: 'white' | 'light-orange' | 'light-red' | 'light-green' | 'light-yellow' | 'light-purple' | 'light-blue' | 'light-pink'; // Background color for visual distinction
  created_date: string;
  completed_date?: string;
  notes?: string;
}

// 📋 ObjectiveTask - Simple tasks directly linked to objectives (alternative to full OKR structure)
export interface ObjectiveTask {
  company_id: string;
  objective_id: string; // Links to the parent objective
  title: string;
  description?: string;
  assigned_to?: string;
  due_date: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
  progress_percentage: number;
  created_date: string;
  completed_date?: string;
  notes?: string;
}

// 💰 Financial Target - Revenue and profitability goals per period
export interface FinancialTarget {
  company_id: string;
  year: number;
  quarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4'; // Optional for quarterly targets
  target_turnover: number; // Target revenue/turnover
  target_net_profit: number; // Target net profit
  gp_margin_target: number; // Gross profit margin target (percentage)
  target_description?: string; // Strategy or notes behind the numbers
  milestone_notes?: string; // Key milestones to achieve these targets
  created_date: string;
  last_updated: string;
  mentor_notes?: string;
}

// 👥 HR Snapshot - Team size and structure tracking over time
export interface HRSnapshot {
  company_id: string;
  year: number;
  month: 'January' | 'February' | 'March' | 'April' | 'May' | 'June' |
         'July' | 'August' | 'September' | 'October' | 'November' | 'December';
  permanent_employees: number;
  temporary_employees: number;
  interns_volunteers: number;
  total_employees: number; // Auto-calculated
  payroll_cost?: number; // Optional: total monthly payroll
  key_hires?: string; // Notable hires this month
  departures?: string; // Notable departures this month
  growth_notes?: string; // HR growth strategy or notes
  recorded_date: string;
  mentor_notes?: string;
}
