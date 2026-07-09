import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FinancialIndicatorsFacade } from '../services/financial-indicators.facade';
import { FinancialIndicatorSummary, FinancialIndicatorResponse, FinancialIndicatorData, FinancialIndicatorSummaryResponse, AnnualReportResponse } from '../../../../../services/financial-indicator.service';
import { FinancialIndicatorExportService } from '../../../../../services/financial-indicator-export.service';
import { FinancialSummaryCardsComponent } from '../components/financial-summary/financial-summary-cards.component';
import { FinancialListComponent } from '../components/financial-list/financial-list.component';
import { FinancialFormComponent } from '../components/financial-form/financial-form.component';
import { AnnualReportComponent } from '../components/annual-report/annual-report.component';
import { RequestDialogComponent } from '../components/request-dialog/request-dialog.component';
import { ViewDialogComponent } from '../components/view-dialog/view-dialog.component';
import { ImportDialogComponent } from '../components/import-dialog/import-dialog.component';

@Component({
  selector: 'app-financial-indicators-page',
  standalone: true,
  imports: [
    CommonModule,
    FinancialSummaryCardsComponent,
    FinancialListComponent,
    FinancialFormComponent,
    AnnualReportComponent,
    RequestDialogComponent,
    ViewDialogComponent,
    ImportDialogComponent,
  ],
  providers: [FinancialIndicatorsFacade],
  template: `
    <div class="p-4 lg:p-8">
      <div class="max-w-7xl mx-auto space-y-6">
        <!-- Page Header -->
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-bold text-gray-900">Financial Indicators</h2>
            <p class="text-gray-600 text-sm mt-1">Management accounts and financial reporting</p>
          </div>
        </div>

        <!-- Toolbar -->
        <div class="flex items-center flex-wrap gap-2">
          <button (click)="openCreate()" class="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            New Report
          </button>
          <button (click)="scrollToAnnual()" class="inline-flex items-center px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50">
            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Annual Report
          </button>
          <button (click)="openRequestDialog()" class="inline-flex items-center px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50">
            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
            Request From Entrepreneur
          </button>
          <button (click)="loadAll()" class="inline-flex items-center px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50">
            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Refresh
          </button>
          <button (click)="openImport()" class="inline-flex items-center px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50">
            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"/></svg>
            Import
          </button>
          <button (click)="exportData()" class="inline-flex items-center px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50">
            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Export
          </button>
        </div>

        <!-- Loading overlay -->
        <div *ngIf="loading()" class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span class="ml-3 text-gray-500">Loading...</span>
        </div>

        <!-- Error -->
        <div *ngIf="error()" class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-sm">{{ error() }}</div>

        <!-- Summary Cards -->
        <div *ngIf="!loading()">
          <h3 class="text-lg font-semibold text-gray-900 mb-3">Summary</h3>
          <app-financial-summary-cards [summary]="summary()" />
        </div>

        <!-- Monthly Reports -->
        <div *ngIf="!loading()">
          <h3 class="text-lg font-semibold text-gray-900 mb-3">Monthly Reports</h3>
          <app-financial-list
            [records]="records()"
            (view)="viewRecord($event)"
            (edit)="editRecord($event)"
            (delete)="deleteRecord($event)" />
        </div>

        <!-- Annual Report -->
        <div *ngIf="!loading()" id="annual-report-section">
          <h3 class="text-lg font-semibold text-gray-900 mb-3">Annual Management Accounts</h3>
          <app-annual-report [report]="annualReport()" />
        </div>
      </div>
    </div>

    <!-- Create/Edit Dialog -->
    <app-financial-form
      *ngIf="showForm()"
      [isEdit]="isEditing()"
      [initialData]="editingData()"
      [saving]="saving()"
      (close)="closeForm()"
      (save)="saveRecord($event)" />

    <!-- View Dialog -->
    <app-view-dialog
      *ngIf="showView()"
      [record]="viewingRecord()"
      (close)="closeView()" />

    <!-- Request Dialog -->
    <app-request-dialog
      *ngIf="showRequest()"
      [companyId]="companyId()"
      (close)="closeRequest()" />

    <!-- Import Dialog -->
    <app-import-dialog
      *ngIf="showImport()"
      [companyId]="companyId()"
      (close)="closeImport()"
      (imported)="loadAll()" />
  `
})
export class FinancialIndicatorsPageComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private facade: FinancialIndicatorsFacade,
    private exportService: FinancialIndicatorExportService,
  ) {}

  companyId = signal<number>(0);
  companyName = signal<string>('');
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);

  summary = signal<FinancialIndicatorSummaryResponse | null>(null);
  records = signal<FinancialIndicatorSummary[]>([]);
  annualReport = signal<AnnualReportResponse | null>(null);

  showForm = signal(false);
  isEditing = signal(false);
  editingData = signal<FinancialIndicatorData | null>(null);
  editingId = signal<number | null>(null);

  showView = signal(false);
  viewingRecord = signal<FinancialIndicatorResponse | null>(null);

  showRequest = signal(false);
  showImport = signal(false);

  ngOnInit(): void {
    this.route.parent?.params.subscribe(params => {
      const id = parseInt(params['id'], 10);
      if (id) {
        this.companyId.set(id);
        this.loadAll();
      }
    });
  }

  loadAll(): void {
    const cid = this.companyId();
    if (!cid) return;

    this.loading.set(true);
    this.error.set(null);

    const year = new Date().getFullYear();

    this.facade.getSummary(cid).subscribe({
      next: (s) => { this.summary.set(s); },
      error: () => {}
    });

    this.facade.listByCompany(cid).subscribe({
      next: (r) => { this.records.set(r); },
      error: () => {}
    });

    this.facade.getAnnual(cid, year).subscribe({
      next: (a) => { this.annualReport.set(a); },
      error: () => {}
    });

    this.loading.set(false);
  }

  openImport(): void {
    this.showImport.set(true);
  }

  closeImport(): void {
    this.showImport.set(false);
  }

  async exportData(): Promise<void> {
    const cid = this.companyId();
    if (!cid) return;
    const year = new Date().getFullYear();
    const name = this.companyName() || `Company_${cid}`;
    await this.exportService.exportAnnualReport(cid, year, name);
  }

  openCreate(): void {
    this.isEditing.set(false);
    this.editingData.set(null);
    this.editingId.set(null);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.isEditing.set(false);
    this.editingData.set(null);
    this.editingId.set(null);
  }

  saveRecord(data: FinancialIndicatorData): void {
    const cid = this.companyId();
    if (!cid) return;

    this.saving.set(true);
    this.error.set(null);

    const obs = this.isEditing() && this.editingId()
      ? this.facade.update(this.editingId()!, data)
      : this.facade.create(cid, data);

    obs.subscribe({
      next: (result) => {
        this.saving.set(false);
        if (result.success) {
          this.closeForm();
          this.loadAll();
        } else {
          this.error.set(result.message);
        }
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err.error?.error || 'Failed to save');
      }
    });
  }

  viewRecord(item: FinancialIndicatorSummary): void {
    this.facade.get(item.id).subscribe({
      next: (r) => {
        this.viewingRecord.set(r);
        this.showView.set(true);
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Failed to load record');
      }
    });
  }

  closeView(): void {
    this.showView.set(false);
    this.viewingRecord.set(null);
  }

  editRecord(item: FinancialIndicatorSummary): void {
    this.facade.get(item.id).subscribe({
      next: (r) => {
        this.isEditing.set(true);
        this.editingId.set(r.id);
        this.editingData.set(r.data);
        this.showForm.set(true);
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Failed to load record');
      }
    });
  }

  deleteRecord(item: FinancialIndicatorSummary): void {
    if (!confirm('Delete this financial report?')) return;

    this.facade.delete(item.id).subscribe({
      next: (result) => {
        if (result.success) {
          this.loadAll();
        } else {
          this.error.set(result.message);
        }
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Failed to delete');
      }
    });
  }

  openRequestDialog(): void {
    this.showRequest.set(true);
  }

  closeRequest(): void {
    this.showRequest.set(false);
  }

  scrollToAnnual(): void {
    const el = document.getElementById('annual-report-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }
}
