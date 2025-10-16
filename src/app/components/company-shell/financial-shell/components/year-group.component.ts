import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { YearGroup, AccountRecord, MonthDisplay } from '../models/revenue-capture.interface';
import { CompanyAccount } from '../../../../services/company-account.interface';

@Component({
  selector: 'app-year-group',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm mb-4">
      <!-- Header -->
      <div
        class="flex justify-between items-center bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 cursor-pointer select-none hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
        (click)="toggleGroup()">
        <div class="flex items-center gap-3">
          <h2 class="text-lg font-medium">{{ year.name }}</h2>
          <span *ngIf="year.isActive" class="px-2 py-0.5 text-xs bg-green-500 rounded-full font-medium">
            Active
          </span>
          <span class="px-2 py-0.5 text-xs bg-white/20 rounded-full font-medium">
            {{ year.accounts.length }} account{{ year.accounts.length !== 1 ? 's' : '' }}
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
            <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Add Account
          </button>
          <button
            class="px-2 py-1 bg-red-500/20 rounded hover:bg-red-500/30 transition-colors text-xs"
            (click)="confirmDeleteYear(); $event.stopPropagation()"
            title="Delete year">
            🗑️
          </button>
          <svg
            [class.rotate-180]="year.expanded"
            class="w-5 h-5 transition-transform duration-200"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </div>
      </div>

      <!-- Collapsible Body -->
      <div *ngIf="year.expanded" class="transition-all duration-300 ease-in-out">
        <div class="p-4">
          <!-- Table Container -->
          <div class="bg-white overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
            <table class="min-w-full text-sm">
              <thead>
                <tr class="bg-blue-50 text-blue-800">
                  <th class="px-4 py-3 text-left font-semibold min-w-[200px] sticky left-0 bg-blue-50 border-r border-blue-200 z-20">
                    Account Name
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
                <tr *ngFor="let account of year.accounts; trackBy: trackAccount; let i = index"
                    [class.bg-gray-50]="i % 2 === 1"
                    [class.bg-white]="i % 2 === 0"
                    class="hover:bg-blue-50/30 transition-colors">
                  <!-- Account Name -->
                  <td class="px-4 py-3 font-medium text-gray-700 sticky left-0 border-r border-gray-200 z-10"
                      [class.bg-gray-50]="i % 2 === 1"
                      [class.bg-white]="i % 2 === 0">
                    <div class="flex items-center gap-2">
                      <select
                        [(ngModel)]="account.accountName"
                        (change)="onAccountChange()"
                        class="flex-1 border border-gray-200 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all bg-white text-sm">
                        <option value="">Select account...</option>
                        <option *ngFor="let availableAccount of availableAccounts" [value]="availableAccount.account_name">
                          {{ getAccountDisplayName(availableAccount) }}
                        </option>
                      </select>
                      <button
                        type="button"
                        (click)="openAccountManagement()"
                        class="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                        title="Manage Accounts">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                      </button>
                    </div>
                  </td>

                  <!-- Month Inputs -->
                  <td *ngFor="let month of months; trackBy: trackMonth"
                      class="text-center border-r border-gray-100 bg-inherit">
                    <input
                      type="number"
                      [(ngModel)]="account.months[month.key]"
                      (input)="updateTotal(account)"
                      placeholder="0"
                      min="0"
                      step="0.01"
                      class="w-20 border border-gray-200 rounded-md text-right px-2 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all hover:border-gray-300 bg-white" />
                  </td>

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
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                    </button>
                  </td>
                </tr>

                <!-- Empty State -->
                <tr *ngIf="year.accounts.length === 0">
                  <td colspan="15" class="px-4 py-8 text-center text-gray-500">
                    <div class="flex flex-col items-center gap-2">
                      <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                      </svg>
                      <span>No accounts yet</span>
                      <button
                        (click)="addAccount()"
                        class="text-blue-600 hover:text-blue-800 font-medium">
                        Add your first account
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>

              <!-- Footer with Year Total -->
              <tfoot *ngIf="year.accounts.length > 0">
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
            </table>
          </div>

          <!-- Quick Actions -->
          <div class="mt-4 flex justify-between items-center text-sm text-gray-600">
            <div class="flex items-center gap-4">
              <span>{{ year.accounts.length }} account(s)</span>
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
    </div>
  `
})
export class YearGroupComponent {
  @Input() year!: YearGroup;
  @Input() availableAccounts: CompanyAccount[] = [];
  @Output() yearChanged = new EventEmitter<YearGroup>();
  @Output() deleteYear = new EventEmitter<number>();

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
    const updatedYear = { ...this.year, expanded: !this.year.expanded };
    this.yearChanged.emit(updatedYear);
  }

  addAccount(): void {
    const newAccountId = Math.max(...this.year.accounts.map(a => a.id), 0) + 1;
    const newAccount: AccountRecord = {
      id: newAccountId,
      accountName: '',
      months: {
        m1: null, m2: null, m3: null, m4: null,
        m5: null, m6: null, m7: null, m8: null,
        m9: null, m10: null, m11: null, m12: null
      },
      total: 0
    };

    const updatedYear = {
      ...this.year,
      accounts: [...this.year.accounts, newAccount]
    };

    this.yearChanged.emit(updatedYear);
  }

  deleteAccount(accountId: number): void {
    if (confirm('Are you sure you want to delete this account?')) {
      const updatedYear = {
        ...this.year,
        accounts: this.year.accounts.filter(a => a.id !== accountId)
      };

      this.yearChanged.emit(updatedYear);
    }
  }

  updateTotal(account: AccountRecord): void {
    // Calculate total from all month values
    const total = Object.values(account.months).reduce((sum: number, value) => {
      return sum + (value || 0);
    }, 0);

    account.total = total;
    this.onAccountChange();
  }

  getYearTotal(): number {
    return this.year.accounts.reduce((total, account) => total + (account.total || 0), 0);
  }

  onAccountChange(): void {
    // Emit the updated year to parent
    this.yearChanged.emit({ ...this.year });
  }

  confirmDeleteYear(): void {
    const accountCount = this.year.accounts.length;
    const message = accountCount > 0
      ? `Are you sure you want to delete "${this.year.name}" and all ${accountCount} account(s)?`
      : `Are you sure you want to delete "${this.year.name}"?`;

    if (confirm(message)) {
      this.deleteYear.emit(this.year.id);
    }
  }

  /**
   * Get display name for account dropdown
   */
  getAccountDisplayName(account: CompanyAccount): string {
    if (account.account_number) {
      return `${account.account_name} (${account.account_number})`;
    }
    return account.account_name;
  }

  /**
   * Open account management - placeholder for now
   */
  openAccountManagement(): void {
    // TODO: Emit event to parent to open management modal
    console.log('Open account management');
  }
}
