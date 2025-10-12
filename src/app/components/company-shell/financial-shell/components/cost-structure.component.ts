import { Component, Input, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
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

  // Chart data for pie charts - computed from real financial data
  directCostChartData = computed((): IPieChart => {
    const items = this.directCostItems();
    if (items.length === 0) {
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

    return {
      labels: items.map(item => item.name || 'Unnamed'),
      datasets: [{
        data: items.map(item => item.amount || 0),
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',   // Red
          'rgba(245, 101, 101, 0.8)', // Light red
          'rgba(252, 165, 165, 0.8)', // Very light red
          'rgba(254, 202, 202, 0.8)', // Pink red
          'rgba(190, 18, 60, 0.8)',   // Dark red
        ],
        borderColor: [
          'rgba(239, 68, 68, 1)',
          'rgba(245, 101, 101, 1)',
          'rgba(252, 165, 165, 1)',
          'rgba(254, 202, 202, 1)',
          'rgba(190, 18, 60, 1)',
        ],
        borderWidth: 2
      }]
    };
  });

  operationalCostChartData = computed((): IPieChart => {
    const items = this.operationalCostItems();
    if (items.length === 0) {
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

    return {
      labels: items.map(item => item.name || 'Unnamed'),
      datasets: [{
        data: items.map(item => item.amount || 0),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',  // Blue
          'rgba(96, 165, 250, 0.8)',  // Light blue
          'rgba(147, 197, 253, 0.8)', // Very light blue
          'rgba(191, 219, 254, 0.8)', // Pale blue
          'rgba(29, 78, 216, 0.8)',   // Dark blue
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(96, 165, 250, 1)',
          'rgba(147, 197, 253, 1)',
          'rgba(191, 219, 254, 1)',
          'rgba(29, 78, 216, 1)',
        ],
        borderWidth: 2
      }]
    };
  });

  constructor(
    service: CompanyFinancialItemService,
    calculationService: FinancialCalculationService
  ) {
    super(service, calculationService);
  }

  ngOnInit() {
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
    // TODO: Replace with actual revenue item type when available
    // For now, we'll set example revenue data
    this.isLoadingRevenue.set(false);
    this.revenueItems.set([
      { id: 1, company_id: this.companyId, year_: this.year, item_type: 'asset',
        name: 'Service Revenue', amount: 60000, note: 'Main revenue stream' } as CompanyFinancialItem
    ]);
  }

  /**
   * 🔄 Handle direct cost item changes using base persistence method
   */
  onDirectCostItemsChanged(items: FinancialTableItem[]) {
    this.persistItemChanges(items, 'direct_cost', () => this.loadItemsByType('direct_cost', this.directCostItems));
  }

  /**
   * 🔄 Handle operational cost item changes using base persistence method
   */
  onOperationalCostItemsChanged(items: FinancialTableItem[]) {
    this.persistItemChanges(items, 'operational_cost', () => this.loadItemsByType('operational_cost', this.operationalCostItems));
  }

  exportCostStructure(): void {
    console.log('Exporting cost structure for year:', this.year);
    console.log('Financial Health:', this.financialMetrics().healthStatus, '-', this.financialMetrics().healthMessage);
    // Implementation for PDF export functionality
    // This would integrate with your PDF service
  }
}
