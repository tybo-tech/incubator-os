import { Injectable } from '@angular/core';
import { PdfService } from './pdf.service';

export interface InvoiceData {
  number: string;
  date: string;
  dueDate: string;
  client: {
    name: string;
    address?: string;
    email?: string;
  };
  company: {
    name: string;
    address?: string;
    email?: string;
    phone?: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  subtotal: number;
  tax?: number;
  total: number;
  notes?: string;
}

export interface ReportData {
  title: string;
  subtitle?: string;
  date: string;
  sections: Array<{
    title: string;
    content: string;
    data?: any[];
  }>;
  footer?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PdfTemplateService {

  constructor(private pdfService: PdfService) {}

  /**
   * Generate and download an invoice PDF
   * @param invoiceData Invoice data
   * @param filename Optional filename
   */
  generateInvoice(invoiceData: InvoiceData, filename?: string): void {
    const html = this.createInvoiceTemplate(invoiceData);
    const pdfFilename = filename || `invoice-${invoiceData.number}.pdf`;
    this.pdfService.downloadPdf(html, pdfFilename);
  }

  /**
   * Generate and download a report PDF
   * @param reportData Report data
   * @param filename Optional filename
   */
  generateReport(reportData: ReportData, filename?: string): void {
    const html = this.createReportTemplate(reportData);
    const pdfFilename = filename || `report-${reportData.date}.pdf`;
    this.pdfService.downloadPdf(html, pdfFilename);
  }

  /**
   * Generate a company financial summary PDF
   * @param companyData Company financial data
   * @param filename Optional filename
   */
  generateFinancialSummary(companyData: any, filename?: string): void {
    const html = this.createFinancialSummaryTemplate(companyData);
    const pdfFilename = filename || `financial-summary-${companyData.name?.replace(/\s+/g, '-').toLowerCase()}.pdf`;
    this.pdfService.downloadPdf(html, pdfFilename);
  }

  /**
   * Create invoice HTML template
   * @param data Invoice data
   * @returns HTML string
   */
  private createInvoiceTemplate(data: InvoiceData): string {
    const itemsHtml = data.items.map(item => `
      <tr>
        <td>${item.description}</td>
        <td style="text-align: center;">${item.quantity}</td>
        <td style="text-align: right;">$${item.rate.toFixed(2)}</td>
        <td style="text-align: right;">$${item.amount.toFixed(2)}</td>
      </tr>
    `).join('');

    const content = `
      <div class="header">
        <h1>INVOICE</h1>
        <h2>Invoice #${data.number}</h2>
      </div>

      <div style="display: flex; justify-content: space-between; margin: 30px 0;">
        <div style="width: 48%;">
          <h3>From:</h3>
          <p><strong>${data.company.name}</strong></p>
          ${data.company.address ? `<p>${data.company.address}</p>` : ''}
          ${data.company.email ? `<p>Email: ${data.company.email}</p>` : ''}
          ${data.company.phone ? `<p>Phone: ${data.company.phone}</p>` : ''}
        </div>
        <div style="width: 48%;">
          <h3>To:</h3>
          <p><strong>${data.client.name}</strong></p>
          ${data.client.address ? `<p>${data.client.address}</p>` : ''}
          ${data.client.email ? `<p>Email: ${data.client.email}</p>` : ''}
        </div>
      </div>

      <div style="margin: 20px 0;">
        <p><strong>Invoice Date:</strong> ${data.date}</p>
        <p><strong>Due Date:</strong> ${data.dueDate}</p>
      </div>

      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Rate</th>
            <th style="text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div style="margin-top: 20px; text-align: right;">
        <table style="width: 300px; margin-left: auto;">
          <tr>
            <td><strong>Subtotal:</strong></td>
            <td style="text-align: right;">$${data.subtotal.toFixed(2)}</td>
          </tr>
          ${data.tax ? `
            <tr>
              <td><strong>Tax:</strong></td>
              <td style="text-align: right;">$${data.tax.toFixed(2)}</td>
            </tr>
          ` : ''}
          <tr style="background-color: #e8f4f8; font-weight: bold;">
            <td><strong>Total:</strong></td>
            <td style="text-align: right;">$${data.total.toFixed(2)}</td>
          </tr>
        </table>
      </div>

      ${data.notes ? `
        <div style="margin-top: 40px;">
          <h3>Notes:</h3>
          <p>${data.notes}</p>
        </div>
      ` : ''}

      <div class="footer">
        <p>Thank you for your business!</p>
      </div>
    `;

    return this.pdfService.createHtmlTemplate(content, `Invoice ${data.number}`);
  }

  /**
   * Create report HTML template
   * @param data Report data
   * @returns HTML string
   */
  private createReportTemplate(data: ReportData): string {
    const sectionsHtml = data.sections.map(section => {
      let sectionHtml = `
        <div style="margin: 30px 0;">
          <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
            ${section.title}
          </h2>
          <div style="margin: 15px 0;">
            ${section.content}
          </div>
      `;

      if (section.data && section.data.length > 0) {
        const headers = Object.keys(section.data[0]);
        const tableRows = section.data.map(row => `
          <tr>
            ${headers.map(header => `<td>${row[header] || ''}</td>`).join('')}
          </tr>
        `).join('');

        sectionHtml += `
          <table style="margin-top: 20px;">
            <thead>
              <tr>
                ${headers.map(header => `<th>${header}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        `;
      }

      sectionHtml += '</div>';
      return sectionHtml;
    }).join('');

    const content = `
      <div class="header">
        <h1>${data.title}</h1>
        ${data.subtitle ? `<h2 style="color: #666;">${data.subtitle}</h2>` : ''}
        <p style="color: #888;">Generated on ${data.date}</p>
      </div>

      <div class="content">
        ${sectionsHtml}
      </div>

      ${data.footer ? `
        <div class="footer">
          <p>${data.footer}</p>
        </div>
      ` : ''}
    `;

    return this.pdfService.createHtmlTemplate(content, data.title);
  }

  /**
   * Create financial summary HTML template
   * @param data Company financial data
   * @returns HTML string
   */
  private createFinancialSummaryTemplate(data: any): string {
    const content = `
      <div class="header">
        <h1>Financial Summary</h1>
        <h2>${data.name || 'Company Name'}</h2>
        <p style="color: #666;">Period: ${data.period || 'Current Year'}</p>
      </div>

      <div class="content">
        <div style="margin: 30px 0;">
          <h2 style="color: #2c3e50;">Key Financial Metrics</h2>
          <table>
            <tr>
              <td><strong>Revenue</strong></td>
              <td style="text-align: right;">$${(data.revenue || 0).toLocaleString()}</td>
            </tr>
            <tr>
              <td><strong>Expenses</strong></td>
              <td style="text-align: right;">$${(data.expenses || 0).toLocaleString()}</td>
            </tr>
            <tr style="background-color: #e8f4f8;">
              <td><strong>Net Income</strong></td>
              <td style="text-align: right;"><strong>$${((data.revenue || 0) - (data.expenses || 0)).toLocaleString()}</strong></td>
            </tr>
          </table>
        </div>

        ${data.assets ? `
          <div style="margin: 30px 0;">
            <h2 style="color: #2c3e50;">Assets</h2>
            <table>
              <tr>
                <td><strong>Current Assets</strong></td>
                <td style="text-align: right;">$${(data.assets.current || 0).toLocaleString()}</td>
              </tr>
              <tr>
                <td><strong>Fixed Assets</strong></td>
                <td style="text-align: right;">$${(data.assets.fixed || 0).toLocaleString()}</td>
              </tr>
              <tr style="background-color: #e8f4f8;">
                <td><strong>Total Assets</strong></td>
                <td style="text-align: right;"><strong>$${((data.assets.current || 0) + (data.assets.fixed || 0)).toLocaleString()}</strong></td>
              </tr>
            </table>
          </div>
        ` : ''}

        ${data.liabilities ? `
          <div style="margin: 30px 0;">
            <h2 style="color: #2c3e50;">Liabilities</h2>
            <table>
              <tr>
                <td><strong>Current Liabilities</strong></td>
                <td style="text-align: right;">$${(data.liabilities.current || 0).toLocaleString()}</td>
              </tr>
              <tr>
                <td><strong>Long-term Liabilities</strong></td>
                <td style="text-align: right;">$${(data.liabilities.longTerm || 0).toLocaleString()}</td>
              </tr>
              <tr style="background-color: #e8f4f8;">
                <td><strong>Total Liabilities</strong></td>
                <td style="text-align: right;"><strong>$${((data.liabilities.current || 0) + (data.liabilities.longTerm || 0)).toLocaleString()}</strong></td>
              </tr>
            </table>
          </div>
        ` : ''}
      </div>

      <div class="footer">
        <p>Generated by Incubator OS Financial System</p>
        <p>Report Date: ${new Date().toLocaleDateString()}</p>
      </div>
    `;

    return this.pdfService.createHtmlTemplate(content, `Financial Summary - ${data.name || 'Company'}`);
  }
}
