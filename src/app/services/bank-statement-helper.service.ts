import { Injectable } from '@angular/core';
import { EditableTableConfig } from '../components/shared';

@Injectable({
  providedIn: 'root'
})
export class BankStatementHelperService {

  /**
   * Get the table configuration for bank statements
   */
  getTableConfig(): EditableTableConfig {
    return {
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
  }

  /**
   * Get month name from month number
   */
  getMonthName(month: number): string {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return monthNames[month - 1] || 'Unknown';
  }

  /**
   * Get available years from financial data
   */
  getAvailableYears(financials: any[]): number[] {
    const years = new Set(financials.map(f => f.year));
    return Array.from(years).sort((a, b) => b - a);
  }

  /**
   * Filter and format data for display
   */
  getFilteredData(financials: any[], selectedYear: string | number): any[] {
    let filtered = [...financials];

    if (selectedYear !== 'all') {
      filtered = filtered.filter(f => f.year === Number(selectedYear));
    }

    // Sort by year (desc) then month (asc)
    filtered.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return a.month - b.month;
    });

    // Add period display for table
    return filtered.map(record => ({
      ...record,
      period_display: selectedYear === 'all'
        ? `${this.getMonthName(record.month)} ${record.year}`
        : this.getMonthName(record.month)
    }));
  }

  /**
   * Create new record template
   */
  createNewRecord(companyId: number): any {
    const now = new Date();
    return {
      id: 0,
      company_id: companyId,
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
  }

  /**
   * Prepare record for update
   */
  prepareRecordForUpdate(row: any, field: string): any {
    const updatedRow = { ...row };

    // Special handling for quarter changes
    if (field === 'quarter') {
      updatedRow.quarter_label = `Q${updatedRow.quarter}`;
    }

    // For turnover, also update turnover_monthly_avg
    if (field === 'turnover') {
      updatedRow.turnover_monthly_avg = updatedRow.turnover;
    }

    return updatedRow;
  }

  /**
   * Get delete confirmation message
   */
  getDeleteConfirmationMessage(record: any): string {
    return `Delete ${this.getMonthName(record.month)} ${record.year} data?`;
  }
}
