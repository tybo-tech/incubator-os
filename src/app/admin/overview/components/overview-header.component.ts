import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export type CurrentLevel = 'root' | 'client' | 'program' | 'cohort';
export type CreateModalType = 'client' | 'program' | 'cohort';

export interface OverviewStats {
  totalItems: number;
  activeItems?: number;
  completedItems?: number;
}

@Component({
  selector: 'app-overview-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col gap-6 mb-8">
      <!-- Title, Description and Statistics -->
      <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <!-- Title and Description -->
        <div class="flex-1">
          <h1 class="text-2xl font-bold text-gray-900">
            @if (currentLevel === 'root') {
              All Clients
            } @else if (currentLevel === 'client') {
              Programs
            } @else if (currentLevel === 'program') {
              Cohorts
            } @else if (currentLevel === 'cohort') {
              Companies
            }
          </h1>
          <p class="text-gray-600 mt-1">
            @if (currentLevel === 'root') {
              Manage your client organizations and their programs
            } @else if (currentLevel === 'client') {
              Training programs and initiatives
            } @else if (currentLevel === 'program') {
              Groups of participants in this program
            } @else if (currentLevel === 'cohort') {
              Companies participating in this cohort
            }
          </p>

          <!-- Statistics Summary -->
          @if (stats && stats.totalItems > 0) {
            <div class="flex items-center space-x-6 mt-3 text-sm text-gray-500">
              <div class="flex items-center space-x-1">
                <span class="font-medium text-gray-900">{{ stats.totalItems }}</span>
                <span>
                  @if (currentLevel === 'root') {
                    {{ stats.totalItems === 1 ? 'client' : 'clients' }}
                  } @else if (currentLevel === 'client') {
                    {{ stats.totalItems === 1 ? 'program' : 'programs' }}
                  } @else if (currentLevel === 'program') {
                    {{ stats.totalItems === 1 ? 'cohort' : 'cohorts' }}
                  } @else if (currentLevel === 'cohort') {
                    {{ stats.totalItems === 1 ? 'company' : 'companies' }}
                  }
                </span>
              </div>

              @if (stats.activeItems !== undefined && currentLevel === 'cohort') {
                <div class="flex items-center space-x-1">
                  <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>{{ stats.activeItems }} active</span>
                </div>
              }

              @if (stats.completedItems !== undefined && currentLevel === 'cohort') {
                <div class="flex items-center space-x-1">
                  <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>{{ stats.completedItems }} completed</span>
                </div>
              }
            </div>
          }
        </div>

        <!-- Action Button -->
        <div class="flex-shrink-0">
          @if (currentLevel === 'root') {
            <button
              (click)="onCreateCategory('client')"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <span class="flex items-center space-x-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
                <span>Add Client</span>
              </span>
            </button>
          } @else if (currentLevel === 'client') {
            <button
              (click)="onCreateCategory('program')"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <span class="flex items-center space-x-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
                <span>Add Program</span>
              </span>
            </button>
          } @else if (currentLevel === 'program') {
            <button
              (click)="onCreateCategory('cohort')"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <span class="flex items-center space-x-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
                <span>Add Cohort</span>
              </span>
            </button>
          } @else if (currentLevel === 'cohort') {
            <button
              (click)="onOpenCompanyModal()"
              class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
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
      </div>

      <!-- Search Bar -->
      @if (showSearch) {
        <div class="w-full max-w-md">
          <div class="relative">
            <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            <input
              type="search"
              [value]="searchQuery"
              (input)="onSearchInput($event)"
              placeholder="Search {{ currentLevel === 'root' ? 'clients' : currentLevel === 'client' ? 'programs' : currentLevel === 'program' ? 'cohorts' : 'companies' }}..."
              class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
            />
            @if (searchQuery) {
              <button
                (click)="clearSearch()"
                class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class OverviewHeaderComponent {
  @Input() currentLevel: CurrentLevel = 'root';
  @Input() showSearch = false;
  @Input() searchQuery = '';
  @Input() stats?: OverviewStats;

  @Output() createCategory = new EventEmitter<CreateModalType>();
  @Output() openCompanyModal = new EventEmitter<void>();
  @Output() searchChange = new EventEmitter<string>();

  onCreateCategory(type: CreateModalType): void {
    this.createCategory.emit(type);
  }

  onOpenCompanyModal(): void {
    this.openCompanyModal.emit();
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchChange.emit(target.value);
  }

  clearSearch(): void {
    this.searchChange.emit('');
  }
}
