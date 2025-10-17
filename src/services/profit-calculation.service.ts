import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Constants } from './service';

// Profit Interfaces
export interface ProfitSummary {
  financial_year_id: number;
  financial_year_name: string;
  fy_start_year: number;
  fy_end_year: number;

  // Revenue Breakdown
  revenue_q1: number;
  revenue_q2: number;
  revenue_q3: number;
  revenue_q4: number;
  revenue_total: number;

  // Cost Breakdown
  direct_costs: number;
  operational_costs: number;
  total_costs: number;

  // Profit Metrics
  gross_profit: number;
  operating_profit: number;
  gross_margin: number;
  operating_margin: number;

  // Export Data
  export_total?: number;
  export_ratio?: number;

  // Quarter Details
  quarter_details?: {
    q1_months: string[];
    q2_months: string[];
    q3_months: string[];
    q4_months: string[];
  };
}

export interface QuarterlyProfit {
  financial_year_id: number;
  financial_year_name: string;
  fy_start_year: number;
  fy_end_year: number;

  // Quarterly Revenue
  revenue_q1: number;
  revenue_q2: number;
  revenue_q3: number;
  revenue_q4: number;

  // Quarterly Gross Profit
  gross_profit_q1: number;
  gross_profit_q2: number;
  gross_profit_q3: number;
  gross_profit_q4: number;

  // Quarterly Operating Profit
  operating_profit_q1: number;
  operating_profit_q2: number;
  operating_profit_q3: number;
  operating_profit_q4: number;

  // Annual Totals
  gross_profit_total: number;
  operating_profit_total: number;
  gross_margin: number;
  operating_margin: number;

  // Cost Details
  direct_costs: number;
  operational_costs: number;

  // Quarter Details
  quarter_details?: {
    q1_months: string[];
    q2_months: string[];
    q3_months: string[];
    q4_months: string[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class ProfitCalculationService {
  private baseUrl = `${Constants.ApiBase}/api-nodes`;

  constructor(private http: HttpClient) {}

  /**
   * Get profit summary for a specific year
   */
  getProfitSummary(companyId: number, financialYearId: number): Observable<ProfitSummary> {
    return this.http.get<ProfitSummary>(
      `${this.baseUrl}/get-profit-summary.php`,
      {
        params: {
          company_id: companyId.toString(),
          financial_year_id: financialYearId.toString()
        }
      }
    );
  }

  /**
   * Get profit summaries for all years
   */
  getProfitSummaryAllYears(companyId: number): Observable<ProfitSummary[]> {
    return this.http.get<ProfitSummary[]>(
      `${this.baseUrl}/get-profit-summary.php`,
      {
        params: {
          company_id: companyId.toString()
        }
      }
    );
  }

  /**
   * Get quarterly profit data for all years
   */
  getQuarterlyProfitAllYears(companyId: number): Observable<QuarterlyProfit[]> {
    return this.http.get<QuarterlyProfit[]>(
      `${this.baseUrl}/get-quarterly-profit.php`,
      {
        params: {
          company_id: companyId.toString()
        }
      }
    );
  }
}
