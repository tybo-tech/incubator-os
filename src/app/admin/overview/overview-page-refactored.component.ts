import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { CategoryService } from '../../../services/category.service';
import { CategoryCompanyPickerComponent } from '../../components/category-company-picker/category-company-picker.component';
import { catchError, EMPTY, forkJoin, switchMap } from 'rxjs';

// Import our new smart components
import {
  OverviewBreadcrumbComponent,
  OverviewHeaderComponent,
  OverviewGridComponent,
  CreateCategoryModalComponent,
  type BreadcrumbItem,
  type CurrentLevel,
  type CreateModalType,
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
export class OverviewPageRefactoredComponent implements OnInit {
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

  ngOnInit(): void {
    this.loadFromStorage();
    this.loadFromQueryParams();
    this.loadCurrentLevel();
  }

  // Navigation methods
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

  onCompanyClick(company: CompanyItem): void {
    // Navigate to company detail page
    this.router.navigate(['/companies', company.id]);
  }

  onRemoveCompany(company: CompanyItem): void {
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

    this.isLoading.set(true);
    this.error.set(null);

    if (level === 'root') {
      this.loadClients();
    } else if (level === 'client') {
      this.loadPrograms(categoryId!);
    } else if (level === 'program') {
      this.loadCohorts(categoryId!);
    } else if (level === 'cohort') {
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
              const clientsWithStats: CategoryWithStats[] = clients.map((client, index) => ({
                ...client,
                stats: statsArray[index]
              }));
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
              const programsWithStats: CategoryWithStats[] = programs.map((program, index) => ({
                ...program,
                stats: statsArray[index]
              }));
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
              const cohortsWithStats: CategoryWithStats[] = cohorts.map((cohort, index) => ({
                ...cohort,
                stats: statsArray[index]
              }));
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
    this.categoryService.listCompaniesInCohort(cohortId)
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
  }

  private loadFromStorage(): void {
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

  private loadFromQueryParams(): void {
    // Could add query param support here if needed
  }
}
