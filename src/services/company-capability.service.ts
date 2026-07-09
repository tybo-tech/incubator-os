import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Constants } from './service';

export interface CompanyOverviewResponse {
  company: any;
  directors: DirectorSummary[];
  financialSummary?: FinancialSummary;
}

export interface DirectorSummary {
  directorId: number;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: string;
  gender: string | null;
  idNumber: string | null;
}

export interface FinancialSummary {
  totalRevenue: number;
  fyCount: number;
  latestFy: string | null;
  activeMonths: number;
  capturedMonths: number;
}

export interface CommandResult {
  success: boolean;
  message: string;
  data?: any;
  auditId?: string;
  warnings?: string[];
}

export interface RegisterDirectorRequest {
  full_name: string;
  email?: string;
  phone?: string;
  gender?: string;
  id_number?: string;
}

export interface UpdateProfileRequest {
  name?: string;
  registration_no?: string;
  trading_name?: string;
  contact_person?: string;
  contact_number?: string;
  email_address?: string;
  city?: string;
  suburb?: string;
  address?: string;
  business_location?: string;
  service_offering?: string;
  bbbee_level?: string;
  industry_id?: number;
}

@Injectable({ providedIn: 'root' })
export class CompanyCapabilityService {
  private baseUrl = `${Constants.ApiBase}/api/company`;

  constructor(private http: HttpClient) {}

  getOverview(companyId: number): Observable<CompanyOverviewResponse> {
    return this.http.get<CompanyOverviewResponse>(
      `${this.baseUrl}/queries/get-overview.php?id=${companyId}`
    );
  }

  updateProfile(companyId: number, data: UpdateProfileRequest): Observable<CommandResult> {
    return this.http.post<CommandResult>(
      `${this.baseUrl}/commands/update-profile.php?id=${companyId}`, data
    );
  }

  registerDirector(companyId: number, data: RegisterDirectorRequest): Observable<CommandResult> {
    return this.http.post<CommandResult>(
      `${this.baseUrl}/commands/register-director.php?id=${companyId}`, data
    );
  }

  deactivateDirector(companyId: number, directorId: number): Observable<CommandResult> {
    return this.http.post<CommandResult>(
      `${this.baseUrl}/commands/deactivate-director.php?id=${companyId}`,
      { directorId }
    );
  }
}