import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { INode } from '../models/schema';
import { Constants } from './service';
import { Industry } from '../models/simple.schema';

export interface IndustryListOptions {
  page?: number;
  limit?: number;
  parent_id?: number | null;
  is_active?: boolean;
  search?: string;
  order_by?: 'id' | 'name' | 'display_order' | 'created_at' | 'updated_at';
  order_dir?: 'ASC' | 'DESC';
  include_parent?: boolean;
  include_children?: boolean;
  with_hierarchy?: boolean;
}

export interface IndustryListResponse {
  data: INode<Industry>[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface CreateIndustryRequest {
  name: string;
  parent_id?: number | null;
  description?: string;
  notes?: string;
  image_url?: string;
  icon_class?: string;
  color_theme?: string;
  background_theme?: string;
  tags?: string[];
  is_active?: boolean;
  display_order?: number;
  created_by?: number;
}

export interface UpdateIndustryRequest {
  name?: string;
  parent_id?: number | null;
  description?: string;
  notes?: string;
  image_url?: string;
  icon_class?: string;
  color_theme?: string;
  background_theme?: string;
  tags?: string[];
  is_active?: boolean;
  display_order?: number;
  created_by?: number;
}

@Injectable({ providedIn: 'root' })
export class IndustryService {
  private apiUrl = `${Constants.ApiBase}/api-nodes/industry`;

  constructor(private http: HttpClient) {}

  /**
   * Create a new industry
   * @param industryData - Industry creation data
   * @returns Observable<INode<Industry>>
   */
  addIndustry(industryData: CreateIndustryRequest): Observable<INode<Industry>>;
  /**
   * @deprecated Use addIndustry(industryData: CreateIndustryRequest) instead
   */
  addIndustry(name: string, parent_id?: number, extraFields?: any): Observable<INode<Industry>>;
  addIndustry(industryDataOrName: CreateIndustryRequest | string, parent_id?: number, extraFields?: any): Observable<INode<Industry>> {
    // Handle backward compatibility
    if (typeof industryDataOrName === 'string') {
      const data: CreateIndustryRequest = {
        name: industryDataOrName,
        parent_id,
        ...extraFields
      };
      return this.addIndustry(data);
    }

    // Validate required fields
    if (!industryDataOrName.name || industryDataOrName.name.trim() === '') {
      return throwError(() => new Error('Industry name is required'));
    }

    // Ensure name is trimmed
    const data = {
      ...industryDataOrName,
      name: industryDataOrName.name.trim()
    };

    return this.http.post<INode<Industry>>(`${this.apiUrl}/add-industry.php`, data);
  }

  /**
   * Update an existing industry
   * @param id - Industry ID (required)
   * @param updateData - Partial industry data to update
   * @returns Observable<INode<Industry>>
   */
  updateIndustry(id: number, updateData: UpdateIndustryRequest): Observable<INode<Industry>> {
    // Validate required ID
    if (!id || id <= 0) {
      return throwError(() => new Error('Valid industry ID is required for update'));
    }

    // Validate that at least one field is being updated
    if (!updateData || Object.keys(updateData).length === 0) {
      return throwError(() => new Error('At least one field must be provided for update'));
    }

    // Clean the data - trim strings and validate
    const cleanData: UpdateIndustryRequest = {};

    if (updateData.name !== undefined) {
      if (typeof updateData.name === 'string' && updateData.name.trim() === '') {
        return throwError(() => new Error('Industry name cannot be empty'));
      }
      cleanData.name = updateData.name?.trim();
    }

    // Copy other fields
    Object.keys(updateData).forEach(key => {
      if (key !== 'name' && updateData[key as keyof UpdateIndustryRequest] !== undefined) {
        (cleanData as any)[key] = updateData[key as keyof UpdateIndustryRequest];
      }
    });

    // Use PUT method and send ID in query parameter (as tested)
    return this.http.put<INode<Industry>>(`${this.apiUrl}/update-industry.php?id=${id}`, cleanData);
  }

  /**
   * Get industry by ID
   * @param id - Industry ID (required)
   * @returns Observable<INode<Industry>>
   */
  getIndustryById(id: number): Observable<INode<Industry>> {
    if (!id || id <= 0) {
      return throwError(() => new Error('Valid industry ID is required'));
    }
    return this.http.get<INode<Industry>>(`${this.apiUrl}/get-industry.php?id=${id}`);
  }

  /**
   * Get industry by name (if this endpoint exists)
   * @param name - Industry name (required)
   * @returns Observable<INode<Industry>>
   */
  getIndustryByName(name: string): Observable<INode<Industry>> {
    if (!name || name.trim() === '') {
      return throwError(() => new Error('Industry name is required'));
    }
    return this.http.get<INode<Industry>>(`${this.apiUrl}/get-industry.php?name=${encodeURIComponent(name.trim())}`);
  }

  /**
   * List industries with advanced filtering and pagination
   * @param options - Filtering and pagination options
   * @returns Observable<IndustryListResponse>
   */
  listIndustries(options: IndustryListOptions = {}): Observable<IndustryListResponse> {
    let params = new HttpParams();

    // Pagination validation and parameters
    if (options.page !== undefined) {
      const page = Math.max(1, Math.floor(options.page));
      params = params.set('page', page.toString());
    }

    if (options.limit !== undefined) {
      const limit = Math.max(1, Math.min(1000, Math.floor(options.limit))); // Max 1000 as per API
      params = params.set('limit', limit.toString());
    }

    // Parent ID parameter (can be null for root industries)
    if (options.parent_id !== undefined) {
      if (options.parent_id === null) {
        params = params.set('parent_id', '');
      } else if (options.parent_id > 0) {
        params = params.set('parent_id', options.parent_id.toString());
      }
    }

    // Boolean parameters
    if (options.is_active !== undefined) {
      params = params.set('is_active', options.is_active ? '1' : '0');
    }

    // Search parameter (trim and validate)
    if (options.search && options.search.trim() !== '') {
      params = params.set('search', options.search.trim());
    }

    // Ordering parameters with validation
    if (options.order_by) {
      const allowedOrderFields = ['id', 'name', 'display_order', 'created_at', 'updated_at'];
      if (allowedOrderFields.includes(options.order_by)) {
        params = params.set('order_by', options.order_by);
      }
    }

    if (options.order_dir) {
      const allowedDirections = ['ASC', 'DESC'];
      if (allowedDirections.includes(options.order_dir)) {
        params = params.set('order_dir', options.order_dir);
      }
    }

    // Hierarchy and inclusion options
    if (options.include_parent) {
      params = params.set('include_parent', '1');
    }

    if (options.include_children) {
      params = params.set('include_children', '1');
    }

    if (options.with_hierarchy) {
      params = params.set('with_hierarchy', '1');
    }

    return this.http.get<IndustryListResponse>(`${this.apiUrl}/list-industries.php`, { params });
  }

  // Backward compatibility methods
  /**
   * @deprecated Use listIndustries() with parent_id option instead
   */
  listIndustriesByParent(parent_id?: number): Observable<INode<Industry>[]> {
    return new Observable(observer => {
      this.listIndustries({ parent_id, limit: 1000 }).subscribe({
        next: response => {
          observer.next(response.data);
          observer.complete();
        },
        error: err => observer.error(err)
      });
    });
  }

  /**
   * @deprecated Use listIndustries() with parent_id option instead
   */
  listIndustryChildren(parent_id: number): Observable<INode<Industry>[]> {
    if (!parent_id || parent_id <= 0) {
      return throwError(() => new Error('Valid parent ID is required'));
    }
    return this.listIndustriesByParent(parent_id);
  }

  /**
   * Get industry tree structure (if this endpoint exists)
   * Note: This endpoint may not be implemented on the backend
   */
  listIndustryTree(): Observable<INode<Industry>[]> {
    return this.http.get<INode<Industry>[]>(`${this.apiUrl}/list-industry-tree.php`);
  }

  /**
   * Delete an industry
   * @param id - Industry ID (required)
   * @returns Observable<any>
   */
  deleteIndustry(id: number): Observable<any> {
    if (!id || id <= 0) {
      return throwError(() => new Error('Valid industry ID is required for deletion'));
    }
    return this.http.post<any>(`${this.apiUrl}/delete-industry.php`, { id });
  }

  /**
   * Create industry if it doesn't exist (if this endpoint exists)
   * Note: This endpoint may not be implemented on the backend
   */
  ensureIndustry(name: string, parent_id?: number): Observable<INode<Industry>> {
    if (!name || name.trim() === '') {
      return throwError(() => new Error('Industry name is required'));
    }

    const data: any = { name: name.trim() };
    if (parent_id && parent_id > 0) {
      data.parent_id = parent_id;
    }

    return this.http.post<INode<Industry>>(`${this.apiUrl}/ensure-industry.php`, data);
  }

  /**
   * Create industry with parent name (if this endpoint exists)
   * Note: This endpoint may not be implemented on the backend
   */
  ensureIndustryWithParent(name: string, parent_name: string): Observable<INode<Industry>> {
    if (!name || name.trim() === '') {
      return throwError(() => new Error('Industry name is required'));
    }
    if (!parent_name || parent_name.trim() === '') {
      return throwError(() => new Error('Parent industry name is required'));
    }

    return this.http.post<INode<Industry>>(`${this.apiUrl}/ensure-industry-with-parent.php`, {
      name: name.trim(),
      parent_name: parent_name.trim()
    });
  }

  /**
   * Reassign companies from one industry to another (if this endpoint exists)
   * Note: This endpoint may not be implemented on the backend
   */
  reassignIndustryCompanies(from_id: number, to_id?: number): Observable<any> {
    if (!from_id || from_id <= 0) {
      return throwError(() => new Error('Valid source industry ID is required'));
    }

    const data: any = { from_id };
    if (to_id && to_id > 0) {
      data.to_id = to_id;
    }

    return this.http.post<any>(`${this.apiUrl}/reassign-industry-companies.php`, data);
  }

  // Convenience methods for common operations

  /**
   * Get root industries (industries without parent)
   */
  getRootIndustries(options: Omit<IndustryListOptions, 'parent_id'> = {}): Observable<IndustryListResponse> {
    return this.listIndustries({ ...options, parent_id: null });
  }

  /**
   * Get active industries only
   */
  getActiveIndustries(options: Omit<IndustryListOptions, 'is_active'> = {}): Observable<IndustryListResponse> {
    return this.listIndustries({ ...options, is_active: true });
  }

  /**
   * Search industries by name or description
   */
  searchIndustries(searchTerm: string, options: Omit<IndustryListOptions, 'search'> = {}): Observable<IndustryListResponse> {
    if (!searchTerm || searchTerm.trim() === '') {
      return throwError(() => new Error('Search term is required'));
    }
    return this.listIndustries({ ...options, search: searchTerm.trim() });
  }

  /**
   * Get industries with hierarchy information
   */
  getIndustriesWithHierarchy(options: Omit<IndustryListOptions, 'with_hierarchy'> = {}): Observable<IndustryListResponse> {
    return this.listIndustries({ ...options, with_hierarchy: true });
  }
}
