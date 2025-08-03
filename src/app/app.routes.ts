import { Routes } from '@angular/router';
import { CompaniesComponent } from './components/companies/companies.component';
import { CompanyDetailComponent } from './components/companies/company-detail/company-detail.component';
import { AppShellComponent } from './components/app-shell/app-shell.component';
import { TasksListComponent } from './components/tasks/tasks-list.component';

export const routes: Routes = [
  {
    path: '',
    component: AppShellComponent,
    children: [
      {
        path: '',
        redirectTo: '/companies',
        pathMatch: 'full'
      },
      {
        path: 'overview',
        component: CompaniesComponent, // Placeholder for now
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
    ],
  },
];
