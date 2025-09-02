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

// Import our new components (to be created)
import { EnrollmentContextSelectorComponent } from '../../../components/enrollment-context-selector.component';
// import { HybridTabsNavigationComponent } from './hybrid-tabs-navigation/hybrid-tabs-navigation.component';
// import { DynamicTabContentComponent } from './dynamic-tab-content/dynamic-tab-content.component';

// Import models
import { ICompany } from '../../../models/simple.schema';
import { ICategoryItemWithSession, CompanyFormTab } from '../../../models/form-system.models';
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
    EnrollmentContextSelectorComponent,
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

        <!-- Enrollment Context Selector -->
        <div class="enrollment-section" *ngIf="company()">
          <app-enrollment-context-selector
            [companyId]="company()!.id"
            [disabled]="isLoadingEnrollments()"
            (enrollmentSelected)="onEnrollmentSelected($event)"
            (contextChanged)="onContextChanged($event)">
          </app-enrollment-context-selector>
        </div>

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
            <h3>No Content Available</h3>
            <p>This company doesn't have any available tabs or enrolled programs.</p>
            <button 
              type="button" 
              class="btn btn-primary"
              (click)="refreshData()">
              <i class="fas fa-refresh"></i> Refresh Data
            </button>
          </div>
        </div>

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
}
