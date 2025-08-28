import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Constants } from './service';
import { ICategory, ICompany } from '../models/simple.schema';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private apiUrl = `${Constants.ApiBase}/api-nodes/category`;

  constructor(private http: HttpClient) {}

  // Basic CRUD Operations
  addCategory(data: Partial<ICategory>): Observable<ICategory> {
    return this.http.post<ICategory>(`${this.apiUrl}/add-category.php`, data);
  }

  updateCategory(id: number, data: Partial<ICategory>): Observable<ICategory> {
    return this.http.post<ICategory>(`${this.apiUrl}/update-category.php`, { id, ...data });
  }

  getCategoryById(id: number): Observable<ICategory> {
    return this.http.get<ICategory>(`${this.apiUrl}/get-category.php?id=${id}`);
  }

  deleteCategory(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/delete-category.php`, { id });
  }

  // List Operations
  listCategories(filters: {
    type?: string;
    parent_id?: number | null;
    depth?: number;
  } = {}): Observable<ICategory[]> {
    const params = new URLSearchParams();
    if (filters.type) params.append('type', filters.type);
    if (filters.parent_id !== undefined) {
      if (filters.parent_id !== null) {
        params.append('parent_id', String(filters.parent_id));
      }
    }
    if (filters.depth) params.append('depth', String(filters.depth));

    const queryString = params.toString();
    return this.http.get<ICategory[]>(`${this.apiUrl}/list-categories.php${queryString ? '?' + queryString : ''}`);
  }

  listTree(): Observable<ICategory[]> {
    return this.http.get<ICategory[]>(`${this.apiUrl}/list-tree.php`);
  }

  listChildren(parentId: number, type?: string): Observable<ICategory[]> {
    let url = `${this.apiUrl}/list-children.php?parent_id=${parentId}`;
    if (type) url += `&type=${type}`;
    return this.http.get<ICategory[]>(url);
  }

  // Hierarchy-Specific Operations
  listProgramsForClient(clientId: number): Observable<ICategory[]> {
    return this.http.get<ICategory[]>(`${this.apiUrl}/list-programs-for-client.php?client_id=${clientId}`);
  }

  listCohortsForProgram(programId: number): Observable<ICategory[]> {
    return this.http.get<ICategory[]>(`${this.apiUrl}/list-cohorts-for-program.php?program_id=${programId}`);
  }

  // Company-Category Relationships
  attachCompany(categoryId: number, companyId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/attach-company.php`, {
      category_id: categoryId,
      company_id: companyId
    });
  }

  bulkAttachCompanies(cohortId: number, companyIds: number[], addedByUserId?: number, notes?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/attach-company.php`, {
      cohort_id: cohortId,
      company_ids: companyIds,
      added_by_user_id: addedByUserId,
      notes: notes
    });
  }

  detachCompany(categoryId: number, companyId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/detach-company.php`, {
      category_id: categoryId,
      company_id: companyId
    });
  }

  listCompaniesInCohort(cohortId: number): Observable<ICompany[]> {
    return this.http.get<ICompany[]>(`${this.apiUrl}/list-companies-in-cohort.php?cohort_id=${cohortId}`);
  }

  listCompaniesInCohortDetailed(cohortId: number): Observable<ICompany[]> {
    return this.http.get<ICompany[]>(`${this.apiUrl}/list-companies-in-cohort-detailed.php?cohort_id=${cohortId}`);
  }

  listCompaniesInProgram(programId: number): Observable<ICompany[]> {
    return this.http.get<ICompany[]>(`${this.apiUrl}/list-companies-in-program.php?program_id=${programId}`);
  }

  listCompaniesUnderClient(clientId: number): Observable<ICompany[]> {
    return this.http.get<ICompany[]>(`${this.apiUrl}/list-companies-under-client.php?client_id=${clientId}`);
  }

  listCohortsForCompany(companyId: number): Observable<ICategory[]> {
    return this.http.get<ICategory[]>(`${this.apiUrl}/list-cohorts-for-company.php?company_id=${companyId}`);
  }

  // Helper Operations
  ensureClient(name: string, description?: string, imageUrl?: string): Observable<ICategory> {
    return this.http.post<ICategory>(`${this.apiUrl}/ensure-client.php`, {
      name,
      description,
      image_url: imageUrl
    });
  }

  ensureProgram(clientId: number, name: string, description?: string, imageUrl?: string): Observable<ICategory> {
    return this.http.post<ICategory>(`${this.apiUrl}/ensure-program.php`, {
      client_id: clientId,
      name,
      description,
      image_url: imageUrl
    });
  }

  ensureCohort(programId: number, name: string, description?: string, imageUrl?: string): Observable<ICategory> {
    return this.http.post<ICategory>(`${this.apiUrl}/ensure-cohort.php`, {
      program_id: programId,
      name,
      description,
      image_url: imageUrl
    });
  }

  breadcrumb(categoryId: number): Observable<Array<{
    id: number;
    name: string;
    type: string;
    depth: number;
  }>> {
    return this.http.get<Array<{
      id: number;
      name: string;
      type: string;
      depth: number;
    }>>(`${this.apiUrl}/breadcrumb.php?category_id=${categoryId}`);
  }

  moveCategory(categoryId: number, newParentId?: number | null): Observable<ICategory> {
    return this.http.post<ICategory>(`${this.apiUrl}/move-category.php`, {
      category_id: categoryId,
      new_parent_id: newParentId
    });
  }

  getCategoryStatistics(categoryId: number): Observable<{
    programs_count?: number;
    cohorts_count?: number;
    companies_count?: number;
    active_companies?: number;
    completed_companies?: number;
    withdrawn_companies?: number;
  }> {
    return this.http.get<{
      programs_count?: number;
      cohorts_count?: number;
      companies_count?: number;
      active_companies?: number;
      completed_companies?: number;
      withdrawn_companies?: number;
    }>(`${this.apiUrl}/get-category-statistics.php?category_id=${categoryId}`);
  }

  // Company Picker for Category Assignment
  getCompaniesForPicker(
    cohortId: number,
    programId?: number,
    clientId?: number,
    search?: string
  ): Observable<{
    available_companies: any[];
    assigned_companies: any[];
    search_term: string;
    cohort_id: number;
    program_id: number;
    client_id: number;
    total_available: number;
    total_assigned: number;
  }> {
    const params = new URLSearchParams();
    params.append('cohort_id', String(cohortId));
    if (programId) params.append('program_id', String(programId));
    if (clientId) params.append('client_id', String(clientId));
    if (search) params.append('search', search);

    return this.http.get<any>(`${this.apiUrl}/get-companies-for-picker.php?${params.toString()}`);
  }
}
