import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompanyModalComponent } from './company-modal/company-modal.component';
import { CompanyFormModalComponent } from './company-form-modal/company-form-modal.component';
import { RichCompanyCardComponent } from '../../admin/overview/components/rich-company-card.component';
import { CompanyService, CompanyListOptions, CompanyListResponse } from '../../../services/company.service';
import { ICompany } from '../../../models/simple.schema';
import { Router } from '@angular/router';
import { catchError, EMPTY, debounceTime, distinctUntilChanged } from 'rxjs';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-companies',
  standalone: true,
  imports: [CommonModule, FormsModule, CompanyModalComponent, CompanyFormModalComponent, RichCompanyCardComponent],
  templateUrl: './companies.component.html',
  styleUrl: './companies.component.scss',
})
export class CompaniesComponent implements OnInit {
  // State management with signals
  companies = signal<ICompany[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);

  // Pagination state
  currentPage = signal(1);
  totalPages = signal(1);
  totalCompanies = signal(0);
  pageSize = 20;

  // Search and filter state
  searchQuery = signal('');
  selectedIndustry = signal<number | null>(null);

  // Modal state
  selectedCompany: ICompany | null = null;
  isModalOpen = false;
  isFormModalOpen = false;
  editMode = false;
  companyToEdit: ICompany | null = null;

  // Search debouncing
  private searchSubject = new Subject<string>();

  constructor(private companyService: CompanyService, private router: Router) {
    // Setup search debouncing
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.searchQuery.set(query);
      this.currentPage.set(1);
      this.loadCompanies();
    });
  }

  ngOnInit() {
    this.loadCompanies();
  }

  loadCompanies() {
    this.isLoading.set(true);
    this.error.set(null);

    const options: CompanyListOptions = {
      page: this.currentPage(),
      limit: this.pageSize,
      search: this.searchQuery() || undefined,
      industry_id: this.selectedIndustry() || undefined
    };

    this.companyService.searchCompaniesAdvanced(options).pipe(
      catchError(err => {
        console.error('Error fetching companies:', err);
        this.error.set('Failed to load companies. Please try again.');
        this.isLoading.set(false);
        return EMPTY;
      })
    ).subscribe((response: CompanyListResponse) => {
      // Map the API response to match the expected interface
      const mappedCompanies: ICompany[] = response.data.map((company: any) => ({
        ...company,
        sector_name: company.service_offering, // Map service_offering to sector_name for display
      }));

      this.companies.set(mappedCompanies);

      // Update pagination state with real backend data
      if (response.pagination) {
        this.totalPages.set(response.pagination.pages);
        this.totalCompanies.set(response.pagination.total);
        this.currentPage.set(response.pagination.page);
      }

      this.isLoading.set(false);
    });
  }

  // Search handling
  onSearchInput(event: any) {
    this.searchSubject.next(event.target.value);
  }

  clearSearch() {
    this.searchQuery.set('');
    this.searchSubject.next('');
  }

  // Industry filter handling
  onIndustryFilterChange(event: any) {
    const industryId = event.target.value ? parseInt(event.target.value) : null;
    this.selectedIndustry.set(industryId);
    this.currentPage.set(1);
    this.loadCompanies();
  }

  // Page size handling
  onPageSizeChange(event: any) {
    this.pageSize = parseInt(event.target.value);
    this.currentPage.set(1); // Reset to first page when changing page size
    this.loadCompanies();
  }

  // Pagination
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadCompanies();
    }
  }

  goToPrevious() {
    this.goToPage(this.currentPage() - 1);
  }

  goToNext() {
    this.goToPage(this.currentPage() + 1);
  }

  // Computed properties
  displayedCompanies = computed(() => this.companies());
  hasCompanies = computed(() => this.companies().length > 0);
  showPagination = computed(() => this.totalPages() > 1);

  // TrackBy function for performance
  trackByCompany(index: number, company: ICompany): number {
    return company.id;
  }

  trackByPageNum(index: number, pageNum: number): number {
    return pageNum;
  }

  openCompanyModal(company: ICompany) {
    this.selectedCompany = company;
    this.isModalOpen = true;
      this.router.navigate(['/companies', company.id]);
  }

  closeCompanyModal() {
    this.selectedCompany = null;
    this.isModalOpen = false;
  }

  // Company Form Modal Methods
  openAddCompanyModal() {
    this.editMode = false;
    this.companyToEdit = null;
    this.isFormModalOpen = true;

  }

  openEditCompanyModal(company: ICompany) {
    // this.editMode = true;
    // this.companyToEdit = company;
    // this.isFormModalOpen = true;

    //companies/1
    this.router.navigate(['/companies', company.id]);
  }

  closeFormModal() {
    this.isFormModalOpen = false;
    this.editMode = false;
    this.companyToEdit = null;
  }

  onCompanySaved(company: ICompany) {
    const currentCompanies = this.companies();

    if (this.editMode) {
      // Update existing company in list
      const index = currentCompanies.findIndex((c: ICompany) => c.id === company.id);
      if (index !== -1) {
        const updatedCompanies = [...currentCompanies];
        updatedCompanies[index] = company;
        this.companies.set(updatedCompanies);
      }
    } else {
      // Add new company to list
      const updatedCompanies = [company, ...currentCompanies];
      this.companies.set(updatedCompanies);
    }

    // Optionally refresh the entire list to ensure data consistency
    this.loadCompanies();
  }

  // Refresh data
  refreshData() {
    this.loadCompanies();
  }

  // Get page numbers for pagination
  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
      range.push(i);
    }

    if (current - delta > 2) {
      rangeWithDots.push(1, -1);
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (current + delta < total - 1) {
      rangeWithDots.push(-1, total);
    } else {
      rangeWithDots.push(total);
    }

    return rangeWithDots.filter((v, i, a) => a.indexOf(v) === i && v !== -1);
  }

  // Get displayed range text (e.g., "1-20" or "21-40")
  getDisplayedRange(): string {
    const start = (this.currentPage() - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage() * this.pageSize, this.totalCompanies());
    return `${start}-${end}`;
  }

  // Rich company card event handlers
  onCompanyCardClick(company: ICompany) {
    this.selectedCompany = company;
    this.isModalOpen = true;
  }

  onCompanyViewClick(company: ICompany) {
    this.router.navigate(['/companies', company.id]);
  }

  onCompanyEditClick(company: ICompany) {
    this.openEditCompanyModal(company);
  }
}
