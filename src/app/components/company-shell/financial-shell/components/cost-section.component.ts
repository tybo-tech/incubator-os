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

      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="min-w-[1000px] w-full table-fixed">
          <thead>
            <tr class="bg-gray-50 text-xs text-gray-500">
              <th class="text-left p-2 w-60 min-w-[200px]">Category</th>
              <th class="p-1 text-center w-20 whitespace-nowrap" *ngFor="let m of months">{{ m }}</th>
              <th class="p-2 w-32 text-right whitespace-nowrap">Total</th>
              <th class="p-2 w-16 text-center whitespace-nowrap">Actions</th>
            </tr>
          </thead>

          <tbody>
            <app-cost-row
              *ngFor="let row of rows; trackBy: trackById"
              [row]="row"
              [months]="months"
              [disabled]="disabled"
              (cellChange)="onRowCellChange($event)"
              (editCategory)="onRowEditCategory($event)"
              (remove)="onRowRemove($event)">
            </app-cost-row>
          </tbody>

          <!-- Section Totals Footer -->
          <tfoot>
            <tr class="bg-gray-50 font-semibold text-sm">
              <td class="p-2 text-right w-60 min-w-[200px]">Section Total</td>
              <td class="p-1 text-center w-20 whitespace-nowrap" *ngFor="let _m of months; let mi = index">
                R {{ getMonthTotal(mi) | number:'1.0-0' }}
              </td>
              <td class="p-2 text-right w-32 whitespace-nowrap">R {{ sectionTotal | number:'1.0-0' }}</td>
              <td class="p-2 w-16"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  `,
  styles: [`
    /* Ensure table layout is consistent */
    .table-fixed {
      table-layout: fixed;
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
