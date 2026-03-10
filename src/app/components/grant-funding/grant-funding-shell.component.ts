import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  RouterOutlet,
  Router,
  ActivatedRoute,
  RouterLink,
  NavigationEnd,
} from '@angular/router';
import { filter } from 'rxjs/operators';
import { ContextService } from '../../../services/context.service';

@Component({
  selector: 'app-grant-funding-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Grant Funding Header -->
      <div class="bg-white border-b border-gray-200">
        <div class="px-6 py-4">
          <h1 class="text-2xl font-bold text-gray-900 flex items-center">
            <i class="fas fa-hand-holding-usd text-green-600 mr-3"></i>
            Grant Funding
          </h1>
          <p class="text-gray-600 mt-1">
            Track and manage grant funding opportunities, applications, and disbursements for this company.
          </p>
        </div>
      </div>

      <!-- Sticky Navigation Tabs -->
      <div class="bg-white border-b border-gray-200 sticky top-32 z-20">
        <div class="px-6">
          <div class="flex space-x-8 overflow-x-auto">
            <a
              *ngFor="let tab of grantTabs"
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

      <!-- Content Area -->
      <div class="w-full px-6 py-6">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
})
export class GrantFundingShellComponent implements OnInit {
  currentUrl = '';

  clientId: number | null = null;
  programId: number | null = null;
  cohortId: number | null = null;

  grantTabs = [
    {
      label: 'Overview',
      route: 'overview',
      icon: 'fas fa-chart-pie',
    },
    {
      label: 'Applications',
      route: 'applications',
      icon: 'fas fa-file-alt',
    },
    {
      label: 'Disbursements',
      route: 'disbursements',
      icon: 'fas fa-money-bill-wave',
    },
    {
      label: 'Reports',
      route: 'reports',
      icon: 'fas fa-clipboard-check',
    },
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private contextService: ContextService
  ) {}

  ngOnInit(): void {
    // Track context changes
    this.contextService.context$.subscribe((context) => {
      this.clientId = context.clientId;
      this.programId = context.programId;
      this.cohortId = context.cohortId;
    });

    // Track route changes for active tab highlighting
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentUrl = event.url;
      });

    this.currentUrl = this.router.url;
  }

  isTabActive(tabRoute: string): boolean {
    const segments = this.currentUrl.split('/');
    const lastSegment = segments[segments.length - 1];
    const routeWithoutQuery = lastSegment.split('?')[0];
    return routeWithoutQuery === tabRoute;
  }

  getQueryParams(): any {
    return this.contextService.getQueryParams();
  }
}
