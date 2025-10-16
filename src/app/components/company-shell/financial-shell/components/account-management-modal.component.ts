import { Component, Input, Output, EventEmitter, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompanyAccountService } from '../../../../services/company-account.service';
import { CompanyAccount } from '../../../../services/company-account.interface';

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
            <div class="grid grid-cols-3 gap-3">
              <input
                type="text"
                [(ngModel)]="newAccount.account_name"
                placeholder="Account Name*"
                class="px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm">
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

                      <!-- Toggle Active -->
                      <button
                        *ngIf="editingId() !== account.id"
                        type="button"
                        (click)="toggleStatus(account)"
                        [class.text-green-600]="!account.is_active"
                        [class.text-gray-600]="account.is_active"
                        class="p-1 hover:bg-gray-50 rounded transition-colors"
                        [title]="account.is_active ? 'Deactivate' : 'Activate'">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path *ngIf="!account.is_active" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          <path *ngIf="account.is_active" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                      </button>

                      <!-- Delete -->
                      <button
                        *ngIf="editingId() !== account.id"
                        type="button"
                        (click)="deleteAccount(account)"
                        class="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                        title="Delete">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>

                <!-- Empty State -->
                <tr *ngIf="accounts().length === 0">
                  <td colspan="5" class="px-4 py-8 text-center text-gray-500">
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

  // Form data
  newAccount = {
    account_name: '',
    account_number: '',
    description: ''
  };

  private originalAccount: CompanyAccount | null = null;

  constructor(private companyAccountService: CompanyAccountService) {}

  ngOnInit() {
    this.loadAccounts();
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
    this.companyAccountService.getAccountsByCompany(this.companyId, true).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (response.success) {
          this.accounts.set(response.data);
        }
      },
      error: (error) => {
        this.loading.set(false);
        console.error('Failed to load accounts:', error);
        alert('Failed to load accounts. Please try again.');
      }
    });
  }

  /**
   * Add new account
   */
  addAccount() {
    if (!this.newAccount.account_name.trim()) {
      alert('Account name is required');
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
          alert('Failed to add account. Please try again.');
        }
      },
      error: (error) => {
        this.loading.set(false);
        console.error('Failed to add account:', error);
        alert('Failed to add account. Please try again.');
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
      alert('Account name is required');
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
          alert('Failed to update account. Please try again.');
        }
      },
      error: (error) => {
        this.loading.set(false);
        console.error('Failed to update account:', error);
        alert('Failed to update account. Please try again.');
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
   * Toggle account status
   */
  toggleStatus(account: CompanyAccount) {
    this.loading.set(true);
    this.companyAccountService.setAccountActive(account.id, !account.is_active).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (response.success) {
          this.loadAccounts();
          this.accountsUpdated.emit();
        } else {
          alert('Failed to update account status. Please try again.');
        }
      },
      error: (error) => {
        this.loading.set(false);
        console.error('Failed to toggle account status:', error);
        alert('Failed to update account status. Please try again.');
      }
    });
  }

  /**
   * Delete account
   */
  deleteAccount(account: CompanyAccount) {
    if (!confirm(`Are you sure you want to delete "${account.account_name}"?`)) {
      return;
    }

    this.loading.set(true);
    this.companyAccountService.deleteAccount(account.id).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (response.success) {
          this.loadAccounts();
          this.accountsUpdated.emit();
        } else {
          alert('Failed to delete account. Please try again.');
        }
      },
      error: (error) => {
        this.loading.set(false);
        console.error('Failed to delete account:', error);
        alert('Failed to delete account. Please try again.');
      }
    });
  }

  /**
   * Reset new account form
   */
  private resetNewAccount() {
    this.newAccount = {
      account_name: '',
      account_number: '',
      description: ''
    };
  }
}
