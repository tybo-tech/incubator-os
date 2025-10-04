import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

interface BreadcrumbItem {
  label: string;
  clickable?: boolean;
  action?: () => void;
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav class="flex mb-6" aria-label="Breadcrumb">
      <ol class="flex items-center space-x-4">
        <li *ngFor="let item of items; let last = last">
          <div class="flex items-center">
            <!-- Separator (not shown for first item) -->
            <i *ngIf="!first(item)" class="fas fa-chevron-right text-gray-400 mx-2 text-xs"></i>

            <!-- Clickable breadcrumb item -->
            <button
              *ngIf="item.clickable && item.action"
              (click)="item.action()"
              class="text-blue-600 hover:text-blue-800 transition-colors"
            >
              {{ item.label }}
            </button>

            <!-- Non-clickable breadcrumb item (current page) -->
            <span
              *ngIf="!item.clickable || !item.action"
              class="text-gray-900 font-medium"
            >
              {{ item.label }}
            </span>
          </div>
        </li>
      </ol>
    </nav>
  `
})
export class BreadcrumbComponent {
  @Input() items: BreadcrumbItem[] = [];

  first(item: BreadcrumbItem): boolean {
    return this.items.indexOf(item) === 0;
  }
}
