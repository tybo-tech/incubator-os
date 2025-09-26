// services/pdf/financial-export.service.ts - Financial PDF Export Service

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ICompany } from '../../models/simple.schema';
import { ICompanyFinancials } from '../company-financials.service';

export interface FinancialExportData {
  financialCheckIns: ICompanyFinancials[];
  metricsData?: any[];
  chartData?: {
    turnoverChart: string;
    profitabilityChart: string;
    quarterlyTrendsChart: string;
  };
}

export interface FinancialExportOptions {
  includeMetrics?: boolean;
  includeCharts?: boolean;
  includeFinancialCheckIns?: boolean;
  reportType?: 'bank-statements' | 'metrics' | 'complete';
  filterGroupId?: number;
  customTitle?: string;
  dateRange?: 'all' | 'last-6-months' | 'last-12-months' | 'last-24-months' | 'current-year';
}

@Injectable({
  providedIn: 'root'
})
export class FinancialExportService {
  private readonly PDF_ENDPOINT = 'https://docs.tybo.co.za/pdf.php';

  constructor(private http: HttpClient) {}

  /**
   * Export financial data as PDF
   */
  exportFinancialPdf(
    company: ICompany,
    financialData: FinancialExportData,
    options: FinancialExportOptions = {}
  ): Observable<void> {
    const html = this.generateFinancialHtml(company, financialData, options);
    return this.generatePdf(html).pipe(
      map(blob => this.downloadPdf(blob, this.getFilename(company, options)))
    );
  }

  /**
   * Generate HTML content for financial PDF
   */
  private generateFinancialHtml(
    company: ICompany,
    financialData: FinancialExportData,
    options: FinancialExportOptions
  ): string {
    const title = options.customTitle || this.getDefaultTitle(options.reportType);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${title} - ${company.name}</title>
        <style>
          ${this.getFinancialStyles()}
        </style>
      </head>
      <body>
        <div class="container">
          ${this.generateHeader(company, financialData, options, title)}
          ${this.generateExecutiveSummary(financialData)}
          ${this.generateChartsSection(financialData, options)}
          ${this.generateFinancialDataTable(financialData)}
          ${this.generateMetricsSection(financialData, options)}
          ${this.generateFooter()}
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate PDF header
   */
  private generateHeader(
    company: ICompany,
    financialData: FinancialExportData,
    options: FinancialExportOptions,
    title: string
  ): string {
    const reportDate = new Date().toLocaleDateString();
    const dataCount = financialData.financialCheckIns.length;
    const latestRecord = financialData.financialCheckIns[0];
    const oldestRecord = financialData.financialCheckIns[dataCount - 1];

    const dataRange = dataCount > 0 && latestRecord && oldestRecord
      ? `${oldestRecord.year}-${String(oldestRecord.month || 1).padStart(2, '0')} to ${latestRecord.year}-${String(latestRecord.month || 1).padStart(2, '0')}`
      : 'No data available';

    return `
      <header class="header">
        <div class="header-content">
          <div class="company-info">
            <h1>${company.name}</h1>
            <h2>${title}</h2>
            <div class="company-details">
              <p><strong>Company ID:</strong> ${company.id}</p>
              <p><strong>Report Generated:</strong> ${reportDate}</p>
              <p><strong>Data Range:</strong> ${dataRange}</p>
              <p><strong>Records Included:</strong> ${dataCount} financial entries</p>
            </div>
          </div>
          <div class="logo-section">
            <div class="report-badge">
              <div class="badge-circle">
                <span>${dataCount}</span>
                <small>Records</small>
              </div>
            </div>
          </div>
        </div>
      </header>
    `;
  }

  /**
   * Generate executive summary
   */
  private generateExecutiveSummary(financialData: FinancialExportData): string {
    if (financialData.financialCheckIns.length === 0) {
      return '<div class="section"><h3>Executive Summary</h3><p>No financial data available.</p></div>';
    }

    const latest = financialData.financialCheckIns[0];
    const previous = financialData.financialCheckIns[1];
    const allRecords = financialData.financialCheckIns;

    // Calculate key metrics
    const totalTurnover = allRecords.reduce((sum, record) => sum + (parseFloat(String(record.turnover || 0))), 0);
    const avgTurnover = totalTurnover / allRecords.length;

    const latestTurnover = parseFloat(String(latest.turnover || 0));
    const previousTurnover = previous ? parseFloat(String(previous.turnover || 0)) : latestTurnover;
    const turnoverGrowth = previousTurnover > 0 ? ((latestTurnover - previousTurnover) / previousTurnover) * 100 : 0;

    const latestGrossProfit = parseFloat(String(latest.gross_profit || 0));
    const latestNetProfit = parseFloat(String(latest.net_profit || 0));
    const latestGPMargin = parseFloat(String(latest.gp_margin || 0));
    const latestNPMargin = parseFloat(String(latest.np_margin || 0));

    return `
      <section class="executive-summary">
        <h3>📊 Executive Summary</h3>
        <div class="summary-grid">
          <div class="summary-card">
            <div class="card-header">💰 Revenue Performance</div>
            <div class="metric-large">${this.formatCurrency(latestTurnover)}</div>
            <div class="metric-sub">Latest Monthly Turnover</div>
            <div class="growth-indicator ${turnoverGrowth >= 0 ? 'positive' : 'negative'}">
              ${turnoverGrowth >= 0 ? '↗' : '↘'} ${Math.abs(turnoverGrowth).toFixed(1)}%
            </div>
          </div>

          <div class="summary-card">
            <div class="card-header">📈 Profitability</div>
            <div class="metric-large ${latestNetProfit >= 0 ? 'positive' : 'negative'}">${this.formatCurrency(latestNetProfit)}</div>
            <div class="metric-sub">Net Profit (Latest)</div>
            <div class="metric-detail">GP: ${latestGPMargin.toFixed(1)}% | NP: ${latestNPMargin.toFixed(1)}%</div>
          </div>

          <div class="summary-card">
            <div class="card-header">📊 Data Overview</div>
            <div class="metric-large">${allRecords.length}</div>
            <div class="metric-sub">Total Records</div>
            <div class="metric-detail">Avg Turnover: ${this.formatCurrency(avgTurnover)}</div>
          </div>

          <div class="summary-card">
            <div class="card-header">📅 Period Coverage</div>
            <div class="metric-large">${latest.year}</div>
            <div class="metric-sub">Latest Year</div>
            <div class="metric-detail">${latest.quarter_label || `Q${latest.quarter}`} ${latest.year}</div>
          </div>
        </div>
      </section>
    `;
  }

  /**
   * Generate charts section
   */
  private generateChartsSection(financialData: FinancialExportData, options: FinancialExportOptions): string {
    if (!options.includeCharts || !financialData.chartData) {
      return '';
    }

    return `
      <section class="charts-section">
        <h3>📈 Financial Trends</h3>
        <div class="charts-container">
          <div class="chart-wrapper">
            <h4>Monthly Turnover Trend</h4>
            ${financialData.chartData.turnoverChart}
          </div>

          <div class="chart-wrapper">
            <h4>Profitability Analysis</h4>
            ${financialData.chartData.profitabilityChart}
          </div>

          <div class="chart-wrapper">
            <h4>Quarterly Performance</h4>
            ${financialData.chartData.quarterlyTrendsChart}
          </div>
        </div>
      </section>
    `;
  }

  /**
   * Generate financial data table
   */
  private generateFinancialDataTable(financialData: FinancialExportData): string {
    if (financialData.financialCheckIns.length === 0) {
      return '<div class="section"><h3>Financial Data</h3><p>No financial check-ins data available.</p></div>';
    }

    const tableRows = financialData.financialCheckIns.map(checkIn => `
      <tr>
        <td>${checkIn.year}-${String(checkIn.month || 1).padStart(2, '0')}</td>
        <td>${checkIn.quarter_label || `Q${checkIn.quarter}`}</td>
        <td class="currency">${this.formatCurrency(parseFloat(String(checkIn.turnover || 0)))}</td>
        <td class="currency">${this.formatCurrency(parseFloat(String(checkIn.gross_profit || 0)))}</td>
        <td class="currency ${parseFloat(String(checkIn.net_profit || 0)) >= 0 ? 'positive' : 'negative'}">${this.formatCurrency(parseFloat(String(checkIn.net_profit || 0)))}</td>
        <td class="percentage">${parseFloat(String(checkIn.gp_margin || 0)).toFixed(1)}%</td>
        <td class="percentage ${parseFloat(String(checkIn.np_margin || 0)) >= 0 ? 'positive' : 'negative'}">${parseFloat(String(checkIn.np_margin || 0)).toFixed(1)}%</td>
        <td class="currency">${this.formatCurrency(parseFloat(String(checkIn.cash_on_hand || 0)))}</td>
      </tr>
    `).join('');

    return `
      <section class="financial-data-section">
        <h3>💼 Financial Check-ins Data</h3>
        <div class="table-container">
          <table class="financial-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Quarter</th>
                <th>Turnover</th>
                <th>Gross Profit</th>
                <th>Net Profit</th>
                <th>GP Margin</th>
                <th>NP Margin</th>
                <th>Cash on Hand</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  /**
   * Generate metrics section (if applicable)
   */
  private generateMetricsSection(financialData: FinancialExportData, options: FinancialExportOptions): string {
    if (!options.includeMetrics || !financialData.metricsData || financialData.metricsData.length === 0) {
      return '';
    }

    return `
      <section class="metrics-section">
        <h3>🎯 Performance Metrics</h3>
        <p>Metrics data integration will be implemented based on your metrics service structure.</p>
      </section>
    `;
  }

  /**
   * Generate footer
   */
  private generateFooter(): string {
    return `
      <footer class="footer">
        <div class="footer-content">
          <p>This financial report was generated from verified business check-in data.</p>
          <p>Generated on ${new Date().toLocaleDateString()} | Business Incubator Financial System</p>
          <p>All financial figures are in South African Rand (ZAR) unless otherwise specified.</p>
        </div>
      </footer>
    `;
  }

  /**
   * CSS styles for financial PDF
   */
  private getFinancialStyles(): string {
    return `
      @page {
        margin: 0.5cm 1cm;
        size: A4;
      }

      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 12px;
        line-height: 1.4;
        color: #333;
        background: white;
      }

      .container {
        max-width: 100%;
        margin: 0 auto;
        padding-top: 10px;
      }

      /* Header Styles */
      .header {
        background: linear-gradient(135deg, #1e40af, #3b82f6);
        color: white;
        padding: 20px;
        margin-bottom: 20px;
        border-radius: 8px;
      }

      .header-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .company-info h1 {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 8px;
      }

      .company-info h2 {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 12px;
        color: #e0e7ff;
      }

      .company-details p {
        margin-bottom: 4px;
        font-size: 11px;
        color: #c7d2fe;
      }

      .report-badge {
        text-align: center;
      }

      .badge-circle {
        width: 80px;
        height: 80px;
        background: rgba(255, 255, 255, 0.2);
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
      }

      .badge-circle span {
        font-size: 24px;
        font-weight: bold;
      }

      .badge-circle small {
        font-size: 10px;
        opacity: 0.9;
      }

      /* Executive Summary */
      .executive-summary {
        margin-bottom: 30px;
        page-break-inside: avoid;
      }

      .executive-summary h3 {
        font-size: 18px;
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 16px;
        border-bottom: 2px solid #e5e7eb;
        padding-bottom: 8px;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 16px;
      }

      .summary-card {
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 16px;
        text-align: center;
      }

      .card-header {
        font-size: 11px;
        font-weight: 600;
        color: #6b7280;
        margin-bottom: 8px;
      }

      .metric-large {
        font-size: 20px;
        font-weight: bold;
        color: #1f2937;
        margin-bottom: 4px;
      }

      .metric-sub {
        font-size: 10px;
        color: #6b7280;
        margin-bottom: 8px;
      }

      .metric-detail {
        font-size: 9px;
        color: #9ca3af;
      }

      .growth-indicator {
        font-size: 10px;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: 4px;
      }

      .positive {
        color: #059669;
      }

      .negative {
        color: #dc2626;
      }

      .growth-indicator.positive {
        background: #d1fae5;
        color: #065f46;
      }

      .growth-indicator.negative {
        background: #fee2e2;
        color: #991b1b;
      }

      /* Charts Section */
      .charts-section {
        margin-bottom: 30px;
        page-break-inside: avoid;
      }

      .charts-section h3 {
        font-size: 18px;
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 16px;
        border-bottom: 2px solid #e5e7eb;
        padding-bottom: 8px;
      }

      .charts-container {
        display: grid;
        grid-template-columns: 1fr;
        gap: 20px;
      }

      .chart-wrapper {
        background: #fefefe;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 16px;
        text-align: center;
      }

      .chart-wrapper h4 {
        font-size: 14px;
        font-weight: 600;
        color: #374151;
        margin-bottom: 12px;
      }

      /* Financial Data Table */
      .financial-data-section {
        margin-bottom: 30px;
        page-break-inside: avoid;
      }

      .financial-data-section h3 {
        font-size: 18px;
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 16px;
        border-bottom: 2px solid #e5e7eb;
        padding-bottom: 8px;
      }

      .table-container {
        overflow-x: auto;
      }

      .financial-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
        background: white;
      }

      .financial-table th {
        background: #f3f4f6;
        border: 1px solid #d1d5db;
        padding: 8px;
        text-align: left;
        font-weight: 600;
        color: #374151;
        font-size: 10px;
      }

      .financial-table td {
        border: 1px solid #e5e7eb;
        padding: 8px;
        font-size: 10px;
        color: #1f2937;
      }

      .financial-table tr:nth-child(even) {
        background: #f9fafb;
      }

      .currency {
        text-align: right;
        font-weight: 500;
      }

      .percentage {
        text-align: right;
        font-weight: 500;
      }

      /* Section Styles */
      .section {
        margin-bottom: 30px;
        page-break-inside: avoid;
      }

      .section h3 {
        font-size: 18px;
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 16px;
        border-bottom: 2px solid #e5e7eb;
        padding-bottom: 8px;
      }

      /* Footer */
      .footer {
        margin-top: 30px;
        padding: 16px;
        background: #f3f4f6;
        border-top: 1px solid #d1d5db;
        text-align: center;
      }

      .footer-content p {
        color: #6b7280;
        font-size: 9px;
        margin-bottom: 3px;
      }

      /* Print optimizations */
      @media print {
        .executive-summary,
        .charts-section,
        .financial-data-section {
          page-break-inside: avoid;
        }

        .financial-table {
          page-break-inside: auto;
        }

        .financial-table tr {
          page-break-inside: avoid;
          page-break-after: auto;
        }
      }
    `;
  }

  /**
   * Generate PDF from HTML
   */
  private generatePdf(html: string): Observable<Blob> {
    const formData = new FormData();
    formData.append('html', html);
    formData.append('options', JSON.stringify({
      format: 'A4',
      margin: { top: '0.3cm', right: '0.8cm', bottom: '0.3cm', left: '0.8cm' },
      printBackground: true,
      preferCSSPageSize: true,
      landscape: false
    }));

    return this.http.post(this.PDF_ENDPOINT, formData, {
      responseType: 'blob'
    });
  }

  /**
   * Download PDF blob
   */
  private downloadPdf(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Helper methods
   */
  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  }

  private getDefaultTitle(reportType?: string): string {
    switch (reportType) {
      case 'bank-statements': return 'Bank Statements Report';
      case 'metrics': return 'Metrics Report';
      case 'complete': return 'Complete Financial Dashboard Report';
      default: return 'Financial Report';
    }
  }

  private getFilename(company: ICompany, options: FinancialExportOptions): string {
    const sanitizedCompanyName = company.name.replace(/[^a-zA-Z0-9]/g, '_');
    const reportType = options.reportType || 'financial';
    const timestamp = new Date().toISOString().split('T')[0];
    return `${sanitizedCompanyName}_${reportType}_report_${timestamp}.pdf`;
  }
}
