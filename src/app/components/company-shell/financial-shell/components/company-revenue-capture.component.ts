import { Component, signal, computed, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { YearGroupComponent } from './year-group.component';
import { FinancialManagementModalComponent } from './financial-management-modal.component';
import { YearGroup, AccountRecord } from '../models/revenue-capture.interface';
import { FinancialYearService, FinancialYear } from '../../../../../services/financial-year.service';
import { CompanyAccountService } from '../../../../services/company-account.service';
import { CompanyAccount } from '../../../../services/company-account.interface';
import { FinancialDataTransformerService } from '../../../../services/financial-data-transformer.service';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Component for capturing and managing yearly revenue data across financial years
 */
@Component({
  selector: 'app-company-revenue-capture',
  standalone: true,
  imports: [CommonModule, FormsModule, YearGroupComponent],
  template: `
    <div class="p-6 space-y-8 bg-gray-50 min-h-screen w-full">
      <!-- Header Section -->
      <header class="flex justify-between items-center">
        <div class="space-y-1">
          <h1 class="text-2xl font-semibold text-gray-800">Yearly Revenue Capture Pro</h1>
          <p class="text-gray-600">Manage monthly revenue data across financial years</p>
        </div>
        <div class="flex items-center gap-3">
          <!-- Financial Year Selector -->
          <div class="flex items-center gap-2">
            <select
              [(ngModel)]="selectedFinancialYearId"
              (change)="onFinancialYearChange()"
              class="px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm">
              <option value="">Select Financial Year</option>
              <option *ngFor="let fy of availableFinancialYears()" [value]="fy.id" [class.font-bold]="fy.is_active">
                {{ fy.name }} {{ fy.is_active ? '(Active)' : '' }}
              </option>
            </select>
            <button
              type="button"
              (click)="openManagementModal()"
              class="px-3 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors border border-blue-200"
              title="Manage Financial Years & Accounts">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
            </button>
          </div>
          <button
            type="button"
            (click)="addYear()"
            [disabled]="!selectedFinancialYearId"
            class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Add Year
          </button>
        </div>
      </header>

      <!-- Summary Statistics -->
      <section class="grid grid-cols-1 md:grid-cols-3 gap-6" role="region" aria-label="Revenue Statistics">
        <div class="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div class="text-sm text-gray-500 font-medium">Total Years</div>
          <div class="text-2xl font-semibold text-gray-800 mt-1">{{ years().length }}</div>
        </div>
        <div class="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div class="text-sm text-gray-500 font-medium">Total Revenue</div>
          <div class="text-2xl font-semibold text-blue-600 mt-1">R {{ totalRevenue() | number:'1.0-2' }}</div>
        </div>
        <div class="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div class="text-sm text-gray-500 font-medium">Active Years</div>
          <div class="text-2xl font-semibold text-emerald-600 mt-1">{{ activeYears() }}</div>
        </div>
      </section>

      <!-- Year Groups Section -->
      <section class="space-y-8" role="main" aria-label="Financial Year Groups">
        <!-- Empty State -->
        <div *ngIf="years().length === 0" class="text-center py-12 bg-white rounded-lg border border-gray-200 shadow-sm">
          <svg class="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
          </svg>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No financial years yet</h3>
          <p class="text-gray-500 mb-4">Get started by adding your first financial year</p>
          <button
            type="button"
            (click)="addYear()"
            class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200">
            Add First Year
          </button>
        </div>

        <!-- Year Group List -->
        <app-year-group
          *ngFor="let year of years(); trackBy: trackYear"
          [year]="year"
          [availableAccounts]="availableAccounts()"
          [companyId]="companyId()"
          (yearChanged)="onYearChanged($event)"
          (deleteYear)="deleteYear($event)"
          (accountsUpdateRequested)="onDataUpdated()">
        </app-year-group>
      </section>

      <!-- Footer -->
      <footer class="text-center text-gray-500 text-sm py-6 border-t border-gray-200">
        <p class="flex items-center justify-center gap-2">
          <span class="text-base">💡</span>
          <span>Click on year headers to expand/collapse. Use tab to navigate between inputs.</span>
        </p>
      </footer>

      <!-- Management Modal -->
      <!-- TODO: Add FinancialManagementModalComponent when ready -->
      <div *ngIf="showManagementModal()" class="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">Management Modal</h3>
          <p class="text-gray-600 mb-4">This will be replaced with the full FinancialManagementModalComponent.</p>
          <button
            type="button"
            (click)="closeManagementModal()"
            class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
            Close
          </button>
        </div>
      </div>
    </div>
  `
})
export class CompanyRevenueCaptureComponent implements OnInit {
  // Constants
  private static readonly DEFAULT_START_MONTH = 3; // March
  private static readonly DEFAULT_END_MONTH = 2;   // February
  private static readonly DEFAULT_ACCOUNT_ID = 1;

  // Input properties
  companyId = signal<number>(1); // TODO: Get from route or parent component

  // Reactive signals
  readonly years = signal<YearGroup[]>([]);
  readonly availableFinancialYears = signal<FinancialYear[]>([]);
  readonly availableAccounts = signal<CompanyAccount[]>([]);

  // Selected financial year
  selectedFinancialYearId: string = '';

  // UI state
  readonly showManagementModal = signal(false);

  // Computed properties
  readonly totalRevenue = computed(() =>
    this.years().reduce((total, year) => total + this.calculateYearTotal(year), 0)
  );

  readonly activeYears = computed(() =>
    this.years().filter(year => year.isActive).length
  );

  constructor(
    private financialYearService: FinancialYearService,
    private companyAccountService: CompanyAccountService,
    private transformerService: FinancialDataTransformerService
  ) {}

  ngOnInit() {
    this.loadFinancialYears();
    this.loadCompanyAccounts();
    this.loadYearlyData();
  }  /**
   * Track function for ngFor to optimize rendering
   */
  trackYear = (index: number, year: YearGroup): number => year.id;

  /**
   * Load financial years from API
   */
  private loadFinancialYears(): void {
    this.financialYearService.getAllFinancialYears().subscribe({
      next: (years: FinancialYear[]) => {
        this.availableFinancialYears.set(years);
        // Auto-select the active financial year
        const activeYear = years.find((year: FinancialYear) => year.is_active);
        if (activeYear && !this.selectedFinancialYearId) {
          this.selectedFinancialYearId = activeYear.id.toString();
        }
      },
      error: (error: any) => {
        console.error('Failed to load financial years:', error);
      }
    });
  }

  /**
   * Load company accounts from API
   */
  private loadCompanyAccounts(): void {
    const companyId = this.companyId();
    if (companyId) {
      this.companyAccountService.getAccountsByCompany(companyId, false).subscribe({
        next: (response: any) => {
          if (response.success) {
            this.availableAccounts.set(response.data);
          }
        },
        error: (error: any) => {
          console.error('Failed to load company accounts:', error);
        }
      });
    }
  }

  /**
   * Handle financial year selection change
   */
  onFinancialYearChange(): void {
    // Reload data when financial year selection changes
    console.log('Financial year changed to:', this.selectedFinancialYearId);
    this.loadYearlyData();
  }

  /**
   * Open the management modal
   */
  openManagementModal(): void {
    this.showManagementModal.set(true);
  }

  /**
   * Close the management modal
   */
  closeManagementModal(): void {
    this.showManagementModal.set(false);
  }

  /**
   * Handle data updates from management modal
   */
  onDataUpdated(): void {
    this.loadFinancialYears();
    this.loadCompanyAccounts();
    this.loadYearlyData(); // Reload the actual yearly data
  }

  /**
   * Add a new financial year
   */
  addYear(): void {
    const currentYear = new Date().getFullYear();
    const newId = this.generateNewYearId();

    const newYear: YearGroup = {
      id: newId,
      name: `FY ${currentYear}/${(currentYear + 1).toString().slice(-2)}`,
      startMonth: CompanyRevenueCaptureComponent.DEFAULT_START_MONTH,
      endMonth: CompanyRevenueCaptureComponent.DEFAULT_END_MONTH,
      expanded: true,
      isActive: true,
      accounts: [this.createEmptyAccount(CompanyRevenueCaptureComponent.DEFAULT_ACCOUNT_ID)]
    };

    this.years.update(years => [...years, newYear]);
  }

  /**
   * Delete a financial year by ID
   */
  deleteYear(yearId: number): void {
    this.years.update(years => years.filter(year => year.id !== yearId));
  }

  /**
   * Handle year changes from child components
   */
  onYearChanged(updatedYear: YearGroup): void {
    this.years.update(years =>
      years.map(year => year.id === updatedYear.id ? updatedYear : year)
    );
  }

  /**
   * Calculate the total revenue for a specific year
   */
  private calculateYearTotal(year: YearGroup): number {
    return year.accounts.reduce((total, account) => total + (account.total || 0), 0);
  }

  /**
   * Generate a new unique ID for a year
   */
  private generateNewYearId(): number {
    const existingIds = this.years().map(year => year.id);
    return existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
  }

  /**
   * Create an empty account record with default values
   */
  private createEmptyAccount(id: number): AccountRecord {
    return {
      id,
      accountName: '',
      months: {
        m1: null, m2: null, m3: null, m4: null,
        m5: null, m6: null, m7: null, m8: null,
        m9: null, m10: null, m11: null, m12: null
      },
      total: 0
    };
  }

  /**
   * Load yearly data from the database
   */
  private loadYearlyData(): void {
    const companyId = this.companyId();
    if (!companyId) return;

    // Load all financial years first, then load data for each
    this.financialYearService.getAllFinancialYears().subscribe({
      next: (years: FinancialYear[]) => {
        if (years.length === 0) {
          this.years.set([]);
          return;
        }

        // For each financial year, load the yearly stats data
        const yearDataLoaders = years.map(year => {
          return this.transformerService.getYearData(companyId, year.id).pipe(
            map(yearData => {
              if (!yearData) {
                // Return empty year group if no data
                return this.createEmptyYearGroup(year);
              }

              // Transform the yearly stats data into YearGroup format
              const accounts: AccountRecord[] = [];

              // Convert each stats record to an AccountRecord
              yearData.monthlyData.forEach((stats, accountId) => {
                const account = yearData.accounts.find(acc => acc.id === accountId) ||
                                (accountId === 0 ? { id: 0, account_name: 'Company Total' } : null);

                if (account) {
                  const monthlyInput = this.transformerService.statsToMonthlyInput(stats);
                  accounts.push({
                    id: stats.id,
                    accountName: account.account_name,
                    months: {
                      m1: monthlyInput.months[0] || 0,
                      m2: monthlyInput.months[1] || 0,
                      m3: monthlyInput.months[2] || 0,
                      m4: monthlyInput.months[3] || 0,
                      m5: monthlyInput.months[4] || 0,
                      m6: monthlyInput.months[5] || 0,
                      m7: monthlyInput.months[6] || 0,
                      m8: monthlyInput.months[7] || 0,
                      m9: monthlyInput.months[8] || 0,
                      m10: monthlyInput.months[9] || 0,
                      m11: monthlyInput.months[10] || 0,
                      m12: monthlyInput.months[11] || 0
                    },
                    total: monthlyInput.total
                  });
                }
              });

              return {
                id: year.id,
                name: year.name,
                startMonth: CompanyRevenueCaptureComponent.DEFAULT_START_MONTH,
                endMonth: CompanyRevenueCaptureComponent.DEFAULT_END_MONTH,
                expanded: year.is_active, // Expand active years by default
                isActive: year.is_active,
                accounts: accounts
              } as YearGroup;
            })
          );
        });

        // Execute all loaders and combine results
        forkJoin(yearDataLoaders).subscribe({
          next: (yearGroups: YearGroup[]) => {
            this.years.set(yearGroups);
            console.log('Loaded yearly data:', yearGroups);
          },
          error: (error: any) => {
            console.error('Failed to load yearly data:', error);
            // Fallback to empty years
            this.years.set(years.map(year => this.createEmptyYearGroup(year)));
          }
        });
      },
      error: (error: any) => {
        console.error('Failed to load financial years for data:', error);
      }
    });
  }

  /**
   * Create an empty year group for a financial year with no data
   */
  private createEmptyYearGroup(year: FinancialYear): YearGroup {
    return {
      id: year.id,
      name: year.name,
      startMonth: CompanyRevenueCaptureComponent.DEFAULT_START_MONTH,
      endMonth: CompanyRevenueCaptureComponent.DEFAULT_END_MONTH,
      expanded: year.is_active,
      isActive: year.is_active,
      accounts: []
    };
  }
}
