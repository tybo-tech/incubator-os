import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GrantApplicationService } from './services/grant-application.service';
import { GrantApplication } from './interfaces/grant-application.interfaces';
import { CreateModalComponent, CreateModalConfig } from '../../shared/components';
import { ToastService } from '../../services/toast.service';
import { WorkflowSettingsComponent } from './workflow-settings.component';
import { WorkflowService } from './services/workflow.service';

@Component({
  selector: 'app-grant-funding-applications',
  standalone: true,
  imports: [CommonModule, FormsModule, CreateModalComponent, WorkflowSettingsComponent],
  template: `
    <div class="p-4 sm:p-6">

      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 class="text-xl font-semibold text-gray-900">Applications</h2>
          <p class="text-sm text-gray-500 mt-1">
            Applicants not yet assigned to a client or cohort — pending qualification.
          </p>
        </div>
        <div class="flex items-center gap-2 w-full sm:w-auto">
          <button
            (click)="showWorkflowSettings.set(true)"
            class="px-3.5 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50
                   hover:border-gray-400 transition-colors flex items-center justify-center
                   text-sm gap-2 flex-shrink-0"
            title="Manage workflow stages and transitions">
            <i class="fas fa-sliders text-gray-500 text-xs"></i>
            <span class="hidden sm:inline">Workflow</span>
          </button>
          <button
            (click)="goToReports()"
            class="px-3.5 py-2 border border-teal-300 text-teal-700 rounded-lg hover:bg-teal-50
                   hover:border-teal-400 transition-colors flex items-center justify-center
                   text-sm gap-2 flex-shrink-0"
            title="View grant funding reports and analytics">
            <svg class="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
            <span class="hidden sm:inline">Reports</span>
          </button>
          <button
            (click)="openCreateModal()"
            class="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                   transition-colors flex items-center justify-center text-sm font-medium">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            Add Application
          </button>
        </div>
      </div>

      <!-- Status pills -->
      <div class="flex flex-wrap gap-2 mb-4">
        <button
          (click)="setStatusFilter('')"
          [class]="pillClass('gray', activeStatusFilter() === '')">
          All
          <span class="bg-white/60 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums">
            {{ applications().length }}
          </span>
        </button>
        <button
          *ngFor="let stage of workflowStages()"
          (click)="setStatusFilter(stage.key)"
          [class]="pillClass(stage.color, activeStatusFilter() === stage.key)">
          {{ stage.label }}
          <span class="bg-white/60 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums">
            {{ stageCount(stage.key) }}
          </span>
        </button>
      </div>

      <!-- Search + turnover toggles + sort -->
      <div class="flex flex-wrap items-center gap-2 mb-6">
        <input
          type="text"
          placeholder="Search by company name…"
          [(ngModel)]="searchQuery"
          (input)="applyFilter()"
          class="flex-1 min-w-[180px] max-w-sm px-4 py-2 border border-gray-300 rounded-lg text-sm
                 focus:ring-2 focus:ring-blue-500 focus:border-transparent">

        <!-- Has turnover toggle -->
        <button
          (click)="toggleHasTurnover()"
          [class]="turnoverToggleClass(hasTurnoverFilter())">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
          </svg>
          Has turnover
          <span class="bg-white/60 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums">
            {{ countHasTurnover() }}
          </span>
        </button>

        <!-- Under R1M toggle -->
        <button
          (click)="toggleUnder1M()"
          [class]="turnoverToggleClass(under1MFilter())">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          R1M & under
          <span class="bg-white/60 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums">
            {{ countUnder1M() }}
          </span>
        </button>

        <!-- 12+ months toggle -->
        <button
          (click)="toggleHas12Months()"
          [class]="turnoverToggleClass(has12MonthsFilter())">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
          12+ months
          <span class="bg-white/60 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums">
            {{ countHas12Months() }}
          </span>
        </button>

        <!-- Sort controls -->
        <div class="flex items-center gap-1 ml-auto">
          <select
            [(ngModel)]="sortField"
            (change)="applyFilter()"
            class="px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white text-gray-700
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="name">Company name</option>
            <option value="turnover">Turnover</option>
          </select>
          <button
            (click)="toggleSortDir()"
            class="p-2 border border-gray-300 rounded-lg bg-white text-gray-600 hover:bg-gray-50
                   hover:border-gray-400 transition-colors"
            [title]="sortDir === 'asc' ? 'Ascending' : 'Descending'">
            <svg *ngIf="sortDir === 'asc'" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"/>
            </svg>
            <svg *ngIf="sortDir === 'desc'" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h9m5 4l-4 4m0 0l-4-4m4 4V8"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading()" class="flex justify-center items-center py-16">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span class="ml-3 text-gray-500 text-sm">Loading applications…</span>
      </div>

      <!-- Error -->
      <div *ngIf="error() && !isLoading()"
           class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p class="text-red-600 text-sm mb-3">{{ error() }}</p>
        <button (click)="loadApplications()"
          class="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">
          Try Again
        </button>
      </div>

      <!-- Empty state -->
      <div *ngIf="!isLoading() && !error() && filtered().length === 0"
           class="text-center py-16 bg-white rounded-xl border border-gray-200">
        <div class="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
        </div>
        <h3 class="text-sm font-medium text-gray-900 mb-1">
          {{ applications().length === 0 ? 'No applications yet' : 'No matching applications' }}
        </h3>
        <p class="text-sm text-gray-500 mb-5">
          {{ applications().length === 0
            ? 'Add the first application to get started.'
            : 'Try adjusting your search or filter.' }}
        </p>
        <button *ngIf="applications().length === 0"
          (click)="openCreateModal()"
          class="px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          Add First Application
        </button>
      </div>

      <!-- Applications Table -->
      <div *ngIf="!isLoading() && !error() && filtered().length > 0"
           class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="text-left px-4 py-3 font-medium text-gray-600">Company</th>
                <th class="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Reg. No</th>
                <th class="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Province</th>
                <th class="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Turnover</th>
                <th class="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th class="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr *ngFor="let app of filtered()"
                  class="hover:bg-gray-50 transition-colors cursor-pointer"
                  (click)="openApplicant(app)">
                <td class="px-4 py-3">
                  <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 bg-gradient-to-br from-green-400 to-teal-500 rounded-lg
                                flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {{ (app.data.company_name || '?')[0].toUpperCase() }}
                    </div>
                    <span class="font-medium text-gray-900">{{ app.data.company_name }}</span>
                  </div>
                </td>
                <td class="px-4 py-3 hidden sm:table-cell text-gray-500">
                  {{ app.data.registration_number || '—' }}
                </td>
                <td class="px-4 py-3 hidden md:table-cell text-gray-500">
                  {{ app.data.province || '—' }}
                </td>
                <td class="px-4 py-3 hidden lg:table-cell">
                  <ng-container *ngIf="app.data.bank_statement_months || app.data.bank_statement_grand_total; else noTurnover">
                    <div class="flex items-center gap-1.5">
                      <span class="inline-flex items-center px-2 py-0.5 rounded-md bg-teal-50 text-teal-700
                                  text-xs font-semibold border border-teal-100 tabular-nums">
                        {{ app.data.bank_statement_months ?? 0 }}M
                      </span>
                      <span class="inline-flex items-center px-2 py-0.5 rounded-md bg-teal-50 text-teal-700
                                  text-xs font-semibold border border-teal-100 tabular-nums">
                        {{ formatAmount(app.data.bank_statement_grand_total) }}
                      </span>
                    </div>
                  </ng-container>
                  <ng-template #noTurnover>
                    <span class="text-gray-300 text-xs">—</span>
                  </ng-template>
                </td>
                <td class="px-4 py-3">
                  <span [class]="statusClass(app.data.status)">
                    {{ statusLabel(app.data.status) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-right" (click)="$event.stopPropagation()">
                  <div class="flex items-center justify-end space-x-1">
                    <button
                      (click)="openApplicant(app)"
                      class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="View / Edit">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                      </svg>
                    </button>
                    <button
                      (click)="deleteApplication(app)"
                      class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
          Showing {{ filtered().length }} of {{ applications().length }} applications
        </div>
      </div>

      <!-- Create Modal -->
      <app-create-modal
        [show]="showCreateModal()"
        [config]="createModalConfig"
        [isSubmitting]="isCreating"
        (cancel)="closeCreateModal()"
        (submit)="onCreateSubmit($event)">
      </app-create-modal>

      <!-- Workflow Settings drawer -->
      <app-workflow-settings
        workflowId="grant-2026"
        [isOpen]="showWorkflowSettings()"
        (closePanel)="showWorkflowSettings.set(false)">
      </app-workflow-settings>

    </div>
  `
})
export class GrantFundingApplicationsComponent implements OnInit {
  applications = signal<GrantApplication[]>([]);
  filtered = signal<GrantApplication[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);
  showCreateModal = signal(false);
  showWorkflowSettings = signal(false);
  isCreating = signal(false);
  activeStatusFilter = signal<string>('');
  hasTurnoverFilter = signal(false);
  has12MonthsFilter = signal(false);
  under1MFilter = signal(false);
  sortField: 'name' | 'turnover' = 'name';
  sortDir: 'asc' | 'desc' = 'asc';
  searchQuery = '';

  createModalConfig: CreateModalConfig = {
    title: 'New Grant Application',
    submitLabel: 'Create & Open',
    fields: [
      {
        key: 'company_name',
        label: 'Company Name',
        type: 'text',
        placeholder: 'Enter company name',
        required: true,
      },
      {
        key: 'registration_number',
        label: 'Registration Number (optional)',
        type: 'text',
        placeholder: 'e.g. 2023/123456/07',
      },
    ],
  };

  private readonly WORKFLOW_ID = 'grant-2026';

  constructor(
    private grantService: GrantApplicationService,
    private router: Router,
    private toastService: ToastService,
    private workflowSvc: WorkflowService,
  ) {}

  ngOnInit(): void {
    // Load workflow from DB first so the initial status is always in sync.
    this.workflowSvc.loadWorkflowFromDB(this.WORKFLOW_ID).subscribe(() => {
      this.loadApplications();
    });
  }

  loadApplications(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.grantService.getAllApplications().subscribe({
      next: apps => {
        this.applications.set(apps);
        this.applyFilter();
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Failed to load applications. Please try again.');
        this.isLoading.set(false);
      }
    });
  }

  applyFilter(): void {
    let list = this.applications();

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(a =>
        a.data.company_name?.toLowerCase().includes(q) ||
        a.data.registration_number?.toLowerCase().includes(q)
      );
    }

    const status = this.activeStatusFilter();
    if (status) {
      list = list.filter(a => a.data.status === status);
    }

    if (this.hasTurnoverFilter()) {
      list = list.filter(a => (a.data.bank_statement_grand_total ?? 0) > 0);
    }

    if (this.has12MonthsFilter()) {
      list = list.filter(a => (a.data.bank_statement_months ?? 0) >= 12);
    }

    if (this.under1MFilter()) {
      list = list.filter(a => {
        const total = a.data.bank_statement_grand_total ?? 0;
        return total > 0 && total <= 1_000_000;
      });
    }

    // Sort
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (this.sortField === 'name') {
        cmp = (a.data.company_name ?? '').localeCompare(b.data.company_name ?? '');
      } else {
        cmp = (a.data.bank_statement_grand_total ?? 0) - (b.data.bank_statement_grand_total ?? 0);
      }
      return this.sortDir === 'asc' ? cmp : -cmp;
    });

    this.filtered.set(list);
  }

  openCreateModal(): void { this.showCreateModal.set(true); }
  goToReports(): void { this.router.navigate(['/admin/grant-funding/reports']); }
  closeCreateModal(): void { this.showCreateModal.set(false); }

  setStatusFilter(key: string): void {
    this.activeStatusFilter.set(key);
    this.applyFilter();
  }

  toggleHasTurnover(): void {
    this.hasTurnoverFilter.update(v => !v);
    this.applyFilter();
  }

  toggleHas12Months(): void {
    this.has12MonthsFilter.update(v => !v);
    this.applyFilter();
  }

  toggleSortDir(): void {
    this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    this.applyFilter();
  }

  countHasTurnover(): number {
    return this.applications().filter(a => (a.data.bank_statement_grand_total ?? 0) > 0).length;
  }

  countHas12Months(): number {
    return this.applications().filter(a => (a.data.bank_statement_months ?? 0) >= 12).length;
  }

  countUnder1M(): number {
    return this.applications().filter(a => {
      const total = a.data.bank_statement_grand_total ?? 0;
      return total > 0 && total <= 1_000_000;
    }).length;
  }

  toggleUnder1M(): void {
    this.under1MFilter.update(v => !v);
    this.applyFilter();
  }

  turnoverToggleClass(active: boolean): string {
    const base = 'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer select-none ';
    return base + (active
      ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
      : 'bg-white text-gray-600 border-gray-300 hover:border-teal-400 hover:text-teal-600');
  }

  workflowStages() {
    return this.workflowSvc.getWorkflow(this.WORKFLOW_ID).stages;
  }

  stageCount(key: string): number {
    return this.applications().filter(a => a.data.status === key).length;
  }

  pillClass(color: string, isActive: boolean): string {
    const base = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer select-none ';
    const map: Record<string, { off: string; on: string }> = {
      blue:   { off: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',       on: 'bg-blue-100 text-blue-800 border-blue-400 ring-1 ring-blue-400' },
      orange: { off: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100', on: 'bg-orange-100 text-orange-800 border-orange-400 ring-1 ring-orange-400' },
      purple: { off: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100', on: 'bg-purple-100 text-purple-800 border-purple-400 ring-1 ring-purple-400' },
      indigo: { off: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100', on: 'bg-indigo-100 text-indigo-800 border-indigo-400 ring-1 ring-indigo-400' },
      green:  { off: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',     on: 'bg-green-100 text-green-800 border-green-400 ring-1 ring-green-400' },
      red:    { off: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',             on: 'bg-red-100 text-red-800 border-red-400 ring-1 ring-red-400' },
      teal:   { off: 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100',         on: 'bg-teal-100 text-teal-800 border-teal-400 ring-1 ring-teal-400' },
      pink:   { off: 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100',         on: 'bg-pink-100 text-pink-800 border-pink-400 ring-1 ring-pink-400' },
      yellow: { off: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100', on: 'bg-yellow-100 text-yellow-800 border-yellow-400 ring-1 ring-yellow-400' },
      gray:   { off: 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100',         on: 'bg-gray-100 text-gray-800 border-gray-400 ring-1 ring-gray-400' },
    };
    const c = map[color] ?? map['gray'];
    return base + (isActive ? c.on : c.off);
  }

  onCreateSubmit(formData: any): void {
    if (!formData.company_name?.trim()) return;
    this.isCreating.set(true);

    const wf = this.workflowSvc.getWorkflow(this.WORKFLOW_ID);
    const initialStatus = wf.stages[0]?.key ?? 'applied';

    this.grantService.createApplication({
      company_name: formData.company_name.trim(),
      registration_number: formData.registration_number?.trim() || undefined,
      status: initialStatus,
      workflow_id: this.WORKFLOW_ID,
    }).subscribe({
      next: created => {
        this.isCreating.set(false);
        this.closeCreateModal();
        this.router.navigate(['/admin/grant-funding/applications', created.id, 'overview']);
      },
      error: () => {
        this.isCreating.set(false);
        this.toastService.show('Failed to create application.', 'error');
      }
    });
  }

  openApplicant(app: GrantApplication): void {
    this.router.navigate(['/admin/grant-funding/applications', app.id, 'overview']);
  }

  deleteApplication(app: GrantApplication): void {
    if (!app.id) return;
    this.grantService.deleteApplication(app.id).subscribe({
      next: () => {
        this.applications.update(list => list.filter(a => a.id !== app.id));
        this.applyFilter();
      },
      error: () => this.toastService.show('Failed to delete application.', 'error')
    });
  }

  statusLabel(status?: string): string {
    return this.workflowSvc.getStatusLabel(this.workflowSvc.getWorkflow(this.WORKFLOW_ID), status);
  }

  statusClass(status?: string): string {
    return this.workflowSvc.getStatusBadgeClass(this.workflowSvc.getWorkflow(this.WORKFLOW_ID), status);
  }

  formatAmount(value?: number): string {
    if (!value) return 'R0';
    if (value >= 1_000_000) return `R${+(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000)    return `R${+(value / 1_000).toFixed(1)}K`;
    return `R${value}`;
  }
}
