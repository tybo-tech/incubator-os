// src/app/components/dynamic-company-detail/company-form-management/company-form-management.component.ts
import { Component, Input, Output, EventEmitter, signal, computed, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { FormService } from '../../../../services/form.service';
import { TabConfigurationService, TabConfig } from '../../../../services/tab-configuration.service';
import { IForm } from '../../../../models/form-system.models';
import { FormCreationModalComponent, ProgramContext } from '../form-creation/form-creation-modal.component';

export interface CompanyContext {
  clientId?: number;
  clientName?: string;
  programId?: number;
  programName?: string;
  cohortId?: number;
  cohortName?: string;
}

@Component({
  selector: 'app-company-form-management',
  standalone: true,
  imports: [CommonModule, FormCreationModalComponent],
  template: `
    <!-- Form Management Section -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">

      <!-- Section Header -->
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between p-6 border-b border-gray-200 gap-4">
        <div class="flex-1">
          <h4 class="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-2">
            <i class="fas fa-file-alt text-blue-600"></i>
            Company Forms
          </h4>
          <p class="text-sm text-gray-600">
            Manage forms and assessments for this company in the current program context
          </p>
        </div>

        <div class="flex items-center gap-3">
          <button
            type="button"
            class="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors duration-200 gap-2 disabled:cursor-not-allowed"
            (click)="openFormCreationModal()"
            [disabled]="!canCreateForms() || isCreatingForm()"
            [title]="canCreateForms() ? 'Create a new form for this company' : 'Program context required to create forms'">
            <i class="fas fa-plus" *ngIf="!isCreatingForm()"></i>
            <i class="fas fa-spinner fa-spin" *ngIf="isCreatingForm()"></i>
            {{ isCreatingForm() ? 'Creating...' : 'Create New Form' }}
          </button>

          <button
            type="button"
            class="inline-flex items-center px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg transition-colors duration-200 gap-2"
            (click)="refreshForms()"
            [disabled]="isLoading()"
            title="Refresh forms and data">
            <i class="fas fa-refresh" [class.fa-spin]="isLoading()"></i>
            Refresh
          </button>
        </div>
      </div>

      <!-- Context Display -->
      <div class="px-6 py-4 bg-gray-50 border-b border-gray-200" *ngIf="context()?.programId">
        <div class="inline-flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
          <i class="fas fa-layer-group text-xs"></i>
          <span>
            {{ context()?.programName || 'Program ' + context()?.programId }}
            →
            {{ context()?.cohortName || 'Cohort ' + context()?.cohortId }}
          </span>
        </div>
      </div>

      <!-- Loading State -->
      <div class="p-8 text-center" *ngIf="isLoading()">
        <div class="flex flex-col items-center gap-3">
          <i class="fas fa-spinner fa-spin text-2xl text-gray-400"></i>
          <p class="text-gray-600">Loading forms...</p>
        </div>
      </div>

      <!-- Forms List -->
      <div class="p-6" *ngIf="!isLoading() && forms().length > 0">
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div
            *ngFor="let form of forms()"
            class="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer"
            (click)="selectForm(form)">
            <div class="flex items-start justify-between mb-3">
              <div class="flex items-center gap-2">
                <i class="fas fa-file-alt text-blue-600"></i>
                <h5 class="font-medium text-gray-900 text-sm">{{ form.title }}</h5>
              </div>
              <span class="px-2 py-1 text-xs font-medium rounded-full"
                    [class]="getStatusClasses(form.status)">
                {{ form.status }}
              </span>
            </div>

            <p class="text-xs text-gray-600 mb-3" *ngIf="form.description">
              {{ form.description }}
            </p>

            <div class="flex items-center justify-between text-xs text-gray-500">
              <span class="px-2 py-1 bg-gray-100 rounded">
                {{ getScopeLabel(form.scope_type) }}
              </span>
              <span>v{{ form.version }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div class="p-8 text-center" *ngIf="!isLoading() && forms().length === 0">
        <div class="flex flex-col items-center gap-4">
          <i class="fas fa-folder-open text-4xl text-gray-300"></i>
          <div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">No Forms Available</h3>
            <p class="text-gray-600 mb-4">
              This company doesn't have any available forms for the current program context.
            </p>
            <button
              type="button"
              class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 gap-2"
              (click)="openFormCreationModal()"
              *ngIf="canCreateForms()">
              <i class="fas fa-plus"></i>
              Create Your First Form
            </button>
          </div>
        </div>
      </div>

    </div>

    <!-- Form Creation Modal -->
    <app-form-creation-modal
      [show]="showFormCreationModal"
      [programContext]="programContextForModal"
      [isCreating]="isCreatingForm"
      (formCreated)="onFormCreated($event)"
      (cancelled)="closeFormCreationModal()">
    </app-form-creation-modal>
  `
})
export class CompanyFormManagementComponent implements OnInit, OnDestroy {
  @Input() context = signal<CompanyContext | null>(null);
  @Input() companyId = signal<number | null>(null);

  @Output() formSelected = new EventEmitter<IForm>();
  @Output() formsLoaded = new EventEmitter<TabConfig[]>();

  // State signals
  forms = signal<IForm[]>([]);
  isLoading = signal(false);
  showFormCreationModal = signal(false);
  isCreatingForm = signal(false);
  programContextForModal = signal<ProgramContext | null>(null);

  // Computed
  canCreateForms = computed(() => {
    const ctx = this.context();
    return !!(ctx?.programId && ctx?.cohortId);
  });

  private destroy$ = new Subject<void>();

  constructor(
    private formService: FormService,
    private tabConfigurationService: TabConfigurationService
  ) {
    // Watch for context changes and reload forms using effect
    effect(() => {
      const ctx = this.context();
      if (ctx?.programId && ctx?.cohortId && ctx?.clientId && this.companyId()) {
        this.loadForms(ctx.clientId, ctx.programId, ctx.cohortId);
      }
    });
  }

  ngOnInit() {
    // Component initialization logic can go here if needed
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadForms(clientId: number, programId: number, cohortId: number) {
    console.log('Loading forms for:', { clientId, programId, cohortId });

    this.isLoading.set(true);

    // Search for forms at different scope levels
    const searchObservables = [
      this.formService.searchForms({ scope_type: 'global' }),
      this.formService.searchForms({ scope_type: 'client', scope_id: clientId }),
      this.formService.searchForms({ scope_type: 'program', scope_id: programId }),
      this.formService.searchForms({ scope_type: 'cohort', scope_id: cohortId })
    ];

    combineLatest(searchObservables).pipe(
      takeUntil(this.destroy$)
    ).subscribe(
      (results: IForm[][]) => {
        const [globalForms, clientForms, programForms, cohortForms] = results;
        console.log('Forms loaded:', {
          global: globalForms?.length || 0,
          client: clientForms?.length || 0,
          program: programForms?.length || 0,
          cohort: cohortForms?.length || 0
        });

        // Combine all forms
        const allForms = [
          ...(globalForms || []),
          ...(clientForms || []),
          ...(programForms || []),
          ...(cohortForms || [])
        ];

        this.forms.set(allForms);
        this.generateTabsFromForms(allForms);
        this.isLoading.set(false);
      },
      (error: any) => {
        console.error('Failed to load forms:', error);
        this.isLoading.set(false);
      }
    );
  }

  private generateTabsFromForms(forms: IForm[]) {
    console.log('Generating tabs from forms:', forms);

    // Get static tabs
    const staticTabs = this.tabConfigurationService.getStaticTabsConfig();

    // Convert forms to tabs (matching TabConfig interface)
    const formTabs: TabConfig[] = forms.map(form => ({
      id: `form_${form.id}`,
      title: form.title,
      icon: 'fas fa-file-alt',
      type: 'dynamic' as const,
      order: 100 + form.id,
      loading: false,
      enabled: true,
      visible: true,
      form: form,
      description: form.description || `Form: ${form.title}`
    }));

    // Combine all tabs
    const allTabs = [...staticTabs, ...formTabs].sort((a, b) => a.order - b.order);

    console.log('Generated tabs:', allTabs);

    // Emit tabs to parent
    this.formsLoaded.emit(allTabs);
  }

  // Form actions
  selectForm(form: IForm) {
    this.formSelected.emit(form);
  }

  refreshForms() {
    const ctx = this.context();
    if (ctx?.clientId && ctx?.programId && ctx?.cohortId) {
      this.loadForms(ctx.clientId, ctx.programId, ctx.cohortId);
    }
  }

  // Form creation modal
  openFormCreationModal() {
    this.programContextForModal.set(this.getProgramContext());
    this.showFormCreationModal.set(true);
  }

  closeFormCreationModal() {
    this.showFormCreationModal.set(false);
    this.isCreatingForm.set(false);
  }

  onFormCreated(form: IForm) {
    console.log('Form created:', form);
    this.closeFormCreationModal();
    this.refreshForms(); // Reload forms to show the new one
  }

  private getProgramContext(): ProgramContext | null {
    const ctx = this.context();
    if (!ctx?.clientId || !ctx?.programId || !ctx?.cohortId) {
      return null;
    }

    return {
      clientId: ctx.clientId,
      clientName: ctx.clientName || `Client ${ctx.clientId}`,
      programId: ctx.programId,
      programName: ctx.programName || `Program ${ctx.programId}`,
      cohortId: ctx.cohortId,
      cohortName: ctx.cohortName || `Cohort ${ctx.cohortId}`
    };
  }

  // Helper methods
  getStatusClasses(status: string): string {
    switch (status) {
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  }

  getScopeLabel(scopeType: string): string {
    switch (scopeType) {
      case 'global':
        return 'Global';
      case 'client':
        return 'Client';
      case 'program':
        return 'Program';
      case 'cohort':
        return 'Cohort';
      default:
        return scopeType;
    }
  }
}
