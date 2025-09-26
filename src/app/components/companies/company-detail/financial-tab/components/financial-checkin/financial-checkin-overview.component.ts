import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ICompany } from '../../../../../../../models/simple.schema';
import { CompanyFinancialsService, ICompanyFinancials } from '../../../../../../../services/company-financials.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-financial-checkin-overview',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-lg shadow-sm border border-gray-200">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div class="flex justify-between items-center">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">Bank Statement</h3>
            <p class="text-sm text-gray-600 mt-1">Monthly turnover tracking</p>
          </div>

          <!-- Year Selector -->
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
              <label class="text-sm font-medium text-gray-700">Year:</label>
              <select
                [(ngModel)]="selectedYear"
                (change)="onYearChange()"
                class="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="all">All Years</option>
                <option *ngFor="let year of availableYears" [value]="year">{{ year }}</option>
              </select>
            </div>

            <div class="flex gap-2">
              <button
                (click)="exportBankStatement()"
                [disabled]="isExporting || monthlyRecords.length === 0"
                class="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center">
                <i *ngIf="!isExporting" class="fas fa-file-invoice-dollar mr-2"></i>
                <svg *ngIf="isExporting" class="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isExporting ? 'Exporting...' : 'Export Bank Statement' }}
              </button>
              <button
                (click)="addNewMonth()"
                class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors">
                Add Month
              </button>
              <button
                (click)="onViewTrends()"
                class="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded hover:bg-gray-700 transition-colors">
                View Trends
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Financial Data Table -->
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {{ selectedYear === 'all' ? 'Period' : 'Month' }}
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quarter</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Turnover</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr *ngFor="let record of monthlyRecords; trackBy: trackByRecord">
              <!-- Month/Period -->
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm font-medium text-gray-900">
                  {{ selectedYear === 'all' ? (getMonthName(record.month) + ' ' + record.year) : getMonthName(record.month) }}
                </span>
              </td>

              <!-- Quarter -->
              <td class="px-6 py-4 whitespace-nowrap">
                <select
                  [(ngModel)]="record.quarter"
                  (change)="updateQuarter(record)"
                  class="px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="1">Q1</option>
                  <option value="2">Q2</option>
                  <option value="3">Q3</option>
                  <option value="4">Q4</option>
                </select>
              </td>

              <!-- Turnover -->
              <td class="px-6 py-4 whitespace-nowrap">
                <input
                  type="number"
                  [(ngModel)]="record.turnover"
                  (blur)="updateRecord(record)"
                  class="w-32 px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                  step="0.01" />
              </td>

              <!-- Actions -->
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                <button
                  (click)="deleteRecord(record)"
                  class="text-red-600 hover:text-red-900 transition-colors">
                  🗑️
                </button>
              </td>
            </tr>
          </tbody>

          <!-- Totals Row -->
          <tfoot class="bg-gray-50 border-t-2 border-gray-300">
            <tr>
              <td class="px-6 py-3 text-sm font-bold text-gray-900">TOTAL</td>
              <td class="px-6 py-3 text-sm font-bold text-gray-900">-</td>
              <td class="px-6 py-3 text-sm font-bold text-gray-900">{{ formatCurrency(getTotalTurnover()) }}</td>
              <td class="px-6 py-3 text-sm font-bold text-gray-900">-</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Empty State -->
      <div *ngIf="monthlyRecords.length === 0" class="px-6 py-12 text-center">
        <div class="text-gray-400 text-4xl mb-4">🏦</div>
        <h3 class="text-sm font-medium text-gray-900 mb-2">
          No Bank Statement Data{{ selectedYear === 'all' ? '' : ' for ' + selectedYear }}
        </h3>
        <p class="text-sm text-gray-500 mb-4">Start by adding your first monthly turnover record.</p>
        <button
          (click)="addNewMonth()"
          class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors">
          Add Monthly Turnover
        </button>
      </div>
    </div>
  `,
})
export class FinancialCheckinOverviewComponent implements OnInit {
  @Input() company!: ICompany;
  @Output() recordUpdated = new EventEmitter<ICompanyFinancials>();
  @Output() recordDeleted = new EventEmitter<number>();
  @Output() addMonthRequested = new EventEmitter<{ month: number; year: number }>();

  // Legacy events for compatibility with parent component
  @Output() onNewCheckInClick = new EventEmitter<void>();
  @Output() onViewTrendsClick = new EventEmitter<void>();
  @Output() onEditCheckIn = new EventEmitter<ICompanyFinancials>();

  financials: ICompanyFinancials[] = [];
  loading = false;
  error: string | null = null;

  selectedYear: string | number = 'all';

  readonly monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Export state
  isExporting = false;

  constructor(
    private financialService: CompanyFinancialsService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.loadFinancials();
  }

  get availableYears(): number[] {
    const years = new Set(this.financials.map(f => f.year));
    const yearArray = Array.from(years).sort((a, b) => b - a);

    // Ensure current year is always available
    const selectedYearNum = Number(this.selectedYear);
    if (!yearArray.includes(selectedYearNum)) {
      yearArray.unshift(selectedYearNum);
      yearArray.sort((a, b) => b - a);
    }

    return yearArray;
  }

  get monthlyRecords(): ICompanyFinancials[] {
    if (this.selectedYear === 'all') {
      // Return all records sorted by year (descending) then month (ascending)
      return this.financials
        .filter(f => Number(f.turnover) > 0) // Only show records with actual data
        .sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year; // Sort years descending (newest first)
          return a.month - b.month; // Sort months ascending within each year
        });
    }

    // Get records for selected year, sorted by month
    const selectedYearNum = Number(this.selectedYear);
    const yearRecords = this.financials
      .filter(f => f.year === selectedYearNum)
      .sort((a, b) => a.month - b.month);

    // Create placeholder records for missing months
    const completeRecords: ICompanyFinancials[] = [];
    for (let month = 1; month <= 12; month++) {
      const existingRecord = yearRecords.find(r => r.month === month);
      if (existingRecord) {
        completeRecords.push(existingRecord);
      } else {
        // Create placeholder record
        const selectedYearNum = Number(this.selectedYear);
        completeRecords.push({
          id: 0, // Temporary ID for new records
          company_id: this.company.id,
          period_date: `${selectedYearNum}-${month.toString().padStart(2, '0')}-01`,
          year: selectedYearNum,
          month: month,
          quarter: Math.ceil(month / 3),
          quarter_label: `Q${Math.ceil(month / 3)}`,
          is_pre_ignition: false,
          turnover_monthly_avg: null,
          turnover: null,
          cost_of_sales: null,
          business_expenses: null,
          gross_profit: null,
          net_profit: null,
          gp_margin: null,
          np_margin: null,
          cash_on_hand: null,
          debtors: null,
          creditors: null,
          inventory_on_hand: null,
          working_capital_ratio: null,
          net_assets: null,
          notes: null,
          created_at: '',
          updated_at: ''
        });
      }
    }

    return completeRecords;
  }

  trackByRecord(index: number, record: ICompanyFinancials): number {
    return record.id || index;
  }

  async loadFinancials() {
    if (!this.company?.id) {
      return;
    }

    this.loading = true;
    this.error = null;

    try {
      const data = await this.financialService
        .listAllCompanyFinancials(this.company.id)
        .toPromise();

      this.financials = data || [];

    } catch (error) {
      console.error('Error loading financials:', error);
      this.error = 'Failed to load financial data. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  onYearChange() {
    // Year selector changed - data will be filtered automatically by monthlyRecords getter
  }

  getMonthName(month: number): string {
    return this.monthNames[month - 1] || 'Unknown';
  }

  getRecordsForSelectedYear(): number {
    if (this.selectedYear === 'all') {
      return this.financials.filter(f => Number(f.turnover) > 0).length;
    }
    const selectedYearNum = Number(this.selectedYear);
    return this.financials.filter(f => f.year === selectedYearNum).length;
  }

  async updateRecord(record: ICompanyFinancials): Promise<void> {
    // Set turnover_monthly_avg same as turnover for bank statement
    record.turnover_monthly_avg = record.turnover;

    try {
      if (record.id === 0) {
        // New record - create it
        const newRecord = await this.financialService.addCompanyFinancials(record).toPromise();
        if (newRecord) {
          // Update the record with the new ID and refresh data
          this.loadFinancials();
        }
      } else {
        // Existing record - update it
        await this.financialService.updateCompanyFinancials(record.id, record).toPromise();
        this.recordUpdated.emit(record);
      }
    } catch (error) {
      console.error('Error updating record:', error);
      alert('Failed to save changes. Please try again.');
    }
  }

  async updateQuarter(record: ICompanyFinancials): Promise<void> {
    // Update the quarter_label based on the selected quarter
    record.quarter_label = `Q${record.quarter}`;

    try {
      if (record.id === 0) {
        // New record - create it
        const newRecord = await this.financialService.addCompanyFinancials(record).toPromise();
        if (newRecord) {
          // Update the record with the new ID and refresh data
          this.loadFinancials();
        }
      } else {
        // Existing record - update it
        await this.financialService.updateCompanyFinancials(record.id, record).toPromise();
        this.recordUpdated.emit(record);
      }
    } catch (error) {
      console.error('Error updating quarter:', error);
      alert('Failed to save quarter changes. Please try again.');
    }
  }

  async deleteRecord(record: ICompanyFinancials): Promise<void> {
    if (record.id === 0) {
      // It's a placeholder record, just refresh to remove the values
      this.loadFinancials();
      return;
    }

    if (confirm(`Delete ${this.getMonthName(record.month)} ${record.year} data?`)) {
      try {
        await this.financialService.deleteCompanyFinancials(record.id).toPromise();
        this.recordDeleted.emit(record.id);
        this.loadFinancials();
      } catch (error) {
        console.error('Error deleting record:', error);
        alert('Failed to delete record. Please try again.');
      }
    }
  }

  addNewMonth(): void {
    if (this.selectedYear === 'all') {
      // When viewing all years, default to current year for new entry
      const currentYear = new Date().getFullYear();
      this.selectedYear = currentYear;
      return; // Let the user see the current year view first
    }

    // Find the first month without data in the selected year
    const selectedYearNum = Number(this.selectedYear);
    const existingMonths = this.financials
      .filter(f => f.year === selectedYearNum)
      .map(f => f.month);

    let targetMonth = 1;
    for (let month = 1; month <= 12; month++) {
      if (!existingMonths.includes(month)) {
        targetMonth = month;
        break;
      }
    }

    this.addMonthRequested.emit({
      month: targetMonth,
      year: Number(this.selectedYear)
    });
  }

  // Total calculation method
  getTotalTurnover(): number {
    return this.monthlyRecords.reduce((sum, r) => {
      const turnover = Number(r.turnover) || 0;
      return sum + turnover;
    }, 0);
  }

  formatCurrency(value: number): string {
    if (isNaN(value) || value === 0) return '-';
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  // Public method to refresh data from parent component
  public refreshData() {
    this.loadFinancials();
  }

  // Legacy methods for compatibility with parent component
  onNewCheckIn() {
    this.onNewCheckInClick.emit();
  }

  onViewTrends() {
    this.onViewTrendsClick.emit();
  }

  // Since we have inline editing, we don't really "edit" records anymore
  // But if needed, this could emit when clicking on a record
  onEditRecord(record: ICompanyFinancials) {
    this.onEditCheckIn.emit(record);
  }

  /**
   * Export bank statement as PDF
   */
  exportBankStatement(): void {
    if (this.isExporting || this.monthlyRecords.length === 0) return;

    this.isExporting = true;

    // Filter records with actual data
    const validRecords = this.monthlyRecords.filter(record =>
      record.id > 0 && (record.turnover !== null && Number(record.turnover) > 0)
    );

    // Generate simple HTML for the bank statement
    const html = this.generateBankStatementHtml(validRecords);

    // Send to PDF service
    const formData = new FormData();
    formData.append('html', html);
    formData.append('options', JSON.stringify({
      format: 'A4',
      margin: { top: '0.5cm', right: '1cm', bottom: '0.5cm', left: '1cm' },
      printBackground: true,
      preferCSSPageSize: true
    }));

    this.http.post('https://docs.tybo.co.za/pdf.php', formData, {
      responseType: 'blob'
    }).subscribe({
      next: (blob: Blob) => {
        // Download the PDF
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const filename = `${this.company.name.replace(/[^a-zA-Z0-9]/g, '_')}_Bank_Statement_${new Date().toISOString().split('T')[0]}.pdf`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        console.log('Bank statement export completed successfully');
        this.isExporting = false;
      },
      error: (error: any) => {
        console.error('Export failed:', error);
        alert('Export failed. Please try again.');
        this.isExporting = false;
      }
    });
  }

  /**
   * Generate HTML for bank statement PDF
   */
  private generateBankStatementHtml(records: ICompanyFinancials[]): string {
    const reportDate = new Date().toLocaleDateString();
    const totalTurnover = records.reduce((sum, r) => sum + (Number(r.turnover) || 0), 0);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Bank Statement Report - ${this.company.name}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            font-size: 12px;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 20px;
          }
          .header h1 {
            color: #1f2937;
            margin: 0 0 10px 0;
            font-size: 24px;
          }
          .header h2 {
            color: #2563eb;
            margin: 0 0 15px 0;
            font-size: 18px;
          }
          .company-info {
            color: #6b7280;
            margin-bottom: 10px;
          }
          .summary {
            background: #f8fafc;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
          }
          .summary h3 {
            margin: 0 0 15px 0;
            color: #1f2937;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
          }
          .summary-card {
            text-align: center;
            padding: 15px;
            background: white;
            border-radius: 6px;
            border: 1px solid #d1d5db;
          }
          .summary-card .label {
            color: #6b7280;
            font-size: 11px;
            margin-bottom: 5px;
          }
          .summary-card .value {
            color: #1f2937;
            font-size: 16px;
            font-weight: bold;
          }
          .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            background: white;
          }
          .data-table th, .data-table td {
            border: 1px solid #d1d5db;
            padding: 12px 8px;
            text-align: left;
          }
          .data-table th {
            background: #f3f4f6;
            color: #374151;
            font-weight: 600;
            font-size: 11px;
          }
          .data-table td {
            font-size: 11px;
          }
          .currency {
            text-align: right;
            font-weight: 500;
          }
          .total-row {
            background: #f9fafb;
            border-top: 2px solid #374151;
          }
          .total-row td {
            font-weight: bold;
            color: #1f2937;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            color: #6b7280;
            font-size: 10px;
            border-top: 1px solid #e5e7eb;
            padding-top: 15px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${this.company.name}</h1>
          <h2>Bank Statement Report</h2>
          <div class="company-info">
            Generated on ${reportDate} | Company ID: ${this.company.id}
          </div>
        </div>

        <div class="summary">
          <h3>📊 Summary</h3>
          <div class="summary-grid">
            <div class="summary-card">
              <div class="label">Total Records</div>
              <div class="value">${records.length}</div>
            </div>
            <div class="summary-card">
              <div class="label">Total Turnover</div>
              <div class="value">${this.formatCurrency(totalTurnover)}</div>
            </div>
            <div class="summary-card">
              <div class="label">Average Monthly</div>
              <div class="value">${this.formatCurrency(totalTurnover / Math.max(records.length, 1))}</div>
            </div>
          </div>
        </div>

        <h3>💼 Monthly Turnover Data</h3>
        <table class="data-table">
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
                <td>${this.getMonthName(record.month)} ${record.year}</td>
                <td>${record.quarter_label || `Q${record.quarter}`}</td>
                <td class="currency">${this.formatCurrency(Number(record.turnover) || 0)}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td><strong>TOTAL</strong></td>
              <td>-</td>
              <td class="currency"><strong>${this.formatCurrency(totalTurnover)}</strong></td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <p>This bank statement report was generated from verified business data.</p>
          <p>Generated on ${reportDate} | Business Incubator System</p>
        </div>
      </body>
      </html>
    `;
  }
}
