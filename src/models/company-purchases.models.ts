export interface CompanyPurchase {
  id?: number;
  company_id: number;
  company_name?: string;
  registration_no?: string;
  purchase_type: string;
  service_provider: string;
  items: string;
  amount: number;
  purchase_order: boolean;
  invoice_received: boolean;
  invoice_type?: string;
  items_received: boolean;
  aligned_with_presentation: boolean;
  source_file?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CompanyPurchaseFilters {
  company_id?: number;
  purchase_type?: string;
  service_provider?: string;
  min_amount?: number;
  max_amount?: number;
  purchase_order?: boolean;
  invoice_received?: boolean;
  items_received?: boolean;
  aligned_with_presentation?: boolean;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export interface CompanyPurchaseStatistics {
  total_purchases: number;
  total_amount: number;
  average_amount: number;
  min_amount: number;
  max_amount: number;
  with_purchase_order: number;
  with_invoice: number;
  items_delivered: number;
  aligned_purchases: number;
  unique_types: number;
  unique_providers: number;
}

export interface PurchaseTypeBreakdown {
  purchase_type: string;
  count: number;
  total_amount: number;
  average_amount: number;
}

export interface ServiceProviderBreakdown {
  service_provider: string;
  count: number;
  total_amount: number;
  average_amount: number;
}

export interface MonthlyPurchaseTrend {
  year: number;
  month: number;
  month_name: string;
  purchase_count: number;
  total_amount: number;
  average_amount: number;
}

export interface CompanyPurchaseResponse {
  success: boolean;
  data?: {
    records: CompanyPurchase[];
    total_count?: number;
    count: number;
  };
  message?: string;
}

export interface CompanyPurchaseStatisticsResponse {
  success: boolean;
  data?: CompanyPurchaseStatistics;
  message?: string;
}

export interface PurchaseTypeBreakdownResponse {
  success: boolean;
  data?: {
    records: PurchaseTypeBreakdown[];
    count: number;
  };
  message?: string;
}

export interface ServiceProviderBreakdownResponse {
  success: boolean;
  data?: {
    records: ServiceProviderBreakdown[];
    count: number;
  };
  message?: string;
}

export interface MonthlyTrendsResponse {
  success: boolean;
  data?: {
    records: MonthlyPurchaseTrend[];
    count: number;
  };
  message?: string;
}

export interface CompanyPurchaseCountResponse {
  success: boolean;
  data?: {
    count: number;
  };
  message?: string;
}

// Validation types
export interface CompanyPurchaseValidationErrors {
  company_id?: string[];
  purchase_type?: string[];
  service_provider?: string[];
  items?: string[];
  amount?: string[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: CompanyPurchaseValidationErrors;
}
