import { Routes } from '@angular/router';
import { OverviewComponent } from './components/overview/overview.component';
import { AppShellComponent, MainPanelComponent } from './components';
import { TableDemoComponent } from './components/table-demo/table-demo.component';
import { OopSystemDemoComponent } from './components/oop-system-demo/oop-system-demo.component';
import { MultipleDropdownTestComponent } from './components/multiple-dropdown-test/multiple-dropdown-test.component';
import { MultiSelectDemoComponent } from './components/multi-select-demo/multi-select-demo.component';
import { BusinessReportComponent } from './components/business-report/business-report.component';
import { StandaloneFormComponent } from './components/standalone-form/standalone-form.component';

export const routes: Routes = [
  {
    path: '',
    component: AppShellComponent,
    children: [
      {
        path: '',
        component: OverviewComponent,
      },

      {
        path: 'collection/:collectionId',
        component: MainPanelComponent,
      },

      {
        path: 'demo',
        component: TableDemoComponent,
      },

      {
        path: 'oop-demo',
        component: OopSystemDemoComponent,
      },

      {
        path: 'dropdown-test',
        component: MultipleDropdownTestComponent,
      },

      {
        path: 'multi-select-demo',
        component: MultiSelectDemoComponent,
      },

      {
        path: 'business-report',
        component: BusinessReportComponent,
      },
    ],
  },

  // Standalone form route (outside app shell for external users)
  {
    path: 'form/:collectionId',
    component: StandaloneFormComponent,
  },
];
