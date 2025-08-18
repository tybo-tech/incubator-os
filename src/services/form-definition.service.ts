import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { INode } from '../models/schema';
import { Constants } from './service';
import { FormDefinition } from '../models/simple.schema';

@Injectable({ providedIn: 'root' })
export class FormDefinitionService {
  private apiUrl = `${Constants.ApiBase}/api-nodes/form-definition`;

  constructor(private http: HttpClient) {}

  addFormDefinition(data: Partial<FormDefinition>): Observable<INode<FormDefinition>> {
    return this.http.post<INode<FormDefinition>>(`${this.apiUrl}/add-form-definition.php`, data);
  }

  updateFormDefinition(id: number, data: Partial<FormDefinition>): Observable<INode<FormDefinition>> {
    return this.http.post<INode<FormDefinition>>(`${this.apiUrl}/update-form-definition.php`, { id, ...data });
  }

  archiveFormDefinition(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/archive-form-definition.php`, { id });
  }

  getFormDefinitionById(id: number): Observable<INode<FormDefinition>> {
    return this.http.get<INode<FormDefinition>>(`${this.apiUrl}/get-form-definition.php?id=${id}`);
  }

  getFormDefinitionByKey(form_key: string): Observable<INode<FormDefinition>> {
    return this.http.get<INode<FormDefinition>>(`${this.apiUrl}/get-form-definition.php?form_key=${form_key}`);
  }

  listFormDefinitions(only_active?: boolean): Observable<INode<FormDefinition>[]> {
    const param = only_active !== undefined ? `?only_active=${only_active ? 1 : 0}` : '';
    return this.http.get<INode<FormDefinition>[]>(`${this.apiUrl}/list-form-definitions.php${param}`);
  }
}
