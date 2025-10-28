import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CategoryService } from '../../../services/category.service';
import { CreateModalComponent, CreateModalConfig } from '../../shared/components';
import { catchError, EMPTY, forkJoin, switchMap } from 'rxjs';
import { ToastService } from '../../../services';

interface Client {
  id: number;
  name: string;
  description?: string | null;
  type: string;
  stats?: {
    programCount?: number;
    cohortCount?: number;
    companyCount?: number;
  };
}

@Component({
  selector: 'app-clients-list',
  standalone: true,
  imports: [CommonModule, FormsModule, CreateModalComponent],
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <!-- Header -->
        <div class="mb-6 sm:mb-8">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">Clients</h1>
              <p class="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">Manage your client organizations</p>
            </div>
            <button
              (click)="openCreateModal()"
              class="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              Add Client
            </button>
          </div>

          <!-- Search -->
          <div *ngIf="clients().length > 5" class="mt-4 sm:mt-6">
            <input
              type="text"
              placeholder="Search clients..."
              [(ngModel)]="searchQuery"
              (input)="onSearchChange()"
              class="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>
        </div>

        <!-- Loading State -->
        <div *ngIf="isLoading()" class="flex justify-center items-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span class="ml-3 text-gray-600">Loading clients...</span>
        </div>

        <!-- Error State -->
        <div *ngIf="error()" class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div class="text-red-600 text-lg font-medium mb-2">Failed to load clients</div>
          <p class="text-red-500 mb-4">{{ error() }}</p>
          <button
            (click)="loadClients()"
            class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
            Try Again
          </button>
        </div>

        <!-- Empty State -->
        <div *ngIf="!isLoading() && !error() && filteredClients().length === 0"
             class="text-center py-12">
          <div class="text-gray-400 text-6xl mb-4">🏢</div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">
            {{ clients().length === 0 ? 'No clients yet' : 'No clients found' }}
          </h3>
          <p class="text-gray-500 mb-6">
            {{ clients().length === 0 ? 'Get started by creating your first client organization.' : 'Try adjusting your search criteria.' }}
          </p>
          <button
            *ngIf="clients().length === 0"
            (click)="openCreateModal()"
            class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Create First Client
          </button>
        </div>

        <!-- Clients Grid -->
        <div *ngIf="!isLoading() && !error() && filteredClients().length > 0"
             class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div *ngFor="let client of filteredClients()"
               class="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div class="p-4 sm:p-6">
              <div class="flex items-start justify-between mb-4">
                <h3 class="text-lg font-semibold text-gray-900 flex-1 pr-3">{{ client.name }}</h3>

                <!-- Action Buttons -->
                <div class="flex space-x-1 flex-shrink-0">
                  <button
                    (click)="editClient(client)"
                    class="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit Client">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                  </button>

                  <button
                    (click)="deleteClient(client)"
                    class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Client">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                  </button>
                </div>
              </div>

              <p *ngIf="client.description" class="text-gray-600 text-sm mb-4 line-clamp-2">
                {{ client.description }}
              </p>

              <!-- Statistics -->
              <div class="grid grid-cols-2 gap-3 sm:gap-4 pt-4 border-t border-gray-100 mb-4">
                <div class="text-center">
                  <div class="text-xl sm:text-2xl font-bold text-blue-600">{{ client.stats?.programCount || 0 }}</div>
                  <div class="text-xs text-gray-500">Programs</div>
                </div>
                <div class="text-center">
                  <div class="text-xl sm:text-2xl font-bold text-purple-600">{{ client.stats?.companyCount || 0 }}</div>
                  <div class="text-xs text-gray-500">Companies</div>
                </div>
              </div>

              <!-- Action Button -->
              <button
                (click)="navigateToPrograms(client)"
                class="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                </svg>
                View Programs
              </button>
            </div>
          </div>
        </div>

        <!-- Create Client Modal -->
        <app-create-modal
          [show]="showCreateModal()"
          [config]="createModalConfig"
          [isSubmitting]="isCreating"
          (cancel)="closeCreateModal()"
          (submit)="onCreateSubmit($event)">
        </app-create-modal>
      </div>
    </div>
  `
})
export class ClientsListComponent implements OnInit {
  clients = signal<Client[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);
  searchQuery = '';

  // Modal state
  showCreateModal = signal(false);
  isCreating = signal(false);

  // Modal configuration
  createModalConfig: CreateModalConfig = {
    title: 'Create New Client',
    submitLabel: 'Create Client',
    fields: [
      {
        key: 'name',
        label: 'Client Name',
        type: 'text',
        placeholder: 'Enter client name',
        required: true
      },
      {
        key: 'description',
        label: 'Description (Optional)',
        type: 'textarea',
        placeholder: 'Enter client description',
        rows: 3
      }
    ]
  };

  // Computed
  filteredClients = computed(() => {
    const clients = this.clients();
    if (!this.searchQuery.trim()) return clients;

    const query = this.searchQuery.toLowerCase();
    return clients.filter(client =>
      client.name.toLowerCase().includes(query) ||
      client.description?.toLowerCase().includes(query)
    );
  });

  constructor(
    private categoryService: CategoryService,
    private router: Router,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadClients();
  }

  loadClients(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.categoryService.listCategories({ type: 'client', depth: 1 })
      .pipe(
        switchMap(clients => {
          if (clients.length === 0) {
            this.clients.set([]);
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
              const clientsWithStats: Client[] = clients.map((client, index) => {
                const stats = statsArray[index] as any;
                return {
                  id: client.id,
                  name: client.name,
                  description: client.description,
                  type: client.type,
                  stats: {
                    programCount: stats?.programs_count || 0,
                    cohortCount: stats?.cohorts_count || 0,
                    companyCount: stats?.companies_count || 0
                  }
                };
              });
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
        this.clients.set(clients);
        this.isLoading.set(false);
      });
  }

  navigateToPrograms(client: Client): void {
    this.router.navigate(['/admin/clients', client.id, 'programs']);
  }

  editClient(client: Client): void {
    // TODO: Implement edit functionality
    // This could open an edit modal or navigate to an edit form
    console.log('Edit client:', client);

    this.toastService.info(`Edit functionality for "${client.name}" will be implemented soon!`);
  }

  deleteClient(client: Client): void {
    if (confirm(`Are you sure you want to delete "${client.name}"? This action cannot be undone.`)) {
      // TODO: Implement delete functionality
      this.isLoading.set(true);

      this.categoryService.deleteCategory(client.id).pipe(
        catchError(error => {
          console.error('Failed to delete client:', error);
          this.toastService.info('Failed to delete client. Please try again.');
          this.isLoading.set(false);
          return EMPTY;
        })
      ).subscribe(() => {
        this.loadClients(); // Refresh the list
      });
    }
  }

  onSearchChange(): void {
    // Triggering change detection for computed signal
  }

  openCreateModal(): void {
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.isCreating.set(false);
  }

  onCreateSubmit(formData: any): void {
    this.isCreating.set(true);

    this.categoryService.addCategory({
      name: formData.name,
      description: formData.description || undefined,
      type: 'client',
      parent_id: null
    }).pipe(
      catchError(error => {
        console.error('Failed to create client:', error);
        this.isCreating.set(false);
        return EMPTY;
      })
    ).subscribe(() => {
      this.isCreating.set(false);
      this.closeCreateModal();
      this.loadClients(); // Refresh the list
    });
  }
}
