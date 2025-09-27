import { Injectable } from '@angular/core';
import { ICompany } from '../models/simple.schema';
import { ICompanyFinancials } from './company-financials.service';

@Injectable({
  providedIn: 'root'
})
export class PdfExportService {

  constructor() { }

  /**
   * Generate HTML for bank statement PDF with professional styling
   */
  generateBankStatementHtml(company: ICompany, records: ICompanyFinancials[]): string {
    const reportDate = new Date().toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const totalTurnover = records.reduce((sum, r) => sum + (Number(r.turnover) || 0), 0);
    const averageMonthly = totalTurnover / Math.max(records.length, 1);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Bank Statement Report - ${company.name}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          body {
            font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
            font-size: 12px;
            color: #1f2937;
            line-height: 1.4;
            background: white;
          }

          .document {
            max-width: 800px;
            margin: 0 auto;
            background: white;
          }

          .header {
            background: linear-gradient(135deg, #1e40af 0%, #3730a3 100%);
            color: white;
            padding: 15px 30px;
            text-align: center;
          }

          .header h1 {
            font-size: 22px;
            font-weight: 700;
            margin-bottom: 6px;
            letter-spacing: -0.025em;
          }

          .header h2 {
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 8px;
            opacity: 0.9;
          }

          .header-info {
            font-size: 12px;
            opacity: 0.8;
            font-weight: 300;
          }

          .company-info {
            background: #f8fafc;
            border: 1px solid #e5e7eb;
            padding: 15px 30px;
          }          .company-info h3 {
            color: #1f2937;
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #3b82f6;
          }

          .company-details {
            display: table;
            width: 100%;
          }

          .company-row {
            display: table-row;
          }

          .company-cell {
            display: table-cell;
            padding: 4px 15px 4px 0;
            vertical-align: top;
            font-size: 11px;
          }

          .company-cell.label {
            font-weight: 600;
            color: #374151;
            width: 140px;
          }

          .company-cell.value {
            color: #1f2937;
          }

          .content {
            padding: 15px 30px;
          }

          .summary-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }

          .summary-table td {
            width: 33.33%;
            text-align: center;
            padding: 25px 15px;
            border: none;
            position: relative;
          }

          .summary-card-blue {
            background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
            color: white;
            border-right: 1px solid rgba(255, 255, 255, 0.2);
          }

          .summary-card-green {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            border-right: 1px solid rgba(255, 255, 255, 0.2);
          }

          .summary-card-purple {
            background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
            color: white;
          }

          .summary-label {
            font-size: 11px;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 10px;
            opacity: 0.9;
            display: block;
          }

          .summary-value {
            font-size: 20px;
            font-weight: 700;
            letter-spacing: -0.025em;
            display: block;
          }

          .section-title {
            color: #1f2937;
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #3b82f6;
          }

          .data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            overflow: hidden;
          }

          .data-table th {
            background: #f3f4f6;
            color: #374151;
            font-weight: 600;
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid #d1d5db;
          }

          .data-table td {
            padding: 10px 15px;
            border-bottom: 1px solid #f3f4f6;
          }

          .data-table tbody tr:nth-child(even) {
            background: #f9fafb;
          }

          .currency {
            text-align: right;
            font-weight: 500;
            color: #059669;
          }

          .quarter-badge {
            background: #dbeafe;
            color: #1e40af;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: 500;
          }

          .total-row {
            background: #1e40af !important;
          }

          .total-row td {
            padding: 15px !important;
            font-size: 12px !important;
            border: none !important;
            color: white !important;
            font-weight: 700 !important;
          }

          .total-row .currency {
            color: white !important;
          }

          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 10px;
          }

          .footer p {
            margin-bottom: 4px;
          }

          @media print {
            body { background: white; }
            .document { box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <div class="document">
          <div class="header">
            <h1>${company.name}</h1>
            <h2>Bank Statement Report</h2>
            <div class="header-info">
              Generated on ${reportDate} | Company ID: ${company.id}
            </div>
          </div>

          <div class="company-info">
            <h3>Company Information</h3>
            <div class="company-details">
              <div class="company-row">
                <div class="company-cell label">Registration Number:</div>
                <div class="company-cell value">${company.registration_no || 'N/A'}</div>
                <div class="company-cell label">Contact Person:</div>
                <div class="company-cell value">${company.contact_person || 'N/A'}</div>
              </div>
              <div class="company-row">
                <div class="company-cell label">Sector:</div>
                <div class="company-cell value">${company.sector_name || 'N/A'}</div>
                <div class="company-cell label">Location:</div>
                <div class="company-cell value">${company.business_location || 'N/A'}</div>
              </div>
              <div class="company-row">
                <div class="company-cell label">BBBEE Level:</div>
                <div class="company-cell value">${company.bbbee_level || 'N/A'}</div>
                <div class="company-cell label">Contact Number:</div>
                <div class="company-cell value">${company.contact_number || 'N/A'}</div>
              </div>
              <div class="company-row">
                <div class="company-cell label">Service Offering:</div>
                <div class="company-cell value">${company.service_offering || 'N/A'}</div>
                <div class="company-cell label">Email:</div>
                <div class="company-cell value">${company.email_address || 'N/A'}</div>
              </div>
            </div>
          </div>

          <div class="content">
            <table class="summary-table">
              <tr>
                <td class="summary-card-blue">
                  <div class="summary-label">Total Records</div>
                  <div class="summary-value">${records.length}</div>
                </td>
                <td class="summary-card-green">
                  <div class="summary-label">Total Turnover</div>
                  <div class="summary-value">${this.formatCurrency(totalTurnover)}</div>
                </td>
                <td class="summary-card-purple">
                  <div class="summary-label">Average Monthly</div>
                  <div class="summary-value">${this.formatCurrency(averageMonthly)}</div>
                </td>
              </tr>
            </table>

            <div class="section-title">Monthly Turnover Data</div>            <table class="data-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Quarter</th>
                  <th>Monthly Turnover</th>
                </tr>
              </thead>
              <tbody>
                ${records.map(record => `
                  <tr>
                    <td><strong>${this.getMonthName(record.month)} ${record.year}</strong></td>
                    <td><span class="quarter-badge">${record.quarter_label || `Q${record.quarter}`}</span></td>
                    <td class="currency">${this.formatCurrency(Number(record.turnover) || 0)}</td>
                  </tr>
                `).join('')}
                <tr class="total-row">
                  <td><strong>TOTAL</strong></td>
                  <td><strong>—</strong></td>
                  <td class="currency"><strong>${this.formatCurrency(totalTurnover)}</strong></td>
                </tr>
              </tbody>
            </table>

            <div class="footer">
              <p><strong>This bank statement report was generated from verified business data.</strong></p>
              <p>Generated on ${reportDate} | Business Incubator System</p>
              <p>Confidential Document - For Business Use Only</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Format currency value
   */
  private formatCurrency(value: number): string {
    if (isNaN(value) || value === 0) return 'R 0';
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  /**
   * Get month name from number
   */
  private getMonthName(month: number): string {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return monthNames[month - 1] || 'Unknown';
  }
}
