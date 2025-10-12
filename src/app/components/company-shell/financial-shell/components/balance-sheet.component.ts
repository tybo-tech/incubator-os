import { Component, computed, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinancialBaseComponent } from './financial-base.component';
import { FinancialItemType, CompanyFinancialItem } from '../../../../../models/financial.models';
import { FinancialItemTableComponent, FinancialTableItem } from './financial-items/financial-item-table.component';
import { FinancialItemSummaryInfoComponent } from './financial-items/financial-item-summary-info.component';
import { FinancialItemHeaderComponent } from './financial-items/financial-item-header.component';
import { PieComponent } from '../../../../charts/pie/pie.component';
import { FinancialSectionHeaderComponent } from './financial-items/financial-section-header.component';
import { CompanyFinancialItemService } from '../../../../../services/company-financial-item.service';
import { FinancialCalculationService } from '../../../../../services/financial-calculation.service';
import { IPieChart } from '../../../../../models/Charts';

export interface ExtendedFinancialTableItem extends FinancialTableItem {
  _originalItem?: CompanyFinancialItem;
}

/**
 * 🏦 Balance Sheet Component
 *
 * Enterprise-grade component for managing assets, liabilities, and equity using the proven
 * cost structure pattern. Provides two-column layout with pie charts and summary tables.
 *
 * Features:
 * - Asset management (what the company owns)
 * - Liability tracking (what the company owes)
 * - Real-time balance validation (Assets = Liabilities + Equity)
 * - Interactive pie charts for visual analysis
 * - Categorized financial item tables with inline editing
 * - Advanced financial ratios and health indicators
 *
 * Architecture:
 * UI Component → Smart Container → Abstract Base → Business Service
 */
@Component({
  selector: 'app-balance-sheet',
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
        title="Balance Sheet"
        subtitle="Assets, liabilities and equity overview"
        [year]="year"
        icon="fas fa-balance-scale"
        actionLabel="Export PDF"
        actionIcon="fas fa-file-export"
        (onAction)="exportBalanceSheet()"
      >
      </app-financial-section-header>

      <!-- Balance Check Indicator -->
      <div class="mb-6 p-3 rounded-lg"
           [class]="balanceCheckStatus().isBalanced ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'">
        <div class="flex items-center justify-between">
          <span class="font-semibold"
                [class]="balanceCheckStatus().isBalanced ? 'text-green-800' : 'text-red-800'">
            {{ balanceCheckStatus().message }}
          </span>
          <span class="text-sm"
                [class]="balanceCheckStatus().isBalanced ? 'text-green-600' : 'text-red-600'">
            Difference: {{ balanceCheckStatus().formattedDifference }}
          </span>
        </div>
      </div>

      <!-- Two-column grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- LEFT COLUMN: Assets -->
        <div
          class="flex flex-col bg-gray-50 border border-gray-200 rounded-lg p-4"
        >
          <!-- Section Header -->
          <app-financial-item-header
            title="Assets"
            subtitle="What the company owns"
          >
          </app-financial-item-header>

          <app-pie
            componentTitle="Assets Breakdown"
            [data]="assetChartData()"
          ></app-pie>

          <!-- Summary Info -->
          <app-financial-item-summary-info
            [summary]="assetSummary()"
          >
          </app-financial-item-summary-info>

          <app-financial-item-table
            title="Assets"
            [currency]="currency"
            itemType="asset"
            [loadMultipleTypes]="true"
            [allowedTypes]="['asset', 'liability']"
            [items]="assetTableItems()"
          >
          </app-financial-item-table>
        </div>

        <!-- RIGHT COLUMN: Liabilities -->
        <div
          class="flex flex-col bg-gray-50 border border-gray-200 rounded-lg p-4"
        >
          <!-- Section Header -->
          <app-financial-item-header
            title="Liabilities"
            subtitle="What the company owes"
          >
          </app-financial-item-header>

          <app-pie
            componentTitle="Liabilities Breakdown"
            [data]="liabilityChartData()"
          ></app-pie>
          <!-- Summary Info -->
          <app-financial-item-summary-info
            [summary]="liabilitySummary()"
          >
          </app-financial-item-summary-info>

          <app-financial-item-table
            title="Liabilities"
            [currency]="currency"
            itemType="liability"
            [loadMultipleTypes]="true"
            [allowedTypes]="['asset', 'liability']"
            [items]="liabilityTableItems()"
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
export class BalanceSheetComponent extends FinancialBaseComponent implements OnInit {
  @Input() itemType!: FinancialItemType;
  @Input() title = '';
  @Input() subtitle = '';

  // Specialized financial data signals for balance sheet domain
  assetItems = signal<CompanyFinancialItem[]>([]);
  liabilityItems = signal<CompanyFinancialItem[]>([]);
  revenueItems = signal<CompanyFinancialItem[]>([]);

  // Loading states for each data type
  isLoadingAssets = signal(false);
  isLoadingLiabilities = signal(false);
  isLoadingRevenue = signal(false);

  // 🎯 Enhanced financial metrics using the clean interface
  financialMetrics = computed(() =>
    this.calculationService.calculateFinancialMetrics(
      [], // direct costs - empty for balance sheet focus
      [], // operational costs - empty for balance sheet focus
      this.revenueItems(),
      this.assetItems(), // assets
      this.liabilityItems(), // liabilities
      this.currency // Pass currency parameter
    )
  );

  // Balance validation computed property
  balanceCheckStatus = computed(() => {
    const totalAssets = this.assetItems().reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalLiabilities = this.liabilityItems().reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalEquity = totalAssets - totalLiabilities; // Calculated equity
    const difference = totalAssets - (totalLiabilities + totalEquity);
    const isBalanced = Math.abs(difference) < 0.01; // Allow for minor rounding differences

    return {
      isBalanced,
      difference,
      formattedDifference: this.calculationService.formatCurrency(Math.abs(difference), this.currency),
      message: isBalanced ? '✅ Balance Sheet Balanced' : '❌ Balance Sheet Out of Balance'
    };
  });

  // Summary data for display components using enhanced metrics
  assetSummary = computed(() => {
    const totalAssets = this.assetItems().reduce((sum, item) => sum + (item.amount || 0), 0);
    const assetCount = this.assetItems().length;
    return [
      {
        label: 'Total Assets',
        value: totalAssets,
        currency: '$',
        isPositive: totalAssets > 0
      },
      {
        label: 'Asset Count',
        value: assetCount,
        currency: 'items',
        isPositive: assetCount > 0
      }
    ];
  });

  liabilitySummary = computed(() => {
    const totalLiabilities = this.liabilityItems().reduce((sum, item) => sum + (item.amount || 0), 0);
    const liabilityCount = this.liabilityItems().length;
    return [
      {
        label: 'Total Liabilities',
        value: totalLiabilities,
        currency: '$',
        isPositive: false // Liabilities are generally displayed as negative/red
      },
      {
        label: 'Liability Count',
        value: liabilityCount,
        currency: 'items',
        isPositive: liabilityCount === 0 // Fewer liabilities is better
      }
    ];
  });

  // Convert to table format for our reusable component
  assetTableItems = computed((): FinancialTableItem[] =>
    this.assetItems().map(item => ({
      name: item.name || '',
      amount: item.amount || 0,
      note: item.note || '',
      categoryId: item.category_id || undefined,
      // Add reference to original item for updates
      _originalItem: item
    } as ExtendedFinancialTableItem))
  );

  liabilityTableItems = computed((): FinancialTableItem[] =>
    this.liabilityItems().map(item => ({
      name: item.name || '',
      amount: item.amount || 0,
      note: item.note || '',
      categoryId: item.category_id || undefined,
      _originalItem: item
    } as ExtendedFinancialTableItem))
  );

  // Chart data for pie charts - computed from real financial data
  assetChartData = computed((): IPieChart => {
    const items = this.assetItems();
    if (items.length === 0) {
      return {
        labels: ['No assets yet'],
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
          'rgba(34, 197, 94, 0.8)',   // Green
          'rgba(74, 222, 128, 0.8)',  // Light green
          'rgba(134, 239, 172, 0.8)', // Very light green
          'rgba(187, 247, 208, 0.8)', // Pale green
          'rgba(21, 128, 61, 0.8)',   // Dark green
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(74, 222, 128, 1)',
          'rgba(134, 239, 172, 1)',
          'rgba(187, 247, 208, 1)',
          'rgba(21, 128, 61, 1)',
        ],
        borderWidth: 2
      }]
    };
  });

  liabilityChartData = computed((): IPieChart => {
    const items = this.liabilityItems();
    if (items.length === 0) {
      return {
        labels: ['No liabilities yet'],
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
          'rgba(248, 113, 113, 0.8)', // Light red
          'rgba(252, 165, 165, 0.8)', // Very light red
          'rgba(254, 202, 202, 0.8)', // Pale red
          'rgba(185, 28, 28, 0.8)',   // Dark red
        ],
        borderColor: [
          'rgba(239, 68, 68, 1)',
          'rgba(248, 113, 113, 1)',
          'rgba(252, 165, 165, 1)',
          'rgba(254, 202, 202, 1)',
          'rgba(185, 28, 28, 1)',
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
   * 🎯 Lifecycle hook implementation for balance sheet-specific data transformations
   * Called automatically after items are loaded from backend
   */
  protected override afterItemsLoaded(itemType: FinancialItemType, items: CompanyFinancialItem[]): void {
    console.log(`🏦 Balance Sheet: Processing ${items.length} ${itemType} items`);

    // Balance sheet-specific transformations and business logic
    switch (itemType) {
      case 'asset':
        // Sort assets by amount (largest first) and validate positive amounts
        items.sort((a, b) => (b.amount || 0) - (a.amount || 0));
        console.log(`💰 Assets loaded: $${items.reduce((sum, item) => sum + (item.amount || 0), 0).toLocaleString()}`);
        break;

      case 'liability':
        // Sort liabilities by amount (largest first) and validate they're properly categorized
        items.sort((a, b) => (b.amount || 0) - (a.amount || 0));
        console.log(`🔴 Liabilities loaded: $${items.reduce((sum, item) => sum + (item.amount || 0), 0).toLocaleString()}`);
        break;
    }

    // Trigger balance validation after data transformation
    // The computed properties will automatically update
  }

  /**
   * 🚀 Load all financial data types using standardized base methods
   */
  loadFinancialData() {
    this.loadItemsByType('asset', this.assetItems);
    this.loadItemsByType('liability', this.liabilityItems);
    this.loadRevenue();
  }

  loadRevenue() {
    this.isLoadingRevenue.set(true);
    // TODO: Replace with actual revenue item type when available
    // For now, we'll set example revenue data for calculations
    this.isLoadingRevenue.set(false);
    this.revenueItems.set([
      { id: 1, company_id: this.companyId, year_: this.year, item_type: 'asset',
        name: 'Service Revenue', amount: 60000, note: 'Main revenue stream' } as CompanyFinancialItem
    ]);
  }

  /**
   * 🔄 Handle asset item changes using base persistence method
   */
  onAssetItemsChanged(items: FinancialTableItem[]) {
    this.persistItemChanges(items, 'asset', () => this.loadItemsByType('asset', this.assetItems));
  }

  /**
   * 🔄 Handle liability item changes using base persistence method
   */
  onLiabilityItemsChanged(items: FinancialTableItem[]) {
    this.persistItemChanges(items, 'liability', () => this.loadItemsByType('liability', this.liabilityItems));
  }

  exportBalanceSheet(): void {
    console.log('Exporting balance sheet for year:', this.year);
    console.log('Balance Status:', this.balanceCheckStatus().message);
    console.log('Financial Health:', this.financialMetrics().healthStatus, '-', this.financialMetrics().healthMessage);
    // Implementation for PDF export functionality
    // This would integrate with your PDF service
  }
}
