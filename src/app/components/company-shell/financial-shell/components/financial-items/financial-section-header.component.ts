import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-financial-section-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  <div class="flex items-center gap-3">
    @if (showYearSelector) {
      <div class="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-md">
        <span class="text-gray-600 text-sm">Year:</span>
        <select
          [(ngModel)]="selectedYear"
          (ngModelChange)="yearChange($event)"
          class="bg-transparent border-none outline-none font-semibold text-gray-900 text-sm cursor-pointer"
        >
          @for (year of availableYears; track year) {
            <option [value]="year">{{ year }}</option>
          }
        </select>
      </div>
    } @else if (year) {
      <div class="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-md">
        <span class="text-gray-600 text-sm">Year:</span>
        <div class="font-semibold text-gray-900">{{ year }}</div>
      </div>
    }

    @if (actionLabel) {
      <button
        type="button"
        (click)="onAction.emit()"
        class="bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-3 py-2 rounded-md transition-all flex items-center gap-2"
      >
        <i *ngIf="actionIcon" [class]="actionIcon"></i>
        {{ actionLabel }}
      </button>
    }
  </div>
</div>
  `,
})
export class FinancialSectionHeaderComponent {
  /** Title, e.g., "Cost Structure" or "Balance Sheet" */
  @Input() title = 'Financial Section';

  /** Optional subtitle, e.g., "Company Assets and Liabilities" */
  @Input() subtitle?: string;

  /** Optional year label (can be string or number) - used when showYearSelector is false */
  @Input() year?: number | string;

  /** Whether to show a year selector dropdown instead of static year display */
  @Input() showYearSelector = false;

  /** Available years for the dropdown */
  @Input() availableYears: number[] = [2024, 2023, 2022, 2021, 2020];

  /** Currently selected year */
  @Input() selectedYear: number = new Date().getFullYear();

  /** Optional icon class (e.g., "fas fa-chart-line") */
  @Input() icon?: string;

  /** Optional action button label (e.g., "Export", "Add", "Refresh") */
  @Input() actionLabel?: string;

  /** Optional action button icon (e.g., "fas fa-file-export") */
  @Input() actionIcon?: string;

  /** Event emitter for action button clicks */
  @Output() onAction = new EventEmitter<void>();

  /** Event emitter for year changes */
  @Output() onYearChange = new EventEmitter<number>();

  /**
   * Handle year selection change
   * @param year The newly selected year
   */
  yearChange(year: number): void {
    this.selectedYear = year;
    this.onYearChange.emit(year);
  }
}
