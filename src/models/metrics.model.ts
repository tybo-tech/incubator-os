export interface IMetricGroup {
  id: number;
  client_id: number;
  code: string;
  name: string;
  description?: string;
  show_total: number; // 0/1
  show_margin: number; // 0/1
  graph_color?: string | null;
  types?: IMetricType[]; // included in hierarchy fetch
}

export type MetricPeriodType = 'QUARTERLY' | 'YEARLY';

export interface IMetricType {
  id: number;
  group_id: number;
  code: string;
  name: string;
  description?: string;
  unit: string;
  show_total: number;
  show_margin: number;
  graph_color?: string | null;
  period_type: MetricPeriodType;
  records?: IMetricRecord[]; // included in hierarchy fetch
}

export interface IMetricRecord {
  id: number;
  metric_type_id: number;
  client_id: number;
  company_id: number;
  program_id: number;
  cohort_id: number;
  year: number; // mapped from year_
  q1?: number | null;
  q2?: number | null;
  q3?: number | null;
  q4?: number | null;
  total?: number | null;
  margin_pct?: number | null;
  unit: string;
  created_at?: string;
  updated_at?: string;
}

export type MetricsHierarchy = IMetricGroup[];

// DTOs
export interface CreateMetricGroupDto { client_id: number; code: string; name: string; description?: string; show_total?: number; show_margin?: number; graph_color?: string | null; }
export interface UpdateMetricGroupDto extends Partial<CreateMetricGroupDto> { id: number; }

export interface CreateMetricTypeDto { group_id: number; code: string; name: string; description?: string; unit?: string; show_total?: number; show_margin?: number; graph_color?: string | null; period_type?: MetricPeriodType; }
export interface UpdateMetricTypeDto extends Partial<CreateMetricTypeDto> { id: number; }

export interface CreateMetricRecordDto { client_id: number; company_id: number; program_id: number; cohort_id: number; metric_type_id: number; year: number; q1?: number|null; q2?: number|null; q3?: number|null; q4?: number|null; total?: number|null; margin_pct?: number|null; unit?: string; }
export interface UpdateMetricRecordDto extends Partial<CreateMetricRecordDto> { id: number; }
