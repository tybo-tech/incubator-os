// src/app/components/dynamic-company-detail/dynamic-company-detail.component.ts
import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { ContextBreadcrumbComponent, ContextItem } from '../companies/company-detail/context-breadcrumb/context-breadcrumb.component';

// Import our new simplified components
import { CompanyFormManagementComponent } from './company-form-management/company-form-management.component';
import { CompanyTabsComponent } from './company-tabs/company-tabs.component';
import { FormSelectorComponent } from './form-selector/form-selector.component';

// Import models
import { ICompany } from '../../../models/simple.schema';
import { IForm } from '../../../models/form-system.models';
import { CompanyService } from '../../../services/company.service';

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
    LoadingStateComponent,
    ErrorStateComponent,
    CompanyHeaderComponent,
    ContextBreadcrumbComponent,
    CompanyFormManagementComponent,
    CompanyTabsComponent,
    FormSelectorComponent
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

        <!-- Context Breadcrumb -->
        <app-context-breadcrumb
          [context]="contextBreadcrumb()"
          (navigateBack)="navigateBack()">
        </app-context-breadcrumb>

        <!-- Company Header -->
        <div class="mb-6">
          <app-company-header
            [company]="company()!"
            (editCompany)="openEditModal()">
          </app-company-header>
        </div>

        <!-- Form Selector (Top Level) -->
        <app-form-selector
          [context]="companyContextSignal"
          [availableForms]="availableForms"
          [selectedFormId]="selectedFormId"
          [isLoading]="isLoadingForms"
          [canCreateForms]="canCreateForms"
          (formSelected)="onFormSelectedFromDropdown($event)"
          (createFormRequested)="openFormCreationModal()">
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

  // Context management
  companyContext = signal<CompanyContext>({});
  contextBreadcrumb = signal<ContextItem[]>([]);

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
    private tabConfigurationService: TabConfigurationService
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
    const breadcrumb: ContextItem[] = [];

    if (params['clientId']) {
      context.clientId = parseInt(params['clientId'], 10);
      context.clientName = params['clientName'] || `Client ${context.clientId}`;
      breadcrumb.push({
        type: 'client',
        name: context.clientName!,
        id: context.clientId!
      });
    }

    if (params['programId']) {
      context.programId = parseInt(params['programId'], 10);
      context.programName = params['programName'] || `Program ${context.programId}`;
      breadcrumb.push({
        type: 'program',
        name: context.programName!,
        id: context.programId!
      });
    }

    if (params['cohortId']) {
      context.cohortId = parseInt(params['cohortId'], 10);
      context.cohortName = params['cohortName'] || `Cohort ${context.cohortId}`;
      breadcrumb.push({
        type: 'cohort',
        name: context.cohortName!,
        id: context.cohortId!
      });
    }

    // Handle form ID from URL
    if (params['formId']) {
      const formId = parseInt(params['formId'], 10);
      if (!isNaN(formId)) {
        this.selectedFormId.set(formId);
      }
    }

    this.companyContext.set(context);
    this.contextBreadcrumb.set(breadcrumb);
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

  openFormCreationModal() {
    console.log('Opening form creation modal');
    // TODO: Implement form creation modal logic
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
