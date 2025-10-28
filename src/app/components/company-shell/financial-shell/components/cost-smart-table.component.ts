import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface CostLine {
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
  selector: 'app-cost-smart-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="rounded-2xl border border-gray-100 shadow-sm bg-white overflow-hidden mb-8">
    <!-- Header -->
    <div class="px-4 py-3 text-white flex items-center justify-between"
         [ngClass]="'bg-' + color + '-600'">
      <div class="font-semibold flex items-center gap-2">
        <i [class]="icon"></i>
        {{ title }}
      </div>
      <div class="text-sm">Total: 
        <span class="font-semibold">R {{ total | number:'1.0-0' }}</span>
      </div>
    </div>

    <!-- Add Row Button -->
    <div class="p-4 flex justify-start">
      <button class="px-4 py-2 rounded-xl text-white hover:opacity-90 flex items-center gap-2 shadow-sm transition-all"
              [ngClass]="'bg-' + color + '-600'"
              (click)="addClicked.emit()"
              [disabled]="isProcessing">
        <i class="fa-solid fa-plus"></i> 
        <span *ngIf="!isProcessing">Add {{ title }}</span>
        <span *ngIf="isProcessing">Saving...</span>
      </button>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto">
      <table class="min-w-[1000px] w-full">
        <thead>
          <tr class="bg-gray-50 text-xs text-gray-500">
            <th class="text-left p-2 min-w-[200px] w-56">Category</th>
            <th class="p-1 text-center w-20 whitespace-nowrap" *ngFor="let m of months">{{ m }}</th>
            <th class="p-2 w-40 text-right whitespace-nowrap">Total</th>
            <th class="p-2 w-16 text-center whitespace-nowrap">Actions</th>
          </tr>
        </thead>

        <tbody>
          <tr *ngFor="let row of rows; trackBy: trackById" class="border-b last:border-b-0">
            <td class="p-2">
              <div class="flex items-center gap-2">
                <i [ngClass]="'fa-solid text-' + color + '-600 text-xs ' + (costType === 'direct' ? 'fa-box' : 'fa-tags')"></i>
                <span class="font-medium text-gray-900 text-sm">{{ row.category }}</span>
                <i *ngIf="row.isSaving" class="fa-solid fa-spinner fa-spin text-blue-500 text-xs"></i>
              </div>
            </td>

            <!-- Monthly Inputs -->
            <td class="p-1 whitespace-nowrap" *ngFor="let _m of months; let mi = index">
              <div class="relative">
                <span class="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">R</span>
                <input type="number"
                       class="ps-5 w-20 px-1 py-1 text-sm rounded border border-gray-200 text-right"
                       [(ngModel)]="row.monthly[mi]"
                       (change)="onCellEdit(row)">
              </div>
            </td>

            <!-- Total -->
            <td class="p-2 font-semibold text-sm text-right whitespace-nowrap">
              R {{ row.total | number:'1.0-0' }}
            </td>

            <!-- Actions -->
            <td class="p-2 text-center whitespace-nowrap">
              <button class="text-rose-600 hover:text-rose-700 text-sm"
                      (click)="deleteRow(row.id)">
                <i class="fa-solid fa-trash"></i>
              </button>
            </td>
          </tr>
        </tbody>

        <!-- Totals -->
        <tfoot>
          <tr class="bg-gray-50 font-semibold text-sm">
            <td class="p-2 text-right whitespace-nowrap">Section Total</td>
            <td class="p-1 text-center whitespace-nowrap" *ngFor="let _m of months; let mi = index">
              R {{ sectionMonthTotal(mi) | number:'1.0-0' }}
            </td>
            <td class="p-2 text-right whitespace-nowrap">R {{ total | number:'1.0-0' }}</td>
            <td class="p-2"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
  `
})
export class CostSmartTableComponent {
  @Input() title!: string;
  @Input() color: string = 'emerald';
  @Input() icon: string = 'fa-solid fa-box';
  @Input() costType: 'direct' | 'operational' = 'direct';
  @Input() rows: CostLine[] = [];
  @Input() months: string[] = [];
  @Input() total = 0;
  @Input() isProcessing = false;

  @Output() addClicked = new EventEmitter<void>();
  @Output() rowChanged = new EventEmitter<CostLine>();
  @Output() rowDeleted = new EventEmitter<number>();

  trackById = (_: number, row: CostLine) => row.id;

  onCellEdit(row: CostLine) {
    row.monthly = row.monthly.map(v => (isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : 0));
    row.total = row.monthly.reduce((a, b) => a + b, 0);
    this.rowChanged.emit(row);
  }

  deleteRow(id: number) {
    this.rowDeleted.emit(id);
  }

  sectionMonthTotal(monthIdx: number): number {
    return this.rows.reduce((acc, r) => acc + (r.monthly?.[monthIdx] || 0), 0);
  }
}
