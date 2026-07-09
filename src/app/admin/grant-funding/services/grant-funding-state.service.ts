import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { GrantApplicationService } from './grant-application.service';
import { WorkflowService } from './workflow.service';
import { GrantApplication } from '../interfaces/grant-application.interfaces';
import { ToastService } from '../../../services/toast.service';

const STORAGE_KEY = 'grant-funding-filters';

interface FilterState {
  activeStatusFilter: string;
  hasTurnoverFilter: boolean;
  has12MonthsFilter: boolean;
  under1MFilter: boolean;
  sortField: 'name' | 'turnover';
  sortDir: 'asc' | 'desc';
  searchQuery: string;
}

@Injectable({ providedIn: 'root' })
export class GrantFundingStateService {
  readonly WORKFLOW_ID = 'grant-2026';

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

  selectedIds = signal<Set<number>>(new Set());
  showBulkModal = signal(false);
  isBulkProcessing = signal(false);
  bulkTargetStage = '';
  bulkNote = '';

  showPromoteModal = signal(false);
  promoteMode = signal<'import' | 'undo'>('import');

  selectedIdsArray = computed(() => Array.from(this.selectedIds()));

  allSelected = computed(() => {
    const ids = this.selectedIds();
    return this.filtered().length > 0 && this.filtered().every((app) => app.id && ids.has(app.id));
  });

  someSelected = computed(() => {
    const ids = this.selectedIds();
    return this.filtered().some((app) => app.id && ids.has(app.id)) && !this.allSelected();
  });

  constructor(
    private grantService: GrantApplicationService,
    private router: Router,
    private toastService: ToastService,
    private workflowSvc: WorkflowService,
  ) {}

  private restoreFilters(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved: Partial<FilterState> = JSON.parse(raw);
      if (typeof saved.activeStatusFilter === 'string') this.activeStatusFilter.set(saved.activeStatusFilter);
      if (typeof saved.hasTurnoverFilter === 'boolean') this.hasTurnoverFilter.set(saved.hasTurnoverFilter);
      if (typeof saved.has12MonthsFilter === 'boolean') this.has12MonthsFilter.set(saved.has12MonthsFilter);
      if (typeof saved.under1MFilter === 'boolean') this.under1MFilter.set(saved.under1MFilter);
      if (saved.sortField === 'name' || saved.sortField === 'turnover') this.sortField = saved.sortField;
      if (saved.sortDir === 'asc' || saved.sortDir === 'desc') this.sortDir = saved.sortDir;
      if (typeof saved.searchQuery === 'string') this.searchQuery = saved.searchQuery;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  private persistFilters(): void {
    try {
      const state: FilterState = {
        activeStatusFilter: this.activeStatusFilter(),
        hasTurnoverFilter: this.hasTurnoverFilter(),
        has12MonthsFilter: this.has12MonthsFilter(),
        under1MFilter: this.under1MFilter(),
        sortField: this.sortField,
        sortDir: this.sortDir,
        searchQuery: this.searchQuery,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // localStorage full or unavailable — silently ignore
    }
  }

  init(): void {
    this.restoreFilters();
    this.workflowSvc.loadWorkflowFromDB(this.WORKFLOW_ID).subscribe(() => {
      this.loadApplications();
    });
  }

  loadApplications(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.grantService.getAllApplications().subscribe({
      next: (apps) => {
        this.applications.set(apps);
        this.applyFilter();
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Failed to load applications. Please try again.');
        this.isLoading.set(false);
      },
    });
  }

  applyFilter(): void {
    this.persistFilters();

    let list = this.applications();

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.data.company_name?.toLowerCase().includes(q) ||
          a.data.registration_number?.toLowerCase().includes(q),
      );
    }

    const status = this.activeStatusFilter();
    if (status) {
      list = list.filter((a) => a.data.status === status);
    }

    if (this.hasTurnoverFilter()) {
      list = list.filter((a) => (a.data.bank_statement_grand_total ?? 0) > 0);
    }

    if (this.has12MonthsFilter()) {
      list = list.filter((a) => (a.data.bank_statement_months ?? 0) >= 12);
    }

    if (this.under1MFilter()) {
      list = list.filter((a) => {
        const total = a.data.bank_statement_grand_total ?? 0;
        return total > 0 && total <= 1_000_000;
      });
    }

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

  setStatusFilter(key: string): void {
    this.activeStatusFilter.set(key);
    this.applyFilter();
  }

  toggleHasTurnover(): void {
    this.hasTurnoverFilter.update((v) => !v);
    this.applyFilter();
  }

  toggleHas12Months(): void {
    this.has12MonthsFilter.update((v) => !v);
    this.applyFilter();
  }

  toggleUnder1M(): void {
    this.under1MFilter.update((v) => !v);
    this.applyFilter();
  }

  toggleSortDir(): void {
    this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    this.applyFilter();
  }

  countHasTurnover(): number {
    return this.applications().filter((a) => (a.data.bank_statement_grand_total ?? 0) > 0).length;
  }

  countHas12Months(): number {
    return this.applications().filter((a) => (a.data.bank_statement_months ?? 0) >= 12).length;
  }

  countUnder1M(): number {
    return this.applications().filter((a) => {
      const total = a.data.bank_statement_grand_total ?? 0;
      return total > 0 && total <= 1_000_000;
    }).length;
  }

  workflowStages() {
    return this.workflowSvc.getWorkflow(this.WORKFLOW_ID).stages;
  }

  stageCount(key: string): number {
    return this.applications().filter((a) => a.data.status === key).length;
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
    if (value >= 1_000) return `R${+(value / 1_000).toFixed(1)}K`;
    return `R${value}`;
  }

  pillClass(color: string, isActive: boolean): string {
    const base = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer select-none ';
    const map: Record<string, { off: string; on: string }> = {
      blue: { off: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100', on: 'bg-blue-100 text-blue-800 border-blue-400 ring-1 ring-blue-400' },
      orange: { off: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100', on: 'bg-orange-100 text-orange-800 border-orange-400 ring-1 ring-orange-400' },
      purple: { off: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100', on: 'bg-purple-100 text-purple-800 border-purple-400 ring-1 ring-purple-400' },
      indigo: { off: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100', on: 'bg-indigo-100 text-indigo-800 border-indigo-400 ring-1 ring-indigo-400' },
      green: { off: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100', on: 'bg-green-100 text-green-800 border-green-400 ring-1 ring-green-400' },
      red: { off: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100', on: 'bg-red-100 text-red-800 border-red-400 ring-1 ring-red-400' },
      teal: { off: 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100', on: 'bg-teal-100 text-teal-800 border-teal-400 ring-1 ring-teal-400' },
      pink: { off: 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100', on: 'bg-pink-100 text-pink-800 border-pink-400 ring-1 ring-pink-400' },
      yellow: { off: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100', on: 'bg-yellow-100 text-yellow-800 border-yellow-400 ring-1 ring-yellow-400' },
      gray: { off: 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100', on: 'bg-gray-100 text-gray-800 border-gray-400 ring-1 ring-gray-400' },
    };
    const c = map[color] ?? map['gray'];
    return base + (isActive ? c.on : c.off);
  }

  turnoverToggleClass(active: boolean): string {
    const base = 'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer select-none ';
    return base + (active ? 'bg-teal-600 text-white border-teal-600 shadow-sm' : 'bg-white text-gray-600 border-gray-300 hover:border-teal-400 hover:text-teal-600');
  }

  openCreateModal(): void {
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  goToReports(): void {
    this.router.navigate(['/admin/grant-funding/reports']);
  }

  openApplicant(app: GrantApplication): void {
    this.router.navigate(['/admin/grant-funding/applications', app.id, 'overview']);
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
      next: (created) => {
        this.isCreating.set(false);
        this.closeCreateModal();
        this.router.navigate(['/admin/grant-funding/applications', created.id, 'overview']);
      },
      error: () => {
        this.isCreating.set(false);
        this.toastService.show('Failed to create application.', 'error');
      },
    });
  }

  deleteApplication(app: GrantApplication): void {
    if (!app.id) return;
    this.grantService.deleteApplication(app.id).subscribe({
      next: () => {
        this.applications.update((list) => list.filter((a) => a.id !== app.id));
        this.applyFilter();
      },
      error: () => this.toastService.show('Failed to delete application.', 'error'),
    });
  }

  toggleSelect(id: number | undefined): void {
    if (!id) return;
    const ids = new Set(this.selectedIds());
    if (ids.has(id)) { ids.delete(id); } else { ids.add(id); }
    this.selectedIds.set(ids);
  }

  toggleSelectAll(): void {
    if (this.allSelected()) {
      this.selectedIds.set(new Set());
    } else {
      const ids = new Set<number>();
      this.filtered().forEach((app) => app.id && ids.add(app.id));
      this.selectedIds.set(ids);
    }
  }

  isSelected(id: number | undefined): boolean {
    return id ? this.selectedIds().has(id) : false;
  }

  clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  openBulkModal(): void {
    this.bulkTargetStage = '';
    this.bulkNote = '';
    this.showBulkModal.set(true);
  }

  closeBulkModal(): void {
    this.showBulkModal.set(false);
  }

  openPromoteModal(mode: 'import' | 'undo'): void {
    this.promoteMode.set(mode);
    this.showPromoteModal.set(true);
  }

  closePromoteModal(): void {
    this.showPromoteModal.set(false);
  }

  executeBulkStageChange(): void {
    if (!this.bulkTargetStage) return;
    const ids = Array.from(this.selectedIds());
    if (ids.length === 0) return;

    this.isBulkProcessing.set(true);
    const now = new Date().toISOString();

    const updates$ = ids.map((id) => {
      const app = this.applications().find((a) => a.id === id);
      if (!app) return null;
      const previousStatus = app.data.status ?? 'applied';
      const historyEntry = {
        status: this.bulkTargetStage,
        timestamp: now,
        note: this.bulkNote.trim() || 'Bulk stage change',
        reviewed_by: 'Admin',
      };
      const updatedHistory = [...(app.data.status_history ?? []), historyEntry];
      return this.grantService.updateApplication(id, {
        status: this.bulkTargetStage,
        status_history: updatedHistory,
        previous_status: previousStatus,
      });
    }).filter((obs) => obs !== null);

    if (updates$.length === 0) {
      this.isBulkProcessing.set(false);
      return;
    }

    let completed = 0;
    let failed = 0;

    updates$.forEach((update$) => {
      update$!.subscribe({
        next: (updatedApp) => {
          completed++;
          this.applications.update((list) => list.map((app) => (app.id === updatedApp.id ? updatedApp : app)));
          if (completed + failed === updates$.length) {
            this.finalizeBulkUpdate(completed, failed);
          }
        },
        error: () => {
          failed++;
          if (completed + failed === updates$.length) {
            this.finalizeBulkUpdate(completed, failed);
          }
        },
      });
    });
  }

  private finalizeBulkUpdate(completed: number, failed: number): void {
    this.isBulkProcessing.set(false);
    this.applyFilter();
    this.selectedIds.set(new Set());
    this.closeBulkModal();

    if (failed === 0) {
      this.toastService.show(`${completed} application(s) moved successfully.`, 'success');
    } else {
      this.toastService.show(`${completed} succeeded, ${failed} failed.`, 'warning');
    }
  }
}
