import { Component, Input, Output, EventEmitter, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinancialYear, FinancialYearService } from '../../../../../services/financial-year.service';
import { CompanyAccount } from '../../../../services/company-account.interface';
import { CompanyAccountService } from '../../../../services/company-account.service';

/**
 * Modal component for managing financial years and company accounts
 */
@Component({
  selector: 'app-financial-management-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="isOpen()" class="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <!-- Modal Header -->
        <header class="flex justify-between items-center p-6 border-b border-gray-200 bg-blue-50">
          <h2 class="text-xl font-semibold text-blue-800">Financial Management</h2>
          <button
            type="button"
            (click)="close()"
            class="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-1">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </header>

        <!-- Tab Navigation -->
        <nav class="flex border-b border-gray-200 bg-white">
          <button
            type="button"
            (click)="activeTab.set('financial-years')"
            [class.bg-blue-50]="activeTab() === 'financial-years'"
            [class.text-blue-600]="activeTab() === 'financial-years'"
            [class.border-blue-500]="activeTab() === 'financial-years'"
            class="px-6 py-3 text-sm font-medium border-b-2 border-transparent hover:text-blue-600 hover:border-blue-300 transition-colors">
            Financial Years
          </button>
          <button
            type="button"
            (click)="activeTab.set('company-accounts')"
            [class.bg-blue-50]="activeTab() === 'company-accounts'"
            [class.text-blue-600]="activeTab() === 'company-accounts'"
            [class.border-blue-500]="activeTab() === 'company-accounts'"
            class="px-6 py-3 text-sm font-medium border-b-2 border-transparent hover:text-blue-600 hover:border-blue-300 transition-colors">
            Company Accounts
          </button>
        </nav>

        <!-- Modal Body -->
        <div class="flex-1 overflow-y-auto p-6">
          <!-- Financial Years Tab -->
          <div *ngIf="activeTab() === 'financial-years'" class="space-y-6">
            <!-- Add New Financial Year -->
            <div class="bg-blue-50 rounded-lg p-4">
              <h3 class="text-lg font-medium text-blue-800 mb-4">Add New Financial Year</h3>
              <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label class="block text-sm font-medium text-blue-700 mb-1">Name</label>
                  <input
                    type="text"
                    [(ngModel)]="newFinancialYear.name"
                    placeholder="FY 2025/26"
                    class="w-full px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                </div>
                <div>
                  <label class="block text-sm font-medium text-blue-700 mb-1">Start Year</label>
                  <input
                    type="number"
                    [(ngModel)]="newFinancialYear.fy_start_year"
                    min="2020"
                    max="2100"
                    class="w-full px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                </div>
                <div>
                  <label class="block text-sm font-medium text-blue-700 mb-1">End Year</label>
                  <input
                    type="number"
                    [(ngModel)]="newFinancialYear.fy_end_year"
                    min="2020"
                    max="2100"
                    class="w-full px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                </div>
                <div class="flex items-end">
                  <button
                    type="button"
                    (click)="addFinancialYear()"
                    [disabled]="financialYearLoading()"
                    class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors">
                    {{ financialYearLoading() ? 'Adding...' : 'Add Year' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Financial Years Table -->
            <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table class="min-w-full">
                <thead class="bg-blue-50">
                  <tr>
                    <th class="px-4 py-3 text-left text-sm font-semibold text-blue-800">Name</th>
                    <th class="px-4 py-3 text-left text-sm font-semibold text-blue-800">Period</th>
                    <th class="px-4 py-3 text-left text-sm font-semibold text-blue-800">Status</th>
                    <th class="px-4 py-3 text-left text-sm font-semibold text-blue-800">Description</th>
                    <th class="px-4 py-3 text-center text-sm font-semibold text-blue-800">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                  <tr *ngFor="let year of financialYears(); let i = index"
                      [class.bg-green-50]="year.is_active"
                      class="hover:bg-gray-50">
                    <td class="px-4 py-3">
                      <div *ngIf="editingFinancialYear() !== year.id" class="font-medium text-gray-900">
                        {{ year.name }}
                      </div>
                      <input
                        *ngIf="editingFinancialYear() === year.id"
                        type="text"
                        [(ngModel)]="year.name"
                        class="w-full px-2 py-1 border border-blue-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-600">
                      {{ getMonthName(year.start_month) }} {{ year.fy_start_year }} - {{ getMonthName(year.end_month) }} {{ year.fy_end_year }}
                    </td>
                    <td class="px-4 py-3">
                      <span *ngIf="year.is_active" class="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        Active
                      </span>
                      <span *ngIf="!year.is_active" class="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                        Inactive
                      </span>
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-600">
                      <div *ngIf="editingFinancialYear() !== year.id">{{ year.description || '-' }}</div>
                      <input
                        *ngIf="editingFinancialYear() === year.id"
                        type="text"
                        [(ngModel)]="year.description"
                        placeholder="Optional description"
                        class="w-full px-2 py-1 border border-blue-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                    </td>
                    <td class="px-4 py-3 text-center">
                      <div class="flex justify-center gap-2">
                        <button
                          *ngIf="editingFinancialYear() !== year.id"
                          type="button"
                          (click)="startEditFinancialYear(year.id)"
                          class="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                          title="Edit">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                          </svg>
                        </button>
                        <button
                          *ngIf="editingFinancialYear() === year.id"
                          type="button"
                          (click)="saveFinancialYear(year)"
                          class="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50"
                          title="Save">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                          </svg>
                        </button>
                        <button
                          *ngIf="editingFinancialYear() === year.id"
                          type="button"
                          (click)="cancelEditFinancialYear()"
                          class="text-gray-600 hover:text-gray-800 p-1 rounded hover:bg-gray-50"
                          title="Cancel">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                          </svg>
                        </button>
                        <button
                          *ngIf="!year.is_active && editingFinancialYear() !== year.id"
                          type="button"
                          (click)="setActiveFinancialYear(year.id)"
                          class="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50"
                          title="Set as Active">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                        </button>
                        <button
                          *ngIf="editingFinancialYear() !== year.id"
                          type="button"
                          (click)="deleteFinancialYear(year.id)"
                          class="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                          title="Delete">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr *ngIf="financialYears().length === 0">
                    <td colspan="5" class="px-4 py-8 text-center text-gray-500">
                      No financial years found. Add one above to get started.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Company Accounts Tab -->
          <div *ngIf="activeTab() === 'company-accounts'" class="space-y-6">
            <!-- Add New Company Account -->
            <div class="bg-blue-50 rounded-lg p-4">
              <h3 class="text-lg font-medium text-blue-800 mb-4">Add New Company Account</h3>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm font-medium text-blue-700 mb-1">Account Name</label>
                  <input
                    type="text"
                    [(ngModel)]="newCompanyAccount.account_name"
                    placeholder="Main Revenue Account"
                    class="w-full px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                </div>
                <div>
                  <label class="block text-sm font-medium text-blue-700 mb-1">Account Number (Optional)</label>
                  <input
                    type="text"
                    [(ngModel)]="newCompanyAccount.account_number"
                    placeholder="ACC-001"
                    class="w-full px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                </div>
                <div class="flex items-end">
                  <button
                    type="button"
                    (click)="addCompanyAccount()"
                    [disabled]="companyAccountLoading()"
                    class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors">
                    {{ companyAccountLoading() ? 'Adding...' : 'Add Account' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Company Accounts Table -->
            <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table class="min-w-full">
                <thead class="bg-blue-50">
                  <tr>
                    <th class="px-4 py-3 text-left text-sm font-semibold text-blue-800">Account Name</th>
                    <th class="px-4 py-3 text-left text-sm font-semibold text-blue-800">Account Number</th>
                    <th class="px-4 py-3 text-left text-sm font-semibold text-blue-800">Status</th>
                    <th class="px-4 py-3 text-left text-sm font-semibold text-blue-800">Description</th>
                    <th class="px-4 py-3 text-center text-sm font-semibold text-blue-800">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                  <tr *ngFor="let account of companyAccounts(); let i = index"
                      [class.bg-green-50]="account.is_active"
                      [class.opacity-60]="!account.is_active"
                      class="hover:bg-gray-50">
                    <td class="px-4 py-3">
                      <div *ngIf="editingCompanyAccount() !== account.id" class="font-medium text-gray-900">
                        {{ account.account_name }}
                      </div>
                      <input
                        *ngIf="editingCompanyAccount() === account.id"
                        type="text"
                        [(ngModel)]="account.account_name"
                        class="w-full px-2 py-1 border border-blue-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-600">
                      <div *ngIf="editingCompanyAccount() !== account.id">{{ account.account_number || '-' }}</div>
                      <input
                        *ngIf="editingCompanyAccount() === account.id"
                        type="text"
                        [(ngModel)]="account.account_number"
                        placeholder="Optional"
                        class="w-full px-2 py-1 border border-blue-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                    </td>
                    <td class="px-4 py-3">
                      <span *ngIf="account.is_active" class="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        Active
                      </span>
                      <span *ngIf="!account.is_active" class="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                        Inactive
                      </span>
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-600">
                      <div *ngIf="editingCompanyAccount() !== account.id">{{ account.description || '-' }}</div>
                      <input
                        *ngIf="editingCompanyAccount() === account.id"
                        type="text"
                        [(ngModel)]="account.description"
                        placeholder="Optional description"
                        class="w-full px-2 py-1 border border-blue-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                    </td>
                    <td class="px-4 py-3 text-center">
                      <div class="flex justify-center gap-2">
                        <button
                          *ngIf="editingCompanyAccount() !== account.id"
                          type="button"
                          (click)="startEditCompanyAccount(account.id)"
                          class="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                          title="Edit">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                          </svg>
                        </button>
                        <button
                          *ngIf="editingCompanyAccount() === account.id"
                          type="button"
                          (click)="saveCompanyAccount(account)"
                          class="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50"
                          title="Save">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                          </svg>
                        </button>
                        <button
                          *ngIf="editingCompanyAccount() === account.id"
                          type="button"
                          (click)="cancelEditCompanyAccount()"
                          class="text-gray-600 hover:text-gray-800 p-1 rounded hover:bg-gray-50"
                          title="Cancel">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                          </svg>
                        </button>
                        <button
                          *ngIf="editingCompanyAccount() !== account.id"
                          type="button"
                          (click)="toggleAccountStatus(account)"
                          [class.text-green-600]="!account.is_active"
                          [class.text-gray-600]="account.is_active"
                          class="hover:text-gray-800 p-1 rounded hover:bg-gray-50"
                          [title]="account.is_active ? 'Deactivate' : 'Activate'">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path *ngIf="!account.is_active" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            <path *ngIf="account.is_active" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                        </button>
                        <button
                          *ngIf="editingCompanyAccount() !== account.id"
                          type="button"
                          (click)="deleteCompanyAccount(account.id)"
                          class="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                          title="Delete">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr *ngIf="companyAccounts().length === 0">
                    <td colspan="5" class="px-4 py-8 text-center text-gray-500">
                      No company accounts found. Add one above to get started.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <footer class="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            (click)="close()"
            class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors">
            Close
          </button>
        </footer>
      </div>
    </div>
  `
})
export class FinancialManagementModalComponent implements OnInit {
  @Input() companyId!: number;
  @Output() closed = new EventEmitter<void>();
  @Output() dataUpdated = new EventEmitter<void>();

  // Modal state
  readonly isOpen = signal(false);
  readonly activeTab = signal<'financial-years' | 'company-accounts'>('financial-years');

  // Data signals
  readonly financialYears = signal<FinancialYear[]>([]);
  readonly companyAccounts = signal<CompanyAccount[]>([]);

  // Editing state
  readonly editingFinancialYear = signal<number | null>(null);
  readonly editingCompanyAccount = signal<number | null>(null);
  private originalFinancialYear: FinancialYear | null = null;
  private originalCompanyAccount: CompanyAccount | null = null;

  // Form data
  newFinancialYear: Partial<FinancialYear> = {
    name: '',
    start_month: 3,
    end_month: 2,
    fy_start_year: new Date().getFullYear(),
    fy_end_year: new Date().getFullYear() + 1,
    is_active: false,
    description: ''
  };

  newCompanyAccount: Partial<CompanyAccount> = {
    account_name: '',
    account_number: '',
    description: '',
    is_active: true
  };

  // Month names for display
  private monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  constructor(
    public financialYearService: FinancialYearService,
    public companyAccountService: CompanyAccountService
  ) {}

  ngOnInit() {
    this.loadFinancialYears();
    this.loadCompanyAccounts();
  }

  /**
   * Open the modal
   */
  open() {
    this.isOpen.set(true);
    this.loadFinancialYears();
    this.loadCompanyAccounts();
  }

  /**
   * Close the modal
   */
  close() {
    this.isOpen.set(false);
    this.cancelEditFinancialYear();
    this.cancelEditCompanyAccount();
    this.closed.emit();
  }

  /**
   * Load financial years
   */
  private loadFinancialYears() {
    this.financialYearService.getAllFinancialYears().subscribe({
      next: (years) => {
        this.financialYears.set(years);
      },
      error: (error) => {
        console.error('Failed to load financial years:', error);
      }
    });
  }

  /**
   * Load company accounts
   */
  private loadCompanyAccounts() {
    if (this.companyId) {
      this.companyAccountService.getAccountsByCompany(this.companyId, false).subscribe({
        next: (response) => {
          if (response.success) {
            this.companyAccounts.set(response.data);
          }
        },
        error: (error) => {
          console.error('Failed to load company accounts:', error);
        }
      });
    }
  }

  /**
   * Get month name by number
   */
  getMonthName(monthNumber: number): string {
    return this.monthNames[monthNumber - 1] || '';
  }

  /**
   * Wrapper that safely checks for a `loading` function or property on the financialYearService.
   * Returns a boolean indicating loading state (false by default if not present).
   */
  financialYearLoading(): boolean {
    const l = (this.financialYearService as any).loading;
    if (typeof l === 'function') {
      try {
        return !!l.call(this.financialYearService);
      } catch {
        return false;
      }
    }
    return !!l;
  }

  /**
   * Wrapper that safely checks for a `loading` function or property on the companyAccountService.
   * Returns a boolean indicating loading state (false by default if not present).
   */
  companyAccountLoading(): boolean {
    const l = (this.companyAccountService as any).loading;
    if (typeof l === 'function') {
      try {
        return !!l.call(this.companyAccountService);
      } catch {
        return false;
      }
    }
    return !!l;
  }

  // === FINANCIAL YEAR METHODS ===

  /**
   * Add new financial year
   */
  addFinancialYear() {
    if (!this.newFinancialYear.name || !this.newFinancialYear.fy_start_year || !this.newFinancialYear.fy_end_year) {
      alert('Please fill in all required fields');
      return;
    }

    this.financialYearService.addFinancialYear(this.newFinancialYear).subscribe({
      next: (year) => {
        this.loadFinancialYears();
        this.resetNewFinancialYear();
        this.dataUpdated.emit();
      },
      error: (error) => {
        console.error('Failed to add financial year:', error);
        alert('Failed to add financial year. Please try again.');
      }
    });
  }

  /**
   * Start editing financial year
   */
  startEditFinancialYear(id: number) {
    const year = this.financialYears().find(y => y.id === id);
    if (year) {
      this.originalFinancialYear = { ...year };
      this.editingFinancialYear.set(id);
    }
  }

  /**
   * Save financial year changes
   */
  saveFinancialYear(year: FinancialYear) {
    this.financialYearService.updateFinancialYear(year.id, year).subscribe({
      next: (updatedYear) => {
        this.editingFinancialYear.set(null);
        this.originalFinancialYear = null;
        this.loadFinancialYears();
        this.dataUpdated.emit();
      },
      error: (error) => {
        console.error('Failed to update financial year:', error);
        alert('Failed to update financial year. Please try again.');
      }
    });
  }

  /**
   * Cancel editing financial year
   */
  cancelEditFinancialYear() {
    if (this.originalFinancialYear && this.editingFinancialYear()) {
      const years = this.financialYears();
      const index = years.findIndex(y => y.id === this.editingFinancialYear());
      if (index !== -1) {
        years[index] = { ...this.originalFinancialYear };
        this.financialYears.set([...years]);
      }
    }
    this.editingFinancialYear.set(null);
    this.originalFinancialYear = null;
  }

  /**
   * Set financial year as active
   */
  setActiveFinancialYear(id: number) {
    this.financialYearService.setActiveFinancialYear(id).subscribe({
      next: () => {
        this.loadFinancialYears();
        this.dataUpdated.emit();
      },
      error: (error) => {
        console.error('Failed to set active financial year:', error);
        alert('Failed to set active financial year. Please try again.');
      }
    });
  }

  /**
   * Delete financial year
   */
  deleteFinancialYear(id: number) {
    const year = this.financialYears().find(y => y.id === id);
    if (year && confirm(`Are you sure you want to delete "${year.name}"?`)) {
      this.financialYearService.deleteFinancialYear(id).subscribe({
        next: () => {
          this.loadFinancialYears();
          this.dataUpdated.emit();
        },
        error: (error) => {
          console.error('Failed to delete financial year:', error);
          alert('Failed to delete financial year. Please try again.');
        }
      });
    }
  }

  /**
   * Reset new financial year form
   */
  private resetNewFinancialYear() {
    this.newFinancialYear = {
      name: '',
      start_month: 3,
      end_month: 2,
      fy_start_year: new Date().getFullYear(),
      fy_end_year: new Date().getFullYear() + 1,
      is_active: false,
      description: ''
    };
  }

  // === COMPANY ACCOUNT METHODS ===

  /**
   * Add new company account
   */
  addCompanyAccount() {
    if (!this.newCompanyAccount.account_name || !this.companyId) {
      alert('Please provide an account name');
      return;
    }

    const accountData = {
      ...this.newCompanyAccount,
      company_id: this.companyId,
      account_name: this.newCompanyAccount.account_name as string
    };

    this.companyAccountService.createAccount(accountData).subscribe({
      next: (response) => {
        if (response.success) {
          this.loadCompanyAccounts();
          this.resetNewCompanyAccount();
          this.dataUpdated.emit();
        }
      },
      error: (error) => {
        console.error('Failed to add company account:', error);
        alert('Failed to add company account. Please try again.');
      }
    });
  }

  /**
   * Start editing company account
   */
  startEditCompanyAccount(id: number) {
    const account = this.companyAccounts().find(a => a.id === id);
    if (account) {
      this.originalCompanyAccount = { ...account };
      this.editingCompanyAccount.set(id);
    }
  }

  /**
   * Save company account changes
   */
  saveCompanyAccount(account: CompanyAccount) {
    this.companyAccountService.updateAccount(account.id, account).subscribe({
      next: (response) => {
        if (response.success) {
          this.editingCompanyAccount.set(null);
          this.originalCompanyAccount = null;
          this.loadCompanyAccounts();
          this.dataUpdated.emit();
        }
      },
      error: (error) => {
        console.error('Failed to update company account:', error);
        alert('Failed to update company account. Please try again.');
      }
    });
  }

  /**
   * Cancel editing company account
   */
  cancelEditCompanyAccount() {
    if (this.originalCompanyAccount && this.editingCompanyAccount()) {
      const accounts = this.companyAccounts();
      const index = accounts.findIndex(a => a.id === this.editingCompanyAccount());
      if (index !== -1) {
        accounts[index] = { ...this.originalCompanyAccount };
        this.companyAccounts.set([...accounts]);
      }
    }
    this.editingCompanyAccount.set(null);
    this.originalCompanyAccount = null;
  }

  /**
   * Toggle account active status
   */
  toggleAccountStatus(account: CompanyAccount) {
    this.companyAccountService.setAccountActive(account.id, !account.is_active).subscribe({
      next: () => {
        this.loadCompanyAccounts();
        this.dataUpdated.emit();
      },
      error: (error) => {
        console.error('Failed to toggle account status:', error);
        alert('Failed to update account status. Please try again.');
      }
    });
  }

  /**
   * Delete company account
   */
  deleteCompanyAccount(id: number) {
    const account = this.companyAccounts().find(a => a.id === id);
    if (account && confirm(`Are you sure you want to delete "${account.account_name}"?`)) {
      this.companyAccountService.deleteAccount(id).subscribe({
        next: () => {
          this.loadCompanyAccounts();
          this.dataUpdated.emit();
        },
        error: (error) => {
          console.error('Failed to delete company account:', error);
          alert('Failed to delete company account. Please try again.');
        }
      });
    }
  }

  /**
   * Reset new company account form
   */
  private resetNewCompanyAccount() {
    this.newCompanyAccount = {
      account_name: '',
      account_number: '',
      description: '',
      is_active: true
    };
  }
}
