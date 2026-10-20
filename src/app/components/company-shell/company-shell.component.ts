import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterOutlet, NavigationEnd } from '@angular/router';
import { CompanyService } from '../../../services/company.service';
import { ContextService } from '../../../services/context.service';
import { ICompany } from '../../../models/simple.schema';
import { filter } from 'rxjs/operators';
import { TabBarComponent, TabItem } from '../../shared/tab-bar.component';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon';

@Component({
  selector: 'app-company-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, TabBarComponent, AppIconComponent],
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
                <app-icon name="chevron-left" class="text-[20px]"></app-icon>
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
                <app-icon name="arrow-down-tray" class="mr-2 text-[16px]"></app-icon>
                Export
              </button>

              <button
                class="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                title="Quick Actions">
                <app-icon name="plus" class="mr-2 text-[16px]"></app-icon>
                <span class="hidden sm:inline">Actions</span>
              </button>
            </div>
          </div>

          <!-- Company Navigation Tabs -->
          <div class="flex overflow-x-auto">
            <app-tab-bar
              [tabs]="companyTabs"
              [maxVisible]="7"
              [queryParams]="getQueryParams()"
              [activeRoute]="currentUrl"
              [isActiveFn]="isTabActiveFn" />
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

  companyTabs: TabItem[] = [
    {
      label: 'Overview',
      route: 'overview',
      icon: 'home'
    },
    {
      label: 'Assessment',
      route: 'assessment',
      icon: 'check-circle'
    },
    {
      label: 'Directors',
      route: 'directors',
      icon: 'user-group'
    },
    {
      label: 'SWOT Workspace',
      route: 'swot-v2',
      icon: 'rectangle-group'
    },
    {
      label: 'Targets',
      route: 'gps-targets-v2',
      icon: 'flag'
    },
    {
      label: 'Results',
      route: 'results',
      icon: 'trophy'
    },
    {
      label: 'Calendar',
      route: 'calendar',
      icon: 'calendar-days'
    },
    {
      label: 'Sessions',
      route: 'sessions',
      icon: 'chat-bubble-left-right'
    },
    {
      label: 'BEE Compliance',
      route: 'compliance',
      icon: 'shield-check'
    },
    {
      label: 'Financial Indicators',
      route: 'financial-indicators',
      icon: 'chart-bar'
    },
    //coaching/guide
    {
      label: 'Coaching / Guide',
      route: 'coaching',
      icon: 'academic-cap'
    },
    {
      label: 'Purchases',
      route: 'purchases',
      icon: 'shopping-cart'
    },
    {
      label: 'Seed Funding',
      route: 'seed-funding',
      icon: 'banknotes'
    },
    {
      label: 'Financial (Legacy)',
      route: 'financials',
      icon: 'currency-dollar'
    },
    {
      label: 'SWOT (Legacy)',
      route: 'swot',
      icon: 'arrow-trending-up'
    },
    {
      label: 'GPS (Legacy)',
      route: 'gps-targets',
      icon: 'map-pin'
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

  isTabActiveFn = (tab: TabItem): boolean => this.isTabActive(tab.route);

  /**
   * Get current query parameters for child component navigation
   */
  getQueryParams(): any {
    return this.contextService.getQueryParams();
  }
}
