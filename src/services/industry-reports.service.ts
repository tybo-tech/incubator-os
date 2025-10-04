import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Constants } from './service';
import {
  IIndustryFinancialData,
  IIndustryEmploymentData,
  IIndustryDiversityData,
  IIndustryStatsCard
} from '../models/Charts';

export interface IndustryCompanyData {
  id: number;
  industry: string;
  parent_sector: string;
  total_companies: number;
}

export interface TopIndustryData {
  industry: string;
  total: number;
}

export interface IndustryDashboardResponse {
  overview: {
    total_companies: number;
    total_industries: number;
    total_turnover: number;
    avg_turnover_per_company: number;
    total_employees: number;
    avg_employees_per_company: number;
    diversity_stats: {
      youth_owned: number;
      black_owned: number;
      women_owned: number;
      youth_percentage: number;
      black_percentage: number;
      women_percentage: number;
    };
  };
  companies_per_industry: IndustryCompanyData[];
  financial_by_industry: IIndustryFinancialData[];
  employment_by_industry: IIndustryEmploymentData[];
  diversity_by_industry: IIndustryDiversityData[];
  top_industries: TopIndustryData[];
}

@Injectable({ providedIn: 'root' })
export class IndustryReportsService {
  private apiUrl = `${Constants.ApiBase}/api-nodes/industry`;

  constructor(private http: HttpClient) {}

  /**
   * Get comprehensive dashboard statistics
   */
  getDashboardStats(): Observable<IndustryDashboardResponse> {
    return this.http.get<IndustryDashboardResponse>(`${this.apiUrl}/dashboard-stats.php`);
  }

  /**
   * Get companies per industry
   */
  getCompaniesPerIndustry(): Observable<{ data: IndustryCompanyData[]; total: number }> {
    return this.http.get<{ data: IndustryCompanyData[]; total: number }>(`${this.apiUrl}/companies-per-industry.php`);
  }

  /**
   * Get financial data by industry
   */
  getFinancialByIndustry(): Observable<{ data: IIndustryFinancialData[]; total: number }> {
    return this.http.get<{ data: IIndustryFinancialData[]; total: number }>(`${this.apiUrl}/financial-by-industry.php`);
  }

  /**
   * Get employment data by industry
   */
  getEmploymentByIndustry(): Observable<{ data: IIndustryEmploymentData[]; total: number }> {
    return this.http.get<{ data: IIndustryEmploymentData[]; total: number }>(`${this.apiUrl}/employment-by-industry.php`);
  }

  /**
   * Get diversity data by industry
   */
  getDiversityByIndustry(): Observable<{ data: IIndustryDiversityData[]; total: number }> {
    return this.http.get<{ data: IIndustryDiversityData[]; total: number }>(`${this.apiUrl}/diversity-by-industry.php`);
  }

  /**
   * Get top industries by company count
   */
  getTopIndustries(limit: number = 5): Observable<{ data: TopIndustryData[]; total: number }> {
    return this.http.get<{ data: TopIndustryData[]; total: number }>(`${this.apiUrl}/top-industries.php?limit=${limit}`);
  }

  /**
   * Transform overview data to stats cards
   */
  transformOverviewToStatsCards(overview: IndustryDashboardResponse['overview']): IIndustryStatsCard[] {
    return [
      {
        title: 'Total Companies',
        value: overview.total_companies.toLocaleString(),
        subtitle: `Across ${overview.total_industries} industries`,
        icon: 'fa-solid fa-building',
        color: '#3B82F6'
      },
      {
        title: 'Total Turnover',
        value: `R${(overview.total_turnover / 1000000).toFixed(1)}M`,
        subtitle: `Avg R${(overview.avg_turnover_per_company / 1000).toFixed(0)}k per company`,
        icon: 'fa-solid fa-chart-line',
        color: '#10B981'
      },
      {
        title: 'Total Employment',
        value: overview.total_employees.toLocaleString(),
        subtitle: `Avg ${overview.avg_employees_per_company.toFixed(1)} per company`,
        icon: 'fa-solid fa-users',
        color: '#8B5CF6'
      },
      {
        title: 'Youth Ownership',
        value: `${overview.diversity_stats.youth_percentage}%`,
        subtitle: `${overview.diversity_stats.youth_owned} youth-owned companies`,
        icon: 'fa-solid fa-seedling',
        color: '#F59E0B'
      },
      {
        title: 'Black Ownership',
        value: `${overview.diversity_stats.black_percentage}%`,
        subtitle: `${overview.diversity_stats.black_owned} black-owned companies`,
        icon: 'fa-solid fa-handshake',
        color: '#EF4444'
      },
      {
        title: 'Women Ownership',
        value: `${overview.diversity_stats.women_percentage}%`,
        subtitle: `${overview.diversity_stats.women_owned} women-owned companies`,
        icon: 'fa-solid fa-venus',
        color: '#EC4899'
      }
    ];
  }
}
