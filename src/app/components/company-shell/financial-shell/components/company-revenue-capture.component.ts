import { Component, signal, computed, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { YearGroupComponent } from './year-group.component';
import { FinancialManagementModalComponent } from './financial-management-modal.component';
import { YearGroup, AccountRecord, AccountChangeEvent } from '../models/revenue-capture.interface';
import { FinancialYearService, FinancialYear } from '../../../../../services/financial-year.service';
import { CompanyAccountService } from '../../../../services/company-account.service';
import { CompanyAccount } from '../../../../services/company-account.interface';
import { FinancialDataTransformerService } from '../../../../services/financial-data-transformer.service';
import { CompanyFinancialYearlyStatsService, CompanyFinancialYearlyStats } from '../../../../../services/company-financial-yearly-stats.service';
import { forkJoin } from 'rxjs';
import { debounceTime, Subject } from 'rxjs';
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
          <!-- Add New Financial Year Section -->
          <div class="flex items-center gap-2">
            <label for="addYearSelect" class="text-sm font-medium text-gray-700">Add Year:</label>
            <select
              id="addYearSelect"
              [(ngModel)]="selectedFinancialYearId"
              class="px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm">
              <option value="">Select year to add...</option>
              <option *ngFor="let fy of availableYearsToAdd()" [value]="fy.id" [class.font-bold]="fy.is_active">
                {{ fy.name }} {{ fy.is_active ? '(Active)' : '' }}
              </option>
            </select>
            <button
              type="button"
              (click)="addNewFinancialYear()"
              [disabled]="!selectedFinancialYearId || availableYearsToAdd().length === 0"
              class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
              </svg>
              Add Year
            </button>
          </div>
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
        <!-- Loading State -->
        <div *ngIf="loading()" class="text-center py-12 bg-white rounded-lg border border-gray-200 shadow-sm">
          <div class="flex justify-center items-center space-x-2">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span class="text-gray-600">Loading financial data...</span>
          </div>
        </div>

        <!-- Empty State -->
        <div *ngIf="!loading() && years().length === 0" class="text-center py-12 bg-white rounded-lg border border-gray-200 shadow-sm">
          <svg class="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
          </svg>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No financial data captured yet</h3>
          <p class="text-gray-500 mb-4">Start by adding a financial year from the dropdown above, then begin capturing your monthly revenue data.</p>
          <div class="text-sm text-gray-400">
            <span class="inline-flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Only financial years with captured data are displayed
            </span>
          </div>
        </div>

        <!-- Year Group List -->
        <app-year-group
          *ngFor="let year of years(); trackBy: trackYear"
          [year]="year"
          [availableAccounts]="availableAccounts()"
          [companyId]="companyId()"
          (yearChanged)="onYearChanged($event)"
          (accountChanged)="onAccountChanged($event)"
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
  readonly allYearlyStats = signal<CompanyFinancialYearlyStats[]>([]);
  readonly loading = signal<boolean>(false);

  // Selected financial year
  selectedFinancialYearId: string = '';

  // UI state
  readonly showManagementModal = signal(false);

  // Debounced save mechanism
  private saveSubject = new Subject<YearGroup>();
  private accountSaveSubject = new Subject<AccountChangeEvent>();

  // Computed properties
  readonly totalRevenue = computed(() =>
    this.years().reduce((total, year) => total + this.calculateYearTotal(year), 0)
  );

  readonly activeYears = computed(() =>
    this.years().filter(year => year.isActive).length
  );

  // Available financial years that don't have data yet (for adding new ones)
  readonly availableYearsToAdd = computed(() => {
    const existingYearIds = this.years().map(year => year.id);
    return this.availableFinancialYears().filter(year => !existingYearIds.includes(year.id));
  });

  constructor(
    private financialYearService: FinancialYearService,
    private companyAccountService: CompanyAccountService,
    private transformerService: FinancialDataTransformerService,
    private yearlyStatsService: CompanyFinancialYearlyStatsService
  ) {}

  ngOnInit() {
    // Set up debounced save for full year changes (wait 500ms after user stops typing)
    this.saveSubject.pipe(
      debounceTime(500)
    ).subscribe(year => {
      this.saveYearChangesToDatabase(year);
    });

    // Set up debounced save for individual account changes (wait 300ms)
    this.accountSaveSubject.pipe(
      debounceTime(300)
    ).subscribe(({yearId, account, action = 'update'}) => {
      this.saveAccountToDatabase(yearId, account, action);
    });

    this.loadAllData();
  }  /**
   * Handle account changes from child components
   */
  onAccountChanged(event: AccountChangeEvent): void {
    console.log(`🔄 Account changed: ${event.account.accountName} (${event.action})`);

    // Update local state immediately for UI responsiveness
    this.years.update(years =>
      years.map(year => {
        if (year.id === event.yearId) {
          return {
            ...year,
            accounts: year.accounts.map(acc =>
              acc.id === event.account.id ? { ...event.account } : acc
            )
          };
        }
        return year;
      })
    );

    // Debounce the database save for this specific account
    this.accountSaveSubject.next(event);
  }

  /**
   * Track function for ngFor to optimize rendering
   */
  trackYear = (index: number, year: YearGroup): number => year.id;

  /**
   * Load all required data in a single efficient call
   */
  private loadAllData(): void {
    const companyId = this.companyId();
    if (!companyId) return;

    this.loading.set(true);

    // Load all data in parallel using forkJoin
    forkJoin({
      financialYears: this.financialYearService.getAllFinancialYears(),
      accounts: this.companyAccountService.getAccountsByCompany(companyId, false),
      yearlyStats: this.yearlyStatsService.getAllCompanyStats(companyId)
    }).subscribe({
      next: (data) => {
        console.log('All data loaded:', data);

        // Store all data in signals
        this.availableFinancialYears.set(data.financialYears);
        this.availableAccounts.set(data.accounts.success ? data.accounts.data : []);
        this.allYearlyStats.set(data.yearlyStats);

        // Auto-select active financial year
        const activeYear = data.financialYears.find(year => year.is_active);
        if (activeYear && !this.selectedFinancialYearId) {
          this.selectedFinancialYearId = activeYear.id.toString();
        }

        // Transform data into year groups
        this.transformDataToYearGroups();

        this.loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load data:', error);
        this.loading.set(false);
      }
    });
  }

  /**
   * Transform loaded data into YearGroup format for the UI
   * Only shows financial years that have actual data captured
   */
  private transformDataToYearGroups(): void {
    const financialYears = this.availableFinancialYears();
    const accounts = this.availableAccounts();
    const yearlyStats = this.allYearlyStats();

    // Get unique financial year IDs that have data
    const yearIdsWithData = [...new Set(yearlyStats.map(stat => stat.financial_year_id))];

    // Only create year groups for financial years that have actual data
    const yearGroups: YearGroup[] = financialYears
      .filter(year => yearIdsWithData.includes(year.id))
      .map(year => {
        // Get stats for this specific year
        const yearStats = yearlyStats.filter(stat => stat.financial_year_id === year.id);

        // Convert each stats record to an AccountRecord
        const accountRecords: AccountRecord[] = yearStats.map(stat => {
          const account = accounts.find(acc => acc.id === stat.account_id) ||
                         (stat.account_id === null ? { id: 0, account_name: 'Company Total' } : null);

          if (!account) {
            console.warn('Account not found for stats:', stat);
            return null;
          }

          return {
            id: stat.id,
            accountId: stat.account_id,
            accountName: account.account_name,
            months: {
              m1: stat.m1 || 0,
              m2: stat.m2 || 0,
              m3: stat.m3 || 0,
              m4: stat.m4 || 0,
              m5: stat.m5 || 0,
              m6: stat.m6 || 0,
              m7: stat.m7 || 0,
              m8: stat.m8 || 0,
              m9: stat.m9 || 0,
              m10: stat.m10 || 0,
              m11: stat.m11 || 0,
              m12: stat.m12 || 0
            },
            total: stat.total_amount
          };
        }).filter(record => record !== null) as AccountRecord[];

        return {
          id: year.id,
          name: year.name,
          startMonth: CompanyRevenueCaptureComponent.DEFAULT_START_MONTH,
          endMonth: CompanyRevenueCaptureComponent.DEFAULT_END_MONTH,
          expanded: year.is_active, // Expand active years by default
          isActive: year.is_active,
          accounts: accountRecords
        };
      });

    this.years.set(yearGroups);
    console.log('Year groups created (only with data):', yearGroups);
  }

  /**
   * Handle financial year selection change
   */
  onFinancialYearChange(): void {
    // When financial year selection changes, just re-transform the existing data
    console.log('Financial year changed to:', this.selectedFinancialYearId);
    // No need to reload data, just re-filter/transform what we have
  }

  /**
   * Add a new financial year to the display
   * Creates an empty year group for the selected financial year
   */
  addNewFinancialYear(): void {
    if (!this.selectedFinancialYearId) {
      console.warn('No financial year selected');
      return;
    }

    const yearId = parseInt(this.selectedFinancialYearId);
    const selectedYear = this.availableFinancialYears().find(year => year.id === yearId);

    if (!selectedYear) {
      console.warn('Selected financial year not found');
      return;
    }

    // Check if year already exists
    const existingYear = this.years().find(year => year.id === yearId);
    if (existingYear) {
      console.warn('Financial year already exists');
      return;
    }

    // Create new empty year group
    const newYearGroup: YearGroup = {
      id: selectedYear.id,
      name: selectedYear.name,
      startMonth: CompanyRevenueCaptureComponent.DEFAULT_START_MONTH,
      endMonth: CompanyRevenueCaptureComponent.DEFAULT_END_MONTH,
      expanded: true, // Expand new years by default
      isActive: selectedYear.is_active,
      accounts: [] // Start with empty accounts
    };

    // Add to the years array
    const currentYears = this.years();
    this.years.set([...currentYears, newYearGroup]);

    // Reset selection
    this.selectedFinancialYearId = '';

    console.log('Added new financial year:', newYearGroup);
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
    // Reload all data when updates happen
    this.loadAllData();
  }

  /**
   * Delete a financial year by ID
   */
  deleteYear(yearId: number): void {
    this.years.update(years => years.filter(year => year.id !== yearId));
  }

  /**
   * Handle year changes from child components
   * Updates the local state and debounces database saves
   */
  onYearChanged(updatedYear: YearGroup): void {
    console.log('💾 Year data changed:', updatedYear.name);

    // Update local state immediately for UI responsiveness
    this.years.update(years =>
      years.map(year => year.id === updatedYear.id ? updatedYear : year)
    );

    // Note: Individual account changes are now handled by onAccountChanged()
    // This method is mainly for structural changes (add/remove accounts, etc.)
  }

  /**
   * Save a specific account's changes to the database
   */
  private saveAccountToDatabase(yearId: number, account: AccountRecord, action: 'insert' | 'update' = 'update'): void {
    const companyId = this.companyId();
    console.log(`🔄 ${action === 'insert' ? 'Creating' : 'Updating'} account: ${account.accountName} (Company ID: ${companyId}, Year ID: ${yearId})`);

    // Convert AccountRecord to MonthlyInputData format
    const monthlyData = this.accountRecordToMonthlyInput(account, yearId);

    if (action === 'insert') {
      // For insert operations, remove the statsId and force creation
      const insertData = { ...monthlyData };
      delete insertData.statsId; // Remove ID to force insert

      console.log(`💡 Inserting new account record:`, {
        accountId: insertData.accountId,
        accountName: account.accountName,
        companyId: companyId,
        financialYearId: yearId,
        total: insertData.total
      });

      // Use upsert to handle potential duplicates safely
      this.transformerService.saveMonthlyData(insertData, companyId, yearId)
        .subscribe({
          next: (result) => {
            console.log(`✅ Successfully inserted: ${account.accountName}`, result);

            // Update the local account with the new database ID
            if (result.id) {
              this.updateAccountIdInLocalState(yearId, account.id, result.id);
            }
          },
          error: (error) => {
            console.error(`❌ Failed to insert: ${account.accountName}`, error);
          }
        });
    } else {
      // For update operations, use existing logic
      if (account.id && account.id > 0) {
        console.log(`💡 Updating existing account record:`, {
          statsId: monthlyData.statsId,
          accountId: monthlyData.accountId,
          accountName: account.accountName,
          total: monthlyData.total
        });

        this.transformerService.saveMonthlyData(monthlyData, companyId, yearId)
          .subscribe({
            next: (result) => {
              console.log(`✅ Successfully updated: ${account.accountName}`, result);
            },
            error: (error) => {
              console.error(`❌ Failed to update: ${account.accountName}`, error);
            }
          });
      } else {
        console.log(`⏭️ Skipping update for new/empty account: ${account.accountName} (ID: ${account.id})`);
      }
    }
  }

  /**
   * Update the account ID in local state after successful database insert
   */
  private updateAccountIdInLocalState(yearId: number, oldAccountId: number, newAccountId: number): void {
    this.years.update(years =>
      years.map(year => {
        if (year.id === yearId) {
          return {
            ...year,
            accounts: year.accounts.map(acc =>
              acc.id === oldAccountId ? { ...acc, id: newAccountId } : acc
            )
          };
        }
        return year;
      })
    );
    console.log(`🔄 Updated local account ID from ${oldAccountId} to ${newAccountId}`);
  }

  /**
   * Save year changes to the database (legacy method for bulk changes)
   */
  private saveYearChangesToDatabase(year: YearGroup): void {
    const companyId = this.companyId();
    console.log(`🔄 Bulk saving changes for ${year.name} (Company ID: ${companyId}) - Legacy method`);
    console.log(`ℹ️ Note: Individual account changes are now handled by saveAccountToDatabase()`);

    // This method is now mainly for structural changes or bulk operations
    // Individual account changes should use the new saveAccountToDatabase method
    year.accounts.forEach((account, index) => {
      if (account.id && account.id > 0) {
        const monthlyData = this.accountRecordToMonthlyInput(account, year.id);

        console.log(`💡 Bulk saving account ${index + 1}/${year.accounts.length}: ${account.accountName}`, {
          statsId: monthlyData.statsId,
          accountId: monthlyData.accountId,
          total: monthlyData.total
        });

        this.transformerService.saveMonthlyData(monthlyData, companyId, year.id)
          .subscribe({
            next: (result) => {
              console.log(`✅ Bulk saved: ${account.accountName}`, result);
            },
            error: (error) => {
              console.error(`❌ Failed to bulk save: ${account.accountName}`, error);
            }
          });
      } else {
        console.log(`⏭️ Skipping new/empty account in bulk save: ${account.accountName}`);
      }
    });
  }  /**
   * Convert AccountRecord to MonthlyInputData format for saving
   */
  private accountRecordToMonthlyInput(account: AccountRecord, financialYearId: number): any {
    return {
      accountId: account.accountId, // Use the actual account_id from the database
      months: [
        account.months['m1'] || 0,
        account.months['m2'] || 0,
        account.months['m3'] || 0,
        account.months['m4'] || 0,
        account.months['m5'] || 0,
        account.months['m6'] || 0,
        account.months['m7'] || 0,
        account.months['m8'] || 0,
        account.months['m9'] || 0,
        account.months['m10'] || 0,
        account.months['m11'] || 0,
        account.months['m12'] || 0
      ],
      total: account.total,
      statsId: account.id > 0 ? account.id : undefined, // Only include if valid existing record
      financialYearId: financialYearId
    };
  }

  /**
   * Calculate the total revenue for a specific year
   */
  private calculateYearTotal(year: YearGroup): number {
    return year.accounts.reduce((total, account) => total + (account.total || 0), 0);
  }
}
