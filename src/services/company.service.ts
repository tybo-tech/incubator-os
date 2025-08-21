import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Constants } from './service';
import { ICompany } from '../models/simple.schema';

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private apiUrl = `${Constants.ApiBase}/api-nodes/company`;

  constructor(private http: HttpClient) {}

  addCompany(data: Partial<ICompany>): Observable<ICompany> {
    return this.http.post<ICompany>(`${this.apiUrl}/add-company.php`, data);
  }

  updateCompany(id: number, data: Partial<ICompany>): Observable<ICompany> {
    return this.http.post<ICompany>(`${this.apiUrl}/update-company.php`, { id, ...data });
  }

  upsertCompanyByRegNo(registration_no: string, data: Partial<ICompany>): Observable<ICompany> {
    return this.http.post<ICompany>(`${this.apiUrl}/upsert-company-by-regno.php`, { registration_no, ...data });
  }

  getCompanyById(id: number): Observable<ICompany> {
    return this.http.get<ICompany>(`${this.apiUrl}/get-company.php?id=${id}`);
  }

  getCompanyByRegNo(registration_no: string): Observable<ICompany> {
    return this.http.get<ICompany>(`${this.apiUrl}/get-company.php?registration_no=${registration_no}`);
  }

  searchCompanies(filters: any = {}, limit: number = 50, offset: number = 0): Observable<ICompany[]> {
    const params = new URLSearchParams({ ...filters, limit: String(limit), offset: String(offset) });
    return this.http.get<ICompany[]>(`${this.apiUrl}/search-companies.php?${params}`);
  }

  listCompanies(limit: number = 50, offset: number = 0): Observable<ICompany[]> {
    return this.http.get<ICompany[]>(`${this.apiUrl}/list-companies.php?limit=${limit}&offset=${offset}`);
  }

  deleteCompany(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/delete-company.php`, { id });
  }

  setIndustryByName(company_id: number, industry_name: string): Observable<ICompany> {
    return this.http.post<ICompany>(`${this.apiUrl}/set-industry-by-name.php`, { company_id, industry_name });
  }
}
