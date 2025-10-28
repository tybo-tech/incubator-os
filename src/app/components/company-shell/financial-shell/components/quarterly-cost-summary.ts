import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CompanyCostingYearlyStatsService, QuarterlyCosts, CategoryQuarterlyCosts } from '../../../../../services/company-costing-yearly-stats.service';
import { FinancialYearService, FinancialYear } from '../../../../../services/financial-year.service';
import { FormsModule } from '@angular/forms';
import { PieComponent } from '../../../../charts/pie/pie.component';
import { IPieChart } from '../../../../../models/Charts';

@Component({
  selector: 'app-quarterly-cost-summary',
  standalone: true,
  imports: [CommonModule, FormsModule, PieComponent],
  template: `
    <section class="p-6 bg-white rounded-2xl shadow-sm max-w-6xl mx-auto border border-gray-100">
      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between mb-6">
        <div>
          <h2 class="text-2xl font-semibold text-gray-800 flex items-center gap-2">
            <i class="fa-solid fa-chart-pie"></i>
            Quarterly Cost Summary
            <span *ngIf="isLoading" class="text-sm text-blue-600">(Loading...)</span>
          </h2>
          <p class="text-sm text-gray-500">
            Live quarterly calculations from monthly cost data
          </p>
        </div>
        <div class="flex items-center gap-3">
          <label class="text-sm text-gray-600">Financial Year:</label>
          <select 
            class="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none text-sm"
            [(ngModel)]="selectedYearId" 
            (ngModelChange)="onYearChange()">
            <option *ngFor="let y of financialYears" [ngValue]="y.id">{{ y.name }}</option>
          </select>
        </div>
      </div>

      <!-- Financial Year Info -->
      <div *ngIf="quarterlyCosts" class="mb-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div class="flex items-center gap-2 text-sm text-gray-700">
          <i class="fa-solid fa-calendar text-blue-600"></i>
          <span class="font-medium">{{ quarterlyCosts.financial_year_name }}</span>
          <span class="text-gray-500">•</span>
          <span>{{ quarterlyCosts.fy_start_year }} - {{ quarterlyCosts.fy_end_year }}</span>
        </div>
      </div>

      <div *ngIf="!isLoading && quarterlyCosts">
        <!-- Summary Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <div class="p-5 bg-gradient-to-r from-red-100 to-red-50 rounded-2xl border border-red-200">
            <div class="flex justify-between items-center">
              <div>
                <p class="text-sm font-medium text-gray-500">Total Costs</p>
                <h3 class="text-2xl font-semibold text-gray-800 mt-1">R {{ quarterlyCosts.total_costs | number:'1.0-0' }}</h3>
              </div>
              <i class="fa fa-wallet text-red-500 text-3xl"></i>
            </div>
          </div>

          <div class="p-5 bg-gradient-to-r from-emerald-100 to-emerald-50 rounded-2xl border border-emerald-200">
            <div class="flex justify-between items-center">
              <div>
                <p class="text-sm font-medium text-gray-500">Direct Costs</p>
                <h3 class="text-2xl font-semibold text-gray-800 mt-1">R {{ quarterlyCosts.direct_total | number:'1.0-0' }}</h3>
              </div>
              <i class="fa fa-box text-emerald-600 text-3xl"></i>
            </div>
          </div>

          <div class="p-5 bg-gradient-to-r from-sky-100 to-sky-50 rounded-2xl border border-sky-200">
            <div class="flex justify-between items-center">
              <div>
                <p class="text-sm font-medium text-gray-500">Operational Costs</p>
                <h3 class="text-2xl font-semibold text-gray-800 mt-1">R {{ quarterlyCosts.operational_total | number:'1.0-0' }}</h3>
              </div>
              <i class="fa fa-briefcase text-sky-600 text-3xl"></i>
            </div>
          </div>
        </div>

        <!-- Pie Charts - Cost Distribution -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <!-- Direct Costs Pie Chart -->
          <div class="bg-white p-6 rounded-xl border border-gray-200">
            <h3 class="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <i class="fa fa-box text-emerald-600"></i>
              Direct Costs Distribution
            </h3>
            <app-pie
              componentTitle=""
              [data]="directCostChartData()"
            ></app-pie>
          </div>

          <!-- Operational Costs Pie Chart -->
          <div class="bg-white p-6 rounded-xl border border-gray-200">
            <h3 class="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <i class="fa fa-briefcase text-sky-600"></i>
              Operational Costs Distribution
            </h3>
            <app-pie
              componentTitle=""
              [data]="operationalCostChartData()"
            ></app-pie>
          </div>
        </div>

        <!-- Quarterly Summary Chart -->
        <div class="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-8">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold text-gray-700 flex items-center gap-2">
              <i class="fa fa-chart-line text-blue-600"></i>
              Quarterly Cost Trends
            </h3>
          </div>
          <div class="grid grid-cols-4 gap-3">
            <div *ngFor="let quarter of quarters; let i = index" 
                 class="p-4 bg-white rounded-lg border border-gray-200 text-center">
              <div class="text-xs font-medium text-gray-500 mb-1">Q{{ i + 1 }}</div>
              <div class="text-sm text-gray-600 mb-2">{{ quarter.months }}</div>
              <div class="text-lg font-bold text-gray-800">R {{ quarter.total | number:'1.0-0' }}</div>
              <div class="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
                <div>Direct: R {{ quarter.direct | number:'1.0-0' }}</div>
                <div>Ops: R {{ quarter.operational | number:'1.0-0' }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Breakdown Tables -->
        <div class="space-y-6">
          <!-- Direct Costs -->
          <div *ngIf="directCategories().length > 0">
            <h4 class="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <i class="fa fa-box text-emerald-600"></i> Direct Costs by Category
            </h4>
            <div class="overflow-x-auto">
              <table class="w-full text-sm border border-gray-100 rounded-xl overflow-hidden">
                <thead class="bg-emerald-50 text-gray-700">
                  <tr>
                    <th class="py-3 px-4 text-left font-semibold">Category</th>
                    <th class="py-3 px-4 text-right font-semibold">Q1</th>
                    <th class="py-3 px-4 text-right font-semibold">Q2</th>
                    <th class="py-3 px-4 text-right font-semibold">Q3</th>
                    <th class="py-3 px-4 text-right font-semibold">Q4</th>
                    <th class="py-3 px-4 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let cat of directCategories()" class="border-t border-gray-100 hover:bg-gray-50">
                    <td class="py-3 px-4">{{ cat.category_name }}</td>
                    <td class="py-3 px-4 text-right">R {{ cat.q1 | number:'1.0-0' }}</td>
                    <td class="py-3 px-4 text-right">R {{ cat.q2 | number:'1.0-0' }}</td>
                    <td class="py-3 px-4 text-right">R {{ cat.q3 | number:'1.0-0' }}</td>
                    <td class="py-3 px-4 text-right">R {{ cat.q4 | number:'1.0-0' }}</td>
                    <td class="py-3 px-4 text-right font-semibold">R {{ cat.total | number:'1.0-0' }}</td>
                  </tr>
                  <tr class="border-t-2 border-emerald-200 bg-emerald-50 font-semibold">
                    <td class="py-3 px-4">Direct Costs Total</td>
                    <td class="py-3 px-4 text-right">R {{ quarterlyCosts.direct_q1 | number:'1.0-0' }}</td>
                    <td class="py-3 px-4 text-right">R {{ quarterlyCosts.direct_q2 | number:'1.0-0' }}</td>
                    <td class="py-3 px-4 text-right">R {{ quarterlyCosts.direct_q3 | number:'1.0-0' }}</td>
                    <td class="py-3 px-4 text-right">R {{ quarterlyCosts.direct_q4 | number:'1.0-0' }}</td>
                    <td class="py-3 px-4 text-right">R {{ quarterlyCosts.direct_total | number:'1.0-0' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Operational Costs -->
          <div *ngIf="operationalCategories().length > 0">
            <h4 class="font-semibold text-gray-700 mb-3 flex items-center gap-2 mt-6">
              <i class="fa fa-briefcase text-sky-600"></i> Operational Costs by Category
            </h4>
            <div class="overflow-x-auto">
              <table class="w-full text-sm border border-gray-100 rounded-xl overflow-hidden">
                <thead class="bg-sky-50 text-gray-700">
                  <tr>
                    <th class="py-3 px-4 text-left font-semibold">Category</th>
                    <th class="py-3 px-4 text-right font-semibold">Q1</th>
                    <th class="py-3 px-4 text-right font-semibold">Q2</th>
                    <th class="py-3 px-4 text-right font-semibold">Q3</th>
                    <th class="py-3 px-4 text-right font-semibold">Q4</th>
                    <th class="py-3 px-4 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let cat of operationalCategories()" class="border-t border-gray-100 hover:bg-gray-50">
                    <td class="py-3 px-4">{{ cat.category_name }}</td>
                    <td class="py-3 px-4 text-right">R {{ cat.q1 | number:'1.0-0' }}</td>
                    <td class="py-3 px-4 text-right">R {{ cat.q2 | number:'1.0-0' }}</td>
                    <td class="py-3 px-4 text-right">R {{ cat.q3 | number:'1.0-0' }}</td>
                    <td class="py-3 px-4 text-right">R {{ cat.q4 | number:'1.0-0' }}</td>
                    <td class="py-3 px-4 text-right font-semibold">R {{ cat.total | number:'1.0-0' }}</td>
                  </tr>
                  <tr class="border-t-2 border-sky-200 bg-sky-50 font-semibold">
                    <td class="py-3 px-4">Operational Costs Total</td>
                    <td class="py-3 px-4 text-right">R {{ quarterlyCosts.operational_q1 | number:'1.0-0' }}</td>
                    <td class="py-3 px-4 text-right">R {{ quarterlyCosts.operational_q2 | number:'1.0-0' }}</td>
                    <td class="py-3 px-4 text-right">R {{ quarterlyCosts.operational_q3 | number:'1.0-0' }}</td>
                    <td class="py-3 px-4 text-right">R {{ quarterlyCosts.operational_q4 | number:'1.0-0' }}</td>
                    <td class="py-3 px-4 text-right">R {{ quarterlyCosts.operational_total | number:'1.0-0' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Grand Total -->
          <div class="p-5 bg-gradient-to-r from-gray-100 to-gray-50 rounded-xl border-2 border-gray-300">
            <div class="flex items-center justify-between">
              <h4 class="font-bold text-gray-800 text-lg">Grand Total (All Costs)</h4>
              <div class="text-2xl font-bold text-gray-900">R {{ quarterlyCosts.total_costs | number:'1.0-0' }}</div>
            </div>
            <div class="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-300">
              <div class="text-center">
                <div class="text-xs text-gray-500 mb-1">Q1</div>
                <div class="font-semibold text-gray-800">R {{ quarterlyCosts.total_costs_q1 | number:'1.0-0' }}</div>
              </div>
              <div class="text-center">
                <div class="text-xs text-gray-500 mb-1">Q2</div>
                <div class="font-semibold text-gray-800">R {{ quarterlyCosts.total_costs_q2 | number:'1.0-0' }}</div>
              </div>
              <div class="text-center">
                <div class="text-xs text-gray-500 mb-1">Q3</div>
                <div class="font-semibold text-gray-800">R {{ quarterlyCosts.total_costs_q3 | number:'1.0-0' }}</div>
              </div>
              <div class="text-center">
                <div class="text-xs text-gray-500 mb-1">Q4</div>
                <div class="font-semibold text-gray-800">R {{ quarterlyCosts.total_costs_q4 | number:'1.0-0' }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="flex items-center justify-center py-12">
        <div class="text-center">
          <i class="fa-solid fa-spinner fa-spin text-4xl text-blue-600 mb-3"></i>
          <p class="text-gray-600">Loading quarterly cost data...</p>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="!isLoading && !quarterlyCosts" class="flex items-center justify-center py-12">
        <div class="text-center">
          <i class="fa-solid fa-chart-pie text-6xl text-gray-300 mb-4"></i>
          <p class="text-gray-600 text-lg font-medium mb-2">No cost data available</p>
          <p class="text-gray-500 text-sm">Start capturing monthly costs to see quarterly summaries</p>
        </div>
      </div>
    </section>
  `
})
export class QuarterlyCostSummaryComponent implements OnInit {
  companyId: number = 0;
  selectedYearId: number = 1;
  isLoading = false;

  // Data from services
  financialYears: FinancialYear[] = [];
  quarterlyCosts: QuarterlyCosts | null = null;
  directCategories = signal<CategoryQuarterlyCosts[]>([]);
  operationalCategories = signal<CategoryQuarterlyCosts[]>([]);
  
  // UI helpers
  quarters: Array<{ months: string; total: number; direct: number; operational: number }> = [];

  // Pie chart data computed from category breakdown
  directCostChartData = computed((): IPieChart => {
    const categories = this.directCategories();
    if (!categories || categories.length === 0) {
      return { labels: [], datasets: [] };
    }

    return {
      labels: categories.map(cat => cat.category_name || 'Uncategorized'),
      datasets: [
        {
          data: categories.map(cat => cat.total),
          backgroundColor: this.generateColors(categories.length, 'emerald'),
          borderColor: categories.map(() => '#ffffff'),
          borderWidth: 2
        }
      ]
    };
  });

  operationalCostChartData = computed((): IPieChart => {
    const categories = this.operationalCategories();
    if (!categories || categories.length === 0) {
      return { labels: [], datasets: [] };
    }

    return {
      labels: categories.map(cat => cat.category_name || 'Uncategorized'),
      datasets: [
        {
          data: categories.map(cat => cat.total),
          backgroundColor: this.generateColors(categories.length, 'sky'),
          borderColor: categories.map(() => '#ffffff'),
          borderWidth: 2
        }
      ]
    };
  });

  constructor(
    private route: ActivatedRoute,
    private costingStatsService: CompanyCostingYearlyStatsService,
    private financialYearService: FinancialYearService
  ) {}

  ngOnInit() {
    // Get company ID from route parameters
    const companyId = +this.route.parent?.parent?.snapshot.params['id'];
    if (companyId) {
      this.companyId = companyId;
      console.log('🏢 Quarterly Cost Summary - Company ID from route:', this.companyId);
      this.loadFinancialYears();
    } else {
      console.error('❌ No company ID found in route');
    }
  }

  /**
   * Load available financial years
   */
  private loadFinancialYears() {
    this.financialYearService.getAllFinancialYears().subscribe({
      next: (years: FinancialYear[]) => {
        this.financialYears = years;
        if (years.length > 0) {
          // Default to most recent year
          this.selectedYearId = years[0].id;
          this.loadQuarterlyCosts();
        }
      },
      error: (error: any) => {
        console.error('Failed to load financial years:', error);
      }
    });
  }

  /**
   * Handle financial year change
   */
  onYearChange() {
    this.loadQuarterlyCosts();
  }

  /**
   * Load quarterly cost data from API
   */
  private loadQuarterlyCosts() {
    if (!this.companyId || !this.selectedYearId) return;

    this.isLoading = true;

    // Load main quarterly costs
    this.costingStatsService.getQuarterlyCosts(this.companyId, this.selectedYearId).subscribe({
      next: (data) => {
        this.quarterlyCosts = data;
        this.processQuarterData(data);
        this.loadCategoryBreakdown();
        console.log('✅ Quarterly costs loaded:', data);
      },
      error: (error) => {
        console.error('Failed to load quarterly costs:', error);
        this.isLoading = false;
      }
    });
  }

  /**
   * Load detailed category breakdown
   */
  private loadCategoryBreakdown() {
    this.costingStatsService.getQuarterlyCostsByCategory(this.companyId, this.selectedYearId).subscribe({
      next: (data) => {
        // Separate direct and operational categories using signal.set()
        this.directCategories.set(data.categories.filter(c => c.cost_type === 'direct'));
        this.operationalCategories.set(data.categories.filter(c => c.cost_type === 'operational'));
        console.log('✅ Category breakdown loaded:', data);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to load category breakdown:', error);
        this.isLoading = false;
      }
    });
  }

  /**
   * Process quarter data for the chart view
   */
  private processQuarterData(data: QuarterlyCosts) {
    const quarterDetails = data.quarter_details;
    
    this.quarters = [
      {
        months: quarterDetails.q1_months.map(m => m.substring(0, 3)).join(', '),
        total: data.total_costs_q1,
        direct: data.direct_q1,
        operational: data.operational_q1
      },
      {
        months: quarterDetails.q2_months.map(m => m.substring(0, 3)).join(', '),
        total: data.total_costs_q2,
        direct: data.direct_q2,
        operational: data.operational_q2
      },
      {
        months: quarterDetails.q3_months.map(m => m.substring(0, 3)).join(', '),
        total: data.total_costs_q3,
        direct: data.direct_q3,
        operational: data.operational_q3
      },
      {
        months: quarterDetails.q4_months.map(m => m.substring(0, 3)).join(', '),
        total: data.total_costs_q4,
        direct: data.direct_q4,
        operational: data.operational_q4
      }
    ];
  }

  /**
   * Generate color palette for pie charts
   * Creates consistent colors based on color theme
   */
  private generateColors(count: number, theme: 'emerald' | 'sky'): string[] {
    const colors = {
      emerald: [
        '#10b981', '#059669', '#047857', '#065f46', '#064e3b',
        '#6ee7b7', '#34d399', '#a7f3d0', '#d1fae5', '#ecfdf5'
      ],
      sky: [
        '#0ea5e9', '#0284c7', '#0369a1', '#075985', '#0c4a6e',
        '#7dd3fc', '#38bdf8', '#bae6fd', '#e0f2fe', '#f0f9ff'
      ]
    };

    const palette = colors[theme];
    const result: string[] = [];
    
    for (let i = 0; i < count; i++) {
      result.push(palette[i % palette.length]);
    }
    
    return result;
  }
}

