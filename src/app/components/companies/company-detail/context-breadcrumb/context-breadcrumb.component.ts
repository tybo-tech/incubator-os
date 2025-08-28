import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ContextItem {
  id: number;
  name: string;
  type: 'client' | 'program' | 'cohort';
}

@Component({
  selector: 'app-context-breadcrumb',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-gray-50 border-b">
      <div class="max-w-7xl mx-auto px-6 py-3">
        <nav class="flex items-center space-x-2 text-sm">
          <!-- Context Label -->
          <span class="text-gray-500 font-medium">Context:</span>

          <!-- Back to Overview Button -->
          <button
            (click)="backToOverview.emit()"
            class="text-blue-600 hover:text-blue-800 font-medium transition-colors">
            Overview
          </button>

          <!-- Breadcrumb Items -->
          @if (context.length > 0) {
            @for (item of context; track item.id; let isLast = $last) {
              <div class="flex items-center space-x-2">
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>

                <div class="flex items-center space-x-2">
                  <!-- Context Type Icon -->
                  <div [class]="getIconClass(item.type)">
                    @switch (item.type) {
                      @case ('client') {
                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"></path>
                        </svg>
                      }
                      @case ('program') {
                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                      }
                      @case ('cohort') {
                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 9a2 2 0 114 0 2 2 0 01-4 0z"></path>
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a4 4 0 00-3.446 6.032l-2.261 2.26a1 1 0 101.414 1.415l2.261-2.261A4 4 0 1011 5z" clip-rule="evenodd"></path>
                        </svg>
                      }
                    }
                  </div>

                  <!-- Context Item Name -->
                  <button
                    (click)="navigateToContext.emit(item)"
                    [class]="getTextClass(item.type, false)"
                    type="button">
                    {{ item.name }}
                  </button>
                </div>
              </div>
            }
          }

          <!-- Company Indicator -->
          @if (companyName) {
            <div class="flex items-center space-x-2">
              <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>

              <div class="flex items-center space-x-2">
                <div class="w-3 h-3 bg-blue-100 text-blue-600 rounded-sm flex items-center justify-center">
                  <svg class="w-2 h-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path>
                  </svg>
                </div>
                <span class="text-gray-900 font-medium">{{ companyName }}</span>
              </div>
            </div>
          }
        </nav>
      </div>
    </div>
  `
})
export class ContextBreadcrumbComponent {
  @Input() context: ContextItem[] = [];
  @Input() companyName?: string;
  @Output() navigateToContext = new EventEmitter<ContextItem>();
  @Output() backToOverview = new EventEmitter<void>();

  getIconClass(type: string): string {
    const baseClass = 'w-3 h-3 rounded-sm flex items-center justify-center text-white';
    switch (type) {
      case 'client': return `${baseClass} bg-purple-500`;
      case 'program': return `${baseClass} bg-green-500`;
      case 'cohort': return `${baseClass} bg-orange-500`;
      default: return `${baseClass} bg-gray-500`;
    }
  }

  getTextClass(type: string, isLast: boolean = false): string {
    // For context items, always make them clickable (company name is shown separately)
    const baseClass = 'hover:underline transition-colors font-medium';
    switch (type) {
      case 'client': return `${baseClass} text-purple-600 hover:text-purple-800`;
      case 'program': return `${baseClass} text-green-600 hover:text-green-800`;
      case 'cohort': return `${baseClass} text-orange-600 hover:text-orange-800`;
      default: return `${baseClass} text-gray-600 hover:text-gray-800`;
    }
  }
}
