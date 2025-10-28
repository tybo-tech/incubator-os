import { Component, Input, Output, EventEmitter, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompanyAccountService } from '../../../../services/company-account.service';
import { CompanyAccount, AccountType } from '../../../../services/company-account.interface';
import { ToastService } from '../../../../services/toast.service';

/**
 * Simple modal for managing company accounts
 */
@Component({
  selector: 'app-account-management-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="isOpen()" class="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <!-- Modal Header -->
        <header class="flex justify-between items-center p-4 border-b border-gray-200 bg-blue-50">
          <h2 class="text-lg font-semibold text-blue-800">Manage Company Accounts</h2>
          <button
            type="button"
            (click)="close()"
            class="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </header>

        <!-- Modal Body -->
        <div class="flex-1 overflow-y-auto p-4">
          <!-- Add New Account -->
          <div class="mb-4 p-3 bg-blue-50 rounded-lg">
            <div class="grid grid-cols-4 gap-3">
              <input
                type="text"
                [(ngModel)]="newAccount.account_name"
                placeholder="Account Name*"
                class="px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm">
              <select
                [(ngModel)]="newAccount.account_type"
                class="px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm">
                <option *ngFor="let type of accountTypes()" [value]="type.key">
                  {{ type.label }}
                </option>
              </select>
              <input
                type="text"
                [(ngModel)]="newAccount.account_number"
                placeholder="Account Number (Optional)"
                class="px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm">
              <input
                type="text"
                [(ngModel)]="newAccount.description"
                placeholder="Description (Optional)"
                class="px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm">
            </div>
            <div class="mt-2 flex justify-end">
              <button
                type="button"
                (click)="addAccount()"
                [disabled]="!newAccount.account_name || loading()"
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-sm">
                {{ loading() ? 'Adding...' : 'Add Account' }}
              </button>
            </div>
          </div>

          <!-- Accounts Table -->
          <div class="border border-gray-200 rounded-lg overflow-hidden">
            <table class="min-w-full text-sm">
              <thead class="bg-blue-50">
                <tr>
                  <th class="px-4 py-3 text-left font-semibold text-blue-800">Account Name</th>
                  <th class="px-4 py-3 text-left font-semibold text-blue-800">Type</th>
                  <th class="px-4 py-3 text-left font-semibold text-blue-800">Account Number</th>
                  <th class="px-4 py-3 text-left font-semibold text-blue-800">Description</th>
                  <th class="px-4 py-3 text-center font-semibold text-blue-800">Status</th>
                  <th class="px-4 py-3 text-center font-semibold text-blue-800">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr *ngFor="let account of accounts(); let i = index"
                    [class.bg-green-50]="account.is_active"
                    [class.opacity-60]="!account.is_active"
                    class="hover:bg-gray-50">
                  <!-- Account Name -->
                  <td class="px-4 py-3">
                    <input
                      *ngIf="editingId() === account.id; else displayAccountName"
                      type="text"
                      [(ngModel)]="account.account_name"
                      class="w-full px-2 py-1 border border-blue-200 rounded focus:ring-1 focus:ring-blue-500 text-sm">
                    <ng-template #displayAccountName>
                      <span class="font-medium text-gray-900">{{ account.account_name }}</span>
                    </ng-template>
                  </td>

                  <!-- Account Type -->
                  <td class="px-4 py-3">
                    <select
                      *ngIf="editingId() === account.id; else displayAccountType"
                      [(ngModel)]="account.account_type"
                      class="w-full px-2 py-1 border border-blue-200 rounded focus:ring-1 focus:ring-blue-500 text-sm">
                      <option *ngFor="let type of accountTypes()" [value]="type.key">
                        {{ type.label }}
                      </option>
                    </select>
                    <ng-template #displayAccountType>
                      <span [class]="'inline-flex px-2 py-1 text-xs font-medium rounded-full ' + getAccountTypeBadgeClass(account.account_type)">
                        {{ getAccountTypeLabel(account.account_type) }}
                      </span>
                    </ng-template>
                  </td>

                  <!-- Account Number -->
                  <td class="px-4 py-3">
                    <input
                      *ngIf="editingId() === account.id; else displayAccountNumber"
                      type="text"
                      [(ngModel)]="account.account_number"
                      class="w-full px-2 py-1 border border-blue-200 rounded focus:ring-1 focus:ring-blue-500 text-sm">
                    <ng-template #displayAccountNumber>
                      <span class="text-gray-600">{{ account.account_number || '-' }}</span>
                    </ng-template>
                  </td>

                  <!-- Description -->
                  <td class="px-4 py-3">
                    <input
                      *ngIf="editingId() === account.id; else displayDescription"
                      type="text"
                      [(ngModel)]="account.description"
                      class="w-full px-2 py-1 border border-blue-200 rounded focus:ring-1 focus:ring-blue-500 text-sm">
                    <ng-template #displayDescription>
                      <span class="text-gray-600">{{ account.description || '-' }}</span>
                    </ng-template>
                  </td>

                  <!-- Status -->
                  <td class="px-4 py-3 text-center">
                    <span *ngIf="account.is_active" class="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      Active
                    </span>
                    <span *ngIf="!account.is_active" class="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                      Inactive
                    </span>
                  </td>

                  <!-- Actions -->
                  <td class="px-4 py-3 text-center">
                    <div class="flex justify-center gap-1">
                      <!-- Edit/Save/Cancel -->
                      <button
                        *ngIf="editingId() !== account.id"
                        type="button"
                        (click)="startEdit(account)"
                        class="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                        title="Edit">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                      </button>
                      <button
                        *ngIf="editingId() === account.id"
                        type="button"
                        (click)="saveEdit(account)"
                        class="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                        title="Save">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                      </button>
                      <button
                        *ngIf="editingId() === account.id"
                        type="button"
                        (click)="cancelEdit()"
                        class="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded transition-colors"
                        title="Cancel">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                      </button>

                      <!-- Status Toggle -->
                      <button
                        *ngIf="editingId() !== account.id"
                        type="button"
                        (click)="toggleStatus(account)"
                        [class.text-green-600]="!account.is_active"
                        [class.text-gray-600]="account.is_active"
                        [class.hover:bg-green-50]="!account.is_active"
                        [class.hover:bg-gray-50]="account.is_active"
                        class="p-1 rounded transition-colors"
                        [title]="account.is_active ? 'Deactivate Account' : 'Activate Account'">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path *ngIf="!account.is_active" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          <path *ngIf="account.is_active" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>

                <!-- Empty State -->
                <tr *ngIf="accounts().length === 0">
                  <td colspan="6" class="px-4 py-8 text-center text-gray-500">
                    No accounts found. Add one above to get started.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Modal Footer -->
        <footer class="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            (click)="close()"
            class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm">
            Close
          </button>
        </footer>
      </div>
    </div>
  `
})
export class AccountManagementModalComponent implements OnInit {
  @Input() companyId!: number;
  @Output() closed = new EventEmitter<void>();
  @Output() accountsUpdated = new EventEmitter<void>();

  // Modal state
  readonly isOpen = signal(false);
  readonly loading = signal(false);
  readonly accounts = signal<CompanyAccount[]>([]);
  readonly editingId = signal<number | null>(null);
  readonly accountTypes = signal<AccountType[]>([]);

  // Form data
  newAccount = {
    account_name: '',
    account_type: 'domestic_revenue' as const,
    account_number: '',
    description: ''
  };

  private originalAccount: CompanyAccount | null = null;

  private toastService = inject(ToastService);

  constructor(private companyAccountService: CompanyAccountService) {}

  ngOnInit() {
    this.loadAccountTypes();
    this.loadAccounts();
  }

  /**
   * Load account types from API
   */
  private loadAccountTypes() {
    this.companyAccountService.getAccountTypes().subscribe({
      next: (response) => {
        if (response.success) {
          // Convert the response data to AccountType array
          const types: AccountType[] = Object.entries(response.data).map(([key, label]) => ({
            key: key as any,
            label: label
          }));
          this.accountTypes.set(types);
        } else {
          // Use default account types as fallback
          this.accountTypes.set(this.companyAccountService.getDefaultAccountTypes());
        }
      },
      error: () => {
        // Use default account types as fallback
        this.accountTypes.set(this.companyAccountService.getDefaultAccountTypes());
      }
    });
  }

  /**
   * Open the modal
   */
  open() {
    this.isOpen.set(true);
    this.loadAccounts();
  }

  /**
   * Close the modal
   */
  close() {
    this.isOpen.set(false);
    this.cancelEdit();
    this.closed.emit();
  }

  /**
   * Load accounts from API
   */
  private loadAccounts() {
    if (!this.companyId) return;

    this.loading.set(true);
    // Load both active and inactive accounts for management
    this.companyAccountService.getAccountsByCompany(this.companyId, false).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (response.success) {
          this.accounts.set(response.data);
        }
      },
      error: (error) => {
        this.loading.set(false);
        console.error('Failed to load accounts:', error);
        this.toastService.error('Failed to load accounts. Please try again.');
      }
    });
  }

  /**
   * Add new account
   */
  addAccount() {
    if (!this.newAccount.account_name.trim()) {
      this.toastService.validationError('Account name is required');
      return;
    }

    this.loading.set(true);
    const accountData = {
      ...this.newAccount,
      company_id: this.companyId,
      is_active: true
    };

    this.companyAccountService.createAccount(accountData).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (response.success) {
          this.loadAccounts();
          this.resetNewAccount();
          this.accountsUpdated.emit();
        } else {
          this.toastService.error('Failed to add account. Please try again.');
        }
      },
      error: (error) => {
        this.loading.set(false);
        console.error('Failed to add account:', error);
        this.toastService.error('Failed to add account. Please try again.');
      }
    });
  }

  /**
   * Start editing an account
   */
  startEdit(account: CompanyAccount) {
    this.originalAccount = { ...account };
    this.editingId.set(account.id);
  }

  /**
   * Save edit changes
   */
  saveEdit(account: CompanyAccount) {
    if (!account.account_name.trim()) {
      this.toastService.validationError('Account name is required');
      return;
    }

    this.loading.set(true);
    this.companyAccountService.updateAccount(account.id, account).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (response.success) {
          this.editingId.set(null);
          this.originalAccount = null;
          this.loadAccounts();
          this.accountsUpdated.emit();
        } else {
          this.toastService.error('Failed to update account. Please try again.');
        }
      },
      error: (error) => {
        this.loading.set(false);
        console.error('Failed to update account:', error);
        this.toastService.error('Failed to update account. Please try again.');
      }
    });
  }

  /**
   * Cancel editing
   */
  cancelEdit() {
    if (this.originalAccount && this.editingId()) {
      const accounts = this.accounts();
      const index = accounts.findIndex(a => a.id === this.editingId());
      if (index !== -1) {
        accounts[index] = { ...this.originalAccount };
        this.accounts.set([...accounts]);
      }
    }
    this.editingId.set(null);
    this.originalAccount = null;
  }

  /**
   * Toggle account status between active and inactive
   */
  toggleStatus(account: CompanyAccount) {
    const action = account.is_active ? 'deactivate' : 'activate';
    const confirmMessage = `Are you sure you want to ${action} "${account.account_name}"?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    this.loading.set(true);
    this.companyAccountService.setAccountActive(account.id, !account.is_active).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (response.success) {
          this.loadAccounts();
          this.accountsUpdated.emit();
        } else {
          this.toastService.error(`Failed to ${action} account. Please try again.`);
        }
      },
      error: (error) => {
        this.loading.set(false);
        console.error(`Failed to ${action} account:`, error);
        this.toastService.error(`Failed to ${action} account. Please try again.`);
      }
    });
  }

  /**
   * Get account type label for display
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
   * Reset new account form
   */
  private resetNewAccount() {
    this.newAccount = {
      account_name: '',
      account_type: 'domestic_revenue' as const,
      account_number: '',
      description: ''
    };
  }
}
