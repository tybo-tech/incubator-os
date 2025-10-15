import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CompanyService } from '../../../../../services/company.service';
import { ICompany } from '../../../../../models/simple.schema';
import { CompanyFinancialYearlyStatsService, CompanyFinancialYearlyStats } from '../../../../../services/company-financial-yearly-stats.service';
import { FinancialYearService, FinancialYear } from '../../../../../services/financial-year.service';
import { firstValueFrom } from 'rxjs';

interface MonthlyRevenueFormData {
  account: string;
  financial_year: number;
  m1: number;
  m2: number;
  m3: number;
  m4: number;
  m5: number;
  m6: number;
  m7: number;
  m8: number;
  m9: number;
  m10: number;
  m11: number;
  m12: number;
}

// Extended interface for display purposes
interface DisplayCompanyFinancialYearlyStats extends CompanyFinancialYearlyStats {
  financial_year?: number;
  financial_year_name?: string;
  account_name?: string;
}

@Component({
  selector: 'app-monthly-revenue',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6">
      <!-- Page Header -->
      <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <i class="fas fa-chart-line text-green-600 text-2xl mr-3"></i>
            <div>
              <h2 class="text-xl font-bold text-gray-900">Monthly Revenue</h2>
              <p class="text-gray-600">
                Smart monthly revenue tracking - the modern way to capture financial data
              </p>
            </div>
          </div>

          <!-- Company Info -->
          <div *ngIf="company()" class="text-right">
            <h3 class="text-lg font-semibold text-gray-900">
              {{ company()!.name }}
            </h3>
            <p class="text-sm text-gray-500">Company ID: {{ company()!.id }}</p>
          </div>
        </div>
      </div>

      <!-- Monthly Revenue Form -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div class="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
          <h3 class="text-lg font-semibold text-white flex items-center">
            <i class="fas fa-plus-circle mr-2"></i>
            Capture Monthly Revenue Data
          </h3>
        </div>

        <div class="p-6">
          <form [formGroup]="revenueForm" (ngSubmit)="onSubmit()" class="space-y-6">
            <!-- Form Controls Row -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Account Selection -->
              <div>
                <label for="account" class="block text-sm font-medium text-gray-700 mb-2">
                  <i class="fas fa-university mr-1"></i>
                  Account
                </label>
                <select
                  id="account"
                  formControlName="account"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Select Account</option>
                  <option value="Primary Account">Primary Account</option>
                  <option value="Secondary Account">Secondary Account</option>
                  <option value="Business Account">Business Account</option>
                  <option value="Savings Account">Savings Account</option>
                </select>
              </div>

              <!-- Financial Year Selection -->
              <div>
                <label for="financial_year" class="block text-sm font-medium text-gray-700 mb-2">
                  <i class="fas fa-calendar-alt mr-1"></i>
                  Financial Year
                </label>
                <select
                  id="financial_year"
                  formControlName="financial_year"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Select Financial Year</option>
                  <option *ngFor="let year of availableFinancialYears()" [value]="year.value">
                    {{ year.label }} {{ year.isActive ? '(Active)' : '' }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Monthly Revenue Table -->
            <div class="overflow-x-auto">
              <div class="bg-gray-50 rounded-lg p-4">
                <h4 class="text-md font-semibold text-gray-900 mb-4 flex items-center">
                  <i class="fas fa-table mr-2"></i>
                  Monthly Revenue Entry (Excel-style)
                </h4>

                <div class="grid grid-cols-12 gap-2 mb-4">
                  <!-- Month Headers -->
                  <div *ngFor="let month of monthNames; let i = index"
                       class="text-center bg-green-100 p-2 rounded text-sm font-medium text-green-800">
                    {{ month }}
                  </div>
                </div>

                <div class="grid grid-cols-12 gap-2 mb-4">
                  <!-- Month Inputs -->
                  <div *ngFor="let month of monthFields; let i = index">
                    <input
                      type="number"
                      [formControlName]="month"
                      placeholder="0"
                      class="w-full px-2 py-2 border border-gray-300 rounded text-center focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      (input)="onMonthValueChange()"
                    />
                  </div>
                </div>

                <!-- Total Row -->
                <div class="bg-green-50 border-t-2 border-green-200 pt-4">
                  <div class="flex justify-between items-center">
                    <span class="text-lg font-bold text-green-800 flex items-center">
                      <i class="fas fa-calculator mr-2"></i>
                      Total Revenue:
                    </span>
                    <span class="text-xl font-bold text-green-900">
                      {{ formatCurrency(totalRevenue()) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                (click)="resetForm()"
                class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <i class="fas fa-undo mr-2"></i>
                Reset
              </button>
              <button
                type="submit"
                [disabled]="!isFormValid() || isLoading()"
                class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <i class="fas fa-save mr-2"></i>
                {{ isLoading() ? 'Saving...' : 'Save Revenue Data' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Existing Revenue Data -->
      <div *ngIf="existingData.length > 0" class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div class="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <h3 class="text-lg font-semibold text-white flex items-center">
            <i class="fas fa-database mr-2"></i>
            Existing Revenue Records
          </h3>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Year
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account
                </th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Q1 Total
                </th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Q2 Total
                </th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Q3 Total
                </th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Q4 Total
                </th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Yearly Total
                </th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let record of existingData()" class="hover:bg-gray-50">
                <td class="px-4 py-3 text-sm font-medium text-gray-900">
                  {{ record.financial_year_name }}
                </td>
                <td class="px-4 py-3 text-sm text-gray-900">
                  {{ record.account_name }}
                </td>
                <td class="px-4 py-3 text-sm text-center text-gray-900">
                  {{ formatCurrency(getQuarterTotal(record, 1)) }}
                </td>
                <td class="px-4 py-3 text-sm text-center text-gray-900">
                  {{ formatCurrency(getQuarterTotal(record, 2)) }}
                </td>
                <td class="px-4 py-3 text-sm text-center text-gray-900">
                  {{ formatCurrency(getQuarterTotal(record, 3)) }}
                </td>
                <td class="px-4 py-3 text-sm text-center text-gray-900">
                  {{ formatCurrency(getQuarterTotal(record, 4)) }}
                </td>
                <td class="px-4 py-3 text-sm text-center font-bold text-green-600">
                  {{ formatCurrency(getYearlyTotal(record)) }}
                </td>
                <td class="px-4 py-3 text-sm text-center">
                  <button
                    (click)="editRecord(record)"
                    class="text-blue-600 hover:text-blue-800 mr-2"
                    title="Edit Record"
                  >
                    <i class="fas fa-edit"></i>
                  </button>
                  <button
                    (click)="deleteRecord(record)"
                    class="text-red-600 hover:text-red-800"
                    title="Delete Record"
                  >
                    <i class="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Loading and Error States -->
      <div *ngIf="error()" class="bg-red-50 border border-red-200 rounded-lg p-4">
        <div class="flex items-center">
          <i class="fas fa-exclamation-triangle text-red-500 mr-2"></i>
          <span class="text-red-700">{{ error() }}</span>
        </div>
      </div>
    </div>
  `,
})
export class MonthlyRevenueComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private companyService = inject(CompanyService);
  private yearlyStatsService = inject(CompanyFinancialYearlyStatsService);
  private financialYearService = inject(FinancialYearService);
  private fb = inject(FormBuilder);

  // Signals
  company = signal<ICompany | null>(null);
  existingData = signal<DisplayCompanyFinancialYearlyStats[]>([]);
  availableFinancialYears = signal<{ value: number; label: string; isActive: boolean }[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);

  // Form
  revenueForm: FormGroup;

  // Configuration
  monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  monthFields = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11', 'm12'];

  constructor() {
    this.revenueForm = this.fb.group({
      account: ['', Validators.required],
      financial_year: ['', Validators.required],
      m1: [0, [Validators.min(0)]],
      m2: [0, [Validators.min(0)]],
      m3: [0, [Validators.min(0)]],
      m4: [0, [Validators.min(0)]],
      m5: [0, [Validators.min(0)]],
      m6: [0, [Validators.min(0)]],
      m7: [0, [Validators.min(0)]],
      m8: [0, [Validators.min(0)]],
      m9: [0, [Validators.min(0)]],
      m10: [0, [Validators.min(0)]],
      m11: [0, [Validators.min(0)]],
      m12: [0, [Validators.min(0)]],
    });
  }

  async ngOnInit() {
    try {
      this.isLoading.set(true);
      this.error.set(null);

      // Get company ID from route
      const companyId = this.route.snapshot.queryParams['companyId'];
      if (!companyId) {
        throw new Error('Company ID not found in route parameters');
      }

      // Load company data
      const company = await firstValueFrom(
        this.companyService.getCompanyById(parseInt(companyId))
      );
      this.company.set(company);

      // Load financial years for dropdown
      await this.loadFinancialYears();

      // Load existing revenue data
      await this.loadExistingData(parseInt(companyId));
    } catch (error) {
      this.error.set('Failed to load component data: ' + (error as Error).message);
      console.error('Monthly Revenue Component Error:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadFinancialYears() {
    try {
      const years = await firstValueFrom(
        this.financialYearService.getFinancialYearOptions()
      );
      this.availableFinancialYears.set(years);
    } catch (error) {
      console.warn('Could not load financial years:', error);
      // Set fallback years if API fails
      this.availableFinancialYears.set([
        { value: 1, label: 'FY 2024/2025', isActive: true },
        { value: 2, label: 'FY 2023/2024', isActive: false },
        { value: 3, label: 'FY 2025/2026', isActive: false }
      ]);
    }
  }

  private async loadExistingData(companyId: number) {
    try {
      const data = await firstValueFrom(
        this.yearlyStatsService.getAllCompanyStats(companyId)
      );
      
      // Filter for revenue type records and add display fields
      const revenueData = data
        .filter(record => record.is_revenue === true)
        .map(record => {
          // Find the financial year name from our loaded financial years
          const financialYear = this.availableFinancialYears().find(fy => fy.value === record.financial_year_id);
          
          return {
            ...record,
            financial_year: record.financial_year_id,
            financial_year_name: financialYear?.label || `Year ${record.financial_year_id}`,
            account_name: `Account ${record.account_id || 'Unknown'}`
          };
        });
      
      this.existingData.set(revenueData);
    } catch (error) {
      console.warn('Could not load existing revenue data:', error);
      this.existingData.set([]);
    }
  }  totalRevenue = signal(0);

  onMonthValueChange() {
    const formValue = this.revenueForm.value;
    const total = this.monthFields.reduce((sum, field) => {
      return sum + (parseFloat(formValue[field]) || 0);
    }, 0);
    this.totalRevenue.set(total);
  }

  isFormValid(): boolean {
    return this.revenueForm.valid && this.revenueForm.value.account && this.revenueForm.value.financial_year;
  }

  async onSubmit() {
    if (!this.isFormValid() || !this.company()) {
      return;
    }

    try {
      this.isLoading.set(true);
      this.error.set(null);

      const formValue = this.revenueForm.value as MonthlyRevenueFormData;

      const yearlyStatsData: Partial<CompanyFinancialYearlyStats> = {
        company_id: this.company()!.id,
        financial_year_id: formValue.financial_year,
        is_revenue: true,
        account_id: 1, // Default account ID for now
        client_id: 1, // Default client ID
        m1: formValue.m1 || 0,
        m2: formValue.m2 || 0,
        m3: formValue.m3 || 0,
        m4: formValue.m4 || 0,
        m5: formValue.m5 || 0,
        m6: formValue.m6 || 0,
        m7: formValue.m7 || 0,
        m8: formValue.m8 || 0,
        m9: formValue.m9 || 0,
        m10: formValue.m10 || 0,
        m11: formValue.m11 || 0,
        m12: formValue.m12 || 0,
        total_amount: this.totalRevenue(),
      };

      // Use upsert to handle both create and update
      await firstValueFrom(
        this.yearlyStatsService.upsertYearlyStats(yearlyStatsData as CompanyFinancialYearlyStats)
      );

      // Reload data and reset form
      await this.loadExistingData(this.company()!.id);
      this.resetForm();

      // Success feedback could be added here with a toast service
      console.log('Revenue data saved successfully');

    } catch (error) {
      this.error.set('Failed to save revenue data: ' + (error as Error).message);
      console.error('Save Error:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  resetForm() {
    this.revenueForm.reset({
      account: '',
      financial_year: '',
      m1: 0,
      m2: 0,
      m3: 0,
      m4: 0,
      m5: 0,
      m6: 0,
      m7: 0,
      m8: 0,
      m9: 0,
      m10: 0,
      m11: 0,
      m12: 0,
    });
    this.totalRevenue.set(0);
  }

  editRecord(record: DisplayCompanyFinancialYearlyStats) {
    this.revenueForm.patchValue({
      account: record.account_name || 'Primary Account',
      financial_year: record.financial_year_id,
      m1: record.m1 || 0,
      m2: record.m2 || 0,
      m3: record.m3 || 0,
      m4: record.m4 || 0,
      m5: record.m5 || 0,
      m6: record.m6 || 0,
      m7: record.m7 || 0,
      m8: record.m8 || 0,
      m9: record.m9 || 0,
      m10: record.m10 || 0,
      m11: record.m11 || 0,
      m12: record.m12 || 0,
    });
    this.onMonthValueChange();
  }

  async deleteRecord(record: DisplayCompanyFinancialYearlyStats) {
    if (!confirm('Are you sure you want to delete this revenue record?')) {
      return;
    }

    try {
      this.isLoading.set(true);
      await firstValueFrom(
        this.yearlyStatsService.deleteYearlyStats(record.id!)
      );

      // Reload data
      await this.loadExistingData(this.company()!.id);

    } catch (error) {
      this.error.set('Failed to delete record: ' + (error as Error).message);
      console.error('Delete Error:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  getQuarterTotal(record: DisplayCompanyFinancialYearlyStats, quarter: number): number {
    switch (quarter) {
      case 1: return (record.m1 || 0) + (record.m2 || 0) + (record.m3 || 0);
      case 2: return (record.m4 || 0) + (record.m5 || 0) + (record.m6 || 0);
      case 3: return (record.m7 || 0) + (record.m8 || 0) + (record.m9 || 0);
      case 4: return (record.m10 || 0) + (record.m11 || 0) + (record.m12 || 0);
      default: return 0;
    }
  }

  getYearlyTotal(record: DisplayCompanyFinancialYearlyStats): number {
    return this.monthFields.reduce((total, field) => {
      return total + ((record as any)[field] || 0);
    }, 0);
  }
}
