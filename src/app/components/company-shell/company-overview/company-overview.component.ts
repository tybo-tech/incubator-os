import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MetricsOverviewComponent, MetricCard } from '../../shared/metrics-overview/metrics-overview.component';
import { CompanyCapabilityService, CompanyOverviewResponse, DirectorSummary, OwnershipSummary } from '../../../../services/company-capability.service';
import { CompanyProfileEditorComponent } from './company-profile-editor.component';
import { CompanyComplianceCardComponent } from './company-compliance-card.component';
import { DashboardNormalizedCardsComponent } from '../../../features/normalized/dashboard-cards/dashboard-cards.component';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon';

interface OwnershipCheck {
  label: string;
  pass: boolean;
  reason: string;
}

@Component({
  selector: 'app-company-overview',
  standalone: true,
  imports: [CommonModule, RouterLink, AppIconComponent, MetricsOverviewComponent, CompanyProfileEditorComponent, CompanyComplianceCardComponent, DashboardNormalizedCardsComponent],
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

        <!-- Normalized Strategy Workspace Cards -->
        @if (companyIdNumber()) {
          <app-dashboard-normalized-cards [companyId]="companyIdNumber()"></app-dashboard-normalized-cards>
        }

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
              (saved)="refresh()">
            </app-company-profile-editor>
          </div>

          <!-- Right Column -->
          <div class="space-y-6">
            <!-- Compliance & Ownership (editable — drives the Compliance Score metric) -->
            <app-company-compliance-card
              [companyId]="companyIdNumber()"
              [data]="company()"
              (saved)="refresh()">
            </app-company-compliance-card>

            <!-- Directors summary (full roster lives in its own tab) -->
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold text-gray-900">Directors</h3>
                <span class="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                  {{ directors().length }}
                </span>
              </div>

              <p *ngIf="directors().length === 0" class="text-sm text-gray-500 mt-1">
                No directors registered yet.
              </p>

              <div *ngIf="directors().length > 0" class="mt-3 space-y-2">
                <div *ngFor="let check of ownershipChecks()" class="flex items-start gap-2">
                  <span
                    class="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                    [ngClass]="check.pass ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'">
                    <app-icon [name]="check.pass ? 'check' : 'x-mark'" class="text-[10px]"></app-icon>
                  </span>
                  <div class="min-w-0">
                    <div class="text-sm text-gray-900">{{ check.label }}</div>
                    <div class="text-xs text-gray-500">{{ check.reason }}</div>
                  </div>
                </div>
              </div>

              <a
                [routerLink]="['/company', companyId, 'directors']"
                class="mt-3 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                Manage directors
                <app-icon name="arrow-right" class="ml-1 text-[14px]"></app-icon>
              </a>
            </div>
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
  ownership = computed<OwnershipSummary | null>(() => this.overview()?.ownership ?? null);
  companyIdNumber = computed(() => this.companyId ? parseInt(this.companyId, 10) : 0);

  ownershipChecks = computed<OwnershipCheck[]>(() => {
    const ownership = this.ownership();
    if (!ownership) return [];

    return [
      { label: 'Black ownership', pass: ownership.blackOwnership, reason: ownership.blackReason },
      { label: 'Black women ownership', pass: ownership.blackWomenOwnership, reason: ownership.blackWomenReason },
      { label: 'Youth owned', pass: ownership.youthOwned, reason: ownership.youthReason },
    ];
  });

  loadOverview(): void {
    this.fetchOverview(false);
  }

  /** Re-fetch after a save without unmounting the cards (keeps success messages visible). */
  refresh(): void {
    this.fetchOverview(true);
  }

  private fetchOverview(silent: boolean): void {
    if (!this.companyId) return;

    if (!silent) this.loading.set(true);
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
      this.isCipcInBusiness(c.cipc_status)
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
        icon: 'currency-dollar',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-600'
      },
      {
        title: 'Compliance Score',
        value: `${complianceScore}%`,
        change: this.getComplianceStatus(c),
        changeType: complianceScore >= 75 ? 'positive' : complianceScore >= 50 ? 'neutral' : 'negative',
        icon: 'shield-check',
        bgColor: 'bg-green-100',
        textColor: 'text-green-600'
      },
      {
        title: 'Total Employees',
        value: `${(c.permanent_employees || 0) + (c.temporary_employees || 0)}`,
        change: `${c.permanent_employees || 0} permanent, ${c.temporary_employees || 0} temporary`,
        changeType: 'neutral',
        icon: 'user-group',
        bgColor: 'bg-purple-100',
        textColor: 'text-purple-600'
      },
      {
        title: 'B-BBEE Level',
        value: c.bbbee_level || 'N/A',
        change: c.bbbee_valid_status || 'Status unknown',
        changeType: c.has_valid_bbbbee ? 'positive' : 'negative',
        icon: 'document-text',
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
    if (!this.isCipcInBusiness(c.cipc_status)) issues.push('Business Status');
    return issues.length === 0
      ? 'All compliant'
      : `${issues.length} issue${issues.length > 1 ? 's' : ''}`;
  }

  /** Stored CIPC values are inconsistent in casing/whitespace (e.g. "AR DEREGISTRATION "). */
  private isCipcInBusiness(status: string | null | undefined): boolean {
    return (status || '').trim().toUpperCase() === 'IN BUSINESS';
  }
}
