import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

// Import all the new sub-components
import { LoadingStateComponent } from './loading-state/loading-state.component';
import { ErrorStateComponent } from './error-state/error-state.component';
import { CompanyHeaderComponent } from './company-header/company-header.component';
import { ContextBreadcrumbComponent, ContextItem } from './context-breadcrumb/context-breadcrumb.component';
import {
  TabsNavigationComponent,
  TabType,
} from './tabs-navigation/tabs-navigation.component';
import { OverviewTabComponent } from './overview-tab/overview-tab.component';
import { AssessmentTabComponent } from './assessment-tab/assessment-tab.component';
import { SwotTabComponent } from './swot-tab/swot-tab.component';
import { StrategyTabComponent } from './strategy-tab/strategy-tab.component';
import { FinancialTabComponent } from './financial-tab/financial-tab.component';
import { PurchasesTabComponent } from './purchases-tab/purchases-tab.component';
import { ComplianceTabComponent } from './compliance-tab/compliance-tab.component';
import { DocumentsTabComponent } from './documents-tab/documents-tab.component';
import { TasksTabComponent } from './tasks-tab/tasks-tab.component';
import { GrowthAreasTabComponent } from './growth-areas-tab/growth-areas-tab.component';
import { FinancialTargetsTabComponent } from './financial-targets-tab/financial-targets-tab.component';
import { HRTrackingTabComponent } from './hr-tracking-tab/hr-tracking-tab.component';
import { GpsTargetsTabComponent } from './gps-targets-tab/gps-targets-tab.component';
import { CompanyFormModalComponent } from '../company-form-modal/company-form-modal.component';
import { CompanyService } from '../../../../services/company.service';
import { ICompany } from '../../../../models/simple.schema';

@Component({
  selector: 'app-company-detail',
  standalone: true,
  imports: [
    CommonModule,
    LoadingStateComponent,
    ErrorStateComponent,
    CompanyHeaderComponent,
    ContextBreadcrumbComponent,
    TabsNavigationComponent,
    OverviewTabComponent,
    AssessmentTabComponent,
    SwotTabComponent,
    StrategyTabComponent,
    FinancialTabComponent,
    PurchasesTabComponent,
    ComplianceTabComponent,
    DocumentsTabComponent,
    TasksTabComponent,
    GrowthAreasTabComponent,
    FinancialTargetsTabComponent,
    HRTrackingTabComponent,
    GpsTargetsTabComponent,
    CompanyFormModalComponent,
  ],
  templateUrl: './company-detail.component.html',
  styleUrl: './company-detail.component.scss',
})
export class CompanyDetailComponent implements OnInit {
  company: ICompany | null = null;
  activeTab: TabType = 'overview';
  loading = true;
  error: string | null = null;

  // Context from query parameters
  context: ContextItem[] = [];

  // Edit modal properties
  isEditModalOpen = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private nodeService: CompanyService
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.loadCompany(parseInt(id));
      }
    });

    // Load context from query parameters
    this.route.queryParams.subscribe(params => {
      this.loadContextFromParams(params);
    });
  }

  private loadContextFromParams(params: any): void {
    this.context = [];

    // Build context hierarchy from query parameters
    if (params['clientId'] && params['clientName']) {
      this.context.push({
        id: parseInt(params['clientId'], 10),
        name: params['clientName'],
        type: 'client'
      });
    }

    if (params['programId'] && params['programName']) {
      this.context.push({
        id: parseInt(params['programId'], 10),
        name: params['programName'],
        type: 'program'
      });
    }

    if (params['cohortId'] && params['cohortName']) {
      this.context.push({
        id: parseInt(params['cohortId'], 10),
        name: params['cohortName'],
        type: 'cohort'
      });
    }

    console.log('🔗 Company detail context loaded:', this.context);
  }
  exportToPDF() {
    this.router.navigate(['/companies', this.company?.id, 'executive-report']);
  }
  loadCompany(id: number) {
    this.loading = true;
    this.error = null;

    this.nodeService.getCompanyById(id).subscribe({
      next: (company) => {
        this.company = company;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading company:', err);
        this.error = 'Failed to load company details';
        this.loading = false;
      },
    });
  }

  setActiveTab(tab: TabType) {
    this.activeTab = tab;
  }

  goBack() {
    // If we have context, navigate back to overview with context preserved
    if (this.context.length > 0) {
      const queryParams: any = {};

      // Build query parameters from context
      const clientContext = this.context.find(c => c.type === 'client');
      const programContext = this.context.find(c => c.type === 'program');
      const cohortContext = this.context.find(c => c.type === 'cohort');

      if (clientContext) {
        queryParams.clientId = clientContext.id;
      }
      if (programContext) {
        queryParams.programId = programContext.id;
      }
      if (cohortContext) {
        queryParams.cohortId = cohortContext.id;
      }

      // Navigate back to overview with context
      this.router.navigate(['/overview'], { queryParams });
    } else {
      // Fallback to companies list if no context
      this.router.navigate(['/companies']);
    }
  }

  // Context navigation methods
  onNavigateToContext(contextItem: ContextItem): void {
    console.log('🔄 Navigating to context item:', contextItem);
    console.log('📋 Current context:', this.context);

    const queryParams: any = {};

    // Include all context up to the selected item
    const selectedIndex = this.context.findIndex(c => c.id === contextItem.id && c.type === contextItem.type);
    const contextToInclude = this.context.slice(0, selectedIndex + 1);

    console.log('🎯 Context to include:', contextToInclude);

    contextToInclude.forEach(item => {
      if (item.type === 'client') queryParams.clientId = item.id;
      else if (item.type === 'program') queryParams.programId = item.id;
      else if (item.type === 'cohort') queryParams.cohortId = item.id;
    });

    console.log('🔗 Navigating with query params:', queryParams);
    this.router.navigate(['/overview'], { queryParams });
  }

  onBackToOverview(): void {
    // Navigate to root overview
    this.router.navigate(['/overview']);
  }

  // Edit modal methods
  openEditModal() {
    this.isEditModalOpen = true;
  }

  closeEditModal() {
    this.isEditModalOpen = false;
  }

  onCompanySaved(updatedCompany: ICompany) {
    this.company = updatedCompany;
    this.closeEditModal();
    // Optionally show a success message
  }
}
