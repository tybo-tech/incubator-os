import { Component, input, output, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinancialIndicatorData } from '../../../../../../services/financial-indicator.service';
import { LiveCalculations } from '../../models/financial-indicator.model';

@Component({
  selector: 'app-financial-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" (click)="close.emit()">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">{{ isEdit() ? 'Edit Report' : 'New Report' }}</h3>
          <button (click)="close.emit()" class="p-1 text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="p-6 space-y-6">
          <!-- Meta -->
          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Financial Year</label>
              <input type="number" [(ngModel)]="formData.meta.financialYear" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="2026" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Month</label>
              <select [(ngModel)]="formData.meta.month" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option [value]="0">Select month</option>
                <option *ngFor="let m of months" [value]="m.value">{{ m.label }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select [(ngModel)]="formData.meta.currency" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="ZAR">ZAR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          <!-- Income Statement -->
          <div>
            <h4 class="text-sm font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">Income Statement</h4>
            <div class="grid grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Sales</label>
                <input type="number" [(ngModel)]="formData.incomeStatement.sales" (input)="recalculate()" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Cost of Sales</label>
                <input type="number" [(ngModel)]="formData.incomeStatement.costOfSales" (input)="recalculate()" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Operating Expenses</label>
                <input type="number" [(ngModel)]="formData.incomeStatement.operatingExpenses" (input)="recalculate()" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>
          </div>

          <!-- Live Calculations -->
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p class="text-sm font-medium text-blue-800 mb-2">Calculated Values (temporary - backend is source of truth)</p>
            <div class="grid grid-cols-4 gap-4 text-sm">
              <div><span class="text-blue-600">Gross Profit:</span> <strong>{{ liveCalc().grossProfit | currency:'ZAR':'symbol':'1.0-0' }}</strong></div>
              <div><span class="text-blue-600">Gross %:</span> <strong>{{ liveCalc().grossProfitPercentage }}%</strong></div>
              <div><span class="text-blue-600">Net Profit:</span> <strong>{{ liveCalc().netProfit | currency:'ZAR':'symbol':'1.0-0' }}</strong></div>
              <div><span class="text-blue-600">Net %:</span> <strong>{{ liveCalc().netProfitPercentage }}%</strong></div>
            </div>
          </div>

          <!-- Balance Sheet -->
          <div>
            <h4 class="text-sm font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">Balance Sheet</h4>
            <div class="grid grid-cols-3 gap-4">
              <div><label class="block text-sm font-medium text-gray-700 mb-1">Cash</label><input type="number" [(ngModel)]="formData.balanceSheet.cash" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
              <div><label class="block text-sm font-medium text-gray-700 mb-1">Cash Equivalents</label><input type="number" [(ngModel)]="formData.balanceSheet.cashEquivalents" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
              <div><label class="block text-sm font-medium text-gray-700 mb-1">Short Term Investments</label><input type="number" [(ngModel)]="formData.balanceSheet.shortTermInvestments" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
              <div><label class="block text-sm font-medium text-gray-700 mb-1">Current Receivables</label><input type="number" [(ngModel)]="formData.balanceSheet.currentReceivables" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
              <div><label class="block text-sm font-medium text-gray-700 mb-1">Total Current Assets</label><input type="number" [(ngModel)]="formData.balanceSheet.totalCurrentAssets" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
              <div><label class="block text-sm font-medium text-gray-700 mb-1">Total Assets</label><input type="number" [(ngModel)]="formData.balanceSheet.totalAssets" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
              <div><label class="block text-sm font-medium text-gray-700 mb-1">Total Current Liabilities</label><input type="number" [(ngModel)]="formData.balanceSheet.totalCurrentLiabilities" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
              <div><label class="block text-sm font-medium text-gray-700 mb-1">Total Liabilities</label><input type="number" [(ngModel)]="formData.balanceSheet.totalLiabilities" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
              <div><label class="block text-sm font-medium text-gray-700 mb-1">Total Equity</label><input type="number" [(ngModel)]="formData.balanceSheet.totalEquity" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-200">
          <button (click)="close.emit()" class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
          <button (click)="save.emit(formData)" [disabled]="saving()" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {{ saving() ? 'Saving...' : (isEdit() ? 'Update' : 'Create') }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class FinancialFormComponent {
  isEdit = input(false);
  initialData = input<FinancialIndicatorData | null>(null);
  saving = input(false);
  close = output<void>();
  save = output<FinancialIndicatorData>();

  protected months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
  ];

  protected formData: FinancialIndicatorData = this.emptyForm();
  protected liveCalc = computed<LiveCalculations>(() => {
    const s = this.formData.incomeStatement.sales ?? 0;
    const c = this.formData.incomeStatement.costOfSales ?? 0;
    const o = this.formData.incomeStatement.operatingExpenses ?? 0;
    const gp = s - c;
    const np = gp - o;
    return {
      grossProfit: gp,
      grossProfitPercentage: s > 0 ? Math.round((gp / s) * 100) : 0,
      netProfit: np,
      netProfitPercentage: s > 0 ? Math.round((np / s) * 100) : 0,
    };
  });

  constructor() {
    effect(() => {
      const data = this.initialData();
      if (data) {
        this.formData = {
          meta: { ...data.meta },
          incomeStatement: { ...data.incomeStatement },
          balanceSheet: { ...data.balanceSheet },
        };
      } else {
        this.formData = this.emptyForm();
      }
    });
  }

  protected recalculate(): void {
    // Signal automatically recalculates via computed()
  }

  private emptyForm(): FinancialIndicatorData {
    return {
      meta: { financialYear: new Date().getFullYear(), month: 0, currency: 'ZAR', reportType: 'Monthly Management Accounts' },
      incomeStatement: { sales: 0, costOfSales: 0, operatingExpenses: 0 },
      balanceSheet: { cash: 0, cashEquivalents: 0, shortTermInvestments: 0, currentReceivables: 0, totalCurrentAssets: 0, totalAssets: 0, totalCurrentLiabilities: 0, totalLiabilities: 0, totalEquity: 0 },
    };
  }
}
