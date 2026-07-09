import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinancialIndicatorResponse } from '../../../../../../services/financial-indicator.service';

const MONTH_NAMES: Record<number, string> = {
  1: 'January', 2: 'February', 3: 'March', 4: 'April', 5: 'May', 6: 'June',
  7: 'July', 8: 'August', 9: 'September', 10: 'October', 11: 'November', 12: 'December'
};

@Component({
  selector: 'app-view-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" (click)="close.emit()">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto mx-4" (click)="$event.stopPropagation()">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">Financial Report</h3>
          <button (click)="close.emit()" class="p-1 text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="p-6 space-y-4" *ngIf="record() as r">
          <div class="text-sm text-gray-500">
            {{ MONTH_NAMES[r.data.meta.month] }} {{ r.data.meta.financialYear }} &mdash; {{ r.data.meta.reportType }}
          </div>

          <div>
            <h4 class="text-sm font-semibold text-gray-800 mb-2">Income Statement</h4>
            <div class="space-y-1 text-sm">
              <div class="flex justify-between"><span class="text-gray-600">Sales</span><span class="font-medium">{{ r.data.incomeStatement.sales | currency:'ZAR':'symbol':'1.0-0' }}</span></div>
              <div class="flex justify-between"><span class="text-gray-600">Cost of Sales</span><span class="font-medium">{{ r.data.incomeStatement.costOfSales | currency:'ZAR':'symbol':'1.0-0' }}</span></div>
              <div class="flex justify-between"><span class="text-gray-600">Operating Expenses</span><span class="font-medium">{{ r.data.incomeStatement.operatingExpenses | currency:'ZAR':'symbol':'1.0-0' }}</span></div>
            </div>
          </div>

          <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 class="text-sm font-semibold text-blue-800 mb-2">Calculated Values (from backend)</h4>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div><span class="text-blue-600">Gross Profit:</span> <strong>{{ r.grossProfit | currency:'ZAR':'symbol':'1.0-0' }}</strong></div>
              <div><span class="text-blue-600">Gross %:</span> <strong>{{ r.grossProfitPercentage }}%</strong></div>
              <div><span class="text-blue-600">Net Profit:</span> <strong>{{ r.netProfit | currency:'ZAR':'symbol':'1.0-0' }}</strong></div>
              <div><span class="text-blue-600">Net %:</span> <strong>{{ r.netProfitPercentage }}%</strong></div>
            </div>
          </div>

          <div>
            <h4 class="text-sm font-semibold text-gray-800 mb-2">Balance Sheet</h4>
            <div class="space-y-1 text-sm">
              <div class="flex justify-between"><span class="text-gray-600">Cash</span><span class="font-medium">{{ r.data.balanceSheet.cash | currency:'ZAR':'symbol':'1.0-0' }}</span></div>
              <div class="flex justify-between"><span class="text-gray-600">Cash Equivalents</span><span class="font-medium">{{ r.data.balanceSheet.cashEquivalents | currency:'ZAR':'symbol':'1.0-0' }}</span></div>
              <div class="flex justify-between"><span class="text-gray-600">Short Term Investments</span><span class="font-medium">{{ r.data.balanceSheet.shortTermInvestments | currency:'ZAR':'symbol':'1.0-0' }}</span></div>
              <div class="flex justify-between"><span class="text-gray-600">Current Receivables</span><span class="font-medium">{{ r.data.balanceSheet.currentReceivables | currency:'ZAR':'symbol':'1.0-0' }}</span></div>
              <div class="flex justify-between"><span class="text-gray-600">Total Current Assets</span><span class="font-medium">{{ r.data.balanceSheet.totalCurrentAssets | currency:'ZAR':'symbol':'1.0-0' }}</span></div>
              <div class="flex justify-between"><span class="text-gray-600">Total Assets</span><span class="font-medium">{{ r.data.balanceSheet.totalAssets | currency:'ZAR':'symbol':'1.0-0' }}</span></div>
              <div class="flex justify-between"><span class="text-gray-600">Total Current Liabilities</span><span class="font-medium">{{ r.data.balanceSheet.totalCurrentLiabilities | currency:'ZAR':'symbol':'1.0-0' }}</span></div>
              <div class="flex justify-between"><span class="text-gray-600">Total Liabilities</span><span class="font-medium">{{ r.data.balanceSheet.totalLiabilities | currency:'ZAR':'symbol':'1.0-0' }}</span></div>
              <div class="flex justify-between"><span class="text-gray-600">Total Equity</span><span class="font-medium">{{ r.data.balanceSheet.totalEquity | currency:'ZAR':'symbol':'1.0-0' }}</span></div>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end px-6 py-4 border-t border-gray-200">
          <button (click)="close.emit()" class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Close</button>
        </div>
      </div>
    </div>
  `
})
export class ViewDialogComponent {
  protected readonly MONTH_NAMES = MONTH_NAMES;
  record = input.required<FinancialIndicatorResponse | null>();
  close = output<void>();
}
