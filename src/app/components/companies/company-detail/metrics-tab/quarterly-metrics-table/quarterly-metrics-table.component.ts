import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IMetricRecord, IMetricType } from '../../../../../../models/metrics.model';
import { AddYearButtonComponent } from '../../../../shared/add-year-button/add-year-button.component';

@Component({
  selector: 'app-quarterly-metrics-table',
  standalone: true,
  imports: [CommonModule, FormsModule, AddYearButtonComponent],
  template: `
    <div class="bg-white rounded-lg shadow-sm border border-gray-200">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div class="flex justify-between items-center">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">{{ metricType.name }}</h3>
            <p *ngIf="metricType.description" class="text-sm text-gray-600 mt-1">
              {{ metricType.description }}
            </p>
          </div>
          <app-add-year-button
            [metricTypeName]="metricType.name"
            [buttonText]="'Add Year'"
            [buttonClass]="'primary'"
            [size]="'md'"
            [minYear]="2000"
            [maxYear]="2100"
            [existingYears]="existingYears"
            [modalTitle]="'Add New Year'"
            [inputLabel]="'Year'"
            [actionLabel]="'Create Year'"
            (yearAdded)="onYearAdded($event)">
          </app-add-year-button>
        </div>
      </div>

        <!-- Quarterly Data Table -->
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Q1</th>
                <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Q2</th>
                <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Q3</th>
                <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Q4</th>
                <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th *ngIf="metricType.show_margin" class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Margin %</th>
                <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let record of sortedRecords; trackBy: trackByRecord">
                <!-- Editable Year -->
                <td class="px-3 py-4 whitespace-nowrap">
                  <input
                    type="number"
                    [value]="record.year || ''"
                    (input)="onYearInput(record, $event)"
                    (blur)="updateRecord(record)"
                    class="w-20 px-2 py-1 text-sm font-medium text-gray-900 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="2000"
                    max="2100"
                    step="1"
                    placeholder="Year" />
                </td>

                <!-- Q1-Q4 Inputs -->
                <td class="px-3 py-4 whitespace-nowrap">
                  <input
                    type="number"
                    [(ngModel)]="record.q1"
                    (input)="onQuarterlyValueChange(record)"
                    (blur)="updateRecord(record)"
                    class="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                    step="0.01" />
                </td>
                <td class="px-3 py-4 whitespace-nowrap">
                  <input
                    type="number"
                    [(ngModel)]="record.q2"
                    (input)="onQuarterlyValueChange(record)"
                    (blur)="updateRecord(record)"
                    class="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                    step="0.01" />
                </td>
                <td class="px-3 py-4 whitespace-nowrap">
                  <input
                    type="number"
                    [(ngModel)]="record.q3"
                    (input)="onQuarterlyValueChange(record)"
                    (blur)="updateRecord(record)"
                    class="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                    step="0.01" />
                </td>
                <td class="px-3 py-4 whitespace-nowrap">
                  <input
                    type="number"
                    [(ngModel)]="record.q4"
                    (input)="onQuarterlyValueChange(record)"
                    (blur)="updateRecord(record)"
                    class="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                    step="0.01" />
                </td>

                <!-- Calculated Total -->
                <td class="px-3 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                  {{ formatCurrency(getCalculatedTotal(record)) }}
                </td>

                <!-- Margin % (if applicable) -->
                <td *ngIf="metricType.show_margin" class="px-3 py-4 whitespace-nowrap">
                  <input
                    type="number"
                    [(ngModel)]="record.margin_pct"
                    (blur)="updateRecord(record)"
                    class="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                    step="0.01"
                    min="0"
                    max="100" />
                  <span class="text-xs text-gray-500 ml-1">%</span>
                </td>

                <!-- Actions -->
                <td class="px-3 py-4 whitespace-nowrap text-sm">
                  <button
                    (click)="deleteRecord(record)"
                    class="text-red-600 hover:text-red-900 transition-colors">
                    🗑️
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty State -->
        <div *ngIf="sortedRecords.length === 0" class="px-6 py-12 text-center">
          <div class="text-gray-400 text-4xl mb-4">📊</div>
          <h3 class="text-sm font-medium text-gray-900 mb-2">No {{ metricType.name }} Data</h3>
          <p class="text-sm text-gray-500 mb-4">Start by adding your first quarterly record.</p>
          <app-add-year-button
            [metricTypeName]="metricType.name"
            [buttonText]="'Add ' + metricType.name + ' Data'"
            [buttonClass]="'primary'"
            [size]="'md'"
            [minYear]="2000"
            [maxYear]="2100"
            [existingYears]="existingYears"
            [modalTitle]="'Add New Year'"
            [inputLabel]="'Year'"
            [actionLabel]="'Create Year'"
            (yearAdded)="onYearAdded($event)">
          </app-add-year-button>
        </div>
      </div>
  `
})
export class QuarterlyMetricsTableComponent {
  @Input() metricType!: IMetricType;
  @Input() records: IMetricRecord[] = [];
  @Output() recordUpdated = new EventEmitter<IMetricRecord>();
  @Output() recordDeleted = new EventEmitter<number>();
  @Output() addYearRequested = new EventEmitter<{ metricTypeId: number; year: number }>();

  get sortedRecords(): IMetricRecord[] {
    return [...this.records].sort((a, b) => b.year - a.year);
  }

  get existingYears(): number[] {
    return this.records.map(r => r.year);
  }

  trackByRecord(index: number, record: IMetricRecord): number {
    return record.id;
  }

  onYearInput(record: IMetricRecord, event: Event): void {
    const target = event.target as HTMLInputElement;
    const yearValue = target.value.trim();

    // Handle empty input
    if (!yearValue) {
      record.year = undefined as any; // Allow empty for now
      return;
    }

    // Parse and validate year
    const parsedYear = parseInt(yearValue, 10);
    if (!isNaN(parsedYear)) {
      record.year = parsedYear;
    }
  }

  onQuarterlyValueChange(record: IMetricRecord): void {
    // Recalculate total immediately when any quarterly value changes
    record.total = this.getCalculatedTotal(record);
  }  getCalculatedTotal(record: IMetricRecord): number {
    const quarters = [record.q1, record.q2, record.q3, record.q4];
    return quarters.reduce((sum: number, val) => {
      const numVal = val ? parseFloat(String(val)) : 0;
      return sum + numVal;
    }, 0);
  }

  updateRecord(record: IMetricRecord): void {
    // Always ensure quarterly values are numbers and recalculate total
    record.q1 = record.q1 != null ? parseFloat(String(record.q1)) || null : null;
    record.q2 = record.q2 != null ? parseFloat(String(record.q2)) || null : null;
    record.q3 = record.q3 != null ? parseFloat(String(record.q3)) || null : null;
    record.q4 = record.q4 != null ? parseFloat(String(record.q4)) || null : null;

    // Auto-calculate total
    record.total = this.getCalculatedTotal(record);

    // Validate year only if it's set
    if (record.year !== undefined && record.year !== null) {
      const year = parseInt(String(record.year), 10);
      if (isNaN(year) || year < 2000 || year > 2100) {
        alert('Please enter a valid year between 2000 and 2100.');
        return;
      }

      // Check for duplicate years (excluding current record)
      const duplicateYear = this.records.find(r => r.id !== record.id && r.year === year);
      if (duplicateYear) {
        alert(`Year ${year} already exists for ${this.metricType.name}. Please choose a different year.`);
        return;
      }

      record.year = year;
    }

    // Always emit the updated record (even if year validation fails, we want to save the quarterly values)
    this.recordUpdated.emit(record);
  }

  deleteRecord(record: IMetricRecord): void {
    if (confirm(`Delete ${record.year} data?`)) {
      this.recordDeleted.emit(record.id);
    }
  }

  onYearAdded(year: number): void {
    this.addYearRequested.emit({
      metricTypeId: this.metricType.id,
      year: year
    });
  }

  addNewYear(): void {
    const currentYear = new Date().getFullYear();
    const existingYears = this.records.map(r => r.year);

    // Prompt user for year input
    const yearInput = prompt(`Enter the year for new ${this.metricType.name} record:`, currentYear.toString());

    if (!yearInput) return; // User cancelled

    const newYear = parseInt(yearInput, 10);

    // Validate year
    if (isNaN(newYear) || newYear < 2000 || newYear > 2100) {
      alert('Please enter a valid year between 2000 and 2100.');
      return;
    }

    // Check if year already exists
    if (existingYears.includes(newYear)) {
      alert(`Year ${newYear} already exists for ${this.metricType.name}. Please choose a different year.`);
      return;
    }

    this.addYearRequested.emit({
      metricTypeId: this.metricType.id,
      year: newYear
    });
  }  formatCurrency(value: number): string {
    if (value === 0) return '-';
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }
}
