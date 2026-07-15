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
  selector: 'app-funding-tracker-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="bg-white border-b border-gray-200">
        <div class="px-6 py-4">
          <h1 class="text-2xl font-bold text-gray-900 flex items-center">
            <i class="fas fa-hand-holding-usd text-blue-600 mr-3"></i>
            Funding Tracker
          </h1>
          <p class="text-gray-600 mt-1">
            SEDA assessment, itemized purchases, and payment tracking
          </p>
        </div>
      </div>

      <div class="bg-white border-b border-gray-200 sticky top-32 z-20">
        <div class="px-6">
          <div class="flex space-x-8 overflow-x-auto">
            <a
              *ngFor="let tab of tabs"
              [routerLink]="[tab.route]"
              [queryParams]="getQueryParams()"
              [class]="
                'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ' +
                (isTabActive(tab.route)
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')
              "
            >
              <i [class]="tab.icon + ' mr-2'"></i>
              {{ tab.label }}
            </a>
          </div>
        </div>
      </div>

      <div class="w-full px-6 py-6">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
})
export class FundingTrackerShellComponent implements OnInit {
  currentUrl = '';

  clientId: number | null = null;
  programId: number | null = null;
  cohortId: number | null = null;

  tabs = [
    { label: 'SEDA Assessment', route: 'seda-assessment', icon: 'fas fa-clipboard-check' },
    { label: 'Itemized List', route: 'purchases', icon: 'fas fa-shopping-cart' },
    { label: 'Payments Tracker', route: 'seed-funding', icon: 'fas fa-seedling' },
    { label: 'Process Tracker', route: 'process-tracker', icon: 'fas fa-tasks' },
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private contextService: ContextService
  ) {}

  ngOnInit(): void {
    this.contextService.context$.subscribe((context) => {
      this.clientId = context.clientId;
      this.programId = context.programId;
      this.cohortId = context.cohortId;
    });

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
