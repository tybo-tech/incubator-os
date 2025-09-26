// services/pdf/financial-export-helper.service.ts - Financial Export Helper Service

import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { FinancialExportService, FinancialExportOptions } from './financial-export.service';
import { CompanyService } from '../company.service';
import { CompanyFinancialsService, ICompanyFinancials } from '../company-financials.service';
import { MetricsService } from '../metrics.service';
import { ChartGeneratorService } from '../chart-generator.service';
import { ICompany } from '../../models/simple.schema';

export interface FinancialExportData {
  financialCheckIns: ICompanyFinancials[];
  metricsData?: any[];
  chartData?: {
    turnoverChart: string; // SVG chart data
    profitabilityChart: string;
    quarterlyTrendsChart: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class FinancialExportHelperService {

  constructor(
    private financialExportService: FinancialExportService,
    private companyService: CompanyService,
    private companyFinancialsService: CompanyFinancialsService,
    private metricsService: MetricsService,
    private chartGenerator: ChartGeneratorService
  ) {}

  /**
   * Export financial data for a specific company ID
   */
  exportFinancialDataByCompanyId(
    companyId: number,
    options: FinancialExportOptions = {}
  ): Observable<void> {
    return forkJoin({
      company: this.companyService.getCompanyById(companyId),
      financialData: this.getFinancialExportData(companyId, options)
    }).pipe(
      switchMap(({ company, financialData }) => {
        if (!financialData || financialData.financialCheckIns.length === 0) {
          throw new Error('No financial data found for this company');
        }
        return this.financialExportService.exportFinancialPdf(company, financialData, options);
      })
    );
  }

  /**
   * Export financial data from existing data
   */
  exportFinancialDataFromData(
    company: ICompany,
    financialData: FinancialExportData,
    options: FinancialExportOptions = {}
  ): Observable<void> {
    return this.financialExportService.exportFinancialPdf(company, financialData, options);
  }

  /**
   * Export bank statements only (current financial tab functionality)
   */
  exportBankStatementsReport(companyId: number): Observable<void> {
    const options: FinancialExportOptions = {
      includeMetrics: false,
      includeCharts: false,
      reportType: 'bank-statements',
      customTitle: 'Bank Statements Report',
      dateRange: 'all'
    };
    return this.exportFinancialDataByCompanyId(companyId, options);
  }

  /**
   * Export metrics group report (for metric tabs)
   */
  exportMetricGroupReport(companyId: number, groupId: number): Observable<void> {
    const options: FinancialExportOptions = {
      includeMetrics: true,
      includeCharts: true,
      includeFinancialCheckIns: false,
      reportType: 'metrics',
      filterGroupId: groupId,
      customTitle: 'Metrics Group Report',
      dateRange: 'last-12-months'
    };
    return this.exportFinancialDataByCompanyId(companyId, options);
  }

  /**
   * Export complete financial dashboard report
   */
  exportCompleteFinancialReport(companyId: number): Observable<void> {
    const options: FinancialExportOptions = {
      includeMetrics: true,
      includeCharts: true,
      includeFinancialCheckIns: true,
      reportType: 'complete',
      customTitle: 'Complete Financial Dashboard Report',
      dateRange: 'last-24-months'
    };
    return this.exportFinancialDataByCompanyId(companyId, options);
  }

  /**
   * Get consolidated financial data for export
   */
  private getFinancialExportData(
    companyId: number,
    options: FinancialExportOptions
  ): Observable<FinancialExportData> {
    const requests: any = {
      financialCheckIns: this.getFinancialCheckInsForExport(companyId, options.dateRange)
    };

    // Add metrics data if requested
    if (options.includeMetrics) {
      requests.metricsData = this.getMetricsDataForExport(companyId, options.filterGroupId);
    }

    return forkJoin(requests).pipe(
      switchMap((data: any) => {
        // Generate charts if requested
        if (options.includeCharts && data.financialCheckIns.length > 0) {
          return this.generateChartData(data.financialCheckIns, data.metricsData).pipe(
            map(chartData => ({
              ...data,
              chartData
            }))
          );
        }
        return of(data);
      }),
      catchError((error) => {
        console.error('Error fetching financial export data:', error);
        return of({
          financialCheckIns: [],
          metricsData: [],
          chartData: undefined
        });
      })
    );
  }

  /**
   * Get financial check-ins data for export
   */
  private getFinancialCheckInsForExport(
    companyId: number,
    dateRange?: string
  ): Observable<ICompanyFinancials[]> {
    return this.companyFinancialsService.listAllCompanyFinancials(companyId).pipe(
      map(checkIns => {
        // Filter by company ID
        let filteredCheckIns = checkIns.filter(checkIn => checkIn.company_id === companyId);

        // Apply date range filter if specified
        if (dateRange) {
          filteredCheckIns = this.applyDateRangeFilter(filteredCheckIns, dateRange);
        }

        // Sort by date (newest first)
        return filteredCheckIns.sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return (b.month || 0) - (a.month || 0);
        });
      })
    );
  }

  /**
   * Get metrics data for export (if available)
   */
  private getMetricsDataForExport(companyId: number, groupId?: number): Observable<any[]> {
    // This would integrate with your metrics service
    // For now, return empty array since we're focusing on financial check-ins
    return of([]);
  }

  /**
   * Generate chart data as SVG strings
   */
  private generateChartData(
    financialCheckIns: ICompanyFinancials[],
    metricsData?: any[]
  ): Observable<{ turnoverChart: string; profitabilityChart: string; quarterlyTrendsChart: string }> {
    // Generate SVG charts using D3.js or similar library
    // For now, return simple SVG placeholders
    const turnoverChart = this.generateTurnoverChart(financialCheckIns);
    const profitabilityChart = this.generateProfitabilityChart(financialCheckIns);
    const quarterlyTrendsChart = this.generateQuarterlyTrendsChart(financialCheckIns);

    return of({
      turnoverChart,
      profitabilityChart,
      quarterlyTrendsChart
    });
  }

  /**
   * Generate turnover chart as SVG
   */
  private generateTurnoverChart(financialCheckIns: ICompanyFinancials[]): string {
    // Extract turnover data for last 12 months
    const data = financialCheckIns
      .slice(0, 12)
      .reverse()
      .map(checkIn => ({
        period: `${checkIn.year}-${String(checkIn.month || 1).padStart(2, '0')}`,
        value: parseFloat(String(checkIn.turnover || 0))
      }));

    return this.chartGenerator.generateLineChart(data, {
      title: 'Monthly Turnover Trend',
      color: '#10b981',
      width: 600,
      height: 300
    });
  }

  /**
   * Generate profitability chart as SVG
   */
  private generateProfitabilityChart(financialCheckIns: ICompanyFinancials[]): string {
    // Use net profit data for profitability chart
    const data = financialCheckIns
      .slice(0, 6)
      .reverse()
      .map(checkIn => ({
        period: `${checkIn.year}-${String(checkIn.month || 1).padStart(2, '0')}`,
        value: parseFloat(String(checkIn.net_profit || 0))
      }));

    return this.chartGenerator.generateLineChart(data, {
      title: 'Net Profit Trend',
      color: '#ef4444',
      width: 600,
      height: 300
    });
  }

  /**
   * Generate quarterly trends chart as SVG
   */
  private generateQuarterlyTrendsChart(financialCheckIns: ICompanyFinancials[]): string {
    // Group by quarter and calculate averages
    const quarterlyData = this.groupByQuarter(financialCheckIns);

    return this.chartGenerator.generateBarChart(quarterlyData, {
      title: 'Quarterly Turnover Performance',
      color: '#8b5cf6',
      width: 600,
      height: 300
    });
  }



  /**
   * Apply date range filter to financial check-ins
   */
  private applyDateRangeFilter(checkIns: ICompanyFinancials[], dateRange: string): ICompanyFinancials[] {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    switch (dateRange) {
      case 'last-6-months':
        return checkIns.filter(checkIn => {
          const monthsAgo = (currentYear - checkIn.year) * 12 + (currentMonth - (checkIn.month || 1));
          return monthsAgo <= 6;
        });
      case 'last-12-months':
        return checkIns.filter(checkIn => {
          const monthsAgo = (currentYear - checkIn.year) * 12 + (currentMonth - (checkIn.month || 1));
          return monthsAgo <= 12;
        });
      case 'last-24-months':
        return checkIns.filter(checkIn => {
          const monthsAgo = (currentYear - checkIn.year) * 12 + (currentMonth - (checkIn.month || 1));
          return monthsAgo <= 24;
        });
      case 'current-year':
        return checkIns.filter(checkIn => checkIn.year === currentYear);
      default:
        return checkIns;
    }
  }

  /**
   * Group financial check-ins by quarter
   */
  private groupByQuarter(checkIns: ICompanyFinancials[]): any[] {
    const quarterlyData: { [key: string]: { total: number; count: number } } = {};

    checkIns.forEach(checkIn => {
      const quarter = checkIn.quarter_label || `Q${checkIn.quarter}`;
      const key = `${checkIn.year}-${quarter}`;
      const value = parseFloat(String(checkIn.turnover || 0));

      if (!quarterlyData[key]) {
        quarterlyData[key] = { total: 0, count: 0 };
      }
      quarterlyData[key].total += value;
      quarterlyData[key].count += 1;
    });

    return Object.entries(quarterlyData)
      .map(([period, data]) => ({
        period,
        value: data.total / data.count // Average
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  /**
   * Preview financial data (for debugging)
   */
  previewFinancialData(companyId: number): Observable<{
    company: ICompany;
    financialData: FinancialExportData;
    recordCount: number;
    dateRange: string;
  }> {
    return forkJoin({
      company: this.companyService.getCompanyById(companyId),
      financialData: this.getFinancialExportData(companyId, { dateRange: 'all' })
    }).pipe(
      map(({ company, financialData }) => {
        const recordCount = financialData.financialCheckIns.length;
        const dateRange = recordCount > 0
          ? `${financialData.financialCheckIns[recordCount - 1].year}-${financialData.financialCheckIns[recordCount - 1].month} to ${financialData.financialCheckIns[0].year}-${financialData.financialCheckIns[0].month}`
          : 'No data';

        return {
          company,
          financialData,
          recordCount,
          dateRange
        };
      })
    );
  }
}
