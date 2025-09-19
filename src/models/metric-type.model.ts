export interface IMetricType {
  id: number;
  code: string;
  name: string;
  description: string;
  default_unit: string;
  is_ratio: number; // 0/1 flag
  created_at?: string;
  updated_at?: string;
}

export type CreateMetricTypeDto = Omit<IMetricType, 'id' | 'created_at' | 'updated_at'>;
export type UpdateMetricTypeDto = Partial<Omit<IMetricType, 'id'>> & { id: number };
