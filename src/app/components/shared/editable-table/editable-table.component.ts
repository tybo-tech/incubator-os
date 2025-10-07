import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface EditableTableColumn {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'readonly' | 'currency' | 'percentage';
  editable: boolean;
  required?: boolean;
  width?: string;
  options?: { value: any; label: string }[]; // For select type
  format?: 'currency' | 'percentage' | 'number'; // For display formatting
  calculateTotal?: boolean; // Whether to include in row totals
  precision?: number; // For number/currency precision
  placeholder?: string;
  min?: number;
  max?: number;
}

export interface EditableTableConfig {
  columns: EditableTableColumn[];
  enableAdd?: boolean;
  enableDelete?: boolean;
  enableExport?: boolean;
  showTotals?: boolean;
  striped?: boolean;
  compact?: boolean;
  loading?: boolean;
}

export interface EditableTableAction {
  type: 'add' | 'edit' | 'delete' | 'export';
  data?: any;
  index?: number;
}

@Component({
  selector: 'app-editable-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-lg shadow-sm border border-gray-200">
      <!-- Table Header -->
      <div *ngIf="title || config.enableAdd || config.enableExport"
           class="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div class="flex justify-between items-center">
          <div *ngIf="title">
            <h3 class="text-lg font-semibold text-gray-900">{{ title }}</h3>
            <p *ngIf="subtitle" class="text-sm text-gray-600 mt-1">{{ subtitle }}</p>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center gap-3">
            <button
              *ngIf="config.enableExport && data.length > 0"
              (click)="onAction('export')"
              [disabled]="config.loading"
              class="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center">
              <i class="fas fa-file-export mr-2"></i>
              Export
            </button>

            <button
              *ngIf="config.enableAdd"
              (click)="onAction('add')"
              [disabled]="config.loading"
              class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center">
              <i class="fas fa-plus mr-2"></i>
              Add Row
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="config.loading" class="px-6 py-12 text-center">
        <div class="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p class="text-gray-500">Loading data...</p>
      </div>

      <!-- Table Content -->
      <div *ngIf="!config.loading" class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <!-- Table Header -->
          <thead class="bg-gray-50">
            <tr>
              <th
                *ngFor="let column of config.columns"
                [style.width]="column.width"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {{ column.label }}
                <span *ngIf="column.required" class="text-red-500 ml-1">*</span>
              </th>
              <th *ngIf="config.enableDelete"
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                Actions
              </th>
            </tr>
          </thead>

          <!-- Table Body -->
          <tbody [class]="config.striped ? 'bg-white divide-y divide-gray-200' : 'bg-white'">
            <tr *ngFor="let row of data; let i = index; trackBy: trackByFn"
                [class]="config.striped && i % 2 === 1 ? 'bg-gray-50' : ''">

              <!-- Data Cells -->
              <td *ngFor="let column of config.columns"
                  [class]="config.compact ? 'px-4 py-2' : 'px-6 py-4'"
                  class="whitespace-nowrap">

                <!-- Readonly Field -->
                <span *ngIf="!column.editable"
                      class="text-sm text-gray-900">
                  {{ formatValue(row[column.key], column) }}
                </span>

                <!-- Text Input -->
                <input
                  *ngIf="column.editable && column.type === 'text'"
                  type="text"
                  [(ngModel)]="row[column.key]"
                  (blur)="onCellEdit(row, column.key, i, $event)"
                  [placeholder]="column.placeholder || ''"
                  [required]="column.required || false"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent">

                <!-- Number Input -->
                <input
                  *ngIf="column.editable && (column.type === 'number' || column.type === 'currency' || column.type === 'percentage')"
                  type="number"
                  [(ngModel)]="row[column.key]"
                  (blur)="onCellEdit(row, column.key, i, $event)"
                  [placeholder]="column.placeholder || '0'"
                  [required]="column.required || false"
                  [min]="column.min || null"
                  [max]="column.max || null"
                  [step]="getStep(column)"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent">

                <!-- Select Dropdown -->
                <select
                  *ngIf="column.editable && column.type === 'select'"
                  [(ngModel)]="row[column.key]"
                  (change)="onCellEdit(row, column.key, i, $event)"
                  [required]="column.required || false"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">Select...</option>
                  <option *ngFor="let option of column.options" [value]="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </td>

              <!-- Actions Column -->
              <td *ngIf="config.enableDelete"
                  [class]="config.compact ? 'px-4 py-2' : 'px-6 py-4'"
                  class="whitespace-nowrap text-sm">
                <button
                  (click)="onAction('delete', row, i)"
                  class="text-red-600 hover:text-red-900 transition-colors"
                  title="Delete row">
                  <i class="fas fa-trash-alt"></i>
                </button>
              </td>
            </tr>
          </tbody>

          <!-- Totals Row -->
          <tfoot *ngIf="config.showTotals && data.length > 0"
                 class="bg-gray-50 border-t-2 border-gray-300">
            <tr>
              <td *ngFor="let column of config.columns; let isFirst = first"
                  [class]="config.compact ? 'px-4 py-3' : 'px-6 py-3'"
                  class="text-sm font-bold text-gray-900">
                <span *ngIf="isFirst">TOTAL</span>
                <span *ngIf="!isFirst && column.calculateTotal">
                  {{ formatValue(calculateColumnTotal(column.key), column) }}
                </span>
                <span *ngIf="!isFirst && !column.calculateTotal">-</span>
              </td>
              <td *ngIf="config.enableDelete"
                  [class]="config.compact ? 'px-4 py-3' : 'px-6 py-3'"
                  class="text-sm font-bold text-gray-900">-</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Empty State -->
      <div *ngIf="!config.loading && data.length === 0" class="px-6 py-12 text-center">
        <div class="text-gray-400 text-4xl mb-4">
          <i [class]="emptyStateIcon"></i>
        </div>
        <h3 class="text-sm font-medium text-gray-900 mb-2">{{ emptyStateTitle }}</h3>
        <p class="text-sm text-gray-500 mb-4">{{ emptyStateMessage }}</p>
        <button
          *ngIf="config.enableAdd"
          (click)="onAction('add')"
          class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors">
          {{ emptyStateButtonText }}
        </button>
      </div>
    </div>
  `
})
export class EditableTableComponent implements OnInit {
  @Input() data: any[] = [];
  @Input() config!: EditableTableConfig;
  @Input() title?: string;
  @Input() subtitle?: string;
  @Input() emptyStateIcon = 'fas fa-table';
  @Input() emptyStateTitle = 'No Data';
  @Input() emptyStateMessage = 'No records found. Start by adding your first entry.';
  @Input() emptyStateButtonText = 'Add First Entry';

  @Output() cellEdit = new EventEmitter<{ row: any; field: string; index: number; value: any }>();
  @Output() action = new EventEmitter<EditableTableAction>();

  ngOnInit() {
    // Set default configuration values
    if (!this.config) {
      this.config = { columns: [] };
    }

    // Set defaults
    this.config.enableAdd = this.config.enableAdd ?? true;
    this.config.enableDelete = this.config.enableDelete ?? true;
    this.config.enableExport = this.config.enableExport ?? false;
    this.config.showTotals = this.config.showTotals ?? false;
    this.config.striped = this.config.striped ?? true;
    this.config.compact = this.config.compact ?? false;
    this.config.loading = this.config.loading ?? false;
  }

  trackByFn(index: number, item: any): any {
    return item.id || index;
  }

  onCellEdit(row: any, field: string, index: number, event?: Event): void {
    let value = row[field];

    // If we have an event (from input or select), get the value directly from the element
    if (event && event.target) {
      const element = event.target as HTMLInputElement | HTMLSelectElement;
      value = element.value;

      // For number inputs, convert to number if it's not empty
      if (element.type === 'number' && value !== '' && value !== null) {
        value = Number(value);
      }

      // Update the row data immediately to ensure consistency
      row[field] = value;
    }

    console.log('EditableTable - onCellEdit:', { field, value, rowValue: row[field], hasEvent: !!event, eventType: event?.target?.constructor.name });
    this.cellEdit.emit({ row, field, index, value });
  }

  onAction(type: 'add' | 'edit' | 'delete' | 'export', data?: any, index?: number): void {
    this.action.emit({ type, data, index });
  }

  formatValue(value: any, column: EditableTableColumn): string {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    const numValue = Number(value);

    switch (column.type) {
      case 'currency':
        if (isNaN(numValue) || numValue === 0) return '-';
        return new Intl.NumberFormat('en-ZA', {
          style: 'currency',
          currency: 'ZAR',
          minimumFractionDigits: column.precision ?? 0,
          maximumFractionDigits: column.precision ?? 0
        }).format(numValue);

      case 'percentage':
        if (isNaN(numValue) || numValue === 0) return '-';
        return `${numValue.toFixed(column.precision ?? 1)}%`;

      case 'number':
        if (isNaN(numValue)) return value.toString();
        return numValue.toFixed(column.precision ?? 0);

      case 'select':
        const option = column.options?.find(opt => opt.value === value);
        return option ? option.label : value?.toString() || '-';

      default:
        return value?.toString() || '-';
    }
  }

  getStep(column: EditableTableColumn): string {
    if (column.type === 'currency') {
      return column.precision === 0 ? '1' : '0.01';
    }
    if (column.type === 'percentage') {
      return '0.1';
    }
    if (column.precision !== undefined) {
      return Math.pow(10, -column.precision).toString();
    }
    return '1';
  }

  calculateColumnTotal(columnKey: string): number {
    return this.data.reduce((sum, row) => {
      const value = Number(row[columnKey]) || 0;
      return sum + value;
    }, 0);
  }
}
