import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Constants } from './service';
import { IFormSession, FormSessionSearchFilters, FormSessionWorkflowRequest } from '../models/form-system.models';

@Injectable({ providedIn: 'root' })
export class FormSessionService {
  private apiUrl = `${Constants.ApiBase}/api-nodes/form-session`;

  constructor(private http: HttpClient) {}

  addFormSession(data: Partial<IFormSession>): Observable<IFormSession> {
    return this.http.post<IFormSession>(`${this.apiUrl}/add-form-session.php`, data);
  }

  updateFormSession(id: number, data: Partial<IFormSession>): Observable<IFormSession> {
    const params = new URLSearchParams({ id: String(id) });
    return this.http.post<IFormSession>(`${this.apiUrl}/update-form-session.php?${params}`, data);
  }

  getFormSessionById(id: number): Observable<IFormSession> {
    return this.http.get<IFormSession>(`${this.apiUrl}/get-form-session.php?id=${id}`);
  }

  getFormSessionsByEnrollment(
    categoriesItemId: number,
    filters: Partial<FormSessionSearchFilters> = {}
  ): Observable<IFormSession[]> {
    const params = new URLSearchParams({
      categories_item_id: String(categoriesItemId),
      ...filters as any
    });
    return this.http.get<IFormSession[]>(`${this.apiUrl}/list-form-sessions.php?${params}`);
  }

  searchFormSessions(
    filters: FormSessionSearchFilters = {},
    limit: number = 50,
    offset: number = 0
  ): Observable<IFormSession[]> {
    const params = new URLSearchParams({
      ...filters as any,
      limit: String(limit),
      offset: String(offset)
    });
    return this.http.get<IFormSession[]>(`${this.apiUrl}/search-form-sessions.php?${params}`);
  }

  deleteFormSession(id: number): Observable<{ success: boolean }> {
    return this.http.get<{ success: boolean }>(`${this.apiUrl}/delete-form-session.php?id=${id}`);
  }

  // Workflow methods
  submitSession(id: number): Observable<IFormSession> {
    return this.http.get<IFormSession>(`${this.apiUrl}/submit-session.php?id=${id}`);
  }

  verifySession(id: number, verifiedBy: number): Observable<IFormSession> {
    const params = new URLSearchParams({
      id: String(id),
      verified_by: String(verifiedBy)
    });
    return this.http.get<IFormSession>(`${this.apiUrl}/verify-session.php?${params}`);
  }

  approveSession(id: number, approvedBy: number): Observable<IFormSession> {
    const params = new URLSearchParams({
      id: String(id),
      approved_by: String(approvedBy)
    });
    return this.http.get<IFormSession>(`${this.apiUrl}/approve-session.php?${params}`);
  }

  cancelSession(id: number): Observable<IFormSession> {
    return this.http.get<IFormSession>(`${this.apiUrl}/cancel-session.php?id=${id}`);
  }
}
