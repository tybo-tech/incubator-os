import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoryService } from '../../../services/category.service';
import { ICompany } from '../../../models/simple.schema';
import { Subject, debounceTime, distinctUntilChanged, catchError, EMPTY, takeUntil, forkJoin } from 'rxjs';

interface MinimalCompany {
  id: number;
  name: string;
  email_address?: string;
  registration_no?: string;
  contact_person?: string;
  city?: string;
  assignment_id?: number;
  joined_at?: string;
}

interface CompanyPickerData {
  available_companies: MinimalCompany[];
  assigned_companies: MinimalCompany[];
  search_term: string;
  cohort_id: number;
  program_id: number;
  client_id: number;
  total_available: number;
  total_assigned: number;
}

@Component({
  selector: 'app-category-company-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col">
      <!-- Header -->
      <div class="p-6 border-b border-gray-200 flex-shrink-0">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">Manage Companies in Cohort</h3>
            <p class="text-sm text-gray-600 mt-1">
              Add or remove companies from this cohort
            </p>
          </div>
          <button
            (click)="onClose()"
            class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Search Bar -->
      <div class="p-6 border-b border-gray-200 flex-shrink-0">
        <div class="relative">
          <input
            type="search"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearchChange($event)"
            placeholder="Search companies by name, email, registration, or contact person..."
            class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
          <svg class="absolute left-3 top-3.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </div>
      </div>

      <!-- Content Area -->
      <div class="flex-1 min-h-0 flex">
        <!-- Available Companies -->
        <div class="flex-1 p-6 border-r border-gray-200">
          <div class="flex items-center justify-between mb-4">
            <h4 class="font-medium text-gray-900">Available Companies</h4>
            <span class="text-sm text-gray-500">{{ pickerData()?.total_available || 0 }} companies</span>
          </div>

          <div class="space-y-2 overflow-y-auto max-h-96">
            @if (isLoading()) {
              <div class="space-y-2">
                @for (_ of [1,2,3,4,5]; track $index) {
                  <div class="animate-pulse h-16 bg-gray-200 rounded-lg"></div>
                }
              </div>
            } @else if (availableCompanies().length === 0) {
              <div class="text-center py-8 text-gray-500">
                @if (searchQuery()) {
                  <p>No companies found matching "{{ searchQuery() }}"</p>
                } @else {
                  <p>All companies are already assigned to this cohort</p>
                }
              </div>
            } @else {
              @for (company of availableCompanies(); track company.id) {
                <div class="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    [value]="company.id"
                    (change)="toggleCompanySelection(company.id, $event)"
                    [checked]="selectedCompanyIds().includes(company.id)"
                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  >
                  <div class="ml-3 flex-1 min-w-0">
                    <div class="text-sm font-medium text-gray-900 truncate">{{ company.name }}</div>
                    @if (company.contact_person) {
                      <div class="text-xs text-gray-600">{{ company.contact_person }}</div>
                    }
                    <div class="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                      @if (company.email_address) {
                        <span>{{ company.email_address }}</span>
                      }
                      @if (company.registration_no) {
                        <span>•</span>
                        <span>{{ company.registration_no }}</span>
                      }
                      @if (company.city) {
                        <span>•</span>
                        <span>{{ company.city }}</span>
                      }
                    </div>
                  </div>
                </div>
              }
            }
          </div>
        </div>

        <!-- Assigned Companies -->
        <div class="flex-1 p-6">
          <div class="flex items-center justify-between mb-4">
            <h4 class="font-medium text-gray-900">Assigned Companies</h4>
            <span class="text-sm text-gray-500">{{ assignedCompanies().length }} companies</span>
          </div>

          <div class="space-y-2 overflow-y-auto max-h-96">
            @if (assignedCompanies().length === 0) {
              <div class="text-center py-8 text-gray-500">
                <p>No companies assigned to this cohort yet</p>
              </div>
            } @else {
              @for (company of assignedCompanies(); track company.id) {
                <div class="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-gray-900 truncate">{{ company.name }}</div>
                    @if (company.contact_person) {
                      <div class="text-xs text-gray-600">{{ company.contact_person }}</div>
                    }
                    <div class="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                      @if (company.email_address) {
                        <span>{{ company.email_address }}</span>
                      }
                      @if (company.joined_at) {
                        <span>•</span>
                        <span>Joined {{ formatDate(company.joined_at) }}</span>
                      }
                    </div>
                  </div>
                  <button
                    (click)="removeCompany(company)"
                    [disabled]="isRemoving() === company.id"
                    class="ml-3 p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                    title="Remove from cohort"
                  >
                    @if (isRemoving() === company.id) {
                      <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    } @else {
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                    }
                  </button>
                </div>
              }
            }
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="p-6 border-t border-gray-200 flex justify-between items-center flex-shrink-0">
        <div class="text-sm text-gray-600">
          @if (selectedCompanyIds().length > 0) {
            {{ selectedCompanyIds().length }} companies selected to add
          } @else {
            Select companies to add to this cohort
          }
        </div>
        <div class="flex space-x-3">
          <button
            (click)="onClose()"
            class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          <button
            (click)="addSelectedCompanies()"
            [disabled]="selectedCompanyIds().length === 0 || isAdding()"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            @if (isAdding()) {
              <span class="flex items-center">
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Adding...
              </span>
            } @else {
              Add {{ selectedCompanyIds().length }} Companies
            }
          </button>
        </div>
      </div>
    </div>
  `
})
export class CategoryCompanyPickerComponent implements OnInit, OnDestroy {
  private categoryService = inject(CategoryService);
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  // Inputs
  @Input() cohortId!: number;
  @Input() programId?: number;
  @Input() clientId?: number;

  // Outputs
  @Output() close = new EventEmitter<void>();
  @Output() companiesChanged = new EventEmitter<void>();

  // State
  pickerData = signal<CompanyPickerData | null>(null);
  selectedCompanyIds = signal<number[]>([]);
  searchQuery = signal('');
  isLoading = signal(false);
  isAdding = signal(false);
  isRemoving = signal<number | null>(null);

  // Computed
  availableCompanies = computed(() => this.pickerData()?.available_companies || []);
  assignedCompanies = computed(() => this.pickerData()?.assigned_companies || []);

  ngOnInit(): void {
    // Setup search debouncing
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(search => this.loadCompanies(search));

    // Initial load
    this.loadCompanies();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.searchSubject.next(query);
  }

  toggleCompanySelection(companyId: number, event: any): void {
    const isChecked = event.target.checked;
    const currentSelections = this.selectedCompanyIds();

    if (isChecked) {
      this.selectedCompanyIds.set([...currentSelections, companyId]);
    } else {
      this.selectedCompanyIds.set(currentSelections.filter(id => id !== companyId));
    }
  }

  addSelectedCompanies(): void {
    const companyIds = this.selectedCompanyIds();
    if (companyIds.length === 0) return;

    this.isAdding.set(true);

    // Use the CategoryService to add companies
    const requests = companyIds.map(companyId =>
      this.categoryService.attachCompany(this.cohortId, companyId).pipe(
        catchError(error => {
          console.error('Failed to attach company', companyId, error);
          return EMPTY;
        })
      )
    );

    // Execute all requests
    import('rxjs').then(({ forkJoin }) => {
      forkJoin(requests).subscribe({
        next: () => {
          this.isAdding.set(false);
          this.selectedCompanyIds.set([]);
          this.companiesChanged.emit();
          this.loadCompanies(this.searchQuery()); // Refresh data
        },
        error: (error) => {
          console.error('Failed to add companies:', error);
          this.isAdding.set(false);
        }
      });
    });
  }

  removeCompany(company: MinimalCompany): void {
    this.isRemoving.set(company.id);

    this.categoryService.detachCompany(this.cohortId, company.id).pipe(
      catchError(error => {
        console.error('Failed to remove company:', error);
        this.isRemoving.set(null);
        return EMPTY;
      })
    ).subscribe(() => {
      this.isRemoving.set(null);
      this.companiesChanged.emit();
      this.loadCompanies(this.searchQuery()); // Refresh data
    });
  }

  onClose(): void {
    this.close.emit();
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  private loadCompanies(search: string = ''): void {
    this.isLoading.set(true);

    this.categoryService.getCompaniesForPicker(
      this.cohortId,
      this.programId,
      this.clientId,
      search
    ).pipe(
      catchError(error => {
        console.error('Failed to load companies:', error);
        this.isLoading.set(false);
        return EMPTY;
      })
    ).subscribe((data: CompanyPickerData) => {
      this.pickerData.set(data);
      this.isLoading.set(false);
      // Clear selections when data refreshes
      this.selectedCompanyIds.set([]);
    });
  }
}
