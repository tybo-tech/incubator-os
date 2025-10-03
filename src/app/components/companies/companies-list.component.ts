import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CompanyService } from '../../../services/company.service';
import { ICompany } from '../../../models/simple.schema';
import { CategoryService } from '../../../services/category.service';
import { catchError, EMPTY, firstValueFrom } from 'rxjs';

interface CompanyWithStatus extends ICompany {
  status?: 'active' | 'completed' | 'pending';
  lastActivity?: Date;
  progressPercentage?: number;
}

interface BreadcrumbContext {
  clientId: number;
  clientName: string;
  programId: number;
  programName: string;
  cohortId: number;
  cohortName: string;
}

@Component({
  selector: 'app-companies-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-7xl mx-auto px-6 py-8">
        <!-- Breadcrumb -->
        <nav class="flex mb-6" aria-label="Breadcrumb">
          <ol class="flex items-center space-x-4">
            <li>
              <button
                (click)="navigateToClients()"
                class="text-blue-600 hover:text-blue-800 transition-colors">
                Clients
              </button>
            </li>
            <li class="flex items-center">
              <svg class="w-5 h-5 text-gray-400 mx-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
              </svg>
              <button
                (click)="navigateToPrograms()"
                class="text-blue-600 hover:text-blue-800 transition-colors">
                {{ context()?.clientName || 'Client' }}
              </button>
            </li>
            <li class="flex items-center">
              <svg class="w-5 h-5 text-gray-400 mx-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
              </svg>
              <button
                (click)="navigateToCohorts()"
                class="text-blue-600 hover:text-blue-800 transition-colors">
                {{ context()?.programName || 'Program' }}
              </button>
            </li>
            <li class="flex items-center">
              <svg class="w-5 h-5 text-gray-400 mx-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
              </svg>
              <span class="text-gray-900 font-medium">{{ context()?.cohortName || 'Cohort' }}</span>
            </li>
          </ol>
        </nav>

        <!-- Header -->
        <div class="mb-8">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold text-gray-900">Companies</h1>
              <p class="text-gray-600 mt-2">Manage companies in {{ context()?.cohortName }}</p>
            </div>
            <div class="flex space-x-3">
              <button
                (click)="openAddExistingModal()"
                class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                Add Existing
              </button>
              <button
                (click)="openCreateModal()"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                Create New
              </button>
            </div>
          </div>

          <!-- Filter Tabs -->
          <div class="flex space-x-1 mt-6 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              *ngFor="let filter of filterTabs"
              (click)="activeFilter.set(filter.key)"
              [class]="activeFilter() === filter.key ?
                'bg-white text-blue-600 shadow-sm' :
                'text-gray-600 hover:text-gray-900'"
              class="px-4 py-2 rounded-md text-sm font-medium transition-colors">
              {{ filter.label }}
              <span class="ml-2 px-2 py-1 text-xs rounded-full"
                    [class]="activeFilter() === filter.key ? 'bg-blue-100' : 'bg-gray-200'">
                {{ getFilterCount(filter.key) }}
              </span>
            </button>
          </div>

          <!-- Search -->
          <div *ngIf="companies().length > 5" class="mt-4">
            <input
              type="text"
              placeholder="Search companies..."
              [(ngModel)]="searchQuery"
              (input)="onSearchChange()"
              class="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>
        </div>

        <!-- Loading State -->
        <div *ngIf="isLoading()" class="flex justify-center items-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span class="ml-3 text-gray-600">Loading companies...</span>
        </div>

        <!-- Error State -->
        <div *ngIf="error()" class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div class="text-red-600 text-lg font-medium mb-2">Failed to load companies</div>
          <p class="text-red-500 mb-4">{{ error() }}</p>
          <button
            (click)="loadCompanies()"
            class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
            Try Again
          </button>
        </div>

        <!-- Empty State -->
        <div *ngIf="!isLoading() && !error() && filteredCompanies().length === 0"
             class="text-center py-12">
          <div class="text-gray-400 text-6xl mb-4">🏢</div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">
            {{ companies().length === 0 ? 'No companies yet' : 'No companies found' }}
          </h3>
          <p class="text-gray-500 mb-6">
            {{ companies().length === 0 ? 'Add companies to this cohort to get started.' : 'Try adjusting your search or filter criteria.' }}
          </p>
          <div *ngIf="companies().length === 0" class="flex justify-center space-x-3">
            <button
              (click)="openAddExistingModal()"
              class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              Add Existing Company
            </button>
            <button
              (click)="openCreateModal()"
              class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Create New Company
            </button>
          </div>
        </div>

        <!-- Companies List -->
        <div *ngIf="!isLoading() && !error() && filteredCompanies().length > 0"
             class="bg-white rounded-lg shadow">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Activity
                  </th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr *ngFor="let company of filteredCompanies()"
                    class="hover:bg-gray-50 cursor-pointer"
                    (click)="navigateToCompany(company)">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div class="flex-shrink-0 h-10 w-10">
                        <div class="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span class="text-blue-600 font-medium text-sm">
                            {{ company.name.charAt(0).toUpperCase() }}
                          </span>
                        </div>
                      </div>
                      <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">{{ company.name }}</div>
                        <div *ngIf="company.trading_name" class="text-sm text-gray-500">{{ company.trading_name }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                          [class]="getStatusClass(company.status)">
                      {{ getStatusLabel(company.status) }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div class="w-full bg-gray-200 rounded-full h-2 mr-3">
                        <div class="bg-blue-600 h-2 rounded-full"
                             [style.width.%]="company.progressPercentage || 0"></div>
                      </div>
                      <span class="text-sm text-gray-900">{{ company.progressPercentage || 0 }}%</span>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ formatLastActivity(company.lastActivity) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      (click)="editCompany(company, $event)"
                      class="text-blue-600 hover:text-blue-900 mr-3">
                      Edit
                    </button>
                    <button
                      (click)="removeFromCohort(company, $event)"
                      class="text-red-600 hover:text-red-900">
                      Remove
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Create Company Modal -->
        <div *ngIf="showCreateModal()"
             class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div class="px-6 py-4 border-b border-gray-200">
              <h3 class="text-lg font-semibold text-gray-900">Create New Company</h3>
            </div>

            <div class="px-6 py-4">
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    [(ngModel)]="createForm.name"
                    placeholder="Enter company name"
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Trading Name (Optional)</label>
                  <input
                    type="text"
                    [(ngModel)]="createForm.industry"
                    placeholder="Enter trading name"
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
              </div>
            </div>

            <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                (click)="closeCreateModal()"
                class="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                (click)="createCompany()"
                [disabled]="isCreating() || !createForm.name.trim()"
                class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50">
                {{ isCreating() ? 'Creating...' : 'Create Company' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Add Existing Company Modal -->
        <div *ngIf="showAddExistingModal()"
             class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-200">
              <h3 class="text-lg font-semibold text-gray-900">Add Existing Company</h3>
            </div>

            <div class="px-6 py-4">
              <input
                type="text"
                [(ngModel)]="existingCompanySearch"
                (input)="searchExistingCompanies()"
                placeholder="Search companies..."
                class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4">

              <div class="max-h-60 overflow-y-auto">
                <div *ngFor="let company of availableCompanies()"
                     class="flex items-center justify-between p-3 border border-gray-200 rounded mb-2 hover:bg-gray-50">
                  <div>
                    <div class="font-medium">{{ company.name }}</div>
                    <div *ngIf="company.trading_name" class="text-sm text-gray-500">{{ company.trading_name }}</div>
                  </div>
                  <button
                    (click)="addExistingCompany(company)"
                    [disabled]="isAddingExisting()"
                    class="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors disabled:opacity-50">
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div class="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                (click)="closeAddExistingModal()"
                class="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class CompaniesListComponent implements OnInit {
  companies = signal<CompanyWithStatus[]>([]);
  availableCompanies = signal<ICompany[]>([]);
  context = signal<BreadcrumbContext | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);
  searchQuery = '';
  existingCompanySearch = '';
  activeFilter = signal<string>('all');

  // Modal state
  showCreateModal = signal(false);
  showAddExistingModal = signal(false);
  isCreating = signal(false);
  isAddingExisting = signal(false);

  createForm = {
    name: '',
    industry: ''
  };

  filterTabs = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' },
    { key: 'pending', label: 'Pending' }
  ];

  // Computed
  filteredCompanies = computed(() => {
    let companies = this.companies();

    // Apply status filter
    if (this.activeFilter() !== 'all') {
      companies = companies.filter(company => company.status === this.activeFilter());
    }

    // Apply search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      companies = companies.filter(company =>
        company.name.toLowerCase().includes(query) ||
        (company.trading_name && company.trading_name.toLowerCase().includes(query))
      );
    }

    return companies;
  });

  constructor(
    private companyService: CompanyService,
    private categoryService: CategoryService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['cohortId']) {
        this.context.set({
          clientId: +params['clientId'],
          clientName: params['clientName'],
          programId: +params['programId'],
          programName: params['programName'],
          cohortId: +params['cohortId'],
          cohortName: params['cohortName']
        });
        this.loadCompanies();
      }
    });
  }

  loadCompanies(): void {
    const ctx = this.context();
    if (!ctx) return;

    this.isLoading.set(true);
    this.error.set(null);

    this.categoryService.listCompaniesInCohort(ctx.cohortId)
      .pipe(
        catchError(error => {
          this.error.set(error.message || 'Failed to load companies');
          this.isLoading.set(false);
          return EMPTY;
        })
      )
      .subscribe((companies: ICompany[]) => {
        // Transform companies with status and progress
        const companiesWithStatus: CompanyWithStatus[] = companies.map((company: ICompany) => ({
          ...company,
          status: this.calculateStatus(company),
          lastActivity: new Date(), // This would come from actual data
          progressPercentage: Math.floor(Math.random() * 100) // This would be calculated from actual progress
        }));

        this.companies.set(companiesWithStatus);
        this.isLoading.set(false);
      });
  }

  searchExistingCompanies(): void {
    if (!this.existingCompanySearch.trim()) {
      this.availableCompanies.set([]);
      return;
    }

    // Load all companies not in current cohort
    this.companyService.searchCompanies({ name: this.existingCompanySearch })
      .pipe(
        catchError(() => {
          this.availableCompanies.set([]);
          return EMPTY;
        })
      )
      .subscribe((companies: ICompany[]) => {
        // Filter out companies already in this cohort
        const currentCompanyIds = this.companies().map(c => c.id);
        const available = companies.filter((c: ICompany) => !currentCompanyIds.includes(c.id));
        this.availableCompanies.set(available);
      });
  }

  calculateStatus(company: ICompany): 'active' | 'completed' | 'pending' {
    // This would be based on actual business logic
    const random = Math.random();
    if (random < 0.3) return 'completed';
    if (random < 0.7) return 'active';
    return 'pending';
  }

  getFilterCount(filter: string): number {
    const companies = this.companies();
    if (filter === 'all') return companies.length;
    return companies.filter(c => c.status === filter).length;
  }

  getStatusClass(status?: string): string {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusLabel(status?: string): string {
    switch (status) {
      case 'active': return 'Active';
      case 'completed': return 'Completed';
      case 'pending': return 'Pending';
      default: return 'Unknown';
    }
  }

  formatLastActivity(date?: Date): string {
    if (!date) return 'No activity';

    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  }

  navigateToClients(): void {
    this.router.navigate(['/admin/clients']);
  }

  navigateToPrograms(): void {
    const ctx = this.context();
    if (ctx) {
      this.router.navigate(['/admin/clients', ctx.clientId, 'programs']);
    }
  }

  navigateToCohorts(): void {
    const ctx = this.context();
    if (ctx) {
      this.router.navigate(['/admin/clients', ctx.clientId, 'programs', ctx.programId, 'cohorts']);
    }
  }

  navigateToCompany(company: CompanyWithStatus): void {
    this.router.navigate(['/financial-check-in', company.id]);
  }

  onSearchChange(): void {
    // Triggering change detection for computed signal
  }

  editCompany(company: CompanyWithStatus, event: Event): void {
    event.stopPropagation();
    // Navigate to company edit page
    this.router.navigate(['/admin/companies', company.id, 'edit']);
  }

  removeFromCohort(company: CompanyWithStatus, event: Event): void {
    event.stopPropagation();

    if (confirm(`Are you sure you want to remove ${company.name} from this cohort?`)) {
      const ctx = this.context();
      if (!ctx) return;

      this.categoryService.detachCompany(ctx.cohortId, company.id)
        .subscribe(() => {
          this.loadCompanies(); // Refresh the list
        });
    }
  }

  openCreateModal(): void {
    this.createForm = { name: '', industry: '' };
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.isCreating.set(false);
  }

  openAddExistingModal(): void {
    this.existingCompanySearch = '';
    this.availableCompanies.set([]);
    this.showAddExistingModal.set(true);
  }

  closeAddExistingModal(): void {
    this.showAddExistingModal.set(false);
    this.isAddingExisting.set(false);
  }

  createCompany(): void {
    if (!this.createForm.name.trim()) return;

    const ctx = this.context();
    if (!ctx) return;

    this.isCreating.set(true);

    const companyData = {
      name: this.createForm.name.trim(),
      trading_name: this.createForm.industry.trim() || undefined
    };

    this.companyService.addCompany(companyData)
      .pipe(
        catchError(error => {
          console.error('Failed to create company:', error);
          this.isCreating.set(false);
          return EMPTY;
        })
      )
      .subscribe((company: ICompany) => {
        // Add the new company to the cohort
        this.categoryService.attachCompany(ctx.cohortId, company.id)
          .subscribe(() => {
            this.isCreating.set(false);
            this.closeCreateModal();
            this.loadCompanies(); // Refresh the list
          });
      });
  }

  addExistingCompany(company: ICompany): void {
    const ctx = this.context();
    if (!ctx) return;

    this.isAddingExisting.set(true);

    this.categoryService.attachCompany(ctx.cohortId, company.id)
      .subscribe(() => {
        this.isAddingExisting.set(false);
        this.loadCompanies(); // Refresh the list

        // Remove from available list
        const current = this.availableCompanies();
        this.availableCompanies.set(current.filter(c => c.id !== company.id));
      });
  }
}
