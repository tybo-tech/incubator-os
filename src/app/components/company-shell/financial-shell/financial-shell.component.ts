import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  RouterOutlet,
  Router,
  ActivatedRoute,
  RouterLink,
  NavigationEnd,
} from '@angular/router';
import { ContextService } from '../../../../services/context.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-financial-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Financial Shell Header -->
      <div class="bg-white border-b border-gray-200">
        <div class="px-6 py-4">
          <h1 class="text-2xl font-bold text-gray-900 flex items-center">
            <i class="fas fa-chart-line text-green-600 mr-3"></i>
            Financial Management
          </h1>
          <p class="text-gray-600 mt-1">
            Comprehensive financial analytics and reporting
          </p>
        </div>
      </div>

      <!-- Sticky Financial Navigation Tabs -->
      <div class="bg-white border-b border-gray-200 sticky top-32 z-20">
        <div class="px-6">
          <div class="flex space-x-8 overflow-x-auto">
            <a
              *ngFor="let tab of financialTabs"
              [routerLink]="[tab.route]"
              [queryParams]="getQueryParams()"
              [class]="
                'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ' +
                (isTabActive(tab.route)
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')
              "
            >
              <i [class]="tab.icon + ' mr-2'"></i>
              {{ tab.label }}
            </a>
          </div>
        </div>
      </div>

      <!-- Content Area with Router Outlet -->
      <div class="max-w-7xl mx-auto px-6 py-6">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
})
export class FinancialShellComponent implements OnInit {
  currentUrl = '';

  // Query parameters to persist throughout financial navigation
  clientId: number | null = null;
  programId: number | null = null;
  cohortId: number | null = null;

  financialTabs = [
    {
      label: 'Monthly Revenue',
      route: 'monthly-revenue',
      icon: 'fas fa-chart-line',
    },
    {
      label: 'Bank Statements',
      route: 'bank-statements',
      icon: 'fas fa-university',
    },
    {
      label: 'Revenue',
      route: 'revenue',
      icon: 'fas fa-trending-up',
    },

    {
      label: 'Cost Structure',
      route: 'cost-structure',
      icon: 'fas fa-chart-pie',
    },
    {
      label: 'Balance Sheet',
      route: 'balance-sheet',
      icon: 'fas fa-balance-scale',
    },
    {
      label: 'Profits',
      route: 'profits',
      icon: 'fas fa-coins',
    },

    {
      label: 'Ratios',
      route: 'ratios',
      icon: 'fas fa-calculator',
    },
    {
      label: 'Funds Received',
      route: 'funds-received',
      icon: 'fas fa-hand-holding-usd',
    },
    {
      label: 'Employee Count',
      route: 'employee-count',
      icon: 'fas fa-users',
    },
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private contextService: ContextService
  ) {}

  ngOnInit(): void {
    // Subscribe to context changes
    this.contextService.context$.subscribe(context => {
      this.clientId = context.clientId;
      this.programId = context.programId;
      this.cohortId = context.cohortId;

      console.log('FinancialShell - Context updated from service:', {
        clientId: this.clientId,
        programId: this.programId,
        cohortId: this.cohortId
      });
    });

    // Track route changes for active tab highlighting
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentUrl = event.url;
      });

    // Set initial URL
    this.currentUrl = this.router.url;
  }

  isTabActive(tabRoute: string): boolean {
    return this.currentUrl.includes(`/financials/${tabRoute}`);
  }

  /**
   * Get current query parameters for child component navigation
   */
  getQueryParams(): any {
    return this.contextService.getQueryParams();
  }
}
