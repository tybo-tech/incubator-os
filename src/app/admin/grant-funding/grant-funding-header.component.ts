import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GrantFundingStateService } from './services/grant-funding-state.service';
import { CreateModalComponent, CreateModalConfig } from '../../shared/components';

@Component({
  selector: 'app-grant-funding-header',
  standalone: true,
  imports: [CommonModule, CreateModalComponent],
  template: `
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h2 class="text-xl font-semibold text-gray-900">Applications</h2>
        <p class="text-sm text-gray-500 mt-1">
          Applicants not yet assigned to a client or cohort — pending qualification.
        </p>
      </div>
      <div class="flex items-center gap-2 w-full sm:w-auto">
        <button
          (click)="state.openPromoteModal('import')"
          class="px-3.5 py-2 border border-teal-300 text-teal-700 rounded-lg hover:bg-teal-50
                 hover:border-teal-400 transition-colors flex items-center justify-center
                 text-sm gap-2 flex-shrink-0"
          title="Promote applicants to a cohort"
        >
          <i class="fas fa-arrow-up text-teal-600 text-xs"></i>
          <span class="hidden sm:inline">Promote</span>
        </button>
        <button
          (click)="state.openPromoteModal('undo')"
          class="px-3.5 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50
                 hover:border-red-400 transition-colors flex items-center justify-center
                 text-sm gap-2 flex-shrink-0"
          title="Undo last import from a cohort"
        >
          <i class="fas fa-rotate-left text-red-600 text-xs"></i>
          <span class="hidden sm:inline">Undo</span>
        </button>
        <button
          (click)="state.showWorkflowSettings.set(true)"
          class="px-3.5 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50
                 hover:border-gray-400 transition-colors flex items-center justify-center
                 text-sm gap-2 flex-shrink-0"
          title="Manage workflow stages and transitions"
        >
          <i class="fas fa-sliders text-gray-500 text-xs"></i>
          <span class="hidden sm:inline">Workflow</span>
        </button>
        <button
          (click)="state.goToReports()"
          class="px-3.5 py-2 border border-teal-300 text-teal-700 rounded-lg hover:bg-teal-50
                 hover:border-teal-400 transition-colors flex items-center justify-center
                 text-sm gap-2 flex-shrink-0"
          title="View grant funding reports and analytics"
        >
          <i class="fas fa-chart-bar text-teal-600 text-xs"></i>
          <span class="hidden sm:inline">Reports</span>
        </button>
        <button
          (click)="state.openCreateModal()"
          class="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                 transition-colors flex items-center justify-center text-sm font-medium"
        >
          <i class="fas fa-plus mr-2 text-xs"></i>
          Add Application
        </button>
      </div>
    </div>

    <app-create-modal
      [show]="state.showCreateModal()"
      [config]="createModalConfig"
      [isSubmitting]="state.isCreating"
      (cancel)="state.closeCreateModal()"
      (submit)="state.onCreateSubmit($event)"
    >
    </app-create-modal>
  `,
})
export class GrantFundingHeaderComponent {
  state = inject(GrantFundingStateService);

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
}
