import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface FundReceived {
  id: number;
  fundingType: string;
  source: string;
  amount: number;
  dateReceived: string;
  purpose: string;
  status: string;
  paymentMethod: string;
  referenceNumber: string;
  notes: string;
}

@Component({
  selector: 'app-funds-received',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-xl shadow-sm p-6 w-full">
      <!-- Page Header -->
      <div class="mb-6">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
              <i class="fas fa-hand-holding-usd text-teal-600 text-xl"></i>
            </div>
            <div>
              <h2 class="text-2xl font-bold text-gray-900">Funds Received</h2>
              <p class="text-gray-600">Track grants, investments, and loan disbursements</p>
            </div>
          </div>
          <button
            (click)="openAddModal()"
            class="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
          >
            <i class="fas fa-plus"></i>
            Add Fund
          </button>
        </div>

        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div class="bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200 rounded-lg p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-teal-600 font-medium">Total Funds</p>
                <p class="text-2xl font-bold text-teal-900">R {{ getTotalAmount() | number:'1.0-0' }}</p>
              </div>
              <i class="fas fa-money-bill-wave text-teal-400 text-3xl"></i>
            </div>
          </div>

          <div class="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-green-600 font-medium">Received</p>
                <p class="text-2xl font-bold text-green-900">R {{ getAmountByStatus('Received') | number:'1.0-0' }}</p>
              </div>
              <i class="fas fa-check-circle text-green-400 text-3xl"></i>
            </div>
          </div>

          <div class="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-lg p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-amber-600 font-medium">Pending</p>
                <p class="text-2xl font-bold text-amber-900">R {{ getAmountByStatus('Pending') | number:'1.0-0' }}</p>
              </div>
              <i class="fas fa-clock text-amber-400 text-3xl"></i>
            </div>
          </div>

          <div class="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-blue-600 font-medium">Fund Sources</p>
                <p class="text-2xl font-bold text-blue-900">{{ getUniqueSources().length }}</p>
              </div>
              <i class="fas fa-building text-blue-400 text-3xl"></i>
            </div>
          </div>
        </div>
      </div>

      <!-- Funds Table -->
      <div class="overflow-x-auto rounded-lg border border-gray-200">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Funding Type
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Source
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date Received
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Purpose
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr *ngFor="let fund of fundsReceived()" class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="w-10 h-10 rounded-lg flex items-center justify-center mr-3"
                       [class]="getFundingTypeIconBg(fund.fundingType)">
                    <i [class]="getFundingTypeIcon(fund.fundingType)"></i>
                  </div>
                  <div>
                    <div class="text-sm font-medium text-gray-900">{{ fund.fundingType }}</div>
                    <div class="text-xs text-gray-500">{{ fund.paymentMethod }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{{ fund.source }}</div>
                <div class="text-xs text-gray-500" *ngIf="fund.referenceNumber">
                  Ref: {{ fund.referenceNumber }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm font-semibold text-green-600">
                  R {{ fund.amount | number:'1.0-0' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ fund.dateReceived }}
              </td>
              <td class="px-6 py-4">
                <div class="text-sm text-gray-900 max-w-xs truncate">{{ fund.purpose }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      [class]="getStatusBadgeClass(fund.status)">
                  <i [class]="getStatusIcon(fund.status) + ' mr-1'"></i>
                  {{ fund.status }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  (click)="editFund(fund)"
                  class="text-blue-600 hover:text-blue-900 mr-3"
                  title="Edit fund"
                >
                  <i class="fas fa-edit"></i>
                </button>
                <button
                  (click)="deleteFund(fund.id)"
                  class="text-red-600 hover:text-red-900"
                  title="Delete fund"
                >
                  <i class="fas fa-trash"></i>
                </button>
              </td>
            </tr>
          </tbody>
          <tfoot class="bg-gray-50">
            <tr>
              <td colspan="2" class="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                Total Received:
              </td>
              <td class="px-6 py-4 text-sm font-bold text-green-600">
                R {{ getTotalAmount() | number:'1.0-0' }}
              </td>
              <td colspan="4"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Funding Type Breakdown -->
      <div class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div *ngFor="let type of getUniqueFundingTypes()"
             class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center"
                   [class]="getFundingTypeIconBg(type)">
                <i [class]="getFundingTypeIcon(type) + ' text-sm'"></i>
              </div>
              <h4 class="font-semibold text-gray-900">{{ type }}</h4>
            </div>
            <span class="text-xs bg-teal-100 text-teal-800 px-2 py-1 rounded-full">
              {{ getFundingTypeCount(type) }} funds
            </span>
          </div>
          <div class="text-2xl font-bold text-teal-600">
            R {{ getFundingTypeTotal(type) | number:'1.0-0' }}
          </div>
          <div class="text-xs text-gray-500 mt-1">
            {{ ((getFundingTypeTotal(type) / getTotalAmount()) * 100) | number:'1.0-1' }}% of total
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div *ngIf="showModal()"
         class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
         (click)="closeModal()">
      <div class="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto"
           (click)="$event.stopPropagation()">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl font-bold text-gray-900">
            {{ editingFund() ? 'Edit Fund Received' : 'Add Fund Received' }}
          </h3>
          <button (click)="closeModal()" class="text-gray-400 hover:text-gray-600">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>

        <form (ngSubmit)="saveFund()" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Funding Type *</label>
              <select
                [(ngModel)]="formData.fundingType"
                name="fundingType"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="">Select type</option>
                <option value="Grant">Grant</option>
                <option value="Investment">Investment</option>
                <option value="Loan">Loan</option>
                <option value="Equity">Equity</option>
                <option value="Donation">Donation</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Source *</label>
              <input
                [(ngModel)]="formData.source"
                name="source"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="e.g., National Development Agency"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Amount (R) *</label>
              <input
                [(ngModel)]="formData.amount"
                name="amount"
                type="number"
                min="0"
                step="0.01"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Date Received *</label>
              <input
                [(ngModel)]="formData.dateReceived"
                name="dateReceived"
                type="date"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Payment Method *</label>
              <select
                [(ngModel)]="formData.paymentMethod"
                name="paymentMethod"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="">Select method</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Check">Check</option>
                <option value="Wire Transfer">Wire Transfer</option>
                <option value="Cash">Cash</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Reference Number</label>
              <input
                [(ngModel)]="formData.referenceNumber"
                name="referenceNumber"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="e.g., INV-2025-001"
              />
            </div>

            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-2">Purpose *</label>
              <input
                [(ngModel)]="formData.purpose"
                name="purpose"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="e.g., Working capital for business expansion"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Status *</label>
              <select
                [(ngModel)]="formData.status"
                name="status"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="Received">Received</option>
                <option value="Pending">Pending</option>
                <option value="Processing">Processing</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              [(ngModel)]="formData.notes"
              name="notes"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="Additional information about this funding..."
            ></textarea>
          </div>

          <div class="bg-teal-50 border border-teal-200 rounded-lg p-4">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-700">Total Amount:</span>
              <span class="text-2xl font-bold text-teal-600">
                R {{ formData.amount | number:'1.0-0' }}
              </span>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              (click)="closeModal()"
              class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
            >
              <i class="fas fa-save"></i>
              {{ editingFund() ? 'Update Fund' : 'Add Fund' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class FundsReceivedComponent {
  // Mock data for funds received
  fundsReceived = signal<FundReceived[]>([
    {
      id: 1,
      fundingType: 'Grant',
      source: 'National Development Agency',
      amount: 500000,
      dateReceived: '2025-01-10',
      purpose: 'Working capital for business expansion',
      status: 'Received',
      paymentMethod: 'Bank Transfer',
      referenceNumber: 'NDA-2025-001',
      notes: 'First tranche of development grant'
    },
    {
      id: 2,
      fundingType: 'Investment',
      source: 'Venture Capital Partners',
      amount: 1200000,
      dateReceived: '2025-01-25',
      purpose: 'Series A funding for technology development',
      status: 'Received',
      paymentMethod: 'Wire Transfer',
      referenceNumber: 'VCP-INV-2025-03',
      notes: 'Equity investment with 15% stake'
    },
    {
      id: 3,
      fundingType: 'Loan',
      source: 'Business Development Bank',
      amount: 750000,
      dateReceived: '2025-02-05',
      purpose: 'Equipment purchase and facility upgrade',
      status: 'Received',
      paymentMethod: 'Bank Transfer',
      referenceNumber: 'BDB-LOAN-2025-089',
      notes: '5-year term at 8% interest'
    },
    {
      id: 4,
      fundingType: 'Grant',
      source: 'Small Enterprise Development Agency (SEDA)',
      amount: 250000,
      dateReceived: '2025-02-12',
      purpose: 'Skills development and training programs',
      status: 'Received',
      paymentMethod: 'Bank Transfer',
      referenceNumber: 'SEDA-GR-2025-145',
      notes: 'Non-repayable grant for capacity building'
    },
    {
      id: 5,
      fundingType: 'Investment',
      source: 'Angel Investor Network',
      amount: 350000,
      dateReceived: '2025-02-14',
      purpose: 'Marketing and market expansion',
      status: 'Pending',
      paymentMethod: 'Bank Transfer',
      referenceNumber: 'AIN-2025-022',
      notes: 'Documentation pending final approval'
    }
  ]);

  showModal = signal(false);
  editingFund = signal<FundReceived | null>(null);

  formData: Partial<FundReceived> = {
    fundingType: '',
    source: '',
    amount: 0,
    dateReceived: new Date().toISOString().split('T')[0],
    purpose: '',
    status: 'Pending',
    paymentMethod: '',
    referenceNumber: '',
    notes: ''
  };

  getTotalAmount(): number {
    return this.fundsReceived().reduce((sum, fund) => sum + fund.amount, 0);
  }

  getAmountByStatus(status: string): number {
    return this.fundsReceived()
      .filter(fund => fund.status === status)
      .reduce((sum, fund) => sum + fund.amount, 0);
  }

  getUniqueSources(): string[] {
    const sources = this.fundsReceived().map(fund => fund.source);
    return [...new Set(sources)];
  }

  getUniqueFundingTypes(): string[] {
    const types = this.fundsReceived().map(fund => fund.fundingType);
    return [...new Set(types)];
  }

  getFundingTypeCount(type: string): number {
    return this.fundsReceived().filter(fund => fund.fundingType === type).length;
  }

  getFundingTypeTotal(type: string): number {
    return this.fundsReceived()
      .filter(fund => fund.fundingType === type)
      .reduce((sum, fund) => sum + fund.amount, 0);
  }

  getFundingTypeIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'Grant': 'fas fa-gift text-purple-600',
      'Investment': 'fas fa-chart-line text-blue-600',
      'Loan': 'fas fa-university text-green-600',
      'Equity': 'fas fa-handshake text-indigo-600',
      'Donation': 'fas fa-heart text-red-600'
    };
    return icons[type] || 'fas fa-money-bill-wave text-gray-600';
  }

  getFundingTypeIconBg(type: string): string {
    const classes: { [key: string]: string } = {
      'Grant': 'bg-purple-100',
      'Investment': 'bg-blue-100',
      'Loan': 'bg-green-100',
      'Equity': 'bg-indigo-100',
      'Donation': 'bg-red-100'
    };
    return classes[type] || 'bg-gray-100';
  }

  getStatusBadgeClass(status: string): string {
    const classes: { [key: string]: string } = {
      'Received': 'bg-green-100 text-green-800',
      'Pending': 'bg-amber-100 text-amber-800',
      'Processing': 'bg-blue-100 text-blue-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      'Received': 'fas fa-check-circle',
      'Pending': 'fas fa-clock',
      'Processing': 'fas fa-spinner'
    };
    return icons[status] || 'fas fa-circle';
  }

  openAddModal(): void {
    this.editingFund.set(null);
    this.formData = {
      fundingType: '',
      source: '',
      amount: 0,
      dateReceived: new Date().toISOString().split('T')[0],
      purpose: '',
      status: 'Pending',
      paymentMethod: '',
      referenceNumber: '',
      notes: ''
    };
    this.showModal.set(true);
  }

  editFund(fund: FundReceived): void {
    this.editingFund.set(fund);
    this.formData = { ...fund };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingFund.set(null);
  }

  saveFund(): void {
    if (!this.formData.fundingType || !this.formData.source || !this.formData.amount) {
      return;
    }

    const editingFundValue = this.editingFund();
    if (editingFundValue) {
      // Update existing fund
      const funds = this.fundsReceived();
      const index = funds.findIndex(f => f.id === editingFundValue.id);
      if (index !== -1) {
        funds[index] = { ...funds[index], ...this.formData as FundReceived };
        this.fundsReceived.set([...funds]);
      }
    } else {
      // Add new fund
      const newId = Math.max(...this.fundsReceived().map(f => f.id)) + 1;
      const newFund: FundReceived = {
        ...(this.formData as Omit<FundReceived, 'id'>),
        id: newId
      };
      this.fundsReceived.set([...this.fundsReceived(), newFund]);
    }

    this.closeModal();
  }

  deleteFund(id: number): void {
    if (confirm('Are you sure you want to delete this fund record?')) {
      this.fundsReceived.set(this.fundsReceived().filter(fund => fund.id !== id));
    }
  }
}
