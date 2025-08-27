import { Routes } from '@angular/router';
import { ClientsPageComponent } from './clients-page.component';
import { ProgramsPageComponent } from './programs-page.component';
import { CohortsPageComponent } from './cohorts-page.component';
import { CohortDetailPageComponent } from './cohort-detail-page.component';
import { GroupingDemoComponent } from './grouping-demo.component';

export const groupingRoutes: Routes = [
  {
    path: '',
    redirectTo: 'clients',
    pathMatch: 'full'
  },
  {
    path: 'demo',
    component: GroupingDemoComponent
  },
  {
    path: 'clients',
    component: ClientsPageComponent
  },
  {
    path: 'clients/:clientId/programs',
    component: ProgramsPageComponent
  },
  {
    path: 'programs/:programId/cohorts',
    component: CohortsPageComponent
  },
  {
    path: 'cohorts/:cohortId',
    component: CohortDetailPageComponent
  }
];
