import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Constants } from '../../../../../../services/service';

export interface SummaryInfo {
  label: string;
  value: number;
  currency?: string;
  isPositive?: boolean;
}

@Component({
  selector: 'app-financial-item-summary-info',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="grid grid-cols-2 gap-4 text-sm mb-4">
  @for (item of summary; track item.label) {
    <div class="bg-white border border-gray-200 rounded-md p-3">
      <p class="text-gray-500">{{ item.label }}</p>
      <p class="font-semibold text-gray-900">
        @if (item.currency && item.currency !== 'items') {
          {{ item.currency }} {{ item.value | number:'1.0-0' }}
        } @else {
          {{ item.value | number:'1.0-0' }} {{ item.currency || '' }}
        }
      </p>
    </div>
  }
</div>
  `,
})
export class FinancialItemSummaryInfoComponent {
  @Input() summary: SummaryInfo[] = [
    { label: `Revenue ${Constants.Currency}`, value: 60000, currency: Constants.Currency },
    { label: `Gross Profit ${Constants.Currency}`, value: 32000, currency: Constants.Currency },
  ];
}
