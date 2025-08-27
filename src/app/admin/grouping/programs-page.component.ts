import { Component, inject, OnInit, signal, computed } from '@angular/core';
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
  selector: 'app-programs-page',
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
              Programs
              @if (client()) {
                <span class="text-gray-600">for {{ client()?.name }}</span>
              }
            </h1>
            <p class="text-gray-600 mt-1">Manage programs within this client</p>
          </div>
          <button
            (click)="openCreateModal()"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            [disabled]="!client()"
          >
            New Program
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
            <div class="text-red-800 font-medium mb-2">Failed to load programs</div>
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
        @if (!isLoading() && !error() && programs().length === 0 && client()) {
          <div class="text-center py-16">
            <div class="text-gray-400 text-6xl mb-4">📋</div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">No programs yet</h3>
            <p class="text-gray-600 mb-6">Create your first program for {{ client()?.name }}</p>
            <button
              (click)="openCreateModal()"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Program
            </button>
          </div>
        }

        <!-- No Client Selected -->
        @if (!client() && !isLoading()) {
          <div class="text-center py-16">
            <div class="text-gray-400 text-6xl mb-4">⚠️</div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">No client selected</h3>
            <p class="text-gray-600 mb-6">Please select a client to view programs</p>
            <button
              (click)="navigateToClients()"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Clients
            </button>
          </div>
        }

        <!-- Programs Grid -->
        @if (!isLoading() && !error() && programs().length > 0) {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (program of sortedPrograms(); track program.id) {
              <div
                class="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100"
                (click)="navigateToCohorts(program)"
              >
                <div class="p-6">
                  @if (program.image_url) {
                    <img
                      [src]="program.image_url"
                      [alt]="program.name"
                      class="w-12 h-12 rounded-lg object-cover mb-4"
                    />
                  } @else {
                    <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                      <span class="text-green-600 font-semibold text-lg">
                        {{ program.name.charAt(0).toUpperCase() }}
                      </span>
                    </div>
                  }

                  <h3 class="text-lg font-semibold text-gray-900 mb-2">
                    {{ program.name }}
                  </h3>

                  @if (program.description) {
                    <p class="text-gray-600 text-sm mb-4 line-clamp-2">
                      {{ program.description }}
                    </p>
                  }

                  <div class="flex items-center justify-between">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      @if (programStats()[program.id]) {
                        Cohorts: {{ programStats()[program.id] }}
                      } @else {
                        Loading...
                      }
                    </span>
                    <span class="text-blue-600 hover:text-blue-700 text-sm">
                      View Cohorts →
                    </span>
                  </div>
                </div>
              </div>
            }
          </div>
        }

        <!-- Create Program Modal -->
        @if (showCreateModal()) {
          <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
              <div class="p-6">
                <h2 class="text-xl font-semibold text-gray-900 mb-4">Create New Program</h2>

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
                        placeholder="Enter program name"
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
                        Create Program
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
export class ProgramsPageComponent implements OnInit {
  private categoryService = inject(CategoryService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private groupingState = inject(GroupingStateService);

  // State
  isLoading = signal(false);
  error = signal<string | null>(null);
  client = signal<ICategory | null>(null);
  programs = signal<ICategory[]>([]);
  programStats = signal<Record<number, number>>({});

  // Modal state
  showCreateModal = signal(false);
  isCreating = signal(false);
  createError = signal<string | null>(null);
  formData = signal<CategoryFormData>({ name: '', description: '', image_url: '' });

  // Computed
  sortedPrograms = signal<ICategory[]>([]);

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const clientId = +params['clientId'];
      if (clientId) {
        this.groupingState.updateContext({ clientId });
        this.loadData();
      }
    });
  }

  loadData(): void {
    const context = this.groupingState.context();
    const clientId = context.clientId;

    if (!clientId) {
      this.error.set('No client selected');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    // Load client info and programs
    forkJoin({
      client: this.categoryService.getCategoryById(clientId),
      programs: this.categoryService.listProgramsForClient(clientId)
    })
    .pipe(
      switchMap(({ client, programs }) => {
        this.client.set(client);
        this.programs.set(programs);
        this.sortedPrograms.set([...programs].sort((a, b) => a.name.localeCompare(b.name)));

        // Load cohort counts for each program
        const statRequests = programs.map(program =>
          this.categoryService.listCohortsForProgram(program.id)
        );

        return forkJoin(statRequests);
      }),
      catchError(error => {
        console.error('Failed to load programs data:', error);
        this.error.set(error.message || 'Failed to load programs');
        return EMPTY;
      })
    )
    .subscribe(cohortLists => {
      const programs = this.programs();
      const stats: Record<number, number> = {};

      programs.forEach((program, index) => {
        stats[program.id] = cohortLists[index]?.length || 0;
      });

      this.programStats.set(stats);
      this.isLoading.set(false);
    });
  }

  navigateToClients(): void {
    this.router.navigate(['/admin/grouping/clients']);
  }

  navigateToCohorts(program: ICategory): void {
    this.router.navigate(['/admin/grouping/programs', program.id, 'cohorts']);
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
    const clientId = this.client()?.id;

    if (!data.name.trim() || !clientId) return;

    this.isCreating.set(true);
    this.createError.set(null);

    this.categoryService.ensureProgram(
      clientId,
      data.name.trim(),
      data.description?.trim() || undefined,
      data.image_url?.trim() || undefined
    )
    .pipe(
      catchError(error => {
        console.error('Failed to create program:', error);
        this.createError.set(error.message || 'Failed to create program');
        return EMPTY;
      })
    )
    .subscribe(program => {
      this.isCreating.set(false);
      this.closeCreateModal();
      this.loadData(); // Refresh the list
    });
  }
}
