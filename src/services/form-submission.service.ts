import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { INode } from '../models/schema';
import { Constants } from './service';
import { FormSubmission } from '../models/simple.schema';

@Injectable({ providedIn: 'root' })
export class FormSubmissionService {
  private apiUrl = `${Constants.ApiBase}/api-nodes/form-submission`;

  constructor(private http: HttpClient) {}

  createFormSubmission(data: Partial<FormSubmission>): Observable<INode<FormSubmission>> {
    return this.http.post<INode<FormSubmission>>(`${this.apiUrl}/create-form-submission.php`, data);
  }

  getFormSubmissionById(id: number): Observable<INode<FormSubmission>> {
    return this.http.get<INode<FormSubmission>>(`${this.apiUrl}/get-form-submission.php?id=${id}`);
  }

  getLatestFormSubmission(company_id: number, form_id?: number, form_key?: string): Observable<INode<FormSubmission>> {
    const params = new URLSearchParams({ company_id: String(company_id) });
    if (form_id) params.append('form_id', String(form_id));
    if (form_key) params.append('form_key', form_key);
    return this.http.get<INode<FormSubmission>>(`${this.apiUrl}/get-latest-form-submission.php?${params}`);
  }

  listFormSubmissionHistory(company_id: number, form_id?: number, form_key?: string, limit: number = 50, offset: number = 0): Observable<INode<FormSubmission>[]> {
    const params = new URLSearchParams({ company_id: String(company_id), limit: String(limit), offset: String(offset) });
    if (form_id) params.append('form_id', String(form_id));
    if (form_key) params.append('form_key', form_key);
    return this.http.get<INode<FormSubmission>[]>(`${this.apiUrl}/list-form-submission-history.php?${params}`);
  }

  updateFormSubmissionPayload(id: number, payload: any, updated_by?: number): Observable<INode<FormSubmission>> {
    return this.http.post<INode<FormSubmission>>(`${this.apiUrl}/update-form-submission-payload.php`, { id, payload, updated_by });
  }

  deleteFormSubmission(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/delete-form-submission.php`, { id });
  }
}
