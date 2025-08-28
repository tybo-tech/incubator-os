import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CategoryStats {
  programs_count?: number;
  cohorts_count?: number;
  companies_count?: number;
}

export interface CategoryWithStats {
  id: number;
  name: string;
  description?: string | null;
  image_url?: string | null;
  type: string;
  stats?: CategoryStats;
}

@Component({
  selector: 'app-category-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-2xl border shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
         (click)="onCardClick()">
      <div class="p-6">
        <div class="flex items-start justify-between mb-4">
          <div class="flex-1 min-w-0">
            <h3 class="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
              {{ category.name }}
            </h3>
            @if (category.description) {
              <p class="text-sm text-gray-600 mt-1 line-clamp-2">
                {{ category.description }}
              </p>
            }
          </div>
          <svg class="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors ml-2 flex-shrink-0"
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
          </svg>
        </div>

        <!-- Statistics -->
        @if (category.stats) {
          <div class="flex items-center space-x-4 text-sm text-gray-500">
            @if (category.stats.programs_count !== undefined) {
              <div class="flex items-center space-x-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                </svg>
                <span>{{ category.stats.programs_count }} {{ category.stats.programs_count === 1 ? 'program' : 'programs' }}</span>
              </div>
            }
            @if (category.stats.cohorts_count !== undefined) {
              <div class="flex items-center space-x-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                </svg>
                <span>{{ category.stats.cohorts_count }} {{ category.stats.cohorts_count === 1 ? 'cohort' : 'cohorts' }}</span>
              </div>
            }
            @if (category.stats.companies_count !== undefined) {
              <div class="flex items-center space-x-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                </svg>
                <span>{{ category.stats.companies_count }} {{ category.stats.companies_count === 1 ? 'company' : 'companies' }}</span>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class CategoryCardComponent {
  @Input() category!: CategoryWithStats;
  @Output() cardClick = new EventEmitter<CategoryWithStats>();

  onCardClick(): void {
    this.cardClick.emit(this.category);
  }
}
