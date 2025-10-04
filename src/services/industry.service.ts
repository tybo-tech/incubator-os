import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { INode } from '../models/schema';
import { Constants } from './service';
import { Industry } from '../models/simple.schema';

export interface IndustryListOptions {
  page?: number;
  limit?: number;
  parent_id?: number | null;
  is_active?: boolean;
  search?: string;
  order_by?: string;
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

@Injectable({ providedIn: 'root' })
export class IndustryService {
  private apiUrl = `${Constants.ApiBase}/api-nodes/industry`;

  constructor(private http: HttpClient) {}

  addIndustry(name: string, parent_id?: number, extraFields?: any): Observable<INode<Industry>> {
    const data = { name, parent_id, ...extraFields };
    return this.http.post<INode<Industry>>(`${this.apiUrl}/add-industry.php`, data);
  }

  updateIndustry(id: number, data: Partial<Industry>): Observable<INode<Industry>> {
    return this.http.post<INode<Industry>>(`${this.apiUrl}/update-industry.php`, { id, ...data });
  }

  getIndustryById(id: number): Observable<INode<Industry>> {
    return this.http.get<INode<Industry>>(`${this.apiUrl}/get-industry.php?id=${id}`);
  }

  getIndustryByName(name: string): Observable<INode<Industry>> {
    return this.http.get<INode<Industry>>(`${this.apiUrl}/get-industry.php?name=${name}`);
  }

  listIndustries(options: IndustryListOptions = {}): Observable<IndustryListResponse> {
    let params = new HttpParams();

    if (options.page !== undefined) params = params.set('page', options.page.toString());
    if (options.limit !== undefined) params = params.set('limit', options.limit.toString());
    if (options.parent_id !== undefined) {
      params = params.set('parent_id', options.parent_id?.toString() || '');
    }
    if (options.is_active !== undefined) params = params.set('is_active', options.is_active ? '1' : '0');
    if (options.search) params = params.set('search', options.search);
    if (options.order_by) params = params.set('order_by', options.order_by);
    if (options.order_dir) params = params.set('order_dir', options.order_dir);
    if (options.include_parent) params = params.set('include_parent', '1');
    if (options.include_children) params = params.set('include_children', '1');
    if (options.with_hierarchy) params = params.set('with_hierarchy', '1');

    return this.http.get<IndustryListResponse>(`${this.apiUrl}/list-industries.php`, { params });
  }

  // Backward compatibility methods
  listIndustriesByParent(parent_id?: number): Observable<INode<Industry>[]> {
    return new Observable(observer => {
      this.listIndustries({ parent_id, limit: 1000 }).subscribe(response => {
        observer.next(response.data);
        observer.complete();
      });
    });
  }

  listIndustryChildren(parent_id: number): Observable<INode<Industry>[]> {
    return this.listIndustriesByParent(parent_id);
  }

  listIndustryTree(): Observable<INode<Industry>[]> {
    return this.http.get<INode<Industry>[]>(`${this.apiUrl}/list-industry-tree.php`);
  }

  deleteIndustry(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/delete-industry.php`, { id });
  }

  ensureIndustry(name: string, parent_id?: number): Observable<INode<Industry>> {
    return this.http.post<INode<Industry>>(`${this.apiUrl}/ensure-industry.php`, { name, parent_id });
  }

  ensureIndustryWithParent(name: string, parent_name: string): Observable<INode<Industry>> {
    return this.http.post<INode<Industry>>(`${this.apiUrl}/ensure-industry-with-parent.php`, { name, parent_name });
  }

  reassignIndustryCompanies(from_id: number, to_id?: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/reassign-industry-companies.php`, { from_id, to_id });
  }
}
