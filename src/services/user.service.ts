import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { INode } from '../models/schema';
import { Constants } from './service';
import { User } from '../models/simple.schema';

export interface UserListOptions {
  page?: number;
  per_page?: number;
  q?: string;
  company_id?: number;
  role?: string;
  status?: string;
}

export interface UserListResponse {
  data: INode<User>[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    pages: number;
    has_more: boolean;
    has_prev: boolean;
  };
  meta: {
    filters: any;
    offset: number;
  };
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private apiUrl = `${Constants.ApiBase}/api-nodes/user`;

  constructor(private http: HttpClient) {}

  addUser(data: Partial<User>): Observable<INode<User>> {
    return this.http.post<INode<User>>(`${this.apiUrl}/add-user.php`, data);
  }

  updateUser(id: number, data: Partial<User>): Observable<INode<User>> {
    return this.http.post<INode<User>>(`${this.apiUrl}/update-user.php`, { id, ...data });
  }

  deleteUser(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/delete-user.php`, { id });
  }

  getUserById(id: number): Observable<INode<User>> {
    return this.http.get<INode<User>>(`${this.apiUrl}/get-user.php?id=${id}`);
  }

  getUserByUsername(username: string): Observable<INode<User>> {
    return this.http.get<INode<User>>(`${this.apiUrl}/get-user.php?username=${username}`);
  }

  listUsersByCompany(company_id: number): Observable<INode<User>[]> {
    return this.http.get<INode<User>[]>(`${this.apiUrl}/list-users-by-company.php?company_id=${company_id}`);
  }

  searchUsers(filters: any = {}, limit: number = 50, offset: number = 0): Observable<INode<User>[]> {
    const params = new URLSearchParams({ ...filters, limit: String(limit), offset: String(offset) });
    return this.http.get<INode<User>[]>(`${this.apiUrl}/search-users.php?${params}`);
  }

  /**
   * Enhanced search with pagination support
   */
  searchUsersAdvanced(options: UserListOptions = {}): Observable<UserListResponse> {
    let params = new HttpParams();

    if (options.page !== undefined) {
      params = params.set('page', Math.max(1, options.page).toString());
    }

    if (options.per_page !== undefined) {
      params = params.set('per_page', Math.max(1, Math.min(100, options.per_page)).toString());
    }

    if (options.q?.trim()) {
      params = params.set('q', options.q.trim());
    }

    if (options.company_id !== undefined) {
      params = params.set('company_id', options.company_id.toString());
    }

    if (options.role?.trim()) {
      params = params.set('role', options.role.trim());
    }

    if (options.status?.trim()) {
      params = params.set('status', options.status.trim());
    }

    return this.http.get<UserListResponse>(`${this.apiUrl}/search-users.php`, { params });
  }

  seedUserFromCompany(company: any, overrides: any = {}): Observable<INode<User>> {
    return this.http.post<INode<User>>(`${this.apiUrl}/seed-user-from-company.php`, { company, overrides });
  }
}
