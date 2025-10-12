import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-financial-section-header',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="flex justify-between items-center border-b pb-4 mb-6">
  <div class="flex items-center gap-3">
    @if (icon) {
      <div class="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600">
        <i [class]="icon + ' text-lg'"></i>
      </div>
    }
    <div>
      <h2 class="text-2xl font-semibold text-gray-800">{{ title }}</h2>
      @if (subtitle) {
        <p class="text-sm text-gray-500 mt-1">{{ subtitle }}</p>
      }
    </div>
  </div>

  @if (year) {
    <div class="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-md">
      <span class="text-gray-600 text-sm">Year:</span>
      <div class="font-semibold text-gray-900">{{ year }}</div>
    </div>
  }
</div>
  `,
})
export class FinancialSectionHeaderComponent {
  /** Title, e.g., "Cost Structure" or "Balance Sheet" */
  @Input() title = 'Financial Section';

  /** Optional subtitle, e.g., "Company Assets and Liabilities" */
  @Input() subtitle?: string;

  /** Optional year label (can be string or number) */
  @Input() year?: number | string;

  /** Optional icon class (e.g., "fas fa-chart-line") */
  @Input() icon?: string;

  /** Optional future event, e.g., for Add or Refresh buttons */
  @Output() onAction = new EventEmitter<void>();
}
