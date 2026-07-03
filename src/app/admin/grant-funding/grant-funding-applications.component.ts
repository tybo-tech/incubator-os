import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GrantFundingStateService } from './services/grant-funding-state.service';
import { WorkflowSettingsComponent } from './workflow-settings.component';
import { GrantFundingHeaderComponent } from './grant-funding-header.component';
import { GrantFundingFiltersComponent } from './grant-funding-filters.component';
import { GrantFundingTableComponent } from './grant-funding-table.component';
import { GrantFundingBulkModalComponent } from './grant-funding-bulk-modal.component';

@Component({
  selector: 'app-grant-funding-applications',
  standalone: true,
  imports: [
    CommonModule,
    WorkflowSettingsComponent,
    GrantFundingHeaderComponent,
    GrantFundingFiltersComponent,
    GrantFundingTableComponent,
    GrantFundingBulkModalComponent,
  ],
  template: `
    <div class="p-4 sm:p-6">
      <app-grant-funding-header></app-grant-funding-header>

      <app-grant-funding-filters></app-grant-funding-filters>

      <app-grant-funding-table></app-grant-funding-table>

      <app-grant-funding-bulk-modal></app-grant-funding-bulk-modal>

      <app-workflow-settings
        workflowId="grant-2026"
        [isOpen]="state.showWorkflowSettings()"
        (closePanel)="state.showWorkflowSettings.set(false)"
      >
      </app-workflow-settings>
    </div>
  `,
})
export class GrantFundingApplicationsComponent implements OnInit {
  state = inject(GrantFundingStateService);

  ngOnInit(): void {
    this.state.init();
  }
}
