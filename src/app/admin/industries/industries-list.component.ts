import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IndustryService } from '../../../services/industry.service';
import { catchError, EMPTY, forkJoin, switchMap } from 'rxjs';
import { Industry } from '../../../models/simple.schema';
import { INode } from '../../../models/schema';

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
  imports: [CommonModule, FormsModule],
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

          <!-- Search -->
          <div *ngIf="industries().length > 5" class="mt-6">
            <input
              type="text"
              placeholder="Search industries..."
              [(ngModel)]="searchQuery"
              (input)="onSearchChange()"
              class="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>
        </div>

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
                          {{ industry.stats.companyCount }} companies
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
  `
})
export class IndustriesListComponent implements OnInit {
  industries = signal<IndustryWithStats[]>([]);
  availableParents = signal<Industry[]>([]);
  currentParent = signal<Industry | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);
  searchQuery = '';

  // Modal state
  showModal = signal(false);
  editingIndustry = signal<IndustryWithStats | null>(null);
  modalParent = signal<Industry | null>(null);
  isSaving = signal(false);
  modalForm = {
    name: '',
    parentId: null as number | null
  };

  // Delete modal state
  showDeleteModal = signal(false);
  deleteTarget = signal<IndustryWithStats | null>(null);
  isDeleting = signal(false);

  // Computed
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

    this.industryService.listIndustries(currentParentId)
      .pipe(
        switchMap((industryNodes: INode<Industry>[]) => {
          if (industryNodes.length === 0) {
            this.industries.set([]);
            this.isLoading.set(false);
            return EMPTY;
          }

          // Transform nodes to industries and add basic stats
          const industries: IndustryWithStats[] = industryNodes.map(node => ({
            ...node.data,
            stats: {
              childrenCount: 0, // We'll load this separately if needed
              companyCount: 0
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

        // Load children counts for each industry
        this.loadChildrenCounts();
      });
  }

  loadChildrenCounts(): void {
    const industries = this.industries();

    industries.forEach(industry => {
      this.industryService.listIndustryChildren(industry.id)
        .pipe(
          catchError(() => [])
        )
        .subscribe(children => {
          // Update the industry's stats
          const updated = this.industries().map(ind =>
            ind.id === industry.id
              ? { ...ind, stats: { ...ind.stats, childrenCount: children.length } }
              : ind
          );
          this.industries.set(updated);
        });
    });
  }

  loadAvailableParents(): void {
    this.industryService.listIndustries() // Get all root level industries
      .pipe(
        catchError(() => [])
      )
      .subscribe(industryNodes => {
        const parents = industryNodes.map(node => node.data);
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
    // Triggering change detection for computed signal
  }

  openCreateModal(parent?: IndustryWithStats): void {
    this.modalForm = { name: '', parentId: parent?.id || null };
    this.modalParent.set(parent || null);
    this.editingIndustry.set(null);
    this.showModal.set(true);
  }

  openEditModal(industry: IndustryWithStats): void {
    this.modalForm = {
      name: industry.name,
      parentId: industry.parent_id || null
    };
    this.modalParent.set(null);
    this.editingIndustry.set(industry);
    this.showModal.set(true);
  }

  closeModal(): void {
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
      ? this.industryService.updateIndustry(editingIndustry.id, { name: this.modalForm.name.trim() })
      : this.industryService.addIndustry(
          this.modalForm.name.trim(),
          modalParent?.id || this.modalForm.parentId || undefined
        );

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
