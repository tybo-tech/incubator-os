import { Component, Input, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICompany } from '../../../../../models/simple.schema';
import { MetricsTabComponent } from '../metrics-tab/metrics-tab.component';
import { FinancialTabComponent } from '../financial-tab/financial-tab.component';
import { MetricGroupTabMeta } from '../tabs-navigation/tabs-navigation.component';
import { MetricsManagementModalComponent } from './metrics-management-modal/metrics-management-modal.component';
import { SettingsButtonComponent } from './settings-button/settings-button.component';
import { FinancialExportHelperService } from '../../../../../services/pdf/financial-export-helper.service';

// Internal sub-tab ids
export type FinancialDashboardInnerTab =
  | 'bank-statements'
  | 'all-metrics'
  | `group-${number}`;

@Component({
  selector: 'app-financial-dashboard-tab',
  standalone: true,
  imports: [
    CommonModule,
    MetricsTabComponent,
    FinancialTabComponent,
    MetricsManagementModalComponent,
    SettingsButtonComponent,
  ],
  template: `
    <div class="space-y-6">
      <!-- Enhanced Tab Navigation with Export -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <div class="flex items-center justify-between p-1">
          <!-- Tab Navigation -->
          <div class="flex items-center gap-1">
            <button
              (click)="setInner('bank-statements')"
              class="px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 border"
              [class]="getTabClasses(innerTab === 'bank-statements')"
            >
              🏦 Bank Statements
            </button>

            <!-- All Metrics Tab (optional) -->
            <!-- <button
              *ngIf="showAllMetricsTab"
              (click)="setInner('all-metrics')"
              class="px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 border"
              [class]="getTabClasses(innerTab === 'all-metrics')"
            >
              📊 All Metrics
            </button> -->

            <!-- Dynamic Group Tabs -->
            <ng-container *ngFor="let g of metricGroups">
              <button
                (click)="setInner(groupInnerId(g.id))"
                class="px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 border"
                [class]="getTabClasses(innerTab === groupInnerId(g.id))"
                [title]="g.code || g.name"
              >
                {{ g.name }}
              </button>
            </ng-container>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center gap-2">
            <!-- Export Button for Current Tab -->
            <button
              (click)="exportCurrentTab()"
              [disabled]="isExporting"
              class="px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center"
              [title]="getExportButtonText()"
            >
              <i
                *ngIf="!isExporting"
                [class]="getExportButtonIcon()"
                class="mr-2"
              ></i>
              <svg
                *ngIf="isExporting"
                class="animate-spin w-4 h-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span class="hidden sm:inline">{{ getExportButtonText() }}</span>
              <span class="sm:hidden">Export</span>
            </button>

            <!-- Settings Button -->
            <app-settings-button
              (clicked)="openSettings()"
              label="Settings"
              title="Manage Metric Groups and Types"
              customClasses=""
            ></app-settings-button>
          </div>
        </div>
      </div>

      <!-- Bank Statements (old financial tab) -->
      <app-financial-tab
        *ngIf="innerTab === 'bank-statements'"
        [company]="company"
      ></app-financial-tab>

      <!-- All metrics aggregate -->
      <!-- <app-metrics-tab
        *ngIf="innerTab === 'all-metrics'"
        [company]="company"
        [clientId]="clientId"
        [programId]="programId"
        [cohortId]="cohortId"
      ></app-metrics-tab> -->

      <!-- Filtered metric group -->
      <app-metrics-tab
        *ngIf="isGroupInner(innerTab)"
        [company]="company"
        [clientId]="clientId"
        [programId]="programId"
        [cohortId]="cohortId"
        [filterGroupId]="extractGroupId(innerTab)"
      ></app-metrics-tab>
    </div>

    <!-- Metrics Management Modal -->
    <app-metrics-management-modal
      #metricsModal
      [clientId]="clientId"
      (modalClosed)="onModalClosed()"
      (dataUpdated)="onDataUpdated()"
    ></app-metrics-management-modal>
  `,
})
export class FinancialDashboardTabComponent {
  @Input() company!: ICompany;
  @Input() clientId: number = 1;
  @Input() programId: number = 0;
  @Input() cohortId: number = 0;
  @Input() metricGroups: MetricGroupTabMeta[] = [];
  @Input() showAllMetricsTab: boolean = false; // Optional "All Metrics" tab

  @ViewChild('metricsModal') metricsModal!: MetricsManagementModalComponent;

  innerTab: FinancialDashboardInnerTab = 'bank-statements';

  // Export functionality
  isExporting = false;

  constructor(private financialExportHelper: FinancialExportHelperService) {}

  setInner(tab: FinancialDashboardInnerTab) {
    this.innerTab = tab;
  }

  groupInnerId(id: number): FinancialDashboardInnerTab {
    return `group-${id}` as FinancialDashboardInnerTab;
  }

  isGroupInner(tab: FinancialDashboardInnerTab): boolean {
    return tab.startsWith('group-');
  }

  extractGroupId(tab: FinancialDashboardInnerTab): number | null {
    if (!this.isGroupInner(tab)) return null;
    return parseInt(tab.split('group-')[1], 10) || null;
  }

  /**
   * Get CSS classes for tab styling based on active state
   */
  getTabClasses(isActive: boolean): string {
    const baseClasses =
      'border-gray-300 text-gray-700 hover:text-gray-900 hover:border-gray-400 hover:bg-gray-50';
    const activeClasses = 'border-blue-500 text-blue-600 bg-blue-50 shadow-sm';

    return isActive ? activeClasses : baseClasses;
  }

  /**
   * Open the metrics management modal
   */
  openSettings(): void {
    this.metricsModal.open();
  }

  /**
   * Handle modal closed event
   */
  onModalClosed(): void {
    console.log('Metrics management modal closed');
  }

  /**
   * Handle data updated event - refresh metric groups
   */
  onDataUpdated(): void {
    console.log('Metrics data updated - parent should refresh groups');
    // Emit an event or call parent method to refresh metricGroups if needed
  }

  /**
   * Export current tab data
   */
  exportCurrentTab(): void {
    if (this.isExporting) return;

    this.isExporting = true;

    const exportAction = this.getExportAction();

    exportAction.subscribe({
      next: () => {
        console.log('Export completed successfully');
        this.isExporting = false;
      },
      error: (error) => {
        console.error('Export failed:', error);
        alert('Export failed. Please try again.');
        this.isExporting = false;
      }
    });
  }

  /**
   * Get the appropriate export action based on current tab
   */
  private getExportAction() {
    switch (this.innerTab) {
      case 'bank-statements':
        return this.financialExportHelper.exportBankStatementsReport(this.company.id);

      default:
        if (this.isGroupInner(this.innerTab)) {
          const groupId = this.extractGroupId(this.innerTab);
          if (groupId) {
            return this.financialExportHelper.exportMetricGroupReport(this.company.id, groupId);
          }
        }
        // Fallback to complete report
        return this.financialExportHelper.exportCompleteFinancialReport(this.company.id);
    }
  }

  /**
   * Get export button text based on current tab
   */
  getExportButtonText(): string {
    if (this.isExporting) return 'Exporting...';

    switch (this.innerTab) {
      case 'bank-statements':
        return 'Export Bank Statements';
      default:
        if (this.isGroupInner(this.innerTab)) {
          const group = this.metricGroups.find(g => g.id === this.extractGroupId(this.innerTab));
          return `Export ${group?.name || 'Metrics'}`;
        }
        return 'Export Report';
    }
  }

  /**
   * Get export button icon based on current tab
   */
  getExportButtonIcon(): string {
    switch (this.innerTab) {
      case 'bank-statements':
        return 'fas fa-file-invoice-dollar';
      default:
        if (this.isGroupInner(this.innerTab)) {
          return 'fas fa-chart-bar';
        }
        return 'fas fa-file-pdf';
    }
  }
}
