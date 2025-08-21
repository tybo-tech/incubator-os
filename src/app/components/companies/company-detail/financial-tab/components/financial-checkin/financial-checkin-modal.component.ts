import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { INode } from '../../../../../../../models/schema';
import { Company } from '../../../../../../../models/business.models';
import { FinancialCheckIn } from '../../../../../../../models/busines.financial.checkin.models';
import { NodeService } from '../../../../../../../services';
import { ICompany } from '../../../../../../../models/simple.schema';

interface CalculatedMetrics {
  gross_profit: number;
  net_profit: number;
  gp_margin: number;
  np_margin: number;
  net_assets: number;
  working_capital_ratio: number;
}

interface ValidationResult {
  errors: string[];
  warnings: string[];
  isValid: boolean;
}

@Component({
  selector: 'app-financial-checkin-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <!-- Modal Backdrop -->
    <div *ngIf="isVisible" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">

        <!-- Modal Header -->
        <div class="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
          <h2 class="text-xl font-semibold flex items-center">
            <i class="fas fa-chart-line mr-3"></i>
            {{ editMode ? 'Edit' : 'New' }} Financial Check-in
          </h2>
          <button (click)="onClose()" class="text-white hover:text-gray-200 text-xl">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Modal Body -->
        <div class="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <form [formGroup]="checkInForm" (ngSubmit)="onSubmit()">

            <!-- Period Selection -->
            <div class="bg-blue-50 rounded-lg p-4 mb-6">
              <h3 class="text-lg font-medium text-blue-900 mb-4 flex items-center">
                <i class="fas fa-calendar mr-2"></i>
                Period Selection
              </h3>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <!-- Year -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Year <span class="text-red-500">*</span>
                  </label>
                  <select formControlName="year"
                          class="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                          [class]="checkInForm.get('year')?.invalid && checkInForm.get('year')?.touched ? 'border-red-300' : 'border-gray-300'">
                    <option value="">Select year...</option>
                    <option *ngFor="let year of availableYears" [value]="year">{{ year }}</option>
                  </select>
                </div>

                <!-- Month -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Month <span class="text-red-500">*</span>
                  </label>
                  <select formControlName="month"
                          class="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                          [class]="checkInForm.get('month')?.invalid && checkInForm.get('month')?.touched ? 'border-red-300' : 'border-gray-300'">
                    <option value="">Select month...</option>
                    <option *ngFor="let month of months; let i = index" [value]="i + 1">{{ month }}</option>
                  </select>
                </div>

                <!-- Quarter -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Quarter</label>
                  <select formControlName="quarter" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                    <option value="">Auto-suggest</option>
                    <option value="Q1">Q1 (Jan-Mar)</option>
                    <option value="Q2">Q2 (Apr-Jun)</option>
                    <option value="Q3">Q3 (Jul-Sep)</option>
                    <option value="Q4">Q4 (Oct-Dec)</option>
                  </select>
                </div>
              </div>

              <!-- Pre-ignition flag -->
              <div class="mt-4">
                <label class="flex items-center">
                  <input type="checkbox" formControlName="is_pre_ignition" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                  <span class="ml-2 text-sm text-gray-700">Pre-ignition baseline data</span>
                </label>
              </div>
            </div>

            <!-- Revenue & Profitability -->
            <div class="bg-green-50 rounded-lg p-4 mb-6">
              <h3 class="text-lg font-medium text-green-900 mb-4 flex items-center">
                <i class="fas fa-money-bill-wave mr-2"></i>
                Revenue & Profitability
              </h3>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <!-- Input Fields -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Turnover <span class="text-red-500">*</span>
                  </label>
                  <div class="relative">
                    <span class="absolute left-3 top-2 text-gray-500">R</span>
                    <input type="number"
                           formControlName="turnover_monthly_avg"
                           placeholder="0.00"
                           class="w-full pl-8 pr-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                           [class]="checkInForm.get('turnover_monthly_avg')?.invalid && checkInForm.get('turnover_monthly_avg')?.touched ? 'border-red-300' : 'border-gray-300'">
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Cost of Sales</label>
                  <div class="relative">
                    <span class="absolute left-3 top-2 text-gray-500">R</span>
                    <input type="number"
                           formControlName="cost_of_sales"
                           placeholder="0.00"
                           class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Business Expenses</label>
                  <div class="relative">
                    <span class="absolute left-3 top-2 text-gray-500">R</span>
                    <input type="number"
                           formControlName="business_expenses"
                           placeholder="0.00"
                           class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                  </div>
                </div>
              </div>

              <!-- Calculated Fields -->
              <div class="mt-4 pt-4 border-t border-green-200">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="bg-white rounded-md p-3 border">
                    <label class="block text-sm font-medium text-gray-600 mb-1">Gross Profit</label>
                    <div class="text-lg font-semibold text-green-600">
                      R {{ calculatedMetrics.gross_profit | number:'1.2-2' }}
                      <span class="text-sm font-normal">({{ calculatedMetrics.gp_margin | number:'1.1-1' }}%)</span>
                    </div>
                  </div>

                  <div class="bg-white rounded-md p-3 border">
                    <label class="block text-sm font-medium text-gray-600 mb-1">Net Profit</label>
                    <div class="text-lg font-semibold" [class]="calculatedMetrics.net_profit >= 0 ? 'text-green-600' : 'text-red-600'">
                      R {{ calculatedMetrics.net_profit | number:'1.2-2' }}
                      <span class="text-sm font-normal">({{ calculatedMetrics.np_margin | number:'1.1-1' }}%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Cash Flow & Working Capital -->
            <div class="bg-blue-50 rounded-lg p-4 mb-6">
              <h3 class="text-lg font-medium text-blue-900 mb-4 flex items-center">
                <i class="fas fa-university mr-2"></i>
                Cash Flow & Working Capital
              </h3>

              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Cash on Hand</label>
                  <div class="relative">
                    <span class="absolute left-3 top-2 text-gray-500">R</span>
                    <input type="number"
                           formControlName="cash_on_hand"
                           placeholder="0.00"
                           class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Outstanding Debtors</label>
                  <div class="relative">
                    <span class="absolute left-3 top-2 text-gray-500">R</span>
                    <input type="number"
                           formControlName="debtors"
                           placeholder="0.00"
                           class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Outstanding Creditors</label>
                  <div class="relative">
                    <span class="absolute left-3 top-2 text-gray-500">R</span>
                    <input type="number"
                           formControlName="creditors"
                           placeholder="0.00"
                           class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Inventory Value</label>
                  <div class="relative">
                    <span class="absolute left-3 top-2 text-gray-500">R</span>
                    <input type="number"
                           formControlName="inventory_on_hand"
                           placeholder="0.00"
                           class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                  </div>
                </div>
              </div>

              <!-- Working Capital Metrics -->
              <div class="mt-4 pt-4 border-t border-blue-200">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="bg-white rounded-md p-3 border">
                    <label class="block text-sm font-medium text-gray-600 mb-1">Working Capital Ratio</label>
                    <div class="text-lg font-semibold flex items-center">
                      <span [class]="getWorkingCapitalClass()">
                        {{ calculatedMetrics.working_capital_ratio | number:'1.2-2' }}
                      </span>
                      <i class="ml-2" [class]="getWorkingCapitalIcon()"></i>
                    </div>
                  </div>

                  <div class="bg-white rounded-md p-3 border">
                    <label class="block text-sm font-medium text-gray-600 mb-1">Net Assets</label>
                    <div class="text-lg font-semibold text-blue-600">
                      R {{ calculatedMetrics.net_assets | number:'1.2-2' }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Advisor Notes -->
            <div class="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 class="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <i class="fas fa-sticky-note mr-2"></i>
                Advisor Notes
              </h3>

              <textarea formControlName="notes"
                        rows="4"
                        placeholder="Key insights from this session..."
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"></textarea>
            </div>

            <!-- Validation Messages -->
            <div *ngIf="validationResult && (!validationResult.isValid || validationResult.warnings.length > 0)" class="mb-6">
              <!-- Errors -->
              <div *ngIf="validationResult.errors.length > 0" class="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                <h4 class="text-red-800 font-medium mb-2">Errors:</h4>
                <ul class="text-red-700 text-sm space-y-1">
                  <li *ngFor="let error of validationResult.errors" class="flex items-center">
                    <i class="fas fa-exclamation-circle mr-2"></i>
                    {{ error }}
                  </li>
                </ul>
              </div>

              <!-- Warnings -->
              <div *ngIf="validationResult.warnings.length > 0" class="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <h4 class="text-yellow-800 font-medium mb-2">Warnings:</h4>
                <ul class="text-yellow-700 text-sm space-y-1">
                  <li *ngFor="let warning of validationResult.warnings" class="flex items-center">
                    <i class="fas fa-exclamation-triangle mr-2"></i>
                    {{ warning }}
                  </li>
                </ul>
              </div>
            </div>
          </form>
        </div>

        <!-- Modal Footer -->
        <div class="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
          <button type="button"
                  (click)="onClose()"
                  class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
            Cancel
          </button>

          <button type="button"
                  (click)="onSaveDraft()"
                  [disabled]="saving"
                  class="px-4 py-2 text-blue-700 bg-blue-100 border border-blue-300 rounded-md hover:bg-blue-200 disabled:opacity-50">
            <i class="fas fa-save mr-2"></i>
            Save Draft
          </button>

          <button type="submit"
                  (click)="onSubmit()"
                  [disabled]="!validationResult?.isValid || saving"
                  class="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
            <i class="fas fa-check mr-2"></i>
            {{ saving ? 'Saving...' : 'Submit Check-in' }}
          </button>
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
export class FinancialCheckinModalComponent implements OnInit, OnChanges {
  @Input() isVisible = false;
  @Input() company!: ICompany;
  @Input() editMode = false;
  @Input() checkInData?: INode<FinancialCheckIn>;

  @Output() onCloseModal = new EventEmitter<void>();
  @Output() onSaveCheckIn = new EventEmitter<FinancialCheckIn>();

  checkInForm!: FormGroup;
  saving = false;
  calculatedMetrics: CalculatedMetrics = {
    gross_profit: 0,
    net_profit: 0,
    gp_margin: 0,
    np_margin: 0,
    net_assets: 0,
    working_capital_ratio: 0
  };
  validationResult: ValidationResult | null = null;

  // Data for dropdowns
  availableYears: number[] = [];
  months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  constructor(
    private fb: FormBuilder,
    private nodeService: NodeService<FinancialCheckIn>
  ) {
    this.initializeForm();
    this.generateAvailableYears();
  }

  ngOnInit() {
    this.initializeFormIfNeeded();
  }

  ngOnChanges(changes: SimpleChanges) {
    // When checkInData changes, populate the form
    if (changes['checkInData'] && this.checkInData) {
      this.initializeFormIfNeeded();
      this.populateForm(this.checkInData.data);
    }

    // When editMode changes, reset form if switching to create mode
    if (changes['editMode'] && !this.editMode && this.checkInForm) {
      this.checkInForm.reset({
        year: new Date().getFullYear(),
        month: null,
        quarter: null,
        is_pre_ignition: false,
        turnover_monthly_avg: 0,
        cost_of_sales: 0,
        business_expenses: 0,
        cash_on_hand: 0,
        debtors: 0,
        creditors: 0,
        inventory_on_hand: 0,
        notes: ''
      });
    }
  }

  private initializeFormIfNeeded() {
    if (!this.checkInForm) {
      this.initializeForm();
    }
    this.updateCalculationsAndValidation();
  }

  private initializeForm() {
    this.checkInForm = this.fb.group({
      // Period Selection - REQUIRED
      year: [new Date().getFullYear(), Validators.required],
      month: [null, Validators.required],
      quarter: [null],
      is_pre_ignition: [false],

      // Financial Data - Monthly Turnover is REQUIRED
      turnover_monthly_avg: [0, [Validators.required, Validators.min(1)]],
      cost_of_sales: [0, [Validators.min(0)]],
      business_expenses: [0, [Validators.min(0)]],
      cash_on_hand: [0, [Validators.min(0)]],
      debtors: [0, [Validators.min(0)]],
      creditors: [0, [Validators.min(0)]],
      inventory_on_hand: [0, [Validators.min(0)]],
      notes: ['']
    });

    // Subscribe to value changes for real-time calculations
    this.checkInForm.valueChanges.subscribe(() => {
      this.updateCalculationsAndValidation();
      this.suggestQuarter();
    });
  }

  private populateForm(data: FinancialCheckIn) {
    this.checkInForm.patchValue(data);
  }

  private generateAvailableYears() {
    const currentYear = new Date().getFullYear();
    for (let year = 2020; year <= currentYear + 5; year++) {
      this.availableYears.push(year);
    }
  }

  private suggestQuarter() {
    const month = this.checkInForm.get('month')?.value;
    const quarter = this.checkInForm.get('quarter')?.value;

    if (month && !quarter) {
      let suggestedQuarter = '';
      if (month >= 1 && month <= 3) suggestedQuarter = 'Q1';
      else if (month >= 4 && month <= 6) suggestedQuarter = 'Q2';
      else if (month >= 7 && month <= 9) suggestedQuarter = 'Q3';
      else suggestedQuarter = 'Q4';

      this.checkInForm.patchValue({ quarter: suggestedQuarter }, { emitEvent: false });
    }
  }

  private updateCalculationsAndValidation() {
    const values = this.checkInForm.value;
    this.calculatedMetrics = this.calculateMetrics(values);
    this.validationResult = this.validateBusinessLogic(values);
  }

  private calculateMetrics(data: any): CalculatedMetrics {
    const turnover = data.turnover_monthly_avg || 0;
    const costOfSales = data.cost_of_sales || 0;
    const expenses = data.business_expenses || 0;
    const cash = data.cash_on_hand || 0;
    const debtors = data.debtors || 0;
    const creditors = data.creditors || 0;
    const inventory = data.inventory_on_hand || 0;

    // Real-time calculations
    const gross_profit = turnover - costOfSales;
    const net_profit = gross_profit - expenses;
    const gp_margin = turnover > 0 ? (gross_profit / turnover) * 100 : 0;
    const np_margin = turnover > 0 ? (net_profit / turnover) * 100 : 0;

    // Working capital calculation
    const current_assets = cash + debtors + inventory;
    const current_liabilities = creditors;
    const working_capital_ratio = current_liabilities > 0 ?
      current_assets / current_liabilities : 0;

    return {
      gross_profit,
      net_profit,
      gp_margin,
      np_margin,
      net_assets: current_assets - current_liabilities,
      working_capital_ratio
    };
  }

  private validateBusinessLogic(data: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Form validation errors
    if (this.checkInForm.get('year')?.hasError('required')) {
      errors.push("Year is required");
    }

    if (this.checkInForm.get('month')?.hasError('required')) {
      errors.push("Month is required");
    }

    if (this.checkInForm.get('turnover_monthly_avg')?.hasError('required')) {
      errors.push("Monthly turnover is required");
    }

    if (this.checkInForm.get('turnover_monthly_avg')?.hasError('min')) {
      errors.push("Monthly turnover must be greater than 0");
    }

    // Business rules
    if (data.cost_of_sales > data.turnover_monthly_avg && data.turnover_monthly_avg > 0) {
      errors.push("Cost of sales cannot exceed turnover");
    }

    if (this.calculatedMetrics.working_capital_ratio < 1.0 && this.calculatedMetrics.working_capital_ratio > 0) {
      warnings.push("Low working capital ratio - monitor cash flow");
    }

    if (this.calculatedMetrics.gp_margin < 20 && data.turnover_monthly_avg > 0) {
      warnings.push("Low gross profit margin - review pricing strategy");
    }

    if (this.calculatedMetrics.net_profit < 0 && data.turnover_monthly_avg > 0) {
      warnings.push("Business is operating at a loss");
    }

    return { errors, warnings, isValid: errors.length === 0 };
  }

  getWorkingCapitalClass(): string {
    const ratio = this.calculatedMetrics.working_capital_ratio;
    if (ratio >= 1.5) return 'text-green-600';
    if (ratio >= 1.0) return 'text-yellow-600';
    return 'text-red-600';
  }

  getWorkingCapitalIcon(): string {
    const ratio = this.calculatedMetrics.working_capital_ratio;
    if (ratio >= 1.5) return 'fas fa-check-circle text-green-600';
    if (ratio >= 1.0) return 'fas fa-exclamation-triangle text-yellow-600';
    return 'fas fa-times-circle text-red-600';
  }

  onSaveDraft() {
    if (this.saving) return;

    this.saving = true;
    const checkInData = this.buildCheckInData();

    // TODO: Implement draft saving logic
    console.log('Saving draft:', checkInData);

    setTimeout(() => {
      this.saving = false;
      // You could show a toast notification here
    }, 1000);
  }

  onSubmit() {
    if (!this.validationResult?.isValid || this.saving) return;

    // Mark all fields as touched to show validation errors
    this.checkInForm.markAllAsTouched();

    // Double-check form validity
    if (this.checkInForm.invalid) {
      this.updateCalculationsAndValidation();
      return;
    }

    this.saving = true;
    const checkInData = this.buildCheckInData();

    this.onSaveCheckIn.emit(checkInData);
  }

  onClose() {
    this.saving = false; // Reset saving state when closing
    this.onCloseModal.emit();
  }

  // Public method to reset saving state (can be called by parent)
  public resetSavingState() {
    this.saving = false;
  }

  private buildCheckInData(): FinancialCheckIn {
    const formValues = this.checkInForm.value;

    return {
      ...formValues,
      // Include calculated values
      gross_profit: this.calculatedMetrics.gross_profit,
      net_profit: this.calculatedMetrics.net_profit,
      gp_margin: this.calculatedMetrics.gp_margin,
      np_margin: this.calculatedMetrics.np_margin,
      net_assets: this.calculatedMetrics.net_assets,
      working_capital_ratio: this.calculatedMetrics.working_capital_ratio
    };
  }
}
