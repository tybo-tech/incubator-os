import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GrantFundingStateService } from './services/grant-funding-state.service';

@Component({
  selector: 'app-grant-funding-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Bulk Action Bar -->
    <div
      *ngIf="state.selectedIds().size > 0"
      class="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between gap-3"
    >
      <div class="flex items-center gap-3">
        <i class="fas fa-circle-check text-blue-600 text-lg"></i>
        <span class="text-sm font-medium text-blue-900">
          {{ state.selectedIds().size }} application(s) selected
        </span>
      </div>
      <div class="flex items-center gap-2">
        <button
          (click)="state.openBulkModal()"
          class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700
                 transition-colors flex items-center gap-2"
        >
          <i class="fas fa-arrow-right text-xs"></i>
          Move to Stage
        </button>
        <button
          (click)="state.clearSelection()"
          class="px-3 py-2 text-gray-600 text-sm hover:text-gray-900 transition-colors"
        >
          Clear
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div *ngIf="state.isLoading()" class="flex justify-center items-center py-16">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span class="ml-3 text-gray-500 text-sm">Loading applications\u2026</span>
    </div>

    <!-- Error -->
    <div
      *ngIf="state.error() && !state.isLoading()"
      class="bg-red-50 border border-red-200 rounded-lg p-6 text-center"
    >
      <p class="text-red-600 text-sm mb-3">{{ state.error() }}</p>
      <button
        (click)="state.loadApplications()"
        class="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
      >
        Try Again
      </button>
    </div>

    <!-- Empty state -->
    <div
      *ngIf="!state.isLoading() && !state.error() && state.filtered().length === 0"
      class="text-center py-16 bg-white rounded-xl border border-gray-200"
    >
      <div class="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <i class="fas fa-file-lines text-blue-400 text-xl"></i>
      </div>
      <h3 class="text-sm font-medium text-gray-900 mb-1">
        {{ state.applications().length === 0 ? 'No applications yet' : 'No matching applications' }}
      </h3>
      <p class="text-sm text-gray-500 mb-5">
        {{ state.applications().length === 0 ? 'Add the first application to get started.' : 'Try adjusting your search or filter.' }}
      </p>
      <button
        *ngIf="state.applications().length === 0"
        (click)="state.openCreateModal()"
        class="px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
      >
        Add First Application
      </button>
    </div>

    <!-- Applications Table -->
    <div
      *ngIf="!state.isLoading() && !state.error() && state.filtered().length > 0"
      class="bg-white rounded-xl border border-gray-200 overflow-hidden"
    >
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="text-left px-4 py-3 w-12">
                <input
                  type="checkbox"
                  [checked]="state.allSelected()"
                  [indeterminate]="state.someSelected()"
                  (change)="state.toggleSelectAll()"
                  class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </th>
              <th class="text-left px-4 py-3 font-medium text-gray-600">Company</th>
              <th class="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Reg. No</th>
              <th class="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Province</th>
              <th class="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Turnover</th>
              <th class="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th class="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr
              *ngFor="let app of state.filtered()"
              class="hover:bg-gray-50 transition-colors"
              [class.bg-blue-50]="state.isSelected(app.id)"
            >
              <td class="px-4 py-3" (click)="$event.stopPropagation()">
                <input
                  type="checkbox"
                  [checked]="state.isSelected(app.id)"
                  (change)="state.toggleSelect(app.id)"
                  class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </td>
              <td class="px-4 py-3 cursor-pointer" (click)="state.openApplicant(app)">
                <div class="flex items-center space-x-3">
                  <div class="w-8 h-8 bg-gradient-to-br from-green-400 to-teal-500 rounded-lg
                              flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {{ (app.data.company_name || '?')[0].toUpperCase() }}
                  </div>
                  <span class="font-medium text-gray-900">{{ app.data.company_name }}</span>
                </div>
              </td>
              <td class="px-4 py-3 hidden sm:table-cell text-gray-500 cursor-pointer" (click)="state.openApplicant(app)">
                {{ app.data.registration_number || '\u2014' }}
              </td>
              <td class="px-4 py-3 hidden md:table-cell text-gray-500 cursor-pointer" (click)="state.openApplicant(app)">
                {{ app.data.province || '\u2014' }}
              </td>
              <td class="px-4 py-3 hidden lg:table-cell cursor-pointer" (click)="state.openApplicant(app)">
                <ng-container *ngIf="app.data.bank_statement_months || app.data.bank_statement_grand_total; else noTurnover">
                  <div class="flex items-center gap-1.5">
                    <span class="inline-flex items-center px-2 py-0.5 rounded-md bg-teal-50 text-teal-700
                                text-xs font-semibold border border-teal-100 tabular-nums">
                      {{ app.data.bank_statement_months ?? 0 }}M
                    </span>
                    <span class="inline-flex items-center px-2 py-0.5 rounded-md bg-teal-50 text-teal-700
                                text-xs font-semibold border border-teal-100 tabular-nums">
                      {{ state.formatAmount(app.data.bank_statement_grand_total) }}
                    </span>
                  </div>
                </ng-container>
                <ng-template #noTurnover>
                  <span class="text-gray-300 text-xs">\u2014</span>
                </ng-template>
              </td>
              <td class="px-4 py-3 cursor-pointer" (click)="state.openApplicant(app)">
                <span [class]="state.statusClass(app.data.status)">
                  {{ state.statusLabel(app.data.status) }}
                </span>
              </td>
              <td class="px-4 py-3 text-right" (click)="$event.stopPropagation()">
                <div class="flex items-center justify-end space-x-1">
                  <button
                    (click)="state.openApplicant(app)"
                    class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="View / Edit"
                  >
                    <i class="fas fa-eye text-sm"></i>
                  </button>
                  <button
                    (click)="state.deleteApplication(app)"
                    class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete"
                  >
                    <i class="fas fa-trash-can text-sm"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
        Showing {{ state.filtered().length }} of {{ state.applications().length }} applications
      </div>
    </div>
  `,
})
export class GrantFundingTableComponent {
  state = inject(GrantFundingStateService);
}
