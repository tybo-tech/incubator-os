import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Constants } from './service';

// Report interfaces
export interface OverallSummary {
  total_clients: number;
  total_programs: number;
  total_cohorts: number;
  total_companies: number;
}

export interface CohortPerformance {
  cohort_id: number;
  cohort_name: string;
  program_name: string;
  client_name: string;
  total_companies: number;
  active_companies: number;
  completed_companies: number;
  bbbee_compliant: number;
  tax_compliant: number;
  cipc_compliant: number;
  youth_owned: number;
  black_owned: number;
  women_owned: number;
  avg_turnover: number;
  total_turnover: number;
  avg_employees: number;
  earliest_join: string;
  latest_join: string;
}

export interface ComplianceSummary {
  cohort_id: number;
  cohort_name: string;
  total_companies: number;
  bbbee_compliance_rate: number;
  tax_compliance_rate: number;
  cipc_compliance_rate: number;
  full_compliance_rate: number;
}

export interface FinancialMetrics {
  cohort_id: number;
  cohort_name: string;
  program_name: string;
  total_companies: number;
  total_estimated_turnover: number;
  avg_estimated_turnover: number;
  min_turnover: number;
  max_turnover: number;
  total_employees: number;
  avg_employees: number;
  companies_with_turnover: number;
  companies_over_1m: number;
}

export interface IndustryDistribution {
  industry: string;
  total_companies: number;
  cohorts_count: number;
  avg_turnover: number;
  youth_owned_count: number;
  women_owned_count: number;
}

export interface GeographicDistribution {
  location: string;
  company_count: number;
  cohort_count: number;
  avg_turnover: number;
  cohorts: string;
}

export interface TimelineAnalytics {
  month_year: string;
  companies_joined: number;
  active_cohorts: number;
  avg_turnover_joined: number;
}

export interface CompaniesPerProgram {
  program_id: number;
  program: string;
  total_companies: number;
}

export interface CompaniesPerCohort {
  cohort_id: number;
  cohort: string;
  program: string;
  total_companies: number;
}

export interface CohortComparison {
  cohort_id: number;
  cohort_name: string;
  program_name: string;
  total_companies: number;
  active_companies: number;
  avg_turnover: number;
  fully_compliant: number;
  youth_owned: number;
  women_owned: number;
  industry_diversity: number;
}

export interface DashboardData {
  summary: OverallSummary;
  cohort_performance: CohortPerformance[];
  compliance_summary: ComplianceSummary[];
  financial_metrics: FinancialMetrics[];
  industry_distribution: IndustryDistribution[];
  geographic_distribution: GeographicDistribution[];
  timeline_analytics: TimelineAnalytics[];
  companies_per_program: CompaniesPerProgram[];
  companies_per_cohort: CompaniesPerCohort[];
  active_companies_by_client: any[];
  metadata: {
    generated_at: string;
    filters: {
      client_id?: number;
      program_id?: number;
      cohort_id?: number;
    };
  };
}

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private apiUrl = `${Constants.ApiBase}/api-nodes/reports`;

  constructor(private http: HttpClient) {}

  // Individual report endpoints
  getOverallSummary(): Observable<OverallSummary> {
    return this.http.get<OverallSummary>(`${this.apiUrl}/overall-summary.php`);
  }

  getCohortPerformance(cohortId?: number): Observable<CohortPerformance[]> {
    const url = cohortId
      ? `${this.apiUrl}/cohort-performance.php?cohort_id=${cohortId}`
      : `${this.apiUrl}/cohort-performance.php`;
    return this.http.get<CohortPerformance[]>(url);
  }

  getComplianceSummary(cohortId?: number): Observable<ComplianceSummary[]> {
    const url = cohortId
      ? `${this.apiUrl}/compliance-summary.php?cohort_id=${cohortId}`
      : `${this.apiUrl}/compliance-summary.php`;
    return this.http.get<ComplianceSummary[]>(url);
  }

  getFinancialMetrics(cohortId?: number): Observable<FinancialMetrics[]> {
    const url = cohortId
      ? `${this.apiUrl}/financial-metrics.php?cohort_id=${cohortId}`
      : `${this.apiUrl}/financial-metrics.php`;
    return this.http.get<FinancialMetrics[]>(url);
  }

  getIndustryDistribution(): Observable<IndustryDistribution[]> {
    return this.http.get<IndustryDistribution[]>(`${this.apiUrl}/industry-distribution.php`);
  }

  getGeographicDistribution(cohortId?: number): Observable<GeographicDistribution[]> {
    const url = cohortId
      ? `${this.apiUrl}/geographic-distribution.php?cohort_id=${cohortId}`
      : `${this.apiUrl}/geographic-distribution.php`;
    return this.http.get<GeographicDistribution[]>(url);
  }

  getTimelineAnalytics(): Observable<TimelineAnalytics[]> {
    return this.http.get<TimelineAnalytics[]>(`${this.apiUrl}/timeline-analytics.php`);
  }

  getCompaniesPerProgram(): Observable<CompaniesPerProgram[]> {
    return this.http.get<CompaniesPerProgram[]>(`${this.apiUrl}/companies-per-program.php`);
  }

  getCompaniesPerCohort(): Observable<CompaniesPerCohort[]> {
    return this.http.get<CompaniesPerCohort[]>(`${this.apiUrl}/companies-per-cohort.php`);
  }

  getCohortComparison(cohortIds: number[]): Observable<CohortComparison[]> {
    const idsParam = cohortIds.join(',');
    return this.http.get<CohortComparison[]>(`${this.apiUrl}/cohort-comparison.php?cohort_ids=${idsParam}`);
  }

  // Comprehensive dashboard endpoint
  getDashboard(filters: {
    clientId?: number;
    programId?: number;
    cohortId?: number;
  } = {}): Observable<DashboardData> {
    const params = new URLSearchParams();
    if (filters.clientId) params.append('client_id', String(filters.clientId));
    if (filters.programId) params.append('program_id', String(filters.programId));
    if (filters.cohortId) params.append('cohort_id', String(filters.cohortId));

    const queryString = params.toString();
    const url = `${this.apiUrl}/dashboard.php${queryString ? '?' + queryString : ''}`;
    return this.http.get<DashboardData>(url);
  }

  // Utility methods for data processing
  calculateGrowthRate(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount);
  }

  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  getComplianceStatus(rate: number): { status: string; color: string } {
    if (rate >= 80) return { status: 'Excellent', color: 'green' };
    if (rate >= 60) return { status: 'Good', color: 'blue' };
    if (rate >= 40) return { status: 'Fair', color: 'yellow' };
    return { status: 'Needs Improvement', color: 'red' };
  }
}
