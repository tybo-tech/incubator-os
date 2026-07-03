import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GrantFundingStateService } from './services/grant-funding-state.service';

@Component({
  selector: 'app-grant-funding-bulk-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      *ngIf="state.showBulkModal()"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      (click)="state.closeBulkModal()"
    >
      <div class="bg-white rounded-xl shadow-2xl max-w-md w-full" (click)="$event.stopPropagation()">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">Move Applications to Stage</h3>
          <p class="text-sm text-gray-500 mt-1">
            Moving {{ state.selectedIds().size }} application(s) to a new workflow stage
          </p>
        </div>

        <div class="px-6 py-4 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Target Stage <span class="text-red-500">*</span>
            </label>
            <select
              [(ngModel)]="state.bulkTargetStage"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">-- Select a stage --</option>
              <option *ngFor="let stage of state.workflowStages()" [value]="stage.key">
                {{ stage.label }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Note (optional)
            </label>
            <textarea
              [(ngModel)]="state.bulkNote"
              rows="3"
              placeholder="Add a note about this bulk change\u2026"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            ></textarea>
          </div>
        </div>

        <div class="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            (click)="state.closeBulkModal()"
            [disabled]="state.isBulkProcessing()"
            class="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg
                   hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            (click)="state.executeBulkStageChange()"
            [disabled]="!state.bulkTargetStage || state.isBulkProcessing()"
            class="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg
                   hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                   flex items-center gap-2"
          >
            <i *ngIf="!state.isBulkProcessing()" class="fas fa-check text-xs"></i>
            <div *ngIf="state.isBulkProcessing()" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            {{ state.isBulkProcessing() ? 'Processing\u2026' : 'Move Applications' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class GrantFundingBulkModalComponent {
  state = inject(GrantFundingStateService);
}
