import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { INode } from '../../../../../../models/schema';
import { Company, BankStatement } from '../../../../../../models/business.models';
import { FinancialCheckIn } from '../../../../../../models/busines.financial.checkin.models';
import html2pdf from 'html2pdf.js';

interface QuarterlyMetrics {
  quarter: string;
  year: number;
  turnover: number;
  grossProfit: number;
  netProfit: number;
  averageMargin: number;
  cashPosition: number;
  checkInsCount: number;
  hasData: boolean;
}

interface ExportOptions {
  includeCheckIns: boolean;
  includeBankStatements: boolean;
  includeVarianceAnalysis: boolean;
}

@Component({
  selector: 'app-financial-checkin-pdf-export-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="showModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 shadow-lg rounded-md bg-white max-h-screen overflow-y-auto">
        <div class="mt-3">
          <!-- Modal Header (Sticky) -->
          <div class="flex justify-between items-center mb-6 sticky top-0 bg-white z-10 pb-4 border-b">
            <div class="flex items-center">
              <i class="fas fa-file-pdf text-red-600 mr-2"></i>
              <h3 class="text-lg font-medium text-gray-900">Business Financial Report Preview</h3>
            </div>
            <div class="flex space-x-3">
              <!-- Export Options -->
              <div class="flex items-center space-x-4 mr-4">
                <label class="flex items-center text-sm">
                  <input type="checkbox" [(ngModel)]="exportOptions.includeCheckIns" class="mr-2">
                  <span class="text-blue-600 font-medium">Financial Check-ins</span>
                </label>
                <label class="flex items-center text-sm">
                  <input type="checkbox" [(ngModel)]="exportOptions.includeBankStatements" class="mr-2">
                  <span class="text-gray-600">Bank Validation</span>
                </label>
                <label class="flex items-center text-sm">
                  <input type="checkbox" [(ngModel)]="exportOptions.includeVarianceAnalysis" class="mr-2">
                  <span class="text-orange-600">Variance Analysis</span>
                </label>
              </div>

              <button (click)="generatePDF()"
                      [disabled]="isGenerating || (!exportOptions.includeCheckIns && !exportOptions.includeBankStatements)"
                      class="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 transition-colors disabled:opacity-50">
                <span *ngIf="isGenerating" class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                <i *ngIf="!isGenerating" class="fas fa-download mr-1"></i>
                {{ isGenerating ? 'Generating...' : 'Download PDF' }}
              </button>
              <button (click)="closeModal()"
                      class="text-gray-400 hover:text-gray-600">
                <i class="fas fa-times text-xl"></i>
              </button>
            </div>
          </div>

          <!-- PDF Preview Content (Optimized for PDF capture) -->
          <div id="pdf-content" style="border: 1px solid #e5e7eb; background-color: white; padding: 2rem; width: 100%;">
            <!-- Company Header -->
            <div style="text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 1.5rem; margin-bottom: 2rem;">
              <div style="width: 4rem; height: 4rem; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 0.5rem; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.5rem;">
                {{ company.data.name.charAt(0) }}
              </div>
              <h1 style="font-size: 1.8rem; font-weight: bold; color: #111827; margin-bottom: 0.5rem;">{{ company.data.name }}</h1>
              <p style="color: #3b82f6; font-size: 1.1rem; font-weight: 500;">Business Financial Report</p>
              <p style="font-size: 0.875rem; color: #6b7280; margin-top: 0.5rem;">Generated on {{ currentDate | date:'fullDate' }}</p>
              <div style="background: linear-gradient(90deg, #dbeafe, #ede9fe); padding: 0.75rem; border-radius: 0.5rem; margin-top: 1rem;">
                <p style="font-size: 0.875rem; color: #1e40af; font-weight: 500;">
                  <i class="fas fa-shield-alt" style="margin-right: 0.5rem;"></i>
                  Primary Source: Advisor-verified Financial Check-ins
                </p>
              </div>
            </div>

            <!-- Company Information -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
              <div style="background-color: #f8fafc; padding: 1.5rem; border-radius: 0.5rem; border-left: 4px solid #3b82f6;">
                <h2 style="font-size: 1.125rem; font-weight: 600; color: #111827; margin-bottom: 1rem;">Company Information</h2>
                <div style="font-size: 0.875rem; line-height: 1.6;">
                  <div style="margin-bottom: 0.5rem;"><strong>Registration No:</strong> {{ company.data.registration_no }}</div>
                  <div style="margin-bottom: 0.5rem;"><strong>Industry:</strong> {{ company.data.industry }}</div>
                  <div style="margin-bottom: 0.5rem;"><strong>Contact Person:</strong> {{ company.data.contact_person || 'N/A' }}</div>
                  <div style="margin-bottom: 0.5rem;"><strong>Email:</strong> {{ company.data.email_address || 'N/A' }}</div>
                  <div style="margin-bottom: 0.5rem;"><strong>Phone:</strong> {{ company.data.contact_number || 'N/A' }}</div>
                </div>
              </div>

              <div style="background-color: #f0fdf4; padding: 1.5rem; border-radius: 0.5rem; border-left: 4px solid #10b981;">
                <h2 style="font-size: 1.125rem; font-weight: 600; color: #111827; margin-bottom: 1rem;">Compliance Status</h2>
                <div style="font-size: 0.875rem; line-height: 1.6;">
                  <div style="display: flex; align-items: center; margin-bottom: 0.5rem;">
                    <div style="width: 0.75rem; height: 0.75rem; border-radius: 50%; margin-right: 0.5rem; background-color: {{ company.data.compliance?.is_sars_registered ? '#10b981' : '#ef4444' }};"></div>
                    <span>SARS Registration</span>
                  </div>
                  <div style="display: flex; align-items: center; margin-bottom: 0.5rem;">
                    <div style="width: 0.75rem; height: 0.75rem; border-radius: 50%; margin-right: 0.5rem; background-color: {{ company.data.compliance?.has_tax_clearance ? '#10b981' : '#ef4444' }};"></div>
                    <span>Tax Clearance</span>
                  </div>
                  <div style="display: flex; align-items: center; margin-bottom: 0.5rem;">
                    <div style="width: 0.75rem; height: 0.75rem; border-radius: 50%; margin-right: 0.5rem; background-color: {{ company.data.compliance?.has_cipc_registration ? '#10b981' : '#ef4444' }};"></div>
                    <span>CIPC Registration</span>
                  </div>
                  <div style="margin-bottom: 0.5rem;"><strong>BBBEE Level:</strong> {{ company.data.bbbee_level || 'N/A' }}</div>
                </div>
              </div>
            </div>

            <!-- Financial Check-ins Section (Primary Source) -->
            <div *ngIf="exportOptions.includeCheckIns" style="margin-bottom: 2rem;">
              <div style="background: linear-gradient(90deg, #dbeafe, #ede9fe); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1.5rem;">
                <h2 style="font-size: 1.25rem; font-weight: 600; color: #1e40af; margin-bottom: 0.5rem; display: flex; align-items: center;">
                  <i class="fas fa-shield-alt" style="margin-right: 0.75rem;"></i>
                  Financial Check-ins Analysis (Primary Source)
                </h2>
                <p style="font-size: 0.875rem; color: #3730a3;">Advisor-verified business metrics and performance indicators</p>
              </div>

              <!-- Quarterly Performance Summary -->
              <div style="margin-bottom: 2rem;">
                <h3 style="font-size: 1.125rem; font-weight: 600; color: #111827; margin-bottom: 1rem;">Quarterly Performance Overview</h3>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
                  <div *ngFor="let quarter of quarterlyMetrics" style="background-color: {{ quarter.hasData ? '#f0fdf4' : '#f9fafb' }}; padding: 1rem; border-radius: 0.5rem; text-align: center; border: 1px solid {{ quarter.hasData ? '#86efac' : '#e5e7eb' }};">
                    <h4 style="font-weight: 600; color: #111827; margin-bottom: 0.5rem;">{{ quarter.quarter }} {{ quarter.year }}</h4>
                    <div *ngIf="quarter.hasData" style="font-size: 0.875rem;">
                      <div style="color: #059669; margin-bottom: 0.25rem; font-weight: 500;">
                        <i class="fas fa-chart-line" style="margin-right: 0.25rem;"></i>
                        Turnover: {{ formatCurrency(quarter.turnover) }}
                      </div>
                      <div style="color: #0369a1; margin-bottom: 0.25rem;">
                        <i class="fas fa-percentage" style="margin-right: 0.25rem;"></i>
                        NP Margin: {{ quarter.averageMargin | number:'1.1-1' }}%
                      </div>
                      <div style="color: #7c3aed; font-weight: 500; border-top: 1px solid #d1fae5; padding-top: 0.25rem;">
                        <i class="fas fa-university" style="margin-right: 0.25rem;"></i>
                        Cash: {{ formatCurrency(quarter.cashPosition) }}
                      </div>
                    </div>
                    <div *ngIf="!quarter.hasData" style="color: #6b7280; font-size: 0.75rem;">
                      No check-ins data
                    </div>
                  </div>
                </div>
              </div>

              <!-- Detailed Check-ins Table -->
              <div style="margin-bottom: 2rem;">
                <h3 style="font-size: 1.125rem; font-weight: 600; color: #111827; margin-bottom: 1rem;">Detailed Financial Check-ins</h3>

                <table style="width: 100%; font-size: 0.875rem; border-collapse: collapse; border: 1px solid #d1d5db;">
                  <thead>
                    <tr style="background-color: #f8fafc;">
                      <th style="border: 1px solid #d1d5db; padding: 0.75rem; text-align: left; font-weight: 600;">Period</th>
                      <th style="border: 1px solid #d1d5db; padding: 0.75rem; text-align: right; font-weight: 600;">Turnover</th>
                      <th style="border: 1px solid #d1d5db; padding: 0.75rem; text-align: right; font-weight: 600;">Gross Profit</th>
                      <th style="border: 1px solid #d1d5db; padding: 0.75rem; text-align: right; font-weight: 600;">Net Profit</th>
                      <th style="border: 1px solid #d1d5db; padding: 0.75rem; text-align: right; font-weight: 600;">NP Margin</th>
                      <th style="border: 1px solid #d1d5db; padding: 0.75rem; text-align: right; font-weight: 600;">Cash Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let checkIn of sortedCheckIns" style="border-bottom: 1px solid #e5e7eb;">
                      <td style="border: 1px solid #d1d5db; padding: 0.75rem; font-weight: 500;">
                        {{ formatCheckInPeriod(checkIn.data) }}
                      </td>
                      <td style="border: 1px solid #d1d5db; padding: 0.75rem; text-align: right; color: #059669; font-weight: 500;">
                        {{ formatCurrency(checkIn.data.turnover_monthly_avg || 0) }}
                      </td>
                      <td style="border: 1px solid #d1d5db; padding: 0.75rem; text-align: right; color: #0369a1;">
                        {{ formatCurrency(checkIn.data.gross_profit || 0) }}
                      </td>
                      <td style="border: 1px solid #d1d5db; padding: 0.75rem; text-align: right; color: {{ (checkIn.data.net_profit || 0) >= 0 ? '#059669' : '#dc2626' }}; font-weight: 500;">
                        {{ formatCurrency(checkIn.data.net_profit || 0) }}
                      </td>
                      <td style="border: 1px solid #d1d5db; padding: 0.75rem; text-align: right; color: {{ (checkIn.data.np_margin || 0) >= 0 ? '#059669' : '#dc2626' }}; font-weight: 500;">
                        {{ (checkIn.data.np_margin || 0) | number:'1.1-1' }}%
                      </td>
                      <td style="border: 1px solid #d1d5db; padding: 0.75rem; text-align: right; color: #7c3aed; font-weight: 500;">
                        {{ formatCurrency(checkIn.data.cash_on_hand || 0) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Business Insights (from latest check-in notes) -->
              <div *ngIf="latestNotes" style="background-color: #fefce8; border: 1px solid #fbbf24; border-radius: 0.5rem; padding: 1.5rem; margin-bottom: 2rem;">
                <h3 style="font-size: 1.125rem; font-weight: 600; color: #92400e; margin-bottom: 1rem;">
                  <i class="fas fa-lightbulb" style="margin-right: 0.5rem;"></i>
                  Latest Business Insights
                </h3>
                <p style="font-size: 0.875rem; color: #78350f; font-style: italic; line-height: 1.6;">"{{ latestNotes }}"</p>
              </div>
            </div>

            <!-- Variance Analysis Section (if enabled) -->
            <div *ngIf="exportOptions.includeVarianceAnalysis && hasVarianceData" style="margin-bottom: 2rem;">
              <div style="background: linear-gradient(90deg, #fed7aa, #fef3c7); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1.5rem;">
                <h2 style="font-size: 1.25rem; font-weight: 600; color: #c2410c; margin-bottom: 0.5rem; display: flex; align-items: center;">
                  <i class="fas fa-balance-scale" style="margin-right: 0.75rem;"></i>
                  Data Variance Analysis
                </h2>
                <p style="font-size: 0.875rem; color: #9a3412;">Cross-validation between Financial Check-ins and Bank Statements</p>
              </div>

              <!-- Variance Alert Summary -->
              <div style="background-color: #fef2f2; border: 1px solid #fca5a5; border-radius: 0.5rem; padding: 1rem; margin-bottom: 1.5rem;">
                <h3 style="color: #dc2626; font-weight: 600; margin-bottom: 0.5rem;">
                  <i class="fas fa-exclamation-triangle" style="margin-right: 0.5rem;"></i>
                  Variance Summary
                </h3>
                <p style="font-size: 0.875rem; color: #7f1d1d;">
                  {{ getVarianceSummary() }}
                </p>
              </div>
            </div>

            <!-- Bank Statements Section (Validation Layer) -->
            <div *ngIf="exportOptions.includeBankStatements" style="margin-bottom: 2rem;">
              <div style="background: linear-gradient(90deg, #f3f4f6, #e5e7eb); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1.5rem;">
                <h2 style="font-size: 1.25rem; font-weight: 600; color: #374151; margin-bottom: 0.5rem; display: flex; align-items: center;">
                  <i class="fas fa-university" style="margin-right: 0.75rem;"></i>
                  Bank Statements (Validation Layer)
                </h2>
                <p style="font-size: 0.875rem; color: #4b5563;">Transaction-level data for cross-validation and compliance</p>
              </div>

              <!-- Bank Statements Summary -->
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
                <div *ngFor="let quarter of ['Q1', 'Q2', 'Q3', 'Q4']" style="background-color: #f9fafb; padding: 1rem; border-radius: 0.5rem; text-align: center; border: 1px solid #e5e7eb;">
                  <h3 style="font-weight: 500; color: #111827; margin-bottom: 0.5rem;">{{ quarter }}</h3>
                  <div style="font-size: 0.875rem;">
                    <div style="color: #059669; margin-bottom: 0.25rem;">
                      <i class="fas fa-arrow-up" style="margin-right: 0.25rem;"></i>
                      Income: {{ formatCurrency(getQuarterTotal(quarter, 'total_income')) }}
                    </div>
                    <div style="color: #dc2626; margin-bottom: 0.25rem;">
                      <i class="fas fa-arrow-down" style="margin-right: 0.25rem;"></i>
                      Expenses: {{ formatCurrency(getQuarterTotal(quarter, 'total_expense')) }}
                    </div>
                    <div style="color: #2563eb; font-weight: 500; border-top: 1px solid #e5e7eb; padding-top: 0.25rem;">
                      <i class="fas fa-wallet" style="margin-right: 0.25rem;"></i>
                      Balance: {{ formatCurrency(getQuarterTotal(quarter, 'closing_balance')) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Report Footer -->
            <div style="border-top: 2px solid #e5e7eb; padding-top: 1.5rem; text-align: center; margin-top: 2rem;">
              <p style="font-size: 0.75rem; color: #6b7280;">
                This report was generated on {{ currentDate | date:'fullDate' }} and contains
                <span *ngIf="exportOptions.includeCheckIns" style="color: #3b82f6; font-weight: 500;">verified Financial Check-ins data</span>
                <span *ngIf="exportOptions.includeCheckIns && exportOptions.includeBankStatements"> and </span>
                <span *ngIf="exportOptions.includeBankStatements" style="color: #6b7280;">bank validation data</span>.
              </p>
              <p style="font-size: 0.75rem; color: #9ca3af; margin-top: 0.5rem;">
                <i class="fas fa-shield-alt" style="margin-right: 0.25rem;"></i>
                Primary source authority: Financial Check-ins are advisor-verified and represent the authoritative business metrics.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .animate-spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Custom checkbox styling */
    input[type="checkbox"] {
      width: 1rem;
      height: 1rem;
      border-radius: 0.25rem;
      border: 2px solid #d1d5db;
      background-color: white;
    }

    input[type="checkbox"]:checked {
      background-color: #3b82f6;
      border-color: #3b82f6;
    }
  `]
})
export class FinancialCheckinPdfExportModalComponent implements OnInit {
  @Input() showModal = false;
  @Input() company!: INode<Company>;
  @Input() financialCheckIns: INode<FinancialCheckIn>[] = [];
  @Input() bankStatements: INode<BankStatement>[] = [];
  @Output() closeModalEvent = new EventEmitter<void>();

  currentDate = new Date();
  isGenerating = false;
  quarterlyMetrics: QuarterlyMetrics[] = [];
  sortedCheckIns: INode<FinancialCheckIn>[] = [];
  latestNotes: string | null = null;
  hasVarianceData = false;

  exportOptions: ExportOptions = {
    includeCheckIns: true,
    includeBankStatements: false,
    includeVarianceAnalysis: false
  };

  months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  ngOnInit() {
    this.calculateQuarterlyMetrics();
    this.sortCheckIns();
    this.extractLatestNotes();
    this.checkVarianceData();
  }

  private calculateQuarterlyMetrics() {
    const currentYear = new Date().getFullYear();
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

    this.quarterlyMetrics = quarters.map(quarter => {
      const quarterCheckIns = this.getQuarterCheckIns(quarter, currentYear);

      if (quarterCheckIns.length === 0) {
        return {
          quarter,
          year: currentYear,
          turnover: 0,
          grossProfit: 0,
          netProfit: 0,
          averageMargin: 0,
          cashPosition: 0,
          checkInsCount: 0,
          hasData: false
        };
      }

      const totals = quarterCheckIns.reduce((acc, checkIn) => ({
        turnover: acc.turnover + (checkIn.data.turnover_monthly_avg || 0),
        grossProfit: acc.grossProfit + (checkIn.data.gross_profit || 0),
        netProfit: acc.netProfit + (checkIn.data.net_profit || 0),
        cashPosition: Math.max(acc.cashPosition, checkIn.data.cash_on_hand || 0) // Use latest/highest cash position
      }), { turnover: 0, grossProfit: 0, netProfit: 0, cashPosition: 0 });

      const averageMargin = quarterCheckIns.length > 0
        ? quarterCheckIns.reduce((sum, ci) => sum + (ci.data.np_margin || 0), 0) / quarterCheckIns.length
        : 0;

      return {
        quarter,
        year: currentYear,
        turnover: totals.turnover,
        grossProfit: totals.grossProfit,
        netProfit: totals.netProfit,
        averageMargin,
        cashPosition: totals.cashPosition,
        checkInsCount: quarterCheckIns.length,
        hasData: true
      };
    });
  }

  private getQuarterCheckIns(quarter: string, year: number): INode<FinancialCheckIn>[] {
    const quarterMap: { [key: string]: number[] } = {
      'Q1': [1, 2, 3],
      'Q2': [4, 5, 6],
      'Q3': [7, 8, 9],
      'Q4': [10, 11, 12]
    };

    const months = quarterMap[quarter] || [];
    return this.financialCheckIns.filter(checkIn =>
      checkIn.data.year === year &&
      months.includes(this.parseMonth(checkIn.data.month))
    );
  }

  private parseMonth(month: string | number | undefined): number {
    if (month === undefined || month === null) return 0;
    return typeof month === 'string' ? parseInt(month, 10) : month;
  }

  private sortCheckIns() {
    this.sortedCheckIns = [...this.financialCheckIns].sort((a, b) => {
      if (a.data.year !== b.data.year) return b.data.year - a.data.year;
      return this.parseMonth(b.data.month) - this.parseMonth(a.data.month);
    });
  }

  private extractLatestNotes() {
    this.latestNotes = this.sortedCheckIns.length > 0
      ? this.sortedCheckIns[0]?.data.notes || null
      : null;
  }

  private checkVarianceData() {
    this.hasVarianceData = this.bankStatements.length > 0 && this.financialCheckIns.length > 0;
  }

  formatCheckInPeriod(data: FinancialCheckIn): string {
    if (data.month) {
      const monthNumber = this.parseMonth(data.month);
      return `${this.months[monthNumber - 1]} ${data.year}`;
    }
    return `${data.quarter || 'Unknown'} ${data.year}`;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  getQuarterTotal(quarter: string, field: 'total_income' | 'total_expense' | 'closing_balance'): number {
    const quarterMap: { [key: string]: number[] } = {
      'Q1': [1, 2, 3],
      'Q2': [4, 5, 6],
      'Q3': [7, 8, 9],
      'Q4': [10, 11, 12]
    };

    const months = quarterMap[quarter] || [];
    const statements = this.bankStatements.filter(stmt =>
      months.includes(stmt.data.month)
    );

    if (field === 'closing_balance') {
      // For closing balance, get the latest month's balance in the quarter
      const latest = statements.reduce((prev, curr) =>
        curr.data.month > prev.data.month ? curr : prev
      );
      return latest?.data[field] || 0;
    }

    return statements.reduce((sum, stmt) => sum + (stmt.data[field] || 0), 0);
  }

  getVarianceSummary(): string {
    if (!this.hasVarianceData) return 'No variance data available';

    // Calculate variances for common months
    let significantVariances = 0;
    let totalComparisons = 0;

    this.financialCheckIns.forEach(checkIn => {
      const month = this.parseMonth(checkIn.data.month);
      const bankStatement = this.bankStatements.find(stmt => stmt.data.month === month);

      if (bankStatement) {
        totalComparisons++;
        const checkInTurnover = checkIn.data.turnover_monthly_avg || 0;
        const bankIncome = bankStatement.data.total_income || 0;

        if (bankIncome > 0) {
          const variance = Math.abs(((checkInTurnover - bankIncome) / bankIncome) * 100);
          if (variance > 15) significantVariances++;
        }
      }
    });

    if (totalComparisons === 0) return 'No comparable data periods found';

    return `${significantVariances} out of ${totalComparisons} periods show variance >15% between check-ins and bank data`;
  }

  async generatePDF() {
    this.isGenerating = true;

    try {
      const element = document.getElementById('pdf-content');
      if (!element) {
        throw new Error('PDF content element not found');
      }

      // Enhanced PDF options for optimal capture
      const opt = {
        margin: 0.5,
        filename: `${this.company.data.name}_Financial_Report_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          scrollX: 0,
          scrollY: 0,
          height: element.scrollHeight,
          width: element.scrollWidth,
          letterRendering: true
        },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      this.isGenerating = false;
    }
  }

  closeModal() {
    this.closeModalEvent.emit();
  }
}
