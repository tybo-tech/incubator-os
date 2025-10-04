import { Component, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CompanyService, CompanyListResponse } from '../../../../services/company.service';
import { ICompany } from '../../../../models/simple.schema';

@Component({
  selector: 'app-company-list-popup',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
         (click)="onBackdropClick($event)">
      <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col"
           (click)="$event.stopPropagation()">

        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">
              Companies in {{ industryName }}
            </h3>
            <p class="text-sm text-gray-500 mt-1">
              {{ totalCompanies }} total companies
            </p>
          </div>
          <button
            (click)="close()"
            class="text-gray-400 hover:text-gray-600 transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-auto p-6">
          @if (loading()) {
            <div class="flex justify-center items-center py-12">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span class="ml-3 text-gray-600">Loading companies...</span>
            </div>
          } @else if (error()) {
            <div class="text-center py-12">
              <div class="text-red-600 text-lg font-medium mb-2">Failed to load companies</div>
              <p class="text-red-500 mb-4">{{ error() }}</p>
              <button
                (click)="loadCompanies()"
                class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
                Try Again
              </button>
            </div>
          } @else if (companies().length === 0) {
            <div class="text-center py-12">
              <div class="text-gray-400 text-6xl mb-4">🏢</div>
              <h3 class="text-lg font-medium text-gray-900 mb-2">No companies found</h3>
              <p class="text-gray-500">This industry doesn't have any companies assigned yet.</p>
            </div>
          } @else {
            <div class="grid gap-4">
              @for (company of companies(); track company.id) {
                <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <h4 class="text-lg font-semibold text-gray-900">{{ company.name }}</h4>

                      @if (company.trading_name && company.trading_name !== company.name) {
                        <p class="text-sm text-gray-600 mt-1">Trading as: {{ company.trading_name }}</p>
                      }

                      @if (company.description) {
                        <p class="text-sm text-gray-700 mt-2">{{ company.description }}</p>
                      }

                      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-sm">
                        @if (company.registration_no) {
                          <div class="flex items-center">
                            <span class="font-medium text-gray-600 mr-2">Registration:</span>
                            <span class="text-gray-900">{{ company.registration_no }}</span>
                          </div>
                        }

                        @if (company.email_address) {
                          <div class="flex items-center">
                            <span class="font-medium text-gray-600 mr-2">Email:</span>
                            <a href="mailto:{{ company.email_address }}"
                               class="text-blue-600 hover:text-blue-800">{{ company.email_address }}</a>
                          </div>
                        }

                        @if (company.contact_number) {
                          <div class="flex items-center">
                            <span class="font-medium text-gray-600 mr-2">Phone:</span>
                            <a href="tel:{{ company.contact_number }}"
                               class="text-blue-600 hover:text-blue-800">{{ company.contact_number }}</a>
                          </div>
                        }

                        @if (company.city) {
                          <div class="flex items-center">
                            <span class="font-medium text-gray-600 mr-2">Location:</span>
                            <span class="text-gray-900">{{ company.city }}@if (company.suburb) {, {{ company.suburb }}}</span>
                          </div>
                        }

                        @if (company.permanent_employees !== undefined) {
                          <div class="flex items-center">
                            <span class="font-medium text-gray-600 mr-2">Employees:</span>
                            <span class="text-gray-900">{{ company.permanent_employees }}@if (company.temporary_employees) { + {{ company.temporary_employees }} temp}</span>
                          </div>
                        }

                        @if (company.bbbee_level) {
                          <div class="flex items-center">
                            <span class="font-medium text-gray-600 mr-2">BBBEE:</span>
                            <span class="text-gray-900">{{ company.bbbee_level }}</span>
                          </div>
                        }
                      </div>

                      <!-- Compliance indicators -->
                      <div class="flex items-center space-x-4 mt-3">
                        @if (company.has_tax_clearance) {
                          <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Tax Cleared
                          </span>
                        }
                        @if (company.has_valid_bbbbee) {
                          <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            BBBEE Valid
                          </span>
                        }
                        @if (company.is_sars_registered) {
                          <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            SARS Registered
                          </span>
                        }
                      </div>
                    </div>

                    <!-- Actions -->
                    <div class="ml-4 flex-shrink-0">
                      <button
                        (click)="viewCompanyDetails(company)"
                        class="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              }
            </div>

            <!-- Load more button if there might be more companies -->
            @if (companies().length === pageSize && companies().length < totalCompanies) {
              <div class="text-center mt-6">
                <button
                  (click)="loadMoreCompanies()"
                  [disabled]="loading()"
                  class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {{ loading() ? 'Loading...' : 'Load More Companies' }}
                </button>
              </div>
            }
          }
        </div>
      </div>
    </div>
  `
})
export class CompanyListPopupComponent implements OnInit {
  @Input() industryId!: number;
  @Input() industryName: string = '';
  @Input() totalCompanies: number = 0;
  @Output() closePopup = new EventEmitter<void>();
  @Output() companySelected = new EventEmitter<ICompany>();

  companies = signal<ICompany[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  private currentPage = 1;
  readonly pageSize = 20;

  constructor(private companyService: CompanyService) {}

  ngOnInit(): void {
    this.loadCompanies();
  }

  loadCompanies(): void {
    this.loading.set(true);
    this.error.set(null);

    this.companyService.getCompaniesByIndustry(this.industryId, {
      page: 1,
      limit: this.pageSize
    }).subscribe({
      next: (response: CompanyListResponse) => {
        this.companies.set(response.data);
        this.loading.set(false);
        this.currentPage = 1;
      },
      error: (err: any) => {
        console.error('Error loading companies:', err);
        this.error.set('Failed to load companies');
        this.loading.set(false);
      }
    });
  }

  loadMoreCompanies(): void {
    this.loading.set(true);

    this.companyService.getCompaniesByIndustry(this.industryId, {
      page: this.currentPage + 1,
      limit: this.pageSize
    }).subscribe({
      next: (response: CompanyListResponse) => {
        this.companies.update(existing => [...existing, ...response.data]);
        this.currentPage++;
        this.loading.set(false);
      },
      error: (err: any) => {
        console.error('Error loading more companies:', err);
        this.error.set('Failed to load more companies');
        this.loading.set(false);
      }
    });
  }

  viewCompanyDetails(company: ICompany): void {
    this.companySelected.emit(company);
  }

  close(): void {
    this.closePopup.emit();
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
}
