import { Component, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinancialCategoryDropdownComponent } from '../../../../shared/financial-category-dropdown/financial-category-dropdown.component';
import { FinancialCategory } from '../../../../../../models/financial.models';

export interface FinancialTableItem {
  name: string;
  amount: number;
  note?: string;
  category?: FinancialCategory;
  categoryId?: number;
}

@Component({
  selector: 'app-financial-item-table',
  standalone: true,
  imports: [CommonModule, FormsModule, FinancialCategoryDropdownComponent],
  template: `
    <div
      class="w-full bg-white rounded-lg border border-gray-200 overflow-hidden"
    >
      <!-- Header -->
      <div
        class="flex justify-between items-center bg-gray-50 px-4 py-3 border-b border-gray-200"
      >
        <div>
          <h3 class="text-base font-semibold text-gray-800">{{ title }}</h3>
          <p class="text-xs text-gray-500">{{ currency }} | Editable table</p>
        </div>
        <button
          (click)="addRow()"
          class="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded transition"
        >
          <i class="fas fa-plus"></i> Add
        </button>
      </div>

      <!-- Table -->
      <div class="divide-y divide-gray-200 text-sm">
        <!-- Header Row -->
        <div
          class="grid grid-cols-[2fr_1fr_2fr_auto] gap-3 bg-gray-100 text-gray-700 font-semibold px-4 py-2"
        >
          <div>Category</div>
          <div class="text-right">{{ currency }}</div>
          <div>Note</div>
          <div></div>
        </div>

        <!-- Table Body -->
        @if (list().length > 0) { @for (item of list(); track
        trackByIndex($index); let i = $index) {
        <div
          class="grid grid-cols-[2fr_1fr_2fr_auto] gap-3 items-center px-4 py-2 hover:bg-gray-50 transition"
        >
          <!-- Category Dropdown -->
          <app-financial-category-dropdown
            [itemType]="itemType"
            [selectedCategoryId]="item.categoryId || null"
            [loadMultipleTypes]="loadMultipleTypes"
            [allowedTypes]="allowedTypes"
            (categorySelected)="onCategorySelected(item, $event)"
            (categoryCreated)="onCategoryCreated($event)"
          ></app-financial-category-dropdown>

          <!-- Amount -->
          <input
            type="number"
            [(ngModel)]="item.amount"
            (input)="updateRow(i, item)"
            class="border border-gray-300 rounded-md px-2 py-1 text-sm text-right w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            step="0.01"
            min="0"
          />

          <!-- Note -->
          <input
            type="text"
            [(ngModel)]="item.note"
            (blur)="updateRow(i, item)"
            placeholder="Optional note"
            class="border border-gray-300 rounded-md px-2 py-1 text-sm w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />

          <!-- Delete -->
          <button
            (click)="deleteRow(i)"
            class="text-red-500 hover:text-red-700 transition"
            title="Delete row"
          >
            <i class="fas fa-trash"></i>
          </button>
        </div>
        } } @else {
        <!-- Empty State -->
        <div
          class="text-center text-gray-400 text-sm py-8 border-t border-gray-100"
        >
          No items yet. Click “Add” to start.
        </div>
        }

        <!-- Total Row -->
        <div
          class="grid grid-cols-[2fr_1fr_2fr_auto] gap-3 bg-gray-50 border-t font-semibold text-gray-800 px-4 py-2"
        >
          <div>Total</div>
          <div class="text-right">{{ total() | number : '1.2-2' }}</div>
          <div class="text-gray-400 italic">(calculated)</div>
          <div></div>
        </div>
      </div>
    </div>
  `,
})
export class FinancialItemTableComponent implements OnInit {
  @Input() title = 'Financial Items';
  @Input() currency = 'USD';
  @Input() items: FinancialTableItem[] = [];
  @Input() itemType: 'direct_cost' | 'operational_cost' | 'asset' | 'liability' | 'equity' = 'direct_cost';

  // New inputs for multi-type loading
  @Input() loadMultipleTypes = false;
  @Input() allowedTypes: ('direct_cost' | 'operational_cost' | 'asset' | 'liability' | 'equity')[] = [];

  // 🔄 Output events for change tracking
  @Output() itemsChanged = new EventEmitter<FinancialTableItem[]>();
  @Output() itemAdded = new EventEmitter<FinancialTableItem>();
  @Output() itemUpdated = new EventEmitter<{index: number, item: FinancialTableItem}>();
  @Output() itemDeleted = new EventEmitter<{index: number, item: FinancialTableItem}>();

  list = signal<FinancialTableItem[]>([]);
  total = signal(0);

  ngOnInit() {
    this.initializeItems();
  }

  initializeItems() {
    // Default placeholder data if none passed
    if (!this.items || this.items.length === 0) {
      this.list.set([
        { name: 'Supplies', amount: 2000, note: 'Materials for training' },
        { name: 'Direct labor', amount: 26000, note: 'Staff wages' },
      ]);
    } else {
      this.list.set(this.items);
    }
    this.calculateTotal();
  }

  addRow() {
    const newItem: FinancialTableItem = {
      name: 'New item',
      amount: 0,
      note: '',
    };
    this.list.update((rows) => [...rows, newItem]);
    this.calculateTotal();

    // 🔄 Emit change events
    this.itemAdded.emit(newItem);
    this.itemsChanged.emit(this.list());
  }

  updateRow(index?: number, item?: FinancialTableItem) {
    this.calculateTotal();

    // 🔄 Emit change events
    if (index !== undefined && item) {
      this.itemUpdated.emit({ index, item });
    }
    this.itemsChanged.emit(this.list());
  }

  deleteRow(index: number) {
    if (!confirm('Delete this item?')) return;

    const itemToDelete = this.list()[index];
    this.list.update((rows) => rows.filter((_, i) => i !== index));
    this.calculateTotal();

    // 🔄 Emit change events
    this.itemDeleted.emit({ index, item: itemToDelete });
    this.itemsChanged.emit(this.list());
  }

  calculateTotal() {
    const total = this.list().reduce((sum, i) => sum + (i.amount || 0), 0);
    this.total.set(total);
  }

  trackByIndex(index: number): number {
    return index;
  }

  onCategorySelected(item: FinancialTableItem, category: FinancialCategory | null) {
    const index = this.list().findIndex(listItem => listItem === item);

    if (category) {
      item.category = category;
      item.categoryId = category.id;
      item.name = category.name;
    } else {
      item.category = undefined;
      item.categoryId = undefined;
      item.name = '';
    }

    this.updateRow(index, item);
  }

  onCategoryCreated(newCategory: FinancialCategory) {
    console.log('New category created:', newCategory);
    // The dropdown component will handle adding it to the list
    // This is just for logging or additional processing if needed
  }
}
