import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Constants } from './service';
import { IForm, FormSearchFilters } from '../models/form-system.models';

@Injectable({ providedIn: 'root' })
export class FormService {
  private apiUrl = `${Constants.ApiBase}/api-nodes/form`;

  constructor(private http: HttpClient) {}

  addForm(data: Partial<IForm>): Observable<IForm> {
    return this.http.post<IForm>(`${this.apiUrl}/add-form.php`, data);
  }

  updateForm(id: number, data: Partial<IForm>): Observable<IForm> {
    const params = new URLSearchParams({ id: String(id) });
    return this.http.post<IForm>(`${this.apiUrl}/update-form.php?${params}`, data);
  }

  getFormById(id: number): Observable<IForm> {
    return this.http.get<IForm>(`${this.apiUrl}/get-form.php?id=${id}`);
  }

  getFormByKey(
    formKey: string,
    scopeType: string = 'global',
    scopeId?: number
  ): Observable<IForm> {
    const params = new URLSearchParams({
      form_key: formKey,
      scope_type: scopeType
    });
    if (scopeId) params.append('scope_id', String(scopeId));
    return this.http.get<IForm>(`${this.apiUrl}/get-form.php?${params}`);
  }

  searchForms(
    filters: FormSearchFilters = {},
    limit: number = 50,
    offset: number = 0
  ): Observable<IForm[]> {
    const params = new URLSearchParams({
      ...filters as any,
      limit: String(limit),
      offset: String(offset)
    });
    return this.http.get<IForm[]>(`${this.apiUrl}/search-forms.php?${params}`);
  }

  listForms(limit: number = 50, offset: number = 0): Observable<IForm[]> {
    return this.http.get<IForm[]>(`${this.apiUrl}/list-forms.php?limit=${limit}&offset=${offset}`);
  }

  deleteForm(id: number): Observable<{ success: boolean }> {
    return this.http.get<{ success: boolean }>(`${this.apiUrl}/delete-form.php?id=${id}`);
  }

  publishForm(id: number): Observable<IForm> {
    return this.http.get<IForm>(`${this.apiUrl}/publish-form.php?id=${id}`);
  }

  archiveForm(id: number): Observable<IForm> {
    return this.http.get<IForm>(`${this.apiUrl}/archive-form.php?id=${id}`);
  }
}
