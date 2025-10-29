import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterOutlet, RouterLink, NavigationEnd } from '@angular/router';
import { CompanyService } from '../../../services/company.service';
import { ContextService } from '../../../services/context.service';
import { ICompany } from '../../../models/simple.schema';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-company-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Company Shell Header -->
      <div class="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div class="px-4 sm:px-6 lg:px-8">
          <!-- Company Header Section -->
          <div class="flex items-center justify-between py-4 border-b border-gray-100">
            <div class="flex items-center space-x-4">
              <!-- Back to Companies List -->
              <button
                (click)="navigateBack()"
                class="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Back to Companies List">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                </svg>
              </button>

              <!-- Company Info -->
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                  {{ companyInitial }}
                </div>
                <div class="hidden sm:block">
                  <h1 class="text-lg font-semibold text-gray-900">{{ company?.name || companyName }}</h1>
                  <p class="text-sm text-gray-500">
                    {{ company?.registration_no || (companyId ? 'ID: ' + companyId : 'Company Management') }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Header Actions -->
            <div class="flex items-center space-x-3">
              <button
                class="hidden lg:inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                title="Export Data">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                Export
              </button>

              <button
                class="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                title="Quick Actions">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                <span class="hidden sm:inline">Actions</span>
              </button>
            </div>
          </div>

          <!-- Company Navigation Tabs -->
          <div class="flex space-x-8 overflow-x-auto">
            <a
              *ngFor="let tab of companyTabs"
              [routerLink]="[tab.route]"
              [queryParams]="getQueryParams()"
              [class]="'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ' +
                      (isTabActive(tab.route) ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')">
              <span class="flex items-center space-x-2">
                <i [class]="tab.icon + ' w-4 h-4'"></i>
                <span class="hidden sm:inline">{{ tab.label }}</span>
              </span>
            </a>
          </div>
        </div>
      </div>

      <!-- Company Shell Content -->
      <div class="flex-1">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styleUrls: ['./company-shell.component.scss']
})
export class CompanyShellComponent implements OnInit {
  companyId: string | null = null;
  company: ICompany | null = null;
  companyName = 'Company Management';
  companyInitial = 'C';
  currentUrl = '';

  // Query parameters to persist throughout navigation
  clientId: number | null = null;
  programId: number | null = null;
  cohortId: number | null = null;

  companyTabs = [
    {
      label: 'Overview',
      route: 'overview',
      icon: 'fas fa-home'
    },
    {
      label: 'Assessment',
      route: 'assessment',
      icon: 'fas fa-check-circle'
    },
    {
      label: 'SWOT Analysis',
      route: 'swot',
      icon: 'fas fa-chart-line'
    },
    {
      label: 'GPS Targets',
      route: 'gps-targets',
      icon: 'fas fa-bullseye'
    },
    {
      label: 'Financial',
      route: 'financials',
      icon: 'fas fa-dollar-sign'
    },
    {
      label: 'Compliance',
      route: 'compliance',
      icon: 'fas fa-shield-alt'
    },
    //coaching/guide
    {
      label: 'Coaching / Guide',
      route: 'coaching-guide',
      icon: 'fas fa-chalkboard-teacher'
    }
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private companyService: CompanyService,
    private contextService: ContextService
  ) {}

  ngOnInit(): void {
    // Initialize context from route
    this.contextService.extractContextFromRoute(this.route);

    // Get company ID from route parameters
    this.route.params.subscribe(params => {
      this.companyId = params['id'];
      if (this.companyId) {
        this.loadCompanyInfo();
      }
    });

    // Subscribe to context changes
    this.contextService.context$.subscribe(context => {
      this.clientId = context.clientId;
      this.programId = context.programId;
      this.cohortId = context.cohortId;

      console.log('CompanyShell - Context updated from service:', {
        clientId: this.clientId,
        programId: this.programId,
        cohortId: this.cohortId
      });
    });

    // Track route changes for active tab highlighting
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentUrl = event.url;
    });

    // Set initial URL
    this.currentUrl = this.router.url;

    // Load company info if we have an ID
    if (this.companyId) {
      this.loadCompanyInfo();
    }
  }

  loadCompanyInfo(): void {
    if (!this.companyId) return;

    const companyIdNumber = parseInt(this.companyId, 10);
    if (isNaN(companyIdNumber)) {
      this.companyName = `Company ${this.companyId}`;
      this.companyInitial = this.companyName.charAt(0);
      return;
    }

    this.companyService.getCompanyById(companyIdNumber).subscribe({
      next: (company) => {
        this.company = company;
        this.companyName = company.name;
        this.companyInitial = company.name.charAt(0).toUpperCase();
      },
      error: (error) => {
        console.error('Error loading company:', error);
        this.companyName = `Company ${this.companyId}`;
        this.companyInitial = this.companyName.charAt(0);
      }
    });
  }

  navigateBack(): void {
    // Navigate back to companies list with preserved query parameters
    if (this.clientId && this.programId && this.cohortId) {
      // Navigate to the cohorts page with the cohortId in query params
      this.router.navigate(
        ['/admin/clients', this.clientId, 'programs', this.programId, 'cohorts'],
        {
          queryParams: {
            cohortId: this.cohortId
          }
        }
      );
    } else {
      // Fallback to companies list if context is missing
      this.router.navigate(['/companies']);
    }
  }

  isTabActive(tabRoute: string): boolean {
    if (!this.companyId) return false;
    const expectedPath = `/company/${this.companyId}/${tabRoute}`;
    return this.currentUrl.startsWith(expectedPath);
  }

  /**
   * Get current query parameters for child component navigation
   */
  getQueryParams(): any {
    return this.contextService.getQueryParams();
  }
}
