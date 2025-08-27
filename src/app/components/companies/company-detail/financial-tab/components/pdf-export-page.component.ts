import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { INode } from '../../../../../../models/schema';
import { NodeService } from '../../../../../../services/node.service';
import html2pdf from 'html2pdf.js';
import { firstValueFrom } from 'rxjs';
import { ICompany } from '../../../../../../models/simple.schema';
import { CompanyService } from '../../../../../../services/company.service';
import { CompanyFinancialsService, ICompanyFinancials } from '../../../../../../services/company-financials.service';

interface GroupedCheckIn {
  year: number;
  quarter: string;
  checkIns: ICompanyFinancials[];
}

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

@Component({
  selector: 'app-pdf-export-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
                <h1 class="text-xl font-semibold text-gray-900">PDF Export - {{ company?.name || 'Loading...' }}</h1>
              </div>
              <div class="flex space-x-3">
                <!-- Toggle Controls -->
                <div class="flex items-center space-x-4 mr-4">
                  <label class="flex items-center text-sm">
                    <input type="checkbox" [(ngModel)]="showCompanyInfo" class="mr-2">
                    Company Info
                  </label>
                  <label class="flex items-center text-sm">
                    <input type="checkbox" [(ngModel)]="showQuarterlySummary" class="mr-2">
                    Summary
                  </label>
                  <label class="flex items-center text-sm">
                    <input type="checkbox" [(ngModel)]="showDetailedTables" class="mr-2">
                    Details
                  </label>
                </div>

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
                {{ company.name.charAt(0) }}
              </div>
              <h1 style="font-size: 1.5rem; font-weight: bold; color: #111827; margin-bottom: 0.5rem;">{{ company.name }}</h1>
              <p style="color: #4b5563;">Financial Report</p>
              <p style="font-size: 0.875rem; color: #6b7280;">Generated on {{ currentDate | date:'fullDate' }}</p>

              <!-- Debug Info -->
              <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 0.5rem; margin-top: 1rem; border-radius: 0.25rem; font-size: 0.75rem;">
                Check-ins loaded: {{ financialCheckIns.length }} |
                Show Company: {{ showCompanyInfo }} |
                Show Summary: {{ showQuarterlySummary }} |
                Show Details: {{ showDetailedTables }}
              </div>
            </div>

            <!-- Company Information -->
            <div *ngIf="showCompanyInfo" style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 1.5rem;">
              <div>
                <h2 style="font-size: 1.125rem; font-weight: 600; color: #111827; margin-bottom: 0.75rem;">Company Information</h2>
                <div style="font-size: 0.875rem;">
                  <div style="margin-bottom: 0.5rem;"><strong>Registration No:</strong> {{ company.registration_no }}</div>
                  <div style="margin-bottom: 0.5rem;"><strong>Industry:</strong> {{ company.sector_name }}</div>
                  <div style="margin-bottom: 0.5rem;"><strong>Contact Person:</strong> {{ company.contact_person || 'N/A' }}</div>
                  <div style="margin-bottom: 0.5rem;"><strong>Email:</strong> {{ company.email_address || 'N/A' }}</div>
                  <div style="margin-bottom: 0.5rem;"><strong>Phone:</strong> {{ company.contact_number || 'N/A' }}</div>
                </div>
              </div>

              <div>
                <h2 style="font-size: 1.125rem; font-weight: 600; color: #111827; margin-bottom: 0.75rem;">Compliance Status</h2>
                <div style="font-size: 0.875rem;">
                  <div style="display: flex; align-items: center; margin-bottom: 0.5rem;">
                    <div style="width: 0.75rem; height: 0.75rem; border-radius: 50%; margin-right: 0.5rem; background-color: {{ company.is_sars_registered ? '#10b981' : '#ef4444' }};"></div>
                    <span>SARS Registration</span>
                  </div>
                  <div style="display: flex; align-items: center; margin-bottom: 0.5rem;">
                    <div style="width: 0.75rem; height: 0.75rem; border-radius: 50%; margin-right: 0.5rem; background-color: {{ company.has_tax_clearance ? '#10b981' : '#ef4444' }};"></div>
                    <span>Tax Clearance</span>
                  </div>
                  <div style="display: flex; align-items: center; margin-bottom: 0.5rem;">
                    <div style="width: 0.75rem; height: 0.75rem; border-radius: 50%; margin-right: 0.5rem; background-color: {{ company.has_cipc_registration ? '#10b981' : '#ef4444' }};"></div>
                    <span>CIPC Registration</span>
                  </div>
                  <div style="margin-bottom: 0.5rem;"><strong>BBBEE Level:</strong> {{ company.bbbee_level || 'N/A' }}</div>
                </div>
              </div>
            </div>

            <!-- Financial Summary -->
            <div *ngIf="showQuarterlySummary && financialCheckIns.length > 0" style="margin-bottom: 1.5rem; page-break-inside: avoid;" class="page-break-before">
              <h2 style="font-size: 1.125rem; font-weight: 600; color: #111827; margin-bottom: 1rem;">📊 Executive Summary</h2>

              <!-- Key Metrics Cards -->
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem;">
                  <div style="font-weight: 600; color: #374151; margin-bottom: 0.5rem;">💰 Revenue Performance</div>
                  <div style="font-size: 1.5rem; font-weight: bold; color: #059669;">{{ formatCurrency(getLatestMetric('turnover_monthly_avg')) }}</div>
                  <div style="color: #6b7280; font-size: 0.875rem;">Latest Monthly Average</div>
                </div>

                <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem;">
                  <div style="font-weight: 600; color: #374151; margin-bottom: 0.5rem;">📈 Gross Profit</div>
                  <div style="font-size: 1.5rem; font-weight: bold; color: #059669;">{{ formatCurrency(getLatestMetric('gross_profit')) }}</div>
                  <div style="color: #6b7280; font-size: 0.875rem;">Latest Period</div>
                </div>

                <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem;">
                  <div style="font-weight: 600; color: #374151; margin-bottom: 0.5rem;">💵 Net Profit</div>
                  <div style="font-size: 1.5rem; font-weight: bold;" [style.color]="getLatestMetric('net_profit') >= 0 ? '#059669' : '#dc2626'">{{ formatCurrency(getLatestMetric('net_profit')) }}</div>
                  <div style="color: #6b7280; font-size: 0.875rem;">Latest Period</div>
                </div>

                <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem;">
                  <div style="font-weight: 600; color: #374151; margin-bottom: 0.5rem;">💳 Cash Position</div>
                  <div style="font-size: 1.5rem; font-weight: bold; color: #1d4ed8;">{{ formatCurrency(getLatestMetric('cash_on_hand')) }}</div>
                  <div style="color: #6b7280; font-size: 0.875rem;">Current Balance</div>
                </div>
              </div>

              <!-- Margin Analysis -->
              <div style="background: #fafafa; border-radius: 0.5rem; padding: 1rem; margin-bottom: 1rem;">
                <h4 style="margin: 0 0 0.75rem 0; font-weight: 600; color: #374151;">📊 Profitability Margins</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                  <div style="text-align: center;">
                    <div style="font-size: 1.25rem; font-weight: bold; color: #059669;">{{ formatPercentage(getLatestMetric('gp_margin')) }}</div>
                    <div style="color: #6b7280; font-size: 0.875rem;">Gross Profit Margin</div>
                  </div>
                  <div style="text-align: center;">
                    <div style="font-size: 1.25rem; font-weight: bold;" [style.color]="getLatestMetric('np_margin') >= 0 ? '#059669' : '#dc2626'">{{ formatPercentage(getLatestMetric('np_margin')) }}</div>
                    <div style="color: #6b7280; font-size: 0.875rem;">Net Profit Margin</div>
                  </div>
                </div>
              </div>

              <!-- Quarterly Overview -->
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
                <div *ngFor="let quarter of ['Q1', 'Q2', 'Q3', 'Q4']" style="background-color: #f9fafb; padding: 1rem; border-radius: 0.5rem; text-align: center;">
                  <h3 style="font-weight: 500; color: #111827; margin-bottom: 0.5rem;">{{ quarter }}</h3>
                  <div style="font-size: 0.875rem;">
                    <div style="color: #059669; margin-bottom: 0.25rem;">
                      <i class="fas fa-arrow-up" style="margin-right: 0.25rem;"></i>
                      Revenue: {{ formatCurrency(getQuarterTotal(quarter, 'turnover_monthly_avg')) }}
                    </div>
                    <div style="color: #dc2626; margin-bottom: 0.25rem;">
                      <i class="fas fa-arrow-down" style="margin-right: 0.25rem;"></i>
                      Expenses: {{ formatCurrency(getQuarterTotal(quarter, 'business_expenses')) }}
                    </div>
                    <div style="color: #2563eb; font-weight: 500; border-top: 1px solid #e5e7eb; padding-top: 0.25rem;">
                      <i class="fas fa-wallet" style="margin-right: 0.25rem;"></i>
                      Net Profit: {{ formatCurrency(getQuarterTotal(quarter, 'net_profit')) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Financial Check-ins Table -->
            <div *ngIf="showDetailedTables && financialCheckIns.length > 0" style="margin-bottom: 1.5rem; page-break-inside: avoid;" class="page-break-before">
              <h2 style="font-size: 1.125rem; font-weight: 600; color: #111827; margin-bottom: 1rem;">📋 Detailed Financial Check-ins</h2>

              <div *ngFor="let group of getGroupedStatements()" style="margin-bottom: 1.5rem;">
                <h3 style="font-size: 1rem; font-weight: 500; color: #374151; margin-bottom: 0.75rem; background-color: #f3f4f6; padding: 0.5rem; border-radius: 0.25rem;">
                  {{ group.year }} - {{ group.quarter }}
                </h3>

                <table style="width: 100%; max-width: 100%; font-size: 0.8rem; border-collapse: collapse; border: 1px solid #d1d5db; margin-bottom: 1rem; page-break-inside: avoid; table-layout: fixed;">
                  <thead>
                    <tr style="background-color: #f9fafb;">
                      <th style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: left; width: 20%;">Period</th>
                      <th style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: right; width: 20%;">Cash</th>
                      <th style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: right; width: 20%;">Revenue</th>
                      <th style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: right; width: 20%;">Expenses</th>
                      <th style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: right; width: 20%;">Net Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let checkIn of group.checkIns">
                      <td style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; width: 20%;">{{ getMonthName(checkIn.month || 1) }}</td>
                      <td style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: right; width: 20%;">{{ formatCurrency(checkIn.cash_on_hand || 0) }}</td>
                      <td style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: right; color: #059669; width: 20%;">{{ formatCurrency(checkIn.turnover_monthly_avg || 0) }}</td>
                      <td style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: right; color: #dc2626; width: 20%;">{{ formatCurrency(checkIn.business_expenses || 0) }}</td>
                      <td style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: right; font-weight: 500; width: 20%;">{{ formatCurrency(checkIn.net_profit || 0) }}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr style="background-color: #f3f4f6; font-weight: 500;">
                      <td style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; width: 20%;">Total</td>
                      <td style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: right; width: 20%;">{{ formatCurrency(getGroupTotal(group.checkIns, 'cash_on_hand')) }}</td>
                      <td style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: right; color: #059669; width: 20%;">{{ formatCurrency(getGroupTotal(group.checkIns, 'turnover_monthly_avg')) }}</td>
                      <td style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: right; color: #dc2626; width: 20%;">{{ formatCurrency(getGroupTotal(group.checkIns, 'business_expenses')) }}</td>
                      <td style="border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: right; width: 20%;">{{ formatCurrency(getGroupTotal(group.checkIns, 'net_profit')) }}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <!-- Footer -->
            <div style="text-align: center; font-size: 0.75rem; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 1rem;">
              <p>This report was generated on {{ currentDate | date:'medium' }}</p>
              <p>Financial data is based on financial check-ins provided by {{ company.name }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class PdfExportPageComponent implements OnInit {
  company: ICompany | null = null;
  financialCheckIns: ICompanyFinancials[] = [];
  currentDate = new Date();
  isGenerating = false;
  isLoading = true;
  error: string | null = null;

  // Toggle options for PDF content
  showDetailedTables = true;
  showQuarterlySummary = true;
  showCompanyInfo = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private companyService: CompanyService,
    private nodeService: CompanyFinancialsService
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
      this.company = await firstValueFrom(this.companyService.getCompanyById(companyIdNumber)) as ICompany;

      // Load financial check-ins
      this.financialCheckIns = await firstValueFrom(this.nodeService.listAllCompanyFinancials(companyIdNumber)) as ICompanyFinancials[];

      console.log('Loaded financial check-ins:', this.financialCheckIns.length, this.financialCheckIns);

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

      const filename = `${this.company?.name.replace(/[^a-zA-Z0-9]/g, '_')}_Financial_Report_${new Date().toISOString().split('T')[0]}.pdf`;

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

  getQuarterTotal(quarter: string, field: keyof ICompanyFinancials): number {
    const checkIns = this.financialCheckIns.filter(
      (checkIn: ICompanyFinancials) => checkIn.quarter_label === quarter
    );

    if (checkIns.length === 0) return 0;

    return checkIns.reduce((sum: number, checkIn: ICompanyFinancials) => {
      if (!checkIn[field]) return sum;
      const value = checkIn[field];
      const numValue = typeof value === 'string' ? parseFloat(value) : (value as number);
      return sum + (isNaN(numValue) ? 0 : numValue);
    }, 0);
  }

  getGroupedStatements(): GroupedCheckIn[] {
    // Data comes pre-sorted by date
    const grouped = this.financialCheckIns.reduce((groups: { [key: string]: GroupedCheckIn }, checkIn: ICompanyFinancials) => {
      if (!checkIn.quarter_label || !checkIn.year) return groups;

      const key = `${checkIn.year}-${checkIn.quarter_label}`;
      if (!groups[key]) {
        groups[key] = {
          year: checkIn.year,
          quarter: checkIn.quarter_label,
          checkIns: []
        };
      }
      groups[key].checkIns.push(checkIn);
      return groups;
    }, {});

    // Sort by year and quarter (already sorted by API, but ensuring order for display)
    return Object.values(grouped);
  }

  getGroupTotal(checkIns: ICompanyFinancials[], field: keyof ICompanyFinancials): number {
    return checkIns.reduce((sum: number, checkIn: ICompanyFinancials) => {
      if (!checkIn[field]) return sum;
      const value = checkIn[field];
      const numValue = typeof value === 'string' ? parseFloat(value) : (value as number);
      return sum + (isNaN(numValue) ? 0 : numValue);
    }, 0);
  }

  getLatestMetric(field: keyof ICompanyFinancials): number {
    if (this.financialCheckIns.length === 0) return 0;

    // Data comes pre-sorted from the API, first record is latest
    const latest = this.financialCheckIns[0];
    if (!latest || !latest[field]) return 0;

    // Handle string number values from the database
    const value = latest[field];
    const numValue = typeof value === 'string' ? parseFloat(value) : (value as number);
    return isNaN(numValue) ? 0 : numValue;
  }

  formatPercentage(value: number | string | null | undefined): string {
    if (value === undefined || value === null) return '0%';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(numValue) ? '0%' : `${numValue.toFixed(1)}%`;
  }
}
