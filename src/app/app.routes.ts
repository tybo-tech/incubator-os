import { Routes } from '@angular/router';
import { CompaniesComponent } from './components/companies/companies.component';
import { CompanyDetailComponent } from './components/companies/company-detail/company-detail.component';
import { DynamicCompanyDetailComponent } from './components/dynamic-company-detail/dynamic-company-detail.component';
import { AppShellComponent } from './components/app-shell/app-shell.component';
import { CompanyShellComponent } from './components/company-shell/company-shell.component';
import { CompanyOverviewComponent } from './components/company-shell/company-overview/company-overview.component';
import { TasksListComponent } from './components/tasks/tasks-list.component';
import { FinancialTabComponent } from './components/companies/company-detail/financial-tab/financial-tab.component';
import { FinancialShellComponent } from './components/company-shell/financial-shell/financial-shell.component';
// New Page Components
import { AssessmentComponent } from './components/company-shell/pages/assessment/assessment.component';
import { SwotComponent } from './components/company-shell/pages/swot/swot.component';
import { GpsTargetsComponent } from './components/company-shell/pages/gps-targets/gps-targets.component';
import {
  MonthlyRevenueComponent,
  BankStatementsComponent,
  RevenueComponent,
  ProfitsComponent,
  CostStructureComponent,
  // BalanceSheetComponent, // Temporarily disabled for pie chart testing
  RatiosComponent,
  FundsReceivedComponent,
  EmployeeCountComponent
} from './components/company-shell/financial-shell/components';
import { ExecutiveReportComponent } from './components/companies/company-detail/executive-report/executive-report.component';
import { ActionPlanExportComponent } from './components/action-plan-export/action-plan-export.component';
import { groupingRoutes } from './admin/grouping/grouping.routes';
import { OverviewPageComponent } from './admin/overview/overview-page.component';
import { ClientsListComponent } from './admin/clients/clients-list.component';
import { ProgramsListComponent } from './admin/programs/programs-list.component';
import { CohortsListComponent } from './admin/cohorts/cohorts-list.component';
import { CompaniesListComponent } from './components/companies/companies-list.component';
import { IndustriesListComponent } from './admin/industries/industries-list.component';
import { UsersListComponent } from './admin/users/users-list.component';
import { ReportsOverviewComponent } from './admin/reports/reports-overview.component';
import { BalanceSheetComponent } from './components/company-shell/financial-shell/components/balance-sheet.component';

export const routes: Routes = [
  {
    path: '',
    component: AppShellComponent,
    children: [
      {
        path: '',
        component: ReportsOverviewComponent,
      },
      {
        path: 'overview',
        component: ReportsOverviewComponent, // Placeholder for now
      },
      {
        path: 'companies',
        component: CompaniesComponent,
      },
      {
        path: 'companies/:id',
        component: CompanyDetailComponent,
      },
      {
        path: 'company/:id',
        component: CompanyShellComponent,
        children: [
          {
            path: '',
            redirectTo: 'overview',
            pathMatch: 'full'
          },
          {
            path: 'overview',
            component: CompanyOverviewComponent,
          },
          {
            path: 'assessment',
            component: AssessmentComponent,
          },
          {
            path: 'swot',
            component: SwotComponent,
          },
          {
            path: 'gps-targets',
            component: GpsTargetsComponent,
          },
          {
            path: 'compliance',
            component: CompanyOverviewComponent, // Placeholder - will create later
          },
          {
            path: 'financials',
            component: FinancialShellComponent,
            children: [
              {
                path: '',
                redirectTo: 'revenue-capture',
                pathMatch: 'full'
              },
              {
                path: 'revenue-capture',
                loadComponent: () => import('./components/company-shell/financial-shell/components/company-revenue-capture.component').then(m => m.CompanyRevenueCaptureComponent),
              },
              {
                path: 'monthly-revenue',
                component: MonthlyRevenueComponent,
              },
              {
                path: 'bank-statements',
                component: BankStatementsComponent,
              },
              {
                path: 'revenue',
                component: RevenueComponent,
              },
              {
                path: 'profits',
                component: ProfitsComponent,
              },
              {
                path: 'cost-structure',
                component: CostStructureComponent,
              },
              {
                path: 'balance-sheet',
                component: BalanceSheetComponent, // Temporarily disabled for pie chart testing
              },
              {
                path: 'ratios',
                component: RatiosComponent,
              },
              {
                path: 'funds-received',
                component: FundsReceivedComponent,
              },
              {
                path: 'employee-count',
                component: EmployeeCountComponent,
              },
              // Legacy route redirects for compatibility
              {
                path: 'statement',
                redirectTo: 'bank-statements',
                pathMatch: 'full'
              },
              {
                path: 'analytics',
                redirectTo: 'revenue',
                pathMatch: 'full'
              },
              {
                path: 'budgets',
                redirectTo: 'cost-structure',
                pathMatch: 'full'
              }
            ]
          }
        ]
      },
      {
        path: 'legacy-company/:id',
        component: DynamicCompanyDetailComponent,
      },
      {
        path: 'companies/:id/executive-report',
        component: ExecutiveReportComponent,
      },
      {
        path: 'action-plan-export',
        component: ActionPlanExportComponent,
      },
      {
        path: 'tasks',
        component: TasksListComponent,
      },
      {
        path: 'data',
        component: CompaniesComponent, // Placeholder for now
      },
      {
        path: 'analytics',
        component: ReportsOverviewComponent,
      },
      {
        path: 'team',
        component: CompaniesComponent, // Placeholder for now
      },

      {
        path: 'admin/grouping',
        children: groupingRoutes,
      },
      {
        path: 'admin/clients',
        component: ClientsListComponent,
      },
      {
        path: 'admin/clients/:clientId/programs',
        component: ProgramsListComponent,
      },
      {
        path: 'admin/clients/:clientId/programs/:programId/cohorts',
        component: CohortsListComponent,
      },
      {
        path: 'industries',
        component: IndustriesListComponent,
      },
      {
        path: 'users',
        component: UsersListComponent,
      },
      {
        path: 'companies',
        component: CompaniesListComponent,
      },
    ],
  },
];
