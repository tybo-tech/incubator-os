import { Component, Input, Output, EventEmitter, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompanyAccount } from '../../../../services/company-account.interface';
import { CompanyAccountService } from '../../../../services/company-account.service';
import { ToastService } from '../../../../services/toast.service';

/**
 * Enhanced account select component with inline account creation
 * Provides a better UX by allowing users to create accounts without opening a separate modal
 */
@Component({
  selector: 'app-enhanced-account-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative">
      <!-- Main Select Button -->
      <button
        type="button"
        (click)="toggleDropdown()"
        class="w-full flex items-center justify-between px-3 py-2 border border-gray-200 rounded-md bg-white text-left focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all hover:border-gray-300 text-sm">
        <span [class.text-gray-500]="!selectedAccount || selectedAccount === ''" [class.text-gray-900]="selectedAccount && selectedAccount !== ''">
          {{ getDisplayText() }}
        </span>
        <i class="fas fa-chevron-down text-gray-400 text-xs transition-transform duration-200"
           [class.rotate-180]="isOpen()"></i>
      </button>

      <!-- Dropdown Menu -->
      <div *ngIf="isOpen()"
           class="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg">        <!-- Available Accounts -->
        <div class="py-1">
          <div *ngIf="filteredAccounts().length === 0 && !isAddingNew()"
               class="px-3 py-2 text-gray-500 text-sm">
            No accounts available
          </div>

          <button
            *ngFor="let account of filteredAccounts(); trackBy: trackAccount"
            type="button"
            (click)="selectAccount(account)"
            class="w-full text-left px-3 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none text-sm transition-colors">
            <div class="flex items-center justify-between">
              <span class="font-medium text-gray-900">{{ getAccountDisplayName(account) }}</span>
              <span class="text-xs px-2 py-0.5 rounded-full"
                    [class]="getAccountTypeBadgeClass(account.account_type)">
                {{ getAccountTypeLabel(account.account_type) }}
              </span>
            </div>
          </button>
        </div>

        <!-- Divider -->
        <div *ngIf="filteredAccounts().length > 0" class="border-t border-gray-200"></div>

        <!-- Add New Account Section -->
        <div class="p-3 bg-blue-50">
          <div *ngIf="!isAddingNew(); else addNewForm">
            <button
              type="button"
              (click)="startAddingNew()"
              class="w-full flex items-center gap-2 px-3 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors text-sm font-medium">
              <i class="fas fa-plus"></i>
              <span>Add New Account</span>
            </button>
          </div>

          <ng-template #addNewForm>
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Account Name *</label>
                <input
                  type="text"
                  [(ngModel)]="newAccountName"
                  (keydown.enter)="createAccount()"
                  (keydown.escape)="cancelAddingNew()"
                  placeholder="Enter account name"
                  class="w-full px-3 py-2 border border-gray-200 rounded focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-sm"
                  #newAccountInput>
              </div>

              <div class="flex gap-2">
                <button
                  type="button"
                  (click)="createAccount()"
                  [disabled]="!newAccountName.trim() || isCreating()"
                  class="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-sm font-medium">
                  {{ isCreating() ? 'Creating...' : 'Create' }}
                </button>
                <button
                  type="button"
                  (click)="cancelAddingNew()"
                  class="px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors text-sm">
                  Cancel
                </button>
              </div>
            </div>
          </ng-template>
        </div>
      </div>

      <!-- Click Outside Handler -->
      <div *ngIf="isOpen()"
           class="fixed inset-0 z-40"
           (click)="closeDropdown()"></div>
    </div>
  `
})
export class EnhancedAccountSelectComponent implements OnInit {
  @Input() companyId!: number;
  @Input() selectedAccount: string = '';
  @Input() excludeAccountIds: number[] = []; // Accounts to exclude from selection

  @Output() accountSelected = new EventEmitter<string>();
  @Output() accountCreated = new EventEmitter<CompanyAccount>();

  // Internal signal for available accounts
  readonly availableAccounts = signal<CompanyAccount[]>([]);

  // Computed filtered accounts (excluding already used accounts)
  readonly filteredAccounts = computed(() => {
    const accounts = this.availableAccounts();
    const excludeIds = this.excludeAccountIds || [];
    return accounts.filter(account => !excludeIds.includes(account.id));
  });

  // Component state
  readonly isOpen = signal(false);
  readonly isAddingNew = signal(false);
  readonly isCreating = signal(false);

  // Form data
  newAccountName = '';

  // Services
  private companyAccountService = inject(CompanyAccountService);
  private toastService = inject(ToastService);

  /**
   * Set available accounts from parent
   */
  @Input() set accounts(value: CompanyAccount[]) {
    this.availableAccounts.set(value || []);
  }

  ngOnInit() {
    // Component is ready
  }

  /**
   * Toggle dropdown open/closed
   */
  toggleDropdown(): void {
    this.isOpen.set(!this.isOpen());
    if (!this.isOpen()) {
      this.cancelAddingNew();
    }
  }

  /**
   * Close dropdown
   */
  closeDropdown(): void {
    this.isOpen.set(false);
    this.cancelAddingNew();
  }

  /**
   * Select an existing account
   */
  selectAccount(account: CompanyAccount): void {
    this.accountSelected.emit(account.account_name);
    this.closeDropdown();
  }

  /**
   * Start adding a new account
   */
  startAddingNew(): void {
    this.isAddingNew.set(true);
    this.newAccountName = '';

    // Focus on the input after view update
    setTimeout(() => {
      const input = document.querySelector('input[placeholder="Enter account name"]') as HTMLInputElement;
      if (input) {
        input.focus();
      }
    }, 0);
  }

  /**
   * Cancel adding new account
   */
  cancelAddingNew(): void {
    this.isAddingNew.set(false);
    this.newAccountName = '';
  }

  /**
   * Create a new account
   */
  createAccount(): void {
    if (!this.newAccountName.trim()) {
      this.toastService.validationError('Account name is required');
      return;
    }

    // Check if account name already exists
    const existingAccount = this.filteredAccounts().find(
      account => account.account_name.toLowerCase() === this.newAccountName.trim().toLowerCase()
    );

    if (existingAccount) {
      this.toastService.validationError('An account with this name already exists');
      return;
    }

    this.isCreating.set(true);

    const accountData = {
      company_id: this.companyId,
      account_name: this.newAccountName.trim(),
      account_type: 'domestic_revenue' as const, // Default to domestic revenue as requested
      account_number: '',
      description: '',
      is_active: true
    };

    this.companyAccountService.createAccount(accountData).subscribe({
      next: (response) => {
        this.isCreating.set(false);
        if (response.success && response.data) {
          this.toastService.success(`Account "${response.data.account_name}" has been created and selected successfully`);

          // Emit the new account for parent to handle
          this.accountCreated.emit(response.data);

          // Auto-select the newly created account
          this.accountSelected.emit(response.data.account_name);

          // Close dropdown
          this.closeDropdown();
        } else {
          this.toastService.error('Failed to create account. Please try again.');
        }
      },
      error: (error) => {
        this.isCreating.set(false);
        console.error('Failed to create account:', error);
        this.toastService.error('Failed to create account. Please try again.');
      }
    });
  }

  /**
   * Get account display name
   */
  getAccountDisplayName(account: CompanyAccount): string {
    if (account.account_number) {
      return `${account.account_name} (${account.account_number})`;
    }
    return account.account_name;
  }

  /**
   * Get account type label
   */
  getAccountTypeLabel(accountType: string): string {
    return this.companyAccountService.getAccountTypeLabel(accountType);
  }

  /**
   * Get account type badge CSS class
   */
  getAccountTypeBadgeClass(accountType: string): string {
    return this.companyAccountService.getAccountTypeBadgeClass(accountType);
  }

  /**
   * Get display text for the button
   */
  getDisplayText(): string {
    if (!this.selectedAccount || this.selectedAccount.trim() === '') {
      return 'Select account...';
    }

    // Check if the selected account actually exists in our available accounts
    const accountExists = this.filteredAccounts().some(
      account => account.account_name === this.selectedAccount
    );

    if (!accountExists && this.selectedAccount) {
      return 'No account selected';
    }

    return this.selectedAccount;
  }

  /**
   * Track function for ngFor
   */
  trackAccount(index: number, account: CompanyAccount): number {
    return account.id;
  }
}
