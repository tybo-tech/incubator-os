// src/app/components/dynamic-company-detail/dynamic-company-detail.component.ts
import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Import our foundation services
import { CompanyContextService } from '../../../services/company-context.service';
import { TabConfigurationService, TabConfig, TabGroup } from '../../../services/tab-configuration.service';

// Import existing shared components
import { LoadingStateComponent } from '../companies/company-detail/loading-state/loading-state.component';
import { ErrorStateComponent } from '../companies/company-detail/error-state/error-state.component';
import { CompanyHeaderComponent } from '../companies/company-detail/company-header/company-header.component';
import { ContextItem } from '../companies/company-detail/context-breadcrumb/context-breadcrumb.component';

// Import our new simplified components
import { CompanyFormManagementComponent } from './company-form-management/company-form-management.component';
import { CompanyTabsComponent } from './company-tabs/company-tabs.component';
import { FormSelectorComponent } from './form-selector/form-selector.component';
import { FormCreationModalComponent, ProgramContext } from './form-creation/form-creation-modal.component';

// Import models
import { ICompany } from '../../../models/simple.schema';
import { IForm } from '../../../models/form-system.models';
import { CompanyService } from '../../../services/company.service';
import { FormService } from '../../../services/form.service';

export interface CompanyContext {
  clientId?: number;
  clientName?: string;
  programId?: number;
  programName?: string;
  cohortId?: number;
  cohortName?: string;
}

@Component({
  selector: 'app-dynamic-company-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LoadingStateComponent,
    ErrorStateComponent,
    CompanyHeaderComponent,
    CompanyFormManagementComponent,
    CompanyTabsComponent,
    FormSelectorComponent,
    FormCreationModalComponent
  ],
  template: `
    <div class="min-h-screen bg-gray-50">

      <!-- Loading State -->
      <app-loading-state
        *ngIf="isLoading()"
        message="Loading company details...">
      </app-loading-state>

      <!-- Error State -->
      <app-error-state
        *ngIf="error() && !isLoading()"
        [error]="error()!"
        (goBack)="navigateBack()">
      </app-error-state>

      <!-- Main Content -->
      <div *ngIf="!isLoading() && !error() && company()" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        <!-- Company Header -->
        <div class="mb-6">
          <app-company-header
            [company]="company()!"
            (editCompany)="openEditModal()">
          </app-company-header>
        </div>

        <!-- Form Selector (Top Level) -->
        <app-form-selector
          [context]="companyContextSignal()"
          [availableForms]="availableForms()"
          [selectedFormId]="selectedFormId()"
          [isLoading]="isLoadingForms()"
          [canCreateForms]="canCreateForms()"
          (formSelected)="onFormSelectedFromDropdown($event)"
          (createFormRequested)="openFormCreationModal()"
          (editFormRequested)="openFormEditModal($event)"
          (navigateToContext)="onNavigateToContext($event)"
          (navigateToOverview)="navigateBack()">>
        </app-form-selector>

        <!-- Form Management Section (Hidden - logic moved to form selector) -->
        <app-company-form-management
          [context]="companyContextSignal"
          [companyId]="companyId"
          (formSelected)="onFormSelected($event)"
          (formsLoaded)="onFormsLoaded($event)"
          style="display: none;">
        </app-company-form-management>

        <!-- Company Tabs (Focused on selected form) -->
        <app-company-tabs
          [tabs]="allTabs"
          [tabGroups]="tabGroups"
          [activeTabId]="activeTabId"
          (tabSelected)="onTabSelected($event)"
          (groupToggled)="onGroupToggled($event)">
        </app-company-tabs>

      </div>

      <!-- Form Creation Modal -->
      <app-form-creation-modal
        [show]="showFormCreationModal"
        [programContext]="programContextForModal"
        [isCreating]="isCreatingForm"
        (formCreated)="onFormCreated($event)"
        (cancelled)="closeFormCreationModal()">
      </app-form-creation-modal>

      <!-- Form Edit Modal -->
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" *ngIf="showFormEditModal()">
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-semibold text-gray-900">Edit Form</h3>
          </div>

          <div class="px-6 py-4" *ngIf="editingForm()">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Form Title</label>
                <input
                  type="text"
                  [(ngModel)]="editingForm()!.title"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  [(ngModel)]="editingForm()!.description"
                  rows="3"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"></textarea>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Scope</label>
                <select
                  [(ngModel)]="editingForm()!.scope_type"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="client">Client</option>
                  <option value="program">Program</option>
                  <option value="cohort">Cohort</option>
                  <option value="global">Global</option>
                </select>
              </div>

              <!-- Error Message -->
              <div class="bg-red-50 border border-red-200 rounded-md p-3" *ngIf="editFormError()">
                <div class="flex">
                  <i class="fas fa-exclamation-triangle text-red-400 mr-2 mt-0.5"></i>
                  <p class="text-sm text-red-700">{{ editFormError() }}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-150"
              (click)="closeFormEditModal()">
              Cancel
            </button>
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors duration-150"
              (click)="saveFormChanges()"
              [disabled]="isEditingForm()">
              {{ isEditingForm() ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Debug Panel (Development Only) -->
      <div class="fixed bottom-4 right-4 max-w-sm bg-gray-900 text-white p-4 rounded-lg text-xs z-50" *ngIf="showDebugPanel">
        <div class="text-yellow-400 font-semibold mb-2">🔧 Debug Info</div>
        <div class="space-y-1">
          <div><strong>Company ID:</strong> {{ companyId() }}</div>
          <div><strong>Active Tab:</strong> {{ activeTabId() }}</div>
          <div><strong>Tab Count:</strong> {{ allTabs().length }}</div>
          <div><strong>Context:</strong></div>
          <pre class="text-xs bg-gray-800 p-2 rounded mt-1 max-h-32 overflow-y-auto">{{ companyContext() | json }}</pre>
        </div>
      </div>

    </div>
  `
})
export class DynamicCompanyDetailComponent implements OnInit, OnDestroy {

  // Reactive signals
  companyId = signal<number | null>(null);
  company = signal<ICompany | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);

  // Tab management
  allTabs = signal<TabConfig[]>([]);
  tabGroups = signal<TabGroup[]>([]);
  activeTabId = signal<string>('overview');

  // Form management
  availableForms = signal<IForm[]>([]);
  selectedFormId = signal<number | null>(null);
  isLoadingForms = signal(false);
  canCreateForms = signal(true);

  // Form creation modal
  showFormCreationModal = signal(false);
  isCreatingForm = signal(false);
  programContextForModal = signal<ProgramContext | null>(null);

  // Form edit modal
  showFormEditModal = signal(false);
  editingForm = signal<IForm | null>(null);
  isEditingForm = signal(false);
  editFormError = signal<string | null>(null);

  // Context management
  companyContext = signal<CompanyContext>({});

  // For passing to child components
  companyContextSignal = this.companyContext;

  // Development flag
  showDebugPanel = false; // Set to true during development

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private companyService: CompanyService,
    private companyContextService: CompanyContextService,
    private tabConfigurationService: TabConfigurationService,
    private formService: FormService
  ) {}

  ngOnInit() {
    // Get company ID from route
    this.route.params.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      const id = parseInt(params['id'], 10);
      if (id && !isNaN(id)) {
        this.companyId.set(id);
        this.loadCompanyData();
      } else {
        this.error.set('Invalid company ID');
        this.isLoading.set(false);
      }
    });

    // Get context from query parameters
    this.route.queryParams.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      this.loadContextFromParams(params);
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Data loading methods
  loadCompanyData() {
    const id = this.companyId();
    if (!id) return;

    this.isLoading.set(true);
    this.error.set(null);

    // Load company details
    this.companyService.getCompanyById(id).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (company: ICompany) => {
        this.company.set(company);
        this.companyContextService.setCompany(company);

        // Load static tabs initially
        this.loadStaticTabs();
        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.error('Failed to load company:', error);
        this.error.set('Failed to load company details');
        this.isLoading.set(false);
      }
    });
  }

  loadStaticTabs() {
    // Load static tabs as fallback
    const staticTabs = this.tabConfigurationService.getStaticTabsConfig();
    this.allTabs.set(staticTabs);
    this.generateTabGroups(staticTabs);
    this.setDefaultActiveTab(staticTabs);
  }

  // Context management
  loadContextFromParams(params: any) {
    const context: CompanyContext = {};

    if (params['clientId']) {
      context.clientId = parseInt(params['clientId'], 10);
      context.clientName = params['clientName'] || `Client ${context.clientId}`;
    }

    if (params['programId']) {
      context.programId = parseInt(params['programId'], 10);
      context.programName = params['programName'] || `Program ${context.programId}`;
    }

    if (params['cohortId']) {
      context.cohortId = parseInt(params['cohortId'], 10);
      context.cohortName = params['cohortName'] || `Cohort ${context.cohortId}`;
    }

    // Handle form ID from URL
    if (params['formId']) {
      const formId = parseInt(params['formId'], 10);
      if (!isNaN(formId)) {
        this.selectedFormId.set(formId);
      }
    }

    this.companyContext.set(context);
  }

  // Event handlers from child components
  onFormsLoaded(tabs: TabConfig[]) {
    console.log('Forms loaded, updating tabs:', tabs);
    this.allTabs.set(tabs);
    this.generateTabGroups(tabs);
    this.setDefaultActiveTab(tabs);

    // Extract forms from tabs and update available forms
    const forms = this.extractFormsFromTabs(tabs);
    this.availableForms.set(forms);
  }

  extractFormsFromTabs(tabs: TabConfig[]): IForm[] {
    return tabs
      .filter(tab => tab.form !== undefined)
      .map(tab => tab.form!)
      .filter((form, index, array) =>
        // Remove duplicates based on form id
        array.findIndex(f => f.id === form.id) === index
      );
  }

  onFormSelected(form: IForm) {
    console.log('Form selected:', form);
    // Navigate to the form tab
    this.activeTabId.set(`form_${form.id}`);
  }

  onFormSelectedFromDropdown(form: IForm) {
    console.log('Form selected from dropdown:', form);
    this.selectedFormId.set(form.id);

    // Update URL with formId query parameter
    this.updateUrlWithFormId(form.id);

    // Navigate to the form tab
    this.activeTabId.set(`form_${form.id}`);
  }

  onNavigateToContext(item: ContextItem) {
    console.log('Navigate to context:', item);
    const context = this.companyContext();
    const queryParams: any = {};

    // Include context based on the navigation target (IDs only)
    if (item.type === 'client') {
      queryParams.clientId = item.id;
    } else if (item.type === 'program') {
      // Include client context if available
      if (context.clientId) {
        queryParams.clientId = context.clientId;
      }
      queryParams.programId = item.id;
    } else if (item.type === 'cohort') {
      // Include client and program context if available
      if (context.clientId) {
        queryParams.clientId = context.clientId;
      }
      if (context.programId) {
        queryParams.programId = context.programId;
      }
      queryParams.cohortId = item.id;
    }

    this.router.navigate(['/', 'overview'], { queryParams });
  }

  openFormCreationModal() {
    console.log('Opening form creation modal');
    this.programContextForModal.set(this.getProgramContext());
    this.showFormCreationModal.set(true);
  }

  openFormEditModal(form: IForm) {
    console.log('Opening form edit modal for:', form);
    this.editingForm.set(form);
    this.editFormError.set(null);
    this.showFormEditModal.set(true);
  }

  closeFormCreationModal() {
    this.showFormCreationModal.set(false);
    this.isCreatingForm.set(false);
  }

  closeFormEditModal() {
    this.showFormEditModal.set(false);
    this.editingForm.set(null);
    this.isEditingForm.set(false);
    this.editFormError.set(null);
  }

  onFormUpdated(form: IForm) {
    console.log('Form updated:', form);
    this.closeFormEditModal();

    // Refresh the forms list
    this.loadStaticTabs();

    // Keep the current form selected if it was being edited
    if (this.selectedFormId() === form.id) {
      this.updateUrlWithFormId(form.id);
      this.activeTabId.set(`form_${form.id}`);
    }
  }

  saveFormChanges() {
    const form = this.editingForm();
    if (!form || !form.id) return;

    this.isEditingForm.set(true);
    this.editFormError.set(null);

    // Use the actual FormService to update the form
    this.formService.updateForm(form.id, {
      title: form.title,
      description: form.description,
      scope_type: form.scope_type
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (updatedForm) => {
        console.log('Form updated successfully:', updatedForm);
        this.onFormUpdated(updatedForm);
      },
      error: (error) => {
        console.error('Error updating form:', error);
        this.isEditingForm.set(false);
        this.editFormError.set('Failed to update form. Please try again.');
      }
    });
  }

  onFormCreated(form: IForm) {
    console.log('Form created:', form);
    this.closeFormCreationModal();

    // Refresh the forms list
    this.loadStaticTabs();

    // Select the newly created form
    this.selectedFormId.set(form.id);
    this.updateUrlWithFormId(form.id);
    this.activeTabId.set(`form_${form.id}`);
  }

  private getProgramContext(): ProgramContext | null {
    const ctx = this.companyContext();
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

  onTabSelected(tabId: string) {
    console.log('Tab selected:', tabId);
    this.activeTabId.set(tabId);
  }

  onGroupToggled(groupName: string) {
    console.log('Group toggled:', groupName);
    // Handle group toggle logic if needed
  }

  // Tab management helpers
  generateTabGroups(tabs: TabConfig[]) {
    const groups = this.tabConfigurationService.getTabGroups(tabs);
    this.tabGroups.set(groups);
  }

  setDefaultActiveTab(tabs: TabConfig[]) {
    const defaultTabId = this.tabConfigurationService.getDefaultActiveTab(tabs);
    this.activeTabId.set(defaultTabId);
  }

  // URL and navigation management
  updateUrlWithFormId(formId: number) {
    const context = this.companyContext();
    const queryParams: any = {};

    // Preserve existing context
    if (context.clientId) queryParams.clientId = context.clientId;
    if (context.programId) queryParams.programId = context.programId;
    if (context.cohortId) queryParams.cohortId = context.cohortId;

    // Add form ID
    queryParams.formId = formId;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'replace'
    });
  }
  navigateBack() {
    const context = this.companyContext();
    const queryParams: any = {};

    if (context.clientId) queryParams.clientId = context.clientId;
    if (context.programId) queryParams.programId = context.programId;
    if (context.cohortId) queryParams.cohortId = context.cohortId;

    this.router.navigate(['/', 'overview'], { queryParams });
  }

  openEditModal() {
    console.log('Edit modal opened');
    // TODO: Implement edit modal
  }
}
