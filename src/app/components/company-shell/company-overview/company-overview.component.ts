import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MetricsOverviewComponent, MetricCard } from '../../shared/metrics-overview/metrics-overview.component';
import { CompanyService } from '../../../../services/company.service';
import { ICompany } from '../../../../models/simple.schema';

@Component({
  selector: 'app-company-overview',
  standalone: true,
  imports: [CommonModule, MetricsOverviewComponent],
  template: `
    <div class="p-4 lg:p-8">
      <div class="max-w-7xl mx-auto">
        <!-- Page Header -->
        <div class="mb-8">
          <h2 class="text-2xl font-bold text-gray-900 mb-2">Company Overview</h2>
          <p class="text-gray-600">Complete view of company information and key metrics</p>
        </div>

        <!-- Company Metrics Overview -->
        <app-metrics-overview [metrics]="companyMetrics"></app-metrics-overview>

        <!-- Loading State -->
        <div *ngIf="loading" class="text-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p class="text-gray-500 mt-2">Loading company information...</p>
        </div>

        <!-- Error State -->
        <div *ngIf="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
          <p class="text-red-600">{{ error }}</p>
          <button
            (click)="loadCompanyData()"
            class="mt-2 px-3 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700">
            Try Again
          </button>
        </div>

        <!-- Main Content Grid -->
        <div *ngIf="!loading && !error && company" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- Company Information -->
          <div class="lg:col-span-2">
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Company Information</h3>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-medium text-gray-500 mb-1">Company Name</label>
                  <p class="text-gray-900">{{ company.name || 'N/A' }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-500 mb-1">Registration Number</label>
                  <p class="text-gray-900">{{ company.registration_no || 'N/A' }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-500 mb-1">Contact Person</label>
                  <p class="text-gray-900">{{ company.contact_person || 'N/A' }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-500 mb-1">CIPC Status</label>
                  <span [ngClass]="{
                    'bg-green-100 text-green-800': company.cipc_status === 'IN BUSINESS',
                    'bg-red-100 text-red-800': company.cipc_status !== 'IN BUSINESS',
                    'bg-gray-100 text-gray-800': !company.cipc_status
                  }" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium">
                    {{ company.cipc_status || 'Unknown' }}
                  </span>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-500 mb-1">Business Location</label>
                  <p class="text-gray-900">{{ company.business_location || company.city || 'N/A' }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-500 mb-1">Service Offering</label>
                  <p class="text-gray-900">{{ company.service_offering || 'N/A' }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-500 mb-1">B-BBEE Level</label>
                  <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {{ company.bbbee_level || 'N/A' }}
                  </span>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-500 mb-1">Contact Number</label>
                  <p class="text-gray-900">{{ company.contact_number || 'N/A' }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-500 mb-1">Email Address</label>
                  <p class="text-gray-900">{{ company.email_address || 'N/A' }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-500 mb-1">Trading Name</label>
                  <p class="text-gray-900">{{ company.trading_name || 'Nil' }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-500 mb-1">Total Employees</label>
                  <p class="text-gray-900">{{ (company.permanent_employees || 0) + (company.temporary_employees || 0) }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-500 mb-1">Estimated Turnover</label>
                  <p class="text-gray-900">{{ company.turnover_estimated ? 'R ' + company.turnover_estimated.toLocaleString() : 'N/A' }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Compliance & Ownership Information -->
          <div>
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Compliance & Ownership</h3>

              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">B-BBEE Certificate</span>
                  <span [ngClass]="{
                    'bg-green-100 text-green-800': company.has_valid_bbbbee,
                    'bg-red-100 text-red-800': !company.has_valid_bbbbee
                  }" class="px-2 py-1 rounded text-xs font-medium">
                    {{ company.has_valid_bbbbee ? 'Valid' : 'Invalid' }}
                  </span>
                </div>

                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">Tax Clearance</span>
                  <span [ngClass]="{
                    'bg-green-100 text-green-800': company.has_tax_clearance,
                    'bg-red-100 text-red-800': !company.has_tax_clearance
                  }" class="px-2 py-1 rounded text-xs font-medium">
                    {{ company.has_tax_clearance ? 'Valid' : 'Invalid' }}
                  </span>
                </div>

                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">CIPC Registration</span>
                  <span [ngClass]="{
                    'bg-green-100 text-green-800': company.has_cipc_registration,
                    'bg-red-100 text-red-800': !company.has_cipc_registration
                  }" class="px-2 py-1 rounded text-xs font-medium">
                    {{ company.has_cipc_registration ? 'Valid' : 'Invalid' }}
                  </span>
                </div>

                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">SARS Registered</span>
                  <span [ngClass]="{
                    'bg-green-100 text-green-800': company.is_sars_registered,
                    'bg-red-100 text-red-800': !company.is_sars_registered
                  }" class="px-2 py-1 rounded text-xs font-medium">
                    {{ company.is_sars_registered ? 'Yes' : 'No' }}
                  </span>
                </div>

                <hr class="my-4">

                <div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">Youth Owned</span>
                    <span class="text-sm font-medium">{{ company.youth_owned_text || 'Unknown' }}</span>
                  </div>

                  <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">Black Ownership</span>
                    <span class="text-sm font-medium">{{ company.black_ownership_text || 'Unknown' }}</span>
                  </div>

                  <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">Black Women Ownership</span>
                    <span class="text-sm font-medium">{{ company.black_women_ownership_text || 'Unknown' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class CompanyOverviewComponent implements OnInit {
  companyId: string | null = null;
  company: ICompany | null = null;
  loading = false;
  error: string | null = null;

  companyMetrics: MetricCard[] = [];

  constructor(
    private route: ActivatedRoute,
    private companyService: CompanyService
  ) {}

  ngOnInit(): void {
    this.route.parent?.params.subscribe(params => {
      this.companyId = params['id'];
      if (this.companyId) {
        this.loadCompanyData();
      }
    });
  }

  loadCompanyData(): void {
    if (!this.companyId) return;

    this.loading = true;
    this.error = null;

    const companyIdNumber = parseInt(this.companyId, 10);
    if (isNaN(companyIdNumber)) {
      this.error = 'Invalid company ID';
      this.loading = false;
      return;
    }

    this.companyService.getCompanyById(companyIdNumber).subscribe({
      next: (company) => {
        this.company = company;
        this.updateCompanyMetrics();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading company:', error);
        this.error = 'Failed to load company information';
        this.loading = false;
      }
    });
  }

  private updateCompanyMetrics(): void {
    if (!this.company) return;

    // Calculate compliance score based on available data
    const complianceFactors = [
      this.company.has_valid_bbbbee,
      this.company.has_tax_clearance,
      this.company.has_cipc_registration,
      this.company.cipc_status === 'IN BUSINESS'
    ];
    const complianceScore = Math.round((complianceFactors.filter(Boolean).length / complianceFactors.length) * 100);

    this.companyMetrics = [
      {
        title: 'Estimated Turnover',
        value: this.company.turnover_estimated
          ? `R ${this.company.turnover_estimated.toLocaleString()}`
          : 'N/A',
        change: this.company.turnover_actual
          ? `Actual: R ${this.company.turnover_actual.toLocaleString()}`
          : 'Estimated value',
        changeType: 'neutral',
        icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-600'
      },
      {
        title: 'Compliance Score',
        value: `${complianceScore}%`,
        change: this.getComplianceStatus(),
        changeType: complianceScore >= 75 ? 'positive' : complianceScore >= 50 ? 'neutral' : 'negative',
        icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
        bgColor: 'bg-green-100',
        textColor: 'text-green-600'
      },
      {
        title: 'Total Employees',
        value: `${(this.company.permanent_employees || 0) + (this.company.temporary_employees || 0)}`,
        change: `${this.company.permanent_employees || 0} permanent, ${this.company.temporary_employees || 0} temporary`,
        changeType: 'neutral',
        icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
        bgColor: 'bg-purple-100',
        textColor: 'text-purple-600'
      },
      {
        title: 'B-BBEE Level',
        value: this.company.bbbee_level || 'N/A',
        change: this.company.bbbee_valid_status || 'Status unknown',
        changeType: this.company.has_valid_bbbbee ? 'positive' : 'negative',
        icon: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-600'
      }
    ];
  }

  private getComplianceStatus(): string {
    if (!this.company) return 'Unknown';

    const issues = [];
    if (!this.company.has_valid_bbbbee) issues.push('B-BBEE');
    if (!this.company.has_tax_clearance) issues.push('Tax Clearance');
    if (!this.company.has_cipc_registration) issues.push('CIPC Registration');
    if (this.company.cipc_status !== 'IN BUSINESS') issues.push('Business Status');

    return issues.length === 0
      ? 'All compliant'
      : `${issues.length} issue${issues.length > 1 ? 's' : ''}`;
  }
}
