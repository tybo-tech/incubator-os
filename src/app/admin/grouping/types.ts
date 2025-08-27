export interface GroupingContext {
  clientId: number | null;
  programId: number | null;
  cohortId: number | null;
}

export interface BreadcrumbItem {
  id: number;
  name: string;
  type: string;
  depth: number;
}

export interface CategoryFormData {
  name: string;
  description?: string;
  image_url?: string;
}
