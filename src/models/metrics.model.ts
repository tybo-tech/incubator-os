export interface IMetricGroup {
  id: number;
  client_id: number;
  code: string;
  name: string;
  description?: string;
  show_total: number; // 0/1
  show_margin: number; // 0/1
  graph_color?: string | null;
  order_no?: number; // for ordering groups
  types?: IMetricType[]; // included in hierarchy fetch
}

export type MetricPeriodType = 'QUARTERLY' | 'YEARLY' | 'YEARLY_SIDE_BY_SIDE';

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
  categories?: ICategory[]; // related categories via join
  records?: IMetricRecord[]; // included in hierarchy fetch
}

export interface ICategory {
  id: number;
  name: string;
  slug: string;
  type: 'client' | 'program' | 'cohort' | 'metric';
  description?: string;
  image_url?: string;
  parent_id?: number;
  depth: number;
  created_at?: string;
  updated_at?: string;
}

export interface IMetricRecord {
  id: number;
  metric_type_id: number;
  client_id: number;
  company_id: number;
  program_id: number;
  cohort_id: number;
  category_id?: number | null;
  year: number; // mapped from year_
  q1?: number | null;
  q2?: number | null;
  q3?: number | null;
  q4?: number | null;
  total?: number | null;
  margin_pct?: number | null;
  notes?: string | null;
  unit: string;
  created_at?: string;
  updated_at?: string;
}

export type MetricsHierarchy = IMetricGroup[];

// DTOs
export interface CreateMetricGroupDto { client_id: number; code: string; name: string; description?: string; show_total?: number; show_margin?: number; graph_color?: string | null; order_no?: number; }
export interface UpdateMetricGroupDto extends Partial<CreateMetricGroupDto> { id: number; }
export interface UpdateMetricGroupOrderDto { id: number; order_no: number; }

export interface CreateMetricTypeDto { group_id: number; code: string; name: string; description?: string; unit?: string; show_total?: number; show_margin?: number; graph_color?: string | null; period_type?: MetricPeriodType; category_ids?: number[]; }
export interface UpdateMetricTypeDto extends Partial<CreateMetricTypeDto> { id: number; }

// Category DTOs
export interface CreateCategoryDto { name: string; type: 'client' | 'program' | 'cohort' | 'metric'; description?: string; image_url?: string; parent_id?: number; depth: number; }
export interface UpdateCategoryDto extends Partial<CreateCategoryDto> { id: number; }

export interface CreateMetricRecordDto { client_id: number; company_id: number; program_id: number; cohort_id: number; metric_type_id: number; category_id?: number|null; year: number; q1?: number|null; q2?: number|null; q3?: number|null; q4?: number|null; total?: number|null; margin_pct?: number|null; notes?: string|null; unit?: string; }
export interface UpdateMetricRecordDto extends Partial<CreateMetricRecordDto> { id: number; }
