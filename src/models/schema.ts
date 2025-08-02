// schema.ts

export interface INode<T = any> {
  id?: number;
  type: string;
  data: T;
  company_id?: number | null;
  parent_id?: number | null;
  created_by?: number | null;
  updated_by?: number | null;
  created_at?: string;
  updated_at?: string;
}
