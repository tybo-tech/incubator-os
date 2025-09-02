// src/app/components/dynamic-company-detail/dynamic-company-detail.component.ts
import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Import our foundation services
import { CompanyContextService } from '../../../services/company-context.service';
import { TabConfigurationService, TabConfig, TabGroup } from '../../../services/tab-configuration.service';

// Import existing shared components
import { LoadingStateComponent } from '../companies/company-detail/loading-state/loading-state.component';
import { ErrorStateComponent } from '../companies/company-detail/error-state/error-state.component';
import { CompanyHeaderComponent } from '../companies/company-detail/company-header/company-header.component';
import { ContextBreadcrumbComponent, ContextItem } from '../companies/company-detail/context-breadcrumb/context-breadcrumb.component';

// Import our new components (to be created)
import { FormCreationModalComponent, ProgramContext } from './form-creation/form-creation-modal.component';
// import { HybridTabsNavigationComponent } from './hybrid-tabs-navigation/hybrid-tabs-navigation.component';
// import { DynamicTabContentComponent } from './dynamic-tab-content/dynamic-tab-content.component';

// Import models
import { ICompany } from '../../../models/simple.schema';
import { ICategoryItemWithSession, CompanyFormTab, IForm } from '../../../models/form-system.models';
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
    LoadingStateComponent,
    ErrorStateComponent,
    CompanyHeaderComponent,
    ContextBreadcrumbComponent,
    FormCreationModalComponent,
    // HybridTabsNavigationComponent,
    // DynamicTabContentComponent
  ],
  template: `
    <div class="dynamic-company-detail">
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
      <div *ngIf="!isLoading() && !error() && company()" class="company-content">

        <!-- Context Breadcrumb -->
        <app-context-breadcrumb
          [context]="contextBreadcrumb()"
          (navigateBack)="navigateBack()">
        </app-context-breadcrumb>

        <!-- Company Header -->
        <app-company-header
          [company]="company()!"
          (editCompany)="openEditModal()">
        </app-company-header>

        <!-- Form Management Section -->
        <div class="form-management-section" *ngIf="company()">
          <div class="section-header">
            <div class="section-info">
              <h4 class="section-title">
                <i class="fas fa-file-alt"></i>
                Company Forms
              </h4>
              <p class="section-description">
                Manage forms and assessments for this company in the current program context
              </p>
            </div>
            <div class="section-actions">
              <button
                type="button"
                class="btn btn-primary btn-create-form"
                (click)="openFormCreationModal()"
                [disabled]="!canCreateForms() || isCreatingForm()"
                title="Create a new form for this company">
                <i class="fas fa-plus" *ngIf="!isCreatingForm()"></i>
                <i class="fas fa-spinner fa-spin" *ngIf="isCreatingForm()"></i>
                {{ isCreatingForm() ? 'Creating...' : 'Create New Form' }}
              </button>
              <button
                type="button"
                class="btn btn-outline-secondary"
                (click)="refreshData()"
                title="Refresh forms and data">
                <i class="fas fa-refresh"></i>
                Refresh
              </button>
            </div>
          </div>

          <!-- Program Context Display -->
          <div class="context-display" *ngIf="companyContext().programId">
            <div class="context-badge">
              <i class="fas fa-layer-group"></i>
              <span class="context-text">
                {{ companyContext().programName || 'Program ' + companyContext().programId }}
                →
                {{ companyContext().cohortName || 'Cohort ' + companyContext().cohortId }}
              </span>
            </div>
          </div>
        </div>

        <!-- Enrollment Context Selector - Remove this since we have context in breadcrumb -->
        <!-- <div class="enrollment-section" *ngIf="company()">
          <app-enrollment-context-selector
            [companyId]="company()!.id"
            [disabled]="isLoadingEnrollments()"
            (enrollmentSelected)="onEnrollmentSelected($event)"
            (contextChanged)="onContextChanged($event)">
          </app-enrollment-context-selector>
        </div> -->

        <!-- Hybrid Tabs Navigation -->
        <div class="tabs-section" *ngIf="tabGroups().length > 0">
          <!-- TODO: Add HybridTabsNavigationComponent -->
          <div class="placeholder-tabs">
            <h4>Tabs will go here</h4>
            <p>Active Tab: {{ activeTabId() }}</p>
            <p>Tab Count: {{ allTabs().length }}</p>
          </div>
        </div>

        <!-- Dynamic Tab Content -->
        <div class="tab-content-section" *ngIf="activeTab()">
          <!-- TODO: Add DynamicTabContentComponent -->
          <div class="placeholder-content">
            <h4>Tab Content: {{ activeTab()?.title }}</h4>
            <p>Type: {{ activeTab()?.type }}</p>
            <p>Loading: {{ isLoadingTabContent() }}</p>
          </div>
        </div>

        <!-- Empty State for No Tabs -->
        <div class="empty-tabs-state" *ngIf="!isLoading() && tabGroups().length === 0">
          <div class="empty-state-content">
            <i class="fas fa-folder-open text-muted"></i>
            <h3>No Forms Available</h3>
            <p>This company doesn't have any available forms for the current program context.</p>

            <div class="empty-state-actions">
              <button
                type="button"
                class="btn btn-primary"
                (click)="openFormCreationModal()"
                *ngIf="canCreateForms()">
                <i class="fas fa-plus"></i> Create New Form
              </button>
              <button
                type="button"
                class="btn btn-secondary"
                (click)="refreshData()">
                <i class="fas fa-refresh"></i> Refresh Data
              </button>
            </div>
          </div>
        </div>        <!-- Form Creation Modal -->
        <app-form-creation-modal
          [show]="showFormCreationModal"
          [programContext]="programContextForModal"
          [isCreating]="isCreatingForm"
          (formCreated)="onFormCreated($event)"
          (cancelled)="closeFormCreationModal()">
        </app-form-creation-modal>

      </div>

      <!-- Debug Panel (Development Only) -->
      <div class="debug-panel" *ngIf="showDebugPanel">
        <div class="debug-content">
          <h5>🔧 Debug Info</h5>
          <div class="debug-item">
            <strong>Company ID:</strong> {{ companyId() }}
          </div>
          <div class="debug-item">
            <strong>Active Tab:</strong> {{ activeTabId() }}
          </div>
          <div class="debug-item">
            <strong>Current Enrollment:</strong>
            {{ currentEnrollment()?.id || 'None' }}
          </div>
          <div class="debug-item">
            <strong>Tab Count:</strong> {{ allTabs().length }}
          </div>
          <div class="debug-item">
            <strong>Context:</strong>
            <pre>{{ companyContext() | json }}</pre>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .dynamic-company-detail {
      min-height: 100vh;
      background-color: #f8f9fa;
    }

    .company-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1rem;
    }

    .enrollment-section {
      margin: 1.5rem 0;
    }

    .form-management-section {
      margin: 2rem 0;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid #e9ecef;
      gap: 1rem;
    }

    @media (max-width: 768px) {
      .section-header {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
      }
    }

    .section-info .section-title {
      margin: 0 0 0.5rem 0;
      color: #495057;
      font-size: 1.25rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .section-info .section-title i {
      color: #007bff;
    }

    .section-info .section-description {
      margin: 0;
      color: #6c757d;
      font-size: 0.9rem;
    }

    .section-actions {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }

    .btn-create-form {
      background: #28a745;
      border: none;
      color: white;
      padding: 0.75rem 1.5rem;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.95rem;
    }

    .btn-create-form:hover:not(:disabled) {
      background: #218838;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(40, 167, 69, 0.3);
    }

    .btn-create-form:disabled {
      background: #6c757d;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .btn-outline-secondary {
      background: transparent;
      border: 1px solid #6c757d;
      color: #6c757d;
      padding: 0.75rem 1rem;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-outline-secondary:hover {
      background: #6c757d;
      color: white;
    }

    .context-display {
      padding: 1rem 1.5rem;
      background: #f8f9fa;
      border-top: 1px solid #e9ecef;
    }

    .context-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: #e3f2fd;
      color: #1976d2;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 500;
    }

    .context-badge i {
      font-size: 0.8rem;
    }

    .tabs-section {
      margin: 1rem 0;
    }

    .tab-content-section {
      margin-top: 1rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .empty-tabs-state {
      margin: 2rem 0;
      padding: 3rem;
      text-align: center;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .empty-state-content i {
      font-size: 4rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .empty-state-content h3 {
      margin-bottom: 0.5rem;
      color: #495057;
    }

    .empty-state-content p {
      color: #6c757d;
      margin-bottom: 1.5rem;
    }

    .empty-state-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .empty-state-actions .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .empty-state-actions .btn-primary {
      background: #007bff;
      color: white;
    }

    .empty-state-actions .btn-primary:hover {
      background: #0056b3;
    }

    .empty-state-actions .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .empty-state-actions .btn-secondary:hover {
      background: #5a6268;
    }

    .debug-panel {
      position: fixed;
      bottom: 20px;
      right: 20px;
      max-width: 350px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 1rem;
      border-radius: 8px;
      font-size: 0.8rem;
      z-index: 1000;
      max-height: 50vh;
      overflow-y: auto;
    }

    .debug-content h5 {
      margin: 0 0 1rem 0;
      color: #ffc107;
    }

    .debug-item {
      margin-bottom: 0.5rem;
      padding: 0.25rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .debug-item:last-child {
      border-bottom: none;
    }

    .debug-item strong {
      color: #17a2b8;
    }

    .debug-item pre {
      font-size: 0.7rem;
      margin: 0.5rem 0 0 0;
      max-height: 100px;
      overflow-y: auto;
      background: rgba(255, 255, 255, 0.1);
      padding: 0.5rem;
      border-radius: 4px;
    }

    .text-muted {
      color: #6c757d !important;
    }
  `]
})
export class DynamicCompanyDetailComponent implements OnInit, OnDestroy {

  // Reactive signals
  companyId = signal<number | null>(null);
  company = signal<ICompany | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);
  isLoadingEnrollments = signal(false);
  isLoadingTabContent = signal(false);

  // Tab management
  allTabs = signal<TabConfig[]>([]);
  tabGroups = signal<TabGroup[]>([]);
  quickAccessTabs = signal<TabConfig[]>([]);
  activeTabId = signal<string>('overview');
  showTabGroups = signal(false);

  // Context management
  companyContext = signal<CompanyContext>({});
  currentEnrollment = signal<ICategoryItemWithSession | null>(null);
  contextBreadcrumb = signal<ContextItem[]>([]);

  // Form creation modal
  showFormCreationModal = signal(false);
  isCreatingForm = signal(false);
  programContextForModal = signal<ProgramContext | null>(null);

  // Computed properties
  activeTab = computed(() => {
    const tabs = this.allTabs();
    const activeId = this.activeTabId();
    return tabs.find(tab => tab.id === activeId) || null;
  });

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
      
      // After context is loaded, check if we can load forms
      this.attemptFormLoading();
    });

    // Subscribe to enrollment context changes
    this.companyContextService.currentEnrollment$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(enrollment => {
      this.currentEnrollment.set(enrollment);
      if (enrollment) {
        this.loadTabsForEnrollment(enrollment);
      }
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
        // Set company context after we have the full company object
        this.companyContextService.setCompany(company);

        // Load enrollments and forms for the current context
        const context = this.companyContext();
        console.log('Company loaded, checking context:', context);
        
        // Don't load forms here immediately, wait for context to be loaded
        // this.attemptFormLoading() will be called when context is ready
        this.attemptFormLoading();
        
        // Always load enrollments for now
        this.loadEnrollments(company.id);
      },
      error: (error: any) => {
        console.error('Failed to load company:', error);
        this.error.set('Failed to load company details');
        this.isLoading.set(false);
      }
    });
  }

  loadEnrollments(companyId: number) {
    this.isLoadingEnrollments.set(true);

    this.companyContextService.getCompanyEnrollments(companyId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (enrollments) => {
        // Auto-select first enrollment or handle no enrollments
        if (enrollments.length === 1) {
          this.companyContextService.setEnrollmentContext(enrollments[0]);
        } else if (enrollments.length === 0) {
          // Load static tabs only
          this.loadStaticTabsOnly();
        }
        this.isLoadingEnrollments.set(false);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load enrollments:', error);
        this.isLoadingEnrollments.set(false);
        this.loadStaticTabsOnly();
      }
    });
  }

  loadTabsForEnrollment(enrollment: ICategoryItemWithSession) {
    const companyId = this.companyId();
    if (!companyId) return;

    // Get dynamic tabs for this enrollment
    this.companyContextService.enhancedContext$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(context => {
      if (context && context.dynamicTabs) {
        this.generateTabConfiguration(context.dynamicTabs, enrollment);
      }
    });
  }

  loadStaticTabsOnly() {
    // Load only static tabs when no enrollments exist
    const staticTabs = this.tabConfigurationService.getStaticTabsConfig();
    const migratableTabs = this.tabConfigurationService.getMigratableTabsConfig();

    const allTabs = [...staticTabs, ...migratableTabs].sort((a, b) => a.order - b.order);

    this.allTabs.set(allTabs);
    this.generateTabGroups(allTabs);
    this.setDefaultActiveTab(allTabs);
    this.isLoading.set(false);
  }

  generateTabConfiguration(dynamicTabs: CompanyFormTab[], enrollment?: ICategoryItemWithSession) {
    const companyId = this.companyId();
    if (!companyId) return;

    this.tabConfigurationService.generateHybridTabConfig(
      companyId,
      dynamicTabs,
      enrollment
    ).pipe(
      takeUntil(this.destroy$)
    ).subscribe(tabs => {
      this.allTabs.set(tabs);
      this.generateTabGroups(tabs);
      this.setDefaultActiveTab(tabs);
    });
  }

  generateTabGroups(tabs: TabConfig[]) {
    const groups = this.tabConfigurationService.getTabGroups(tabs);
    const quickAccess = this.tabConfigurationService.getQuickAccessTabs(tabs);

    this.tabGroups.set(groups);
    this.quickAccessTabs.set(quickAccess);
    this.showTabGroups.set(groups.length > 2);
  }

  setDefaultActiveTab(tabs: TabConfig[]) {
    const defaultTabId = this.tabConfigurationService.getDefaultActiveTab(tabs);
    this.activeTabId.set(defaultTabId);
  }

  /**
   * Attempt to load forms if both company and context are available
   */
  private attemptFormLoading() {
    const company = this.company();
    const context = this.companyContext();
    
    console.log('Attempting form loading:', { 
      hasCompany: !!company, 
      context: context,
      programId: context.programId,
      cohortId: context.cohortId 
    });
    
    if (company && context.programId && context.cohortId && context.clientId) {
      console.log('✅ All conditions met - loading forms');
      this.loadFormsForProgramContext(context.clientId, context.programId, context.cohortId);
    } else {
      console.log('❌ Conditions not met yet for form loading');
    }
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

    this.companyContext.set(context);
    this.contextBreadcrumb.set(breadcrumb);
  }

  // Event handlers
  onEnrollmentSelected(enrollment: ICategoryItemWithSession | null) {
    if (enrollment) {
      this.loadTabsForEnrollment(enrollment);
    } else {
      this.loadStaticTabsOnly();
    }
  }

  onContextChanged(event: any) {
    console.log('Context changed:', event);
    // Handle enrollment context changes
  }

  onTabChanged(tabId: string) {
    this.activeTabId.set(tabId);
    this.isLoadingTabContent.set(true);

    // Simulate content loading
    setTimeout(() => {
      this.isLoadingTabContent.set(false);
    }, 500);
  }

  onGroupToggled(groupName: string) {
    console.log('Group toggled:', groupName);
    // Handle group toggle logic
  }

  onTabContentChanged(event: any) {
    console.log('Tab content changed:', event);
    // Handle tab content updates
  }

  // Navigation methods
  navigateBack() {
    const context = this.companyContext();
    const queryParams: any = {};

    if (context.clientId) queryParams.clientId = context.clientId;
    if (context.programId) queryParams.programId = context.programId;
    if (context.cohortId) queryParams.cohortId = context.cohortId;

    this.router.navigate(['/', 'overview'], { queryParams });
  }

  openEditModal() {
    // TODO: Implement edit modal
    console.log('Edit modal opened');
  }

  refreshData() {
    this.loadCompanyData();
  }

  // Form creation methods
  canCreateForms(): boolean {
    const context = this.companyContext();
    // Can create forms if we have program context
    return !!(context.programId && context.cohortId);
  }

  openFormCreationModal() {
    // Update the program context for the modal
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

    // Immediately refresh forms for the current context
    this.refreshFormsForCurrentContext();

    // TODO: Show success message
    // TODO: Navigate to the new form tab
  }

  /**
   * Refresh forms specifically for the current program/cohort context
   */
  refreshFormsForCurrentContext() {
    const context = this.companyContext();
    const companyId = this.companyId();

    if (!companyId || !context.programId) {
      console.log('No context available for form refresh');
      return;
    }

    console.log('Refreshing forms for context:', context);

    // Set loading state
    this.isLoading.set(true);

    // Load forms directly for this program context
    this.loadFormsForProgramContext(context.clientId!, context.programId, context.cohortId!);
  }

  /**
   * Load forms directly by client/program/cohort IDs and generate tabs
   */
  private loadFormsForProgramContext(clientId: number, programId: number, cohortId: number) {
    console.log('Loading forms for:', { clientId, programId, cohortId });

    // Search for forms at different scope levels
    const searchObservables = [
      // Global forms (scope_type: global)
      this.formService.searchForms({ scope_type: 'global' }),
      // Client-level forms
      this.formService.searchForms({ scope_type: 'client', scope_id: clientId }),
      // Program-level forms
      this.formService.searchForms({ scope_type: 'program', scope_id: programId }),
      // Cohort-level forms
      this.formService.searchForms({ scope_type: 'cohort', scope_id: cohortId })
    ];

    // Combine all form searches
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

        // Convert forms to tabs
        this.generateTabsFromForms(allForms);
      },
      (error: any) => {
        console.error('Failed to load forms:', error);
        this.isLoading.set(false);
      }
    );
  }

  /**
   * Generate tabs from form list
   */
  private generateTabsFromForms(forms: IForm[]) {
    console.log('Generating tabs from forms:', forms);

    // Get static tabs
    const staticTabs = this.tabConfigurationService.getStaticTabsConfig();

    // Convert forms to tabs (matching TabConfig interface)
    const formTabs: TabConfig[] = forms.map(form => ({
      id: `form_${form.id}`,
      title: form.title,
      icon: 'fas fa-file-alt',
      type: 'dynamic' as const, // Forms are dynamic content
      order: 100 + form.id, // Place after static tabs
      loading: false,
      enabled: true,
      visible: true,
      form: form, // Store the form data
      description: form.description || `Form: ${form.title}`
    }));

    // Combine all tabs
    const allTabs = [...staticTabs, ...formTabs].sort((a, b) => a.order - b.order);

    console.log('Generated tabs:', allTabs);

    // Update state
    this.allTabs.set(allTabs);
    this.generateTabGroups(allTabs);
    this.setDefaultActiveTab(allTabs);
    this.isLoading.set(false);
  }  getProgramContext(): ProgramContext | null {
    const context = this.companyContext();
    const breadcrumb = this.contextBreadcrumb();

    if (!context.clientId || !context.programId || !context.cohortId) {
      return null;
    }

    return {
      clientId: context.clientId,
      clientName: context.clientName || `Client ${context.clientId}`,
      programId: context.programId,
      programName: context.programName || `Program ${context.programId}`,
      cohortId: context.cohortId,
      cohortName: context.cohortName || `Cohort ${context.cohortId}`
    };
  }
}
