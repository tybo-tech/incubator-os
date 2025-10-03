import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CategoryService } from '../../../services/category.service';
import { OverviewGridComponent } from '../overview/components/overview-grid.component';
import { OverviewHeaderComponent, OverviewStats } from '../overview/components/overview-header.component';
import { CategoryCompanyPickerComponent } from '../../components/category-company-picker/category-company-picker.component';
import { ICompany } from '../../../models/simple.schema';
import { catchError, EMPTY, forkJoin, switchMap, firstValueFrom } from 'rxjs';

interface Cohort {
  id: number;
  name: string;
  description?: string | null;
  type: string;
  stats?: {
    companyCount?: number;
    activeCompanies?: number;
    completedCompanies?: number;
  };
}

interface BreadcrumbInfo {
  clientId: number;
  clientName: string;
  programId: number;
  programName: string;
}

@Component({
  selector: 'app-cohorts-list',
  standalone: true,
  imports: [CommonModule, FormsModule, OverviewGridComponent, OverviewHeaderComponent, CategoryCompanyPickerComponent],
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-7xl mx-auto px-6 py-8">
        <!-- Breadcrumb -->
        <nav class="flex mb-6" aria-label="Breadcrumb">
          <ol class="flex items-center space-x-4">
            <li>
              <button
                (click)="navigateToClients()"
                class="text-blue-600 hover:text-blue-800 transition-colors">
                Clients
              </button>
            </li>
            <li class="flex items-center">
              <svg class="w-5 h-5 text-gray-400 mx-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
              </svg>
              <button
                (click)="navigateToPrograms()"
                class="text-blue-600 hover:text-blue-800 transition-colors">
                {{ breadcrumbInfo()?.clientName || 'Client' }}
              </button>
            </li>
            <li class="flex items-center">
              <svg class="w-5 h-5 text-gray-400 mx-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
              </svg>
              <span class="text-gray-900 font-medium">{{ breadcrumbInfo()?.programName || 'Program' }}</span>
            </li>
            <!-- Show cohort name if viewing companies -->
            <li *ngIf="isViewingCompanies()" class="flex items-center">
              <svg class="w-5 h-5 text-gray-400 mx-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
              </svg>
              <span class="text-gray-900 font-medium">{{ selectedCohort()?.name || 'Cohort' }}</span>
            </li>
          </ol>
        </nav>

        <!-- Header -->
        <div class="mb-8">
          <!-- Back button when viewing companies -->
          <div *ngIf="isViewingCompanies()" class="flex items-center mb-4">
            <button
              (click)="backToCohorts()"
              class="flex items-center text-blue-600 hover:text-blue-800 transition-colors">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
              </svg>
              Back to Cohorts
            </button>
          </div>

          <!-- Use Overview Header for companies view -->
          <div *ngIf="isViewingCompanies()">
            <app-overview-header
              [currentLevel]="'cohort'"
              [showSearch]="companies().length > 5"
              [searchQuery]="searchQuery()"
              [stats]="currentLevelStats()"
              (openCompanyModal)="openCompanyModal()"
              (searchChange)="onSearchChange($event)"
            ></app-overview-header>

            <!-- Sorting Controls for Companies -->
            <div *ngIf="companies().length > 1" class="flex items-center justify-between mt-4 p-4 bg-gray-50 rounded-lg">
              <div class="flex items-center space-x-4">
                <span class="text-sm font-medium text-gray-700">Sort by:</span>
                <select
                  [value]="sortBy()"
                  (change)="onSortChange($any($event).target.value)"
                  class="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
                  <option value="name">Company Name</option>
                  <option value="location">Location</option>
                  <option value="turnover">Turnover</option>
                  <option value="compliance">Compliance Score</option>
                </select>

                <button
                  (click)="toggleSortDirection()"
                  class="p-1 text-gray-600 hover:text-gray-800 transition-colors"
                  [title]="sortDirection() === 'asc' ? 'Sort Descending' : 'Sort Ascending'">
                  <svg class="w-4 h-4 transform transition-transform"
                       [class.rotate-180]="sortDirection() === 'desc'"
                       fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
                  </svg>
                </button>
              </div>

              <div class="text-sm text-gray-600">
                Showing {{ filteredAndSortedCompanies().length }} of {{ companies().length }} companies
              </div>
            </div>
          </div>

          <!-- Custom header for cohorts view -->
          <div *ngIf="!isViewingCompanies()">
            <div class="flex items-center justify-between">
              <div>
                <h1 class="text-3xl font-bold text-gray-900">Cohorts</h1>
                <p class="text-gray-600 mt-2">Manage cohorts for {{ breadcrumbInfo()?.programName }}</p>
              </div>
              <button
                (click)="openCreateModal()"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                Add Cohort
              </button>
            </div>

            <!-- Search for cohorts -->
            <div *ngIf="cohorts().length > 5" class="mt-6">
              <input
                type="text"
                placeholder="Search cohorts..."
                [value]="searchQuery()"
                (input)="onSearchChange($any($event).target.value)"
                class="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>
          </div>
        </div>        <!-- Cohorts View -->
        <div *ngIf="!isViewingCompanies()">
          <!-- Loading State -->
          <div *ngIf="isLoading()" class="flex justify-center items-center py-12">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span class="ml-3 text-gray-600">Loading cohorts...</span>
          </div>

          <!-- Error State -->
          <div *ngIf="error()" class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div class="text-red-600 text-lg font-medium mb-2">Failed to load cohorts</div>
            <p class="text-red-500 mb-4">{{ error() }}</p>
            <button
              (click)="loadCohorts()"
              class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
              Try Again
            </button>
          </div>

          <!-- Empty State -->
          <div *ngIf="!isLoading() && !error() && filteredCohorts().length === 0"
               class="text-center py-12">
            <div class="text-gray-400 text-6xl mb-4">👥</div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">
              {{ cohorts().length === 0 ? 'No cohorts yet' : 'No cohorts found' }}
            </h3>
            <p class="text-gray-500 mb-6">
              {{ cohorts().length === 0 ? 'Create your first cohort to get started.' : 'Try adjusting your search criteria.' }}
            </p>
            <button
              *ngIf="cohorts().length === 0"
              (click)="openCreateModal()"
              class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Create First Cohort
            </button>
          </div>

          <!-- Cohorts Grid -->
          <div *ngIf="!isLoading() && !error() && filteredCohorts().length > 0"
               class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div *ngFor="let cohort of filteredCohorts()"
                 class="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                 (click)="selectCohort(cohort)">
              <div class="p-6">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="text-lg font-semibold text-gray-900">{{ cohort.name }}</h3>
                  <div class="text-blue-600">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </div>
                </div>

                <p *ngIf="cohort.description" class="text-gray-600 text-sm mb-4">
                  {{ cohort.description }}
                </p>

                <!-- Statistics -->
                <div class="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                  <div class="text-center">
                    <div class="text-2xl font-bold text-purple-600">{{ cohort.stats?.companyCount || 0 }}</div>
                    <div class="text-xs text-gray-500">Total</div>
                  </div>
                  <div class="text-center">
                    <div class="text-2xl font-bold text-green-600">{{ cohort.stats?.activeCompanies || 0 }}</div>
                    <div class="text-xs text-gray-500">Active</div>
                  </div>
                  <div class="text-center">
                    <div class="text-2xl font-bold text-blue-600">{{ cohort.stats?.completedCompanies || 0 }}</div>
                    <div class="text-xs text-gray-500">Completed</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Companies View (using overview grid) -->
        <div *ngIf="isViewingCompanies()">
          <app-overview-grid
            [items]="filteredAndSortedCompanies()"
            [currentLevel]="'cohort'"
            [isLoading]="isLoadingCompanies()"
            [error]="companiesError()"
            (companyClick)="navigateToCompany($event)"
            (removeCompany)="removeCompanyFromCohort($event)"
            (retryClick)="loadCompaniesInCohort(selectedCohort()!.id)"
          ></app-overview-grid>
        </div>

        <!-- Company Picker Modal -->
        <div *ngIf="showCompanyModal()" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <app-category-company-picker
            [cohortId]="selectedCohort()?.id || 0"
            [programId]="getProgramId()"
            [clientId]="getClientId()"
            (close)="closeCompanyModal()"
            (companiesChanged)="onCompaniesChanged()"
          ></app-category-company-picker>
        </div>

        <!-- Create Cohort Modal -->
        <div *ngIf="showCreateModal()"
             class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div class="px-6 py-4 border-b border-gray-200">
              <h3 class="text-lg font-semibold text-gray-900">Create New Cohort</h3>
            </div>

            <div class="px-6 py-4">
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Cohort Name</label>
                  <input
                    type="text"
                    [(ngModel)]="createForm.name"
                    placeholder="Enter cohort name"
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                  <textarea
                    [(ngModel)]="createForm.description"
                    placeholder="Enter cohort description"
                    rows="3"
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  </textarea>
                </div>
              </div>
            </div>

            <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                (click)="closeCreateModal()"
                class="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                (click)="createCohort()"
                [disabled]="isCreating() || !createForm.name.trim()"
                class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50">
                {{ isCreating() ? 'Creating...' : 'Create Cohort' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class CohortsListComponent implements OnInit {
  cohorts = signal<Cohort[]>([]);
  companies = signal<ICompany[]>([]);
  breadcrumbInfo = signal<BreadcrumbInfo | null>(null);
  selectedCohort = signal<Cohort | null>(null);
  isLoading = signal(false);
  isLoadingCompanies = signal(false);
  error = signal<string | null>(null);
  companiesError = signal<string | null>(null);
  searchQuery = signal('');
  sortBy = signal<'name' | 'location' | 'turnover' | 'compliance'>('name');
  sortDirection = signal<'asc' | 'desc'>('asc');

  // Modal state
  showCreateModal = signal(false);
  showCompanyModal = signal(false);
  isCreating = signal(false);
  createForm = {
    name: '',
    description: ''
  };

  private clientId: number | null = null;
  private programId: number | null = null;

  // Computed
  filteredCohorts = computed(() => {
    const cohorts = this.cohorts();
    const query = this.searchQuery();
    if (!query.trim()) return cohorts;

    const queryLower = query.toLowerCase();
    return cohorts.filter(cohort =>
      cohort.name.toLowerCase().includes(queryLower) ||
      cohort.description?.toLowerCase().includes(queryLower)
    );
  });

  // Filtered and sorted companies
  filteredAndSortedCompanies = computed(() => {
    const companies = this.companies();
    const query = this.searchQuery().toLowerCase().trim();
    const sortBy = this.sortBy();
    const sortDirection = this.sortDirection();

    // First filter the companies
    let filtered = companies;
    if (query) {
      filtered = companies.filter(company =>
        company.name.toLowerCase().includes(query) ||
        company.email_address?.toLowerCase().includes(query) ||
        company.contact_person?.toLowerCase().includes(query) ||
        company.city?.toLowerCase().includes(query) ||
        company.business_location?.toLowerCase().includes(query) ||
        company.registration_no?.toLowerCase().includes(query) ||
        company.description?.toLowerCase().includes(query)
      );
    }

    // Then sort the filtered results
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'location':
          const locationA = a.business_location || a.city || '';
          const locationB = b.business_location || b.city || '';
          comparison = locationA.localeCompare(locationB);
          break;
        case 'turnover':
          const turnoverA = a.turnover_estimated || 0;
          const turnoverB = b.turnover_estimated || 0;
          comparison = turnoverA - turnoverB;
          break;
        case 'compliance':
          // Calculate compliance score inline
          const checksA = [a.has_cipc_registration, a.has_tax_clearance, a.has_valid_bbbbee];
          const passedChecksA = checksA.filter(check => check).length;
          const scoreA = Math.round((passedChecksA / checksA.length) * 100);

          const checksB = [b.has_cipc_registration, b.has_tax_clearance, b.has_valid_bbbbee];
          const passedChecksB = checksB.filter(check => check).length;
          const scoreB = Math.round((passedChecksB / checksB.length) * 100);

          comparison = scoreA - scoreB;
          break;
      }

      return sortDirection === 'desc' ? -comparison : comparison;
    });

    return sorted;
  });

  // Check if we're viewing companies within a cohort
  isViewingCompanies = computed(() => this.selectedCohort() !== null);

  // Statistics for the overview header
  currentLevelStats = computed((): OverviewStats | undefined => {
    if (this.isViewingCompanies()) {
      const companies = this.companies();
      if (companies.length === 0) return undefined;

      // Calculate active/completed status based on cipc_status like in RichCompanyCardComponent
      const activeCount = companies.filter(c =>
        c.cipc_status?.toLowerCase() === 'in business' ||
        c.cipc_status?.toLowerCase() === 'active' ||
        !c.cipc_status
      ).length;
      const completedCount = companies.filter(c =>
        c.cipc_status?.toLowerCase() === 'deregistered' ||
        c.cipc_status?.toLowerCase() === 'inactive'
      ).length;

      return {
        totalItems: companies.length,
        activeItems: activeCount,
        completedItems: completedCount
      };
    } else {
      const cohorts = this.cohorts();
      if (cohorts.length === 0) return undefined;

      return {
        totalItems: cohorts.length
      };
    }
  });

  constructor(
    private categoryService: CategoryService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  // Getters for template access
  getClientId(): number | undefined {
    return this.clientId || undefined;
  }

  getProgramId(): number | undefined {
    return this.programId || undefined;
  }

  // Helper method for compliance score calculation
  calculateComplianceScore(company: ICompany): number {
    const checks = [
      company.has_cipc_registration,
      company.has_tax_clearance,
      company.has_valid_bbbbee
    ];
    const passedChecks = checks.filter(check => check).length;
    return Math.round((passedChecks / checks.length) * 100);
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.clientId = +params['clientId'];
      this.programId = +params['programId'];
      if (this.clientId && this.programId) {
        this.loadBreadcrumbInfo();
        this.loadCohorts();
      }
    });
  }

  async loadBreadcrumbInfo(): Promise<void> {
    if (!this.clientId || !this.programId) return;

    try {
      const [client, program] = await Promise.all([
        firstValueFrom(this.categoryService.getCategoryById(this.clientId)),
        firstValueFrom(this.categoryService.getCategoryById(this.programId))
      ]);

      this.breadcrumbInfo.set({
        clientId: client.id,
        clientName: client.name,
        programId: program.id,
        programName: program.name
      });
    } catch (error) {
      console.error('Failed to load breadcrumb info:', error);
    }
  }

  loadCohorts(): void {
    if (!this.programId) return;

    this.isLoading.set(true);
    this.error.set(null);

    this.categoryService.listCohortsForProgram(this.programId)
      .pipe(
        switchMap(cohorts => {
          if (cohorts.length === 0) {
            this.cohorts.set([]);
            this.isLoading.set(false);
            return EMPTY;
          }

          // Load statistics for each cohort
          const statsRequests = cohorts.map(cohort =>
            this.categoryService.getCategoryStatistics(cohort.id).pipe(
              catchError(() => [{}]) // Return empty stats on error
            )
          );

          return forkJoin(statsRequests).pipe(
            switchMap(statsArray => {
              const cohortsWithStats: Cohort[] = cohorts.map((cohort, index) => {
                const stats = statsArray[index] as any;
                return {
                  id: cohort.id,
                  name: cohort.name,
                  description: cohort.description,
                  type: cohort.type,
                  stats: {
                    companyCount: stats?.companies_count || 0,
                    activeCompanies: stats?.active_companies || 0,
                    completedCompanies: stats?.completed_companies || 0
                  }
                };
              });
              return [cohortsWithStats];
            })
          );
        }),
        catchError(error => {
          this.error.set(error.message || 'Failed to load cohorts');
          this.isLoading.set(false);
          return EMPTY;
        })
      )
      .subscribe(cohorts => {
        this.cohorts.set(cohorts);
        this.isLoading.set(false);
      });
  }

  loadCompaniesInCohort(cohortId: number): void {
    this.isLoadingCompanies.set(true);
    this.companiesError.set(null);

    this.categoryService.listCompaniesInCohortDetailed(cohortId)
      .pipe(
        catchError(error => {
          this.companiesError.set(error.message || 'Failed to load companies');
          this.isLoadingCompanies.set(false);
          return EMPTY;
        })
      )
      .subscribe(companies => {
        this.companies.set(companies);
        this.isLoadingCompanies.set(false);
      });
  }

  navigateToClients(): void {
    this.router.navigate(['/admin/clients']);
  }

  navigateToPrograms(): void {
    this.router.navigate(['/admin/clients', this.clientId, 'programs']);
  }

  selectCohort(cohort: Cohort): void {
    this.selectedCohort.set(cohort);
    this.loadCompaniesInCohort(cohort.id);
  }

  backToCohorts(): void {
    this.selectedCohort.set(null);
    this.companies.set([]);
    this.companiesError.set(null);
  }

  navigateToCompany(company: ICompany): void {
    const info = this.breadcrumbInfo();
    const cohort = this.selectedCohort();
    if (!info || !cohort) return;

    // Navigate to company detail with full context
    this.router.navigate(['/companies', company.id], {
      queryParams: {
        clientId: info.clientId,
        clientName: info.clientName,
        programId: info.programId,
        programName: info.programName,
        cohortId: cohort.id,
        cohortName: cohort.name
      }
    });
  }

  removeCompanyFromCohort(company: ICompany): void {
    const cohort = this.selectedCohort();
    if (!cohort || !confirm(`Remove ${company.name} from ${cohort.name}?`)) return;

    this.categoryService.detachCompany(cohort.id, company.id)
      .pipe(
        catchError(error => {
          console.error('Failed to remove company:', error);
          return EMPTY;
        })
      )
      .subscribe(() => {
        this.loadCompaniesInCohort(cohort.id); // Refresh companies list
      });
  }

  // Company modal methods
  openCompanyModal(): void {
    this.showCompanyModal.set(true);
  }

  closeCompanyModal(): void {
    this.showCompanyModal.set(false);
  }

  onCompaniesChanged(): void {
    // Reload companies when companies are added/removed
    if (this.selectedCohort()) {
      this.loadCompaniesInCohort(this.selectedCohort()!.id);
    }
    this.closeCompanyModal();
  }

  // Search methods
  onSearchChange(query: string): void {
    this.searchQuery.set(query);
  }

  // Sorting methods
  onSortChange(sortBy: 'name' | 'location' | 'turnover' | 'compliance'): void {
    this.sortBy.set(sortBy);
  }

  toggleSortDirection(): void {
    this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
  }

  navigateToCompanies(cohort: Cohort): void {
    // This method is now replaced by selectCohort
    this.selectCohort(cohort);
  }

  openCreateModal(): void {
    this.createForm = { name: '', description: '' };
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.isCreating.set(false);
  }

  createCohort(): void {
    if (!this.createForm.name.trim() || !this.programId) return;

    this.isCreating.set(true);

    this.categoryService.addCategory({
      name: this.createForm.name.trim(),
      description: this.createForm.description.trim() || undefined,
      type: 'cohort',
      parent_id: this.programId
    }).pipe(
      catchError(error => {
        console.error('Failed to create cohort:', error);
        this.isCreating.set(false);
        return EMPTY;
      })
    ).subscribe(() => {
      this.isCreating.set(false);
      this.closeCreateModal();
      this.loadCohorts(); // Refresh the list
    });
  }
}
