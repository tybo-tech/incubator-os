import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { INode } from '../models/schema';
import { Constants } from './service';
import { Industry } from '../models/simple.schema';

@Injectable({ providedIn: 'root' })
export class IndustryService {
  private apiUrl = `${Constants.ApiBase}/api-nodes/industry`;

  constructor(private http: HttpClient) {}

  addIndustry(name: string, parent_id?: number): Observable<INode<Industry>> {
    return this.http.post<INode<Industry>>(`${this.apiUrl}/add-industry.php`, { name, parent_id });
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

  listIndustries(parent_id?: number): Observable<INode<Industry>[]> {
    const param = parent_id !== undefined ? `?parent_id=${parent_id}` : '';
    return this.http.get<INode<Industry>[]>(`${this.apiUrl}/list-industries.php${param}`);
  }

  listIndustryChildren(parent_id: number): Observable<INode<Industry>[]> {
    return this.http.get<INode<Industry>[]>(`${this.apiUrl}/list-industry-children.php?parent_id=${parent_id}`);
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
