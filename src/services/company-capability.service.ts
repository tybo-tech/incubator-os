import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Constants } from './service';

export interface CompanyOverviewResponse {
  company: any;
  directors: DirectorSummary[];
  financialSummary?: FinancialSummary;
  ownership?: OwnershipSummary;
}

export interface DirectorSummary {
  directorId: number;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: string;
  gender: string | null;
  race: string | null;
  idNumber: string | null;
  dateOfBirth: string | null;
  age: number | null;
  /** True when idNumber parses as a valid 13-digit SA ID. */
  idValid: boolean;
  isBlack: boolean;
  isBlackWoman: boolean;
  isYouth: boolean;
}

export interface OwnershipSummary {
  blackOwnership: boolean;
  blackWomenOwnership: boolean;
  youthOwned: boolean;
  blackReason: string;
  blackWomenReason: string;
  youthReason: string;
  blackDirectorIds: number[];
  blackWomenDirectorIds: number[];
  youthDirectorIds: number[];
  unknownYouthDirectorIds: number[];
}

export interface DirectorsResponse {
  directors: DirectorSummary[];
  ownership: OwnershipSummary;
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
  race?: string;
  id_number?: string;
}

export interface UpdateDirectorRequest {
  full_name: string;
  email?: string | null;
  phone?: string | null;
  gender?: string | null;
  race?: string | null;
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
  has_valid_bbbbee?: boolean;
  has_tax_clearance?: boolean;
  is_sars_registered?: boolean;
  has_cipc_registration?: boolean;
  cipc_status?: string;
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

  getDirectors(companyId: number): Observable<DirectorsResponse> {
    return this.http.get<DirectorsResponse>(
      `${this.baseUrl}/queries/get-directors.php?id=${companyId}`
    );
  }

  updateDirector(companyId: number, directorId: number, data: UpdateDirectorRequest): Observable<CommandResult> {
    return this.http.post<CommandResult>(
      `${this.baseUrl}/commands/update-director.php?id=${companyId}`,
      { directorId, ...data }
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