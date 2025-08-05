import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { INode } from '../../../../../../models/schema';
import { Company, BankStatement } from '../../../../../../models/business.models';
import { NodeService } from '../../../../../../services/node.service';
import html2pdf from 'html2pdf.js';
import { firstValueFrom } from 'rxjs';

interface GroupedStatement {
  year: number;
  quarter: string;
  statements: INode<BankStatement>[];
}

@Component({
  selector: 'app-pdf-export-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-50 py-8">
      <!-- Loading State -->
      <div *ngIf="isLoading" class="flex justify-center items-center min-h-screen">
        <div class="text-center">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p class="mt-4 text-gray-600">Loading financial data...</p>
        </div>
      </div>

      <!-- Error State -->
      <div *ngIf="error" class="flex justify-center items-center min-h-screen">
        <div class="text-center">
          <i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
          <p class="text-red-600 mb-4">{{ error }}</p>
          <button (click)="goBack()" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Go Back
          </button>
        </div>
      </div>

      <!-- PDF Content -->
      <div *ngIf="!isLoading && !error" class="max-w-none mx-auto">
        <!-- Action Bar -->
        <div class="bg-white shadow-sm border-b mb-8 sticky top-0 z-10">
          <div class="max-w-7xl mx-auto px-4 py-4">
            <div class="flex justify-between items-center">
              <div class="flex items-center">
                <button (click)="goBack()" class="mr-4 text-gray-600 hover:text-gray-800">
                  <i class="fas fa-arrow-left"></i>
                </button>
                <h1 class="text-xl font-semibold text-gray-900">PDF Export - {{ company?.data?.name || 'Loading...' }}</h1>
              </div>
              <div class="flex space-x-3">
                <button (click)="generatePDF()"
                        [disabled]="isGenerating"
                        class="px-6 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 transition-colors disabled:opacity-50">
                  <span *ngIf="isGenerating" class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                  <i *ngIf="!isGenerating" class="fas fa-download mr-2"></i>
                  {{ isGenerating ? 'Generating PDF...' : 'Download PDF' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- PDF Preview Content - Full Width -->
        <div class="bg-white" *ngIf="company">
          <div id="pdf-content" class="w-full max-w-none bg-white p-8 mx-auto" style="width: 794px; margin: 0 auto;">
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
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 1.5rem;">
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
            <div style="margin-bottom: 1.5rem; page-break-inside: avoid;" class="page-break-before">
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
            <div style="margin-bottom: 1.5rem; page-break-inside: avoid;" class="page-break-before">
              <h2 style="font-size: 1.125rem; font-weight: 600; color: #111827; margin-bottom: 1rem;">Bank Statements Detail</h2>

              <div *ngFor="let group of getGroupedStatements()" style="margin-bottom: 1.5rem;">
                <h3 style="font-size: 1rem; font-weight: 500; color: #374151; margin-bottom: 0.75rem; background-color: #f3f4f6; padding: 0.5rem; border-radius: 0.25rem;">
                  {{ group.year }} - {{ group.quarter }}
                </h3>

                <table style="width: 100%; max-width: 100%; font-size: 0.8rem; border-collapse: collapse; border: 1px solid #d1d5db; margin-bottom: 1rem; page-break-inside: avoid; table-layout: fixed;">
                  <thead>
                    <tr style="background-color: #f9fafb;">
                      <th style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: left; width: 20%;">Month</th>
                      <th style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: right; width: 20%;">Opening Balance</th>
                      <th style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: right; width: 20%;">Income</th>
                      <th style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: right; width: 20%;">Expenses</th>
                      <th style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: right; width: 20%;">Closing Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let statement of group.statements">
                      <td style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; width: 20%;">{{ getMonthName(statement.data.month) }}</td>
                      <td style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: right; width: 20%;">{{ formatCurrency(statement.data.opening_balance) }}</td>
                      <td style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: right; color: #059669; width: 20%;">{{ formatCurrency(statement.data.total_income) }}</td>
                      <td style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: right; color: #dc2626; width: 20%;">{{ formatCurrency(statement.data.total_expense) }}</td>
                      <td style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: right; font-weight: 500; width: 20%;">{{ formatCurrency(statement.data.closing_balance) }}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr style="background-color: #f3f4f6; font-weight: 500;">
                      <td style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; width: 20%;">Total</td>
                      <td style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: right; width: 20%;">{{ formatCurrency(getGroupTotal(group.statements, 'opening_balance')) }}</td>
                      <td style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: right; color: #059669; width: 20%;">{{ formatCurrency(getGroupTotal(group.statements, 'total_income')) }}</td>
                      <td style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: right; color: #dc2626; width: 20%;">{{ formatCurrency(getGroupTotal(group.statements, 'total_expense')) }}</td>
                      <td style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: right; width: 20%;">{{ formatCurrency(getGroupTotal(group.statements, 'closing_balance')) }}</td>
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
export class PdfExportPageComponent implements OnInit {
  company: INode<Company> | null = null;
  bankStatements: INode<BankStatement>[] = [];
  currentDate = new Date();
  isGenerating = false;
  isLoading = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private nodeService: NodeService
  ) {}

  async ngOnInit() {
    try {
      const companyId = this.route.snapshot.paramMap.get('id');
      if (!companyId) {
        throw new Error('Company ID not found in route parameters');
      }

      const companyIdNumber = parseInt(companyId, 10);
      if (isNaN(companyIdNumber)) {
        throw new Error('Invalid company ID format');
      }

      // Load company data
      this.company = await firstValueFrom(this.nodeService.getNodeById(companyIdNumber)) as INode<Company>;

      // Load financial check-ins
      this.bankStatements = await firstValueFrom(this.nodeService.getNodesByCompany(companyIdNumber, 'financial_checkin')) as INode<BankStatement>[];

      this.isLoading = false;
    } catch (error) {
      console.error('Error loading data:', error);
      this.error = 'Failed to load company data. Please try again.';
      this.isLoading = false;
    }
  }

  goBack() {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  async generatePDF() {
    this.isGenerating = true;

    try {
      const element = document.getElementById('pdf-content');
      if (!element) {
        throw new Error('PDF content element not found');
      }

      const filename = `${this.company?.data.name.replace(/[^a-zA-Z0-9]/g, '_')}_Financial_Report_${new Date().toISOString().split('T')[0]}.pdf`;

      const options = {
        margin: [0.3, 0.3, 0.3, 0.3],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          width: 794,
          height: 1123,
          windowWidth: 1200,
          scrollX: 0,
          scrollY: 0
        },
        jsPDF: {
          unit: 'in',
          format: 'a4',
          orientation: 'portrait',
          compress: true
        },
        pagebreak: {
          mode: ['avoid-all', 'css', 'legacy'],
          before: ['.page-break-before'],
          after: ['.page-break-after']
        }
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
