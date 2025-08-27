import { Component, inject, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CategoryService } from '../../../services/category.service';
import { CompanyService } from '../../../services/company.service';
import { ICategory, ICompany } from '../../../models/simple.schema';
import { BreadcrumbItem } from '../grouping/types';
import { catchError, EMPTY, forkJoin, switchMap } from 'rxjs';

interface CategoryWithStats extends ICategory {
  stats?: {
    programs_count?: number;
    cohorts_count?: number;
    companies_count?: number;
  };
}

interface OverviewState {
  currentCategoryId: number | null;
  breadcrumb: BreadcrumbItem[];
}

@Component({
  selector: 'app-overview-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-7xl mx-auto px-6 py-8">
        <!-- Header with Breadcrumb -->
        <div class="mb-8">
          <div class="flex items-center space-x-2 text-sm text-gray-600 mb-4">
            <button
              (click)="navigateToRoot()"
              class="hover:text-blue-600 transition-colors"
              [class.text-blue-600]="currentLevel() === 'root'"
            >
              Overview
            </button>
            @for (crumb of breadcrumb(); track crumb.id; let isLast = $last) {
              <span class="text-gray-400">›</span>
              @if (isLast) {
                <span class="text-gray-900 font-medium">{{ crumb.name }}</span>
              } @else {
                <button
                  (click)="navigateToCategory(crumb.id)"
                  class="hover:text-blue-600 transition-colors"
                >
                  {{ crumb.name }}
                </button>
              }
            }
          </div>

          <h1 class="text-3xl font-bold text-gray-900">
            @if (currentLevel() === 'root') {
              Clients Overview
            } @else if (currentLevel() === 'client') {
              {{ getCurrentCategoryName() }} Programs
            } @else if (currentLevel() === 'program') {
              {{ getCurrentCategoryName() }} Cohorts
            } @else if (currentLevel() === 'cohort') {
              {{ getCurrentCategoryName() }} Companies
            }
          </h1>

          <p class="text-gray-600 mt-1">
            @if (currentLevel() === 'root') {
              Manage your client portfolio and drill down into programs and cohorts.
            } @else if (currentLevel() === 'client') {
              Programs under this client. Click to view cohorts or create new programs.
            } @else if (currentLevel() === 'program') {
              Cohorts under this program. Click to manage companies or create new cohorts.
            } @else if (currentLevel() === 'cohort') {
              Companies assigned to this cohort. Add or remove company assignments.
            }
          </p>
        </div>

        <!-- Action Bar -->
        <div class="mb-8 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div class="flex items-center space-x-4">
            @if (currentLevel() === 'root') {
              <button
                (click)="openCreateModal('client')"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <span class="flex items-center space-x-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                  </svg>
                  <span>Add Client</span>
                </span>
              </button>
            } @else if (currentLevel() === 'client') {
              <button
                (click)="openCreateModal('program')"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <span class="flex items-center space-x-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                  </svg>
                  <span>Add Program</span>
                </span>
              </button>
            } @else if (currentLevel() === 'program') {
              <button
                (click)="openCreateModal('cohort')"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <span class="flex items-center space-x-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                  </svg>
                  <span>Add Cohort</span>
                </span>
              </button>
            } @else if (currentLevel() === 'cohort') {
              <button
                (click)="openCompanyModal()"
                class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <span class="flex items-center space-x-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                  </svg>
                  <span>Add Companies</span>
                </span>
              </button>
            }
          </div>

          <!-- Search -->
          @if (currentItems().length > 5) {
            <div class="w-full sm:w-auto">
              <input
                type="search"
                [(ngModel)]="searchQuery"
                placeholder="Search..."
                class="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
            </div>
          }
        </div>

        <!-- Main Content -->
        <div class="space-y-6">
          <!-- Loading State -->
          @if (isLoading()) {
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              @for (_ of [1,2,3,4,5,6]; track $index) {
                <div class="bg-white rounded-2xl border shadow-sm p-6 animate-pulse">
                  <div class="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div class="space-y-2">
                    <div class="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div class="h-4 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              }
            </div>
          }

          <!-- Error State -->
          @if (error()) {
            <div class="bg-white rounded-2xl border shadow-sm p-8 text-center">
              <div class="text-red-500 text-4xl mb-4">⚠️</div>
              <div class="text-red-800 font-medium mb-2">Failed to load data</div>
              <div class="text-red-600 text-sm mb-4">{{ error() }}</div>
              <button
                (click)="loadCurrentLevel()"
                class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          }

          <!-- Content Grid -->
          @if (!isLoading() && !error()) {
            <!-- Empty State -->
            @if (filteredItems().length === 0) {
              <div class="bg-white rounded-2xl border shadow-sm p-16 text-center">
                <div class="text-gray-400 text-6xl mb-6">
                  @if (currentLevel() === 'root') {
                    🏢
                  } @else if (currentLevel() === 'client') {
                    📋
                  } @else if (currentLevel() === 'program') {
                    👥
                  } @else if (currentLevel() === 'cohort') {
                    🏛️
                  }
                </div>
                <h3 class="text-xl font-medium text-gray-900 mb-4">
                  @if (currentLevel() === 'root') {
                    No clients yet
                  } @else if (currentLevel() === 'client') {
                    No programs yet
                  } @else if (currentLevel() === 'program') {
                    No cohorts yet
                  } @else if (currentLevel() === 'cohort') {
                    No companies assigned
                  }
                </h3>
                <p class="text-gray-600 mb-8">
                  @if (currentLevel() === 'root') {
                    Get started by creating your first client to organize your programs and cohorts.
                  } @else if (currentLevel() === 'client') {
                    Create your first program under this client to start organizing cohorts.
                  } @else if (currentLevel() === 'program') {
                    Create your first cohort under this program to start assigning companies.
                  } @else if (currentLevel() === 'cohort') {
                    Add companies to this cohort to start managing their participation.
                  }
                </p>
                <button
                  (click)="openCreateModal(getNextLevelType())"
                  class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  @if (currentLevel() === 'root') {
                    Create First Client
                  } @else if (currentLevel() === 'client') {
                    Create First Program
                  } @else if (currentLevel() === 'program') {
                    Create First Cohort
                  } @else if (currentLevel() === 'cohort') {
                    Add First Company
                  }
                </button>
              </div>
            }

            <!-- Items Grid -->
            @if (filteredItems().length > 0) {
              @if (currentLevel() === 'cohort') {
                <!-- Companies List -->
                <div class="bg-white rounded-2xl border shadow-sm">
                  <div class="p-6 border-b border-gray-200">
                    <h3 class="text-lg font-semibold text-gray-900">Assigned Companies</h3>
                  </div>
                  <div class="p-6">
                    <div class="space-y-3">
                      @for (item of filteredItems(); track item.id) {
                        @if (isCompany(item)) {
                          <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                            <div class="flex-1 min-w-0">
                              <div class="text-sm font-medium text-gray-900 truncate">
                                {{ item.name }}
                              </div>
                              @if (item.email_address) {
                                <div class="text-sm text-gray-500 truncate">
                                  {{ item.email_address }}
                                </div>
                              }
                              @if (item.registration_no) {
                                <div class="text-xs text-gray-400">
                                  Reg: {{ item.registration_no }}
                                </div>
                              }
                            </div>
                            <button
                              (click)="removeCompanyFromCohort(item)"
                              [disabled]="isRemoving() === item.id"
                              class="ml-4 p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove from cohort"
                            >
                              @if (isRemoving() === item.id) {
                                <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              } @else {
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                </svg>
                              }
                            </button>
                          </div>
                        }
                      }
                    </div>
                  </div>
                </div>
              } @else {
                <!-- Category Cards Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  @for (item of filteredItems(); track item.id) {
                    @if (isCategory(item)) {
                      <div class="bg-white rounded-2xl border shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                           (click)="navigateToCategory(item.id)">
                        <div class="p-6">
                          <div class="flex items-start justify-between mb-4">
                            <div class="flex-1 min-w-0">
                              <h3 class="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                                {{ item.name }}
                              </h3>
                              @if (item.description) {
                                <p class="text-sm text-gray-600 mt-1 line-clamp-2">
                                  {{ item.description }}
                                </p>
                              }
                            </div>
                            <svg class="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors ml-2 flex-shrink-0"
                                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                            </svg>
                          </div>

                          <!-- Statistics -->
                          @if (item.stats) {
                            <div class="flex items-center space-x-4 text-sm text-gray-500">
                              @if (item.stats.programs_count !== undefined) {
                                <div class="flex items-center space-x-1">
                                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                                  </svg>
                                  <span>{{ item.stats.programs_count }} programs</span>
                                </div>
                              }
                              @if (item.stats.cohorts_count !== undefined) {
                                <div class="flex items-center space-x-1">
                                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                  </svg>
                                  <span>{{ item.stats.cohorts_count }} cohorts</span>
                                </div>
                              }
                              @if (item.stats.companies_count !== undefined) {
                                <div class="flex items-center space-x-1">
                                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                                  </svg>
                                  <span>{{ item.stats.companies_count }} companies</span>
                                </div>
                              }
                            </div>
                          }
                        </div>
                      </div>
                    }
                  }
                </div>
              }
            }
          }
        </div>

        <!-- Create Modal -->
        @if (showCreateModal()) {
          <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div class="bg-white rounded-2xl shadow-xl w-full max-w-md">
              <div class="p-6 border-b border-gray-200">
                <h3 class="text-lg font-semibold text-gray-900">
                  Create {{ createModalType() | titlecase }}
                </h3>
              </div>
              <div class="p-6 space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    [(ngModel)]="createForm.name"
                    placeholder="Enter name..."
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                  <textarea
                    [(ngModel)]="createForm.description"
                    placeholder="Enter description..."
                    rows="3"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  ></textarea>
                </div>
              </div>
              <div class="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  (click)="closeCreateModal()"
                  class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  (click)="createCategory()"
                  [disabled]="!createForm.name || isCreating()"
                  class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  @if (isCreating()) {
                    <span class="flex items-center">
                      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </span>
                  } @else {
                    Create {{ createModalType() | titlecase }}
                  }
                </button>
              </div>
            </div>
          </div>
        }

        <!-- Company Assignment Modal -->
        @if (showCompanyModal()) {
          <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div class="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
              <div class="p-6 border-b border-gray-200">
                <h3 class="text-lg font-semibold text-gray-900">Add Companies to Cohort</h3>
                <p class="text-sm text-gray-600 mt-1">Select companies to assign to this cohort</p>
              </div>
              <div class="p-6 flex-1 overflow-hidden">
                <!-- Search -->
                <div class="mb-4">
                  <input
                    type="search"
                    [(ngModel)]="companySearchQuery"
                    placeholder="Search companies..."
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                </div>

                <!-- Company List -->
                <div class="space-y-2 max-h-96 overflow-y-auto">
                  @if (isLoadingAvailableCompanies()) {
                    <div class="space-y-2">
                      @for (_ of [1,2,3,4,5]; track $index) {
                        <div class="animate-pulse h-12 bg-gray-200 rounded-lg"></div>
                      }
                    </div>
                  } @else {
                    @for (company of filteredAvailableCompanies(); track company.id) {
                      <label class="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          [value]="company.id"
                          (change)="toggleCompanySelection(company.id, $event)"
                          class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        >
                        <div class="ml-3 flex-1 min-w-0">
                          <div class="text-sm font-medium text-gray-900">{{ company.name }}</div>
                          @if (company.email_address) {
                            <div class="text-sm text-gray-500">{{ company.email_address }}</div>
                          }
                        </div>
                      </label>
                    }
                  }
                </div>
              </div>
              <div class="p-6 border-t border-gray-200 flex justify-between items-center">
                <div class="text-sm text-gray-600">
                  {{ selectedCompanyIds().length }} companies selected
                </div>
                <div class="flex space-x-3">
                  <button
                    (click)="closeCompanyModal()"
                    class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    (click)="addSelectedCompaniesToCohort()"
                    [disabled]="selectedCompanyIds().length === 0 || isAddingCompanies()"
                    class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    @if (isAddingCompanies()) {
                      <span class="flex items-center">
                        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Adding...
                      </span>
                    } @else {
                      Add Companies
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class OverviewPageComponent implements OnInit {
  private categoryService = inject(CategoryService);
  private companyService = inject(CompanyService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Storage key
  private readonly storageKey = 'overview_state_v2';

  // Navigation state
  currentCategoryId = signal<number | null>(null);
  breadcrumb = signal<BreadcrumbItem[]>([]);

  // Current level items (categories or companies)
  currentItems = signal<(CategoryWithStats | ICompany)[]>([]);
  filteredItems = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const items = this.currentItems();

    if (!query) return items;

    return items.filter(item =>
      item.name.toLowerCase().includes(query) ||
      (this.isCompany(item) && item.email_address?.toLowerCase().includes(query)) ||
      (this.isCompany(item) && item.registration_no?.toLowerCase().includes(query))
    );
  });

  // Loading and error states
  isLoading = signal(false);
  error = signal<string | null>(null);

  // Search
  searchQuery = signal('');

  // Computed level
  currentLevel = computed(() => {
    const breadcrumbLength = this.breadcrumb().length;
    if (breadcrumbLength === 0) return 'root';
    if (breadcrumbLength === 1) return 'client';
    if (breadcrumbLength === 2) return 'program';
    if (breadcrumbLength === 3) return 'cohort';
    return 'unknown';
  });

  // Create modal state
  showCreateModal = signal(false);
  createModalType = signal<'client' | 'program' | 'cohort'>('client');
  createForm = {
    name: '',
    description: ''
  };
  isCreating = signal(false);

  // Company modal state
  showCompanyModal = signal(false);
  availableCompanies = signal<ICompany[]>([]);
  selectedCompanyIds = signal<number[]>([]);
  companySearchQuery = signal('');
  isLoadingAvailableCompanies = signal(false);
  isAddingCompanies = signal(false);

  // Remove company state
  isRemoving = signal<number | null>(null);

  // Computed for company modal
  filteredAvailableCompanies = computed(() => {
    const query = this.companySearchQuery().toLowerCase().trim();
    const companies = this.availableCompanies();

    if (!query) return companies;

    return companies.filter(company =>
      company.name.toLowerCase().includes(query) ||
      company.email_address?.toLowerCase().includes(query) ||
      company.registration_no?.toLowerCase().includes(query)
    );
  });

  ngOnInit(): void {
    this.loadFromStorage();
    this.loadFromQueryParams();
    this.loadCurrentLevel();
  }

  // Type guards
  isCompany(item: CategoryWithStats | ICompany): item is ICompany {
    return 'email_address' in item;
  }

  isCategory(item: CategoryWithStats | ICompany): item is CategoryWithStats {
    return 'type' in item;
  }

  // Navigation methods
  navigateToRoot(): void {
    this.currentCategoryId.set(null);
    this.breadcrumb.set([]);
    this.loadCurrentLevel();
    this.saveToStorage();
    this.updateQueryParams();
  }

  navigateToCategory(categoryId: number): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.categoryService.breadcrumb(categoryId)
      .pipe(
        catchError(error => {
          console.error('Failed to load breadcrumb:', error);
          this.error.set(error.message || 'Failed to load breadcrumb');
          this.isLoading.set(false);
          return EMPTY;
        })
      )
      .subscribe(breadcrumbItems => {
        this.currentCategoryId.set(categoryId);
        this.breadcrumb.set(breadcrumbItems);
        this.loadCurrentLevel();
        this.saveToStorage();
        this.updateQueryParams();
      });
  }

  getCurrentCategoryName(): string {
    const breadcrumb = this.breadcrumb();
    return breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1].name : '';
  }

  getNextLevelType(): 'client' | 'program' | 'cohort' {
    const level = this.currentLevel();
    if (level === 'root') return 'client';
    if (level === 'client') return 'program';
    if (level === 'program') return 'cohort';
    return 'cohort';
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
              catchError(error => {
                console.warn('Failed to load stats for client', client.id, error);
                return [{}]; // Return empty stats on error
              })
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
          console.error('Failed to load clients:', error);
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

          // Load statistics for each program
          const statsRequests = programs.map(program =>
            this.categoryService.getCategoryStatistics(program.id).pipe(
              catchError(error => {
                console.warn('Failed to load stats for program', program.id, error);
                return [{}]; // Return empty stats on error
              })
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
          console.error('Failed to load programs:', error);
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

          // Load statistics for each cohort
          const statsRequests = cohorts.map(cohort =>
            this.categoryService.getCategoryStatistics(cohort.id).pipe(
              catchError(error => {
                console.warn('Failed to load stats for cohort', cohort.id, error);
                return [{}]; // Return empty stats on error
              })
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
          console.error('Failed to load cohorts:', error);
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
          console.error('Failed to load companies in cohort:', error);
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

  // Create modal methods
  openCreateModal(type: 'client' | 'program' | 'cohort'): void {
    this.createModalType.set(type);
    this.createForm.name = '';
    this.createForm.description = '';
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.isCreating.set(false);
  }

  createCategory(): void {
    const type = this.createModalType();
    const name = this.createForm.name.trim();
    const description = this.createForm.description.trim() || undefined;

    if (!name) return;

    this.isCreating.set(true);

    let createObservable;

    if (type === 'client') {
      createObservable = this.categoryService.ensureClient(name, description);
    } else if (type === 'program') {
      const clientId = this.currentCategoryId()!;
      createObservable = this.categoryService.ensureProgram(clientId, name, description);
    } else if (type === 'cohort') {
      const programId = this.currentCategoryId()!;
      createObservable = this.categoryService.ensureCohort(programId, name, description);
    } else {
      this.isCreating.set(false);
      return;
    }

    createObservable
      .pipe(
        catchError(error => {
          console.error('Failed to create category:', error);
          this.isCreating.set(false);
          return EMPTY;
        })
      )
      .subscribe(() => {
        this.isCreating.set(false);
        this.closeCreateModal();
        this.loadCurrentLevel(); // Refresh the current level
      });
  }

  // Company modal methods
  openCompanyModal(): void {
    this.showCompanyModal.set(true);
    this.selectedCompanyIds.set([]);
    this.companySearchQuery.set('');
    this.loadAvailableCompanies();
  }

  closeCompanyModal(): void {
    this.showCompanyModal.set(false);
    this.isAddingCompanies.set(false);
  }

  loadAvailableCompanies(): void {
    this.isLoadingAvailableCompanies.set(true);

    this.companyService.listCompanies(1000, 0) // Load many companies
      .pipe(
        catchError(error => {
          console.error('Failed to load available companies:', error);
          this.isLoadingAvailableCompanies.set(false);
          return EMPTY;
        })
      )
      .subscribe(companies => {
        this.availableCompanies.set(companies);
        this.isLoadingAvailableCompanies.set(false);
      });
  }

  toggleCompanySelection(companyId: number, event: any): void {
    const isChecked = event.target.checked;
    const currentSelections = this.selectedCompanyIds();

    if (isChecked) {
      this.selectedCompanyIds.set([...currentSelections, companyId]);
    } else {
      this.selectedCompanyIds.set(currentSelections.filter(id => id !== companyId));
    }
  }

  addSelectedCompaniesToCohort(): void {
    const cohortId = this.currentCategoryId()!;
    const companyIds = this.selectedCompanyIds();

    if (companyIds.length === 0) return;

    this.isAddingCompanies.set(true);

    // Attach each company to the cohort
    const attachRequests = companyIds.map(companyId =>
      this.categoryService.attachCompany(cohortId, companyId).pipe(
        catchError(error => {
          console.error('Failed to attach company', companyId, error);
          return EMPTY;
        })
      )
    );

    forkJoin(attachRequests)
      .subscribe(() => {
        this.isAddingCompanies.set(false);
        this.closeCompanyModal();
        this.loadCurrentLevel(); // Refresh the companies list
      });
  }

  removeCompanyFromCohort(company: ICompany): void {
    const cohortId = this.currentCategoryId()!;

    this.isRemoving.set(company.id);

    this.categoryService.detachCompany(cohortId, company.id)
      .pipe(
        catchError(error => {
          console.error('Failed to remove company from cohort:', error);
          this.isRemoving.set(null);
          return EMPTY;
        })
      )
      .subscribe(() => {
        this.isRemoving.set(null);
        this.loadCurrentLevel(); // Refresh the companies list
      });
  }

  // State persistence
  private saveToStorage(): void {
    try {
      const state: OverviewState = {
        currentCategoryId: this.currentCategoryId(),
        breadcrumb: this.breadcrumb()
      };
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save overview state to storage:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const state: OverviewState = JSON.parse(stored);
        this.currentCategoryId.set(state.currentCategoryId);
        this.breadcrumb.set(state.breadcrumb || []);
      }
    } catch (error) {
      console.warn('Failed to load overview state from storage:', error);
    }
  }

  private loadFromQueryParams(): void {
    this.route.queryParams.subscribe(params => {
      if (params['categoryId']) {
        const categoryId = +params['categoryId'];
        if (categoryId !== this.currentCategoryId()) {
          this.navigateToCategory(categoryId);
        }
      }
    });
  }

  private updateQueryParams(): void {
    const queryParams: any = {};

    if (this.currentCategoryId()) {
      queryParams.categoryId = this.currentCategoryId();
    }

    this.router.navigate([], {
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }
}
