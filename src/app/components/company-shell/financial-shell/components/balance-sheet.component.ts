import { Component, computed, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinancialBaseComponent } from './financial-base.component';
import { FinancialItemType, CompanyFinancialItem } from '../../../../../models/financial.models';
import { FinancialTableItem } from './financial-items/financial-item-table.component';
import { CompanyFinancialItemService } from '../../../../../services/company-financial-item.service';
import { FinancialCalculationService } from '../../../../../services/financial-calculation.service';

export interface ExtendedFinancialTableItem extends FinancialTableItem {
  _originalItem?: CompanyFinancialItem;
}

/**
 * 🏦 Balance Sheet Component
 *
 * Enterprise-grade component for managing assets, liabilities, and equity.
 * Extends FinancialBaseComponent to eliminate boilerplate and ensure consistency.
 *
 * Features:
 * - Asset management (current assets, fixed assets, intangible assets)
 * - Liability tracking (current liabilities, long-term debt)
 * - Equity calculations (owner's equity, retained earnings)
 * - Real-time balance validation (Assets = Liabilities + Equity)
 * - Advanced financial ratios (debt-to-equity, current ratio, working capital)
 * - Interactive charts for balance visualization
 *
 * Architecture:
 * UI Component → Smart Container → Abstract Base → Business Service
 */
@Component({
  selector: 'app-balance-sheet',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="balance-sheet-container p-6 bg-white rounded-lg shadow-md">
      <!-- Header -->
      <div class="mb-6">
        <div class="flex items-center mb-2">
          <i class="fas fa-balance-scale text-indigo-600 text-2xl mr-3"></i>
          <h2 class="text-2xl font-bold text-gray-800">
            🏦 {{ title || 'Balance Sheet' }}
          </h2>
        </div>
        <p class="text-gray-600">{{ subtitle || 'Assets, Liabilities & Equity Analysis' }}</p>

        <!-- Balance Check Indicator -->
        <div class="mt-4 p-3 rounded-lg"
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
      </div>

      <!-- Loading and Error States -->
      <div *ngIf="isLoading()" class="text-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p class="mt-2 text-gray-600">Loading balance sheet data...</p>
      </div>

      <div *ngIf="hasError()" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p class="text-red-800">{{ errorMessage() }}</p>
        <button (click)="loadBalanceSheetData()"
                class="mt-2 px-4 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200">
          Retry
        </button>
      </div>

      <!-- Balance Sheet Content -->
      <div *ngIf="!isLoading() && !hasError()" class="grid grid-cols-1 lg:grid-cols-2 gap-8">

        <!-- Assets Section -->
        <div class="space-y-6">
          <h3 class="text-xl font-semibold text-gray-800 border-b pb-2">📈 Assets</h3>

          <!-- Current Assets -->
          <div>
            <h4 class="text-lg font-medium text-gray-700 mb-3">Current Assets</h4>
            <div class="space-y-2">
              <div *ngFor="let asset of currentAssets()" class="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <span class="font-medium">{{ asset.name }}</span>
                  <p class="text-xs text-gray-500">{{ asset.note }}</p>
                </div>
                <span class="font-semibold">{{ formatCurrency(asset.amount || 0) }}</span>
              </div>
            </div>
            <div class="mt-2 pt-2 border-t border-gray-200">
              <div class="flex justify-between font-semibold text-blue-700">
                <span>Total Current Assets</span>
                <span>{{ financialMetrics().formattedCurrentAssets }}</span>
              </div>
            </div>
          </div>

          <!-- Fixed Assets -->
          <div>
            <h4 class="text-lg font-medium text-gray-700 mb-3">Fixed Assets</h4>
            <div class="space-y-2">
              <div *ngFor="let asset of fixedAssets()" class="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <span class="font-medium">{{ asset.name }}</span>
                  <p class="text-xs text-gray-500">{{ asset.note }}</p>
                </div>
                <span class="font-semibold">{{ formatCurrency(asset.amount || 0) }}</span>
              </div>
            </div>
            <div class="mt-2 pt-2 border-t border-gray-200">
              <div class="flex justify-between font-semibold text-blue-700">
                <span>Total Fixed Assets</span>
                <span>{{ financialMetrics().formattedFixedAssets }}</span>
              </div>
            </div>
          </div>

          <!-- Total Assets Summary -->
          <div class="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <div class="flex justify-between items-center">
              <span class="font-semibold text-blue-800">TOTAL ASSETS</span>
              <span class="text-xl font-bold text-blue-900">{{ financialMetrics().formattedTotalAssets }}</span>
            </div>
          </div>
        </div>

        <!-- Liabilities & Equity Section -->
        <div class="space-y-6">
          <h3 class="text-xl font-semibold text-gray-800 border-b pb-2">📉 Liabilities & Equity</h3>

          <!-- Current Liabilities -->
          <div>
            <h4 class="text-lg font-medium text-gray-700 mb-3">Current Liabilities</h4>
            <div class="space-y-2">
              <div *ngFor="let liability of currentLiabilities()" class="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <span class="font-medium">{{ liability.name }}</span>
                  <p class="text-xs text-gray-500">{{ liability.note }}</p>
                </div>
                <span class="font-semibold text-red-600">{{ formatCurrency(liability.amount || 0) }}</span>
              </div>
            </div>
            <div class="mt-2 pt-2 border-t border-gray-200">
              <div class="flex justify-between font-semibold text-red-700">
                <span>Total Current Liabilities</span>
                <span>{{ financialMetrics().formattedCurrentLiabilities }}</span>
              </div>
            </div>
          </div>

          <!-- Long-term Liabilities -->
          <div>
            <h4 class="text-lg font-medium text-gray-700 mb-3">Long-term Liabilities</h4>
            <div class="space-y-2">
              <div *ngFor="let liability of longTermLiabilities()" class="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <span class="font-medium">{{ liability.name }}</span>
                  <p class="text-xs text-gray-500">{{ liability.note }}</p>
                </div>
                <span class="font-semibold text-red-600">{{ formatCurrency(liability.amount || 0) }}</span>
              </div>
            </div>
            <div class="mt-2 pt-2 border-t border-gray-200">
              <div class="flex justify-between font-semibold text-red-700">
                <span>Total Long-term Debt</span>
                <span>{{ financialMetrics().formattedLongTermDebt }}</span>
              </div>
            </div>
          </div>

          <!-- Equity -->
          <div>
            <h4 class="text-lg font-medium text-gray-700 mb-3">Owner's Equity</h4>
            <div class="space-y-2">
              <div *ngFor="let equityItem of equity()" class="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <span class="font-medium">{{ equityItem.name }}</span>
                  <p class="text-xs text-gray-500">{{ equityItem.note }}</p>
                </div>
                <span class="font-semibold text-green-600">{{ formatCurrency(equityItem.amount || 0) }}</span>
              </div>
            </div>
            <div class="mt-2 pt-2 border-t border-gray-200">
              <div class="flex justify-between font-semibold text-green-700">
                <span>Total Equity</span>
                <span>{{ financialMetrics().formattedTotalEquity }}</span>
              </div>
            </div>
          </div>

          <!-- Total Liabilities + Equity -->
          <div class="bg-green-50 border border-green-200 p-4 rounded-lg">
            <div class="flex justify-between items-center">
              <span class="font-semibold text-green-800">TOTAL LIABILITIES + EQUITY</span>
              <span class="text-xl font-bold text-green-900">{{ financialMetrics().formattedLiabilitiesAndEquity }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Financial Ratios Section -->
      <div *ngIf="!isLoading() && !hasError()" class="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-gray-50 p-4 rounded-lg text-center">
          <div class="text-2xl font-bold text-gray-800">{{ financialMetrics().formattedDebtToEquity }}</div>
          <div class="text-sm text-gray-600">Debt-to-Equity Ratio</div>
          <div class="text-xs mt-1" [class]="getRatioHealthColor('debtToEquity')">
            {{ getRatioHealthMessage('debtToEquity') }}
          </div>
        </div>

        <div class="bg-gray-50 p-4 rounded-lg text-center">
          <div class="text-2xl font-bold text-gray-800">{{ financialMetrics().formattedCurrentRatio }}</div>
          <div class="text-sm text-gray-600">Current Ratio</div>
          <div class="text-xs mt-1" [class]="getRatioHealthColor('currentRatio')">
            {{ getRatioHealthMessage('currentRatio') }}
          </div>
        </div>

        <div class="bg-gray-50 p-4 rounded-lg text-center">
          <div class="text-2xl font-bold text-gray-800">{{ financialMetrics().formattedWorkingCapital }}</div>
          <div class="text-sm text-gray-600">Working Capital</div>
          <div class="text-xs mt-1" [class]="getRatioHealthColor('workingCapital')">
            {{ getRatioHealthMessage('workingCapital') }}
          </div>
        </div>

        <div class="bg-gray-50 p-4 rounded-lg text-center">
          <div class="text-2xl font-bold text-gray-800">{{ financialMetrics().returnOnAssets.toFixed(1) }}%</div>
          <div class="text-sm text-gray-600">Return on Assets</div>
          <div class="text-xs mt-1" [class]="getRatioHealthColor('returnOnAssets')">
            {{ getRatioHealthMessage('returnOnAssets') }}
          </div>
        </div>
      </div>

      <!-- Export Actions -->
      <div class="mt-8 flex justify-end space-x-4">
        <button (click)="exportBalanceSheet()"
                class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
          📄 Export PDF
        </button>
        <button (click)="loadBalanceSheetData()"
                class="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors">
          🔄 Refresh Data
        </button>
      </div>

      <!-- Footer -->
      <div class="mt-8 border-t pt-4 text-right text-xs text-gray-400">
        Last updated: {{ getCurrentDate() }}
      </div>
    </div>
  `
})
export class BalanceSheetComponent extends FinancialBaseComponent implements OnInit {
  @Input() title = '';
  @Input() subtitle = '';

  // Specialized balance sheet data signals
  currentAssets = signal<CompanyFinancialItem[]>([]);
  fixedAssets = signal<CompanyFinancialItem[]>([]);
  currentLiabilities = signal<CompanyFinancialItem[]>([]);
  longTermLiabilities = signal<CompanyFinancialItem[]>([]);
  equity = signal<CompanyFinancialItem[]>([]);

  constructor(
    private service: CompanyFinancialItemService,
    protected override calculationService: FinancialCalculationService
  ) {
    super(service, calculationService);
  }

  // Enhanced financial metrics with balance sheet specific calculations
  financialMetrics = computed(() => {
    const metrics = this.calculationService.calculateFinancialMetrics(
      [], // direct costs - not applicable for balance sheet
      [], // operational costs - not applicable for balance sheet
      [], // revenues - not applicable for balance sheet
      [...this.currentAssets(), ...this.fixedAssets()], // all assets
      [...this.currentLiabilities(), ...this.longTermLiabilities()], // all liabilities
      this.currency
    );

    // Add balance sheet specific calculations
    const totalAssets = this.sumItems([...this.currentAssets(), ...this.fixedAssets()]);
    const totalLiabilities = this.sumItems([...this.currentLiabilities(), ...this.longTermLiabilities()]);
    const totalEquity = this.sumItems(this.equity());
    const workingCapital = this.sumItems(this.currentAssets()) - this.sumItems(this.currentLiabilities());

    return {
      ...metrics,
      formattedCurrentAssets: this.calculationService.formatCurrency(this.sumItems(this.currentAssets()), this.currency),
      formattedFixedAssets: this.calculationService.formatCurrency(this.sumItems(this.fixedAssets()), this.currency),
      formattedTotalAssets: this.calculationService.formatCurrency(totalAssets, this.currency),
      formattedCurrentLiabilities: this.calculationService.formatCurrency(this.sumItems(this.currentLiabilities()), this.currency),
      formattedLongTermDebt: this.calculationService.formatCurrency(this.sumItems(this.longTermLiabilities()), this.currency),
      formattedTotalEquity: this.calculationService.formatCurrency(totalEquity, this.currency),
      formattedLiabilitiesAndEquity: this.calculationService.formatCurrency(totalLiabilities + totalEquity, this.currency),
      formattedWorkingCapital: this.calculationService.formatCurrency(workingCapital, this.currency),
      workingCapital
    };
  });

  // Balance validation
  balanceCheckStatus = computed(() => {
    const totalAssets = this.sumItems([...this.currentAssets(), ...this.fixedAssets()]);
    const totalLiabilities = this.sumItems([...this.currentLiabilities(), ...this.longTermLiabilities()]);
    const totalEquity = this.sumItems(this.equity());
    const liabilitiesAndEquity = totalLiabilities + totalEquity;
    const difference = totalAssets - liabilitiesAndEquity;
    const isBalanced = Math.abs(difference) < 0.01; // Allow for minor rounding differences

    return {
      isBalanced,
      difference,
      formattedDifference: this.calculationService.formatCurrency(Math.abs(difference), this.currency),
      message: isBalanced ? '✅ Balance Sheet Balanced' : '❌ Balance Sheet Out of Balance'
    };
  });

  ngOnInit() {
    this.loadBalanceSheetData();
  }

  /**
   * 🎯 Lifecycle hook for balance sheet specific data transformations
   */
  protected override afterItemsLoaded(itemType: FinancialItemType, items: CompanyFinancialItem[]): void {
    console.log(`🏦 Balance Sheet: Processing ${items.length} ${itemType} items`);

    // Balance sheet specific transformations
    switch (itemType) {
      case 'asset':
        // Sort assets by liquidity (current assets first, then fixed)
        items.sort((a, b) => {
          const aIsCurrentAsset = this.isCurrentAsset(a);
          const bIsCurrentAsset = this.isCurrentAsset(b);
          if (aIsCurrentAsset && !bIsCurrentAsset) return -1;
          if (!aIsCurrentAsset && bIsCurrentAsset) return 1;
          return (b.amount || 0) - (a.amount || 0); // Then by amount descending
        });
        break;

      case 'liability':
        // Sort liabilities by maturity (current first, then long-term)
        items.sort((a, b) => {
          const aIsCurrent = this.isCurrentLiability(a);
          const bIsCurrent = this.isCurrentLiability(b);
          if (aIsCurrent && !bIsCurrent) return -1;
          if (!aIsCurrent && bIsCurrent) return 1;
          return (b.amount || 0) - (a.amount || 0);
        });
        break;
    }
  }

  /**
   * 🚀 Load all balance sheet data
   */
  loadBalanceSheetData() {
    // Load sample data - replace with actual backend calls
    this.loadSampleAssets();
    this.loadSampleLiabilities();
    this.loadSampleEquity();
  }

  /**
   * 🏦 Helper methods for balance sheet operations
   */
  private sumItems(items: CompanyFinancialItem[]): number {
    return items.reduce((sum, item) => sum + (item.amount || 0), 0);
  }

  private isCurrentAsset(asset: CompanyFinancialItem): boolean {
    const currentAssetKeywords = ['cash', 'inventory', 'receivable', 'supplies'];
    const name = (asset.name || '').toLowerCase();
    return currentAssetKeywords.some(keyword => name.includes(keyword));
  }

  private isCurrentLiability(liability: CompanyFinancialItem): boolean {
    const currentLiabilityKeywords = ['payable', 'short-term', 'accrued', 'current'];
    const name = (liability.name || '').toLowerCase();
    return currentLiabilityKeywords.some(keyword => name.includes(keyword));
  }

  /**
   * 💰 Currency formatting helper
   */
  formatCurrency(amount: number): string {
    return this.calculationService.formatCurrency(amount, this.currency);
  }

  /**
   * 🎯 Ratio health indicators
   */
  getRatioHealthColor(ratioType: string): string {
    const metrics = this.financialMetrics();

    switch (ratioType) {
      case 'debtToEquity':
        return metrics.debtToEquityRatio > 2 ? 'text-red-600' :
               metrics.debtToEquityRatio > 1 ? 'text-yellow-600' : 'text-green-600';
      case 'currentRatio':
        return metrics.currentRatio < 1 ? 'text-red-600' :
               metrics.currentRatio < 1.5 ? 'text-yellow-600' : 'text-green-600';
      case 'workingCapital':
        return metrics.workingCapital < 0 ? 'text-red-600' : 'text-green-600';
      case 'returnOnAssets':
        return metrics.returnOnAssets < 5 ? 'text-red-600' :
               metrics.returnOnAssets < 10 ? 'text-yellow-600' : 'text-green-600';
      default:
        return 'text-gray-600';
    }
  }

  getRatioHealthMessage(ratioType: string): string {
    const metrics = this.financialMetrics();

    switch (ratioType) {
      case 'debtToEquity':
        return metrics.debtToEquityRatio > 2 ? 'High Risk' :
               metrics.debtToEquityRatio > 1 ? 'Moderate' : 'Healthy';
      case 'currentRatio':
        return metrics.currentRatio < 1 ? 'Poor Liquidity' :
               metrics.currentRatio < 1.5 ? 'Adequate' : 'Strong';
      case 'workingCapital':
        return metrics.workingCapital < 0 ? 'Negative' : 'Positive';
      case 'returnOnAssets':
        return metrics.returnOnAssets < 5 ? 'Below Average' :
               metrics.returnOnAssets < 10 ? 'Average' : 'Excellent';
      default:
        return '';
    }
  }

  /**
   * 📋 Sample data methods - replace with actual backend integration
   */
  private loadSampleAssets() {
    // Current Assets
    this.currentAssets.set([
      { id: 1, company_id: this.companyId, year_: this.year, item_type: 'asset',
        name: 'Cash & Cash Equivalents', amount: 50000, note: 'Checking and savings accounts' } as CompanyFinancialItem,
      { id: 2, company_id: this.companyId, year_: this.year, item_type: 'asset',
        name: 'Accounts Receivable', amount: 25000, note: 'Outstanding invoices' } as CompanyFinancialItem,
      { id: 3, company_id: this.companyId, year_: this.year, item_type: 'asset',
        name: 'Inventory', amount: 15000, note: 'Stock and supplies' } as CompanyFinancialItem
    ]);

    // Fixed Assets
    this.fixedAssets.set([
      { id: 4, company_id: this.companyId, year_: this.year, item_type: 'asset',
        name: 'Equipment', amount: 75000, note: 'Office equipment and machinery' } as CompanyFinancialItem,
      { id: 5, company_id: this.companyId, year_: this.year, item_type: 'asset',
        name: 'Property', amount: 200000, note: 'Real estate and buildings' } as CompanyFinancialItem
    ]);
  }

  private loadSampleLiabilities() {
    // Current Liabilities
    this.currentLiabilities.set([
      { id: 6, company_id: this.companyId, year_: this.year, item_type: 'liability',
        name: 'Accounts Payable', amount: 20000, note: 'Outstanding bills' } as CompanyFinancialItem,
      { id: 7, company_id: this.companyId, year_: this.year, item_type: 'liability',
        name: 'Short-term Debt', amount: 10000, note: 'Credit cards and short-term loans' } as CompanyFinancialItem
    ]);

    // Long-term Liabilities
    this.longTermLiabilities.set([
      { id: 8, company_id: this.companyId, year_: this.year, item_type: 'liability',
        name: 'Mortgage', amount: 150000, note: 'Property mortgage' } as CompanyFinancialItem,
      { id: 9, company_id: this.companyId, year_: this.year, item_type: 'liability',
        name: 'Business Loan', amount: 50000, note: 'Long-term business financing' } as CompanyFinancialItem
    ]);
  }

  private loadSampleEquity() {
    this.equity.set([
      { id: 10, company_id: this.companyId, year_: this.year, item_type: 'equity',
        name: 'Owner\'s Investment', amount: 100000, note: 'Initial capital investment' } as CompanyFinancialItem,
      { id: 11, company_id: this.companyId, year_: this.year, item_type: 'equity',
        name: 'Retained Earnings', amount: 35000, note: 'Accumulated profits' } as CompanyFinancialItem
    ]);
  }

  /**
   * 📄 Export functionality
   */
  exportBalanceSheet(): void {
    console.log('Exporting balance sheet for year:', this.year);
    console.log('Balance Status:', this.balanceCheckStatus().message);
    console.log('Key Ratios:', {
      debtToEquity: this.financialMetrics().formattedDebtToEquity,
      currentRatio: this.financialMetrics().formattedCurrentRatio,
      workingCapital: this.financialMetrics().formattedWorkingCapital
    });
    // Implementation for PDF export functionality
  }

  /**
   * 📅 Helper method for template date formatting
   */
  getCurrentDate(): string {
    return new Date().toLocaleDateString();
  }
}
