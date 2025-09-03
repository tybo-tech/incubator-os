import { Routes } from '@angular/router';
import { CompaniesComponent } from './components/companies/companies.component';
import { CompanyDetailComponent } from './components/companies/company-detail/company-detail.component';
import { DynamicCompanyDetailComponent } from './components/dynamic-company-detail/dynamic-company-detail.component';
import { AppShellComponent } from './components/app-shell/app-shell.component';
import { TasksListComponent } from './components/tasks/tasks-list.component';
import { PdfExportPageComponent } from './components/companies/company-detail/financial-tab/components/pdf-export-page.component';
import { ExecutiveReportComponent } from './components/companies/company-detail/executive-report/executive-report.component';
import { ActionPlanExportComponent } from './components/action-plan-export/action-plan-export.component';
import { groupingRoutes } from './admin/grouping/grouping.routes';
import { OverviewPageComponent } from './admin/overview/overview-page.component';

export const routes: Routes = [
  {
    path: '',
    component: AppShellComponent,
    children: [
      {
        path: '',
        component: OverviewPageComponent,
      },
      {
        path: 'overview',
        component: OverviewPageComponent, // Placeholder for now
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
        component: DynamicCompanyDetailComponent,
      },
      {
        path: 'companies/:id/pdf-export',
        component: PdfExportPageComponent,
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
        component: CompaniesComponent, // Placeholder for now
      },
      {
        path: 'team',
        component: CompaniesComponent, // Placeholder for now
      },

      {
        path: 'admin/grouping',
        children: groupingRoutes,
      },
    ],
  },
];
