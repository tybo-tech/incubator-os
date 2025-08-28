import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CompanyItem {
  id: number;
  name: string;
  email_address?: string | null;
  registration_no?: string | null;
  contact_person?: string | null;
  contact_number?: string | null;
  city?: string | null;
  industry?: string | null;
  assignment_id?: number;
  status?: string;
  joined_at?: string;
}

@Component({
  selector: 'app-company-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-2xl border shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
         (click)="onCardClick()">
      <div class="p-6">
        <div class="flex items-start justify-between mb-4">
          <div class="flex-1 min-w-0">
            <h3 class="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
              {{ company.name }}
            </h3>
            @if (company.contact_person) {
              <p class="text-sm text-gray-600 mt-1">
                Contact: {{ company.contact_person }}
              </p>
            }
          </div>

          <!-- Status Badge -->
          @if (company.status) {
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  [class]="getStatusClasses(company.status)">
              {{ company.status | titlecase }}
            </span>
          }
        </div>

        <!-- Company Details -->
        <div class="space-y-1 text-sm text-gray-600">
          @if (company.email_address) {
            <div class="flex items-center space-x-2">
              <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
              </svg>
              <span>{{ company.email_address }}</span>
            </div>
          }

          @if (company.registration_no) {
            <div class="flex items-center space-x-2">
              <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
              </svg>
              <span>Reg: {{ company.registration_no }}</span>
            </div>
          }

          <div class="flex items-center justify-between text-xs text-gray-500 mt-3">
            @if (company.city) {
              <span>{{ company.city }}</span>
            }
            @if (company.joined_at) {
              <span>Joined {{ formatDate(company.joined_at) }}</span>
            }
          </div>
        </div>

        <!-- Action Button -->
        <div class="mt-4 flex justify-end">
          <button
            (click)="onRemoveClick($event)"
            class="text-red-600 hover:text-red-700 text-sm font-medium transition-colors"
          >
            Remove from cohort
          </button>
        </div>
      </div>
    </div>
  `
})
export class CompanyCardComponent {
  @Input() company!: CompanyItem;
  @Output() cardClick = new EventEmitter<CompanyItem>();
  @Output() removeClick = new EventEmitter<CompanyItem>();

  onCardClick(): void {
    this.cardClick.emit(this.company);
  }

  onRemoveClick(event: Event): void {
    event.stopPropagation(); // Prevent card click
    this.removeClick.emit(this.company);
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

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
}
