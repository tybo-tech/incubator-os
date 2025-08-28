import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Constants } from './service';
import {
  CompanyPurchase,
  CompanyPurchaseFilters,
  CompanyPurchaseResponse,
  CompanyPurchaseStatisticsResponse,
  PurchaseTypeBreakdownResponse,
  ServiceProviderBreakdownResponse,
  MonthlyTrendsResponse,
  CompanyPurchaseCountResponse,
  ApiResponse
} from '../models/company-purchases.models';

@Injectable({
  providedIn: 'root'
})
export class CompanyPurchasesService {
  private apiUrl = `${Constants.ApiBase}/api-nodes/company-purchases`;

  constructor(private http: HttpClient) {}

  /**
   * Add a new company purchase record
   */
  addCompanyPurchase(purchase: Omit<CompanyPurchase, 'id' | 'created_at' | 'updated_at'>): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/add-company-purchase.php`, purchase);
  }

  /**
   * Get a single company purchase by ID
   */
  getCompanyPurchase(id: number): Observable<ApiResponse<CompanyPurchase>> {
    return this.http.get<ApiResponse<CompanyPurchase>>(`${this.apiUrl}/get-company-purchase.php?id=${id}`);
  }

  /**
   * Get list of company purchases with optional filtering
   */
  listCompanyPurchases(filters?: CompanyPurchaseFilters): Observable<CompanyPurchaseResponse> {
    let params = new HttpParams();

    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = (filters as any)[key];
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<CompanyPurchaseResponse>(`${this.apiUrl}/list-company-purchases.php`, { params });
  }

  /**
   * Update an existing company purchase record
   */
  updateCompanyPurchase(purchase: CompanyPurchase): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/update-company-purchase.php`, purchase);
  }

  /**
   * Delete a company purchase record
   */
  deleteCompanyPurchase(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/delete-company-purchase.php`, {
      body: { id }
    });
  }

  /**
   * Get purchase statistics for a company or all companies
   */
  getPurchaseStatistics(companyId?: number): Observable<CompanyPurchaseStatisticsResponse> {
    let params = new HttpParams();
    if (companyId) {
      params = params.set('company_id', companyId.toString());
    }

    return this.http.get<CompanyPurchaseStatisticsResponse>(`${this.apiUrl}/get-purchase-statistics.php`, { params });
  }

  /**
   * Get purchase type breakdown
   */
  getPurchaseTypeBreakdown(companyId?: number): Observable<PurchaseTypeBreakdownResponse> {
    let params = new HttpParams();
    if (companyId) {
      params = params.set('company_id', companyId.toString());
    }

    return this.http.get<PurchaseTypeBreakdownResponse>(`${this.apiUrl}/get-purchase-type-breakdown.php`, { params });
  }

  /**
   * Get service provider breakdown
   */
  getServiceProviderBreakdown(companyId?: number): Observable<ServiceProviderBreakdownResponse> {
    let params = new HttpParams();
    if (companyId) {
      params = params.set('company_id', companyId.toString());
    }

    return this.http.get<ServiceProviderBreakdownResponse>(`${this.apiUrl}/get-service-provider-breakdown.php`, { params });
  }

  /**
   * Get monthly purchase trends
   */
  getMonthlyTrends(companyId?: number, year?: number): Observable<MonthlyTrendsResponse> {
    let params = new HttpParams();
    if (companyId) {
      params = params.set('company_id', companyId.toString());
    }
    if (year) {
      params = params.set('year', year.toString());
    }

    return this.http.get<MonthlyTrendsResponse>(`${this.apiUrl}/get-monthly-trends.php`, { params });
  }

  /**
   * Search company purchases
   */
  searchCompanyPurchases(searchTerm: string, companyId?: number): Observable<CompanyPurchaseResponse> {
    let params = new HttpParams()
      .set('search', searchTerm);

    if (companyId) {
      params = params.set('company_id', companyId.toString());
    }

    return this.http.get<CompanyPurchaseResponse>(`${this.apiUrl}/search-company-purchases.php`, { params });
  }

  /**
   * Get count of company purchases with optional filtering
   */
  countCompanyPurchases(filters?: CompanyPurchaseFilters): Observable<CompanyPurchaseCountResponse> {
    let params = new HttpParams();

    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = (filters as any)[key];
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<CompanyPurchaseCountResponse>(`${this.apiUrl}/count-company-purchases.php`, { params });
  }

  /**
   * Get purchases for a specific company
   */
  getCompanyPurchases(companyId: number, filters?: Omit<CompanyPurchaseFilters, 'company_id'>): Observable<CompanyPurchaseResponse> {
    const purchaseFilters: CompanyPurchaseFilters = {
      ...filters,
      company_id: companyId
    };

    return this.listCompanyPurchases(purchaseFilters);
  }

  /**
   * Get purchase summary for a company
   */
  getCompanyPurchaseSummary(companyId: number) {
    return {
      statistics: this.getPurchaseStatistics(companyId),
      typeBreakdown: this.getPurchaseTypeBreakdown(companyId),
      providerBreakdown: this.getServiceProviderBreakdown(companyId),
      monthlyTrends: this.getMonthlyTrends(companyId)
    };
  }

  /**
   * Helper method to get purchase status summary
   */
  getPurchaseStatusSummary(companyId?: number): Observable<any> {
    return new Observable(observer => {
      this.getPurchaseStatistics(companyId).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const stats = response.data;
            const summary = {
              totalPurchases: stats.total_purchases,
              totalAmount: stats.total_amount,
              averageAmount: stats.average_amount,
              completionRates: {
                purchaseOrderRate: stats.total_purchases > 0 ? (stats.with_purchase_order / stats.total_purchases) * 100 : 0,
                invoiceReceivedRate: stats.total_purchases > 0 ? (stats.with_invoice / stats.total_purchases) * 100 : 0,
                itemsDeliveredRate: stats.total_purchases > 0 ? (stats.items_delivered / stats.total_purchases) * 100 : 0,
                alignmentRate: stats.total_purchases > 0 ? (stats.aligned_purchases / stats.total_purchases) * 100 : 0
              },
              diversity: {
                uniqueTypes: stats.unique_types,
                uniqueProviders: stats.unique_providers
              }
            };
            observer.next(summary);
            observer.complete();
          } else {
            observer.error(response.message || 'Failed to get purchase statistics');
          }
        },
        error: (error) => observer.error(error)
      });
    });
  }
}
