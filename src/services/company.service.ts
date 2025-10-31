import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Constants } from './service';
import { ICompany } from '../models/simple.schema';

export interface CompanyListOptions {
  page?: number;
  limit?: number;
  search?: string;
  industry_id?: number;
  city?: string;
  bbbee_level?: string;
  has_tax_clearance?: boolean;
}

export interface CompanyListResponse {
  data: ICompany[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

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
    let params = new HttpParams();

    // Add filters to params
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null) {
        params = params.set(key, String(filters[key]));
      }
    });

    params = params.set('limit', String(limit));
    params = params.set('offset', String(offset));

    return this.http.get<ICompany[]>(`${this.apiUrl}/search-companies.php`, { params });
  }

  listCompanies(limit: number = 50, offset: number = 0): Observable<ICompany[]> {
    return this.http.get<ICompany[]>(`${this.apiUrl}/list-companies.php?limit=${limit}&offset=${offset}`);
  }

  /**
   * Get companies by industry with pagination
   */
  getCompaniesByIndustry(industryId: number, options: CompanyListOptions = {}): Observable<CompanyListResponse> {
    let params = new HttpParams();

    params = params.set('industry_id', industryId.toString());

    if (options.page !== undefined) {
      params = params.set('page', Math.max(1, options.page).toString());
    }

    if (options.limit !== undefined) {
      params = params.set('limit', Math.max(1, Math.min(1000, options.limit)).toString());
    }

    if (options.search?.trim()) {
      params = params.set('search', options.search.trim());
    }

    return this.http.get<CompanyListResponse>(`${this.apiUrl}/list-companies.php`, { params });
  }

  /**
   * Enhanced search with better filtering
   */
  searchCompaniesAdvanced(options: CompanyListOptions = {}): Observable<CompanyListResponse> {
    let params = new HttpParams();

    if (options.page !== undefined) {
      params = params.set('page', Math.max(1, options.page).toString());
    }

    if (options.limit !== undefined) {
      params = params.set('limit', Math.max(1, Math.min(1000, options.limit)).toString());
    }

    if (options.search?.trim()) {
      params = params.set('search', options.search.trim());
    }

    if (options.industry_id !== undefined) {
      params = params.set('industry_id', options.industry_id.toString());
    }

    if (options.city?.trim()) {
      params = params.set('city', options.city.trim());
    }

    if (options.bbbee_level?.trim()) {
      params = params.set('bbbee_level', options.bbbee_level.trim());
    }

    if (options.has_tax_clearance !== undefined) {
      params = params.set('has_tax_clearance', options.has_tax_clearance ? '1' : '0');
    }

    return this.http.get<CompanyListResponse>(`${this.apiUrl}/search-companies.php`, { params });
  }

  deleteCompany(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/delete-company.php`, { id });
  }

  setIndustryByName(company_id: number, industry_name: string): Observable<ICompany> {
    return this.http.post<ICompany>(`${this.apiUrl}/set-industry-by-name.php`, { company_id, industry_name });
  }

  /**
   * Bulk import companies.
   * Accepts an array of Partial<ICompany>. Optional upsert by registration_no when true.
   * Backend returns summary with inserted / updated arrays.
   */
  bulkImportCompanies(companies: Partial<ICompany>[], upsertByRegistrationNo: boolean = false): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/bulk-import-companies.php`, {
      companies,
      upsertByRegistrationNo
    });
  }
}
