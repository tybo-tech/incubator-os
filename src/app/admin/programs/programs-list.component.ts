import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CategoryService } from '../../../services/category.service';
import { catchError, EMPTY, forkJoin, switchMap, firstValueFrom } from 'rxjs';

interface Program {
  id: number;
  name: string;
  description?: string | null;
  type: string;
  stats?: {
    cohortCount?: number;
    companyCount?: number;
  };
}

interface ClientInfo {
  id: number;
  name: string;
}

@Component({
  selector: 'app-programs-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
              <span class="text-gray-900 font-medium">{{ clientInfo()?.name || 'Client' }}</span>
            </li>
          </ol>
        </nav>

        <!-- Header -->
        <div class="mb-8">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold text-gray-900">Programs</h1>
              <p class="text-gray-600 mt-2">Manage programs for {{ clientInfo()?.name }}</p>
            </div>
            <button
              (click)="openCreateModal()"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              Add Program
            </button>
          </div>

          <!-- Search -->
          <div *ngIf="programs().length > 5" class="mt-6">
            <input
              type="text"
              placeholder="Search programs..."
              [(ngModel)]="searchQuery"
              (input)="onSearchChange()"
              class="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>
        </div>

        <!-- Loading State -->
        <div *ngIf="isLoading()" class="flex justify-center items-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span class="ml-3 text-gray-600">Loading programs...</span>
        </div>

        <!-- Error State -->
        <div *ngIf="error()" class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div class="text-red-600 text-lg font-medium mb-2">Failed to load programs</div>
          <p class="text-red-500 mb-4">{{ error() }}</p>
          <button
            (click)="loadPrograms()"
            class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
            Try Again
          </button>
        </div>

        <!-- Empty State -->
        <div *ngIf="!isLoading() && !error() && filteredPrograms().length === 0"
             class="text-center py-12">
          <div class="text-gray-400 text-6xl mb-4">📚</div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">
            {{ programs().length === 0 ? 'No programs yet' : 'No programs found' }}
          </h3>
          <p class="text-gray-500 mb-6">
            {{ programs().length === 0 ? 'Create your first program to get started.' : 'Try adjusting your search criteria.' }}
          </p>
          <button
            *ngIf="programs().length === 0"
            (click)="openCreateModal()"
            class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Create First Program
          </button>
        </div>

        <!-- Programs Grid -->
        <div *ngIf="!isLoading() && !error() && filteredPrograms().length > 0"
             class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div *ngFor="let program of filteredPrograms()"
               class="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
               (click)="navigateToCohorts(program)">
            <div class="p-6">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold text-gray-900">{{ program.name }}</h3>
                <div class="text-blue-600">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </div>
              </div>

              <p *ngIf="program.description" class="text-gray-600 text-sm mb-4">
                {{ program.description }}
              </p>

              <!-- Statistics -->
              <div class="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div class="text-center">
                  <div class="text-2xl font-bold text-green-600">{{ program.stats?.cohortCount || 0 }}</div>
                  <div class="text-xs text-gray-500">Cohorts</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-purple-600">{{ program.stats?.companyCount || 0 }}</div>
                  <div class="text-xs text-gray-500">Companies</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Create Program Modal -->
        <div *ngIf="showCreateModal()"
             class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div class="px-6 py-4 border-b border-gray-200">
              <h3 class="text-lg font-semibold text-gray-900">Create New Program</h3>
            </div>

            <div class="px-6 py-4">
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Program Name</label>
                  <input
                    type="text"
                    [(ngModel)]="createForm.name"
                    placeholder="Enter program name"
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                  <textarea
                    [(ngModel)]="createForm.description"
                    placeholder="Enter program description"
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
                (click)="createProgram()"
                [disabled]="isCreating() || !createForm.name.trim()"
                class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50">
                {{ isCreating() ? 'Creating...' : 'Create Program' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ProgramsListComponent implements OnInit {
  programs = signal<Program[]>([]);
  clientInfo = signal<ClientInfo | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);
  searchQuery = '';

  // Modal state
  showCreateModal = signal(false);
  isCreating = signal(false);
  createForm = {
    name: '',
    description: ''
  };

  private clientId: number | null = null;

  // Computed
  filteredPrograms = computed(() => {
    const programs = this.programs();
    if (!this.searchQuery.trim()) return programs;

    const query = this.searchQuery.toLowerCase();
    return programs.filter(program =>
      program.name.toLowerCase().includes(query) ||
      program.description?.toLowerCase().includes(query)
    );
  });

  constructor(
    private categoryService: CategoryService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.clientId = +params['clientId'];
      if (this.clientId) {
        this.loadClientInfo();
        this.loadPrograms();
      }
    });
  }

  async loadClientInfo(): Promise<void> {
    if (!this.clientId) return;

    try {
      const client = await firstValueFrom(this.categoryService.getCategoryById(this.clientId));
      this.clientInfo.set({
        id: client.id,
        name: client.name
      });
    } catch (error) {
      console.error('Failed to load client info:', error);
    }
  }

  loadPrograms(): void {
    if (!this.clientId) return;

    this.isLoading.set(true);
    this.error.set(null);

    this.categoryService.listProgramsForClient(this.clientId)
      .pipe(
        switchMap(programs => {
          if (programs.length === 0) {
            this.programs.set([]);
            this.isLoading.set(false);
            return EMPTY;
          }

          // Load statistics for each program
          const statsRequests = programs.map(program =>
            this.categoryService.getCategoryStatistics(program.id).pipe(
              catchError(() => [{}]) // Return empty stats on error
            )
          );

          return forkJoin(statsRequests).pipe(
            switchMap(statsArray => {
              const programsWithStats: Program[] = programs.map((program, index) => {
                const stats = statsArray[index] as any;
                return {
                  id: program.id,
                  name: program.name,
                  description: program.description,
                  type: program.type,
                  stats: {
                    cohortCount: stats?.cohorts_count || 0,
                    companyCount: stats?.companies_count || 0
                  }
                };
              });
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
        this.programs.set(programs);
        this.isLoading.set(false);
      });
  }

  navigateToClients(): void {
    this.router.navigate(['/admin/clients']);
  }

  navigateToCohorts(program: Program): void {
    this.router.navigate(['/admin/clients', this.clientId, 'programs', program.id, 'cohorts']);
  }

  onSearchChange(): void {
    // Triggering change detection for computed signal
  }

  openCreateModal(): void {
    this.createForm = { name: '', description: '' };
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.isCreating.set(false);
  }

  createProgram(): void {
    if (!this.createForm.name.trim() || !this.clientId) return;

    this.isCreating.set(true);

    this.categoryService.addCategory({
      name: this.createForm.name.trim(),
      description: this.createForm.description.trim() || undefined,
      type: 'program',
      parent_id: this.clientId
    }).pipe(
      catchError(error => {
        console.error('Failed to create program:', error);
        this.isCreating.set(false);
        return EMPTY;
      })
    ).subscribe(() => {
      this.isCreating.set(false);
      this.closeCreateModal();
      this.loadPrograms(); // Refresh the list
    });
  }
}
