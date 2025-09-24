import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IMetricRecord, IMetricType } from '../../../../../../models/metrics.model';

@Component({
  selector: 'app-quarterly-metrics-table',
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
            class="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2">
            <span>+</span>
            Add Year
          </button>
        </div>
      </div>

      <!-- Quarterly Data Table -->
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Q1</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Q2</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Q3</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Q4</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              <th *ngIf="metricType.show_margin" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Margin %</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr *ngFor="let record of sortedRecords; trackBy: trackByRecord" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ record.year }}</td>

              <!-- Q1-Q4 Inputs -->
              <td class="px-6 py-4 whitespace-nowrap">
                <input
                  type="number"
                  [(ngModel)]="record.q1"
                  (blur)="updateRecord(record)"
                  class="w-24 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                  step="0.01" />
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <input
                  type="number"
                  [(ngModel)]="record.q2"
                  (blur)="updateRecord(record)"
                  class="w-24 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                  step="0.01" />
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <input
                  type="number"
                  [(ngModel)]="record.q3"
                  (blur)="updateRecord(record)"
                  class="w-24 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                  step="0.01" />
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <input
                  type="number"
                  [(ngModel)]="record.q4"
                  (blur)="updateRecord(record)"
                  class="w-24 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                  step="0.01" />
              </td>

              <!-- Auto-calculated Total -->
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-blue-100 text-blue-800">
                  {{ getCalculatedTotal(record) | number:'1.2-2' }}
                </span>
              </td>

              <!-- Margin % Input (if applicable) -->
              <td *ngIf="metricType.show_margin" class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <input
                    type="number"
                    [(ngModel)]="record.margin_pct"
                    (blur)="updateRecord(record)"
                    class="w-20 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        <p class="text-sm text-gray-500 mb-4">Start by adding your first quarterly record.</p>
        <button
          (click)="addNewYear()"
          class="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors">
          Add {{ metricType.name }} Data
        </button>
      </div>
    </div>
  `
})
export class QuarterlyMetricsTableComponent {
  @Input() metricType!: IMetricType;
  @Input() records: IMetricRecord[] = [];
  @Output() recordUpdated = new EventEmitter<IMetricRecord>();
  @Output() recordDeleted = new EventEmitter<number>();
  @Output() addYearRequested = new EventEmitter<number>();

  get sortedRecords(): IMetricRecord[] {
    return [...this.records].sort((a, b) => b.year - a.year);
  }

  trackByRecord(index: number, record: IMetricRecord): number {
    return record.id;
  }

  getCalculatedTotal(record: IMetricRecord): number {
    const quarters = [record.q1, record.q2, record.q3, record.q4];
    return quarters.reduce((sum: number, val) => {
      // Convert sum to number (sum is already number from initial value)
      let numSum = sum;

      // Convert val to number
      let numVal = 0;
      if (typeof val === 'number') {
        numVal = val;
      } else if (val != null) {
        numVal = parseFloat(String(val)) || 0;
      }

      return numSum + numVal;
    }, 0);
  }

  updateRecord(record: IMetricRecord): void {
    // Ensure quarterly values are numbers
    record.q1 = record.q1 != null ? parseFloat(String(record.q1)) || null : null;
    record.q2 = record.q2 != null ? parseFloat(String(record.q2)) || null : null;
    record.q3 = record.q3 != null ? parseFloat(String(record.q3)) || null : null;
    record.q4 = record.q4 != null ? parseFloat(String(record.q4)) || null : null;

    // Auto-calculate total
    record.total = this.getCalculatedTotal(record);
    this.recordUpdated.emit(record);
  }

  deleteRecord(record: IMetricRecord): void {
    if (confirm(`Delete ${record.year} data?`)) {
      this.recordDeleted.emit(record.id);
    }
  }

  addNewYear(): void {
    const currentYear = new Date().getFullYear();
    const existingYears = this.records.map(r => r.year);
    let newYear = currentYear;

    // Find next available year
    while (existingYears.includes(newYear)) {
      newYear--;
    }

    this.addYearRequested.emit(newYear);
  }
}
