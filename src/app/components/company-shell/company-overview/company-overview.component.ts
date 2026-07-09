import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MetricsOverviewComponent, MetricCard } from '../../shared/metrics-overview/metrics-overview.component';
import { CompanyCapabilityService, CompanyOverviewResponse, DirectorSummary } from '../../../../services/company-capability.service';
import { CompanyProfileEditorComponent } from './company-profile-editor.component';
import { CompanyDirectorListComponent } from './company-director-list.component';

@Component({
  selector: 'app-company-overview',
  standalone: true,
  imports: [CommonModule, MetricsOverviewComponent, CompanyProfileEditorComponent, CompanyDirectorListComponent],
  template: `
    <div class="p-4 lg:p-8">
      <div class="max-w-7xl mx-auto">
        <!-- Page Header -->
        <div class="mb-8">
          <h2 class="text-2xl font-bold text-gray-900 mb-2">Company Overview</h2>
          <p class="text-gray-600">Complete view of company information and key metrics</p>
        </div>

        <!-- Company Metrics Overview -->
        <app-metrics-overview [metrics]="companyMetrics()"></app-metrics-overview>

        <!-- Loading State -->
        <div *ngIf="loading()" class="text-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p class="text-gray-500 mt-2">Loading company information...</p>
        </div>

        <!-- Error State -->
        <div *ngIf="error() && !loading()" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
          <p class="text-red-600">{{ error() }}</p>
          <button
            (click)="loadOverview()"
            class="mt-2 px-3 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700">
            Try Again
          </button>
        </div>

        <!-- Main Content Grid -->
        <div *ngIf="!loading() && !error() && overview()" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- Company Information (editable) -->
          <div class="lg:col-span-2">
            <app-company-profile-editor
              [companyId]="companyIdNumber()"
              [data]="company()"
              (saved)="loadOverview()">
            </app-company-profile-editor>
          </div>

          <!-- Right Column -->
          <div class="space-y-6">
            <!-- Compliance & Ownership Information -->
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Compliance & Ownership</h3>

              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">B-BBEE Certificate</span>
                  <span [ngClass]="{
                    'bg-green-100 text-green-800': company()?.has_valid_bbbbee,
                    'bg-red-100 text-red-800': !company()?.has_valid_bbbbee
                  }" class="px-2 py-1 rounded text-xs font-medium">
                    {{ company()?.has_valid_bbbbee ? 'Valid' : 'Invalid' }}
                  </span>
                </div>

                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">Tax Clearance</span>
                  <span [ngClass]="{
                    'bg-green-100 text-green-800': company()?.has_tax_clearance,
                    'bg-red-100 text-red-800': !company()?.has_tax_clearance
                  }" class="px-2 py-1 rounded text-xs font-medium">
                    {{ company()?.has_tax_clearance ? 'Valid' : 'Invalid' }}
                  </span>
                </div>

                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">CIPC Registration</span>
                  <span [ngClass]="{
                    'bg-green-100 text-green-800': company()?.has_cipc_registration,
                    'bg-red-100 text-red-800': !company()?.has_cipc_registration
                  }" class="px-2 py-1 rounded text-xs font-medium">
                    {{ company()?.has_cipc_registration ? 'Valid' : 'Invalid' }}
                  </span>
                </div>

                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">SARS Registered</span>
                  <span [ngClass]="{
                    'bg-green-100 text-green-800': company()?.is_sars_registered,
                    'bg-red-100 text-red-800': !company()?.is_sars_registered
                  }" class="px-2 py-1 rounded text-xs font-medium">
                    {{ company()?.is_sars_registered ? 'Yes' : 'No' }}
                  </span>
                </div>

                <hr class="my-4">

                <div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">Youth Owned</span>
                    <span class="text-sm font-medium">{{ company()?.youth_owned_text || (company()?.youth_owned ? 'Yes' : 'No') }}</span>
                  </div>

                  <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">Black Ownership</span>
                    <span class="text-sm font-medium">{{ company()?.black_ownership_text || (company()?.black_ownership ? 'Yes' : 'No') }}</span>
                  </div>

                  <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">Black Women Ownership</span>
                    <span class="text-sm font-medium">{{ company()?.black_women_ownership_text || (company()?.black_women_ownership ? 'Yes' : 'No') }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Directors (add, list, remove) -->
            <app-company-director-list
              [companyId]="companyIdNumber()"
              [directors]="directors()"
              (directorsChanged)="loadOverview()">
            </app-company-director-list>
          </div>
        </div>
      </div>
    </div>
  `
})
export class CompanyOverviewComponent implements OnInit {
  companyId: string | null = null;
  overview = signal<CompanyOverviewResponse | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  companyMetrics = signal<MetricCard[]>([]);

  constructor(
    private route: ActivatedRoute,
    private capability: CompanyCapabilityService
  ) {}

  ngOnInit(): void {
    this.route.parent?.params.subscribe(params => {
      this.companyId = params['id'];
      if (this.companyId) {
        this.loadOverview();
      }
    });
  }

  company = computed(() => this.overview()?.company || null);
  directors = computed<DirectorSummary[]>(() => this.overview()?.directors || []);
  companyIdNumber = computed(() => this.companyId ? parseInt(this.companyId, 10) : 0);

  loadOverview(): void {
    if (!this.companyId) return;

    this.loading.set(true);
    this.error.set(null);

    const companyIdNumber = parseInt(this.companyId, 10);
    if (isNaN(companyIdNumber)) {
      this.error.set('Invalid company ID');
      this.loading.set(false);
      return;
    }

    this.capability.getOverview(companyIdNumber).subscribe({
      next: (data) => {
        this.overview.set(data);
        this.updateCompanyMetrics(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load company information');
        this.loading.set(false);
      }
    });
  }

  private updateCompanyMetrics(data: CompanyOverviewResponse): void {
    const c = data.company;
    const fs = data.financialSummary;

    const complianceFactors = [
      c.has_valid_bbbbee,
      c.has_tax_clearance,
      c.has_cipc_registration,
      c.cipc_status === 'IN BUSINESS'
    ];
    const complianceScore = Math.round((complianceFactors.filter(Boolean).length / complianceFactors.length) * 100);

    const metrics: MetricCard[] = [
      {
        title: 'Estimated Turnover',
        value: c.turnover_estimated
          ? `R ${c.turnover_estimated.toLocaleString()}`
          : 'N/A',
        change: fs
          ? `Actual: R ${fs.totalRevenue.toLocaleString()}`
          : 'Estimated value',
        changeType: 'neutral',
        icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-600'
      },
      {
        title: 'Compliance Score',
        value: `${complianceScore}%`,
        change: this.getComplianceStatus(c),
        changeType: complianceScore >= 75 ? 'positive' : complianceScore >= 50 ? 'neutral' : 'negative',
        icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
        bgColor: 'bg-green-100',
        textColor: 'text-green-600'
      },
      {
        title: 'Total Employees',
        value: `${(c.permanent_employees || 0) + (c.temporary_employees || 0)}`,
        change: `${c.permanent_employees || 0} permanent, ${c.temporary_employees || 0} temporary`,
        changeType: 'neutral',
        icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
        bgColor: 'bg-purple-100',
        textColor: 'text-purple-600'
      },
      {
        title: 'B-BBEE Level',
        value: c.bbbee_level || 'N/A',
        change: c.bbbee_valid_status || 'Status unknown',
        changeType: c.has_valid_bbbbee ? 'positive' : 'negative',
        icon: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-600'
      }
    ];

    this.companyMetrics.set(metrics);
  }

  private getComplianceStatus(c: any): string {
    const issues = [];
    if (!c.has_valid_bbbbee) issues.push('B-BBEE');
    if (!c.has_tax_clearance) issues.push('Tax Clearance');
    if (!c.has_cipc_registration) issues.push('CIPC Registration');
    if (c.cipc_status !== 'IN BUSINESS') issues.push('Business Status');
    return issues.length === 0
      ? 'All compliant'
      : `${issues.length} issue${issues.length > 1 ? 's' : ''}`;
  }
}
