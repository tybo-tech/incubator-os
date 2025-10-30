import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterOutlet, RouterLink, NavigationEnd } from '@angular/router';
import { ContextService } from '../../../services/context.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-compliance-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Compliance Header -->
      <div class="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Compliance Management</h1>
            <p class="mt-1 text-sm text-gray-500">
              Track and manage critical compliance activities for South African businesses
            </p>
          </div>

          <!-- Compliance Status Summary -->
          <div class="flex items-center space-x-4">
            <div class="text-center">
              <div class="text-sm font-medium text-gray-500">Total Items</div>
              <div class="text-lg font-semibold text-gray-900">{{ getTotalItems() }}</div>
            </div>
            <div class="text-center">
              <div class="text-sm font-medium text-gray-500">Overdue</div>
              <div class="text-lg font-semibold text-red-600">{{ getOverdueCount() }}</div>
            </div>
            <div class="text-center">
              <div class="text-sm font-medium text-gray-500">Due Soon</div>
              <div class="text-lg font-semibold text-amber-600">{{ getDueSoonCount() }}</div>
            </div>
            <div class="text-center">
              <div class="text-sm font-medium text-gray-500">Compliant</div>
              <div class="text-lg font-semibold text-green-600">{{ getCompliantCount() }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="bg-white border-b border-gray-200">
        <div class="px-4 sm:px-6 lg:px-8">
          <nav class="flex space-x-8 overflow-x-auto">
            <a
              *ngFor="let tab of complianceTabs"
              [routerLink]="[tab.route]"
              [queryParams]="getQueryParams()"
              [class]="'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ' +
                      (isTabActive(tab.route) ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')">
              <i [class]="tab.icon + ' w-4 h-4'"></i>
              <span>{{ tab.label }}</span>
            </a>
          </nav>
        </div>
      </div>

      <!-- Content Area -->
      <div class="flex-1 p-4 sm:p-6 lg:p-8">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
  `]
})
export class ComplianceShellComponent implements OnInit {
  currentUrl = '';

  // Query parameters from context
  clientId: number | null = null;
  programId: number | null = null;
  cohortId: number | null = null;

  complianceTabs = [
    {
      label: 'Annual Returns',
      route: 'annual-returns',
      icon: 'fas fa-calendar-check'
    },
    {
      label: 'Beneficial Ownership',
      route: 'beneficial-ownership',
      icon: 'fas fa-users'
    },
    {
      label: 'Tax Registrations',
      route: 'tax-registrations',
      icon: 'fas fa-file-invoice-dollar'
    },
    {
      label: 'B-BBEE Compliance',
      route: 'bbbee-compliance',
      icon: 'fas fa-chart-line'
    },
    {
      label: 'Other Statutory Tasks',
      route: 'other-statutory-tasks',
      icon: 'fas fa-balance-scale'
    }
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private contextService: ContextService
  ) {}

  ngOnInit(): void {
    // Initialize context from route
    this.contextService.extractContextFromRoute(this.route);

    // Subscribe to context changes
    this.contextService.context$.subscribe(context => {
      this.clientId = context.clientId;
      this.programId = context.programId;
      this.cohortId = context.cohortId;
    });

    // Track route changes for active tab highlighting
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentUrl = event.url;
    });

    // Set initial URL
    this.currentUrl = this.router.url;
  }

  isTabActive(tabRoute: string): boolean {
    return this.currentUrl.includes(`/compliance/${tabRoute}`);
  }

  getQueryParams(): any {
    return this.contextService.getQueryParams();
  }

  // Placeholder methods for compliance summary statistics
  // These will be implemented when we have real data
  getTotalItems(): number {
    return 12; // Mock data
  }

  getOverdueCount(): number {
    return 3; // Mock data
  }

  getDueSoonCount(): number {
    return 2; // Mock data
  }

  getCompliantCount(): number {
    return 7; // Mock data
  }
}
