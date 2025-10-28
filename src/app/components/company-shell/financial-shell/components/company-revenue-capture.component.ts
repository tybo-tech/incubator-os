import { Component, signal, computed, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { YearGroupComponent } from './year-group.component';
import { FinancialYearComparisonComponent } from './financial-year-comparison.component';
import { RevenueCaptureHeaderComponent } from './revenue-capture-header.component';
import { RevenueCaptureEmptyStateComponent } from './revenue-capture-empty-state.component';
import { RevenueCaptureLoadingComponent } from './revenue-capture-loading.component';
import { RevenueCaptureFooterComponent } from './revenue-capture-footer.component';
import { RevenueCaptureManagementModalComponent } from './revenue-capture-management-modal.component';
import { YearGroup, AccountChangeEvent, AccountRecord } from '../models/revenue-capture.interface';
import { FinancialYearService, FinancialYear } from '../../../../../services/financial-year.service';
import { CompanyAccountService } from '../../../../services/company-account.service';
import { CompanyAccount } from '../../../../services/company-account.interface';
import { CompanyFinancialYearlyStatsService, CompanyFinancialYearlyStats } from '../../../../../services/company-financial-yearly-stats.service';
import { forkJoin, Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import { RevenueCaptureHelperService } from '../services/revenue-capture-helper.service';

/**
 * Component for capturing and managing yearly revenue data across financial years
 * This is a smart container component that coordinates data loading and saving
 */
@Component({
  selector: 'app-company-revenue-capture',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    YearGroupComponent,
    FinancialYearComparisonComponent,
    RevenueCaptureHeaderComponent,
    RevenueCaptureEmptyStateComponent,
    RevenueCaptureLoadingComponent,
    RevenueCaptureFooterComponent,
    RevenueCaptureManagementModalComponent,
  ],
  template: `
    <div class="p-6 space-y-8 bg-gray-50 min-h-screen w-full">
      <!-- Header Section -->
      <app-revenue-capture-header
        [availableYears]="availableYearsToAdd()"
        [(selectedYearId)]="selectedFinancialYearId"
        (addYear)="addNewFinancialYear()"
        (openManagement)="openManagementModal()"
      ></app-revenue-capture-header>

      <!-- Financial Years Comparison Chart -->
      <section
        *ngIf="years().length > 1"
        role="region"
        aria-label="Financial Years Comparison"
        class="animate-in fade-in duration-500"
      >
        <app-financial-year-comparison
          [years]="years()"
        ></app-financial-year-comparison>
      </section>

      <!-- Year Groups Section -->
      <section class="space-y-8" role="main" aria-label="Financial Year Groups">
        <!-- Loading State -->
        <app-revenue-capture-loading
          *ngIf="loading()"
          message="Loading financial data..."
        ></app-revenue-capture-loading>

        <!-- Empty State -->
        <app-revenue-capture-empty-state
          *ngIf="!loading() && years().length === 0"
        ></app-revenue-capture-empty-state>

        <!-- Year Group List -->
        <app-year-group
          *ngFor="let year of years(); trackBy: trackYear"
          [year]="year"
          [availableAccounts]="availableAccounts()"
          [companyId]="companyId()"
          (yearChanged)="onYearChanged($event)"
          (accountChanged)="onAccountChanged($event)"
          (deleteYear)="deleteYear($event)"
          (accountsUpdateRequested)="onDataUpdated()"
        >
        </app-year-group>
      </section>

      <!-- Footer -->
      <app-revenue-capture-footer></app-revenue-capture-footer>

      <!-- Management Modal -->
      <app-revenue-capture-management-modal
        [isOpen]="showManagementModal()"
        (close)="closeManagementModal()"
      ></app-revenue-capture-management-modal>
    </div>
  `,
})
export class CompanyRevenueCaptureComponent implements OnInit, OnDestroy {
  // Inject services
  private route = inject(ActivatedRoute);
  private financialYearService = inject(FinancialYearService);
  private companyAccountService = inject(CompanyAccountService);
  private yearlyStatsService = inject(CompanyFinancialYearlyStatsService);
  private helperService = inject(RevenueCaptureHelperService);

  // State signals
  readonly companyId = signal<number>(0);
  readonly years = signal<YearGroup[]>([]);
  readonly availableFinancialYears = signal<FinancialYear[]>([]);
  readonly availableAccounts = signal<CompanyAccount[]>([]);
  readonly allYearlyStats = signal<CompanyFinancialYearlyStats[]>([]);
  readonly loading = signal<boolean>(false);
  readonly showManagementModal = signal(false);

  // UI state
  selectedFinancialYearId: string = '';

  // Reactive subjects
  private accountSaveSubject = new Subject<AccountChangeEvent>();
  private destroy$ = new Subject<void>();

  // Computed properties
  readonly totalRevenue = computed(() =>
    this.years().reduce((total, year) => total + this.helperService.calculateYearTotal(year), 0)
  );

  readonly activeYears = computed(() => this.years().filter((year) => year.isActive).length);

  readonly availableYearsToAdd = computed(() => {
    const existingYearIds = this.years().map((year) => year.id);
    return this.availableFinancialYears().filter((year) => !existingYearIds.includes(year.id));
  });

  ngOnInit() {
    // Set up debounced save for account changes
    this.accountSaveSubject
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(({ yearId, account, action = 'update' }) => {
        // Skip saving for create_empty and delete actions (handled immediately)
        if (action === 'create_empty' || action === 'delete' || !account) {
          return;
        }
        this.saveAccountToDatabase(yearId, account, action);
      });

    // Get company ID from route
    const companyId = +this.route.parent?.parent?.snapshot.params['id'];
    if (companyId && !isNaN(companyId)) {
      this.companyId.set(companyId);
      this.loadAllData();
    } else {
      console.error('Invalid company ID from route');
    }
  }

  ngOnDestroy() {
    this.accountSaveSubject.complete();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Track function for ngFor to optimize rendering
   */
  trackYear = (index: number, year: YearGroup): number => year.id;
  /**
   * Create empty account record in database and add to UI
   * This prevents data loss by ensuring each UI line has its own DB record
   */
  private createEmptyAccountRecord(yearId: number): void {
    const companyId = this.companyId();
    if (!companyId) return;

    // Create empty record in database using helper service
    this.helperService.createEmptyRecord(companyId, yearId).subscribe({
      next: (result) => {
        // Create UI record with the database ID
        const newAccount = {
          id: result.id, // Use actual database ID
          accountId: null,
          accountName: '',
          months: {
            m1: null, m2: null, m3: null, m4: null,
            m5: null, m6: null, m7: null, m8: null,
            m9: null, m10: null, m11: null, m12: null
          },
          total: 0
        };

        // Add to UI state at the end to maintain natural data entry order (oldest first)
        this.years.update((years) =>
          years.map((year) => {
            if (year.id === yearId) {
              return {
                ...year,
                accounts: [...year.accounts, newAccount] // Add at end (natural Excel-like flow)
              };
            }
            return year;
          })
        );

        console.log('✅ Empty account record created with DB ID:', result.id);
      },
      error: (error) => {
        console.error('❌ Failed to create empty account record:', error);
      }
    });
  }

  /**
   * Delete account record from database and remove from UI
   */
  private deleteAccountRecord(yearId: number, account: AccountRecord): void {
    // Delete from database using helper service
    this.helperService.deleteAccountData(account).subscribe({
      next: (result) => {
        if (result.success) {
          // Remove from UI state after successful database deletion
          this.years.update((years) =>
            years.map((year) => {
              if (year.id === yearId) {
                return {
                  ...year,
                  accounts: year.accounts.filter((acc) => acc.id !== account.id)
                };
              }
              return year;
            })
          );

          console.log('✅ Account record deleted successfully:', result.message);
        } else {
          console.error('❌ Failed to delete account record:', result);
        }
      },
      error: (error) => {
        console.error('❌ Failed to delete account record:', error);
        // You might want to show a user-friendly error message here
        alert('Failed to delete account. Please try again.');
      }
    });
  }

  /**
   * Handle account changes from child components
   */
  onAccountChanged(event: AccountChangeEvent): void {
    // Handle creating empty database record first
    if (event.action === 'create_empty') {
      this.createEmptyAccountRecord(event.yearId);
      return;
    }

    // Handle deleting account record
    if (event.action === 'delete') {
      this.deleteAccountRecord(event.yearId, event.account!);
      return;
    }

    // For other actions, account must be provided
    if (!event.account) {
      console.error('Account is required for action:', event.action);
      return;
    }

    // Update local state immediately for UI responsiveness
    this.years.update((years) =>
      years.map((year) => {
        if (year.id === event.yearId) {
          return {
            ...year,
            accounts: year.accounts.map((acc) =>
              acc.id === event.account!.id ? { ...event.account! } : acc
            ),
          };
        }
        return year;
      })
    );

    // Debounce the database save
    this.accountSaveSubject.next(event);
  }

  /**
   * Handle year changes from child components
   */
  onYearChanged(updatedYear: YearGroup): void {
    this.years.update((years) =>
      years.map((year) => (year.id === updatedYear.id ? updatedYear : year))
    );
  }

  /**
   * Load all required data efficiently using forkJoin
   */
  private loadAllData(): void {
    const companyId = this.companyId();
    if (!companyId) return;

    this.loading.set(true);

    forkJoin({
      financialYears: this.financialYearService.getAllFinancialYears(),
      accounts: this.companyAccountService.getAccountsByCompany(companyId, false),
      yearlyStats: this.yearlyStatsService.getAllCompanyStats(companyId),
    }).subscribe({
      next: (data) => {
        this.availableFinancialYears.set(data.financialYears);
        this.availableAccounts.set(data.accounts.success ? data.accounts.data : []);
        this.allYearlyStats.set(data.yearlyStats);

        // Auto-select active financial year
        const activeYear = data.financialYears.find((year) => year.is_active);
        if (activeYear && !this.selectedFinancialYearId) {
          this.selectedFinancialYearId = activeYear.id.toString();
        }

        // Transform data using helper service
        const yearGroups = this.helperService.transformToYearGroups(
          data.financialYears,
          data.accounts.success ? data.accounts.data : [],
          data.yearlyStats
        );
        this.years.set(yearGroups);

        this.loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load data:', error);
        this.loading.set(false);
      },
    });
  }

  /**
   * Add a new financial year to the display
   */
  addNewFinancialYear(): void {
    if (!this.selectedFinancialYearId) return;

    const yearId = parseInt(this.selectedFinancialYearId);
    const selectedYear = this.availableFinancialYears().find((year) => year.id === yearId);

    if (!selectedYear || this.years().find((year) => year.id === yearId)) return;

    // Create new empty year group using helper service
    const newYearGroup = this.helperService.createEmptyYearGroup(selectedYear);
    this.years.update((years) => [...years, newYearGroup]);
    this.selectedFinancialYearId = '';
  }

  /**
   * Modal management
   */
  openManagementModal(): void {
    this.showManagementModal.set(true);
  }

  closeManagementModal(): void {
    this.showManagementModal.set(false);
  }

  /**
   * Reload data when updates happen in management modal
   */
  onDataUpdated(): void {
    this.loadAllData();
  }

  /**
   * Delete a financial year
   */
  deleteYear(yearId: number): void {
    this.years.update((years) => years.filter((year) => year.id !== yearId));
  }

  /**
   * Save account changes to database using helper service
   */
  private saveAccountToDatabase(
    yearId: number,
    account: any,
    action: 'insert' | 'update' = 'update'
  ): void {
    const companyId = this.companyId();

    this.helperService.saveAccountData(account, yearId, companyId, action).subscribe({
      next: (result) => {
        // Update local account ID if this was an insert
        if (action === 'insert' && result.id) {
          this.updateAccountIdInLocalState(yearId, account.id, result.id);
        }
      },
      error: (error) => {
        console.error(`Failed to ${action} account:`, error);
      },
    });
  }

  /**
   * Update account ID in local state after successful insert
   */
  private updateAccountIdInLocalState(
    yearId: number,
    oldAccountId: number,
    newAccountId: number
  ): void {
    this.years.update((years) =>
      years.map((year) => {
        if (year.id === yearId) {
          return {
            ...year,
            accounts: year.accounts.map((acc) =>
              acc.id === oldAccountId ? { ...acc, id: newAccountId } : acc
            ),
          };
        }
        return year;
      })
    );
  }
}
