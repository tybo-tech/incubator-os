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
  selector: 'app-coaching-guide-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Coaching & Guide Header -->
      <div class="bg-white border-b border-gray-200">
        <div class="px-6 py-4">
          <h1 class="text-2xl font-bold text-gray-900 flex items-center">
            <i class="fas fa-chalkboard-teacher text-blue-600 mr-3"></i>
            Coaching & Business Guidance
          </h1>
          <p class="text-gray-600 mt-1">
            Support entrepreneurs through personalized coaching sessions on product,
            marketing, and sales excellence.
          </p>
        </div>
      </div>

      <!-- Sticky Navigation Tabs -->
      <div class="bg-white border-b border-gray-200 sticky top-32 z-20">
        <div class="px-6">
          <div class="flex space-x-8 overflow-x-auto">
            <a
              *ngFor="let tab of guideTabs"
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

      <!-- Content Area -->
      <div class="w-full px-6 py-6">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
})
export class CoachingGuideShellComponent implements OnInit {
  currentUrl = '';

  clientId: number | null = null;
  programId: number | null = null;
  cohortId: number | null = null;

  guideTabs = [
    {
      label: 'Products & Services',
      route: 'products-services',
      icon: 'fas fa-boxes',
    },
    {
      label: 'Marketing Strategies',
      route: 'marketing',
      icon: 'fas fa-bullhorn',
    },
    {
      label: 'Sales & Customers',
      route: 'sales',
      icon: 'fas fa-handshake',
    },
    {
      label: 'Coaching Notes',
      route: 'coaching-notes',
      icon: 'fas fa-clipboard-list',
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

      console.log('CoachingGuideShell - Context updated:', {
        clientId: this.clientId,
        programId: this.programId,
        cohortId: this.cohortId,
      });
    });

    // Track route changes
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
