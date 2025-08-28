import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface BreadcrumbItem {
  id: number;
  name: string;
  type: string;
}

@Component({
  selector: 'app-overview-breadcrumb',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center space-x-2 text-sm text-gray-600 mb-4">
      <button
        (click)="onNavigateToRoot()"
        class="hover:text-blue-600 transition-colors"
        [class.text-blue-600]="isRoot"
      >
        Overview
      </button>
      @for (crumb of breadcrumb; track crumb.id; let isLast = $last) {
        <span class="text-gray-400">›</span>
        @if (isLast) {
          <span class="text-gray-900 font-medium">{{ crumb.name }}</span>
        } @else {
          <button
            (click)="onNavigateToCategory(crumb.id)"
            class="hover:text-blue-600 transition-colors"
          >
            {{ crumb.name }}
          </button>
        }
      }
    </div>
  `
})
export class OverviewBreadcrumbComponent {
  @Input() breadcrumb: BreadcrumbItem[] = [];
  @Input() isRoot = false;

  @Output() navigateToRoot = new EventEmitter<void>();
  @Output() navigateToCategory = new EventEmitter<number>();

  onNavigateToRoot(): void {
    this.navigateToRoot.emit();
  }

  onNavigateToCategory(categoryId: number): void {
    this.navigateToCategory.emit(categoryId);
  }
}
