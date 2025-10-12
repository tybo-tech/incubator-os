import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompanyFinancialItemService } from '../../../../../../services/company-financial-item.service';
import {
  CompanyFinancialItem,
  FinancialItemType,
} from '../../../../../../models/financial.models';
import { Constants } from '../../../../../../services';
import { FinancialItemTableComponent } from './financial-item-table.component';
import { FinancialItemHeaderComponent } from './financial-item-header.component';
import { FinancialItemSummaryInfoComponent } from './financial-item-summary-info.component';
import { PieComponent } from '../../../../../charts/pie/pie.component';
import { FinancialSectionHeaderComponent } from './financial-section-header.component';

@Component({
  selector: 'app-financial-item',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FinancialItemTableComponent,
    FinancialItemHeaderComponent,
    FinancialItemSummaryInfoComponent,
    PieComponent,
    FinancialSectionHeaderComponent,
  ],
  template: `
    <div class="bg-white rounded-xl shadow-sm p-6 w-full">
      <!-- Page Header -->
      <app-financial-section-header
        title="Cost Structure"
        subtitle="Overview of direct and operational costs"
        [year]="year"
        icon="fas fa-sack-dollar"
        actionLabel="Export PDF"
        actionIcon="fas fa-file-export"
        (onAction)="exportCostStructure()"
      >
      </app-financial-section-header>

      <!-- Two-column grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- LEFT COLUMN: Direct Costs -->
        <div
          class="flex flex-col bg-gray-50 border border-gray-200 rounded-lg p-4"
        >
          <!-- Section Header -->
          <app-financial-item-header
            title="Direct Costs"
            subtitle="Cost of goods / services sold"
          >
          </app-financial-item-header>

          <app-pie componentTitle="Direct Costs"></app-pie>

          <!-- Summary Info -->
          <app-financial-item-summary-info
            [summary]="[
              { label: 'Revenue USD', value: 60000, currency: '$' },
              { label: 'Gross Profit USD', value: 32000, currency: '$' }
            ]"
          >
          </app-financial-item-summary-info>

          <app-financial-item-table
            title="Direct Costs"
            currency="USD"
            itemType="direct_cost"
            [items]="[
              {
                name: 'Supplies',
                amount: 2000,
                note: 'Materials for training'
              },
              { name: 'Direct labor', amount: 26000, note: 'Staff wages' }
            ]"
          >
          </app-financial-item-table>
        </div>

        <!-- RIGHT COLUMN: Operational Costs -->
        <div
          class="flex flex-col bg-gray-50 border border-gray-200 rounded-lg p-4"
        >
          <!-- Section Header -->
          <app-financial-item-header
            title="Operational Costs"
            subtitle="Ongoing business expenses"
          >
          </app-financial-item-header>

          <app-pie componentTitle="Operational Costs"></app-pie>
          <!-- Summary Info -->
          <app-financial-item-summary-info
            [summary]="[
              { label: 'Revenue USD', value: 60000, currency: '$' },
              { label: 'Operating Profit USD', value: 18000, currency: '$' }
            ]"
          >
          </app-financial-item-summary-info>

          <app-financial-item-table
            title="Operational Costs"
            currency="USD"
            itemType="operational_cost"
            [items]="[
              {
                name: 'Marketing',
                amount: 8000,
                note: 'Advertising and promotion'
              },
              {
                name: 'Office Rent',
                amount: 6000,
                note: 'Monthly facility costs'
              }
            ]"
          >
          </app-financial-item-table>
        </div>
      </div>

      <!-- Footer -->
      <div class="mt-8 border-t pt-4 text-right text-xs text-gray-400">
        Last updated: {{ '2025-10-12' }}
      </div>
    </div>
  `,
})
export class FinancialItemComponent implements OnInit {
  @Input() companyId!: number;
  @Input() year!: number;
  @Input() itemType!: FinancialItemType;
  @Input() title = '';
  @Input() subtitle = '';
  currency = Constants.Currency;

  items = signal<CompanyFinancialItem[]>([]);
  isLoading = signal(false);
  totalAmount = signal(0);

  constructor(private service: CompanyFinancialItemService) {}

  ngOnInit() {
    this.loadItems();
  }

  loadItems() {
    this.isLoading.set(true);
    this.service
      .listFinancialItemsByYearAndType(this.companyId, this.year, this.itemType)
      .subscribe({
        next: (data) => {
          // Ensure we have a valid array
          const itemsArray = Array.isArray(data) ? data : [];
          this.items.set(itemsArray);
          this.calculateTotal();
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Error loading financial items', err);
          this.items.set([]); // Set empty array on error
          this.totalAmount.set(0);
          this.isLoading.set(false);
        },
      });
  }

  addItem() {
    const newItem: Partial<CompanyFinancialItem> = {
      company_id: this.companyId,
      year_: this.year,
      item_type: this.itemType,
      name: 'New Item',
      amount: 0,
      note: '',
    };

    this.service.addCompanyFinancialItem(newItem).subscribe({
      next: (res) => {
        this.items.update((list) => {
          const currentList = Array.isArray(list) ? list : [];
          return [...currentList, res];
        });
        this.calculateTotal();
      },
      error: (err) => {
        console.error('Error adding financial item', err);
      },
    });
  }

  updateItem(item: CompanyFinancialItem) {
    if (!item.id) return;
    this.service
      .updateCompanyFinancialItem(item.id, {
        amount: item.amount,
        note: item.note,
        name: item.name,
      })
      .subscribe({
        next: (res) => {
          this.items.update((list) => {
            const currentList = Array.isArray(list) ? list : [];
            return currentList.map((i) => (i.id === item.id ? res : i));
          });
          this.calculateTotal();
        },
        error: (err) => {
          console.error('Error updating financial item', err);
        },
      });
  }

  deleteItem(item: CompanyFinancialItem) {
    if (!confirm(`Delete "${item.name}"?`) || !item.id) return;
    this.service.deleteCompanyFinancialItem(item.id).subscribe({
      next: () => {
        this.items.update((list) => {
          const currentList = Array.isArray(list) ? list : [];
          return currentList.filter((i) => i.id !== item.id);
        });
        this.calculateTotal();
      },
      error: (err) => {
        console.error('Error deleting financial item', err);
      },
    });
  }

  calculateTotal() {
    const currentItems = this.items();
    // Safely check if items is an array before calling reduce
    if (!Array.isArray(currentItems)) {
      this.totalAmount.set(0);
      return;
    }

    const total = currentItems.reduce((sum, i) => sum + (i.amount ?? 0), 0);
    this.totalAmount.set(total);
  }

  trackByItemId(index: number, item: CompanyFinancialItem): number {
    return item.id ?? index;
  }

  exportCostStructure(): void {
    console.log('Exporting cost structure for year:', this.year);
    // Implementation for PDF export functionality
    // This would integrate with your PDF service
  }
}
