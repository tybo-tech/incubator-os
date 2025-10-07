import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  CompanyFinancialsService,
  ICompanyFinancials,
} from '../../../../../services/company-financials.service';
import { CompanyService } from '../../../../../services/company.service';
import { ICompany } from '../../../../../models/simple.schema';
import {
  EditableTableComponent,
  EditableTableConfig,
  EditableTableAction,
} from '../../../shared';
import { BankStatementHelperService } from '../../../../../app/services/bank-statement-helper.service';
import { BankStatementSummaryComponent } from './bank-statement-summary.component';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-bank-statements',
  standalone: true,
  imports: [CommonModule, FormsModule, EditableTableComponent, BankStatementSummaryComponent],
  template: `
    <div class="space-y-6">
      <!-- Page Header -->
      <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <i class="fas fa-university text-blue-600 text-2xl mr-3"></i>
            <div>
              <h2 class="text-xl font-bold text-gray-900">Bank Statements</h2>
              <p class="text-gray-600">
                Monthly turnover tracking and analysis
              </p>
            </div>
          </div>

          <!-- Company Info -->
          <div *ngIf="company" class="text-right">
            <h3 class="text-lg font-semibold text-gray-900">
              {{ company.name }}
            </h3>
            @if(company.email_address){
            <p class="text-sm text-gray-500">ID: {{ company.email_address }}</p>

            }
          </div>
        </div>

        <!-- Year Filter -->
        <div class="mt-4 flex items-center gap-4">
          <label class="text-sm font-medium text-gray-700">Year:</label>
          <select
            [(ngModel)]="selectedYear"
            (change)="onYearChange()"
            class="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Years</option>
            <option *ngFor="let year of availableYears" [value]="year">
              {{ year }}
            </option>
          </select>
        </div>
      </div>

      <!-- Financial Summary -->
      <app-bank-statement-summary
        [company]="company"
        [financials]="financials"
        [selectedYear]="selectedYear">
      </app-bank-statement-summary>

      <!-- Editable Table -->
      <app-editable-table
        [data]="filteredData"
        [config]="tableConfig"
        [title]="'Monthly Turnover Records'"
        [subtitle]="
          selectedYear === 'all' ? 'All years' : 'Year ' + selectedYear
        "
        [emptyStateIcon]="'fas fa-university'"
        [emptyStateTitle]="
          'No Bank Statement Data' +
          (selectedYear === 'all' ? '' : ' for ' + selectedYear)
        "
        [emptyStateMessage]="
          'Start by adding your first monthly turnover record.'
        "
        [emptyStateButtonText]="'Add Monthly Turnover'"
        (cellEdit)="onCellEdit($event)"
        (action)="onTableAction($event)"
      >
      </app-editable-table>
    </div>
  `,
})
export class BankStatementsComponent implements OnInit {
  private readonly financialsService = inject(CompanyFinancialsService);
  private readonly companyService = inject(CompanyService);
  private readonly route = inject(ActivatedRoute);
  private readonly helper = inject(BankStatementHelperService);

  company: ICompany | null = null;
  financials: ICompanyFinancials[] = [];
  selectedYear: string | number = 'all';
  tableConfig: EditableTableConfig;

  constructor() {
    this.tableConfig = this.helper.getTableConfig();
  }

  ngOnInit() {
    this.loadCompany();
  }

  get availableYears(): number[] {
    return this.helper.getAvailableYears(this.financials);
  }

  get filteredData(): any[] {
    return this.helper.getFilteredData(this.financials, this.selectedYear);
  }

  async loadCompany() {
    const companyId = this.route.parent?.parent?.snapshot.params['id'];
    if (companyId) {
      try {
        const company = await firstValueFrom(
          this.companyService.getCompanyById(Number(companyId))
        );
        this.company = company || null;
        if (this.company) {
          await this.loadFinancials();
        }
      } catch (error) {
        console.error('Error loading company:', error);
      }
    }
  }

  async loadFinancials() {
    if (!this.company?.id) return;

    this.tableConfig.loading = true;
    try {
      const data = await firstValueFrom(
        this.financialsService.listAllCompanyFinancials(this.company.id)
      );
      this.financials = data || [];
    } catch (error) {
      console.error('Error loading financials:', error);
    } finally {
      this.tableConfig.loading = false;
    }
  }

  onYearChange() {
    // Data will be filtered automatically by filteredData getter
  }

  async onCellEdit(event: { row: any; field: string; index: number; value: any }) {
    const { row, field } = event;

    if (row.id && row.id > 0) {
      try {
        const updatedRow = this.helper.prepareRecordForUpdate(row, field);
        await firstValueFrom(this.financialsService.updateCompanyFinancials(updatedRow.id, updatedRow));
      } catch (error) {
        console.error('Error updating record:', error);

        // Check for specific error types
        if (error && typeof error === 'object' && 'error' in error) {
          const errorMessage = (error as any).error;
          if (errorMessage && errorMessage.includes('Duplicate entry')) {
            alert('This change would create a duplicate record. Please use a different date.');
          } else {
            alert(`Failed to save changes: ${errorMessage}`);
          }
        } else {
          alert('Failed to save changes. Please try again.');
        }

        // Reload data to revert any local changes
        this.loadFinancials();
      }
    }
  }

  async onTableAction(action: EditableTableAction) {
    switch (action.type) {
      case 'add':
        await this.addNewRecord();
        break;

      case 'delete':
        if (action.data && action.data.id > 0) {
          await this.deleteRecord(action.data);
        }
        break;

      case 'export':
        this.exportData();
        break;
    }
  }

  async addNewRecord() {
    if (!this.company) return;

    const newRecord = this.helper.createNewRecord(this.company.id, this.financials);
    try {
      const savedRecord = await firstValueFrom(this.financialsService.addCompanyFinancials(newRecord));
      if (savedRecord) {
        this.loadFinancials();
        if (this.selectedYear !== newRecord.year && this.selectedYear !== 'all') {
          this.selectedYear = newRecord.year;
        }
      }
    } catch (error) {
      console.error('Error creating new record:', error);

      // Check if it's a duplicate error
      if (error && typeof error === 'object' && 'error' in error) {
        const errorMessage = (error as any).error;
        if (errorMessage && errorMessage.includes('Duplicate entry')) {
          alert('A record for this period already exists. Please select a different month/year.');
        } else {
          alert(`Failed to create new record: ${errorMessage}`);
        }
      } else {
        alert('Failed to create new record. Please try again.');
      }
    }
  }

  async deleteRecord(record: ICompanyFinancials) {
    const confirmMessage = this.helper.getDeleteConfirmationMessage(record);
    if (confirm(confirmMessage)) {
      try {
        await firstValueFrom(this.financialsService.deleteCompanyFinancials(record.id));
        this.loadFinancials();
      } catch (error) {
        console.error('Error deleting record:', error);
        alert('Failed to delete record. Please try again.');
      }
    }
  }

  exportData() {
    alert('Export functionality coming soon!');
  }
}
