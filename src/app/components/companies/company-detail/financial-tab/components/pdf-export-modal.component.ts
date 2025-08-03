import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { INode } from '../../../../../../models/schema';
import { Company, BankStatement } from '../../../../../../models/business.models';
import html2pdf from 'html2pdf.js';

interface GroupedStatement {
  year: number;
  quarter: string;
  statements: INode<BankStatement>[];
}

@Component({
  selector: 'app-pdf-export-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="showModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <!-- Modal Header -->
          <div class="flex justify-between items-center mb-6">
            <div class="flex items-center">
              <i class="fas fa-file-pdf text-red-600 mr-2"></i>
              <h3 class="text-lg font-medium text-gray-900">Financial Report Preview</h3>
            </div>
            <div class="flex space-x-3">
              <button (click)="generatePDF()"
                      [disabled]="isGenerating"
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

          <!-- PDF Preview Content -->
          <div id="pdf-content" style="border: 1px solid #e5e7eb; background-color: white; padding: 2rem; max-height: 70vh; overflow-y: auto;">
            <!-- Company Header -->
            <div style="text-align: center; border-bottom: 1px solid #e5e7eb; padding-bottom: 1.5rem; margin-bottom: 1.5rem;">
              <div style="width: 4rem; height: 4rem; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 0.5rem; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.5rem;">
                {{ company.data.name.charAt(0) }}
              </div>
              <h1 style="font-size: 1.5rem; font-weight: bold; color: #111827; margin-bottom: 0.5rem;">{{ company.data.name }}</h1>
              <p style="color: #4b5563;">Financial Report</p>
              <p style="font-size: 0.875rem; color: #6b7280;">Generated on {{ currentDate | date:'fullDate' }}</p>
            </div>

            <!-- Company Information -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem;">
              <div>
                <h2 style="font-size: 1.125rem; font-weight: 600; color: #111827; margin-bottom: 0.75rem;">Company Information</h2>
                <div style="font-size: 0.875rem;">
                  <div style="margin-bottom: 0.5rem;"><strong>Registration No:</strong> {{ company.data.registration_no }}</div>
                  <div style="margin-bottom: 0.5rem;"><strong>Industry:</strong> {{ company.data.industry }}</div>
                  <div style="margin-bottom: 0.5rem;"><strong>Contact Person:</strong> {{ company.data.contact_person || 'N/A' }}</div>
                  <div style="margin-bottom: 0.5rem;"><strong>Email:</strong> {{ company.data.email_address || 'N/A' }}</div>
                  <div style="margin-bottom: 0.5rem;"><strong>Phone:</strong> {{ company.data.contact_number || 'N/A' }}</div>
                </div>
              </div>

              <div>
                <h2 style="font-size: 1.125rem; font-weight: 600; color: #111827; margin-bottom: 0.75rem;">Compliance Status</h2>
                <div style="font-size: 0.875rem;">
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

            <!-- Financial Summary -->
            <div style="margin-bottom: 2rem;">
              <h2 style="font-size: 1.125rem; font-weight: 600; color: #111827; margin-bottom: 1rem;">Financial Summary</h2>
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
                <div *ngFor="let quarter of ['Q1', 'Q2', 'Q3', 'Q4']" style="background-color: #f9fafb; padding: 1rem; border-radius: 0.5rem; text-align: center;">
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

            <!-- Bank Statements Table -->
            <div style="margin-bottom: 2rem;">
              <h2 style="font-size: 1.125rem; font-weight: 600; color: #111827; margin-bottom: 1rem;">Bank Statements Detail</h2>

              <div *ngFor="let group of getGroupedStatements()" style="margin-bottom: 1.5rem;">
                <h3 style="font-size: 1rem; font-weight: 500; color: #374151; margin-bottom: 0.75rem; background-color: #f3f4f6; padding: 0.5rem; border-radius: 0.25rem;">
                  {{ group.year }} - {{ group.quarter }}
                </h3>

                <table style="width: 100%; font-size: 0.875rem; border-collapse: collapse; border: 1px solid #d1d5db;">
                  <thead>
                    <tr style="background-color: #f9fafb;">
                      <th style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: left;">Month</th>
                      <th style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: right;">Opening Balance</th>
                      <th style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: right;">Income</th>
                      <th style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: right;">Expenses</th>
                      <th style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: right;">Closing Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let statement of group.statements">
                      <td style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem;">{{ getMonthName(statement.data.month) }}</td>
                      <td style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: right;">{{ formatCurrency(statement.data.opening_balance) }}</td>
                      <td style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: right; color: #059669;">{{ formatCurrency(statement.data.total_income) }}</td>
                      <td style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: right; color: #dc2626;">{{ formatCurrency(statement.data.total_expense) }}</td>
                      <td style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: right; font-weight: 500;">{{ formatCurrency(statement.data.closing_balance) }}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr style="background-color: #f3f4f6; font-weight: 500;">
                      <td style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem;">Total</td>
                      <td style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: right;">{{ formatCurrency(getGroupTotal(group.statements, 'opening_balance')) }}</td>
                      <td style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: right; color: #059669;">{{ formatCurrency(getGroupTotal(group.statements, 'total_income')) }}</td>
                      <td style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: right; color: #dc2626;">{{ formatCurrency(getGroupTotal(group.statements, 'total_expense')) }}</td>
                      <td style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: right;">{{ formatCurrency(getGroupTotal(group.statements, 'closing_balance')) }}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <!-- Footer -->
            <div style="text-align: center; font-size: 0.75rem; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 1rem;">
              <p>This report was generated on {{ currentDate | date:'medium' }}</p>
              <p>Financial data is based on bank statements provided by {{ company.data.name }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class PdfExportModalComponent implements OnInit {
  @Input() showModal = false;
  @Input() company!: INode<Company>;
  @Input() bankStatements: INode<BankStatement>[] = [];
  @Output() closeModalEvent = new EventEmitter<void>();

  currentDate = new Date();
  isGenerating = false;

  ngOnInit() {
    // Component initialization
  }

  closeModal() {
    this.closeModalEvent.emit();
  }

  async generatePDF() {
    this.isGenerating = true;

    try {
      const element = document.getElementById('pdf-content');
      if (!element) {
        throw new Error('PDF content element not found');
      }

      const filename = `${this.company.data.name.replace(/[^a-zA-Z0-9]/g, '_')}_Financial_Report_${new Date().toISOString().split('T')[0]}.pdf`;

      const options = {
        margin: 0.5,
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      await html2pdf().set(options).from(element).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('There was an error generating the PDF. Please try again.');
    } finally {
      this.isGenerating = false;
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  }

  getMonthName(monthNumber: number): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthNumber - 1] || '';
  }

  getQuarterTotal(quarter: string, field: keyof BankStatement): number {
    const quarterMonths = {
      'Q1': [1, 2, 3],
      'Q2': [4, 5, 6],
      'Q3': [7, 8, 9],
      'Q4': [10, 11, 12]
    };

    const months = quarterMonths[quarter as keyof typeof quarterMonths] || [];
    return this.bankStatements
      .filter(statement => months.includes(statement.data.month))
      .reduce((sum, statement) => sum + (statement.data[field] as number || 0), 0);
  }

  getGroupedStatements(): GroupedStatement[] {
    const grouped = this.bankStatements.reduce((groups: { [key: string]: GroupedStatement }, statement) => {
      const key = `${statement.data.year}-${statement.data.quarter}`;
      if (!groups[key]) {
        groups[key] = {
          year: statement.data.year,
          quarter: statement.data.quarter || 'Q1',
          statements: []
        };
      }
      groups[key].statements.push(statement);
      return groups;
    }, {});

    return Object.values(grouped).sort((a: GroupedStatement, b: GroupedStatement) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.quarter.localeCompare(a.quarter);
    });
  }

  getGroupTotal(statements: INode<BankStatement>[], field: keyof BankStatement): number {
    return statements.reduce((sum, statement) => sum + (statement.data[field] as number || 0), 0);
  }
}
