export interface IFinancialMetric {
  id: number;
  company_id: number;
  metric_type_id: number;
  year_: number; // matches DB column
  quarter?: string | null; // e.g. Q1, Q2, etc.
  value: number;
  unit: string;
  margin_pct?: number | null;
  created_at?: string;
  updated_at?: string;
}

// Convenience alias to allow using 'year' on write DTOs and mapping before request if needed
export interface CreateFinancialMetricDto {
  company_id: number;
  metric_type_id: number;
  year: number; // will be mapped to year_ server side via endpoint
  quarter?: string | null;
  value: number;
  unit?: string;
  margin_pct?: number | null;
}

export interface UpdateFinancialMetricDto extends Partial<CreateFinancialMetricDto> {
  id: number;
}
