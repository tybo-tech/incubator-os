import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { MetricsOverviewComponent, MetricCard } from '../../shared/metrics-overview/metrics-overview.component';

@Component({
  selector: 'app-financial-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, MetricsOverviewComponent],
  template: `
    <div class="p-4 lg:p-8">
      <div class="max-w-7xl mx-auto">
        <!-- Financial Shell Header -->
        <div class="mb-8">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="text-2xl font-bold text-gray-900 mb-2">Financial Management</h2>
              <p class="text-gray-600">Comprehensive financial analytics and management tools</p>
            </div>

            <!-- Financial Actions -->
            <div class="flex items-center space-x-3">
              <button
                class="hidden lg:inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                Export Reports
              </button>

              <button
                class="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                <span class="hidden sm:inline">Add Entry</span>
                <span class="sm:hidden">Add</span>
              </button>
            </div>
          </div>

          <!-- Financial Metrics Overview -->
          <app-metrics-overview [metrics]="financialMetrics"></app-metrics-overview>

          <!-- Financial Navigation Tabs -->
          <div class="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div class="border-b border-gray-200">
              <nav class="flex space-x-8 px-6 overflow-x-auto">
                <button
                  *ngFor="let tab of financialTabs"
                  (click)="navigateToFinancialTab(tab.route)"
                  [class]="getFinancialTabClasses(tab.route)"
                  class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors">
                  <span class="flex items-center space-x-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="tab.icon"></path>
                    </svg>
                    <span class="hidden sm:inline">{{ tab.label }}</span>
                  </span>
                </button>
              </nav>
            </div>

            <!-- Financial Shell Content -->
            <div class="p-6">
              <router-outlet></router-outlet>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./financial-shell.component.scss']
})
export class FinancialShellComponent implements OnInit {
  companyId: string | null = null;
  currentFinancialRoute = '';

  financialMetrics: MetricCard[] = [
    {
      title: 'Total Revenue',
      value: 'R 2.4M',
      change: '+12.5% from last year',
      changeType: 'positive',
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-600'
    },
    {
      title: 'Gross Profit',
      value: 'R 1.8M',
      change: '+8.2% from last year',
      changeType: 'positive',
      icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
      bgColor: 'bg-green-100',
      textColor: 'text-green-600'
    },
    {
      title: 'Net Profit',
      value: 'R 450K',
      change: '-2.1% from last year',
      changeType: 'negative',
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-600'
    },
    {
      title: 'Cash Flow',
      value: 'R 320K',
      change: '+5.8% from last month',
      changeType: 'positive',
      icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-600'
    }
  ];

  financialTabs = [
    {
      label: 'Dashboard',
      route: 'dashboard',
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
    },
    {
      label: 'P&L Statement',
      route: 'profit-loss',
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
    },
    {
      label: 'Balance Sheet',
      route: 'balance-sheet',
      icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z'
    },
    {
      label: 'Cash Flow',
      route: 'cash-flow',
      icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z'
    },
    {
      label: 'Ratios',
      route: 'ratios',
      icon: 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z'
    },
    {
      label: 'Budgets',
      route: 'budgets',
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1'
    },
    {
      label: 'Forecasts',
      route: 'forecasts',
      icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6'
    }
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Get company ID from parent route
    this.route.parent?.params.subscribe(params => {
      this.companyId = params['id'];
    });

    // Track current financial route for active tab highlighting
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.updateCurrentFinancialRoute(event.url);
      });

    // Initialize current route
    this.updateCurrentFinancialRoute(this.router.url);
  }

  updateCurrentFinancialRoute(url: string): void {
    // Extract the financial tab route from the URL
    const urlParts = url.split('/');
    const lastPart = urlParts[urlParts.length - 1];
    this.currentFinancialRoute = this.financialTabs.some(tab => tab.route === lastPart) ? lastPart : 'dashboard';
  }

  navigateToFinancialTab(route: string): void {
    if (this.companyId) {
      this.router.navigate(['/company', this.companyId, 'financials', route]);
    }
  }

  getFinancialTabClasses(route: string): string {
    const isActive = this.currentFinancialRoute === route;
    return isActive
      ? 'border-blue-500 text-blue-600'
      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300';
  }
}
