import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinancialIndicatorSummary } from '../../../../../../services/financial-indicator.service';

const MONTH_NAMES: Record<number, string> = {
  1: 'January', 2: 'February', 3: 'March', 4: 'April', 5: 'May', 6: 'June',
  7: 'July', 8: 'August', 9: 'September', 10: 'October', 11: 'November', 12: 'December'
};

@Component({
  selector: 'app-financial-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Financial Year</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sales</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gross Profit</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net Profit</th>
              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr *ngFor="let item of records()" class="hover:bg-gray-50 transition-colors">
              <td class="px-4 py-3 text-sm font-medium text-gray-900">{{ item.financialYear }}</td>
              <td class="px-4 py-3 text-sm text-gray-700">{{ MONTH_NAMES[item.month] || item.month }}</td>
              <td class="px-4 py-3 text-sm text-right text-gray-900">-</td>
              <td class="px-4 py-3 text-sm text-right text-green-600 font-medium">{{ item.grossProfit | currency:'ZAR':'symbol':'1.0-0' }}</td>
              <td class="px-4 py-3 text-sm text-right" [class.text-green-600]="(item.netProfit ?? 0) >= 0" [class.text-red-600]="(item.netProfit ?? 0) < 0">
                {{ item.netProfit | currency:'ZAR':'symbol':'1.0-0' }}
              </td>
              <td class="px-4 py-3 text-center">
                <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                  {{ item.status }}
                </span>
              </td>
              <td class="px-4 py-3 text-sm text-gray-500">{{ item.createdAt | date:'short' }}</td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end space-x-2">
                  <button (click)="view.emit(item)" class="p-1 text-gray-400 hover:text-blue-600 transition-colors" title="View">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  </button>
                  <button (click)="edit.emit(item)" class="p-1 text-gray-400 hover:text-indigo-600 transition-colors" title="Edit">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                  </button>
                  <button (click)="delete.emit(item)" class="p-1 text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </div>
              </td>
            </tr>
            <tr *ngIf="records().length === 0">
              <td colspan="8" class="px-4 py-8 text-center text-gray-500">No financial records found. Click "New Report" to create one.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class FinancialListComponent {
  protected readonly MONTH_NAMES = MONTH_NAMES;
  records = input.required<FinancialIndicatorSummary[]>();
  view = output<FinancialIndicatorSummary>();
  edit = output<FinancialIndicatorSummary>();
  delete = output<FinancialIndicatorSummary>();
}
