import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { INode } from '../../../../../../../models/schema';
import { Company } from '../../../../../../../models/business.models';
import { FinancialCheckIn } from '../../../../../../../models/busines.financial.checkin.models';
import { NodeService } from '../../../../../../../services';
import { FinancialCheckinDetailsComponent } from './financial-checkin-details.component';

interface MonthlyStatus {
  month: number;
  monthName: string;
  hasCheckIn: boolean;
  netProfitMargin?: number;
  isCurrentMonth: boolean;
}

interface MonthDetails {
  month: number;
  monthName: string;
  year: number;
}

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
  imports: [CommonModule, FinancialCheckinDetailsComponent],
  template: `
    <div class="bg-white rounded-lg shadow-sm border">
      <!-- Header -->
      <div class="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-lg">
        <div class="flex justify-between items-center">
          <div>
            <h3 class="text-lg font-semibold flex items-center">
              <i class="fas fa-chart-line mr-3"></i>
              Financial Check-ins
            </h3>
            <p class="text-blue-100 text-sm mt-1">
              <i class="fas fa-shield-alt mr-1"></i>
              Primary Source: Advisor-verified business metrics
            </p>
          </div>
          <div class="flex space-x-2">
            <button (click)="onViewTrends()"
                    class="bg-blue-500 hover:bg-blue-400 text-white px-3 py-1 rounded text-sm transition-colors">
              <i class="fas fa-chart-bar mr-1"></i>
              View Trends
            </button>
            <button (click)="onNewCheckIn()"
                    class="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-sm transition-colors">
              <i class="fas fa-plus mr-1"></i>
              New Check-in
            </button>
          </div>
        </div>
      </div>

      <div class="p-6">
        <!-- Loading State -->
        <div *ngIf="loading" class="text-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p class="mt-2 text-gray-600">Loading check-ins...</p>
        </div>

        <!-- Error State -->
        <div *ngIf="error" class="text-center py-8">
          <i class="fas fa-exclamation-triangle text-red-500 text-2xl mb-2"></i>
          <p class="text-red-600 mb-3">{{ error }}</p>
          <button (click)="loadCheckIns()"
                  class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm">
            <i class="fas fa-redo mr-2"></i>
            Retry
          </button>
        </div>

        <!-- Content -->
        <div *ngIf="!loading && !error">

          <!-- Current Year Timeline -->
          <div class="mb-6">
            <div class="flex justify-between items-center mb-3">
              <h4 class="font-medium text-gray-900 flex items-center">
                <i class="fas fa-calendar mr-2"></i>
                {{ currentYear }} Timeline
              </h4>
              <div class="text-sm text-gray-500">
                {{ getCompletionPercentage() }}% Complete
              </div>
            </div>

            <div class="grid grid-cols-6 lg:grid-cols-12 gap-2">
              <div *ngFor="let status of monthlyStatus"
                   class="relative group cursor-pointer"
                   (click)="onMonthClick(status)">

                <!-- Month Card -->
                <div class="bg-gray-50 rounded-lg p-3 text-center border-2 transition-all relative"
                     [class]="getMonthCardClass(status)">

                  <!-- Month Name -->
                  <div class="text-xs font-medium text-gray-600 mb-1">
                    {{ status.monthName.substring(0, 3) }}
                  </div>

                  <!-- Status Icon -->
                  <div class="mb-1">
                    <i [class]="getMonthStatusIcon(status)"></i>
                  </div>

                  <!-- Profit Margin (if available) -->
                  <div *ngIf="status.hasCheckIn && status.netProfitMargin !== undefined"
                       class="text-xs font-semibold"
                       [class]="status.netProfitMargin >= 0 ? 'text-green-600' : 'text-red-600'">
                    {{ status.netProfitMargin | number:'1.0-0' }}%
                  </div>
                  <div *ngIf="!status.hasCheckIn" class="text-xs text-gray-400">
                    ---
                  </div>
                </div>

                <!-- Tooltip (on hover) -->
                <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  <div *ngIf="status.hasCheckIn; else noCheckIn">
                    ✅ Check-in available<br>
                    <span *ngIf="status.netProfitMargin !== undefined">
                      📊 NP Margin: {{ status.netProfitMargin | number:'1.1-1' }}%
                    </span>
                  </div>
                  <ng-template #noCheckIn>
                    ❌ No check-in for {{ status.monthName }}<br>
                    <small class="text-gray-300">Primary data missing</small>
                  </ng-template>
                  <div class="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Latest Metrics (if available) -->
          <div *ngIf="latestMetrics" class="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 mb-6">
            <div class="flex justify-between items-center mb-3">
              <h4 class="font-medium text-gray-900 flex items-center">
                <i class="fas fa-chart-pie mr-2"></i>
                Latest Metrics ({{ latestMetrics.period }})
              </h4>
            </div>

            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <!-- Monthly Turnover -->
              <div class="bg-white rounded-lg p-3 border">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-sm text-gray-600">Monthly Turnover</span>
                  <i class="fas fa-money-bill-wave text-green-500"></i>
                </div>
                <div class="text-lg font-semibold text-gray-900">
                  R {{ latestMetrics.turnover | number:'1.0-0' }}
                </div>
                <div class="text-xs flex items-center mt-1"
                     [class]="latestMetrics.growthIndicators.turnoverGrowth >= 0 ? 'text-green-600' : 'text-red-600'">
                  <i [class]="latestMetrics.growthIndicators.turnoverGrowth >= 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down'"
                     class="mr-1"></i>
                  {{ latestMetrics.growthIndicators.turnoverGrowth | number:'1.0-0' }}%
                </div>
              </div>

              <!-- Net Profit Margin -->
              <div class="bg-white rounded-lg p-3 border">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-sm text-gray-600">Net Profit Margin</span>
                  <i class="fas fa-percentage text-blue-500"></i>
                </div>
                <div class="text-lg font-semibold"
                     [class]="latestMetrics.netProfitMargin >= 0 ? 'text-green-600' : 'text-red-600'">
                  {{ latestMetrics.netProfitMargin | number:'1.1-1' }}%
                </div>
                <div class="text-xs flex items-center mt-1"
                     [class]="latestMetrics.growthIndicators.marginImprovement >= 0 ? 'text-green-600' : 'text-red-600'">
                  <i [class]="latestMetrics.growthIndicators.marginImprovement >= 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down'"
                     class="mr-1"></i>
                  {{ latestMetrics.growthIndicators.marginImprovement | number:'1.1-1' }}pp
                </div>
              </div>

              <!-- Cash Position -->
              <div class="bg-white rounded-lg p-3 border">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-sm text-gray-600">Cash Position</span>
                  <i class="fas fa-university text-purple-500"></i>
                </div>
                <div class="text-lg font-semibold text-gray-900">
                  R {{ latestMetrics.cashPosition | number:'1.0-0' }}
                </div>
                <div class="text-xs flex items-center mt-1"
                     [class]="latestMetrics.growthIndicators.cashGrowth >= 0 ? 'text-green-600' : 'text-red-600'">
                  <i [class]="latestMetrics.growthIndicators.cashGrowth >= 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down'"
                     class="mr-1"></i>
                  {{ latestMetrics.growthIndicators.cashGrowth | number:'1.0-0' }}%
                </div>
              </div>

              <!-- Working Capital -->
              <div class="bg-white rounded-lg p-3 border">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-sm text-gray-600">Working Capital</span>
                  <i class="fas fa-balance-scale text-orange-500"></i>
                </div>
                <div class="text-lg font-semibold flex items-center">
                  <span [class]="getWorkingCapitalClass(latestMetrics.workingCapitalRatio)">
                    {{ latestMetrics.workingCapitalRatio | number:'1.2-2' }}
                  </span>
                  <i class="ml-2" [class]="getWorkingCapitalIcon(latestMetrics.workingCapitalRatio)"></i>
                </div>
                <div class="text-xs text-gray-500 mt-1">
                  {{ getWorkingCapitalStatus(latestMetrics.workingCapitalRatio) }}
                </div>
              </div>
            </div>
          </div>

          <!-- Recent Notes (if available) -->
          <div *ngIf="latestNotes" class="bg-gray-50 rounded-lg p-4">
            <h4 class="font-medium text-gray-900 mb-2 flex items-center">
              <i class="fas fa-sticky-note mr-2"></i>
              Recent Notes
            </h4>
            <p class="text-gray-700 text-sm italic">"{{ latestNotes }}"</p>
          </div>

          <!-- Empty State -->
          <div *ngIf="checkIns.length === 0" class="text-center py-12">
            <i class="fas fa-chart-line text-gray-300 text-4xl mb-4"></i>
            <h4 class="text-lg font-medium text-gray-900 mb-2">No Financial Check-ins Yet</h4>
            <p class="text-gray-600 mb-2">Start capturing verified business metrics through advisor meetings.</p>
            <p class="text-sm text-blue-600 mb-4">
              <i class="fas fa-shield-alt mr-1"></i>
              Financial Check-ins are your primary source for business reporting and analysis.
            </p>
            <button (click)="onNewCheckIn()"
                    class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">
              <i class="fas fa-plus mr-2"></i>
              Create Your First Check-in
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Month Details Modal -->
    <app-financial-checkin-details
      [isVisible]="showDetailsModal"
      [monthDetails]="selectedMonthDetails"
      [monthCheckIns]="selectedMonthCheckIns"
      (onCloseModal)="onDetailsModalClose()"
      (onAddNewCheckIn)="onAddNewFromDetails($event)"
      (onEditCheckIn)="onEditFromDetails($event)"
      (onDeleteCheckIn)="onDeleteFromDetails($event)">
    </app-financial-checkin-details>
  `,
  styles: [`
    .animate-spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class FinancialCheckinOverviewComponent implements OnInit {
  @Input() company!: INode<Company>;
  @Output() onNewCheckInClick = new EventEmitter<void>();
  @Output() onViewTrendsClick = new EventEmitter<void>();
  @Output() onEditCheckIn = new EventEmitter<INode<FinancialCheckIn>>();

  checkIns: INode<FinancialCheckIn>[] = [];
  loading = false;
  error: string | null = null;

  currentYear = new Date().getFullYear();
  monthlyStatus: MonthlyStatus[] = [];
  latestMetrics: LatestMetrics | null = null;
  latestNotes: string | null = null;

  // Month details modal properties
  showDetailsModal = false;
  selectedMonthDetails: MonthDetails | null = null;
  selectedMonthCheckIns: INode<FinancialCheckIn>[] = [];

  // Utility reference
  Math = Math;

  months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  constructor(
    private nodeService: NodeService<FinancialCheckIn>
  ) {}

  ngOnInit() {
    this.initializeMonthlyStatus();
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

  private initializeMonthlyStatus() {
    const currentMonth = new Date().getMonth() + 1;

    this.monthlyStatus = this.months.map((monthName, index) => ({
      month: index + 1,
      monthName,
      hasCheckIn: false,
      isCurrentMonth: index + 1 === currentMonth
    }));
  }

  async loadCheckIns() {
    if (!this.company?.id) return;

    this.loading = true;
    this.error = null;

    try {
      // Get financial check-ins for this specific company (already filtered by company_id)
      const companyCheckIns = await this.nodeService.getNodesByCompany(this.company.id, 'financial_checkin').toPromise();

      // Only filter by current year since company filtering is already done
      this.checkIns = companyCheckIns?.filter(node =>
        node.data.year === this.currentYear
      ) || [];

      this.updateMonthlyStatus();
      this.calculateLatestMetrics();
      this.extractLatestNotes();

    } catch (error) {
      console.error('❌ Error loading financial check-ins:', error);
      this.error = 'Failed to load financial check-ins. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  private updateMonthlyStatus() {
    this.monthlyStatus.forEach(status => {
      // Handle both string and number month values from database
      const checkIn = this.checkIns.find(ci =>
        this.parseMonth(ci.data.month) === status.month
      );
      status.hasCheckIn = !!checkIn;
      status.netProfitMargin = checkIn?.data.np_margin;
    });
  }

  private calculateLatestMetrics() {
    if (this.checkIns.length === 0) {
      this.latestMetrics = null;
      return;
    }

    // Sort by year, month (most recent first) - handle string month values
    const sortedCheckIns = [...this.checkIns].sort((a, b) => {
      if (a.data.year !== b.data.year) return b.data.year - a.data.year;
      return this.parseMonth(b.data.month) - this.parseMonth(a.data.month);
    });

    const latest = sortedCheckIns[0];
    const previous = sortedCheckIns[1];

    this.latestMetrics = {
      turnover: latest.data.turnover_monthly_avg || 0,
      netProfitMargin: latest.data.np_margin || 0,
      cashPosition: latest.data.cash_on_hand || 0,
      workingCapitalRatio: latest.data.working_capital_ratio || 0,
      period: this.formatPeriod(latest.data),
      growthIndicators: {
        turnoverGrowth: this.calculateGrowth(
          previous?.data.turnover_monthly_avg || 0,
          latest.data.turnover_monthly_avg || 0
        ),
        marginImprovement: (latest.data.np_margin || 0) - (previous?.data.np_margin || 0),
        cashGrowth: this.calculateGrowth(
          previous?.data.cash_on_hand || 0,
          latest.data.cash_on_hand || 0
        )
      }
    };
  }

  private calculateGrowth(previous: number, current: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  private formatPeriod(data: FinancialCheckIn): string {
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
      if (a.data.year !== b.data.year) return b.data.year - a.data.year;
      return this.parseMonth(b.data.month) - this.parseMonth(a.data.month);
    });

    this.latestNotes = sortedCheckIns[0]?.data.notes || null;
  }

  getCompletionPercentage(): number {
    const currentMonth = new Date().getMonth() + 1;
    const completedMonths = this.monthlyStatus.slice(0, currentMonth).filter(s => s.hasCheckIn).length;
    return Math.round((completedMonths / currentMonth) * 100);
  }

  getMonthCardClass(status: MonthlyStatus): string {
    let classes = '';

    if (status.hasCheckIn) {
      classes += 'border-green-400 bg-green-50 ';
    } else if (status.isCurrentMonth) {
      classes += 'border-blue-400 bg-blue-50 ';
    } else {
      classes += 'border-gray-200 ';
    }

    classes += 'hover:border-blue-400 hover:shadow-sm';

    return classes;
  }

  getMonthStatusIcon(status: MonthlyStatus): string {
    if (status.hasCheckIn) {
      return 'fas fa-check-circle text-green-500';
    } else if (status.isCurrentMonth) {
      return 'fas fa-clock text-blue-500';
    }
    return 'fas fa-times-circle text-gray-400';
  }

  getWorkingCapitalClass(ratio: number): string {
    if (ratio >= 1.5) return 'text-green-600';
    if (ratio >= 1.0) return 'text-yellow-600';
    return 'text-red-600';
  }

  getWorkingCapitalIcon(ratio: number): string {
    if (ratio >= 1.5) return 'fas fa-check-circle text-green-600';
    if (ratio >= 1.0) return 'fas fa-exclamation-triangle text-yellow-600';
    return 'fas fa-times-circle text-red-600';
  }

  getWorkingCapitalStatus(ratio: number): string {
    if (ratio >= 1.5) return 'Healthy';
    if (ratio >= 1.0) return 'Adequate';
    return 'Low';
  }

  onMonthClick(status: MonthlyStatus) {
    // Always show details modal instead of directly editing
    this.selectedMonthDetails = {
      month: status.month,
      monthName: status.monthName,
      year: this.currentYear
    };

    // Get all check-ins for this month - handle both string and number month values
    this.selectedMonthCheckIns = this.checkIns.filter(ci =>
      this.parseMonth(ci.data.month || 1) === status.month
    );

    this.showDetailsModal = true;
  }

  // Details modal handlers
  onDetailsModalClose() {
    this.showDetailsModal = false;
    this.selectedMonthDetails = null;
    this.selectedMonthCheckIns = [];
  }

  onAddNewFromDetails(monthDetails: MonthDetails) {
    // Close details modal and trigger new check-in with pre-filled month
    this.onDetailsModalClose();
    this.onNewCheckInClick.emit();
    // TODO: Pass month details to the main component so it can pre-fill the modal
  }

  onEditFromDetails(checkIn: INode<FinancialCheckIn>) {
    // Close details modal and trigger edit
    this.onDetailsModalClose();
    this.onEditCheckIn.emit(checkIn);
  }

  async onDeleteFromDetails(checkIn: INode<FinancialCheckIn>) {
    if (!confirm('Are you sure you want to delete this financial check-in? This action cannot be undone.')) {
      return;
    }

    try {
      await this.nodeService.deleteNode(checkIn.id!).toPromise();

      // Close modal and refresh data
      this.onDetailsModalClose();
      this.loadCheckIns();

    } catch (error) {
      console.error('❌ Error deleting check-in:', error);
      alert('Failed to delete the check-in. Please try again.');
    }
  }

  onNewCheckIn() {
    this.onNewCheckInClick.emit();
  }

  onViewTrends() {
    this.onViewTrendsClick.emit();
  }
}
