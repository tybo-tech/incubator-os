import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Constants } from './service';
import { IFormNode, FormNodeReorderRequest } from '../models/form-system.models';

@Injectable({ providedIn: 'root' })
export class FormNodeService {
  private apiUrl = `${Constants.ApiBase}/api-nodes/form-node`;

  constructor(private http: HttpClient) {}

  addFormNode(data: Partial<IFormNode>): Observable<IFormNode> {
    return this.http.post<IFormNode>(`${this.apiUrl}/add-form-node.php`, data);
  }

  updateFormNode(id: number, data: Partial<IFormNode>): Observable<IFormNode> {
    const params = new URLSearchParams({ id: String(id) });
    return this.http.post<IFormNode>(`${this.apiUrl}/update-form-node.php?${params}`, data);
  }

  getFormNodeById(id: number): Observable<IFormNode> {
    return this.http.get<IFormNode>(`${this.apiUrl}/get-form-node.php?id=${id}`);
  }

  getFormNodes(formId: number): Observable<IFormNode[]> {
    return this.http.get<IFormNode[]>(`${this.apiUrl}/list-form-nodes.php?form_id=${formId}`);
  }

  getChildren(parentId: number): Observable<IFormNode[]> {
    return this.http.get<IFormNode[]>(`${this.apiUrl}/get-children.php?parent_id=${parentId}`);
  }

  getTabs(formId: number): Observable<IFormNode[]> {
    return this.http.get<IFormNode[]>(`${this.apiUrl}/get-tabs.php?form_id=${formId}`);
  }

  getFields(formId: number): Observable<IFormNode[]> {
    return this.http.get<IFormNode[]>(`${this.apiUrl}/get-fields.php?form_id=${formId}`);
  }

  deleteFormNode(id: number): Observable<{ success: boolean }> {
    return this.http.get<{ success: boolean }>(`${this.apiUrl}/delete-form-node.php?id=${id}`);
  }

  reorderNodes(
    formId: number,
    parentId: number | null,
    data: FormNodeReorderRequest
  ): Observable<{ success: boolean }> {
    const params = new URLSearchParams({ form_id: String(formId) });
    if (parentId) params.append('parent_id', String(parentId));
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/reorder-nodes.php?${params}`, data);
  }
}
