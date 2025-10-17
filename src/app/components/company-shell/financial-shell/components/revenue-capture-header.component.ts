import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinancialYear } from '../../../../../services/financial-year.service';

@Component({
  selector: 'app-revenue-capture-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <header class="flex justify-between items-center">
      <div class="space-y-1">
        <h1 class="text-2xl font-semibold text-gray-800">
          Yearly Revenue Capture Pro
        </h1>
        <p class="text-gray-600">
          Manage monthly revenue data across financial years
        </p>
      </div>

      <div class="flex items-center gap-3">
        <!-- Add New Financial Year Section -->
        <div class="flex items-center gap-2">
          <label for="addYearSelect" class="text-sm font-medium text-gray-700">
            Add Year:
          </label>
          <select
            id="addYearSelect"
            [(ngModel)]="selectedYearId"
            (ngModelChange)="onSelectedYearChange($event)"
            class="px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
          >
            <option value="">Select year to add...</option>
            <option
              *ngFor="let fy of availableYears"
              [value]="fy.id"
              [class.font-bold]="fy.is_active"
            >
              {{ fy.name }} {{ fy.is_active ? '(Active)' : '' }}
            </option>
          </select>
          <button
            type="button"
            (click)="onAddYear()"
            [disabled]="!selectedYearId || availableYears.length === 0"
            class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i class="fas fa-plus w-4 h-4"></i>
            Add Year
          </button>
        </div>

        <!-- Management Button -->
        <button
          type="button"
          (click)="onOpenManagement()"
          class="px-3 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors border border-blue-200"
          title="Manage Financial Years & Accounts"
        >
          <i class="fas fa-cog w-4 h-4"></i>
        </button>
      </div>
    </header>
  `
})
export class RevenueCaptureHeaderComponent {
  @Input() availableYears: FinancialYear[] = [];
  @Input() selectedYearId: string = '';
  @Output() selectedYearIdChange = new EventEmitter<string>();
  @Output() addYear = new EventEmitter<void>();
  @Output() openManagement = new EventEmitter<void>();

  onAddYear() {
    this.addYear.emit();
  }

  onOpenManagement() {
    this.openManagement.emit();
  }

  onSelectedYearChange(value: string) {
    this.selectedYearIdChange.emit(value);
  }
}
