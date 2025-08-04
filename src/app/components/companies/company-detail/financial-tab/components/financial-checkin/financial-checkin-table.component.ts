import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { INode } from '../../../../../../../models/schema';
import { FinancialCheckIn } from '../../../../../../../models/busines.financial.checkin.models';

interface FilterOptions {
  year: number | null;
  quarter: string | null;
  month: number | null;
  minMargin: number | null;
  maxMargin: number | null;
  searchText: string;
}

interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
}

@Component({
  selector: 'app-financial-checkin-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-lg shadow-sm border">
      <!-- Header with Filters -->
      <div class="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-lg">
        <div class="flex justify-between items-center mb-4">
          <div>
            <h3 class="text-lg font-semibold flex items-center">
              <i class="fas fa-table mr-3"></i>
              Financial Check-ins History
            </h3>
            <p class="text-blue-100 text-sm mt-1">
              <i class="fas fa-filter mr-1"></i>
              Comprehensive view with filtering and sorting
            </p>
          </div>
          <div class="flex space-x-2">
            <button (click)="resetFilters()"
                    class="bg-blue-500 hover:bg-blue-400 text-white px-3 py-1 rounded text-sm transition-colors">
              <i class="fas fa-undo mr-1"></i>
              Reset Filters
            </button>
            <button (click)="onNewCheckIn()"
                    class="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-sm transition-colors">
              <i class="fas fa-plus mr-1"></i>
              New Check-in
            </button>
          </div>
        </div>

        <!-- Filters Row -->
        <div class="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
          <!-- Year Filter -->
          <div>
            <label class="block text-blue-100 mb-1">Year</label>
            <select [(ngModel)]="filters.year" (ngModelChange)="applyFilters()"
                    class="w-full px-2 py-1 rounded text-gray-900 text-sm">
              <option [ngValue]="null">All Years</option>
              <option *ngFor="let year of availableYears" [ngValue]="year">{{ year }}</option>
            </select>
          </div>

          <!-- Quarter Filter -->
          <div>
            <label class="block text-blue-100 mb-1">Quarter</label>
            <select [(ngModel)]="filters.quarter" (ngModelChange)="applyFilters()"
                    class="w-full px-2 py-1 rounded text-gray-900 text-sm">
              <option [ngValue]="null">All Quarters</option>
              <option value="Q1">Q1</option>
              <option value="Q2">Q2</option>
              <option value="Q3">Q3</option>
              <option value="Q4">Q4</option>
            </select>
          </div>

          <!-- Month Filter -->
          <div>
            <label class="block text-blue-100 mb-1">Month</label>
            <select [(ngModel)]="filters.month" (ngModelChange)="applyFilters()"
                    class="w-full px-2 py-1 rounded text-gray-900 text-sm">
              <option [ngValue]="null">All Months</option>
              <option *ngFor="let month of months; let i = index" [ngValue]="i + 1">
                {{ month.substring(0, 3) }}
              </option>
            </select>
          </div>

          <!-- Min Margin Filter -->
          <div>
            <label class="block text-blue-100 mb-1">Min NP%</label>
            <input type="number" [(ngModel)]="filters.minMargin" (ngModelChange)="applyFilters()"
                   class="w-full px-2 py-1 rounded text-gray-900 text-sm"
                   placeholder="0">
          </div>

          <!-- Max Margin Filter -->
          <div>
            <label class="block text-blue-100 mb-1">Max NP%</label>
            <input type="number" [(ngModel)]="filters.maxMargin" (ngModelChange)="applyFilters()"
                   class="w-full px-2 py-1 rounded text-gray-900 text-sm"
                   placeholder="100">
          </div>

          <!-- Search Filter -->
          <div>
            <label class="block text-blue-100 mb-1">Search Notes</label>
            <input type="text" [(ngModel)]="filters.searchText" (ngModelChange)="applyFilters()"
                   class="w-full px-2 py-1 rounded text-gray-900 text-sm"
                   placeholder="Search...">
          </div>
        </div>
      </div>

      <div class="p-6">
        <!-- Summary Stats -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div class="bg-blue-50 rounded-lg p-3 text-center">
            <div class="text-sm text-blue-600 font-medium">Total Check-ins</div>
            <div class="text-2xl font-bold text-blue-700">{{ filteredCheckIns.length }}</div>
          </div>
          <div class="bg-green-50 rounded-lg p-3 text-center">
            <div class="text-sm text-green-600 font-medium">Avg Turnover</div>
            <div class="text-2xl font-bold text-green-700">{{ getAverageTurnover() | number:'1.0-0' }}</div>
          </div>
          <div class="bg-purple-50 rounded-lg p-3 text-center">
            <div class="text-sm text-purple-600 font-medium">Avg NP Margin</div>
            <div class="text-2xl font-bold text-purple-700">{{ getAverageMargin() | number:'1.1-1' }}%</div>
          </div>
          <div class="bg-orange-50 rounded-lg p-3 text-center">
            <div class="text-sm text-orange-600 font-medium">Date Range</div>
            <div class="text-sm font-bold text-orange-700">{{ getDateRange() }}</div>
          </div>
        </div>

        <!-- Loading State -->
        <div *ngIf="loading" class="text-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p class="mt-2 text-gray-600">Loading check-ins...</p>
        </div>

        <!-- Empty State -->
        <div *ngIf="!loading && filteredCheckIns.length === 0" class="text-center py-12">
          <i class="fas fa-search text-gray-300 text-4xl mb-4"></i>
          <h4 class="text-lg font-medium text-gray-900 mb-2">No Check-ins Found</h4>
          <p class="text-gray-600 mb-4">Try adjusting your filters or create a new check-in.</p>
          <button (click)="resetFilters()"
                  class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg mr-2">
            <i class="fas fa-undo mr-2"></i>
            Reset Filters
          </button>
          <button (click)="onNewCheckIn()"
                  class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg">
            <i class="fas fa-plus mr-2"></i>
            New Check-in
          </button>
        </div>

        <!-- Table -->
        <div *ngIf="!loading && filteredCheckIns.length > 0" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th (click)="sortBy('period')" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  <div class="flex items-center">
                    Period
                    <i [class]="getSortIcon('period')" class="ml-1"></i>
                  </div>
                </th>
                <th (click)="sortBy('turnover_monthly_avg')" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  <div class="flex items-center">
                    Monthly Turnover
                    <i [class]="getSortIcon('turnover_monthly_avg')" class="ml-1"></i>
                  </div>
                </th>
                <th (click)="sortBy('gp_margin')" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  <div class="flex items-center">
                    GP %
                    <i [class]="getSortIcon('gp_margin')" class="ml-1"></i>
                  </div>
                </th>
                <th (click)="sortBy('np_margin')" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  <div class="flex items-center">
                    NP %
                    <i [class]="getSortIcon('np_margin')" class="ml-1"></i>
                  </div>
                </th>
                <th (click)="sortBy('cash_on_hand')" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  <div class="flex items-center">
                    Cash Position
                    <i [class]="getSortIcon('cash_on_hand')" class="ml-1"></i>
                  </div>
                </th>
                <th (click)="sortBy('working_capital_ratio')" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  <div class="flex items-center">
                    WC Ratio
                    <i [class]="getSortIcon('working_capital_ratio')" class="ml-1"></i>
                  </div>
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let checkIn of paginatedCheckIns; trackBy: trackByCheckIn"
                  class="hover:bg-gray-50 transition-colors">
                <!-- Period -->
                <td class="px-4 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="flex-shrink-0 h-8 w-8">
                      <div class="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold"
                           [class]="getPeriodBadgeClass(checkIn)">
                        {{ getMonthAbbr(checkIn.data.month) }}
                      </div>
                    </div>
                    <div class="ml-3">
                      <div class="text-sm font-medium text-gray-900">
                        {{ formatPeriod(checkIn.data) }}
                      </div>
                      <div class="text-xs text-gray-500">
                        {{ checkIn.data.quarter }}
                      </div>
                    </div>
                  </div>
                </td>

                <!-- Monthly Turnover -->
                <td class="px-4 py-4 whitespace-nowrap">
                  <div class="text-sm font-semibold text-gray-900">
                    R {{ checkIn.data.turnover_monthly_avg | number:'1.0-0' }}
                  </div>
                  <div class="text-xs text-gray-500">
                    Monthly Average
                  </div>
                </td>

                <!-- GP Margin -->
                <td class="px-4 py-4 whitespace-nowrap">
                  <div class="text-sm font-semibold"
                       [class]="getMarginClass(checkIn.data.gp_margin)">
                    {{ checkIn.data.gp_margin | number:'1.1-1' }}%
                  </div>
                </td>

                <!-- NP Margin -->
                <td class="px-4 py-4 whitespace-nowrap">
                  <div class="text-sm font-semibold"
                       [class]="getMarginClass(checkIn.data.np_margin)">
                    {{ checkIn.data.np_margin | number:'1.1-1' }}%
                  </div>
                </td>

                <!-- Cash Position -->
                <td class="px-4 py-4 whitespace-nowrap">
                  <div class="text-sm font-semibold text-gray-900">
                    R {{ checkIn.data.cash_on_hand | number:'1.0-0' }}
                  </div>
                </td>

                <!-- Working Capital Ratio -->
                <td class="px-4 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <span class="text-sm font-semibold"
                          [class]="getWorkingCapitalClass(checkIn.data.working_capital_ratio)">
                      {{ checkIn.data.working_capital_ratio | number:'1.2-2' }}
                    </span>
                    <i class="ml-2" [class]="getWorkingCapitalIcon(checkIn.data.working_capital_ratio)"></i>
                  </div>
                </td>

                <!-- Notes -->
                <td class="px-4 py-4">
                  <div class="text-sm text-gray-900 max-w-xs truncate" [title]="checkIn.data.notes">
                    {{ checkIn.data.notes || 'No notes' }}
                  </div>
                </td>

                <!-- Actions -->
                <td class="px-4 py-4 whitespace-nowrap text-sm font-medium">
                  <button (click)="editCheckIn(checkIn)"
                          class="text-blue-600 hover:text-blue-900 mr-2">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button (click)="deleteCheckIn(checkIn)"
                          class="text-red-600 hover:text-red-900">
                    <i class="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div *ngIf="filteredCheckIns.length > pageSize" class="mt-6 flex items-center justify-between">
          <div class="text-sm text-gray-700">
            Showing {{ (currentPage - 1) * pageSize + 1 }} to {{ Math.min(currentPage * pageSize, filteredCheckIns.length) }}
            of {{ filteredCheckIns.length }} results
          </div>
          <div class="flex space-x-2">
            <button (click)="previousPage()" [disabled]="currentPage === 1"
                    class="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50">
              Previous
            </button>
            <span class="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded">
              Page {{ currentPage }} of {{ totalPages }}
            </span>
            <button (click)="nextPage()" [disabled]="currentPage === totalPages"
                    class="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
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
export class FinancialCheckinTableComponent implements OnInit {
  @Input() checkIns: INode<FinancialCheckIn>[] = [];
  @Input() loading = false;
  @Output() onNewCheckInClick = new EventEmitter<void>();
  @Output() onEditCheckIn = new EventEmitter<INode<FinancialCheckIn>>();
  @Output() onDeleteCheckIn = new EventEmitter<INode<FinancialCheckIn>>();

  // Filtering and Sorting
  filters: FilterOptions = {
    year: null,
    quarter: null,
    month: null,
    minMargin: null,
    maxMargin: null,
    searchText: ''
  };

  sortConfig: SortConfig = {
    column: 'year',
    direction: 'desc'
  };

  filteredCheckIns: INode<FinancialCheckIn>[] = [];
  paginatedCheckIns: INode<FinancialCheckIn>[] = [];

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  // Utility references
  Math = Math;

  months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  availableYears: number[] = [];

  ngOnInit() {
    this.initializeAvailableYears();
    this.applyFilters();
  }

  ngOnChanges() {
    this.initializeAvailableYears();
    this.applyFilters();
  }

  private initializeAvailableYears() {
    const years = [...new Set(this.checkIns.map(ci => ci.data.year))];
    this.availableYears = years.sort((a, b) => b - a);
  }

  private parseMonth(month: string | number | undefined): number {
    if (month === undefined || month === null) return 0;
    return typeof month === 'string' ? parseInt(month, 10) : month;
  }

  applyFilters() {
    this.filteredCheckIns = this.checkIns.filter(checkIn => {
      const data = checkIn.data;

      // Year filter
      if (this.filters.year && data.year !== this.filters.year) {
        return false;
      }

      // Quarter filter
      if (this.filters.quarter && data.quarter !== this.filters.quarter) {
        return false;
      }

      // Month filter
      if (this.filters.month && this.parseMonth(data.month) !== this.filters.month) {
        return false;
      }

      // Min margin filter
      if (this.filters.minMargin !== null && (data.np_margin || 0) < this.filters.minMargin) {
        return false;
      }

      // Max margin filter
      if (this.filters.maxMargin !== null && (data.np_margin || 0) > this.filters.maxMargin) {
        return false;
      }

      // Search text filter
      if (this.filters.searchText && data.notes &&
          !data.notes.toLowerCase().includes(this.filters.searchText.toLowerCase())) {
        return false;
      }

      return true;
    });

    this.applySorting();
    this.updatePagination();
  }

  private applySorting() {
    this.filteredCheckIns.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      if (this.sortConfig.column === 'period') {
        aValue = a.data.year * 100 + this.parseMonth(a.data.month);
        bValue = b.data.year * 100 + this.parseMonth(b.data.month);
      } else {
        aValue = a.data[this.sortConfig.column as keyof FinancialCheckIn] || 0;
        bValue = b.data[this.sortConfig.column as keyof FinancialCheckIn] || 0;
      }

      if (aValue < bValue) {
        return this.sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return this.sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  private updatePagination() {
    this.totalPages = Math.ceil(this.filteredCheckIns.length / this.pageSize);
    this.currentPage = Math.min(this.currentPage, this.totalPages || 1);

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedCheckIns = this.filteredCheckIns.slice(startIndex, endIndex);
  }

  sortBy(column: string) {
    if (this.sortConfig.column === column) {
      this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortConfig.column = column;
      this.sortConfig.direction = 'desc';
    }
    this.applySorting();
    this.updatePagination();
  }

  getSortIcon(column: string): string {
    if (this.sortConfig.column !== column) {
      return 'fas fa-sort text-gray-300';
    }
    return this.sortConfig.direction === 'asc'
      ? 'fas fa-sort-up text-blue-600'
      : 'fas fa-sort-down text-blue-600';
  }

  resetFilters() {
    this.filters = {
      year: null,
      quarter: null,
      month: null,
      minMargin: null,
      maxMargin: null,
      searchText: ''
    };
    this.currentPage = 1;
    this.applyFilters();
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  trackByCheckIn(index: number, checkIn: INode<FinancialCheckIn>): any {
    return checkIn.id || index;
  }

  // Formatting and styling methods
  formatPeriod(data: FinancialCheckIn): string {
    const monthNumber = this.parseMonth(data.month);
    return `${this.months[monthNumber - 1]} ${data.year}`;
  }

  getMonthAbbr(month: string | number | undefined): string {
    const monthNumber = this.parseMonth(month);
    return this.months[monthNumber - 1]?.substring(0, 3) || '???';
  }

  getPeriodBadgeClass(checkIn: INode<FinancialCheckIn>): string {
    const quarter = checkIn.data.quarter;
    switch (quarter) {
      case 'Q1': return 'bg-green-100 text-green-800';
      case 'Q2': return 'bg-blue-100 text-blue-800';
      case 'Q3': return 'bg-yellow-100 text-yellow-800';
      case 'Q4': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getMarginClass(margin: number | undefined): string {
    if (!margin) return 'text-gray-500';
    if (margin >= 20) return 'text-green-600';
    if (margin >= 10) return 'text-yellow-600';
    if (margin >= 0) return 'text-orange-600';
    return 'text-red-600';
  }

  getWorkingCapitalClass(ratio: number | undefined): string {
    if (!ratio) return 'text-gray-500';
    if (ratio >= 1.5) return 'text-green-600';
    if (ratio >= 1.0) return 'text-yellow-600';
    return 'text-red-600';
  }

  getWorkingCapitalIcon(ratio: number | undefined): string {
    if (!ratio) return 'fas fa-question-circle text-gray-400';
    if (ratio >= 1.5) return 'fas fa-check-circle text-green-600';
    if (ratio >= 1.0) return 'fas fa-exclamation-triangle text-yellow-600';
    return 'fas fa-times-circle text-red-600';
  }

  // Summary statistics
  getAverageTurnover(): number {
    if (this.filteredCheckIns.length === 0) return 0;
    const total = this.filteredCheckIns.reduce((sum, ci) => sum + (ci.data.turnover_monthly_avg || 0), 0);
    return total / this.filteredCheckIns.length;
  }

  getAverageMargin(): number {
    if (this.filteredCheckIns.length === 0) return 0;
    const total = this.filteredCheckIns.reduce((sum, ci) => sum + (ci.data.np_margin || 0), 0);
    return total / this.filteredCheckIns.length;
  }

  getDateRange(): string {
    if (this.filteredCheckIns.length === 0) return 'No data';

    const sorted = [...this.filteredCheckIns].sort((a, b) => {
      const aDate = a.data.year * 100 + this.parseMonth(a.data.month);
      const bDate = b.data.year * 100 + this.parseMonth(b.data.month);
      return aDate - bDate;
    });

    const earliest = sorted[0];
    const latest = sorted[sorted.length - 1];

    return `${this.getMonthAbbr(earliest.data.month)} ${earliest.data.year} - ${this.getMonthAbbr(latest.data.month)} ${latest.data.year}`;
  }

  // Event handlers
  onNewCheckIn() {
    this.onNewCheckInClick.emit();
  }

  editCheckIn(checkIn: INode<FinancialCheckIn>) {
    this.onEditCheckIn.emit(checkIn);
  }

  deleteCheckIn(checkIn: INode<FinancialCheckIn>) {
    this.onDeleteCheckIn.emit(checkIn);
  }
}
