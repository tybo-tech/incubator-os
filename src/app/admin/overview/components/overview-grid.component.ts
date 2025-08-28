import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoryCardComponent, CategoryWithStats } from './category-card.component';
import { CompanyItem } from './company-card.component';
import { RichCompanyCardComponent } from './rich-company-card.component';
import { ICompany } from '../../../../models/simple.schema';

export type CurrentLevel = 'root' | 'client' | 'program' | 'cohort';

// Update the grid component to handle both CompanyItem and ICompany
export type GridItem = CategoryWithStats | CompanyItem | ICompany;

@Component({
  selector: 'app-overview-grid',
  standalone: true,
  imports: [CommonModule, CategoryCardComponent, RichCompanyCardComponent],
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
        <div class="space-y-4">
          @for (item of items; track item.id) {
            @if (isCompany(item)) {
              <app-rich-company-card
                [company]="item"
                [showRemoveAction]="true"
                (cardClick)="onCompanyClick(item)"
                (viewClick)="onCompanyClick(item)"
                (removeClick)="onRemoveCompany(item)"
              ></app-rich-company-card>
            }
          }
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
  @Input() items: GridItem[] = [];
  @Input() currentLevel: CurrentLevel = 'root';
  @Input() isLoading = false;
  @Input() error: string | null = null;

  @Output() categoryClick = new EventEmitter<CategoryWithStats>();
  @Output() companyClick = new EventEmitter<ICompany>();
  @Output() removeCompany = new EventEmitter<ICompany>();
  @Output() retryClick = new EventEmitter<void>();
  @Output() createFirstClick = new EventEmitter<void>();

  onCategoryClick(category: CategoryWithStats): void {
    this.categoryClick.emit(category);
  }

  onCompanyClick(company: GridItem): void {
    if (this.isCompany(company)) {
      this.companyClick.emit(company as ICompany);
    }
  }

  onRemoveCompany(company: GridItem): void {
    if (this.isCompany(company)) {
      this.removeCompany.emit(company as ICompany);
    }
  }

  onRetryClick(): void {
    this.retryClick.emit();
  }

  onCreateFirstClick(): void {
    this.createFirstClick.emit();
  }

  isCompany(item: GridItem): item is ICompany {
    // Check for ICompany specific properties
    return 'bbbee_level' in item || 'email_address' in item;
  }

  isCategory(item: GridItem): item is CategoryWithStats {
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
