import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { MetricsOverviewComponent, MetricCard } from '../../shared/metrics-overview/metrics-overview.component';
import { CompanyService } from '../../../../services/company.service';
import { ICompany } from '../../../../models/simple.schema';

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
                  class="flex items-center space-x-2 border-b-2 py-4 px-1 text-sm font-medium transition-colors whitespace-nowrap"
                  [class]="getFinancialTabClasses(tab.route)">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="tab.icon"></path>
                  </svg>
                  <span>{{ tab.label }}</span>
                </button>
              </nav>
            </div>
          </div>
        </div>

        <!-- Financial Router Outlet -->
        <router-outlet></router-outlet>
      </div>
    </div>
  `
})
export class FinancialShellComponent implements OnInit {
  companyId: string | null = null;
  company: ICompany | null = null;
  currentFinancialRoute = '';

  financialMetrics: MetricCard[] = [];

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
      icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z'
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
    private route: ActivatedRoute,
    private companyService: CompanyService
  ) {}

  ngOnInit(): void {
    this.route.parent?.params.subscribe(params => {
      this.companyId = params['id'];
      if (this.companyId) {
        this.loadCompanyData();
      }
    });

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.updateCurrentFinancialRoute(event.url);
      });

    this.updateCurrentFinancialRoute(this.router.url);
  }

  loadCompanyData(): void {
    if (!this.companyId) return;

    const companyIdNumber = parseInt(this.companyId, 10);
    if (isNaN(companyIdNumber)) {
      this.updateFinancialMetrics(null);
      return;
    }

    this.companyService.getCompanyById(companyIdNumber).subscribe({
      next: (company) => {
        this.company = company;
        this.updateFinancialMetrics(company);
      },
      error: (error) => {
        console.error('Error loading company:', error);
        this.updateFinancialMetrics(null);
      }
    });
  }

  private updateFinancialMetrics(company: ICompany | null): void {
    if (!company) {
      // Default metrics when no company data
      this.financialMetrics = [
        {
          title: 'Total Revenue',
          value: 'R 0',
          change: 'No data available',
          changeType: 'neutral',
          icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-600'
        }
      ];
      return;
    }

    this.financialMetrics = [
      {
        title: 'Estimated Turnover',
        value: company.turnover_estimated 
          ? `R ${company.turnover_estimated.toLocaleString()}` 
          : 'N/A',
        change: company.turnover_actual 
          ? `Actual: R ${company.turnover_actual.toLocaleString()}`
          : 'Estimated value',
        changeType: 'neutral',
        icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-600'
      },
      {
        title: 'Employee Count',
        value: `${(company.permanent_employees || 0) + (company.temporary_employees || 0)}`,
        change: `${company.permanent_employees || 0} permanent, ${company.temporary_employees || 0} temporary`,
        changeType: 'neutral',
        icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
        bgColor: 'bg-green-100',
        textColor: 'text-green-600'
      },
      {
        title: 'Business Status',
        value: company.cipc_status || 'Unknown',
        change: company.bbbee_level ? `B-BBEE: ${company.bbbee_level}` : 'No B-BBEE level',
        changeType: company.cipc_status === 'IN BUSINESS' ? 'positive' : 'negative',
        icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-600'
      },
      {
        title: 'Compliance',
        value: this.getCompliancePercentage(company) + '%',
        change: this.getComplianceStatus(company),
        changeType: this.getCompliancePercentage(company) >= 75 ? 'positive' : 'negative',
        icon: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
        bgColor: 'bg-purple-100',
        textColor: 'text-purple-600'
      }
    ];
  }

  private getCompliancePercentage(company: ICompany): number {
    const complianceFactors = [
      company.has_valid_bbbbee,
      company.has_tax_clearance,
      company.has_cipc_registration,
      company.cipc_status === 'IN BUSINESS'
    ];
    return Math.round((complianceFactors.filter(Boolean).length / complianceFactors.length) * 100);
  }

  private getComplianceStatus(company: ICompany): string {
    const issues = [];
    if (!company.has_valid_bbbbee) issues.push('B-BBEE');
    if (!company.has_tax_clearance) issues.push('Tax Clearance');
    if (!company.has_cipc_registration) issues.push('CIPC Registration');
    if (company.cipc_status !== 'IN BUSINESS') issues.push('Business Status');

    return issues.length === 0 
      ? 'All compliant' 
      : `${issues.length} issue${issues.length > 1 ? 's' : ''}`;
  }

  updateCurrentFinancialRoute(url: string): void {
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