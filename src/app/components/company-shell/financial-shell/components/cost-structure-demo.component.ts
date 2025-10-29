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
import { ToastService } from '../../../../services/toast.service';
import { CostCategoryPickerModalComponent } from './cost-category-picker-modal.component';
import { CostSectionComponent } from './cost-section.component';
import { CostKpiComponent } from './cost-kpi.component';
import { CostStructureUtilsService, CostLine, CostType, CostTotals } from './cost-structure-utils.service';

@Component({
    selector: 'app-cost-structure-demo',
    standalone: true,
    imports: [CommonModule, FormsModule, CostCategoryPickerModalComponent, CostSectionComponent, CostKpiComponent],
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

      <!-- KPIs Component -->
      <app-cost-kpi
        [totalRevenue]="totalRevenue"
        [directCosts]="totals.direct"
        [operationalCosts]="totals.operational"
        [isLoading]="isLoading">
      </app-cost-kpi>

      <!-- Cost Sections -->
      <div class="space-y-8">
        <!-- Direct Costs Section -->
        <app-cost-section
          costType="direct"
          [rows]="rows.direct"
          [months]="months"
          [disabled]="isSaving"
          [sectionTotal]="totals.direct"
          (addRow)="openCategoryPicker($event)"
          (rowCellChange)="onCellChangeWithSave($event)"
          (rowEditCategory)="openCategoryPickerForEdit($event.row, $event.type)"
          (rowRemove)="removeRowWithSave($event.type, $event.id)">
        </app-cost-section>

        <!-- Operational Costs Section -->
        <app-cost-section
          costType="operational"
          [rows]="rows.operational"
          [months]="months"
          [disabled]="isSaving"
          [sectionTotal]="totals.operational"
          (addRow)="openCategoryPicker($event)"
          (rowCellChange)="onCellChangeWithSave($event)"
          (rowEditCategory)="openCategoryPickerForEdit($event.row, $event.type)"
          (rowRemove)="removeRowWithSave($event.type, $event.id)">
        </app-cost-section>
      </div>

      <!-- Helper -->
      <p class="mt-4 text-xs text-gray-500">
        💾 Changes are automatically saved to the database.
        📊 Cost categories are loaded from your configured categories.
        📱 On small screens you can horizontally scroll the tables.
        📅 Months displayed follow your financial year calendar ({{ getSelectedFinancialYearName() }}).
      </p>

        <!-- Category Picker Modal -->
      <app-cost-category-picker-modal
        #categoryPickerModal
        [companyId]="companyId"
        (categorySelected)="onCategorySelected($event)"
        (categoryCreated)="onCategoryCreated($event)"
        (categoryManaged)="onCategoryManaged()"
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
  financialYears: FinancialYear[] = [];
  months: string[] = []; // Will be populated based on selected financial year

    // Totals cache
    totals: CostTotals = { direct: 0, operational: 0 };
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

  constructor(
    private costCategoriesService: CostCategoriesService,
    private costingStatsService: CompanyCostingYearlyStatsService,
    private companyFinancialStatsService: CompanyFinancialYearlyStatsService,
    private financialYearService: FinancialYearService,
    private costStructureUtils: CostStructureUtilsService,
    private toastService: ToastService,
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
        return this.costStructureUtils.createCostLine(type, category, monthly);
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
        this.costStructureUtils.updateCostLineTotal(row);
        this.recalc();
    }

    recalc() {
        this.totals = this.costStructureUtils.calculateSectionTotals(this.rows);
    }

    get grandNet(): number {
        // Calculate profit based on actual revenue data - kept for backward compatibility
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

            // Update months based on selected financial year
            this.updateMonthsForSelectedYear();
        } catch (error) {
            console.error('Error loading financial years:', error);
            // Fallback to current year if service fails
            this.selectedYearId = 1;
            // Set default months as fallback
            this.months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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
        const categoryName = this.getCategoryName(stat.category_id ?? null);
        return this.costStructureUtils.convertStatsToRow(stat, categoryName);
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
            const costingData = this.costStructureUtils.convertRowToStats(row, this.companyId, this.selectedYearId);

            // Override category_id in case it was found during conversion
            costingData.category_id = categoryId;

            if (row.costingStatsId) {
                // Update existing record
                const updated = await this.costingStatsService.updateCostingStats(row.costingStatsId, costingData).toPromise();
                if (updated) {
                    console.log(`Updated cost record ID: ${row.costingStatsId}`);
                    // Don't show toast for every cell change - it would be too noisy
                    // this.toastService.success('Data saved');
                }
            } else {
                // Create new record (fallback for orphaned rows)
                const created = await this.costingStatsService.addCostingStats(costingData).toPromise();
                if (created) {
                    row.costingStatsId = created.id;
                    console.log(`Created new cost record ID: ${created.id}`);
                }
            }
        } catch (error: any) {
            console.error('Error saving row:', error);

            // Handle specific duplicate entry error
            if (error?.error?.error?.includes('Duplicate entry') || error?.message?.includes('1062')) {
                this.toastService.error(`Duplicate entry detected. This category is already being used.`);
            } else {
                this.toastService.error('Failed to save data. Please try again.');
            }
        } finally {
            row.isSaving = false;
        }
    }

    findCategoryIdByName(categoryName: string, costType: CostType): number | null {
        const categories = costType === 'direct' ? this.directCostCategories : this.operationalCostCategories;
        const category = categories.find(c => c.name === categoryName);
        return category?.id || null;
    }

    /**
     * Check if a category is already being used for the current company, financial year, and cost type
     */
    isCategoryAlreadyUsed(categoryId: number, costType: CostType): boolean {
        return this.rows[costType].some(row => row.categoryId === categoryId);
    }

    /**
     * Get available categories for a cost type (excluding already used ones)
     */
    getAvailableCategories(costType: CostType): CostCategory[] {
        const allCategories = costType === 'direct' ? this.directCostCategories : this.operationalCostCategories;
        return allCategories.filter(category => !this.isCategoryAlreadyUsed(category.id, costType));
    }

    /**
     * Validate if a category can be added
     */
    validateCategorySelection(category: CostCategory, costType: CostType): { valid: boolean; message?: string } {
        // Check if category already exists for this cost type
        if (this.isCategoryAlreadyUsed(category.id, costType)) {
            return {
                valid: false,
                message: `The category "${category.name}" is already being used for ${costType} costs in this financial year.`
            };
        }

        // Check if category type matches the section type
        if (category.cost_type !== costType) {
            return {
                valid: false,
                message: `The category "${category.name}" is designed for ${category.cost_type} costs, not ${costType} costs.`
            };
        }

        return { valid: true };
    }

    // Category Picker Modal Methods

    /**
     * Open category picker modal for adding new cost type
     */
    openCategoryPicker(costType: CostType) {
        this.rowBeingEdited = null; // Clear any edit state

        // Get list of already used category IDs for this cost type
        const usedCategoryIds = this.rows[costType]
            .map(row => row.categoryId)
            .filter(id => id !== null && id !== undefined) as number[];

        this.categoryPickerModal.open(costType, usedCategoryIds);
    }

    /**
     * Open category picker modal for editing existing row
     */
    openCategoryPickerForEdit(row: CostLine, costType: CostType) {
        this.rowBeingEdited = row; // Track which row is being edited

        // Get list of already used category IDs for this cost type, excluding the current row
        const usedCategoryIds = this.rows[costType]
            .filter(r => r.id !== row.id) // Exclude current row
            .map(r => r.categoryId)
            .filter(id => id !== null && id !== undefined) as number[];

        this.categoryPickerModal.open(costType, usedCategoryIds);
    }

    /**
     * Handle category selection from modal
     */
    onCategorySelected(category: CostCategory) {
        console.log('✅ Category selected in parent component:', category);
        console.log('🔍 Current rowBeingEdited state:', this.rowBeingEdited);

        // Check if we're editing an existing row or adding a new one
        if (this.rowBeingEdited) {
            // Edit mode: update the existing row's category
            console.log('📝 Edit mode: updating existing row category');
            this.updateRowCategory(this.rowBeingEdited, category);
            this.rowBeingEdited = null; // Clear edit state
        } else {
            // Add mode: create a new row with selected category
            console.log('➕ Add mode: creating new row with selected category');
            let targetCostType: CostType;

            // Determine target cost type
            if (category.cost_type === 'direct') {
                targetCostType = 'direct';
            } else if (category.cost_type === 'operational') {
                targetCostType = 'operational';
            } else {
                console.warn('Category has no cost_type, defaulting to direct');
                targetCostType = 'direct';
            }

            console.log(`🎯 Target cost type determined: ${targetCostType}`);

            // Validate the category selection
            const validation = this.validateCategorySelection(category, targetCostType);
            console.log('🔍 Category validation result:', validation);
            
            if (!validation.valid) {
                this.toastService.warning(validation.message || 'Cannot add this category');
                return;
            }

            // Proceed with adding the category
            console.log(`🚀 Proceeding to add row with category: ${category.name} (ID: ${category.id})`);
            this.addRowWithSelectedCategory(targetCostType, category);
        }
    }

    /**
     * Handle category picker modal close
     */
    onCategoryPickerClosed() {
        console.log('Category picker modal closed');
    }

    /**
     * Handle category management (edit/delete) from modal
     */
    onCategoryManaged() {
        console.log('📝 Category was managed (edited/deleted), refreshing data...');
        // Refresh the data to reflect any changes in categories
        this.loadData();
    }

    /**
     * Handle new category creation from modal
     */
    onCategoryCreated(category: CostCategory) {
        console.log('🆕 New category created:', category);
        
        // Add the new category to our local lists immediately
        this.costCategories = [...this.costCategories, category];
        
        if (category.cost_type === 'direct') {
            this.directCostCategories = [...this.directCostCategories, category];
        } else if (category.cost_type === 'operational') {
            this.operationalCostCategories = [...this.operationalCostCategories, category];
        }
        
        console.log('✅ Added new category to local lists');
    }

    /**
     * Add row with pre-selected category
     */
    async addRowWithSelectedCategory(type: CostType, category: CostCategory) {
        if (this.isSaving) return;

        console.log(`🚀 Adding new ${type} row with category:`, category);

        // Double-check validation before proceeding
        const validation = this.validateCategorySelection(category, type);
        if (!validation.valid) {
            console.error('❌ Validation failed:', validation.message);
            this.toastService.warning(validation.message || 'Cannot add this category');
            return;
        }

        this.isSaving = true;
        try {
            // Create the database record first
            const newRow = this.costStructureUtils.createCostLine(type, category.name);
            console.log('📝 Created new cost line object:', newRow);
            
            const costingData = this.costStructureUtils.convertRowToStats(newRow, this.companyId, this.selectedYearId);
            costingData.category_id = category.id;
            console.log('💾 Costing data to save:', costingData);

            const created = await this.costingStatsService.addCostingStats(costingData).toPromise();
            console.log('✅ Database record created:', created);

            if (created) {
                // Now create the UI row with the database ID
                newRow.costingStatsId = created.id;
                newRow.categoryId = category.id;
                console.log('🎯 Final row object with IDs:', newRow);

                this.rows[type] = [...this.rows[type], newRow];
                this.recalc();

                console.log(`✅ New ${type} cost record created: "${category.name}" (ID: ${created.id})`);
                this.toastService.success(`Added "${category.name}" to ${type} costs`);
            }
        } catch (error: any) {
            console.error('❌ Error adding new cost row:', error);

            // Handle specific duplicate entry error
            if (error?.error?.error?.includes('Duplicate entry') || error?.message?.includes('1062')) {
                this.toastService.error(`The category "${category.name}" is already being used for ${type} costs in this financial year.`);
            } else {
                this.toastService.error(`Failed to add "${category.name}". Please try again.`);
            }
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
            this.toastService.error('Cannot update category: invalid row data');
            return;
        }

        // Check if this category is already being used by another row of the same type
        const otherRowsWithSameCategory = this.rows[row.type].filter(r =>
            r.id !== row.id && r.categoryId === category.id
        );

        if (otherRowsWithSameCategory.length > 0) {
            this.toastService.warning(`The category "${category.name}" is already being used for ${row.type} costs in this financial year.`);
            return;
        }

        // Check if category type matches the row type
        if (category.cost_type !== row.type) {
            this.toastService.warning(`The category "${category.name}" is designed for ${category.cost_type} costs, not ${row.type} costs.`);
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
            this.toastService.success(`Updated category to "${category.name}"`);
        } catch (error: any) {
            console.error('Error updating category:', error);

            // Handle specific duplicate entry error
            if (error?.error?.error?.includes('Duplicate entry') || error?.message?.includes('1062')) {
                this.toastService.error(`The category "${category.name}" is already being used for ${row.type} costs in this financial year.`);
            } else {
                this.toastService.error('Failed to update category. Please try again.');
            }
        } finally {
            row.isSaving = false;
        }
    }    // Override existing methods for immediate save
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
                this.toastService.success(`Removed "${row.category}" from ${type} costs`);
            } catch (error) {
                console.error('Error deleting row:', error);
                this.toastService.error(`Failed to remove "${row.category}". Please try again.`);
                return; // Don't remove from UI if database deletion failed
            }
        }

        this.removeRow(type, id);
    }

    // Method to refresh data when year changes
    async onYearChange() {
        this.updateMonthsForSelectedYear();
        await this.loadData();
    }

    /**
     * Update months array based on selected financial year
     */
    private updateMonthsForSelectedYear() {
        const selectedYear = this.financialYears.find(fy => fy.id === this.selectedYearId);
        if (selectedYear) {
            this.months = this.costStructureUtils.generateMonthNames(selectedYear);
            console.log(`📅 Updated months for financial year ${selectedYear.name}:`, this.months);
        } else {
            // Fallback to calendar year if selected year not found
            this.months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            console.warn('⚠️ Selected financial year not found, using calendar year months');
        }
    }

    /**
     * Get the selected financial year name for display
     */
    getSelectedFinancialYearName(): string {
        const selectedYear = this.financialYears.find(fy => fy.id === this.selectedYearId);
        return selectedYear ? selectedYear.name : 'Current Year';
    }



}
