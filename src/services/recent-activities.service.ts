import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Constants } from './service';

export interface RecentActivity {
  id: number;
  company_id?: number;
  company_name: string;
  total_amount?: number;
  total_amount_raw?: number;
  updated_at: string;
  created_at: string;
  action_type: 'Created' | 'Updated';
  notes?: string;
  financial_year?: string;
  affected_period?: string;
  entry_type?: 'Revenue' | 'Cost';
  reference_id?: number;
  // Company-specific fields
  registration_no?: string;
  industry?: string;
  city?: string;
}

export interface FinancialStatistics {
  type: string;
  data: any;
  title: string;
  subtitle: string;
}

export interface FinancialStatisticsResponse {
  success: boolean;
  result: FinancialStatistics;
  metadata: {
    generated_at: string;
    financial_year_id?: number;
    limit: number;
  };
}

export interface RecentActivitiesResponse {
  success: boolean;
  type: string;
  result: {
    data: RecentActivity[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      has_more: boolean;
    };
  };
}

export type ActivityType = 'recent_revenue' | 'recent_costs' | 'recent_companies' | 'recent_compliance' | 'recent_revenue_enhanced' | 'recent_financial_updates';

export type StatisticsType = 'top_revenue' | 'max_revenue' | 'recent_high_value' | 'monthly_summary' | 'active_companies' | 'summary';

export interface ActivityTypeOption {
  value: ActivityType;
  label: string;
  description: string;
  icon: string;
}

@Injectable({
  providedIn: 'root'
})
export class RecentActivitiesService {
  private apiUrl = `${Constants.ApiBase}/api-nodes/dashboard`;

  constructor(private http: HttpClient) {}

  getRecentActivities(type: ActivityType, limit: number = 20, offset: number = 0): Observable<RecentActivitiesResponse> {
    let params = new HttpParams();
    params = params.set('type', type);
    params = params.set('limit', limit.toString());
    params = params.set('offset', offset.toString());

    return this.http.get<RecentActivitiesResponse>(`${this.apiUrl}/recent-activities.php`, { params });
  }

  getActivityTypes(): ActivityTypeOption[] {
    return [
      {
        value: 'recent_revenue',
        label: 'Recent Revenue',
        description: 'Latest revenue entries and updates',
        icon: 'fas fa-chart-line'
      },
      {
        value: 'recent_costs',
        label: 'Recent Costs',
        description: 'Latest cost entries and updates',
        icon: 'fas fa-chart-bar'
      },
      {
        value: 'recent_companies',
        label: 'Recent Companies',
        description: 'Latest company registrations and updates',
        icon: 'fas fa-building'
      },
      {
        value: 'recent_compliance',
        label: 'Recent Compliance',
        description: 'Latest compliance activities',
        icon: 'fas fa-shield-alt'
      },
      {
        value: 'recent_revenue_enhanced',
        label: 'Enhanced Revenue Activity',
        description: 'Recent revenue with amounts and totals',
        icon: 'fas fa-money-bill-wave'
      },
      {
        value: 'recent_financial_updates',
        label: 'Financial Updates',
        description: 'High-value financial transactions',
        icon: 'fas fa-chart-line'
      }
    ];
  }

  getFinancialStatistics(type: StatisticsType, limit: number = 10, financialYearId?: number): Observable<FinancialStatisticsResponse> {
    let params = new HttpParams();
    params = params.set('type', type);
    params = params.set('limit', limit.toString());
    if (financialYearId) {
      params = params.set('financial_year_id', financialYearId.toString());
    }

    return this.http.get<FinancialStatisticsResponse>(`${this.apiUrl}/financial-statistics.php`, { params });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatTimeAgo(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-ZA');
    }
  }
}
