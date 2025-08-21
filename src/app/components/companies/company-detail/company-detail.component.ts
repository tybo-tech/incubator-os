import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';


// Import all the new sub-components
import { LoadingStateComponent } from './loading-state/loading-state.component';
import { ErrorStateComponent } from './error-state/error-state.component';
import { CompanyHeaderComponent } from './company-header/company-header.component';
import { TabsNavigationComponent, TabType } from './tabs-navigation/tabs-navigation.component';
import { OverviewTabComponent } from './overview-tab/overview-tab.component';
import { AssessmentTabComponent } from './assessment-tab/assessment-tab.component';
import { SwotTabComponent } from './swot-tab/swot-tab.component';
import { StrategyTabComponent } from './strategy-tab/strategy-tab.component';
import { FinancialTabComponent } from './financial-tab/financial-tab.component';
import { ComplianceTabComponent } from './compliance-tab/compliance-tab.component';
import { DocumentsTabComponent } from './documents-tab/documents-tab.component';
import { TasksTabComponent } from './tasks-tab/tasks-tab.component';
import { GrowthAreasTabComponent } from './growth-areas-tab/growth-areas-tab.component';
import { FinancialTargetsTabComponent } from './financial-targets-tab/financial-targets-tab.component';
import { HRTrackingTabComponent } from './hr-tracking-tab/hr-tracking-tab.component';
import { GpsTargetsTabComponent } from './gps-targets-tab/gps-targets-tab.component';
import { CompanyFormModalComponent } from '../company-form-modal/company-form-modal.component';
import { ExecutiveReportComponent } from './executive-report/executive-report.component';
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
    TabsNavigationComponent,
    OverviewTabComponent,
    AssessmentTabComponent,
    SwotTabComponent,
    StrategyTabComponent,
    FinancialTabComponent,
    ComplianceTabComponent,
    DocumentsTabComponent,
    TasksTabComponent,
    GrowthAreasTabComponent,
    FinancialTargetsTabComponent,
    HRTrackingTabComponent,
    GpsTargetsTabComponent,
  CompanyFormModalComponent,
  ExecutiveReportComponent
  ],
  templateUrl: './company-detail.component.html',
  styleUrl: './company-detail.component.scss'
})
export class CompanyDetailComponent implements OnInit {

  company: ICompany | null = null;
  activeTab: TabType = 'overview';
  loading = true;
  error: string | null = null;

  // Edit modal properties
  isEditModalOpen = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private nodeService: CompanyService
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadCompany(parseInt(id));
      }
    });
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
      }
    });
  }

  setActiveTab(tab: TabType) {
    this.activeTab = tab;
  }

  goBack() {
    this.router.navigate(['/companies']);
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
