import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { NodeService } from '../../../../services';
import { Company } from '../../../../models/business.models';
import { INode } from '../../../../models/schema';

// Import all the new sub-components
import { LoadingStateComponent } from './loading-state/loading-state.component';
import { ErrorStateComponent } from './error-state/error-state.component';
import { CompanyHeaderComponent } from './company-header/company-header.component';
import { TabsNavigationComponent, TabType } from './tabs-navigation/tabs-navigation.component';
import { OverviewTabComponent } from './overview-tab/overview-tab.component';
import { StrategyTabComponent } from './strategy-tab/strategy-tab.component';
import { FinancialTabComponent } from './financial-tab/financial-tab.component';
import { ComplianceTabComponent } from './compliance-tab/compliance-tab.component';
import { DocumentsTabComponent } from './documents-tab/documents-tab.component';
import { TasksTabComponent } from './tasks-tab/tasks-tab.component';
import { GrowthAreasTabComponent } from './growth-areas-tab/growth-areas-tab.component';

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
    StrategyTabComponent,
    FinancialTabComponent,
    ComplianceTabComponent,
    DocumentsTabComponent,
    TasksTabComponent,
    GrowthAreasTabComponent
  ],
  templateUrl: './company-detail.component.html',
  styleUrl: './company-detail.component.scss'
})
export class CompanyDetailComponent implements OnInit {
  company: INode<Company> | null = null;
  activeTab: TabType = 'overview';
  loading = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private nodeService: NodeService<Company>
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadCompany(parseInt(id));
      }
    });
  }

  loadCompany(id: number) {
    this.loading = true;
    this.error = null;

    this.nodeService.getNodeById(id).subscribe({
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
}
