import { Component, Input, OnInit, ViewChild, signal, computed } from '@angular/core';
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
import {
  FinancialItemTableComponent,
  FinancialTableItem,
} from './financial-items/financial-item-table.component';
import { FinancialItemSummaryInfoComponent } from './financial-items/financial-item-summary-info.component';
import { FinancialItemHeaderComponent } from './financial-items/financial-item-header.component';
import { PieComponent } from '../../../../charts/pie/pie.component';
import { FinancialSectionHeaderComponent } from './financial-items/financial-section-header.component';
import { IPieChart } from '../../../../../models/Charts';
import { FinancialChartService } from '../services/financial-chart.service';
import {
  FinancialItemHandlerService,
  ExtendedFinancialTableItem,
} from '../services/financial-item-handler.service';
import { FinancialCategoryModalComponent } from './financial-category-modal.component';

@Component({
  selector: 'app-cost-structure',
  standalone: true,
  imports: [
    CommonModule,
    FinancialItemTableComponent,
    // FinancialItemSummaryInfoComponent,
    FinancialItemHeaderComponent,
    PieComponent,
    FinancialSectionHeaderComponent,
    FinancialCategoryModalComponent,
  ],
  template: `
    <div class="bg-white rounded-xl shadow-sm p-6 w-full">
      <!-- Page Header -->
      <app-financial-section-header
        title="Cost Structure"
        subtitle="Overview of direct and operational costs"
        [showYearSelector]="true"
        [selectedYear]="year"
        [availableYears]="availableYears()"
        icon="fas fa-sack-dollar"
        actionLabel="Export PDF"
        actionIcon="fas fa-file-export"
        (onAction)="exportCostStructure()"
        (onYearChange)="onYearChange($event)"
      >
      </app-financial-section-header>

      <!-- Save Changes Bar (shown when there are unsaved changes) -->
      <div
        *ngIf="hasUnsavedChanges()"
        class="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between"
      >
        <div class="flex items-center gap-3">
          <i class="fas fa-exclamation-triangle text-amber-600"></i>
          <div>
            <p class="font-semibold text-amber-800">You have unsaved changes</p>
            <p class="text-sm text-amber-600">
              {{ unsavedChanges().size }} item(s) modified
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            (click)="clearUnsavedChanges()"
            class="px-3 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
          >
            Cancel Changes
          </button>
          <button
            type="button"
            (click)="bulkSaveChanges()"
            [disabled]="isSaving()"
            class="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
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
          <!-- <app-financial-item-summary-info
            [summary]="directCostSummary()"
          >
          </app-financial-item-summary-info> -->

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
            (manageCategoriesRequested)="openCategoryManagement($event)"
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
          <!-- <app-financial-item-summary-info
            [summary]="operationalCostSummary()"
          >
          </app-financial-item-summary-info> -->

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
            (manageCategoriesRequested)="openCategoryManagement($event)"
          >
          </app-financial-item-table>
        </div>
      </div>

      <!-- Footer -->
      <div class="mt-8 border-t pt-4 text-right text-xs text-gray-400">
        Last updated: {{ '2025-10-12' }}
      </div>
    </div>

    <!-- Financial Category Management Modal -->
    <app-financial-category-modal
      #categoryModal
      (modalClosed)="onModalClosed()"
      (categoriesChanged)="onCategoriesChanged()">
    </app-financial-category-modal>
  `,
})
export class CostStructureComponent
  extends FinancialBaseComponent
  implements OnInit
{
  @Input() itemType!: FinancialItemType;
  @Input() title = '';
  @Input() subtitle = '';

  // ViewChild for category modal
  @ViewChild('categoryModal') categoryModal!: FinancialCategoryModalComponent;

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
    this.calculationService.generateDirectCostSummary(
      this.financialMetrics(),
      this.currency
    )
  );

  operationalCostSummary = computed(() =>
    this.calculationService.generateOperationalCostSummary(
      this.financialMetrics(),
      this.currency
    )
  );

  // Convert to table format for our reusable component
  directCostTableItems = computed((): FinancialTableItem[] =>
    this.itemHandler.convertToTableItems(this.directCostItems())
  );

  operationalCostTableItems = computed((): FinancialTableItem[] =>
    this.itemHandler.convertToTableItems(this.operationalCostItems())
  );

  // Chart data using centralized chart service
  directCostChartData = computed(
    (): IPieChart =>
      this.chartService.generateDirectCostChartData(this.directCostItems())
  );

  operationalCostChartData = computed(
    (): IPieChart =>
      this.chartService.generateOperationalCostChartData(
        this.operationalCostItems()
      )
  );

  constructor(
    service: CompanyFinancialItemService,
    calculationService: FinancialCalculationService,
    route: ActivatedRoute,
    contextService: ContextService,
    chartService: FinancialChartService,
    itemHandler: FinancialItemHandlerService
  ) {
    super(
      service,
      calculationService,
      route,
      contextService,
      chartService,
      itemHandler
    );
  }

  ngOnInit() {
    this.initializeContext();
    this.loadFinancialData();
  }

  /**
   * 🎯 Lifecycle hook implementation for cost-specific data transformations
   * Called automatically after items are loaded from backend
   */
  protected override afterItemsLoaded(
    itemType: FinancialItemType,
    items: CompanyFinancialItem[]
  ): void {
    console.log(
      `📈 Cost Structure: Processing ${items.length} ${itemType} items`
    );

    // Cost-specific transformations and business logic
    switch (itemType) {
      case 'direct_cost':
        // Validate and sort direct costs by amount (largest first)
        items.sort((a, b) => (b.amount || 0) - (a.amount || 0));
        console.log(
          `🏭 Direct costs loaded: $${items
            .reduce((sum, item) => sum + (item.amount || 0), 0)
            .toLocaleString()}`
        );
        break;

      case 'operational_cost':
        // Operational costs sorted alphabetically for better organization
        items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        console.log(
          `⚙️ Operational costs loaded: $${items
            .reduce((sum, item) => sum + (item.amount || 0), 0)
            .toLocaleString()}`
        );
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
   * 🔄 Handle direct cost item changes using centralized handler
   */
  onDirectCostItemsChanged(items: FinancialTableItem[]) {
    this.itemHandler.handleItemsChanged(items, 'direct_cost');
  }

  onDirectCostItemUpdated(event: { index: number; item: FinancialTableItem }) {
    this.itemHandler.handleItemUpdated(
      event,
      'direct_cost',
      this.financialContext(),
      this.getItemHandlerCallbacks()
    );
  }

  onDirectCostItemAdded(item: FinancialTableItem) {
    this.itemHandler.handleItemAdded(
      item,
      'direct_cost',
      this.financialContext(),
      this.getItemHandlerCallbacks()
    );
  }

  onDirectCostItemDeleted(event: { index: number; item: FinancialTableItem }) {
    this.itemHandler.handleItemDeleted(
      event,
      'direct_cost',
      this.getItemHandlerCallbacks()
    );
  }

  /**
   * 🔄 Handle operational cost item changes using centralized handler
   */
  onOperationalCostItemsChanged(items: FinancialTableItem[]) {
    this.itemHandler.handleItemsChanged(items, 'operational_cost');
  }

  onOperationalCostItemUpdated(event: {
    index: number;
    item: FinancialTableItem;
  }) {
    this.itemHandler.handleItemUpdated(
      event,
      'operational_cost',
      this.financialContext(),
      this.getItemHandlerCallbacks()
    );
  }

  onOperationalCostItemAdded(item: FinancialTableItem) {
    this.itemHandler.handleItemAdded(
      item,
      'operational_cost',
      this.financialContext(),
      this.getItemHandlerCallbacks()
    );
  }

  onOperationalCostItemDeleted(event: {
    index: number;
    item: FinancialTableItem;
  }) {
    this.itemHandler.handleItemDeleted(
      event,
      'operational_cost',
      this.getItemHandlerCallbacks()
    );
  }

  /**
   * Handle year change using base implementation
   */
  override onYearChange(newYear: number): void {
    super.onYearChange(newYear);
  }

  /**
   * Handle manage categories button click
   * Opens category management modal filtered by item type
   */
  openCategoryManagement(itemType: string): void {
    console.log('Opening category management for item type:', itemType);
    if (this.categoryModal) {
      this.categoryModal.openModal(itemType as FinancialItemType);
    }
  }

  onModalClosed(): void {
    console.log('Category management modal closed');
  }

  onCategoriesChanged(): void {
    console.log('Categories changed, refreshing data...');
    // Optionally refresh categories in dropdowns
    this.loadFinancialData();
  }

  exportCostStructure(): void {
    console.log('Exporting cost structure for year:', this.year);
    console.log(
      'Financial Health:',
      this.financialMetrics().healthStatus,
      '-',
      this.financialMetrics().healthMessage
    );
    // Implementation for PDF export functionality
    // This would integrate with your PDF service
  }
}
