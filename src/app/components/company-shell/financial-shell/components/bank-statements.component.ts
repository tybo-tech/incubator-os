import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CompanyFinancialsService, ICompanyFinancials } from '../../../../../services/company-financials.service';
import { CompanyService } from '../../../../../services/company.service';
import { ICompany } from '../../../../../models/simple.schema';
import { EditableTableComponent, EditableTableColumn, EditableTableConfig, EditableTableAction } from '../../../shared';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-bank-statements',
  standalone: true,
  imports: [CommonModule, FormsModule, EditableTableComponent],
  template: `
    <div class="space-y-6">
      <!-- Page Header -->
      <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <i class="fas fa-university text-blue-600 text-2xl mr-3"></i>
            <div>
              <h2 class="text-xl font-bold text-gray-900">Bank Statements</h2>
              <p class="text-gray-600">Monthly turnover tracking and analysis</p>
            </div>
          </div>

          <!-- Company Info -->
          <div *ngIf="company" class="text-right">
            <h3 class="text-lg font-semibold text-gray-900">{{ company.name }}</h3>
            <p class="text-sm text-gray-500">ID: {{ company.id }}</p>
          </div>
        </div>

        <!-- Year Filter -->
        <div class="mt-4 flex items-center gap-4">
          <label class="text-sm font-medium text-gray-700">Year:</label>
          <select
            [(ngModel)]="selectedYear"
            (change)="onYearChange()"
            class="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="all">All Years</option>
            <option *ngFor="let year of availableYears" [value]="year">{{ year }}</option>
          </select>
        </div>
      </div>

      <!-- Editable Table -->
      <app-editable-table
        [data]="filteredData"
        [config]="tableConfig"
        [title]="'Monthly Turnover Records'"
        [subtitle]="selectedYear === 'all' ? 'All years' : 'Year ' + selectedYear"
        [emptyStateIcon]="'fas fa-university'"
        [emptyStateTitle]="'No Bank Statement Data' + (selectedYear === 'all' ? '' : ' for ' + selectedYear)"
        [emptyStateMessage]="'Start by adding your first monthly turnover record.'"
        [emptyStateButtonText]="'Add Monthly Turnover'"
        (cellEdit)="onCellEdit($event)"
        (action)="onTableAction($event)">
      </app-editable-table>
    </div>
  `,
})
export class BankStatementsComponent implements OnInit {
  private readonly financialsService = inject(CompanyFinancialsService);
  private readonly companyService = inject(CompanyService);
  private readonly route = inject(ActivatedRoute);

  company: ICompany | null = null;
  financials: ICompanyFinancials[] = [];
  selectedYear: string | number = 'all';
  loading = false;

  tableConfig: EditableTableConfig = {
    columns: [
      {
        key: 'period_display',
        label: 'Period',
        type: 'readonly',
        editable: false,
        width: '200px'
      },
      {
        key: 'quarter',
        label: 'Quarter',
        type: 'select',
        editable: true,
        options: [
          { value: 1, label: 'Q1' },
          { value: 2, label: 'Q2' },
          { value: 3, label: 'Q3' },
          { value: 4, label: 'Q4' }
        ],
        width: '120px'
      },
      {
        key: 'turnover',
        label: 'Turnover',
        type: 'currency',
        editable: true,
        calculateTotal: true,
        precision: 0,
        min: 0,
        placeholder: '0'
      }
    ],
    enableAdd: true,
    enableDelete: true,
    enableExport: true,
    showTotals: true,
    striped: true,
    loading: false
  };

  ngOnInit() {
    this.loadCompany();
    // loadFinancials() will be called from loadCompany() after company is loaded
  }

  get availableYears(): number[] {
    const years = new Set(this.financials.map(f => f.year));
    const yearArray = Array.from(years).sort((a, b) => b - a);
    return yearArray;
  }

  get filteredData(): any[] {
    let filtered = [...this.financials];

    if (this.selectedYear !== 'all') {
      filtered = filtered.filter(f => f.year === Number(this.selectedYear));
    }

    // Sort by year (desc) then month (asc)
    filtered.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return a.month - b.month;
    });

    // Add period display for table
    return filtered.map(record => ({
      ...record,
      period_display: this.selectedYear === 'all'
        ? `${this.getMonthName(record.month)} ${record.year}`
        : this.getMonthName(record.month)
    }));
  }

  async loadCompany() {
    const companyId = this.route.parent?.parent?.snapshot.params['id'];
    console.log('Loading company with ID:', companyId);

    if (companyId) {
      try {
        const company = await firstValueFrom(this.companyService.getCompanyById(Number(companyId)));
        this.company = company || null;
        console.log('Company loaded:', this.company);

        // Load financials after company is loaded
        if (this.company) {
          await this.loadFinancials();
        }
      } catch (error) {
        console.error('Error loading company:', error);
      }
    }
  }

  async loadFinancials() {
    if (!this.company?.id) {
      console.log('No company ID available for loading financials');
      return;
    }

    console.log('Loading financials for company ID:', this.company.id);
    this.tableConfig.loading = true;

    try {
      const data = await firstValueFrom(this.financialsService.listAllCompanyFinancials(this.company.id));
      this.financials = data || [];
      console.log('Financials loaded:', this.financials.length, 'records');
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
        // Special handling for quarter changes
        if (field === 'quarter') {
          row.quarter_label = `Q${row.quarter}`;
        }

        // For turnover, also update turnover_monthly_avg
        if (field === 'turnover') {
          row.turnover_monthly_avg = row.turnover;
        }

        await firstValueFrom(this.financialsService.updateCompanyFinancials(row.id, row));
      } catch (error) {
        console.error('Error updating record:', error);
        alert('Failed to save changes. Please try again.');
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
    // Create new record with current date defaults
    const now = new Date();
    const newRecord: ICompanyFinancials = {
      id: 0,
      company_id: this.company!.id,
      period_date: `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-01`,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      quarter: Math.ceil((now.getMonth() + 1) / 3),
      quarter_label: `Q${Math.ceil((now.getMonth() + 1) / 3)}`,
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
    };

    try {
      const savedRecord = await firstValueFrom(this.financialsService.addCompanyFinancials(newRecord));
      if (savedRecord) {
        this.loadFinancials();

        // Switch to the year of the new record if not already viewing it
        if (this.selectedYear !== newRecord.year && this.selectedYear !== 'all') {
          this.selectedYear = newRecord.year;
        }
      }
    } catch (error) {
      console.error('Error creating new record:', error);
      alert('Failed to create new record. Please try again.');
    }
  }

  async deleteRecord(record: ICompanyFinancials) {
    if (confirm(`Delete ${this.getMonthName(record.month)} ${record.year} data?`)) {
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
    // TODO: Implement export functionality
    console.log('Export functionality to be implemented');
    alert('Export functionality coming soon!');
  }

  getMonthName(month: number): string {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return monthNames[month - 1] || 'Unknown';
  }
}
