import { Component, OnInit, Input, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import { CostCategoriesService, CostCategory } from '../../../../../services/cost-categories.service';
import { CompanyCostingYearlyStatsService, CompanyCostingYearlyStats, MonthlyData } from '../../../../../services/company-costing-yearly-stats.service';
import { CompanyFinancialYearlyStatsService, YearlyRevenueSummary } from '../../../../../services/company-financial-yearly-stats.service';
import { FinancialYearService, FinancialYear } from '../../../../../services/financial-year.service';
import { CostCategoryPickerModalComponent } from './cost-category-picker-modal.component';

type CostType = 'direct' | 'operational';

interface CostLine {
  id: number;
  costingStatsId?: number;    // Link to database record
  type: CostType;
  category: string;
  categoryId?: number | null;  // Link to cost category
  monthly: number[];          // length 12, Jan..Dec
  total: number;              // cached for quick view
  notes?: string;
  isSaving?: boolean;         // Individual row saving state
}@Component({
    selector: 'app-cost-structure-demo',
    standalone: true,
    imports: [CommonModule, FormsModule, CostCategoryPickerModalComponent],
    template: `
    <div class="p-6 m-5">
      <!-- Page Header -->
      <div class="mb-6">
        <h1 class="text-2xl md:text-3xl font-semibold text-gray-800 flex items-center gap-2">
          <i class="fa-solid fa-scale-balanced"></i>
          Cost Structure
          <span *ngIf="isLoading" class="text-sm text-blue-600">(Loading...)</span>
          <span *ngIf="isSaving" class="text-sm text-green-600">(Saving...)</span>
        </h1>
        <p class="text-gray-500">Yearly cost capture with live totals & automatic saving to database.</p>
      </div>

      <!-- Toolbar -->
      <div class="flex flex-wrap items-center gap-3 mb-6">
        <label class="text-sm text-gray-600">Financial Year</label>
        <select class="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none"
                [(ngModel)]="selectedYearId" (ngModelChange)="onYearChange()">
          <option *ngFor="let y of financialYears" [ngValue]="y.id">{{ y.name }}</option>
        </select>

        <!-- Revenue info display -->
        <div class="ms-auto flex items-center gap-2 text-sm text-gray-500">
          <i class="fa-solid fa-chart-line"></i>
          <span *ngIf="!isLoading">Revenue: R {{ totalRevenue | number:'1.0-0' }}</span>
          <span *ngIf="isLoading">Loading revenue...</span>
        </div>
      </div>

      <!-- KPIs -->
      <div class="grid md:grid-cols-4 gap-4 mb-6">
        <div class="p-4 rounded-2xl border border-gray-100 shadow-sm bg-white">
          <div class="text-xs text-gray-500">Revenue</div>
          <div class="text-xl font-semibold" [class.text-gray-400]="isLoading">
            <span *ngIf="!isLoading">R {{ totalRevenue | number:'1.0-0' }}</span>
            <span *ngIf="isLoading">Loading...</span>
          </div>
          <div class="text-xs text-green-600 mt-1" *ngIf="!isLoading">*From database</div>
        </div>
        <div class="p-4 rounded-2xl border border-gray-100 shadow-sm bg-white">
          <div class="text-xs text-gray-500">Direct Costs (COGS)</div>
          <div class="text-xl font-semibold">R {{ totals.direct | number:'1.0-0' }}</div>
        </div>
        <div class="p-4 rounded-2xl border border-gray-100 shadow-sm bg-white">
          <div class="text-xs text-gray-500">Operating Expenses</div>
          <div class="text-xl font-semibold">R {{ totals.operational | number:'1.0-0' }}</div>
        </div>
        <div class="p-4 rounded-2xl border border-gray-100 shadow-sm bg-white">
          <div class="text-xs text-gray-500">Net Profit (Rev - COGS - OPEX)</div>
          <div class="text-xl font-semibold"
               [class.text-emerald-600]="grandNet >= 0"
               [class.text-rose-600]="grandNet < 0">
               R {{ grandNet | number:'1.0-0' }}
          </div>
        </div>
      </div>

      <!-- Sections -->
      <div class="space-y-8">

        <!-- Direct Costs -->
        <div class="rounded-2xl border border-gray-100 shadow-sm bg-white overflow-hidden">
          <div class="px-4 py-3 bg-emerald-600 text-white flex items-center justify-between">
            <div class="font-semibold flex items-center gap-2">
              <i class="fa-solid fa-industry"></i>
              Direct Costs
            </div>
            <div class="text-sm">Total: <span class="font-semibold">R {{ totals.direct | number:'1.0-0' }}</span></div>
          </div>

          <!-- Add Row -->
          <div class="p-4 flex justify-start">
            <button class="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 flex items-center gap-2 shadow-sm transition-all"
                    (click)="openCategoryPicker('direct')" 
                    [disabled]="isSaving">
              <i class="fa-solid fa-plus"></i> 
              <span *ngIf="!isSaving">Add Direct Cost</span>
              <span *ngIf="isSaving">Saving...</span>
            </button>
          </div>

          <!-- Table -->
          <div class="overflow-x-auto">
            <table class="min-w-[1000px] w-full">
              <thead>
                <tr class="bg-gray-50 text-xs text-gray-500">
                  <th class="text-left p-2 min-w-[200px] w-56">Category</th>
                  <th class="p-1 text-center w-20 whitespace-nowrap" *ngFor="let m of months">{{ m }}</th>
                  <th class="p-2 w-40 text-right whitespace-nowrap">Total</th>
                  <th class="p-2 w-16 text-center whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of rows.direct; trackBy: trackById" class="border-b last:border-b-0">
                  <td class="p-2">
                    <div class="flex items-center gap-2">
                      <i class="fa-solid fa-box text-emerald-600 text-xs"></i>
                      <span class="font-medium text-gray-900 text-sm">{{ row.category }}</span>
                      <button 
                        class="text-gray-400 hover:text-blue-600 text-xs ml-1" 
                        (click)="openCategoryPickerForEdit(row, 'direct')"
                        title="Change category">
                        <i class="fa-solid fa-pen-to-square"></i>
                      </button>
                      <i *ngIf="row.isSaving" class="fa-solid fa-spinner fa-spin text-blue-500 text-xs"></i>
                    </div>
                  </td>

                  <td class="p-1 whitespace-nowrap" *ngFor="let _m of months; let mi = index">
                    <div class="relative">
                      <span class="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">R</span>
                      <input type="number" class="ps-5 w-20 px-1 py-1 text-sm rounded border border-gray-200 text-right"
                             [(ngModel)]="row.monthly[mi]" (change)="onCellChangeWithSave(row)">
                    </div>
                  </td>

                  <td class="p-2 font-semibold text-sm text-right whitespace-nowrap">R {{ row.total | number:'1.0-0' }}</td>
                  <td class="p-2 text-center whitespace-nowrap">
                    <button class="text-rose-600 hover:text-rose-700 text-sm" (click)="removeRowWithSave('direct', row.id)">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </td>
                </tr>
              </tbody>

              <tfoot>
                <tr class="bg-gray-50 font-semibold text-sm">
                  <td class="p-2 text-right whitespace-nowrap">Section Total</td>
                  <td class="p-1 text-center whitespace-nowrap" *ngFor="let _m of months; let mi = index">
                    R {{ sectionMonthTotal('direct', mi) | number:'1.0-0' }}
                  </td>
                  <td class="p-2 text-right whitespace-nowrap">R {{ totals.direct | number:'1.0-0' }}</td>
                  <td class="p-2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Operational Costs -->
        <div class="rounded-2xl border border-gray-100 shadow-sm bg-white overflow-hidden">
          <div class="px-4 py-3 bg-sky-600 text-white flex items-center justify-between">
            <div class="font-semibold flex items-center gap-2">
              <i class="fa-solid fa-briefcase"></i>
              Operational Costs
            </div>
            <div class="text-sm">Total: <span class="font-semibold">R {{ totals.operational | number:'1.0-0' }}</span></div>
          </div>

          <!-- Add Row -->
          <div class="p-4 flex justify-start">
            <button class="px-4 py-2 rounded-xl bg-sky-600 text-white hover:bg-sky-500 flex items-center gap-2 shadow-sm transition-all"
                    (click)="openCategoryPicker('operational')" 
                    [disabled]="isSaving">
              <i class="fa-solid fa-plus"></i> 
              <span *ngIf="!isSaving">Add Operational Cost</span>
              <span *ngIf="isSaving">Saving...</span>
            </button>
          </div>

          <!-- Table -->
          <div class="overflow-x-auto">
            <table class="min-w-[1000px] w-full">
              <thead>
                <tr class="bg-gray-50 text-xs text-gray-500">
                  <th class="text-left p-2 min-w-[200px] w-56">Category</th>
                  <th class="p-1 text-center w-20 whitespace-nowrap" *ngFor="let m of months">{{ m }}</th>
                  <th class="p-2 w-40 text-right whitespace-nowrap">Total</th>
                  <th class="p-2 w-16 text-center whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of rows.operational; trackBy: trackById" class="border-b last:border-b-0">
                  <td class="p-2">
                    <div class="flex items-center gap-2">
                      <i class="fa-solid fa-tags text-sky-600 text-xs"></i>
                      <span class="font-medium text-gray-900 text-sm">{{ row.category }}</span>
                      <button 
                        class="text-gray-400 hover:text-blue-600 text-xs ml-1" 
                        (click)="openCategoryPickerForEdit(row, 'operational')"
                        title="Change category">
                        <i class="fa-solid fa-pen-to-square"></i>
                      </button>
                      <i *ngIf="row.isSaving" class="fa-solid fa-spinner fa-spin text-blue-500 text-xs"></i>
                    </div>
                  </td>

                  <td class="p-1 whitespace-nowrap" *ngFor="let _m of months; let mi = index">
                    <div class="relative">
                      <span class="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">R</span>
                      <input type="number" class="ps-5 w-20 px-1 py-1 text-sm rounded border border-gray-200 text-right"
                             [(ngModel)]="row.monthly[mi]" (change)="onCellChangeWithSave(row)">
                    </div>
                  </td>

                  <td class="p-2 font-semibold text-sm text-right whitespace-nowrap">R {{ row.total | number:'1.0-0' }}</td>
                  <td class="p-2 text-center whitespace-nowrap">
                    <button class="text-rose-600 hover:text-rose-700 text-sm" (click)="removeRowWithSave('operational', row.id)">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </td>
                </tr>
              </tbody>

              <tfoot>
                <tr class="bg-gray-50 font-semibold text-sm">
                  <td class="p-2 text-right whitespace-nowrap">Section Total</td>
                  <td class="p-1 text-center whitespace-nowrap" *ngFor="let _m of months; let mi = index">
                    R {{ sectionMonthTotal('operational', mi) | number:'1.0-0' }}
                  </td>
                  <td class="p-2 text-right whitespace-nowrap">R {{ totals.operational | number:'1.0-0' }}</td>
                  <td class="p-2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <!-- Grand Totals -->
      <div class="mt-8 p-4 rounded-2xl border border-gray-100 shadow-sm bg-white">
        <div class="flex flex-wrap items-center gap-6">
          <div class="text-lg font-semibold flex items-center gap-2">
            <i class="fa-solid fa-sack-dollar"></i> Grand Totals
          </div>
          <div class="text-gray-700">Direct: <span class="font-semibold">R {{ totals.direct | number:'1.0-0' }}</span></div>
          <div class="text-gray-700">Operational: <span class="font-semibold">R {{ totals.operational | number:'1.0-0' }}</span></div>
          <div class="ms-auto text-gray-900 font-semibold">
            Net: <span [class.text-emerald-600]="grandNet >= 0" [class.text-rose-600]="grandNet < 0">
              R {{ grandNet | number:'1.0-0' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Helper -->
      <p class="mt-4 text-xs text-gray-500">
        💾 Changes are automatically saved to the database. 
        📊 Cost categories are loaded from your configured categories. 
        📱 On small screens you can horizontally scroll the tables.
      </p>

      <!-- Category Picker Modal -->
      <app-cost-category-picker-modal
        #categoryPickerModal
        [companyId]="companyId"
        (categorySelected)="onCategorySelected($event)"
        (closed)="onCategoryPickerClosed()">
      </app-cost-category-picker-modal>
    </div>
  `,
})
export class CostStructureDemoComponent implements OnInit, OnDestroy {
    companyId: number = 0; // Will be set from route
    @Input() financialYearId: number = 1; // Default financial year ID
    @ViewChild('categoryPickerModal') categoryPickerModal!: CostCategoryPickerModalComponent;

    private destroy$ = new Subject<void>();
    private saveSubject = new Subject<void>();
    
    // Track row being edited for category change
    private rowBeingEdited: CostLine | null = null;

    // --- Real data from services ---

    // Cost Categories from API
    costCategories: CostCategory[] = [];
    directCostCategories: CostCategory[] = [];
    operationalCostCategories: CostCategory[] = [];

    // Loading states
    isLoading = false;
    isSaving = false;

  // UI State
  selectedYearId = 1;
  
  // Data from services
  financialYears: FinancialYear[] = [];    // Months (Jan..Dec)
    months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Totals cache
    totals = { direct: 0, operational: 0 };
    totalRevenue = 0; // Will be loaded from database

    // Row storage - starts empty, loaded from database
    rows: Record<CostType, CostLine[]> = {
        direct: [],
        operational: []
    };

    // New-row buffers
    newRow = {
        direct: { category: 'Raw Materials' },
        operational: { category: 'Salaries & Wages' },
    };

    private autoId = 1;

  constructor(
    private costCategoriesService: CostCategoriesService,
    private costingStatsService: CompanyCostingYearlyStatsService,
    private companyFinancialStatsService: CompanyFinancialYearlyStatsService,
    private financialYearService: FinancialYearService,
    private route: ActivatedRoute
  ) {
    this.setupAutoSave();
  }    ngOnInit() {
        // Get company ID from route parameters (same pattern as revenue capture component)
        const companyId = +this.route.parent?.parent?.snapshot.params['id'];
        if (companyId) {
            this.companyId = companyId;
            console.log('🏢 Cost Structure - Company ID from route:', this.companyId);
            this.loadData();
        } else {
            console.error('❌ Cost Structure - No company ID found in route');
        }
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    // ---- Helpers ----

    makeRow(type: CostType, category: string, monthly?: number[]): CostLine {
        const m = monthly ?? Array.from({ length: 12 }, () => 0);
        return {
            id: this.autoId++,
            type,
            category,
            monthly: m.slice(0, 12),
            total: m.reduce((a, b) => a + (Number(b) || 0), 0),
        };
    }

    trackById = (_: number, row: CostLine) => row.id;

    addRow(type: CostType) {
        const category = type === 'direct' ? this.newRow.direct.category : this.newRow.operational.category;
        const row = this.makeRow(type, category);
        this.rows[type] = [...this.rows[type], row];
        this.recalc();
    }

    removeRow(type: CostType, id: number) {
        this.rows[type] = this.rows[type].filter(r => r.id !== id);
        this.recalc();
    }

    onCellChange(row: CostLine) {
        // sanitize -> number and >= 0
        row.monthly = row.monthly.map(v => {
            const n = Number(v);
            return isFinite(n) && n >= 0 ? n : 0;
        });
        row.total = row.monthly.reduce((a, b) => a + b, 0);
        this.recalc();
    }

    recalc() {
        // re-sum totals by section
        const sum = (type: CostType) =>
            this.rows[type].reduce((acc, r) => acc + r.total, 0);

        this.totals.direct = sum('direct');
        this.totals.operational = sum('operational');
    }

    sectionMonthTotal(type: CostType, monthIdx: number): number {
        return this.rows[type].reduce((acc, r) => acc + (r.monthly?.[monthIdx] || 0), 0);
    }

    get grandNet(): number {
        // Calculate profit based on actual revenue data
        return this.totalRevenue - this.totals.direct - this.totals.operational;
    }

    // ---- New API Integration Methods ----

    setupAutoSave() {
        this.saveSubject
            .pipe(
                debounceTime(1000), // Wait 1 second after last change
                distinctUntilChanged(),
                takeUntil(this.destroy$)
            )
            .subscribe(() => {
                this.saveAllChanges();
            });
    }

    async loadData() {
        this.isLoading = true;
        try {
            // Load dropdown data
            await this.loadDropdownData();

            // Load cost categories
            await this.loadCostCategories();

            // Load existing costing data for this company and year
            await this.loadCostingData();

            // Load revenue data for this company and year
            await this.loadRevenueData();

            this.recalc();
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            this.isLoading = false;
        }
    }

  async loadDropdownData() {
    try {
      // Load real financial years from service
      this.financialYears = await this.financialYearService.getAllFinancialYears().toPromise() || [];
      
      // Set default selected year to first available year or first active year
      if (this.financialYears.length > 0) {
        const activeYear = this.financialYears.find(fy => fy.is_active);
        this.selectedYearId = activeYear ? activeYear.id : this.financialYears[0].id;
      }
    } catch (error) {
      console.error('Error loading financial years:', error);
      // Fallback to current year if service fails
      this.selectedYearId = 1;
    }
  }    async loadCostCategories() {
        try {
            // Load cost categories by type from database (using the cost_type field)
            const [directCategories, operationalCategories] = await Promise.all([
                this.costCategoriesService.getDirectCostCategories().toPromise(),
                this.costCategoriesService.getOperationalCostCategories().toPromise()
            ]);

            this.directCostCategories = directCategories || [];
            this.operationalCostCategories = operationalCategories || [];
            
            // Combine for full list
            this.costCategories = [...this.directCostCategories, ...this.operationalCostCategories];

            console.log(`✅ Loaded ${this.directCostCategories.length} direct and ${this.operationalCostCategories.length} operational cost categories`);
            console.log('📋 Direct categories:', this.directCostCategories.map(c => c.name));
            console.log('📋 Operational categories:', this.operationalCostCategories.map(c => c.name));

            // Update new row defaults with actual categories
            if (this.directCostCategories.length > 0) {
                this.newRow.direct.category = this.directCostCategories[0].name;
            }
            if (this.operationalCostCategories.length > 0) {
                this.newRow.operational.category = this.operationalCostCategories[0].name;
            }
        } catch (error) {
            console.error('Error loading cost categories:', error);
            // Set empty arrays if service fails
            this.directCostCategories = [];
            this.operationalCostCategories = [];
            this.costCategories = [];
        }
    }

    async loadCostingData() {
        try {
            console.log(`📊 Loading costing data for company ${this.companyId}, financial year ${this.selectedYearId}`);
            
            const costingStats = await this.costingStatsService.getCostingByYear(
                this.companyId,
                this.selectedYearId
            ).toPromise() || [];

            console.log(`✅ Loaded ${costingStats.length} costing records for company ${this.companyId}`);

            // Convert database records to UI format
            this.rows = {
                direct: [],
                operational: []
            };

            for (const stat of costingStats) {
                const costLine = this.convertStatsToRow(stat);
                this.rows[costLine.type].push(costLine);
            }

            // If no data exists, start with empty rows
            if (costingStats.length === 0) {
                console.log('No costing data found for the selected year');
            }
        } catch (error) {
            console.error('Error loading costing data:', error);
        }
    }

    convertStatsToRow(stat: CompanyCostingYearlyStats): CostLine {
        return {
            id: this.autoId++,
            costingStatsId: stat.id,
            type: stat.cost_type,
            category: this.getCategoryName(stat.category_id ?? null),
            categoryId: stat.category_id,
            monthly: [
                stat.m1, stat.m2, stat.m3, stat.m4, stat.m5, stat.m6,
                stat.m7, stat.m8, stat.m9, stat.m10, stat.m11, stat.m12
            ],
            total: stat.total_amount,
            notes: stat.notes || undefined
        };
    }

    getCategoryName(categoryId: number | null): string {
        if (!categoryId) return 'Uncategorized';
        const category = this.costCategories.find(c => c.id === categoryId);
        return category?.name || `Category ${categoryId}`;
    }

    async loadRevenueData() {
        try {
            console.log(`💰 Loading revenue data for company ${this.companyId}, financial year ${this.selectedYearId}`);
            
            const revenueSummary = await this.companyFinancialStatsService.getYearlyRevenue(
                this.companyId,
                this.selectedYearId
            ).toPromise();

            this.totalRevenue = revenueSummary?.revenue_total || 0;
            console.log(`✅ Loaded revenue: R${this.totalRevenue} for company ${this.companyId}, year ${this.selectedYearId}`);
            console.log('📊 Full revenue summary:', revenueSummary);
        } catch (error) {
            console.error('❌ Error loading revenue data:', error);
            this.totalRevenue = 0; // Fallback to 0 on error
        }
    }

    async saveAllChanges() {
        if (this.isSaving) return;

        this.isSaving = true;
        try {
            // Save all rows
            const allRows = [...this.rows.direct, ...this.rows.operational];

            for (const row of allRows) {
                await this.saveRow(row);
            }

            console.log('All changes saved successfully');
        } catch (error) {
            console.error('Error saving changes:', error);
        } finally {
            this.isSaving = false;
        }
    }

    async saveRow(row: CostLine) {
        if (row.isSaving) return;

        row.isSaving = true;
        try {
            const categoryId = this.findCategoryIdByName(row.category, row.type);

            const costingData: Partial<CompanyCostingYearlyStats> = {
                company_id: this.companyId,
                financial_year_id: this.selectedYearId,
                cost_type: row.type,
                category_id: categoryId,
                m1: row.monthly[0] || 0,
                m2: row.monthly[1] || 0,
                m3: row.monthly[2] || 0,
                m4: row.monthly[3] || 0,
                m5: row.monthly[4] || 0,
                m6: row.monthly[5] || 0,
                m7: row.monthly[6] || 0,
                m8: row.monthly[7] || 0,
                m9: row.monthly[8] || 0,
                m10: row.monthly[9] || 0,
                m11: row.monthly[10] || 0,
                m12: row.monthly[11] || 0,
                notes: row.notes
            };

            if (row.costingStatsId) {
                // Update existing record
                const updated = await this.costingStatsService.updateCostingStats(row.costingStatsId, costingData).toPromise();
                if (updated) {
                    console.log(`Updated cost record ID: ${row.costingStatsId}`);
                }
            } else {
                // Create new record (fallback for orphaned rows)
                const created = await this.costingStatsService.addCostingStats(costingData).toPromise();
                if (created) {
                    row.costingStatsId = created.id;
                    console.log(`Created new cost record ID: ${created.id}`);
                }
            }
        } catch (error) {
            console.error('Error saving row:', error);
        } finally {
            row.isSaving = false;
        }
    }

    findCategoryIdByName(categoryName: string, costType: CostType): number | null {
        const categories = costType === 'direct' ? this.directCostCategories : this.operationalCostCategories;
        const category = categories.find(c => c.name === categoryName);
        return category?.id || null;
    }

    // Category Picker Modal Methods
    
    /**
     * Open category picker modal for adding new cost type
     */
    openCategoryPicker(costType: CostType) {
        this.rowBeingEdited = null; // Clear any edit state
        this.categoryPickerModal.open(costType);
    }

    /**
     * Open category picker modal for editing existing row
     */
    openCategoryPickerForEdit(row: CostLine, costType: CostType) {
        this.rowBeingEdited = row; // Track which row is being edited
        this.categoryPickerModal.open(costType);
    }

    /**
     * Handle category selection from modal
     */
    onCategorySelected(category: CostCategory) {
        console.log('✅ Category selected:', category);
        
        // Check if we're editing an existing row or adding a new one
        if (this.rowBeingEdited) {
            // Edit mode: update the existing row's category
            this.updateRowCategory(this.rowBeingEdited, category);
            this.rowBeingEdited = null; // Clear edit state
        } else {
            // Add mode: create a new row with selected category
            if (category.cost_type === 'direct') {
                this.addRowWithSelectedCategory('direct', category);
            } else if (category.cost_type === 'operational') {
                this.addRowWithSelectedCategory('operational', category);
            } else {
                console.warn('Category has no cost_type, defaulting to direct');
                this.addRowWithSelectedCategory('direct', category);
            }
        }
    }

    /**
     * Handle category picker modal close
     */
    onCategoryPickerClosed() {
        console.log('Category picker modal closed');
    }

    /**
     * Add row with pre-selected category
     */
    async addRowWithSelectedCategory(type: CostType, category: CostCategory) {
        if (this.isSaving) return;

        this.isSaving = true;
        try {
            // Create the database record first
            const costingData: Partial<CompanyCostingYearlyStats> = {
                company_id: this.companyId,
                financial_year_id: this.selectedYearId,
                cost_type: type,
                category_id: category.id,
                m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0,
                m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0,
                notes: null
            };

            const created = await this.costingStatsService.addCostingStats(costingData).toPromise();

            if (created) {
                // Now create the UI row with the database ID
                const newRow = this.makeRow(type, category.name);
                newRow.costingStatsId = created.id;
                newRow.categoryId = category.id;

                this.rows[type] = [...this.rows[type], newRow];
                this.recalc();

                console.log(`✅ New ${type} cost record created: "${category.name}" (ID: ${created.id})`);
            }
        } catch (error) {
            console.error('Error adding new cost row:', error);
            alert('Failed to add cost category. Please try again.');
        } finally {
            this.isSaving = false;
        }
    }

    /**
     * Update an existing row's category
     */
    async updateRowCategory(row: CostLine, category: CostCategory) {
        if (!row.costingStatsId) {
            console.error('Cannot update category: row has no database ID');
            return;
        }

        // Show saving indicator
        row.isSaving = true;
        
        try {
            // Update database record with new category
            const updateData: Partial<CompanyCostingYearlyStats> = {
                category_id: category.id
            };

            await this.costingStatsService.updateCostingStats(row.costingStatsId, updateData).toPromise();

            // Update UI
            row.category = category.name;
            row.categoryId = category.id;

            console.log(`✅ Category updated to "${category.name}" for row ID: ${row.costingStatsId}`);
        } catch (error) {
            console.error('Error updating category:', error);
            alert('Failed to update category. Please try again.');
        } finally {
            row.isSaving = false;
        }
    }

    // Override existing methods for immediate save
    async onCellChangeWithSave(row: CostLine) {
        this.onCellChange(row);

        // Save immediately if the row has a database ID
        if (row.costingStatsId) {
            await this.saveRow(row);
        }
    }



    async removeRowWithSave(type: CostType, id: number) {
        const row = this.rows[type].find(r => r.id === id);

        // Delete from database if it exists
        if (row?.costingStatsId) {
            try {
                await this.costingStatsService.deleteCostingStats(row.costingStatsId).toPromise();
            } catch (error) {
                console.error('Error deleting row:', error);
            }
        }

        this.removeRow(type, id);
    }

    // Method to refresh data when year changes
    async onYearChange() {
        await this.loadData();
    }



}