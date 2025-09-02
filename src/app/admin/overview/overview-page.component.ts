import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { CategoryService } from '../../../services/category.service';
import { CategoryCompanyPickerComponent } from '../../components/category-company-picker/category-company-picker.component';
import { catchError, EMPTY, forkJoin, switchMap, firstValueFrom } from 'rxjs';
import { ICompany } from '../../../models/simple.schema';

// Import our new smart components
import {
  OverviewBreadcrumbComponent,
  OverviewHeaderComponent,
  OverviewGridComponent,
  CreateCategoryModalComponent,
  type BreadcrumbItem,
  type CurrentLevel,
  type CreateModalType,
  type OverviewStats,
  type CategoryWithStats,
  type CompanyItem,
  type CreateCategoryForm
} from './components';

interface OverviewState {
  currentCategoryId: number | null;
  breadcrumb: BreadcrumbItem[];
}

@Component({
  selector: 'app-overview-page',
  standalone: true,
  imports: [
    CommonModule,
    OverviewBreadcrumbComponent,
    OverviewHeaderComponent,
    OverviewGridComponent,
    CreateCategoryModalComponent,
    CategoryCompanyPickerComponent
  ],
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-7xl mx-auto px-6 py-8">
        <!-- Header with Breadcrumb -->
        <div class="mb-8">
          <app-overview-breadcrumb
            [breadcrumb]="breadcrumb()"
            [isRoot]="currentLevel() === 'root'"
            (navigateToRoot)="navigateToRoot()"
            (navigateToCategory)="navigateToCategory($event)"
          ></app-overview-breadcrumb>

          <app-overview-header
            [currentLevel]="currentLevel()"
            [showSearch]="currentItems().length > 5"
            [searchQuery]="searchQuery()"
            [stats]="currentLevelStats()"
            (createCategory)="openCreateModal($event)"
            (openCompanyModal)="openCompanyModal()"
            (searchChange)="onSearchChange($event)"
          ></app-overview-header>
        </div>

        <!-- Main Content -->
        <app-overview-grid
          [items]="filteredItems()"
          [currentLevel]="currentLevel()"
          [isLoading]="isLoading()"
          [error]="error()"
          (categoryClick)="onCategoryClick($event)"
          (companyClick)="onCompanyClick($event)"
          (removeCompany)="onRemoveCompany($event)"
          (retryClick)="loadCurrentLevel()"
          (createFirstClick)="handleCreateFirst()"
        ></app-overview-grid>

        <!-- Create Category Modal -->
        <app-create-category-modal
          [show]="showCreateModal()"
          [modalType]="createModalType()"
          [isCreating]="isCreating()"
          [formData]="createForm"
          (submit)="submitCreate($event)"
          (cancel)="closeCreateModal()"
        ></app-create-category-modal>

        <!-- Company Assignment Modal -->
        @if (showCompanyModal()) {
          <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <app-category-company-picker
              [cohortId]="currentCategoryId()!"
              [programId]="getProgramId()"
              [clientId]="getClientId()"
              (close)="closeCompanyModal()"
              (companiesChanged)="onCompaniesChanged()"
            ></app-category-company-picker>
          </div>
        }
      </div>
    </div>
  `
})
export class OverviewPageComponent implements OnInit {
  private categoryService = inject(CategoryService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Core state
  private storageKey = 'overview-state';
  currentCategoryId = signal<number | null>(null);
  breadcrumb = signal<BreadcrumbItem[]>([]);
  currentItems = signal<(CategoryWithStats | CompanyItem)[]>([]);

  // UI state
  isLoading = signal(false);
  error = signal<string | null>(null);
  searchQuery = signal('');

  // Modal state
  showCreateModal = signal(false);
  createModalType = signal<CreateModalType>('client');
  isCreating = signal(false);
  showCompanyModal = signal(false);
  isRemoving = signal<number | null>(null);

  // Form data
  createForm: CreateCategoryForm = {
    name: '',
    description: ''
  };

  // Computed properties
  currentLevel = computed((): CurrentLevel => {
    const breadcrumbLength = this.breadcrumb().length;
    if (breadcrumbLength === 0) return 'root';
    if (breadcrumbLength === 1) return 'client';
    if (breadcrumbLength === 2) return 'program';
    if (breadcrumbLength === 3) return 'cohort';
    return 'root';
  });

  filteredItems = computed(() => {
    const items = this.currentItems();
    const query = this.searchQuery().toLowerCase().trim();

    if (!query) return items;

    return items.filter(item =>
      item.name.toLowerCase().includes(query) ||
      ('description' in item && item.description?.toLowerCase().includes(query)) ||
      ('email_address' in item && item.email_address?.toLowerCase().includes(query)) ||
      ('contact_person' in item && item.contact_person?.toLowerCase().includes(query))
    );
  });

  // Current level statistics
  currentLevelStats = computed((): OverviewStats | undefined => {
    const items = this.currentItems();
    const level = this.currentLevel();

    if (items.length === 0) return undefined;

    if (level === 'cohort') {
      // For companies, calculate active/completed status
      const companies = items as CompanyItem[];
      const activeCount = companies.filter(c => c.status === 'active' || !c.status).length;
      const completedCount = companies.filter(c => c.status === 'completed').length;

      return {
        totalItems: items.length,
        activeItems: activeCount,
        completedItems: completedCount
      };
    }

    return {
      totalItems: items.length
    };
  });

  // Flag to prevent navigation loops
  private isNavigatingFromUrl = false;

  ngOnInit(): void {
    // Check URL parameters first (they should take precedence)
    const params = this.route.snapshot.queryParams;
    console.log('🚀 ngOnInit - Query params:', params);

    if (params['clientId'] || params['programId'] || params['cohortId']) {
      console.log('📍 Loading from URL parameters:', {
        clientId: params['clientId'],
        programId: params['programId'],
        cohortId: params['cohortId']
      });
      this.isNavigatingFromUrl = true;
      // Don't call loadCurrentLevel() here - let loadFromUrlParams handle it
      this.loadFromUrlParams(params);
    } else {
      console.log('💾 Loading from sessionStorage');
      // Only load from storage if no URL parameters are present
      this.loadFromStorage();
      // Call loadCurrentLevel() here since loadFromStorage() is synchronous
      this.loadCurrentLevel();
    }

    // Listen to route changes for back/forward navigation
    this.route.queryParams.subscribe(params => {
      console.log('🔄 Route params changed:', params);
      if ((params['clientId'] || params['programId'] || params['cohortId']) && !this.isNavigatingFromUrl) {
        console.log('🔄 Loading from URL parameter change:', params);
        this.isNavigatingFromUrl = true;
        this.loadFromUrlParams(params);
      }
    });
  }  // Navigation methods
  navigateToRoot(): void {
    this.currentCategoryId.set(null);
    this.breadcrumb.set([]);
    this.saveToStorage();
    this.loadCurrentLevel();
  }

  navigateToCategory(categoryId: number): void {
    const current = this.breadcrumb();
    const targetIndex = current.findIndex(item => item.id === categoryId);

    if (targetIndex !== -1) {
      // Navigate to existing breadcrumb level
      this.breadcrumb.set(current.slice(0, targetIndex + 1));
      this.currentCategoryId.set(categoryId);
    } else {
      // This shouldn't happen in normal navigation
      console.warn('Invalid category navigation:', categoryId);
    }

    this.saveToStorage();
    this.loadCurrentLevel();
  }

  onCategoryClick(category: CategoryWithStats): void {
    const newBreadcrumb = [...this.breadcrumb(), {
      id: category.id,
      name: category.name,
      type: category.type
    }];

    this.breadcrumb.set(newBreadcrumb);
    this.currentCategoryId.set(category.id);
    this.saveToStorage();
    this.loadCurrentLevel();
  }

  onCompanyClick(company: ICompany): void {
    // Build query parameters to maintain context
    const queryParams: any = {};
    const breadcrumb = this.breadcrumb();

    if (breadcrumb.length >= 1 && breadcrumb[0].type === 'client') {
      queryParams.clientId = breadcrumb[0].id;
      queryParams.clientName = breadcrumb[0].name;
    }

    if (breadcrumb.length >= 2 && breadcrumb[1].type === 'program') {
      queryParams.programId = breadcrumb[1].id;
      queryParams.programName = breadcrumb[1].name;
    }

    if (breadcrumb.length >= 3 && breadcrumb[2].type === 'cohort') {
      queryParams.cohortId = breadcrumb[2].id;
      queryParams.cohortName = breadcrumb[2].name;
    }

    // Navigate to company detail page with context
    this.router.navigate(['/companies', company.id], { queryParams });
  }

  onRemoveCompany(company: ICompany): void {
    if (!confirm(`Remove ${company.name} from this cohort?`)) return;

    const cohortId = this.currentCategoryId();
    if (!cohortId) return;

    this.isRemoving.set(company.id);

    this.categoryService.detachCompany(cohortId, company.id).pipe(
      catchError(error => {
        console.error('Failed to remove company:', error);
        this.isRemoving.set(null);
        return EMPTY;
      })
    ).subscribe(() => {
      this.isRemoving.set(null);
      this.loadCurrentLevel(); // Refresh the companies list
    });
  }

  // Search
  onSearchChange(query: string): void {
    this.searchQuery.set(query);
  }

  // Create modal methods
  openCreateModal(type: CreateModalType): void {
    this.createModalType.set(type);
    this.createForm.name = '';
    this.createForm.description = '';
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.isCreating.set(false);
  }

  submitCreate(form: CreateCategoryForm): void {
    const type = this.createModalType();
    const parentId = this.currentCategoryId();

    this.isCreating.set(true);

    this.categoryService.addCategory({
      name: form.name,
      description: form.description,
      type: type,
      parent_id: parentId
    }).pipe(
      catchError(error => {
        console.error('Failed to create category:', error);
        this.isCreating.set(false);
        return EMPTY;
      })
    ).subscribe(() => {
      this.isCreating.set(false);
      this.closeCreateModal();
      this.loadCurrentLevel(); // Refresh the current level
    });
  }

  handleCreateFirst(): void {
    const level = this.currentLevel();
    if (level === 'root') this.openCreateModal('client');
    else if (level === 'client') this.openCreateModal('program');
    else if (level === 'program') this.openCreateModal('cohort');
    else if (level === 'cohort') this.openCompanyModal();
  }

  // Company modal methods
  openCompanyModal(): void {
    this.showCompanyModal.set(true);
  }

  closeCompanyModal(): void {
    this.showCompanyModal.set(false);
  }

  onCompaniesChanged(): void {
    this.loadCurrentLevel(); // Refresh the companies list
  }

  // Helper methods
  getProgramId(): number | undefined {
    const breadcrumbs = this.breadcrumb();
    return breadcrumbs.length >= 2 ? breadcrumbs[1].id : undefined;
  }

  getClientId(): number | undefined {
    const breadcrumbs = this.breadcrumb();
    return breadcrumbs.length >= 1 ? breadcrumbs[0].id : undefined;
  }

  // Data loading methods
  loadCurrentLevel(): void {
    const level = this.currentLevel();
    const categoryId = this.currentCategoryId();
    const breadcrumb = this.breadcrumb();

    console.log('📊 loadCurrentLevel called:', {
      level,
      categoryId,
      breadcrumb: breadcrumb.map(b => ({ id: b.id, name: b.name, type: b.type }))
    });

    this.isLoading.set(true);
    this.error.set(null);

    if (level === 'root') {
      console.log('🏠 Loading clients (root level)');
      this.loadClients();
    } else if (level === 'client') {
      console.log('🏢 Loading programs for client:', categoryId);
      this.loadPrograms(categoryId!);
    } else if (level === 'program') {
      console.log('📚 Loading cohorts for program:', categoryId);
      this.loadCohorts(categoryId!);
    } else if (level === 'cohort') {
      console.log('🏭 Loading companies for cohort:', categoryId);
      this.loadCompaniesInCohort(categoryId!);
    }
  }

  loadClients(): void {
    this.categoryService.listCategories({ type: 'client', depth: 1 })
      .pipe(
        switchMap(clients => {
          if (clients.length === 0) {
            this.currentItems.set([]);
            this.isLoading.set(false);
            return EMPTY;
          }

          // Load statistics for each client
          const statsRequests = clients.map(client =>
            this.categoryService.getCategoryStatistics(client.id).pipe(
              catchError(() => [{}]) // Return empty stats on error
            )
          );

          return forkJoin(statsRequests).pipe(
            switchMap(statsArray => {
              console.log('📊 Client statistics loaded:', statsArray);
              const clientsWithStats: CategoryWithStats[] = clients.map((client, index) => ({
                ...client,
                stats: statsArray[index]
              }));
              console.log('🏢 Clients with enhanced stats:', clientsWithStats);
              return [clientsWithStats];
            })
          );
        }),
        catchError(error => {
          this.error.set(error.message || 'Failed to load clients');
          this.isLoading.set(false);
          return EMPTY;
        })
      )
      .subscribe(clients => {
        this.currentItems.set(clients);
        this.isLoading.set(false);
      });
  }

  loadPrograms(clientId: number): void {
    this.categoryService.listProgramsForClient(clientId)
      .pipe(
        switchMap(programs => {
          if (programs.length === 0) {
            this.currentItems.set([]);
            this.isLoading.set(false);
            return EMPTY;
          }

          const statsRequests = programs.map(program =>
            this.categoryService.getCategoryStatistics(program.id).pipe(
              catchError(() => [{}])
            )
          );

          return forkJoin(statsRequests).pipe(
            switchMap(statsArray => {
              console.log('📊 Program statistics loaded:', statsArray);
              const programsWithStats: CategoryWithStats[] = programs.map((program, index) => ({
                ...program,
                stats: statsArray[index]
              }));
              console.log('📚 Programs with enhanced stats:', programsWithStats);
              return [programsWithStats];
            })
          );
        }),
        catchError(error => {
          this.error.set(error.message || 'Failed to load programs');
          this.isLoading.set(false);
          return EMPTY;
        })
      )
      .subscribe(programs => {
        this.currentItems.set(programs);
        this.isLoading.set(false);
      });
  }

  loadCohorts(programId: number): void {
    this.categoryService.listCohortsForProgram(programId)
      .pipe(
        switchMap(cohorts => {
          if (cohorts.length === 0) {
            this.currentItems.set([]);
            this.isLoading.set(false);
            return EMPTY;
          }

          const statsRequests = cohorts.map(cohort =>
            this.categoryService.getCategoryStatistics(cohort.id).pipe(
              catchError(() => [{}])
            )
          );

          return forkJoin(statsRequests).pipe(
            switchMap(statsArray => {
              console.log('📊 Cohort statistics loaded:', statsArray);
              const cohortsWithStats: CategoryWithStats[] = cohorts.map((cohort, index) => ({
                ...cohort,
                stats: statsArray[index]
              }));
              console.log('👥 Cohorts with enhanced stats:', cohortsWithStats);
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
        this.currentItems.set(cohorts);
        this.isLoading.set(false);
      });
  }

  loadCompaniesInCohort(cohortId: number): void {
    this.categoryService.listCompaniesInCohortDetailed(cohortId)
      .pipe(
        catchError(error => {
          this.error.set(error.message || 'Failed to load companies');
          this.isLoading.set(false);
          return EMPTY;
        })
      )
      .subscribe(companies => {
        this.currentItems.set(companies);
        this.isLoading.set(false);
      });
  }

  // Storage methods
  private saveToStorage(): void {
    const state: OverviewState = {
      currentCategoryId: this.currentCategoryId(),
      breadcrumb: this.breadcrumb()
    };
    sessionStorage.setItem(this.storageKey, JSON.stringify(state));

    // Only update URL if we're not currently navigating from URL to prevent loops
    if (!this.isNavigatingFromUrl) {
      this.updateUrl();
    }
  }  private loadFromStorage(): void {
    try {
      const stored = sessionStorage.getItem(this.storageKey);
      if (stored) {
        const state: OverviewState = JSON.parse(stored);
        this.currentCategoryId.set(state.currentCategoryId);
        this.breadcrumb.set(state.breadcrumb || []);
      }
    } catch (error) {
      console.warn('Failed to load from storage:', error);
    }
  }

  private loadFromUrlParams(params: any): void {
    try {
      console.log('🔍 Parsing URL parameters:', params);

      const clientId = params['clientId'] ? parseInt(params['clientId'], 10) : null;
      const programId = params['programId'] ? parseInt(params['programId'], 10) : null;
      const cohortId = params['cohortId'] ? parseInt(params['cohortId'], 10) : null;

      console.log('📊 Parsed IDs:', { clientId, programId, cohortId });

      // Build breadcrumb based on the deepest level provided
      if (cohortId) {
        // Full path: Client → Program → Cohort
        this.loadBreadcrumbFromIds({ clientId, programId, cohortId });
      } else if (programId) {
        // Partial path: Client → Program
        this.loadBreadcrumbFromIds({ clientId, programId });
      } else if (clientId) {
        // Single level: Client
        this.loadBreadcrumbFromIds({ clientId });
      } else {
        // No valid IDs, go to root
        this.isNavigatingFromUrl = false;
        this.navigateToRoot();
      }
    } catch (error) {
      console.warn('Failed to load from URL parameters:', error);
      this.isNavigatingFromUrl = false;
      this.navigateToRoot();
    }
  }

  private async loadBreadcrumbFromIds(ids: { clientId?: number | null, programId?: number | null, cohortId?: number | null }): Promise<void> {
    try {
      console.log('🏗️ Building breadcrumb from IDs:', ids);

      const breadcrumbItems: BreadcrumbItem[] = [];
      let currentCategoryId: number | null = null;

      // Load client if provided
      if (ids.clientId) {
        try {
          const client = await firstValueFrom(this.categoryService.getCategoryById(ids.clientId));
          if (client) {
            breadcrumbItems.push({
              id: client.id,
              name: client.name,
              type: client.type as any
            });
            currentCategoryId = client.id;
          }
        } catch (error) {
          console.warn(`Failed to load client ${ids.clientId}:`, error);
          this.isNavigatingFromUrl = false;
          this.navigateToRoot();
          return;
        }
      }

      // Load program if provided
      if (ids.programId) {
        try {
          const program = await firstValueFrom(this.categoryService.getCategoryById(ids.programId));
          if (program) {
            breadcrumbItems.push({
              id: program.id,
              name: program.name,
              type: program.type as any
            });
            currentCategoryId = program.id;
          }
        } catch (error) {
          console.warn(`Failed to load program ${ids.programId}:`, error);
          this.isNavigatingFromUrl = false;
          this.navigateToRoot();
          return;
        }
      }

      // Load cohort if provided
      if (ids.cohortId) {
        try {
          const cohort = await firstValueFrom(this.categoryService.getCategoryById(ids.cohortId));
          if (cohort) {
            breadcrumbItems.push({
              id: cohort.id,
              name: cohort.name,
              type: cohort.type as any
            });
            currentCategoryId = cohort.id;
          }
        } catch (error) {
          console.warn(`Failed to load cohort ${ids.cohortId}:`, error);
          this.isNavigatingFromUrl = false;
          this.navigateToRoot();
          return;
        }
      }

      console.log('✅ Built breadcrumb:', breadcrumbItems);

      // Set the state
      this.breadcrumb.set(breadcrumbItems);
      this.currentCategoryId.set(currentCategoryId);

      // Save to storage for consistency
      this.saveToStorage();

      // Reset the navigation flag
      this.isNavigatingFromUrl = false;

      // Now that breadcrumb is built, load the current level data
      console.log('📊 Loading current level data after breadcrumb is ready');
      this.loadCurrentLevel();

    } catch (error) {
      console.warn('Failed to load breadcrumb from IDs:', error);
      this.isNavigatingFromUrl = false;
      this.navigateToRoot();
    }
  }

  private updateUrl(): void {
    const breadcrumb = this.breadcrumb();
    console.log('🔗 Updating URL for breadcrumb:', breadcrumb);

    // Build clean query parameters based on breadcrumb
    const queryParams: any = {};

    if (breadcrumb.length >= 1 && breadcrumb[0].type === 'client') {
      queryParams.clientId = breadcrumb[0].id;
    }

    if (breadcrumb.length >= 2 && breadcrumb[1].type === 'program') {
      queryParams.programId = breadcrumb[1].id;
    }

    if (breadcrumb.length >= 3 && breadcrumb[2].type === 'cohort') {
      queryParams.cohortId = breadcrumb[2].id;
    }

    console.log('🎯 Setting URL params:', queryParams);

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: queryParams,
      queryParamsHandling: 'replace' // Replace all params, don't merge
    });
  }
}
