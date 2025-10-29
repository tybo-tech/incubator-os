import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CostRowComponent } from './cost-row.component';

interface CostLine {
  id: number;
  costingStatsId?: number;
  type: 'direct' | 'operational';
  category: string;
  categoryId?: number | null;
  monthly: number[];
  total: number;
  notes?: string;
  isSaving?: boolean;
}

type CostType = 'direct' | 'operational';

@Component({
  selector: 'app-cost-section',
  standalone: true,
  imports: [CommonModule, FormsModule, CostRowComponent],
  template: `
    <div class="rounded-2xl border border-gray-100 shadow-sm bg-white overflow-hidden">
      <!-- Section Header -->
      <div class="px-4 py-3 text-white flex items-center justify-between"
           [class.bg-emerald-600]="costType === 'direct'"
           [class.bg-sky-600]="costType === 'operational'">
        <div class="font-semibold flex items-center gap-2">
          <i [class]="getSectionIcon()"></i>
          {{ getSectionTitle() }}
        </div>
        <div class="text-sm">
          Total: <span class="font-semibold">R {{ sectionTotal | number:'1.0-0' }}</span>
        </div>
      </div>

      <!-- Add Row Button -->
      <div class="p-4 flex justify-start">
        <button
          class="px-4 py-2 rounded-xl text-white hover:opacity-90 flex items-center gap-2 shadow-sm transition-all"
          [class.bg-emerald-600]="costType === 'direct'"
          [class.bg-sky-600]="costType === 'operational'"
          (click)="onAddRow()"
          [disabled]="disabled">
          <i class="fa-solid fa-plus"></i>
          <span *ngIf="!disabled">{{ getAddButtonText() }}</span>
          <span *ngIf="disabled">Saving...</span>
        </button>
      </div>

      <!-- Table with Fixed Layout -->
      <div class="overflow-x-auto">
        <div class="min-w-[1000px]">
          <!-- Header Row -->
          <div class="cost-header">
            <div class="header-cell category-col">Category</div>
            <div class="header-cell month-col" *ngFor="let m of months">{{ m }}</div>
            <div class="header-cell total-col">Total</div>
            <div class="header-cell actions-col">Actions</div>
          </div>

          <!-- Data Rows -->
          <app-cost-row
            *ngFor="let row of rows; trackBy: trackById"
            [row]="row"
            [months]="months"
            [disabled]="disabled"
            (cellChange)="onRowCellChange($event)"
            (editCategory)="onRowEditCategory($event)"
            (remove)="onRowRemove($event)">
          </app-cost-row>

          <!-- Section Totals Footer -->
          <div class="cost-footer">
            <div class="footer-cell category-col">Section Total</div>
            <div class="footer-cell month-col" *ngFor="let _m of months; let mi = index">
              R {{ getMonthTotal(mi) | number:'1.0-0' }}
            </div>
            <div class="footer-cell total-col">R {{ sectionTotal | number:'1.0-0' }}</div>
            <div class="footer-cell actions-col"></div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Flexbox Layout for consistent column alignment */
    .cost-header,
    .cost-footer {
      display: flex;
      width: 100%;
    }

    .cost-header {
      background-color: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
    }

    .cost-footer {
      background-color: #f9fafb;
      border-top: 1px solid #e5e7eb;
      font-weight: 600;
    }

    .header-cell,
    .footer-cell {
      padding: 8px;
      font-size: 12px;
      font-weight: 500;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.025em;
      flex-shrink: 0;
    }

    .footer-cell {
      font-size: 14px;
      font-weight: 600;
      color: #1f2937;
      text-transform: none;
    }

    .category-col {
      width: 240px;
      min-width: 240px;
      text-align: left;
    }

    .month-col {
      width: 80px;
      min-width: 80px;
      text-align: center;
    }

    .total-col {
      width: 120px;
      min-width: 120px;
      text-align: right;
    }

    .actions-col {
      width: 64px;
      min-width: 64px;
      text-align: center;
    }

    /* Better scrollbar styling for horizontal scroll */
    .overflow-x-auto::-webkit-scrollbar {
      height: 8px;
    }

    .overflow-x-auto::-webkit-scrollbar-track {
      background: #f1f5f9;
      border-radius: 4px;
    }

    .overflow-x-auto::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 4px;
    }

    .overflow-x-auto::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
    }

    .footer-cell.month-col {
      text-align: center;
    }

    .footer-cell.total-col {
      text-align: right;
    }

    .footer-cell.actions-col {
      text-align: center;
    }

    /* Better scrollbar styling for horizontal scroll */
    .overflow-x-auto::-webkit-scrollbar {
      height: 8px;
    }

    .overflow-x-auto::-webkit-scrollbar-track {
      background: #f1f5f9;
      border-radius: 4px;
    }

    .overflow-x-auto::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 4px;
    }

    .overflow-x-auto::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
    }
  `]
})
export class CostSectionComponent {
  @Input() costType!: CostType;
  @Input() rows: CostLine[] = [];
  @Input() months: string[] = [];
  @Input() disabled = false;
  @Input() sectionTotal = 0;

  @Output() addRow = new EventEmitter<CostType>();
  @Output() rowCellChange = new EventEmitter<CostLine>();
  @Output() rowEditCategory = new EventEmitter<{ row: CostLine, type: CostType }>();
  @Output() rowRemove = new EventEmitter<{ type: CostType, id: number }>();

  trackById = (_: number, row: CostLine) => row.id;

  onAddRow() {
    this.addRow.emit(this.costType);
  }

  onRowCellChange(row: CostLine) {
    this.rowCellChange.emit(row);
  }

  onRowEditCategory(row: CostLine) {
    this.rowEditCategory.emit({ row, type: this.costType });
  }

  onRowRemove(rowId: number) {
    this.rowRemove.emit({ type: this.costType, id: rowId });
  }

  getMonthTotal(monthIndex: number): number {
    return this.rows.reduce((acc, row) => acc + (row.monthly?.[monthIndex] || 0), 0);
  }

  getSectionIcon(): string {
    return this.costType === 'direct'
      ? 'fa-solid fa-industry'
      : 'fa-solid fa-briefcase';
  }

  getSectionTitle(): string {
    return this.costType === 'direct'
      ? 'Direct Costs'
      : 'Operational Costs';
  }

  getAddButtonText(): string {
    return this.costType === 'direct'
      ? 'Add Direct Cost'
      : 'Add Operational Cost';
  }
}
