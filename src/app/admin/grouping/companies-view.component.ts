import { Component, inject, OnInit, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoryService } from '../../../services/category.service';
import { GroupingStateService } from './grouping-state.service';
import { ICompany } from '../../../models/simple.schema';
import { catchError, EMPTY } from 'rxjs';

@Component({
  selector: 'app-companies-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200">
        <div class="flex justify-between items-center">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Companies</h2>
            <p class="text-sm text-gray-600 mt-1">{{ getContextDescription() }}</p>
          </div>
          <div class="text-right">
            @if (!isLoading() && companies().length > 0) {
              <div class="text-2xl font-bold text-blue-600">{{ companies().length }}</div>
              <div class="text-xs text-gray-500">Total</div>
            }
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="p-6">
        <!-- Loading State -->
        @if (isLoading()) {
          <div class="space-y-4">
            @for (_ of [1,2,3,4,5]; track $index) {
              <div class="animate-pulse">
                <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div class="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            }
          </div>
        }

        <!-- Error State -->
        @if (error()) {
          <div class="text-center py-8">
            <div class="text-red-500 text-4xl mb-4">⚠️</div>
            <div class="text-red-800 font-medium mb-2">Failed to load companies</div>
            <div class="text-red-600 text-sm mb-4">{{ error() }}</div>
            <button
              (click)="loadCompanies()"
              class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        }

        <!-- Empty State -->
        @if (!isLoading() && !error() && companies().length === 0) {
          <div class="text-center py-16">
            @if (hasSelection()) {
              <div class="text-gray-400 text-6xl mb-4">🏢</div>
              <h3 class="text-lg font-medium text-gray-900 mb-2">No companies found</h3>
              <p class="text-gray-600">No companies are attached to the selected {{ getSelectionType() }}</p>
            } @else {
              <div class="text-gray-400 text-6xl mb-4">🎯</div>
              <h3 class="text-lg font-medium text-gray-900 mb-2">Select a scope</h3>
              <p class="text-gray-600">Pick a Client, Program, or Cohort to view companies</p>
            }
          </div>
        }

        <!-- Companies Table -->
        @if (!isLoading() && !error() && companies().length > 0) {
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                @for (company of paginatedCompanies(); track company.id) {
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div class="text-sm font-medium text-gray-900">
                          {{ company.name }}
                        </div>
                        @if (company.trading_name && company.trading_name !== company.name) {
                          <div class="text-sm text-gray-500">
                            Trading as: {{ company.trading_name }}
                          </div>
                        }
                        @if (company.registration_no) {
                          <div class="text-xs text-gray-400">
                            Reg: {{ company.registration_no }}
                          </div>
                        }
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm text-gray-900">
                        @if (company.email_address) {
                          <a [href]="'mailto:' + company.email_address" class="text-blue-600 hover:text-blue-700">
                            {{ company.email_address }}
                          </a>
                        } @else {
                          <span class="text-gray-400">No email</span>
                        }
                      </div>
                      @if (company.contact_number) {
                        <div class="text-sm text-gray-500">
                          {{ company.contact_number }}
                        </div>
                      }
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm text-gray-900">
                        @if (company.city) {
                          {{ company.city }}
                          @if (company.suburb) {
                            <span class="text-gray-500">, {{ company.suburb }}</span>
                          }
                        } @else {
                          <span class="text-gray-400">Not specified</span>
                        }
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex flex-col gap-1">
                        @if (company.cipc_status) {
                          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {{ company.cipc_status }}
                          </span>
                        }
                        @if (company.bbbee_level) {
                          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            BBBEE: {{ company.bbbee_level }}
                          </span>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          @if (companies().length > pageSize()) {
            <div class="mt-6 flex items-center justify-between">
              <div class="text-sm text-gray-700">
                Showing {{ (currentPage() - 1) * pageSize() + 1 }} to
                {{ Math.min(currentPage() * pageSize(), companies().length) }} of
                {{ companies().length }} results
              </div>
              <div class="flex space-x-2">
                <button
                  (click)="goToPage(currentPage() - 1)"
                  [disabled]="currentPage() === 1"
                  class="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>

                @for (page of getPageNumbers(); track page) {
                  <button
                    (click)="goToPage(page)"
                    [class.bg-blue-600]="page === currentPage()"
                    [class.text-white]="page === currentPage()"
                    [class.bg-white]="page !== currentPage()"
                    [class.text-gray-700]="page !== currentPage()"
                    class="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {{ page }}
                  </button>
                }

                <button
                  (click)="goToPage(currentPage() + 1)"
                  [disabled]="currentPage() === totalPages()"
                  class="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          }
        }
      </div>
    </div>
  `
})
export class CompaniesViewComponent implements OnInit {
  private categoryService = inject(CategoryService);
  private groupingState = inject(GroupingStateService);

  // State
  isLoading = signal(false);
  error = signal<string | null>(null);
  companies = signal<ICompany[]>([]);

  // Pagination
  currentPage = signal(1);
  pageSize = signal(10);

  // Computed
  totalPages = computed(() => Math.ceil(this.companies().length / this.pageSize()));

  paginatedCompanies = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    const end = start + this.pageSize();
    return this.companies().slice(start, end);
  });

  private context = this.groupingState.context;

  constructor() {
    // Load companies when context changes
    effect(() => {
      const ctx = this.context();
      this.currentPage.set(1); // Reset to first page
      this.loadCompanies();
    });
  }

  ngOnInit(): void {
    this.loadCompanies();
  }

  hasSelection(): boolean {
    const ctx = this.context();
    return !!(ctx.clientId || ctx.programId || ctx.cohortId);
  }

  getSelectionType(): string {
    const ctx = this.context();
    if (ctx.cohortId) return 'cohort';
    if (ctx.programId) return 'program';
    if (ctx.clientId) return 'client';
    return '';
  }

  getContextDescription(): string {
    const ctx = this.context();
    if (ctx.cohortId) {
      return 'Companies in the selected cohort';
    } else if (ctx.programId) {
      return 'Companies across all cohorts in the selected program';
    } else if (ctx.clientId) {
      return 'Companies across all programs and cohorts for the selected client';
    } else {
      return 'Select a client, program, or cohort to view companies';
    }
  }

  loadCompanies(): void {
    const ctx = this.context();

    if (!ctx.clientId && !ctx.programId && !ctx.cohortId) {
      this.companies.set([]);
      this.isLoading.set(false);
      this.error.set(null);
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    let loadObservable;

    if (ctx.cohortId) {
      loadObservable = this.categoryService.listCompaniesInCohort(ctx.cohortId);
    } else if (ctx.programId) {
      loadObservable = this.categoryService.listCompaniesInProgram(ctx.programId);
    } else if (ctx.clientId) {
      loadObservable = this.categoryService.listCompaniesUnderClient(ctx.clientId);
    } else {
      this.companies.set([]);
      this.isLoading.set(false);
      return;
    }

    loadObservable
      .pipe(
        catchError(error => {
          console.error('Failed to load companies:', error);
          this.error.set(error.message || 'Failed to load companies');
          return EMPTY;
        })
      )
      .subscribe(companies => {
        this.companies.set(companies);
        this.isLoading.set(false);
      });
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages = [];

    // Show max 5 page numbers
    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + 4);

    // Adjust start if we're near the end
    if (end - start < 4) {
      start = Math.max(1, end - 4);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  // Make Math available in template
  Math = Math;
}
