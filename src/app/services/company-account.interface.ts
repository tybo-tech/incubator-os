export interface CompanyAccount {
  id: number;
  company_id: number;
  company_name?: string; // Available when joined with companies table
  account_name: string;
  description?: string;
  account_number?: string;
  attachments?: any[]; // JSON array of attachments
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanyAccountCreateRequest {
  company_id: number;
  account_name: string;
  description?: string;
  account_number?: string;
  attachments?: any[];
  is_active?: boolean;
}

export interface CompanyAccountUpdateRequest {
  company_id?: number;
  account_name?: string;
  description?: string;
  account_number?: string;
  attachments?: any[];
  is_active?: boolean;
}

export interface CompanyAccountsListResponse {
  success: boolean;
  data: CompanyAccount[];
  count: number;
  message: string;
}

export interface CompanyAccountResponse {
  success: boolean;
  data: CompanyAccount;
  message: string;
}

export interface CompanyAccountsSummary {
  total_accounts: number;
  active_accounts: number;
  inactive_accounts: number;
}

export interface CompanyAccountsSummaryResponse {
  success: boolean;
  data: CompanyAccountsSummary;
  message: string;
}

export interface CompanyAccountsListFilters {
  company_id?: number;
  is_active?: boolean;
  limit?: number;
  offset?: number;
}

export interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
}
