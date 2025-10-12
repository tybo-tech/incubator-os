import { Component, Input, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ContextService } from '../../../../../services/context.service';
import {
  FinancialItemType,
  CompanyFinancialItem,
} from '../../../../../models/financial.models';
import { CompanyFinancialItemService } from '../../../../../services/company-financial-item.service';
import { FinancialCalculationService } from '../../../../../services/financial-calculation.service';
import { FinancialBaseComponent } from './financial-base.component';
import { FinancialItemTableComponent, FinancialTableItem } from './financial-items/financial-item-table.component';
import { FinancialItemSummaryInfoComponent } from './financial-items/financial-item-summary-info.component';
import { FinancialItemHeaderComponent } from './financial-items/financial-item-header.component';
import { PieComponent } from '../../../../charts/pie/pie.component';
import { FinancialSectionHeaderComponent } from './financial-items/financial-section-header.component';
import { IPieChart } from '../../../../../models/Charts';

export interface ExtendedFinancialTableItem extends FinancialTableItem {
  _originalItem?: CompanyFinancialItem;
}

@Component({
  selector: 'app-cost-structure',
  standalone: true,
  imports: [
    CommonModule,
    FinancialItemTableComponent,
    FinancialItemSummaryInfoComponent,
    FinancialItemHeaderComponent,
    PieComponent,
    FinancialSectionHeaderComponent,
  ],
  template: `
    <div class="bg-white rounded-xl shadow-sm p-6 w-full">
      <!-- Page Header -->
      <app-financial-section-header
        title="Cost Structure"
        subtitle="Overview of direct and operational costs"
        [showYearSelector]="true"
        [selectedYear]="year"
        [availableYears]="availableYears"
        icon="fas fa-sack-dollar"
        actionLabel="Export PDF"
        actionIcon="fas fa-file-export"
        (onAction)="exportCostStructure()"
        (onYearChange)="onYearChange($event)"
      >
      </app-financial-section-header>

      <!-- Save Changes Bar (shown when there are unsaved changes) -->
      <div *ngIf="hasUnsavedChanges()"
           class="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
        <div class="flex items-center gap-3">
          <i class="fas fa-exclamation-triangle text-amber-600"></i>
          <div>
            <p class="font-semibold text-amber-800">You have unsaved changes</p>
            <p class="text-sm text-amber-600">{{ unsavedChanges().size }} item(s) modified</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            (click)="clearUnsavedChanges()"
            class="px-3 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors">
            Cancel Changes
          </button>
          <button
            type="button"
            (click)="bulkSaveChanges()"
            [disabled]="isSaving()"
            class="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
            <i *ngIf="isSaving()" class="fas fa-spinner fa-spin"></i>
            <i *ngIf="!isSaving()" class="fas fa-save"></i>
            {{ isSaving() ? 'Saving...' : 'Save All Changes' }}
          </button>
        </div>
      </div>

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

          <app-pie
            componentTitle="Direct Costs Breakdown"
            [data]="directCostChartData()"
          ></app-pie>

          <!-- Summary Info -->
          <app-financial-item-summary-info
            [summary]="directCostSummary()"
          >
          </app-financial-item-summary-info>

          <app-financial-item-table
            title="Direct Costs"
            [currency]="currency"
            itemType="direct_cost"
            [loadMultipleTypes]="true"
            [allowedTypes]="['direct_cost', 'operational_cost']"
            [items]="directCostTableItems()"
            (itemsChanged)="onDirectCostItemsChanged($event)"
            (itemUpdated)="onDirectCostItemUpdated($event)"
            (itemAdded)="onDirectCostItemAdded($event)"
            (itemDeleted)="onDirectCostItemDeleted($event)"
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

          <app-pie
            componentTitle="Operational Costs Breakdown"
            [data]="operationalCostChartData()"
          ></app-pie>
          <!-- Summary Info -->
          <app-financial-item-summary-info
            [summary]="operationalCostSummary()"
          >
          </app-financial-item-summary-info>

          <app-financial-item-table
            title="Operational Costs"
            [currency]="currency"
            itemType="operational_cost"
            [loadMultipleTypes]="true"
            [allowedTypes]="['direct_cost', 'operational_cost']"
            [items]="operationalCostTableItems()"
            (itemsChanged)="onOperationalCostItemsChanged($event)"
            (itemUpdated)="onOperationalCostItemUpdated($event)"
            (itemAdded)="onOperationalCostItemAdded($event)"
            (itemDeleted)="onOperationalCostItemDeleted($event)"
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
export class CostStructureComponent extends FinancialBaseComponent implements OnInit {
  @Input() itemType!: FinancialItemType;
  @Input() title = '';
  @Input() subtitle = '';

  // Year selector options - dynamically includes current year
  availableYears = this.generateAvailableYears();

  // Specialized financial data signals for cost structure domain
  directCostItems = signal<CompanyFinancialItem[]>([]);
  operationalCostItems = signal<CompanyFinancialItem[]>([]);
  revenueItems = signal<CompanyFinancialItem[]>([]);

  // Loading states for each data type
  isLoadingDirectCosts = signal(false);
  isLoadingOperationalCosts = signal(false);
  isLoadingRevenue = signal(false);

  // 🎯 Enhanced financial metrics using the clean interface
  financialMetrics = computed(() =>
    this.calculationService.calculateFinancialMetrics(
      this.directCostItems(),
      this.operationalCostItems(),
      this.revenueItems(),
      [], // assets - empty for cost structure focus
      [], // liabilities - empty for cost structure focus
      this.currency // Pass currency parameter
    )
  );

  // Summary data for display components using enhanced metrics
  directCostSummary = computed(() =>
    this.calculationService.generateDirectCostSummary(this.financialMetrics(), this.currency)
  );

  operationalCostSummary = computed(() =>
    this.calculationService.generateOperationalCostSummary(this.financialMetrics(), this.currency)
  );

  // Convert to table format for our reusable component
  directCostTableItems = computed((): FinancialTableItem[] =>
    this.directCostItems().map(item => ({
      name: item.name || '',
      amount: item.amount || 0,
      note: item.note || '',
      categoryId: item.category_id || undefined,
      // Add reference to original item for updates
      _originalItem: item
    } as ExtendedFinancialTableItem))
  );

  operationalCostTableItems = computed((): FinancialTableItem[] =>
    this.operationalCostItems().map(item => ({
      name: item.name || '',
      amount: item.amount || 0,
      note: item.note || '',
      categoryId: item.category_id || undefined,
      _originalItem: item
    } as ExtendedFinancialTableItem))
  );

  // Chart data for pie charts - showing actual financial items and their amounts
  directCostChartData = computed((): IPieChart => {
    const items = this.directCostItems();
    console.log('🔍 directCostChartData computed - items:', items.length, items);

    if (items.length === 0) {
      console.log('📊 Returning empty state for direct costs chart');
      return {
        labels: ['No direct costs yet'],
        datasets: [{
          data: [1],
          backgroundColor: ['rgba(156, 163, 175, 0.8)'],
          borderColor: ['rgba(156, 163, 175, 1)'],
          borderWidth: 2
        }]
      };
    }

    // Show actual items with their amounts
    const chartData = {
      labels: items.map(item => item.name || 'Unnamed Item'),
      datasets: [{
        data: items.map(item => item.amount || 0),
        backgroundColor: this.generateColors(items.length, 'red'),
        borderColor: this.generateColors(items.length, 'red', true),
        borderWidth: 2
      }]
    };

    console.log('📊 Returning populated chart data for direct costs:', {
      labels: chartData.labels,
      data: chartData.datasets[0].data
    });

    return chartData;
  });

  operationalCostChartData = computed((): IPieChart => {
    const items = this.operationalCostItems();
    console.log('🔍 operationalCostChartData computed - items:', items.length, items);

    if (items.length === 0) {
      console.log('📊 Returning empty state for operational costs chart');
      return {
        labels: ['No operational costs yet'],
        datasets: [{
          data: [1],
          backgroundColor: ['rgba(156, 163, 175, 0.8)'],
          borderColor: ['rgba(156, 163, 175, 1)'],
          borderWidth: 2
        }]
      };
    }

    // Show actual items with their amounts
    const chartData = {
      labels: items.map(item => item.name || 'Unnamed Item'),
      datasets: [{
        data: items.map(item => item.amount || 0),
        backgroundColor: this.generateColors(items.length, 'blue'),
        borderColor: this.generateColors(items.length, 'blue', true),
        borderWidth: 2
      }]
    };

    console.log('📊 Returning populated chart data for operational costs:', {
      labels: chartData.labels,
      data: chartData.datasets[0].data
    });

    return chartData;
  });

  constructor(
    service: CompanyFinancialItemService,
    calculationService: FinancialCalculationService,
    route: ActivatedRoute,
    contextService: ContextService
  ) {
    super(service, calculationService, route, contextService);
  }

  ngOnInit() {
    this.initializeContext();
    this.loadFinancialData();
  }

  /**
   * 🎯 Lifecycle hook implementation for cost-specific data transformations
   * Called automatically after items are loaded from backend
   */
  protected override afterItemsLoaded(itemType: FinancialItemType, items: CompanyFinancialItem[]): void {
    console.log(`📈 Cost Structure: Processing ${items.length} ${itemType} items`);

    // Cost-specific transformations and business logic
    switch (itemType) {
      case 'direct_cost':
        // Validate and sort direct costs by amount (largest first)
        items.sort((a, b) => (b.amount || 0) - (a.amount || 0));
        console.log(`🏭 Direct costs loaded: $${items.reduce((sum, item) => sum + (item.amount || 0), 0).toLocaleString()}`);
        break;

      case 'operational_cost':
        // Operational costs sorted alphabetically for better organization
        items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        console.log(`⚙️ Operational costs loaded: $${items.reduce((sum, item) => sum + (item.amount || 0), 0).toLocaleString()}`);
        break;
    }

    // Trigger financial metrics recalculation after data transformation
    // The computed properties will automatically update
  }

  /**
   * 🚀 Load all financial data types using standardized base methods
   */
  loadFinancialData() {
    this.loadItemsByType('direct_cost', this.directCostItems);
    this.loadItemsByType('operational_cost', this.operationalCostItems);
    this.loadRevenue();
  }

  loadRevenue() {
    this.isLoadingRevenue.set(true);
    // Load actual revenue items when revenue item type is implemented
    // For now, leave empty for calculations
    this.isLoadingRevenue.set(false);
    this.revenueItems.set([]);
  }

  /**
   * 🔄 Handle direct cost item changes using base persistence method
   */
  onDirectCostItemsChanged(items: FinancialTableItem[]) {
    console.log('Direct cost items changed:', items);
    // Note: Item tracking is handled by onDirectCostItemAdded and onDirectCostItemUpdated
    // This prevents duplicate tracking entries
  }

  onDirectCostItemUpdated(event: {index: number, item: FinancialTableItem}) {
    console.log('Direct cost item updated:', event);
    console.log('Item categoryId:', event.item.categoryId); // Debug log
    const { index, item } = event;
    const extendedItem = item as ExtendedFinancialTableItem;

    if (extendedItem._originalItem?.id) {
      // Existing item with ID - track for update
      const trackedItem = {
        ...extendedItem._originalItem,
        name: item.name,
        amount: item.amount,
        note: item.note,
        categoryId: item.categoryId // Use frontend field name for bulk save mapping
      };
      console.log('Tracking existing item with categoryId:', trackedItem.categoryId); // Debug log
      this.trackUnsavedChange(`direct_cost_${extendedItem._originalItem.id}`, trackedItem);
    } else if ((item as any)._tempKey) {
      // New item with temp key - update the existing tracking entry
      const tempKey = (item as any)._tempKey;
      const trackedItem = {
        company_id: this.companyId,
        year_: this.year,
        item_type: 'direct_cost',
        name: item.name,
        amount: item.amount,
        note: item.note,
        categoryId: item.categoryId
      };
      console.log('Updating new item tracking with categoryId:', trackedItem.categoryId); // Debug log
      this.trackUnsavedChange(tempKey, trackedItem);
    }
  }

  onDirectCostItemAdded(item: FinancialTableItem) {
    console.log('Direct cost item added:', item);
    // For new items, track with timestamp-based key that can be updated later
    const tempKey = `direct_cost_new_${Date.now()}_${Math.random()}`;
    // Store the key on the item for later reference
    (item as any)._tempKey = tempKey;

    this.trackUnsavedChange(tempKey, {
      company_id: this.companyId,
      year_: this.year,
      item_type: 'direct_cost',
      name: item.name,
      amount: item.amount,
      note: item.note,
      categoryId: item.categoryId // Use frontend field name for bulk save mapping
    });
  }

  onDirectCostItemDeleted(event: {index: number, item: FinancialTableItem}) {
    console.log('Direct cost item deleted:', event);
    const { item } = event;
    const extendedItem = item as ExtendedFinancialTableItem;

    if (extendedItem._originalItem?.id) {
      // Remove from unsaved changes if it was being tracked
      this.removeUnsavedChange(`direct_cost_${extendedItem._originalItem.id}`);

      // Handle deletion immediately
      if (extendedItem._originalItem.id) {
        this.financialService.deleteCompanyFinancialItem(extendedItem._originalItem.id).subscribe({
          next: () => {
            console.log('Direct cost deleted successfully');
            this.loadItemsByType('direct_cost', this.directCostItems);
          },
          error: (err) => console.error('Error deleting direct cost:', err)
        });
      }
    }
  }

  /**
   * 🔄 Handle operational cost item changes using base persistence method
   */
  onOperationalCostItemsChanged(items: FinancialTableItem[]) {
    console.log('Operational cost items changed:', items);
    // Note: Item tracking is handled by onOperationalCostItemAdded and onOperationalCostItemUpdated
    // This prevents duplicate tracking entries
  }

  onOperationalCostItemUpdated(event: {index: number, item: FinancialTableItem}) {
    console.log('Operational cost item updated:', event);
    const { index, item } = event;
    const extendedItem = item as ExtendedFinancialTableItem;

    if (extendedItem._originalItem?.id) {
      // Existing item with ID - track for update
      this.trackUnsavedChange(`operational_cost_${extendedItem._originalItem.id}`, {
        ...extendedItem._originalItem,
        name: item.name,
        amount: item.amount,
        note: item.note,
        categoryId: item.categoryId // Use frontend field name for bulk save mapping
      });
    } else if ((item as any)._tempKey) {
      // New item with temp key - update the existing tracking entry
      const tempKey = (item as any)._tempKey;
      const trackedItem = {
        company_id: this.companyId,
        year_: this.year,
        item_type: 'operational_cost',
        name: item.name,
        amount: item.amount,
        note: item.note,
        categoryId: item.categoryId
      };
      console.log('Updating operational cost item tracking with categoryId:', trackedItem.categoryId);
      this.trackUnsavedChange(tempKey, trackedItem);
    }
  }

  onOperationalCostItemAdded(item: FinancialTableItem) {
    console.log('Operational cost item added:', item);
    // For new items, track with timestamp-based key that can be updated later
    const tempKey = `operational_cost_new_${Date.now()}_${Math.random()}`;
    // Store the key on the item for later reference
    (item as any)._tempKey = tempKey;

    console.log('Creating new operational cost tracking with key:', tempKey);
    this.trackUnsavedChange(tempKey, {
      company_id: this.companyId,
      year_: this.year,
      item_type: 'operational_cost',
      name: item.name,
      amount: item.amount,
      note: item.note,
      categoryId: item.categoryId // Use frontend field name for bulk save mapping
    });
  }

  onOperationalCostItemDeleted(event: {index: number, item: FinancialTableItem}) {
    console.log('Operational cost item deleted:', event);
    const { item } = event;
    const extendedItem = item as ExtendedFinancialTableItem;

    if (extendedItem._originalItem?.id) {
      // Remove from unsaved changes if it was being tracked
      this.removeUnsavedChange(`operational_cost_${extendedItem._originalItem.id}`);

      // Handle deletion immediately
      if (extendedItem._originalItem.id) {
        this.financialService.deleteCompanyFinancialItem(extendedItem._originalItem.id).subscribe({
          next: () => {
            console.log('Operational cost deleted successfully');
            this.loadItemsByType('operational_cost', this.operationalCostItems);
          },
          error: (err) => console.error('Error deleting operational cost:', err)
        });
      }
    }
  }

  /**
   * Generate available years for the year selector
   * Always includes current year plus last 4 years
   */
  private generateAvailableYears(): number[] {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i < 5; i++) {
      years.push(currentYear - i);
    }
    return years;
  }

  /**
   * Handle year change from header component
   * @param newYear The newly selected year
   */
  onYearChange(newYear: number): void {
    console.log('CostStructureComponent - Year changed from', this.year, 'to', newYear);
    this.year = newYear;

    // Clear any unsaved changes when year changes
    this.clearUnsavedChanges();

    // Reload data for the new year
    this.refreshData();
  }

  /**
   *  Generate dynamic color palettes for pie charts
   */
  private generateColors(count: number, baseColor: 'green' | 'red' | 'blue', isBorder = false): string[] {
    const opacity = isBorder ? '1' : '0.8';

    const colorPalettes = {
      green: [
        `rgba(34, 197, 94, ${opacity})`,   // emerald-500
        `rgba(74, 222, 128, ${opacity})`,  // emerald-400
        `rgba(134, 239, 172, ${opacity})`, // emerald-300
        `rgba(187, 247, 208, ${opacity})`, // emerald-200
        `rgba(21, 128, 61, ${opacity})`,   // emerald-700
        `rgba(5, 150, 105, ${opacity})`,   // emerald-600
        `rgba(16, 185, 129, ${opacity})`,  // emerald-500 variant
      ],
      red: [
        `rgba(239, 68, 68, ${opacity})`,   // red-500
        `rgba(248, 113, 113, ${opacity})`, // red-400
        `rgba(252, 165, 165, ${opacity})`, // red-300
        `rgba(254, 202, 202, ${opacity})`, // red-200
        `rgba(185, 28, 28, ${opacity})`,   // red-700
        `rgba(220, 38, 38, ${opacity})`,   // red-600
        `rgba(239, 68, 68, ${opacity})`,   // red-500 variant
      ],
      blue: [
        `rgba(59, 130, 246, ${opacity})`,  // blue-500
        `rgba(96, 165, 250, ${opacity})`,  // blue-400
        `rgba(147, 197, 253, ${opacity})`, // blue-300
        `rgba(191, 219, 254, ${opacity})`, // blue-200
        `rgba(29, 78, 216, ${opacity})`,   // blue-700
        `rgba(37, 99, 235, ${opacity})`,   // blue-600
        `rgba(59, 130, 246, ${opacity})`,  // blue-500 variant
      ]
    };

    const palette = colorPalettes[baseColor];
    const colors: string[] = [];

    for (let i = 0; i < count; i++) {
      colors.push(palette[i % palette.length]);
    }

    return colors;
  }

  exportCostStructure(): void {
    console.log('Exporting cost structure for year:', this.year);
    console.log('Financial Health:', this.financialMetrics().healthStatus, '-', this.financialMetrics().healthMessage);
    // Implementation for PDF export functionality
    // This would integrate with your PDF service
  }
}
