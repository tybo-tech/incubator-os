import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICompany } from '../../../../../models/simple.schema';
import { GroupMetricsContainerComponent } from './group-metrics-container/group-metrics-container.component';

@Component({
  selector: 'app-metrics-tab',
  standalone: true,
  imports: [CommonModule, GroupMetricsContainerComponent],
  template: `
    <!-- Simplified Metrics Tab - Now uses modular components -->
    <app-group-metrics-container
      [company]="company"
      [clientId]="clientId"
      [programId]="programId"
      [cohortId]="cohortId"
      [filterGroupId]="filterGroupId">
    </app-group-metrics-container>
  `
})
export class MetricsTabComponent {
  @Input() company!: ICompany;
  @Input() clientId: number = 1;
  @Input() programId: number = 0;
  @Input() cohortId: number = 0;
  @Input() filterGroupId: number | null = null;
}
