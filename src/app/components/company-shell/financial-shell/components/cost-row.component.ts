import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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

@Component({
  selector: 'app-cost-row',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="cost-row">
      <div class="row-cell category-col">
        <div class="flex items-center gap-2">
          <i [class]="getCategoryIcon()" class="text-xs flex-shrink-0"></i>
          <span
            class="font-medium text-gray-900 text-sm truncate flex-1 cursor-help"
            [title]="row.category">
            {{ row.category }}
          </span>
          <button
            class="text-gray-400 hover:text-blue-600 text-xs flex-shrink-0"
            (click)="onEditCategory()"
            title="Change category">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <i *ngIf="row.isSaving" class="fa-solid fa-spinner fa-spin text-blue-500 text-xs flex-shrink-0"></i>
        </div>
      </div>

      <div class="row-cell month-col" *ngFor="let _m of months; let mi = index">
        <div class="relative w-full">
          <span class="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">R</span>
          <input
            type="number"
            class="ps-5 w-full px-1 py-1 text-sm rounded border border-gray-200 text-right"
            [(ngModel)]="row.monthly[mi]"
            (change)="onCellChange()"
            [disabled]="disabled">
        </div>
      </div>

      <div class="row-cell total-col">
        <span class="font-semibold text-sm">R {{ row.total | number:'1.0-0' }}</span>
      </div>

      <div class="row-cell actions-col">
        <button
          class="text-rose-600 hover:text-rose-700 text-sm"
          (click)="onRemove()"
          [disabled]="disabled"
          title="Remove this cost item">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>
  `,
  styles: [`
    /* Flexbox row layout to match header/footer */
    .cost-row {
      display: flex;
      width: 100%;
      border-bottom: 1px solid #f3f4f6;
    }

    .cost-row:hover {
      background-color: #f9fafb;
    }

    .row-cell {
      padding: 8px;
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    .category-col {
      width: 240px;
      min-width: 240px;
      justify-content: flex-start;
    }

    .month-col {
      width: 80px;
      min-width: 80px;
      justify-content: center;
    }

    .total-col {
      width: 120px;
      min-width: 120px;
      justify-content: flex-end;
    }

    .actions-col {
      width: 64px;
      min-width: 64px;
      justify-content: center;
    }

    .truncate {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Ensure consistent width for number inputs */
    input[type="number"] {
      min-width: 0;
    }

    /* Remove number input spinners for cleaner look */
    input[type="number"]::-webkit-outer-spin-button,
    input[type="number"]::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }    input[type="number"] {
      -moz-appearance: textfield;
    }
  `]
})
export class CostRowComponent {
  @Input() row!: CostLine;
  @Input() months: string[] = [];
  @Input() disabled = false;

  @Output() cellChange = new EventEmitter<CostLine>();
  @Output() editCategory = new EventEmitter<CostLine>();
  @Output() remove = new EventEmitter<number>();

  onCellChange() {
    // Sanitize values
    this.row.monthly = this.row.monthly.map(v => {
      const n = Number(v);
      return isFinite(n) && n >= 0 ? n : 0;
    });

    // Recalculate total
    this.row.total = this.row.monthly.reduce((a, b) => a + b, 0);

    this.cellChange.emit(this.row);
  }

  onEditCategory() {
    this.editCategory.emit(this.row);
  }

  onRemove() {
    this.remove.emit(this.row.id);
  }

  getCategoryIcon(): string {
    const baseClasses = this.row.type === 'direct'
      ? 'fa-solid fa-box text-emerald-600'
      : 'fa-solid fa-tags text-sky-600';
    return baseClasses;
  }
}
