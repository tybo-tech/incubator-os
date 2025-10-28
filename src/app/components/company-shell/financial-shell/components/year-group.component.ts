import { Component, input, output, signal, computed, ViewChild, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { YearGroup, AccountRecord, MonthDisplay, AccountChangeEvent } from '../models/revenue-capture.interface';
import { CompanyAccount } from '../../../../services/company-account.interface';
import { AccountManagementModalComponent } from './account-management-modal.component';
import { EnhancedAccountSelectComponent } from './enhanced-account-select.component';
import { ToastService } from '../../../../services/toast.service';

@Component({
  selector: 'app-year-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, AccountManagementModalComponent, EnhancedAccountSelectComponent],
  template: `
    <div class="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm mb-4">
      <!-- Header -->
      <div
        class="flex justify-between items-center bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 cursor-pointer select-none hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
        (click)="toggleGroup()">
        <div class="flex items-center gap-3">
          <h2 class="text-lg font-medium">{{ year().name }}</h2>
          @if (year().isActive) {
            <span class="px-2 py-0.5 text-xs bg-green-500 rounded-full font-medium">
              Active
            </span>
          }
          <span class="px-2 py-0.5 text-xs bg-white/20 rounded-full font-medium">
            {{ year().accounts.length }} account{{ year().accounts.length !== 1 ? 's' : '' }}
          </span>
        </div>
        <div class="flex items-center gap-4">
          <span class="font-semibold text-lg">
            Total: R {{ getYearTotal() | number:'1.0-2' }}
          </span>
          <button
            class="px-3 py-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-colors text-sm font-medium"
            (click)="addAccount(); $event.stopPropagation()"
            title="Add new account">
            <i class="fas fa-plus mr-1"></i>
            Add Account
          </button>
          <button
            class="px-2 py-1 bg-red-500/20 rounded hover:bg-red-500/30 transition-colors text-xs"
            (click)="confirmDeleteYear(); $event.stopPropagation()"
            title="Delete year">
            <i class="fas fa-trash"></i>
          </button>
          <i
            [class.fa-chevron-up]="year().expanded"
            [class.fa-chevron-down]="!year().expanded"
            class="fas transition-transform duration-200"></i>
        </div>
      </div>

      <!-- Collapsible Body -->
      @if (year().expanded) {
        <div class="transition-all duration-300 ease-in-out">
          <div class="p-4">
          <!-- Table Container -->
          <div class="bg-white overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
            <table class="min-w-full text-sm">
              <thead>
                <tr class="bg-blue-50 text-blue-800">
                  <th class="px-4 py-3 text-left font-semibold min-w-[200px] sticky left-0 bg-blue-50 border-r border-blue-200 z-20">
                    <div class="flex items-center justify-between">
                      <span>Account Name</span>
                      <button
                        type="button"
                        (click)="openAccountManagement()"
                        class="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors"
                        title="Manage Accounts">
                        <i class="fas fa-cog"></i>
                      </button>
                    </div>
                  </th>
                  <th *ngFor="let month of months; trackBy: trackMonth"
                      class="px-3 py-3 text-center font-semibold min-w-[80px] border-r border-blue-100 bg-blue-50">
                    {{ month.label }}
                  </th>
                  <th class="px-4 py-3 text-right font-semibold min-w-[120px] bg-blue-100 text-blue-800 border-r border-blue-200">
                    Total
                  </th>
                  <th class="px-3 py-3 text-center font-semibold min-w-[80px] bg-blue-50">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                @for (account of year().accounts; track trackAccount($index, account); let i = $index) {
                  <tr [class.bg-gray-50]="i % 2 === 1"
                      [class.bg-white]="i % 2 === 0"
                      class="hover:bg-blue-50/30 transition-colors">
                    <!-- Account Name -->
                    <td class="px-4 py-3 font-medium text-gray-700 sticky left-0 border-r border-gray-200 z-10"
                        [class.bg-gray-50]="i % 2 === 1"
                        [class.bg-white]="i % 2 === 0">
                      <app-enhanced-account-select
                        [companyId]="companyId()"
                        [selectedAccount]="account.accountName"
                        [accounts]="availableAccounts()"
                        [excludeAccountIds]="getUsedAccountIds(account.id)"
                        (accountSelected)="onAccountSelected(account, $event)"
                        (accountCreated)="onNewAccountCreated($event)">
                      </app-enhanced-account-select>
                    </td>

                    <!-- Month Inputs -->
                    @for (month of months; track trackMonth($index, month)) {
                      <td class="text-center border-r border-gray-100 bg-inherit">
                        <input
                          type="number"
                          [(ngModel)]="account.months[month.key]"
                          (change)="onMonthlyValueChange(account)"
                          placeholder="0"
                          min="0"
                          step="0.01"
                          class="w-20 border border-gray-200 rounded-md text-right px-2 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all hover:border-gray-300 bg-white" />
                      </td>
                    }

                  <!-- Total -->
                  <td class="px-4 py-3 text-right font-semibold text-blue-800 bg-blue-100 border-r border-blue-200">
                    R {{ account.total | number:'1.0-2' }}
                  </td>

                  <!-- Actions -->
                  <td class="px-3 py-3 text-center bg-inherit">
                    <button
                      (click)="deleteAccount(account.id)"
                      class="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
                      title="Delete account">
                      <i class="fas fa-trash"></i>
                    </button>
                  </td>
                }

                <!-- Empty State -->
                @if (year().accounts.length === 0) {
                  <tr>
                    <td colspan="15" class="px-4 py-8 text-center text-gray-500">
                      <div class="flex flex-col items-center gap-2">
                        <i class="fas fa-plus text-2xl text-gray-400"></i>
                        <span>No accounts yet</span>
                        <button
                          (click)="addAccount()"
                          class="text-blue-600 hover:text-blue-800 font-medium">
                          Add your first account
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>

              <!-- Footer with Year Total -->
              @if (year().accounts.length > 0) {
                <tfoot>
                  <tr class="bg-blue-50 font-semibold text-blue-800 border-t-2 border-blue-200">
                    <td class="px-4 py-3 text-right sticky left-0 bg-blue-50 border-r border-blue-200" colspan="13">
                      <span class="text-lg">Year Total:</span>
                    </td>
                    <td class="px-4 py-3 text-right text-blue-800 bg-blue-100">
                      <span class="text-lg font-bold">R {{ getYearTotal() | number:'1.0-2' }}</span>
                    </td>
                    <td class="px-3 py-3"></td>
                  </tr>
                </tfoot>
              }
            </table>
          </div>

          <!-- Quick Actions -->
          <div class="mt-4 flex justify-between items-center text-sm text-gray-600">
            <div class="flex items-center gap-4">
              <span>{{ year().accounts.length }} account(s)</span>
              <span>•</span>
              <span>Total: R {{ getYearTotal() | number:'1.0-2' }}</span>
            </div>
            <div class="flex gap-2">
              <button
                (click)="addAccount()"
                class="px-3 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors">
                + Add Account
              </button>
            </div>
          </div>
          </div>
        </div>
      }

      <!-- Account Management Modal -->
      <app-account-management-modal
        #accountModal
        [companyId]="companyId()"
        (closed)="onAccountModalClosed()"
        (accountsUpdated)="onAccountsUpdated()">
      </app-account-management-modal>
    </div>
  `
})
export class YearGroupComponent {
  // Modern Angular input/output functions
  year = input.required<YearGroup>();
  availableAccounts = input<CompanyAccount[]>([]);
  companyId = input<number>(1); // Default company ID

  yearChanged = output<YearGroup>();
  deleteYear = output<number>();
  accountsUpdateRequested = output<void>();
  accountChanged = output<AccountChangeEvent>();

  @ViewChild('accountModal') accountModal!: AccountManagementModalComponent;

  // Inject toast service
  private toastService = inject(ToastService);

  // Month display configuration based on financial year (March to February)
  months: MonthDisplay[] = [
    { key: 'm1', label: 'Mar', monthNumber: 3 },
    { key: 'm2', label: 'Apr', monthNumber: 4 },
    { key: 'm3', label: 'May', monthNumber: 5 },
    { key: 'm4', label: 'Jun', monthNumber: 6 },
    { key: 'm5', label: 'Jul', monthNumber: 7 },
    { key: 'm6', label: 'Aug', monthNumber: 8 },
    { key: 'm7', label: 'Sep', monthNumber: 9 },
    { key: 'm8', label: 'Oct', monthNumber: 10 },
    { key: 'm9', label: 'Nov', monthNumber: 11 },
    { key: 'm10', label: 'Dec', monthNumber: 12 },
    { key: 'm11', label: 'Jan', monthNumber: 1 },
    { key: 'm12', label: 'Feb', monthNumber: 2 }
  ];

  trackMonth(index: number, month: MonthDisplay): string {
    return month.key;
  }

  trackAccount(index: number, account: AccountRecord): number {
    return account.id;
  }

  toggleGroup(): void {
    const updatedYear = { ...this.year(), expanded: !this.year().expanded };
    this.yearChanged.emit(updatedYear);
  }

  addAccount(): void {
    // Emit request to create database record immediately
    // This prevents data loss by ensuring each UI line has its own DB record
    this.accountChanged.emit({
      yearId: this.year().id,
      account: null, // Signal to create empty record
      action: 'create_empty' // New action for creating empty database record
    });
  }

  deleteAccount(accountId: number): void {
    if (confirm('Are you sure you want to delete this account?')) {
      // Find the account to delete
      const accountToDelete = this.year().accounts.find((a: AccountRecord) => a.id === accountId);

      if (accountToDelete) {
        // Emit delete event to parent (includes database deletion)
        this.accountChanged.emit({
          yearId: this.year().id,
          account: accountToDelete,
          action: 'delete'
        });
      }
    }
  }

  /**
   * Handle monthly value changes (triggered on blur/enter)
   * Updates existing database record (safe since record was created in addAccount)
   */
  onMonthlyValueChange(account: AccountRecord): void {
    // Calculate total from all month values
    const total = Object.values(account.months).reduce((sum: number, value) => {
      return sum + (value || 0);
    }, 0);

    account.total = total;

    // Emit specific account change for targeted saving (update existing record)
    this.accountChanged.emit({
      yearId: this.year().id,
      account: { ...account },
      action: 'update' // Signal that this should update existing record
    });

    // Also update the year for UI consistency (but parent will only save the specific account)
    this.onAccountChange();
  }

  /**
   * Handle account selection from enhanced dropdown
   */
  onAccountSelected(account: AccountRecord, accountName: string): void {
    // Find the selected account details
    const selectedAccount = this.availableAccounts().find(
      (acc: CompanyAccount) => acc.account_name === accountName
    );

    if (selectedAccount) {
      // Check if this account is already used in this year (excluding current record)
      const isAccountAlreadyUsed = this.year().accounts.some(
        (existingAccount: AccountRecord) =>
          existingAccount.accountId === selectedAccount.id &&
          existingAccount.id !== account.id
      );

      if (isAccountAlreadyUsed) {
        // Reset the selection and show warning
        account.accountName = '';
        account.accountId = null;
        this.toastService.warning(`Account "${selectedAccount.account_name}" is already used in this financial year. Please select a different account.`);
        return;
      }

      // Update the account
      account.accountName = accountName;
      account.accountId = selectedAccount.id;

      // Update the account in database immediately
      this.accountChanged.emit({
        yearId: this.year().id,
        account: { ...account },
        action: 'update'
      });

      // Show success feedback
      this.toastService.success(`Account "${selectedAccount.account_name}" has been assigned successfully`);
    } else {
      // Clear account ID if no valid account selected
      account.accountId = null;
      account.accountName = accountName;
    }

    // Update the year for UI consistency
    this.onAccountChange();
  }

  /**
   * Handle new account created from enhanced dropdown
   */
  onNewAccountCreated(newAccount: CompanyAccount): void {
    // Emit event to parent to refresh available accounts
    this.accountsUpdateRequested.emit();
  }

  /**
   * Get list of account IDs already used in this year (excluding specified account)
   */
  getUsedAccountIds(excludeAccountId: number): number[] {
    return this.year().accounts
      .filter((acc: AccountRecord) => acc.id !== excludeAccountId && acc.accountId)
      .map((acc: AccountRecord) => acc.accountId!)
      .filter((id: number) => id !== null);
  }

  /**
   * Handle account name/selection changes (legacy method, kept for compatibility)
   * This method is now mainly used for manual updates when not using the enhanced dropdown
   */
  onAccountNameChange(account: AccountRecord): void {
    // This method can be simplified or removed since we're using the enhanced dropdown
    // Keeping it for any edge cases or backward compatibility
    this.onAccountChange();
  }

  getYearTotal(): number {
    return this.year().accounts.reduce((total: number, account: AccountRecord) => total + (account.total || 0), 0);
  }

  onAccountChange(): void {
    // Emit the updated year to parent (for UI updates)
    this.yearChanged.emit({ ...this.year() });
  }

  confirmDeleteYear(): void {
    const accountCount = this.year().accounts.length;
    const message = accountCount > 0
      ? `Are you sure you want to delete "${this.year().name}" and all ${accountCount} account(s)?`
      : `Are you sure you want to delete "${this.year().name}"?`;

    if (confirm(message)) {
      this.deleteYear.emit(this.year().id);
    }
  }

  /**
   * Open account management modal
   */
  openAccountManagement(): void {
    this.accountModal.open();
  }

  /**
   * Handle account modal closed
   */
  onAccountModalClosed(): void {
    // Modal closed, nothing special to do
  }

  /**
   * Handle accounts updated
   */
  onAccountsUpdated(): void {
    // Emit event to parent to refresh available accounts
    this.accountsUpdateRequested.emit();
  }
}
