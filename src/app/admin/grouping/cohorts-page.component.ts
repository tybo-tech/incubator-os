import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CategoryService } from '../../../services/category.service';
import { TopBarContextComponent } from './top-bar-context.component';
import { GroupingStateService } from './grouping-state.service';
import { ICategory } from '../../../models/simple.schema';
import { CategoryFormData } from './types';
import { catchError, EMPTY, switchMap, forkJoin } from 'rxjs';

@Component({
  selector: 'app-cohorts-page',
  standalone: true,
  imports: [CommonModule, FormsModule, TopBarContextComponent],
  template: `
    <div class="min-h-screen bg-gray-50">
      <app-top-bar-context />

      <div class="max-w-7xl mx-auto px-6 py-8">
        <!-- Header -->
        <div class="flex justify-between items-center mb-8">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">
              Cohorts
              @if (program()) {
                <span class="text-gray-600">in {{ program()?.name }}</span>
              }
            </h1>
            <p class="text-gray-600 mt-1">Manage cohorts within this program</p>
          </div>
          <button
            (click)="openCreateModal()"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            [disabled]="!program()"
          >
            New Cohort
          </button>
        </div>

        <!-- Loading State -->
        @if (isLoading()) {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (_ of [1,2,3,4]; track $index) {
              <div class="bg-white rounded-2xl shadow-sm p-6 animate-pulse">
                <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div class="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div class="h-6 bg-gray-100 rounded w-20"></div>
              </div>
            }
          </div>
        }

        <!-- Error State -->
        @if (error()) {
          <div class="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <div class="text-red-800 font-medium mb-2">Failed to load cohorts</div>
            <div class="text-red-600 text-sm mb-4">{{ error() }}</div>
            <button
              (click)="loadData()"
              class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        }

        <!-- Empty State -->
        @if (!isLoading() && !error() && cohorts().length === 0 && program()) {
          <div class="text-center py-16">
            <div class="text-gray-400 text-6xl mb-4">👥</div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">No cohorts yet</h3>
            <p class="text-gray-600 mb-6">Create your first cohort for {{ program()?.name }}</p>
            <button
              (click)="openCreateModal()"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Cohort
            </button>
          </div>
        }

        <!-- No Program Selected -->
        @if (!program() && !isLoading()) {
          <div class="text-center py-16">
            <div class="text-gray-400 text-6xl mb-4">⚠️</div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">No program selected</h3>
            <p class="text-gray-600 mb-6">Please select a program to view cohorts</p>
            <button
              (click)="navigateToPrograms()"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Programs
            </button>
          </div>
        }

        <!-- Cohorts Grid -->
        @if (!isLoading() && !error() && cohorts().length > 0) {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (cohort of sortedCohorts(); track cohort.id) {
              <div
                class="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100"
                (click)="navigateToCohortDetail(cohort)"
              >
                <div class="p-6">
                  @if (cohort.image_url) {
                    <img
                      [src]="cohort.image_url"
                      [alt]="cohort.name"
                      class="w-12 h-12 rounded-lg object-cover mb-4"
                    />
                  } @else {
                    <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                      <span class="text-purple-600 font-semibold text-lg">
                        {{ cohort.name.charAt(0).toUpperCase() }}
                      </span>
                    </div>
                  }

                  <h3 class="text-lg font-semibold text-gray-900 mb-2">
                    {{ cohort.name }}
                  </h3>

                  @if (cohort.description) {
                    <p class="text-gray-600 text-sm mb-4 line-clamp-2">
                      {{ cohort.description }}
                    </p>
                  }

                  <div class="flex items-center justify-between">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      @if (cohortStats()[cohort.id] !== undefined) {
                        Companies: {{ cohortStats()[cohort.id] }}
                      } @else {
                        Loading...
                      }
                    </span>
                    <span class="text-blue-600 hover:text-blue-700 text-sm">
                      View Details →
                    </span>
                  </div>
                </div>
              </div>
            }
          </div>
        }

        <!-- Create Cohort Modal -->
        @if (showCreateModal()) {
          <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
              <div class="p-6">
                <h2 class="text-xl font-semibold text-gray-900 mb-4">Create New Cohort</h2>

                <form (ngSubmit)="submitCreate()" #form="ngForm">
                  <div class="space-y-4">
                    <div>
                      <label for="name" class="block text-sm font-medium text-gray-700 mb-1">
                        Name <span class="text-red-500">*</span>
                      </label>
                      <input
                        id="name"
                        type="text"
                        [(ngModel)]="formData().name"
                        name="name"
                        required
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter cohort name"
                      />
                    </div>

                    <div>
                      <label for="description" class="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        id="description"
                        [(ngModel)]="formData().description"
                        name="description"
                        rows="3"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Optional description"
                      ></textarea>
                    </div>

                    <div>
                      <label for="image_url" class="block text-sm font-medium text-gray-700 mb-1">
                        Image URL
                      </label>
                      <input
                        id="image_url"
                        type="url"
                        [(ngModel)]="formData().image_url"
                        name="image_url"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Optional image URL"
                      />
                    </div>
                  </div>

                  @if (createError()) {
                    <div class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {{ createError() }}
                    </div>
                  }

                  <div class="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      (click)="closeCreateModal()"
                      class="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      [disabled]="isCreating()"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      [disabled]="isCreating() || form.invalid"
                    >
                      @if (isCreating()) {
                        <span class="inline-flex items-center">
                          <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Creating...
                        </span>
                      } @else {
                        Create Cohort
                      }
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class CohortsPageComponent implements OnInit {
  private categoryService = inject(CategoryService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private groupingState = inject(GroupingStateService);

  // State
  isLoading = signal(false);
  error = signal<string | null>(null);
  program = signal<ICategory | null>(null);
  cohorts = signal<ICategory[]>([]);
  cohortStats = signal<Record<number, number>>({});

  // Modal state
  showCreateModal = signal(false);
  isCreating = signal(false);
  createError = signal<string | null>(null);
  formData = signal<CategoryFormData>({ name: '', description: '', image_url: '' });

  // Computed
  sortedCohorts = signal<ICategory[]>([]);

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const programId = +params['programId'];
      if (programId) {
        this.groupingState.updateContext({ programId });
        this.loadData();
      }
    });
  }

  loadData(): void {
    const context = this.groupingState.context();
    const programId = context.programId;

    if (!programId) {
      this.error.set('No program selected');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    // Load program info and cohorts
    forkJoin({
      program: this.categoryService.getCategoryById(programId),
      cohorts: this.categoryService.listCohortsForProgram(programId)
    })
    .pipe(
      switchMap(({ program, cohorts }) => {
        this.program.set(program);
        this.cohorts.set(cohorts);
        this.sortedCohorts.set([...cohorts].sort((a, b) => a.name.localeCompare(b.name)));

        // Load company counts for each cohort
        const statRequests = cohorts.map(cohort =>
          this.categoryService.listCompaniesInCohort(cohort.id)
        );

        return forkJoin(statRequests);
      }),
      catchError(error => {
        console.error('Failed to load cohorts data:', error);
        this.error.set(error.message || 'Failed to load cohorts');
        return EMPTY;
      })
    )
    .subscribe(companyLists => {
      const cohorts = this.cohorts();
      const stats: Record<number, number> = {};

      cohorts.forEach((cohort, index) => {
        stats[cohort.id] = companyLists[index]?.length || 0;
      });

      this.cohortStats.set(stats);
      this.isLoading.set(false);
    });
  }

  navigateToPrograms(): void {
    const context = this.groupingState.context();
    if (context.clientId) {
      this.router.navigate(['/admin/grouping/clients', context.clientId, 'programs']);
    } else {
      this.router.navigate(['/admin/grouping/clients']);
    }
  }

  navigateToCohortDetail(cohort: ICategory): void {
    this.router.navigate(['/admin/grouping/cohorts', cohort.id]);
  }

  openCreateModal(): void {
    this.showCreateModal.set(true);
    this.createError.set(null);
    this.formData.set({ name: '', description: '', image_url: '' });
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  submitCreate(): void {
    const data = this.formData();
    const programId = this.program()?.id;

    if (!data.name.trim() || !programId) return;

    this.isCreating.set(true);
    this.createError.set(null);

    this.categoryService.ensureCohort(
      programId,
      data.name.trim(),
      data.description?.trim() || undefined,
      data.image_url?.trim() || undefined
    )
    .pipe(
      catchError(error => {
        console.error('Failed to create cohort:', error);
        this.createError.set(error.message || 'Failed to create cohort');
        return EMPTY;
      })
    )
    .subscribe(cohort => {
      this.isCreating.set(false);
      this.closeCreateModal();
      this.loadData(); // Refresh the list
    });
  }
}
