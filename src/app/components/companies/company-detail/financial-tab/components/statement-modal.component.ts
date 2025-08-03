import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BankStatement } from '../../../../../../models/business.models';
import { INode } from '../../../../../../models/schema';

@Component({
  selector: 'app-statement-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div *ngIf="showModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <!-- Modal Header -->
          <div class="flex justify-between items-center mb-6">
            <div class="flex items-center">
              <i class="fas fa-file-invoice-dollar text-blue-600 mr-2"></i>
              <h3 class="text-lg font-medium text-gray-900">
                {{ isEditMode ? 'Edit Bank Statement' : 'Add New Bank Statement' }}
              </h3>
            </div>
            <button (click)="closeModal()" class="text-gray-400 hover:text-gray-600">
              <i class="fas fa-times text-xl"></i>
            </button>
          </div>

          <!-- Modal Form -->
          <form [formGroup]="statementForm" (ngSubmit)="saveStatement()" class="space-y-6">

            <!-- Period Information -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  <i class="fas fa-calendar-alt mr-1"></i>Year
                </label>
                <input type="number"
                       formControlName="year"
                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                       placeholder="2024">
                <div *ngIf="getFieldError('year')" class="text-red-500 text-xs mt-1">
                  {{ getFieldError('year') }}
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  <i class="fas fa-calendar mr-1"></i>Month
                </label>
                <select formControlName="month"
                        (change)="onMonthChange()"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">Select Month</option>
                  <option *ngFor="let month of getMonthOptions()" [value]="month.value">
                    {{ month.label }}
                  </option>
                </select>
                <div *ngIf="getFieldError('month')" class="text-red-500 text-xs mt-1">
                  {{ getFieldError('month') }}
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  <i class="fas fa-calendar-quarter mr-1"></i>Quarter
                </label>
                <select formControlName="quarter"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">Select Quarter</option>
                  <option *ngFor="let quarter of getQuarterOptions()" [value]="quarter.value">
                    {{ quarter.label }}
                  </option>
                </select>
                <div *ngIf="getFieldError('quarter')" class="text-red-500 text-xs mt-1">
                  {{ getFieldError('quarter') }}
                </div>
              </div>
            </div>

            <!-- Financial Information -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  <i class="fas fa-play text-blue-500 mr-1"></i>Opening Balance (ZAR)
                </label>
                <input type="number"
                       step="0.01"
                       formControlName="opening_balance"
                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                       placeholder="0.00">
                <div *ngIf="getFieldError('opening_balance')" class="text-red-500 text-xs mt-1">
                  {{ getFieldError('opening_balance') }}
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  <i class="fas fa-stop text-red-500 mr-1"></i>Closing Balance (ZAR)
                </label>
                <input type="number"
                       step="0.01"
                       formControlName="closing_balance"
                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                       placeholder="0.00">
                <div *ngIf="getFieldError('closing_balance')" class="text-red-500 text-xs mt-1">
                  {{ getFieldError('closing_balance') }}
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  <i class="fas fa-arrow-up text-green-500 mr-1"></i>Total Income (ZAR)
                </label>
                <input type="number"
                       step="0.01"
                       formControlName="total_income"
                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                       placeholder="0.00">
                <div *ngIf="getFieldError('total_income')" class="text-red-500 text-xs mt-1">
                  {{ getFieldError('total_income') }}
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  <i class="fas fa-arrow-down text-red-500 mr-1"></i>Total Expenses (ZAR)
                </label>
                <input type="number"
                       step="0.01"
                       formControlName="total_expense"
                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                       placeholder="0.00">
                <div *ngIf="getFieldError('total_expense')" class="text-red-500 text-xs mt-1">
                  {{ getFieldError('total_expense') }}
                </div>
              </div>
            </div>

            <!-- Account Name -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                <i class="fas fa-university mr-1"></i>Account Name (Optional)
              </label>
              <input type="text"
                     formControlName="account_name"
                     class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                     placeholder="Business Account">
              <div *ngIf="getFieldError('account_name')" class="text-red-500 text-xs mt-1">
                {{ getFieldError('account_name') }}
              </div>
            </div>

            <!-- Modal Footer -->
            <div class="flex justify-end space-x-3 pt-4 border-t">
              <button type="button"
                      (click)="closeModal()"
                      class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500">
                <i class="fas fa-times mr-1"></i>Cancel
              </button>
              <button type="submit"
                      [disabled]="saving || statementForm.invalid"
                      class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
                <span *ngIf="saving" class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                <i *ngIf="!saving" class="fas fa-save mr-1"></i>
                {{ isEditMode ? 'Update Statement' : 'Create Statement' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class StatementModalComponent implements OnInit, OnChanges {
  @Input() showModal = false;
  @Input() isEditMode = false;
  @Input() editingStatement: INode<BankStatement> | null = null;
  @Input() saving = false;
  @Output() closeModalEvent = new EventEmitter<void>();
  @Output() saveStatementEvent = new EventEmitter<any>();

  statementForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.statementForm = this.createForm();
  }

  ngOnInit() {
    this.statementForm = this.createForm();
  }

  ngOnChanges() {
    if (this.editingStatement && this.isEditMode) {
      this.statementForm.patchValue({
        year: this.editingStatement.data.year,
        month: this.editingStatement.data.month,
        quarter: this.editingStatement.data.quarter,
        opening_balance: this.editingStatement.data.opening_balance,
        closing_balance: this.editingStatement.data.closing_balance,
        total_income: this.editingStatement.data.total_income,
        total_expense: this.editingStatement.data.total_expense,
        account_name: this.editingStatement.data.account_name
      });
    } else if (!this.isEditMode) {
      this.statementForm = this.createForm();
      this.setQuarterFromMonth();
    }
  }

  createForm(): FormGroup {
    return this.fb.group({
      year: [new Date().getFullYear(), [Validators.required, Validators.min(2000), Validators.max(2100)]],
      month: [new Date().getMonth() + 1, [Validators.required, Validators.min(1), Validators.max(12)]],
      quarter: ['', Validators.required],
      opening_balance: [0, [Validators.required, Validators.min(0)]],
      closing_balance: [0, [Validators.required, Validators.min(0)]],
      total_income: [0, [Validators.required, Validators.min(0)]],
      total_expense: [0, [Validators.required, Validators.min(0)]],
      account_name: ['', [Validators.maxLength(100)]]
    });
  }

  onMonthChange() {
    this.setQuarterFromMonth();
  }

  setQuarterFromMonth() {
    const month = this.statementForm.get('month')?.value;
    if (month) {
      let quarter = '';
      if (month >= 1 && month <= 3) quarter = 'Q1';
      else if (month >= 4 && month <= 6) quarter = 'Q2';
      else if (month >= 7 && month <= 9) quarter = 'Q3';
      else if (month >= 10 && month <= 12) quarter = 'Q4';

      this.statementForm.patchValue({ quarter });
    }
  }

  getFieldError(fieldName: string): string {
    const field = this.statementForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['min']) return `${fieldName} must be greater than ${field.errors['min'].min}`;
      if (field.errors['max']) return `${fieldName} must be less than ${field.errors['max'].max}`;
      if (field.errors['maxlength']) return `${fieldName} is too long`;
    }
    return '';
  }

  getQuarterOptions(): { value: string, label: string }[] {
    return [
      { value: 'Q1', label: 'Q1 (Jan-Mar)' },
      { value: 'Q2', label: 'Q2 (Apr-Jun)' },
      { value: 'Q3', label: 'Q3 (Jul-Sep)' },
      { value: 'Q4', label: 'Q4 (Oct-Dec)' }
    ];
  }

  getMonthOptions(): { value: number, label: string }[] {
    return [
      { value: 1, label: 'January' },
      { value: 2, label: 'February' },
      { value: 3, label: 'March' },
      { value: 4, label: 'April' },
      { value: 5, label: 'May' },
      { value: 6, label: 'June' },
      { value: 7, label: 'July' },
      { value: 8, label: 'August' },
      { value: 9, label: 'September' },
      { value: 10, label: 'October' },
      { value: 11, label: 'November' },
      { value: 12, label: 'December' }
    ];
  }

  closeModal() {
    this.closeModalEvent.emit();
  }

  saveStatement() {
    if (this.statementForm.valid) {
      this.saveStatementEvent.emit(this.statementForm.value);
    } else {
      this.markFormGroupTouched();
    }
  }

  markFormGroupTouched() {
    Object.keys(this.statementForm.controls).forEach(key => {
      const control = this.statementForm.get(key);
      control?.markAsTouched();
    });
  }
}
