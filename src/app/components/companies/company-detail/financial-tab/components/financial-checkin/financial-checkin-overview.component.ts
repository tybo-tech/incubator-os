import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { INode } from '../../../../../../../models/schema';
import { FinancialCheckinTableComponent } from './financial-checkin-table.component';
import { FinancialCheckinHeaderComponent } from './financial-checkin-header.component';
import { FinancialCheckinMetricsComponent } from './financial-checkin-metrics.component';
import { FinancialCheckinNotesComponent } from './financial-checkin-notes.component';
import { FinancialCheckinLoadingComponent } from './financial-checkin-loading.component';
import { ICompany } from '../../../../../../../models/simple.schema';
import { CompanyFinancialsService, ICompanyFinancials } from '../../../../../../../services/company-financials.service';

interface LatestMetrics {
  turnover: number;
  netProfitMargin: number;
  cashPosition: number;
  workingCapitalRatio: number;
  period: string;
  growthIndicators: {
    turnoverGrowth: number;
    marginImprovement: number;
    cashGrowth: number;
  };
}

@Component({
  selector: 'app-financial-checkin-overview',
  standalone: true,
  imports: [
    CommonModule,
    FinancialCheckinTableComponent,
    FinancialCheckinHeaderComponent,
    FinancialCheckinMetricsComponent,
    FinancialCheckinNotesComponent,
    FinancialCheckinLoadingComponent,
  ],
  template: `
    <div class="bg-white rounded-lg shadow-sm border">
      <!-- Header Component -->
      <app-financial-checkin-header
        (viewTrendsClick)="onViewTrends()"
        (newCheckInClick)="onNewCheckIn()"
      >
      </app-financial-checkin-header>

      <div class="p-6">
        <!-- Loading/Error States Component -->
        <app-financial-checkin-loading
          [loading]="loading"
          [error]="error"
          (retryClick)="loadCheckIns()"
        >
        </app-financial-checkin-loading>

        <!-- Content -->
        <div *ngIf="!loading && !error">
          <!-- Latest Metrics Component -->
          <app-financial-checkin-metrics [latestMetrics]="latestMetrics">
          </app-financial-checkin-metrics>

          <!-- Recent Notes Component -->
          <app-financial-checkin-notes [latestNotes]="latestNotes">
          </app-financial-checkin-notes>

          <!-- Financial Check-ins Table -->
          <app-financial-checkin-table
            [checkIns]="allCheckIns"
            [loading]="loading"
            (onNewCheckInClick)="onNewCheckIn()"
            (onEditCheckIn)="onEditFromTable($event)"
            (onDeleteCheckIn)="onDeleteFromTable($event)"
          >
          </app-financial-checkin-table>
        </div>
      </div>
    </div>
  `,
})
export class FinancialCheckinOverviewComponent implements OnInit {
  @Input() company!: ICompany;
  @Output() onNewCheckInClick = new EventEmitter<void>();
  @Output() onViewTrendsClick = new EventEmitter<void>();
  @Output() onEditCheckIn = new EventEmitter<ICompanyFinancials>();

  checkIns: ICompanyFinancials[] = [];
  allCheckIns: ICompanyFinancials[] = []; // All historical data for table
  loading = false;
  error: string | null = null;

  currentYear = new Date().getFullYear();
  latestMetrics: LatestMetrics | null = null;
  latestNotes: string | null = null;

  months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  constructor(private nodeService: CompanyFinancialsService) {}

  ngOnInit() {
    this.loadCheckIns();
  }

  // Public method to refresh data from parent component
  public refreshData() {
    this.loadCheckIns();
  }

  /**
   * Utility function to safely parse month values from database
   * Handles both string and number month values
   */
  private parseMonth(month: string | number | undefined): number {
    if (month === undefined || month === null) return 0;
    return typeof month === 'string' ? parseInt(month, 10) : month;
  }

  async loadCheckIns() {
    if (!this.company?.id) return;

    this.loading = true;
    this.error = null;

    try {
      // Get financial check-ins for this specific company (already filtered by company_id)
      const companyCheckIns = await this.nodeService
        .listCompanyFinancials(this.company.id)
        .toPromise();

      // Store all check-ins for table view
      this.allCheckIns = companyCheckIns || [];
      this.checkIns = companyCheckIns || [];

      this.calculateLatestMetrics();
      this.extractLatestNotes();
    } catch (error) {
      console.error('❌ Error loading financial check-ins:', error);
      this.error = 'Failed to load financial check-ins. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  // Get all check-ins (for table view) regardless of year
  async getAllCheckIns(): Promise<ICompanyFinancials[]> {
    if (!this.company?.id) return [];

    try {
      const companyCheckIns = await this.nodeService
        .listCompanyFinancials(this.company.id)
        .toPromise();
      return companyCheckIns || [];
    } catch (error) {
      console.error('❌ Error loading all financial check-ins:', error);
      return [];
    }
  }

  private calculateLatestMetrics() {
    if (this.checkIns.length === 0) {
      this.latestMetrics = null;
      return;
    }

    // Sort by year, month (most recent first) - handle string month values
    const sortedCheckIns = [...this.checkIns].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return this.parseMonth(b.month) - this.parseMonth(a.month);
    });

    const latest = sortedCheckIns[0];
    const previous = sortedCheckIns[1];

    this.latestMetrics = {
      turnover: latest.turnover_monthly_avg || 0,
      netProfitMargin: latest.np_margin || 0,
      cashPosition: latest.cash_on_hand || 0,
      workingCapitalRatio: latest.working_capital_ratio || 0,
      period: this.formatPeriod(latest),
      growthIndicators: {
        turnoverGrowth: this.calculateGrowth(
          previous?.turnover_monthly_avg || 0,
          latest.turnover_monthly_avg || 0
        ),
        marginImprovement:
          (latest.np_margin || 0) - (previous?.np_margin || 0),
        cashGrowth: this.calculateGrowth(
          previous?.cash_on_hand || 0,
          latest.cash_on_hand || 0
        ),
      },
    };
  }

  private calculateGrowth(previous: number, current: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  private formatPeriod(data: ICompanyFinancials): string {
    if (data.month) {
      const monthNumber = this.parseMonth(data.month);
      return `${this.months[monthNumber - 1]} ${data.year}`;
    }
    return `${data.quarter || 'Unknown'} ${data.year}`;
  }

  private extractLatestNotes() {
    if (this.checkIns.length === 0) {
      this.latestNotes = null;
      return;
    }

    const sortedCheckIns = [...this.checkIns].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return this.parseMonth(b.month) - this.parseMonth(a.month);
    });

    // this.latestNotes = sortedCheckIns[0]?.notes || null;
  }

  onNewCheckIn() {
    this.onNewCheckInClick.emit();
  }

  onViewTrends() {
    this.onViewTrendsClick.emit();
  }

  // Table component event handlers
  onEditFromTable(checkIn:ICompanyFinancials) {
    this.onEditCheckIn.emit(checkIn);
  }

  async onDeleteFromTable(checkIn:ICompanyFinancials) {
    if (
      !confirm(
        'Are you sure you want to delete this financial check-in? This action cannot be undone.'
      )
    ) {
      return;
    }

    try {
      await this.nodeService.deleteCompanyFinancials(checkIn.id!).toPromise();

      // Refresh data
      this.loadCheckIns();
    } catch (error) {
      console.error('❌ Error deleting check-in:', error);
      alert('Failed to delete the check-in. Please try again.');
    }
  }
}
