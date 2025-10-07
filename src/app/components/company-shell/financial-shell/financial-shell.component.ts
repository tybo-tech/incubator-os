import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-financial-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Financial Shell Header with Navigation -->
      <div class="bg-white border-b border-gray-200">
        <div class="px-6 py-4">
          <h1 class="text-2xl font-bold text-gray-900 flex items-center">
            <i class="fas fa-chart-line text-green-600 mr-3"></i>
            Financial Management
          </h1>
          <p class="text-gray-600 mt-1">Comprehensive financial analytics and reporting</p>
        </div>

        <!-- Financial Navigation Tabs -->
        <div class="px-6">
          <div class="flex space-x-8 overflow-x-auto">
            <button
              (click)="navigateToTab('statement')"
              [class]="getTabClasses('statement')"
              class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors">
              <i class="fas fa-file-invoice-dollar mr-2"></i>
              Financial Statement
            </button>

            <button
              (click)="navigateToTab('cashflow')"
              [class]="getTabClasses('cashflow')"
              class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors">
              <i class="fas fa-exchange-alt mr-2"></i>
              Cash Flow
            </button>

            <button
              (click)="navigateToTab('budgets')"
              [class]="getTabClasses('budgets')"
              class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors">
              <i class="fas fa-calculator mr-2"></i>
              Budget Planning
            </button>

            <button
              (click)="navigateToTab('analytics')"
              [class]="getTabClasses('analytics')"
              class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors">
              <i class="fas fa-chart-bar mr-2"></i>
              Analytics
            </button>

            <button
              (click)="navigateToTab('reports')"
              [class]="getTabClasses('reports')"
              class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors">
              <i class="fas fa-file-export mr-2"></i>
              Reports
            </button>
          </div>
        </div>
      </div>

      <!-- Content Area with Router Outlet -->
      <div class="max-w-7xl mx-auto px-6 py-6">
        <router-outlet></router-outlet>
      </div>
    </div>
  `
})
export class FinancialShellComponent {
  currentRoute = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Track current route for tab highlighting
    this.router.events.subscribe(() => {
      this.currentRoute = this.router.url.split('/').pop() || '';
    });
  }

  navigateToTab(route: string): void {
    // Get company ID from parent route
    const companyId = this.route.parent?.snapshot.params['id'];
    if (companyId) {
      this.router.navigate([`/company/${companyId}/financials/${route}`]);
    }
  }

  getTabClasses(route: string): string {
    const isActive = this.currentRoute === route;

    if (isActive) {
      return 'border-green-500 text-green-600';
    } else {
      return 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300';
    }
  }
}
