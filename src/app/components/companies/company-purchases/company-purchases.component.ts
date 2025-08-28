import { Component, OnInit, input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompanyPurchasesService } from '../../../../services/company-purchases.service';
import {
  CompanyPurchase,
  CompanyPurchaseFilters,
  CompanyPurchaseStatistics,
  PurchaseTypeBreakdown,
  ServiceProviderBreakdown
} from '../../../../models/company-purchases.models';

@Component({
  selector: 'app-company-purchases',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './company-purchases.component.html',
  styleUrls: ['./company-purchases.component.scss']
})
export class CompanyPurchasesComponent implements OnInit {
  companyId = input.required<number>();

  // Signals for reactive data
  purchases = signal<CompanyPurchase[]>([]);
  statistics = signal<CompanyPurchaseStatistics | null>(null);
  typeBreakdown = signal<PurchaseTypeBreakdown[]>([]);
  providerBreakdown = signal<ServiceProviderBreakdown[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Filter signals
  filters = signal<CompanyPurchaseFilters>({});
  searchTerm = signal('');

  // Computed values
  totalAmount = computed(() => this.statistics()?.total_amount || 0);
  totalPurchases = computed(() => this.statistics()?.total_purchases || 0);
  averageAmount = computed(() => this.statistics()?.average_amount || 0);

  completionRates = computed(() => {
    const stats = this.statistics();
    if (!stats || stats.total_purchases === 0) {
      return {
        purchaseOrderRate: 0,
        invoiceReceivedRate: 0,
        itemsDeliveredRate: 0,
        alignmentRate: 0
      };
    }

    return {
      purchaseOrderRate: (stats.with_purchase_order / stats.total_purchases) * 100,
      invoiceReceivedRate: (stats.with_invoice / stats.total_purchases) * 100,
      itemsDeliveredRate: (stats.items_delivered / stats.total_purchases) * 100,
      alignmentRate: (stats.aligned_purchases / stats.total_purchases) * 100
    };
  });

  // UI state
  selectedView = signal<'list' | 'statistics' | 'breakdown'>('list');
  showFilters = signal(false);

  constructor(private purchasesService: CompanyPurchasesService) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    this.error.set(null);

    const companyId = this.companyId();

    // Load purchases list
    this.loadPurchases();

    // Load statistics
    this.purchasesService.getPurchaseStatistics(companyId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.statistics.set(response.data);
        }
      },
      error: (error) => {
        console.error('Error loading statistics:', error);
      }
    });

    // Load breakdowns
    this.loadBreakdowns();
  }

  loadPurchases() {
    const currentFilters = { ...this.filters(), company_id: this.companyId() };

    this.purchasesService.listCompanyPurchases(currentFilters).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.purchases.set(response.data.records);
        }
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set('Failed to load purchases');
        this.loading.set(false);
        console.error('Error loading purchases:', error);
      }
    });
  }

  loadBreakdowns() {
    const companyId = this.companyId();

    // Load type breakdown
    this.purchasesService.getPurchaseTypeBreakdown(companyId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.typeBreakdown.set(response.data.records);
        }
      },
      error: (error) => {
        console.error('Error loading type breakdown:', error);
      }
    });

    // Load provider breakdown
    this.purchasesService.getServiceProviderBreakdown(companyId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.providerBreakdown.set(response.data.records);
        }
      },
      error: (error) => {
        console.error('Error loading provider breakdown:', error);
      }
    });
  }

  onSearch() {
    const term = this.searchTerm();
    if (term.trim()) {
      this.loading.set(true);
      this.purchasesService.searchCompanyPurchases(term, this.companyId()).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.purchases.set(response.data.records);
          }
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set('Search failed');
          this.loading.set(false);
          console.error('Error searching purchases:', error);
        }
      });
    } else {
      this.loadPurchases();
    }
  }

  onFilterChange() {
    this.loadPurchases();
  }

  clearFilters() {
    this.filters.set({});
    this.searchTerm.set('');
    this.loadPurchases();
  }

  toggleFilters() {
    this.showFilters.update(show => !show);
  }

  setView(view: 'list' | 'statistics' | 'breakdown') {
    this.selectedView.set(view);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount);
  }

  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  getBooleanIcon(value: boolean): string {
    return value ? '✅' : '❌';
  }

  getBooleanClass(value: boolean): string {
    return value ? 'text-success' : 'text-danger';
  }

  // Filter input handlers
  onPurchaseTypeChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.filters.update(f => ({ ...f, purchase_type: target.value }));
    this.onFilterChange();
  }

  onServiceProviderChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.filters.update(f => ({ ...f, service_provider: target.value }));
    this.onFilterChange();
  }

  onMinAmountChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const value = target.value ? +target.value : undefined;
    this.filters.update(f => ({ ...f, min_amount: value }));
    this.onFilterChange();
  }

  onMaxAmountChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const value = target.value ? +target.value : undefined;
    this.filters.update(f => ({ ...f, max_amount: value }));
    this.onFilterChange();
  }

  // UI Helper methods for new template
  trackByPurchaseId(index: number, purchase: CompanyPurchase): number {
    return purchase.id || index;
  }

  getPurchaseTypeIcon(purchaseType: string): string {
    const iconMap: { [key: string]: string } = {
      'laptop': 'laptop',
      'printer': 'print',
      'tools': 'tools',
      'ppe': 'hard-hat',
      'stationery': 'paperclip',
      'equipment': 'cogs',
      'training': 'graduation-cap',
      'generator': 'bolt',
      'ecommerce': 'shopping-cart',
      'website': 'globe',
      'default': 'box'
    };

    const type = purchaseType.toLowerCase();
    for (const [key, icon] of Object.entries(iconMap)) {
      if (type.includes(key)) {
        return icon;
      }
    }
    return iconMap['default'];
  }

  getStatusBadgeClass(type: string, status: boolean): string {
    switch (type) {
      case 'po':
        return status
          ? 'bg-green-100 text-green-800'
          : 'bg-gray-100 text-gray-500';
      case 'invoice':
        return status
          ? 'bg-blue-100 text-blue-800'
          : 'bg-gray-100 text-gray-500';
      case 'delivery':
        return status
          ? 'bg-indigo-100 text-indigo-800'
          : 'bg-gray-100 text-gray-500';
      case 'aligned':
        return status
          ? 'bg-amber-100 text-amber-800'
          : 'bg-gray-100 text-gray-500';
      default:
        return 'bg-gray-100 text-gray-500';
    }
  }

  // Add method for action menu toggle (optional)
  toggleActionMenu(purchaseId: number | undefined): void {
    // You can implement dropdown logic here if needed
    if (purchaseId) {
      console.log('Toggle action menu for purchase:', purchaseId);
    }
  }

  // Chart color helper for breakdown views
  getChartColor(index: number): string {
    const colors = [
      '#3B82F6', // blue-500
      '#10B981', // emerald-500
      '#8B5CF6', // violet-500
      '#F59E0B', // amber-500
      '#EF4444', // red-500
      '#06B6D4', // cyan-500
      '#84CC16', // lime-500
      '#F97316', // orange-500
    ];
    return colors[index % colors.length];
  }
}
