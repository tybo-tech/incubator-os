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
    <tr class="border-b last:border-b-0">
      <td class="p-2">
        <div class="flex items-center gap-2">
          <i [class]="getCategoryIcon()" class="text-xs"></i>
          <span class="font-medium text-gray-900 text-sm">{{ row.category }}</span>
          <button
            class="text-gray-400 hover:text-blue-600 text-xs ml-1"
            (click)="onEditCategory()"
            title="Change category">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <i *ngIf="row.isSaving" class="fa-solid fa-spinner fa-spin text-blue-500 text-xs"></i>
        </div>
      </td>

      <td class="p-1 whitespace-nowrap" *ngFor="let _m of months; let mi = index">
        <div class="relative">
          <span class="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">R</span>
          <input
            type="number"
            class="ps-5 w-20 px-1 py-1 text-sm rounded border border-gray-200 text-right"
            [(ngModel)]="row.monthly[mi]"
            (change)="onCellChange()"
            [disabled]="disabled">
        </div>
      </td>

      <td class="p-2 font-semibold text-sm text-right whitespace-nowrap">
        R {{ row.total | number:'1.0-0' }}
      </td>

      <td class="p-2 text-center whitespace-nowrap">
        <button
          class="text-rose-600 hover:text-rose-700 text-sm"
          (click)="onRemove()"
          [disabled]="disabled">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    </tr>
  `
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
