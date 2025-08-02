import { Routes } from '@angular/router';
import { CompaniesComponent } from './components/companies/companies.component';
import { AppShellComponent } from './components/app-shell/app-shell.component';

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
