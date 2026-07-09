import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Constants } from './service';

export interface FinancialIndicatorMeta {
  financialYear: number;
  month: number;
  currency: string;
  reportType: string;
}

export interface IncomeStatement {
  sales: number;
  costOfSales: number;
  operatingExpenses: number;
}

export interface BalanceSheet {
  cash: number;
  cashEquivalents: number;
  shortTermInvestments: number;
  currentReceivables: number;
  totalCurrentAssets: number;
  totalAssets: number;
  totalCurrentLiabilities: number;
  totalLiabilities: number;
  totalEquity: number;
}

export interface FinancialIndicatorData {
  meta: FinancialIndicatorMeta;
  incomeStatement: IncomeStatement;
  balanceSheet: BalanceSheet;
}

export interface FinancialIndicatorResponse {
  id: number;
  companyId: number;
  parentId: number | null;
  data: FinancialIndicatorData;
  createdAt: string;
  updatedAt: string;
  createdBy: number | null;
  updatedBy: number | null;
  grossProfit: number | null;
  grossProfitPercentage: number | null;
  netProfit: number | null;
  netProfitPercentage: number | null;
}

export interface FinancialIndicatorSummary {
  id: number;
  financialYear: number;
  month: number;
  netProfit: number | null;
  grossProfit: number | null;
  status: string;
  createdAt: string;
}

export interface AnnualMonthData {
  sales: number | null;
  costOfSales: number | null;
  grossProfit: number | null;
  grossProfitPercentage: number | null;
  operatingExpenses: number | null;
  netProfit: number | null;
  netProfitPercentage: number | null;
  cash: number | null;
  cashEquivalents: number | null;
  shortTermInvestments: number | null;
  currentReceivables: number | null;
  totalCurrentAssets: number | null;
  totalAssets: number | null;
  totalCurrentLiabilities: number | null;
  totalLiabilities: number | null;
  totalEquity: number | null;
}

export interface AnnualReportResponse {
  year: number;
  months: { [monthName: string]: AnnualMonthData };
}

export interface FinancialIndicatorSummaryResponse {
  latestMonth: number | null;
  latestFinancialYear: number | null;
  latestNetProfit: number | null;
  latestGrossProfit: number | null;
  latestSales: number | null;
  latestExpenses: number | null;
  grossMargin: number | null;
  netMargin: number | null;
}

export interface CommandResult {
  success: boolean;
  message: string;
  data?: any;
  auditId?: string;
  warnings?: string[];
}

@Injectable({ providedIn: 'root' })
export class FinancialIndicatorService {
  private baseUrl = `${Constants.ApiBase}/api/financial-indicators`;

  constructor(private http: HttpClient) {}

  create(companyId: number, data: FinancialIndicatorData): Observable<CommandResult> {
    return this.http.post<CommandResult>(
      `${this.baseUrl}/commands/create.php`,
      { companyId, data }
    );
  }

  update(id: number, data: FinancialIndicatorData): Observable<CommandResult> {
    return this.http.post<CommandResult>(
      `${this.baseUrl}/commands/update.php?id=${id}`,
      { data }
    );
  }

  get(id: number): Observable<FinancialIndicatorResponse> {
    return this.http.get<FinancialIndicatorResponse>(
      `${this.baseUrl}/queries/get.php?id=${id}`
    );
  }

  delete(id: number): Observable<CommandResult> {
    return this.http.post<CommandResult>(
      `${this.baseUrl}/commands/delete.php?id=${id}`,
      {}
    );
  }

  listByCompany(companyId: number): Observable<FinancialIndicatorSummary[]> {
    return this.http.get<FinancialIndicatorSummary[]>(
      `${this.baseUrl}/queries/list-by-company.php?companyId=${companyId}`
    );
  }

  getAnnual(companyId: number, year: number): Observable<AnnualReportResponse> {
    return this.http.get<AnnualReportResponse>(
      `${this.baseUrl}/queries/annual.php?companyId=${companyId}&year=${year}`
    );
  }

  getSummary(companyId: number): Observable<FinancialIndicatorSummaryResponse> {
    return this.http.get<FinancialIndicatorSummaryResponse>(
      `${this.baseUrl}/queries/summary.php?companyId=${companyId}`
    );
  }

  requestLink(companyId: number, financialYear: number, month: number): Observable<CommandResult> {
    return this.http.post<CommandResult>(
      `${this.baseUrl}/commands/request-link.php`,
      { companyId, financialYear, month }
    );
  }
}
