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
              (click)="navigateToTab('bank-statements')"
              [class]="getTabClasses('bank-statements')"
              class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors">
              <i class="fas fa-university mr-2"></i>
              Bank Statements
            </button>

            <button
              (click)="navigateToTab('revenue')"
              [class]="getTabClasses('revenue')"
              class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors">
              <i class="fas fa-chart-line mr-2"></i>
              Revenue
            </button>

            <button
              (click)="navigateToTab('profits')"
              [class]="getTabClasses('profits')"
              class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors">
              <i class="fas fa-coins mr-2"></i>
              Profits
            </button>

            <button
              (click)="navigateToTab('cost-structure')"
              [class]="getTabClasses('cost-structure')"
              class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors">
              <i class="fas fa-chart-pie mr-2"></i>
              Cost Structure
            </button>

            <button
              (click)="navigateToTab('balance-sheet')"
              [class]="getTabClasses('balance-sheet')"
              class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors">
              <i class="fas fa-balance-scale mr-2"></i>
              Balance Sheet
            </button>

            <button
              (click)="navigateToTab('ratios')"
              [class]="getTabClasses('ratios')"
              class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors">
              <i class="fas fa-calculator mr-2"></i>
              Ratios
            </button>

            <button
              (click)="navigateToTab('funds-received')"
              [class]="getTabClasses('funds-received')"
              class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors">
              <i class="fas fa-hand-holding-usd mr-2"></i>
              Funds Received
            </button>

            <button
              (click)="navigateToTab('employee-count')"
              [class]="getTabClasses('employee-count')"
              class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors">
              <i class="fas fa-users mr-2"></i>
              Employee Count
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
