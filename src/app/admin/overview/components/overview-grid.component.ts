import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoryCardComponent, CategoryWithStats } from './category-card.component';
import { CompanyItem } from './company-card.component';

export type CurrentLevel = 'root' | 'client' | 'program' | 'cohort';

@Component({
  selector: 'app-overview-grid',
  standalone: true,
  imports: [CommonModule, CategoryCardComponent],
  template: `
    <!-- Loading State -->
    @if (isLoading) {
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
    @if (error && !isLoading) {
      <div class="bg-white rounded-2xl border shadow-sm p-8 text-center">
        <div class="text-red-500 text-4xl mb-4">⚠️</div>
        <div class="text-red-800 font-medium mb-2">Failed to load data</div>
        <div class="text-red-600 text-sm mb-4">{{ error }}</div>
        <button
          (click)="onRetryClick()"
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    }

    <!-- Empty State -->
    @if (!isLoading && !error && items.length === 0) {
      <div class="bg-white rounded-2xl border shadow-sm p-16 text-center">
        <div class="text-gray-400 text-6xl mb-6">
          @if (currentLevel === 'root') {
            🏢
          } @else if (currentLevel === 'client') {
            📋
          } @else if (currentLevel === 'program') {
            👥
          } @else if (currentLevel === 'cohort') {
            🏛️
          }
        </div>
        <h3 class="text-xl font-medium text-gray-900 mb-4">
          @if (currentLevel === 'root') {
            No clients yet
          } @else if (currentLevel === 'client') {
            No programs yet
          } @else if (currentLevel === 'program') {
            No cohorts yet
          } @else if (currentLevel === 'cohort') {
            No companies yet
          }
        </h3>
        <p class="text-gray-600 mb-8">
          @if (currentLevel === 'root') {
            Create your first client to organize programs and cohorts
          } @else if (currentLevel === 'client') {
            Add programs to this client to get started
          } @else if (currentLevel === 'program') {
            Create cohorts to group participants
          } @else if (currentLevel === 'cohort') {
            Add companies to this cohort
          }
        </p>
        <button
          (click)="onCreateFirstClick()"
          class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          @if (currentLevel === 'root') {
            Create First Client
          } @else if (currentLevel === 'client') {
            Add First Program
          } @else if (currentLevel === 'program') {
            Add First Cohort
          } @else if (currentLevel === 'cohort') {
            Add First Company
          }
        </button>
      </div>
    }

    <!-- Content Grid -->
    @if (!isLoading && !error && items.length > 0) {
      <!-- List View (for companies) -->
      @if (currentLevel === 'cohort') {
        <div class="bg-white rounded-2xl border shadow-sm">
          <div class="p-6">
            <div class="space-y-4">
              @for (item of items; track item.id) {
                @if (isCompany(item)) {
                  <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div class="flex items-center justify-between">
                      <div class="flex-1 min-w-0">
                        <h4 class="text-lg font-medium text-gray-900 truncate">{{ item.name }}</h4>
                        @if (item.contact_person) {
                          <p class="text-sm text-gray-600">Contact: {{ item.contact_person }}</p>
                        }
                        <div class="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                          @if (item.email_address) {
                            <span>{{ item.email_address }}</span>
                          }
                          @if (item.registration_no) {
                            <span>• Reg: {{ item.registration_no }}</span>
                          }
                          @if (item.city) {
                            <span>• {{ item.city }}</span>
                          }
                        </div>
                      </div>
                      <div class="flex items-center space-x-2">
                        @if (item.status) {
                          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                [class]="getStatusClasses(item.status)">
                            {{ item.status | titlecase }}
                          </span>
                        }
                        <button
                          (click)="onRemoveCompany(item)"
                          class="text-red-600 hover:text-red-700 text-sm font-medium transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                }
              }
            </div>
          </div>
        </div>
      } @else {
        <!-- Grid View (for categories) -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (item of items; track item.id) {
            @if (isCategory(item)) {
              <app-category-card
                [category]="item"
                (cardClick)="onCategoryClick($event)"
              ></app-category-card>
            }
          }
        </div>
      }
    }
  `
})
export class OverviewGridComponent {
  @Input() items: (CategoryWithStats | CompanyItem)[] = [];
  @Input() currentLevel: CurrentLevel = 'root';
  @Input() isLoading = false;
  @Input() error: string | null = null;

  @Output() categoryClick = new EventEmitter<CategoryWithStats>();
  @Output() companyClick = new EventEmitter<CompanyItem>();
  @Output() removeCompany = new EventEmitter<CompanyItem>();
  @Output() retryClick = new EventEmitter<void>();
  @Output() createFirstClick = new EventEmitter<void>();

  onCategoryClick(category: CategoryWithStats): void {
    this.categoryClick.emit(category);
  }

  onCompanyClick(company: CompanyItem): void {
    this.companyClick.emit(company);
  }

  onRemoveCompany(company: CompanyItem): void {
    this.removeCompany.emit(company);
  }

  onRetryClick(): void {
    this.retryClick.emit();
  }

  onCreateFirstClick(): void {
    this.createFirstClick.emit();
  }

  isCompany(item: CategoryWithStats | CompanyItem): item is CompanyItem {
    return 'email_address' in item;
  }

  isCategory(item: CategoryWithStats | CompanyItem): item is CategoryWithStats {
    return 'type' in item;
  }

  getStatusClasses(status: string): string {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'withdrawn':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
}
