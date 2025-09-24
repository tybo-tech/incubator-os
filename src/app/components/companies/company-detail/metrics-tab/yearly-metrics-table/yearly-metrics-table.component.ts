import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IMetricRecord, IMetricType } from '../../../../../../models/metrics.model';

@Component({
  selector: 'app-yearly-metrics-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
          <button
            (click)="addNewYear()"
            class="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors flex items-center gap-2">
            <span>+</span>
            Add Year
          </button>
        </div>
      </div>

      <!-- Simple Table -->
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Annual Value <span class="text-gray-400">({{ metricType.unit }})</span>
              </th>
              <th *ngIf="metricType.show_margin" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Margin %
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr *ngFor="let record of sortedRecords; trackBy: trackByRecord" class="hover:bg-gray-50">
              <!-- Year -->
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm font-medium text-gray-900">{{ record.year }}</span>
              </td>

              <!-- Annual Value Input -->
              <td class="px-6 py-4 whitespace-nowrap">
                <input
                  type="number"
                  [(ngModel)]="record.total"
                  (blur)="updateRecord(record)"
                  class="w-32 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0.00"
                  step="0.01" />
              </td>

              <!-- Margin Input (if applicable) -->
              <td *ngIf="metricType.show_margin" class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <input
                    type="number"
                    [(ngModel)]="record.margin_pct"
                    (blur)="updateRecord(record)"
                    class="w-20 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="0"
                    step="0.1"
                    min="0"
                    max="100" />
                  <span class="text-sm text-gray-500 ml-2">%</span>
                </div>
              </td>

              <!-- Actions -->
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  (click)="deleteRecord(record)"
                  class="text-red-600 hover:text-red-900 hover:bg-red-50 px-2 py-1 rounded transition-colors">
                  Delete
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
        <p class="text-sm text-gray-500 mb-4">Start by adding your first annual record.</p>
        <button
          (click)="addNewYear()"
          class="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors">
          Add {{ metricType.name }} Data
        </button>
      </div>
    </div>
  `
})
export class YearlyMetricsTableComponent {
  @Input() metricType!: IMetricType;
  @Input() records: IMetricRecord[] = [];
  @Output() recordUpdated = new EventEmitter<IMetricRecord>();
  @Output() recordDeleted = new EventEmitter<number>();
  @Output() addYearRequested = new EventEmitter<{ metricTypeId: number; year: number }>();

  get sortedRecords(): IMetricRecord[] {
    return [...this.records].sort((a, b) => b.year - a.year);
  }

  trackByRecord(index: number, record: IMetricRecord): number {
    return record.id;
  }

  updateRecord(record: IMetricRecord): void {
    // Ensure values are numbers before emitting
    record.total = record.total != null ? parseFloat(String(record.total)) || null : null;
    record.margin_pct = record.margin_pct != null ? parseFloat(String(record.margin_pct)) || null : null;

    this.recordUpdated.emit(record);
  }

  deleteRecord(record: IMetricRecord): void {
    if (confirm(`Delete ${record.year} ${this.metricType.name} data?`)) {
      this.recordDeleted.emit(record.id);
    }
  }

  addNewYear(): void {
    const currentYear = new Date().getFullYear();
    const existingYears = this.records.map(r => r.year);
    let nextYear = currentYear;

    // Find the next available year
    while (existingYears.includes(nextYear)) {
      nextYear++;
    }

    this.addYearRequested.emit({
      metricTypeId: this.metricType.id,
      year: nextYear
    });
  }

  getLatestValue(): number {
    if (this.sortedRecords.length === 0) return 0;
    return this.sortedRecords[0].total || 0;
  }

  getAverageValue(): number {
    if (this.sortedRecords.length === 0) return 0;
    const sum = this.sortedRecords.reduce((acc, record) => acc + (record.total || 0), 0);
    return sum / this.sortedRecords.length;
  }

  getGrowthRate(): number {
    if (this.sortedRecords.length < 2) return 0;

    const latest = this.sortedRecords[0].total || 0;
    const previous = this.sortedRecords[1].total || 0;

    if (previous === 0) return 0;
    return ((latest - previous) / previous) * 100;
  }

  formatCurrency(value: number): string {
    if (value === 0) return '-';

    if (this.metricType.unit === 'count') {
      return value.toLocaleString('en-ZA');
    }

    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }
}
