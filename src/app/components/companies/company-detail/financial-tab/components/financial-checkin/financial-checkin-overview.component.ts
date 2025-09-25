import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ICompany } from '../../../../../../../models/simple.schema';
import { CompanyFinancialsService, ICompanyFinancials } from '../../../../../../../services/company-financials.service';

@Component({
  selector: 'app-financial-checkin-overview',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-lg shadow-sm border border-gray-200">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div class="flex justify-between items-center">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">Financial Check-ins</h3>
            <p class="text-sm text-gray-600 mt-1">Monthly financial data tracking</p>
          </div>
          
          <!-- Year Selector -->
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
              <label class="text-sm font-medium text-gray-700">Year:</label>
              <select
                [(ngModel)]="selectedYear"
                (change)="onYearChange()"
                class="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option *ngFor="let year of availableYears" [value]="year">{{ year }}</option>
              </select>
            </div>
            
            <div class="flex gap-2">
              <button
                (click)="addNewMonth()"
                class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors">
                Add Month
              </button>
              <button
                (click)="onViewTrends()"
                class="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded hover:bg-gray-700 transition-colors">
                View Trends
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Financial Data Table -->
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
              <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Turnover</th>
              <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost of Sales</th>
              <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business Expenses</th>
              <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gross Profit</th>
              <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Profit</th>
              <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GP %</th>
              <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NP %</th>
              <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cash</th>
              <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr *ngFor="let record of monthlyRecords; trackBy: trackByRecord">
              <!-- Month -->
              <td class="px-3 py-4 whitespace-nowrap">
                <span class="text-sm font-medium text-gray-900">{{ getMonthName(record.month) }}</span>
              </td>

              <!-- Turnover -->
              <td class="px-3 py-4 whitespace-nowrap">
                <input
                  type="number"
                  [(ngModel)]="record.turnover"
                  (input)="onFinancialValueChange(record)"
                  (blur)="updateRecord(record)"
                  class="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                  step="0.01" />
              </td>

              <!-- Cost of Sales -->
              <td class="px-3 py-4 whitespace-nowrap">
                <input
                  type="number"
                  [(ngModel)]="record.cost_of_sales"
                  (input)="onFinancialValueChange(record)"
                  (blur)="updateRecord(record)"
                  class="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                  step="0.01" />
              </td>

              <!-- Business Expenses -->
              <td class="px-3 py-4 whitespace-nowrap">
                <input
                  type="number"
                  [(ngModel)]="record.business_expenses"
                  (input)="onFinancialValueChange(record)"
                  (blur)="updateRecord(record)"
                  class="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                  step="0.01" />
              </td>

              <!-- Calculated Gross Profit -->
              <td class="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {{ formatCurrency(getGrossProfit(record)) }}
              </td>

              <!-- Calculated Net Profit -->
              <td class="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {{ formatCurrency(getNetProfit(record)) }}
              </td>

              <!-- Calculated GP % -->
              <td class="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {{ formatPercentage(getGPMargin(record)) }}
              </td>

              <!-- Calculated NP % -->
              <td class="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {{ formatPercentage(getNPMargin(record)) }}
              </td>

              <!-- Cash on Hand -->
              <td class="px-3 py-4 whitespace-nowrap">
                <input
                  type="number"
                  [(ngModel)]="record.cash_on_hand"
                  (blur)="updateRecord(record)"
                  class="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                  step="0.01" />
              </td>

              <!-- Actions -->
              <td class="px-3 py-4 whitespace-nowrap text-sm">
                <button
                  (click)="deleteRecord(record)"
                  class="text-red-600 hover:text-red-900 transition-colors">
                  🗑️
                </button>
              </td>
            </tr>
          </tbody>
          
          <!-- Totals Row -->
          <tfoot class="bg-gray-50 border-t-2 border-gray-300">
            <tr>
              <td class="px-3 py-3 text-sm font-bold text-gray-900">TOTAL</td>
              <td class="px-3 py-3 text-sm font-bold text-gray-900">{{ formatCurrency(getTotalTurnover()) }}</td>
              <td class="px-3 py-3 text-sm font-bold text-gray-900">{{ formatCurrency(getTotalCostOfSales()) }}</td>
              <td class="px-3 py-3 text-sm font-bold text-gray-900">{{ formatCurrency(getTotalBusinessExpenses()) }}</td>
              <td class="px-3 py-3 text-sm font-bold text-gray-900">{{ formatCurrency(getTotalGrossProfit()) }}</td>
              <td class="px-3 py-3 text-sm font-bold text-gray-900">{{ formatCurrency(getTotalNetProfit()) }}</td>
              <td class="px-3 py-3 text-sm font-bold text-gray-900">{{ formatPercentage(getTotalGPMargin()) }}</td>
              <td class="px-3 py-3 text-sm font-bold text-gray-900">{{ formatPercentage(getTotalNPMargin()) }}</td>
              <td class="px-3 py-3 text-sm font-bold text-gray-900">-</td>
              <td class="px-3 py-3 text-sm font-bold text-gray-900">-</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Empty State -->
      <div *ngIf="monthlyRecords.length === 0" class="px-6 py-12 text-center">
        <div class="text-gray-400 text-4xl mb-4">💰</div>
        <h3 class="text-sm font-medium text-gray-900 mb-2">No Financial Data for {{ selectedYear }}</h3>
        <p class="text-sm text-gray-500 mb-4">Start by adding your first monthly financial record.</p>
        <button
          (click)="addNewMonth()"
          class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors">
          Add Monthly Data
        </button>
      </div>
    </div>
  `,
})
export class FinancialCheckinOverviewComponent implements OnInit {
  @Input() company!: ICompany;
  @Output() recordUpdated = new EventEmitter<ICompanyFinancials>();
  @Output() recordDeleted = new EventEmitter<number>();
  @Output() addMonthRequested = new EventEmitter<{ month: number; year: number }>();
  
  // Legacy events for compatibility with parent component
  @Output() onNewCheckInClick = new EventEmitter<void>();
  @Output() onViewTrendsClick = new EventEmitter<void>();
  @Output() onEditCheckIn = new EventEmitter<ICompanyFinancials>();

  financials: ICompanyFinancials[] = [];
  loading = false;
  error: string | null = null;

  selectedYear = new Date().getFullYear();
  
  readonly monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  constructor(private financialService: CompanyFinancialsService) {}

  ngOnInit() {
    this.loadFinancials();
  }

  get availableYears(): number[] {
    const years = new Set(this.financials.map(f => f.year));
    const yearArray = Array.from(years).sort((a, b) => b - a);
    
    // Ensure current year is always available
    if (!yearArray.includes(this.selectedYear)) {
      yearArray.unshift(this.selectedYear);
      yearArray.sort((a, b) => b - a);
    }
    
    return yearArray;
  }

  get monthlyRecords(): ICompanyFinancials[] {
    // Get records for selected year, sorted by month
    const yearRecords = this.financials
      .filter(f => f.year === this.selectedYear)
      .sort((a, b) => a.month - b.month);
    
    // Create placeholder records for missing months
    const completeRecords: ICompanyFinancials[] = [];
    for (let month = 1; month <= 12; month++) {
      const existingRecord = yearRecords.find(r => r.month === month);
      if (existingRecord) {
        completeRecords.push(existingRecord);
      } else {
        // Create placeholder record
        completeRecords.push({
          id: 0, // Temporary ID for new records
          company_id: this.company.id,
          period_date: `${this.selectedYear}-${month.toString().padStart(2, '0')}-01`,
          year: this.selectedYear,
          month: month,
          quarter: Math.ceil(month / 3),
          quarter_label: `Q${Math.ceil(month / 3)}`,
          is_pre_ignition: false,
          turnover_monthly_avg: null,
          turnover: null,
          cost_of_sales: null,
          business_expenses: null,
          gross_profit: null,
          net_profit: null,
          gp_margin: null,
          np_margin: null,
          cash_on_hand: null,
          debtors: null,
          creditors: null,
          inventory_on_hand: null,
          working_capital_ratio: null,
          net_assets: null,
          notes: null,
          created_at: '',
          updated_at: ''
        });
      }
    }
    
    return completeRecords;
  }

  trackByRecord(index: number, record: ICompanyFinancials): number {
    return record.id || index;
  }

  async loadFinancials() {
    if (!this.company?.id) return;

    this.loading = true;
    this.error = null;

    try {
      const data = await this.financialService
        .listAllCompanyFinancials(this.company.id)
        .toPromise();

      this.financials = data || [];
    } catch (error) {
      console.error('❌ Error loading financials:', error);
      this.error = 'Failed to load financial data. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  onYearChange() {
    // Year selector changed - data will be filtered automatically by monthlyRecords getter
  }

  getMonthName(month: number): string {
    return this.monthNames[month - 1] || 'Unknown';
  }

  onFinancialValueChange(record: ICompanyFinancials): void {
    // Recalculate derived values when financial inputs change
    this.updateCalculatedFields(record);
  }

  private updateCalculatedFields(record: ICompanyFinancials): void {
    const turnover = record.turnover || 0;
    const costOfSales = record.cost_of_sales || 0;
    const businessExpenses = record.business_expenses || 0;

    // Calculate gross profit
    record.gross_profit = turnover - costOfSales;

    // Calculate net profit
    record.net_profit = record.gross_profit - businessExpenses;

    // Calculate margins
    if (turnover > 0) {
      record.gp_margin = (record.gross_profit / turnover) * 100;
      record.np_margin = (record.net_profit / turnover) * 100;
    } else {
      record.gp_margin = 0;
      record.np_margin = 0;
    }

    // Set turnover_monthly_avg same as turnover for now
    record.turnover_monthly_avg = record.turnover;
  }

  async updateRecord(record: ICompanyFinancials): Promise<void> {
    // Ensure calculated fields are up to date
    this.updateCalculatedFields(record);

    try {
      if (record.id === 0) {
        // New record - create it
        const newRecord = await this.financialService.addCompanyFinancials(record).toPromise();
        if (newRecord) {
          // Update the record with the new ID and refresh data
          this.loadFinancials();
        }
      } else {
        // Existing record - update it
        await this.financialService.updateCompanyFinancials(record.id, record).toPromise();
        this.recordUpdated.emit(record);
      }
    } catch (error) {
      console.error('❌ Error updating record:', error);
      alert('Failed to save changes. Please try again.');
    }
  }

  async deleteRecord(record: ICompanyFinancials): Promise<void> {
    if (record.id === 0) {
      // It's a placeholder record, just refresh to remove the values
      this.loadFinancials();
      return;
    }

    if (confirm(`Delete ${this.getMonthName(record.month)} ${record.year} data?`)) {
      try {
        await this.financialService.deleteCompanyFinancials(record.id).toPromise();
        this.recordDeleted.emit(record.id);
        this.loadFinancials();
      } catch (error) {
        console.error('❌ Error deleting record:', error);
        alert('Failed to delete record. Please try again.');
      }
    }
  }

  addNewMonth(): void {
    // Find the first month without data in the selected year
    const existingMonths = this.financials
      .filter(f => f.year === this.selectedYear)
      .map(f => f.month);
    
    let targetMonth = 1;
    for (let month = 1; month <= 12; month++) {
      if (!existingMonths.includes(month)) {
        targetMonth = month;
        break;
      }
    }

    this.addMonthRequested.emit({
      month: targetMonth,
      year: this.selectedYear
    });
  }

  // Calculation methods for display
  getGrossProfit(record: ICompanyFinancials): number {
    return (record.turnover || 0) - (record.cost_of_sales || 0);
  }

  getNetProfit(record: ICompanyFinancials): number {
    return this.getGrossProfit(record) - (record.business_expenses || 0);
  }

  getGPMargin(record: ICompanyFinancials): number {
    const turnover = record.turnover || 0;
    return turnover > 0 ? (this.getGrossProfit(record) / turnover) * 100 : 0;
  }

  getNPMargin(record: ICompanyFinancials): number {
    const turnover = record.turnover || 0;
    return turnover > 0 ? (this.getNetProfit(record) / turnover) * 100 : 0;
  }

  // Total calculation methods
  getTotalTurnover(): number {
    return this.monthlyRecords.reduce((sum, r) => sum + (r.turnover || 0), 0);
  }

  getTotalCostOfSales(): number {
    return this.monthlyRecords.reduce((sum, r) => sum + (r.cost_of_sales || 0), 0);
  }

  getTotalBusinessExpenses(): number {
    return this.monthlyRecords.reduce((sum, r) => sum + (r.business_expenses || 0), 0);
  }

  getTotalGrossProfit(): number {
    return this.getTotalTurnover() - this.getTotalCostOfSales();
  }

  getTotalNetProfit(): number {
    return this.getTotalGrossProfit() - this.getTotalBusinessExpenses();
  }

  getTotalGPMargin(): number {
    const totalTurnover = this.getTotalTurnover();
    return totalTurnover > 0 ? (this.getTotalGrossProfit() / totalTurnover) * 100 : 0;
  }

  getTotalNPMargin(): number {
    const totalTurnover = this.getTotalTurnover();
    return totalTurnover > 0 ? (this.getTotalNetProfit() / totalTurnover) * 100 : 0;
  }

  formatCurrency(value: number): string {
    if (value === 0) return '-';
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  formatPercentage(value: number): string {
    if (value === 0) return '-';
    return `${value.toFixed(1)}%`;
  }

  // Public method to refresh data from parent component
  public refreshData() {
    this.loadFinancials();
  }

  // Legacy methods for compatibility with parent component
  onNewCheckIn() {
    this.onNewCheckInClick.emit();
  }

  onViewTrends() {
    this.onViewTrendsClick.emit();
  }

  // Since we have inline editing, we don't really "edit" records anymore
  // But if needed, this could emit when clicking on a record
  onEditRecord(record: ICompanyFinancials) {
    this.onEditCheckIn.emit(record);
  }
}
