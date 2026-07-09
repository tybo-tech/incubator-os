import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinancialIndicatorSummaryResponse } from '../../../../../../services/financial-indicator.service';

@Component({
  selector: 'app-financial-summary-cards',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <p class="text-sm text-gray-500 font-medium">Sales</p>
        <p class="text-xl font-bold text-gray-900 mt-1">{{ summary()?.latestSales | currency:'ZAR':'symbol':'1.0-0' }}</p>
      </div>
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <p class="text-sm text-gray-500 font-medium">Gross Profit</p>
        <p class="text-xl font-bold text-green-600 mt-1">{{ summary()?.latestGrossProfit | currency:'ZAR':'symbol':'1.0-0' }}</p>
      </div>
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <p class="text-sm text-gray-500 font-medium">Net Profit</p>
        <p class="text-xl font-bold mt-1" [class.text-green-600]="(summary()?.latestNetProfit ?? 0) >= 0" [class.text-red-600]="(summary()?.latestNetProfit ?? 0) < 0">
          {{ summary()?.latestNetProfit | currency:'ZAR':'symbol':'1.0-0' }}
        </p>
      </div>
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <p class="text-sm text-gray-500 font-medium">Gross Margin</p>
        <p class="text-xl font-bold text-gray-900 mt-1">{{ summary()?.grossMargin ?? 0 }}%</p>
      </div>
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <p class="text-sm text-gray-500 font-medium">Net Margin</p>
        <p class="text-xl font-bold mt-1" [class.text-green-600]="(summary()?.netMargin ?? 0) >= 0" [class.text-red-600]="(summary()?.netMargin ?? 0) < 0">
          {{ summary()?.netMargin ?? 0 }}%
        </p>
      </div>
    </div>
  `
})
export class FinancialSummaryCardsComponent {
  summary = input.required<FinancialIndicatorSummaryResponse | null>();
}
