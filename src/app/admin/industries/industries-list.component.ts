import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IndustryService, IndustryListOptions, CreateIndustryRequest, UpdateIndustryRequest } from '../../../services/industry.service';
import { catchError, EMPTY, switchMap } from 'rxjs';
import { Industry } from '../../../models/simple.schema';
import { CompanyListPopupComponent } from './components/company-list-popup.component';
import { IndustryStatisticsComponent } from './components/industry-statistics.component';
import { ICompany } from '../../../models/simple.schema';

interface IndustryWithStats extends Industry {
  stats: {
    childrenCount: number;
    companyCount: number;
  };
  level?: number; // For visual hierarchy indication
}

@Component({
  selector: 'app-industries-list',
  standalone: true,
  imports: [CommonModule, FormsModule, CompanyListPopupComponent, IndustryStatisticsComponent],
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-7xl mx-auto px-6 py-8">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold text-gray-900">Industries</h1>
              <p class="text-gray-600 mt-2">Manage industry categories and subcategories</p>
            </div>
            <button
              (click)="openCreateModal()"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              Add Industry
            </button>
          </div>

          <!-- Breadcrumb -->
          <div *ngIf="currentParent()" class="mt-4 flex items-center text-sm text-gray-600">
            <button
              (click)="navigateToParent(null)"
              class="hover:text-blue-600 transition-colors">
              All Industries
            </button>
            <svg class="w-4 h-4 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
            <span class="font-medium text-gray-900">{{ currentParent()?.name }}</span>
          </div>

          <!-- Search and Filters -->
          <div *ngIf="industries().length > 5 || searchQuery || statusFilter !== 'all'" class="mt-6">
            <div class="flex flex-wrap gap-4">
              <!-- Search -->
              <div class="flex-1 min-w-64">
                <input
                  type="text"
                  placeholder="Search industries..."
                  [(ngModel)]="searchQuery"
                  (input)="onSearchChange()"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              </div>

              <!-- Status Filter -->
              <select
                [(ngModel)]="statusFilter"
                (ngModelChange)="onFilterChange()"
                class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>

              <!-- Page Size -->
              <select
                #pageSizeSelect
                [value]="pageSize()"
                (change)="onPageSizeChange(+pageSizeSelect.value)"
                class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="10">10 per page</option>
                <option value="20">20 per page</option>
                <option value="50">50 per page</option>
                <option value="100">100 per page</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Industry Statistics Dashboard -->
        <app-industry-statistics></app-industry-statistics>

        <!-- Loading State -->
        <div *ngIf="isLoading()" class="flex justify-center items-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span class="ml-3 text-gray-600">Loading industries...</span>
        </div>

        <!-- Error State -->
        <div *ngIf="error()" class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div class="text-red-600 text-lg font-medium mb-2">Failed to load industries</div>
          <p class="text-red-500 mb-4">{{ error() }}</p>
          <button
            (click)="loadIndustries()"
            class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
            Try Again
          </button>
        </div>

        <!-- Empty State -->
        <div *ngIf="!isLoading() && !error() && filteredIndustries().length === 0"
             class="text-center py-12">
          <div class="text-gray-400 text-6xl mb-4">🏭</div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">
            {{ industries().length === 0 ? 'No industries yet' : 'No industries found' }}
          </h3>
          <p class="text-gray-500 mb-6">
            {{ industries().length === 0 ? 'Get started by creating your first industry category.' : 'Try adjusting your search criteria.' }}
          </p>
          <button
            *ngIf="industries().length === 0"
            (click)="openCreateModal()"
            class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Create First Industry
          </button>
        </div>

        <!-- Industries List -->
        <div *ngIf="!isLoading() && !error() && filteredIndustries().length > 0" class="space-y-4">
          <div *ngFor="let industry of filteredIndustries()"
               class="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div class="p-6">
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <div class="flex items-center">
                    <!-- Hierarchy Level Indicator -->
                    <div *ngIf="industry.level && industry.level > 0" class="mr-4">
                      <div class="flex items-center">
                        <div *ngFor="let _ of [].constructor(industry.level)" class="w-4 h-px bg-gray-300 mr-1"></div>
                        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                      </div>
                    </div>

                    <div>
                      <h3 class="text-lg font-semibold text-gray-900">{{ industry.name }}</h3>
                      <div class="flex items-center mt-1 space-x-4 text-sm text-gray-500">
                        <span *ngIf="industry.stats.childrenCount > 0">
                          {{ industry.stats.childrenCount }} subcategories
                        </span>
                        <span *ngIf="industry.stats.companyCount > 0">
                          <button
                            (click)="showCompaniesInIndustry(industry)"
                            class="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer">
                            {{ industry.stats.companyCount }} companies
                          </button>
                        </span>
                        <span class="text-xs text-gray-400">
                          ID: {{ industry.id }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Action Buttons -->
                <div class="flex items-center space-x-2">
                  <!-- View Children Button -->
                  <button
                    *ngIf="industry.stats.childrenCount > 0"
                    (click)="navigateToChildren(industry)"
                    class="px-3 py-1 text-sm text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors">
                    View Subcategories
                  </button>

                  <!-- Add Child Button -->
                  <button
                    (click)="openCreateModal(industry)"
                    class="px-3 py-1 text-sm text-green-600 border border-green-600 rounded hover:bg-green-50 transition-colors">
                    Add Sub-industry
                  </button>

                  <!-- Edit Button -->
                  <button
                    (click)="openEditModal(industry)"
                    class="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                    Edit
                  </button>

                  <!-- Delete Button -->
                  <button
                    (click)="confirmDelete(industry)"
                    class="px-3 py-1 text-sm text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div *ngIf="!isLoading() && !error() && pagination() && pagination()!.pages > 1"
             class="mt-6 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div class="flex flex-1 justify-between sm:hidden">
            <button
              [disabled]="pagination()!.page <= 1"
              (click)="goToPage(pagination()!.page - 1)"
              [class]="pagination()!.page <= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'"
              class="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700">
              Previous
            </button>
            <button
              [disabled]="pagination()!.page >= pagination()!.pages"
              (click)="goToPage(pagination()!.page + 1)"
              [class]="pagination()!.page >= pagination()!.pages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'"
              class="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700">
              Next
            </button>
          </div>
          <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p class="text-sm text-gray-700">
                Showing
                <span class="font-medium">{{ ((pagination()!.page - 1) * pagination()!.limit) + 1 }}</span>
                to
                <span class="font-medium">{{ Math.min(pagination()!.page * pagination()!.limit, pagination()!.total) }}</span>
                of
                <span class="font-medium">{{ pagination()!.total }}</span>
                results
              </p>
            </div>
            <div>
              <nav class="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  [disabled]="pagination()!.page <= 1"
                  (click)="goToPage(pagination()!.page - 1)"
                  [class]="pagination()!.page <= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'"
                  class="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 focus:z-20 focus:outline-offset-0">
                  <span class="sr-only">Previous</span>
                  <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fill-rule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clip-rule="evenodd" />
                  </svg>
                </button>

                <ng-container *ngFor="let pageNum of getPageNumbers(); track pageNum">
                  <button
                    (click)="goToPage(pageNum)"
                    [class]="pageNum === pagination()!.page ?
                      'bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600' :
                      'text-gray-900 hover:bg-gray-50 focus:outline-offset-0'"
                    class="relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 focus:z-20">
                    {{ pageNum }}
                  </button>
                </ng-container>

                <button
                  [disabled]="pagination()!.page >= pagination()!.pages"
                  (click)="goToPage(pagination()!.page + 1)"
                  [class]="pagination()!.page >= pagination()!.pages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'"
                  class="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 focus:z-20 focus:outline-offset-0">
                  <span class="sr-only">Next</span>
                  <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>

        <!-- Create/Edit Industry Modal -->
        <div *ngIf="showModal()"
             class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div class="px-6 py-4 border-b border-gray-200">
              <h3 class="text-lg font-semibold text-gray-900">
                {{ editingIndustry() ? 'Edit Industry' : (modalParent() ? 'Add Sub-industry' : 'Add Industry') }}
              </h3>
            </div>

            <div class="px-6 py-4">
              <div class="space-y-4">
                <!-- Parent Industry Display -->
                <div *ngIf="modalParent()" class="p-3 bg-blue-50 rounded border border-blue-200">
                  <div class="text-sm text-blue-700">
                    <strong>Parent Industry:</strong> {{ modalParent()!.name }}
                  </div>
                </div>

                <!-- Industry Name -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Industry Name</label>
                  <input
                    type="text"
                    [(ngModel)]="modalForm.name"
                    placeholder="Enter industry name"
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>

                <!-- Parent Selector (for root level creation only) -->
                <div *ngIf="!modalParent() && !editingIndustry() && availableParents().length > 0">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Parent Industry (Optional)</label>
                  <select
                    [(ngModel)]="modalForm.parentId"
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option [value]="null">-- Root Level Industry --</option>
                    <option *ngFor="let parent of availableParents()" [value]="parent.id">
                      {{ parent.name }}
                    </option>
                  </select>
                </div>
              </div>
            </div>

            <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                (click)="closeModal()"
                class="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                (click)="saveIndustry()"
                [disabled]="isSaving() || !modalForm.name.trim()"
                class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50">
                {{ isSaving() ? 'Saving...' : (editingIndustry() ? 'Update' : 'Create') }}
              </button>
            </div>
          </div>
        </div>

        <!-- Delete Confirmation Modal -->
        <div *ngIf="showDeleteModal()"
             class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div class="px-6 py-4 border-b border-gray-200">
              <h3 class="text-lg font-semibold text-red-700">Confirm Delete</h3>
            </div>

            <div class="px-6 py-4">
              <p class="text-gray-700">
                Are you sure you want to delete "<strong>{{ deleteTarget()?.name }}</strong>"?
              </p>
              <p class="text-sm text-red-600 mt-2">
                This action cannot be undone. All sub-industries and associated companies will need to be reassigned.
              </p>
            </div>

            <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                (click)="cancelDelete()"
                class="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                (click)="deleteIndustry()"
                [disabled]="isDeleting()"
                class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50">
                {{ isDeleting() ? 'Deleting...' : 'Delete' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Company List Popup -->
    @if (showCompanyPopup()) {
      <app-company-list-popup
        [industryId]="selectedIndustryForCompanies()!.id"
        [industryName]="selectedIndustryForCompanies()!.name"
        [totalCompanies]="selectedIndustryForCompanies()!.stats.companyCount"
        (closePopup)="closeCompanyPopup()"
        (companySelected)="onCompanySelected($event)">
      </app-company-list-popup>
    }
  `
})
export class IndustriesListComponent implements OnInit {
  industries = signal<IndustryWithStats[]>([]);
  availableParents = signal<Industry[]>([]);
  currentParent = signal<Industry | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);

  // Pagination
  pagination = signal<{ page: number; limit: number; total: number; pages: number } | null>(null);
  pageSize = signal(20);

  // Filtering
  searchQuery = '';
  statusFilter: 'all' | 'active' | 'inactive' = 'all';

  // Modal state
  showModal = signal(false);
  editingIndustry = signal<IndustryWithStats | null>(null);
  modalParent = signal<Industry | null>(null);
  modalForm = {
    name: '',
    parentId: null as number | null,
    description: '',
    is_active: true,
    display_order: 0
  };

  // Delete modal
  showDeleteModal = signal(false);
  deleteTarget = signal<IndustryWithStats | null>(null);

  // Loading states
  isSaving = signal(false);
  isDeleting = signal(false);

  // Company popup state
  showCompanyPopup = signal(false);
  selectedIndustryForCompanies = signal<IndustryWithStats | null>(null);

  // Math for template
  Math = Math;  // Computed
  filteredIndustries = computed(() => {
    const industries = this.industries();
    if (!this.searchQuery.trim()) return industries;

    const query = this.searchQuery.toLowerCase();
    return industries.filter(industry =>
      industry.name.toLowerCase().includes(query)
    );
  });

  constructor(
    private industryService: IndustryService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadIndustries();
    this.loadAvailableParents();
  }

  loadIndustries(): void {
    this.isLoading.set(true);
    this.error.set(null);

    const currentParentId = this.currentParent()?.id;

    const options: IndustryListOptions = {
      parent_id: currentParentId,
      with_hierarchy: true,
      page: this.pagination()?.page || 1,
      limit: this.pageSize(),
      order_by: 'display_order',
      order_dir: 'ASC'
    };

    // Add filtering
    if (this.statusFilter !== 'all') {
      options.is_active = this.statusFilter === 'active';
    }

    // Add search
    if (this.searchQuery.trim()) {
      options.search = this.searchQuery.trim();
    }

    this.industryService.listIndustries(options)
      .pipe(
        switchMap((response) => {
          // Update pagination info
          this.pagination.set({
            page: response.pagination.page,
            limit: response.pagination.limit,
            total: response.pagination.total,
            pages: response.pagination.pages
          });

          if (response.data.length === 0) {
            this.industries.set([]);
            this.isLoading.set(false);
            return EMPTY;
          }

          // Transform nodes to industries and use hierarchy data
          const industries: IndustryWithStats[] = response.data.map(node => ({
            ...node.data,
            stats: {
              childrenCount: node.data.children_count || 0,
              companyCount: node.data.companies_count || 0
            },
            level: currentParentId ? 1 : 0
          }));

          return [industries];
        }),
        catchError(error => {
          this.error.set(error.message || 'Failed to load industries');
          this.isLoading.set(false);
          return EMPTY;
        })
      )
      .subscribe(industries => {
        this.industries.set(industries);
        this.isLoading.set(false);
      });
  }

  loadAvailableParents(): void {
    const options: IndustryListOptions = {
      parent_id: null, // Get root level industries
      is_active: true,
      limit: 1000
    };

    this.industryService.listIndustries(options)
      .pipe(
        catchError(() => {
          this.availableParents.set([]);
          return EMPTY;
        })
      )
      .subscribe(response => {
        const parents = response.data.map(node => node.data);
        this.availableParents.set(parents);
      });
  }

  navigateToChildren(industry: IndustryWithStats): void {
    this.currentParent.set(industry);
    this.loadIndustries();
  }

  navigateToParent(parent: Industry | null): void {
    this.currentParent.set(parent);
    this.loadIndustries();
  }

  onSearchChange(): void {
    // Reset to first page when searching
    this.pagination.update(p => p ? { ...p, page: 1 } : { page: 1, limit: this.pageSize(), total: 0, pages: 0 });
    this.loadIndustries();
  }

  onFilterChange(): void {
    // Reset to first page when filtering
    this.pagination.update(p => p ? { ...p, page: 1 } : { page: 1, limit: this.pageSize(), total: 0, pages: 0 });
    this.loadIndustries();
  }

  goToPage(page: number): void {
    this.pagination.update(p => p ? { ...p, page } : { page, limit: this.pageSize(), total: 0, pages: 0 });
    this.loadIndustries();
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.pagination.update(p => p ? { ...p, page: 1, limit: pageSize } : { page: 1, limit: pageSize, total: 0, pages: 0 });
    this.loadIndustries();
  }

  getPageNumbers(): number[] {
    const pagination = this.pagination();
    if (!pagination) return [];

    const pages: number[] = [];
    const maxVisible = 5;
    const current = pagination.page;
    const total = pagination.pages;

    if (total <= maxVisible) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      const start = Math.max(1, current - Math.floor(maxVisible / 2));
      const end = Math.min(total, start + maxVisible - 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }

    return pages;
  }

  openCreateModal(parent?: IndustryWithStats): void {
    this.modalForm = {
      name: '',
      parentId: parent?.id || null,
      description: '',
      is_active: true,
      display_order: 0
    };
    this.modalParent.set(parent || null);
    this.editingIndustry.set(null);
    this.showModal.set(true);
  }

  openEditModal(industry: IndustryWithStats): void {
    this.modalForm = {
      name: industry.name,
      parentId: industry.parent_id || null,
      description: industry.description || '',
      is_active: industry.is_active ?? true,
      display_order: industry.display_order || 0
    };
    this.modalParent.set(null);
    this.editingIndustry.set(industry);
    this.showModal.set(true);
  }  closeModal(): void {
    this.showModal.set(false);
    this.editingIndustry.set(null);
    this.modalParent.set(null);
    this.isSaving.set(false);
  }

  saveIndustry(): void {
    if (!this.modalForm.name.trim()) return;

    this.isSaving.set(true);

    const editingIndustry = this.editingIndustry();
    const modalParent = this.modalParent();

    const operation = editingIndustry
      ? this.industryService.updateIndustry(editingIndustry.id, {
          name: this.modalForm.name.trim(),
          description: this.modalForm.description?.trim() || undefined,
          is_active: this.modalForm.is_active,
          display_order: this.modalForm.display_order
        } as UpdateIndustryRequest)
      : this.industryService.addIndustry({
          name: this.modalForm.name.trim(),
          parent_id: modalParent?.id || this.modalForm.parentId || undefined,
          description: this.modalForm.description?.trim() || undefined,
          is_active: this.modalForm.is_active,
          display_order: this.modalForm.display_order
        } as CreateIndustryRequest);

    operation.pipe(
      catchError(error => {
        console.error('Failed to save industry:', error);
        this.isSaving.set(false);
        return EMPTY;
      })
    ).subscribe(() => {
      this.isSaving.set(false);
      this.closeModal();
      this.loadIndustries();
      this.loadAvailableParents(); // Refresh parent list
    });
  }

  confirmDelete(industry: IndustryWithStats): void {
    this.deleteTarget.set(industry);
    this.showDeleteModal.set(true);
  }

  cancelDelete(): void {
    this.showDeleteModal.set(false);
    this.deleteTarget.set(null);
    this.isDeleting.set(false);
  }

  showCompaniesInIndustry(industry: IndustryWithStats): void {
    this.selectedIndustryForCompanies.set(industry);
    this.showCompanyPopup.set(true);
  }

  closeCompanyPopup(): void {
    this.showCompanyPopup.set(false);
    this.selectedIndustryForCompanies.set(null);
  }

  onCompanySelected(company: ICompany): void {
    // Handle company selection - could navigate to company details or close popup
    console.log('Company selected:', company);
    this.closeCompanyPopup();
    // You could navigate to company details here:
    // this.router.navigate(['/admin/companies', company.id]);
  }

  deleteIndustry(): void {
    const target = this.deleteTarget();
    if (!target) return;

    this.isDeleting.set(true);

    this.industryService.deleteIndustry(target.id)
      .pipe(
        catchError(error => {
          console.error('Failed to delete industry:', error);
          this.isDeleting.set(false);
          return EMPTY;
        })
      )
      .subscribe(() => {
        this.isDeleting.set(false);
        this.cancelDelete();
        this.loadIndustries();
        this.loadAvailableParents(); // Refresh parent list
      });
  }
}
