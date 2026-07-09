import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GrantFundingStateService } from './services/grant-funding-state.service';
import { GrantApplicationApiService, Cohort, ImportResult, UndoResult } from './services/grant-application-api.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-promote-to-cohort-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      *ngIf="state.showPromoteModal()"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      (click)="state.closePromoteModal()"
    >
      <div class="bg-white rounded-xl shadow-2xl max-w-lg w-full" (click)="$event.stopPropagation()">

        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ state.promoteMode() === 'import' ? 'Promote to Cohort' : 'Undo from Cohort' }}
          </h3>
          <p class="text-sm text-gray-500 mt-1">
            {{ state.promoteMode() === 'import'
              ? 'Import ' + state.filtered().length + ' applicant(s) into a cohort as companies'
              : 'Remove all companies from this cohort and revert the import'
            }}
          </p>
        </div>

        <!-- Import mode -->
        <ng-container *ngIf="state.promoteMode() === 'import'">
          <div class="px-6 py-4 space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Destination Cohort <span class="text-red-500">*</span>
              </label>
              <select
                [(ngModel)]="selectedCohortId"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option [value]="0">-- Select a cohort --</option>
                <option *ngFor="let c of cohorts()" [value]="c.id">{{ c.name }}</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Status Filter
              </label>
              <select
                [(ngModel)]="selectedStatus"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All statuses</option>
                <option *ngFor="let stage of state.workflowStages()" [value]="stage.key">
                  {{ stage.label }}
                </option>
              </select>
              <p class="text-xs text-gray-400 mt-1">
                Only applicants at the selected workflow stage will be imported.
              </p>
            </div>
          </div>
        </ng-container>

        <!-- Undo mode -->
        <ng-container *ngIf="state.promoteMode() === 'undo'">
          <div class="px-6 py-4 space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Cohort to Undo <span class="text-red-500">*</span>
              </label>
              <select
                [(ngModel)]="selectedCohortId"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option [value]="0">-- Select a cohort --</option>
                <option *ngFor="let c of cohorts()" [value]="c.id">{{ c.name }}</option>
              </select>
            </div>
            <div class="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              <strong>Warning:</strong> This will detach all companies from the cohort,
              clear company IDs from applicant records, and delete any companies that
              were created during the import. Pre-existing companies will be kept.
            </div>
          </div>
        </ng-container>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            (click)="state.closePromoteModal()"
            [disabled]="isProcessing()"
            class="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg
                   hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            (click)="execute()"
            [disabled]="!selectedCohortId || isProcessing()"
            class="px-5 py-2 text-sm font-medium text-white rounded-lg
                   transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                   flex items-center gap-2"
            [class.bg-blue-600]="state.promoteMode() === 'import'"
            [class.bg-red-600]="state.promoteMode() === 'undo'"
            [class.hover:bg-blue-700]="state.promoteMode() === 'import'"
            [class.hover:bg-red-700]="state.promoteMode() === 'undo'"
          >
            <i *ngIf="!isProcessing()" class="fas" [class.fa-arrow-right]="state.promoteMode() === 'import'" [class.fa-rotate-left]="state.promoteMode() === 'undo'"></i>
            <div *ngIf="isProcessing()" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            {{ isProcessing() ? 'Processing\u2026' : state.promoteMode() === 'import' ? 'Promote to Cohort' : 'Undo Import' }}
          </button>
        </div>

        <!-- Result -->
        <div *ngIf="importResult() || undoResult()" class="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
          <div *ngIf="(importResult()?.summary?.errors ?? undoResult()?.summary?.errors ?? 0) === 0" class="text-sm text-green-700">
            <i class="fas fa-check-circle text-green-500 mr-1"></i>
            {{ state.promoteMode() === 'import' ? 'Import' : 'Undo' }} completed successfully.
            <span *ngIf="state.promoteMode() === 'import'">
              {{ importResult()?.summary?.inserted ?? 0 }} created,
              {{ importResult()?.summary?.updated ?? 0 }} updated,
              {{ importResult()?.summary?.attached_to_cohort ?? 0 }} attached to cohort.
            </span>
            <span *ngIf="state.promoteMode() === 'undo'">
              {{ undoResult()?.summary?.detached_from_cohort ?? 0 }} detached,
              {{ undoResult()?.summary?.companies_deleted ?? 0 }} companies deleted.
            </span>
          </div>
          <div *ngIf="(importResult()?.summary?.errors ?? undoResult()?.summary?.errors ?? 0) > 0" class="text-sm text-red-700">
            <i class="fas fa-exclamation-circle text-red-500 mr-1"></i>
            {{ importResult()?.summary?.errors ?? undoResult()?.summary?.errors ?? 0 }} error(s) occurred.
          </div>
        </div>

      </div>
    </div>
  `
})
export class PromoteToCohortModalComponent {
  state = inject(GrantFundingStateService);
  private api = inject(GrantApplicationApiService);
  private toast = inject(ToastService);

  cohorts = signal<Cohort[]>([]);
  selectedCohortId = 0;
  selectedStatus = '';
  isProcessing = signal(false);
  importResult = signal<ImportResult | null>(null);
  undoResult = signal<UndoResult | null>(null);

  ngOnInit(): void {
    this.api.getCohorts().subscribe({
      next: (cs) => this.cohorts.set(cs),
      error: () => this.toast.show('Failed to load cohorts', 'error'),
    });
  }

  execute(): void {
    if (!this.selectedCohortId) return;
    this.isProcessing.set(true);
    this.importResult.set(null);
    this.undoResult.set(null);

    if (this.state.promoteMode() === 'import') {
      this.api.executeImport(this.state.selectedIdsArray(), this.selectedCohortId, this.selectedStatus || undefined).subscribe({
        next: (r) => {
          this.importResult.set(r);
          this.isProcessing.set(false);
          this.state.loadApplications();
          this.toast.show(`Import complete: ${r.summary.inserted} created, ${r.summary.updated} updated`, 'success');
        },
        error: () => {
          this.isProcessing.set(false);
          this.toast.show('Import failed', 'error');
        },
      });
    } else {
      this.api.undoImport(this.selectedCohortId).subscribe({
        next: (r) => {
          this.undoResult.set(r);
          this.isProcessing.set(false);
          this.state.loadApplications();
          this.toast.show(`Undo complete: ${r.summary.companies_deleted} companies deleted`, 'success');
        },
        error: () => {
          this.isProcessing.set(false);
          this.toast.show('Undo failed', 'error');
        },
      });
    }
  }
}
