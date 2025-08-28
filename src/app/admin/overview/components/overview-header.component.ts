import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export type CurrentLevel = 'root' | 'client' | 'program' | 'cohort';
export type CreateModalType = 'client' | 'program' | 'cohort';

@Component({
  selector: 'app-overview-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <!-- Title and Description -->
      <div>
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
      </div>

      <!-- Actions and Search -->
      <div class="flex flex-col sm:flex-row sm:items-center gap-4">
        <!-- Action Button -->
        <div class="flex-shrink-0">
          @if (currentLevel === 'root') {
            <button
              (click)="onCreateCategory('client')"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
        @if (showSearch) {
          <div class="w-full sm:w-auto">
            <input
              type="search"
              [value]="searchQuery"
              (input)="onSearchChange($event)"
              placeholder="Search..."
              class="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
          </div>
        }
      </div>
    </div>
  `
})
export class OverviewHeaderComponent {
  @Input() currentLevel: CurrentLevel = 'root';
  @Input() showSearch = false;
  @Input() searchQuery = '';

  @Output() createCategory = new EventEmitter<CreateModalType>();
  @Output() openCompanyModal = new EventEmitter<void>();
  @Output() searchChange = new EventEmitter<string>();

  onCreateCategory(type: CreateModalType): void {
    this.createCategory.emit(type);
  }

  onOpenCompanyModal(): void {
    this.openCompanyModal.emit();
  }

  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchChange.emit(target.value);
  }
}
