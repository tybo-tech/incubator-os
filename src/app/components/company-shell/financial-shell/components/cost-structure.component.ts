import { Component, Input, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FinancialItemType,
  CompanyFinancialItem,
} from '../../../../../models/financial.models';
import { Constants } from '../../../../../services';
import { CompanyFinancialItemService } from '../../../../../services/company-financial-item.service';
import { FinancialCalculationService } from '../../../../../services/financial-calculation.service';
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
export class CostStructureComponent implements OnInit {
  @Input() companyId!: number;
  @Input() year!: number;
  @Input() itemType!: FinancialItemType;
  @Input() title = '';
  @Input() subtitle = '';
  currency = Constants.Currency;

  // Real financial data from backend
  directCostItems = signal<CompanyFinancialItem[]>([]);
  operationalCostItems = signal<CompanyFinancialItem[]>([]);
  revenueItems = signal<CompanyFinancialItem[]>([]);

  // Loading states
  isLoadingDirectCosts = signal(false);
  isLoadingOperationalCosts = signal(false);
  isLoadingRevenue = signal(false);

  // Financial calculations using centralized service
  financialMetrics = computed(() =>
    this.calculationService.calculateFinancialMetrics(
      this.directCostItems(),
      this.operationalCostItems(),
      this.revenueItems()
    )
  );

  // Summary data for display components
  directCostSummary = computed(() =>
    this.calculationService.generateDirectCostSummary(this.financialMetrics(), this.currency)
  );

  operationalCostSummary = computed(() =>
    this.calculationService.generateOperationalCostSummary(this.financialMetrics(), this.currency)
  );

  // Financial health status
  financialHealth = computed(() =>
    this.calculationService.getFinancialHealthStatus(this.financialMetrics())
  );

  // Legacy computed properties for backward compatibility (can be removed later)
  totalDirectCosts = computed(() => this.financialMetrics().totalDirectCosts);
  totalOperationalCosts = computed(() => this.financialMetrics().totalOperationalCosts);
  totalRevenue = computed(() => this.financialMetrics().totalRevenue);
  grossProfit = computed(() => this.financialMetrics().grossProfit);
  operatingProfit = computed(() => this.financialMetrics().operatingProfit);
  grossMargin = computed(() => this.financialMetrics().grossMargin);

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
    private service: CompanyFinancialItemService,
    private calculationService: FinancialCalculationService
  ) {}

  ngOnInit() {
    this.loadFinancialData();
  }

  /**
   * Load all financial data types for comprehensive cost structure analysis
   */
  loadFinancialData() {
    this.loadDirectCosts();
    this.loadOperationalCosts();
    this.loadRevenue();
  }

  loadDirectCosts() {
    this.isLoadingDirectCosts.set(true);
    this.service
      .listFinancialItemsByYearAndType(this.companyId, this.year, 'direct_cost')
      .subscribe({
        next: (data) => {
          this.directCostItems.set(Array.isArray(data) ? data : []);
          this.isLoadingDirectCosts.set(false);
        },
        error: (err) => {
          console.error('Error loading direct costs', err);
          this.directCostItems.set([]);
          this.isLoadingDirectCosts.set(false);
        },
      });
  }

  loadOperationalCosts() {
    this.isLoadingOperationalCosts.set(true);
    this.service
      .listFinancialItemsByYearAndType(this.companyId, this.year, 'operational_cost')
      .subscribe({
        next: (data) => {
          this.operationalCostItems.set(Array.isArray(data) ? data : []);
          this.isLoadingOperationalCosts.set(false);
        },
        error: (err) => {
          console.error('Error loading operational costs', err);
          this.operationalCostItems.set([]);
          this.isLoadingOperationalCosts.set(false);
        },
      });
  }

  loadRevenue() {
    this.isLoadingRevenue.set(true);
    // Note: If you have revenue as a separate item type, adjust accordingly
    // For now, we'll calculate this from other financial data or set manually
    // This demonstrates the architecture - you can extend this pattern
    this.isLoadingRevenue.set(false);
    // Set some example revenue data - replace with actual service call
    this.revenueItems.set([
      { id: 1, company_id: this.companyId, year_: this.year, item_type: 'asset',
        name: 'Service Revenue', amount: 60000, note: 'Main revenue stream' } as CompanyFinancialItem
    ]);
  }

  /**
   * Handle direct cost item changes from table component
   */
  onDirectCostItemsChanged(items: FinancialTableItem[]) {
    this.handleItemsChanged(items, 'direct_cost', this.directCostItems);
  }

  /**
   * Handle operational cost item changes from table component
   */
  onOperationalCostItemsChanged(items: FinancialTableItem[]) {
    this.handleItemsChanged(items, 'operational_cost', this.operationalCostItems);
  }

  /**
   * Centralized method to handle item changes and persist to backend
   */
  private async handleItemsChanged(
    tableItems: FinancialTableItem[],
    itemType: 'direct_cost' | 'operational_cost',
    targetSignal: any // Simplified type to avoid circular reference
  ) {
    const promises: Promise<CompanyFinancialItem | undefined>[] = [];

    tableItems.forEach(tableItem => {
      const originalItem = (tableItem as ExtendedFinancialTableItem)._originalItem as CompanyFinancialItem;

      if (originalItem?.id) {
        // Update existing item
        const updateData: Partial<CompanyFinancialItem> = {
          name: tableItem.name,
          amount: tableItem.amount,
          note: tableItem.note,
          category_id: tableItem.categoryId
        };

        promises.push(
          this.service.updateCompanyFinancialItem(originalItem.id, updateData).toPromise()
        );
      } else {
        // Create new item
        const newItem: Partial<CompanyFinancialItem> = {
          company_id: this.companyId,
          year_: this.year,
          item_type: itemType,
          name: tableItem.name,
          amount: tableItem.amount,
          note: tableItem.note,
          category_id: tableItem.categoryId
        };

        promises.push(
          this.service.addCompanyFinancialItem(newItem).toPromise()
        );
      }
    });

    // Wait for all updates/creates to complete, then refresh data
    try {
      await Promise.all(promises);

      if (itemType === 'direct_cost') {
        this.loadDirectCosts();
      } else {
        this.loadOperationalCosts();
      }

      // Refresh profit summary to keep everything in sync
      this.service.refreshCompanyYearSummary(this.companyId, this.year).subscribe();
    } catch (err) {
      console.error(`Error updating ${itemType} items:`, err);
    }
  }

  exportCostStructure(): void {
    console.log('Exporting cost structure for year:', this.year);
    // Implementation for PDF export functionality
    // This would integrate with your PDF service
  }
}
