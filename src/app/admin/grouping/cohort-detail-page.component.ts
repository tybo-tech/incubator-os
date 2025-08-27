import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CategoryService } from '../../../services/category.service';
import { TopBarContextComponent } from './top-bar-context.component';
import { GroupingStateService } from './grouping-state.service';
import { ICategory, ICompany } from '../../../models/simple.schema';
import { catchError, EMPTY, forkJoin } from 'rxjs';

@Component({
  selector: 'app-cohort-detail-page',
  standalone: true,
  imports: [CommonModule, FormsModule, TopBarContextComponent],
  template: `
    <div class="min-h-screen bg-gray-50">
      <app-top-bar-context />

      <div class="max-w-7xl mx-auto px-6 py-8">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex justify-between items-start">
            <div>
              <h1 class="text-3xl font-bold text-gray-900">
                @if (cohort()) {
                  {{ cohort()?.name }}
                } @else {
                  Cohort Details
                }
              </h1>
              <p class="text-gray-600 mt-1">Manage companies in this cohort</p>

              @if (cohort()?.description) {
                <p class="text-gray-700 mt-2">{{ cohort()?.description }}</p>
              }
            </div>

            <div class="text-right">
              <div class="text-3xl font-bold text-blue-600">{{ companies().length }}</div>
              <div class="text-sm text-gray-600">Companies</div>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        @if (isLoading()) {
          <div class="bg-white rounded-2xl shadow-sm p-6">
            <div class="animate-pulse">
              <div class="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div class="space-y-3">
                @for (_ of [1,2,3,4,5]; track $index) {
                  <div class="h-12 bg-gray-200 rounded"></div>
                }
              </div>
            </div>
          </div>
        }

        <!-- Error State -->
        @if (error()) {
          <div class="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <div class="text-red-800 font-medium mb-2">Failed to load cohort data</div>
            <div class="text-red-600 text-sm mb-4">{{ error() }}</div>
            <button
              (click)="loadData()"
              class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        }

        @if (!isLoading() && !error()) {
          <!-- Attach Company Section -->
          <div class="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Attach Company</h2>

            <form (ngSubmit)="attachCompany()" #attachForm="ngForm" class="flex gap-4 items-end">
              <div class="flex-1">
                <label for="company-id" class="block text-sm font-medium text-gray-700 mb-1">
                  Company ID
                </label>
                <input
                  id="company-id"
                  type="number"
                  [(ngModel)]="attachCompanyId"
                  name="companyId"
                  required
                  min="1"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter company ID"
                />
              </div>
              <button
                type="submit"
                class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                [disabled]="isAttaching() || attachForm.invalid"
              >
                @if (isAttaching()) {
                  <span class="inline-flex items-center">
                    <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Attaching...
                  </span>
                } @else {
                  Attach Company
                }
              </button>
            </form>

            @if (attachError()) {
              <div class="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {{ attachError() }}
              </div>
            }

            @if (attachSuccess()) {
              <div class="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                Company attached successfully!
              </div>
            }
          </div>

          <!-- Companies Table -->
          <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-200">
              <h2 class="text-lg font-semibold text-gray-900">Companies in Cohort</h2>
            </div>

            @if (companies().length === 0) {
              <div class="text-center py-16">
                <div class="text-gray-400 text-6xl mb-4">🏢</div>
                <h3 class="text-lg font-medium text-gray-900 mb-2">No companies attached</h3>
                <p class="text-gray-600">Attach your first company using the form above</p>
              </div>
            } @else {
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
                        Registration
                      </th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    @for (company of companies(); track company.id) {
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
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {{ company.registration_no || 'N/A' }}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            (click)="confirmDetach(company)"
                            class="text-red-600 hover:text-red-700 transition-colors"
                            [disabled]="isDetaching() === company.id"
                          >
                            @if (isDetaching() === company.id) {
                              <span class="inline-flex items-center">
                                <svg class="animate-spin -ml-1 mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24">
                                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Detaching...
                              </span>
                            } @else {
                              Detach
                            }
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        }

        <!-- Confirm Detach Modal -->
        @if (showDetachModal()) {
          <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
              <div class="p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Confirm Detach</h3>
                <p class="text-gray-600 mb-6">
                  Are you sure you want to detach
                  <strong>{{ companyToDetach()?.name }}</strong>
                  from this cohort?
                </p>

                <div class="flex justify-end space-x-3">
                  <button
                    (click)="cancelDetach()"
                    class="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    (click)="detachCompany()"
                    class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Detach Company
                  </button>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class CohortDetailPageComponent implements OnInit {
  private categoryService = inject(CategoryService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private groupingState = inject(GroupingStateService);

  // State
  isLoading = signal(false);
  error = signal<string | null>(null);
  cohort = signal<ICategory | null>(null);
  companies = signal<ICompany[]>([]);

  // Attach company state
  attachCompanyId: number | null = null;
  isAttaching = signal(false);
  attachError = signal<string | null>(null);
  attachSuccess = signal(false);

  // Detach company state
  isDetaching = signal<number | null>(null);
  showDetachModal = signal(false);
  companyToDetach = signal<ICompany | null>(null);

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const cohortId = +params['cohortId'];
      if (cohortId) {
        this.groupingState.updateContext({ cohortId });
        this.loadData();
      }
    });
  }

  loadData(): void {
    const context = this.groupingState.context();
    const cohortId = context.cohortId;

    if (!cohortId) {
      this.error.set('No cohort selected');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    // Load cohort info and companies
    forkJoin({
      cohort: this.categoryService.getCategoryById(cohortId),
      companies: this.categoryService.listCompaniesInCohort(cohortId)
    })
    .pipe(
      catchError(error => {
        console.error('Failed to load cohort data:', error);
        this.error.set(error.message || 'Failed to load cohort data');
        return EMPTY;
      })
    )
    .subscribe(({ cohort, companies }) => {
      this.cohort.set(cohort);
      this.companies.set(companies);
      this.isLoading.set(false);
    });
  }

  attachCompany(): void {
    const cohortId = this.cohort()?.id;
    const companyId = this.attachCompanyId;

    if (!cohortId || !companyId) return;

    this.isAttaching.set(true);
    this.attachError.set(null);
    this.attachSuccess.set(false);

    this.categoryService.attachCompany(cohortId, companyId)
      .pipe(
        catchError(error => {
          console.error('Failed to attach company:', error);
          this.attachError.set(error.message || 'Failed to attach company');
          return EMPTY;
        })
      )
      .subscribe(() => {
        this.isAttaching.set(false);
        this.attachSuccess.set(true);
        this.attachCompanyId = null;
        this.loadData(); // Refresh companies list

        // Clear success message after 3 seconds
        setTimeout(() => this.attachSuccess.set(false), 3000);
      });
  }

  confirmDetach(company: ICompany): void {
    this.companyToDetach.set(company);
    this.showDetachModal.set(true);
  }

  cancelDetach(): void {
    this.companyToDetach.set(null);
    this.showDetachModal.set(false);
  }

  detachCompany(): void {
    const cohortId = this.cohort()?.id;
    const company = this.companyToDetach();

    if (!cohortId || !company) return;

    this.isDetaching.set(company.id);
    this.showDetachModal.set(false);

    this.categoryService.detachCompany(cohortId, company.id)
      .pipe(
        catchError(error => {
          console.error('Failed to detach company:', error);
          return EMPTY;
        })
      )
      .subscribe(() => {
        this.isDetaching.set(null);
        this.companyToDetach.set(null);
        this.loadData(); // Refresh companies list
      });
  }
}
