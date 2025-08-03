import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BankStatement } from '../../../../../../models/business.models';
import { INode } from '../../../../../../models/schema';

@Component({
  selector: 'app-statements-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white border rounded-lg overflow-hidden">
      <div class="bg-gray-50 px-4 py-3 border-b">
        <div class="flex items-center">
          <i class="fas fa-table text-blue-600 mr-2"></i>
          <h5 class="font-medium text-gray-900">Financial Statements by Quarter and Month</h5>
        </div>
      </div>

      <!-- Year Groups -->
      <div *ngFor="let year of getOrderedYears()" class="border-b last:border-b-0">
        <div class="bg-blue-50 px-4 py-3 border-b">
          <div class="flex items-center">
            <i class="fas fa-calendar-alt text-blue-700 mr-2"></i>
            <h6 class="font-semibold text-blue-900">{{ year }}</h6>
          </div>
        </div>

        <!-- Quarter Groups within Year -->
        <div *ngFor="let quarter of getOrderedQuarters(year)" class="border-b last:border-b-0">
          <div class="bg-gray-100 px-6 py-2 border-b">
            <div class="flex items-center">
              <i class="fas fa-calendar-quarter text-gray-700 mr-2"></i>
              <h6 class="font-medium text-gray-800">{{ quarter }} ({{ getQuarterName(quarter) }})</h6>
            </div>
          </div>

          <!-- Month statements within Quarter -->
          <div class="overflow-x-auto">
            <table class="min-w-full">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <i class="fas fa-calendar mr-1"></i>Month
                  </th>
                  <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <i class="fas fa-play mr-1"></i>Opening Balance
                  </th>
                  <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <i class="fas fa-arrow-up mr-1"></i>Income
                  </th>
                  <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <i class="fas fa-arrow-down mr-1"></i>Expenses
                  </th>
                  <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <i class="fas fa-stop mr-1"></i>Closing Balance
                  </th>
                  <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <i class="fas fa-balance-scale mr-1"></i>Net
                  </th>
                  <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <i class="fas fa-cog mr-1"></i>Actions
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr *ngFor="let statement of getStatementsForQuarter(year, quarter)" class="hover:bg-gray-50">
                  <td class="px-4 py-2 text-sm font-medium text-gray-900">
                    {{ getMonthName(statement.data.month) }}
                  </td>
                  <td class="px-4 py-2 text-sm text-right text-gray-900">
                    {{ formatCurrency(statement.data.opening_balance || 0) }}
                  </td>
                  <td class="px-4 py-2 text-sm text-right text-green-600 font-medium">
                    {{ formatCurrency(statement.data.total_income || 0) }}
                  </td>
                  <td class="px-4 py-2 text-sm text-right text-red-600 font-medium">
                    {{ formatCurrency(statement.data.total_expense || 0) }}
                  </td>
                  <td class="px-4 py-2 text-sm text-right text-gray-900 font-medium">
                    {{ formatCurrency(statement.data.closing_balance || 0) }}
                  </td>
                  <td class="px-4 py-2 text-sm text-right font-medium"
                      [class.text-green-600]="(statement.data.total_income || 0) - (statement.data.total_expense || 0) > 0"
                      [class.text-red-600]="(statement.data.total_income || 0) - (statement.data.total_expense || 0) < 0"
                      [class.text-gray-600]="(statement.data.total_income || 0) - (statement.data.total_expense || 0) === 0">
                    {{ formatCurrency((statement.data.total_income || 0) - (statement.data.total_expense || 0)) }}
                  </td>
                  <td class="px-4 py-2 text-sm text-right">
                    <div class="flex justify-end space-x-2">
                      <button (click)="editStatement.emit(statement)"
                              class="text-blue-600 hover:text-blue-900 text-xs">
                        <i class="fas fa-edit mr-1"></i>Edit
                      </button>
                      <button (click)="deleteStatement.emit(statement)"
                              class="text-red-600 hover:text-red-900 text-xs">
                        <i class="fas fa-trash mr-1"></i>Delete
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Quarter Summary Row -->
          <div class="bg-gray-50 px-4 py-2 border-t">
            <div class="flex justify-between text-sm font-medium text-gray-700">
              <span>
                <i class="fas fa-calculator mr-1"></i>
                {{ quarter }} Total:
              </span>
              <div class="flex space-x-6">
                <span class="text-green-600">
                  <i class="fas fa-arrow-up mr-1"></i>
                  Income: {{ formatCurrency(getQuarterTotal(quarter, 'total_income')) }}
                </span>
                <span class="text-red-600">
                  <i class="fas fa-arrow-down mr-1"></i>
                  Expenses: {{ formatCurrency(getQuarterTotal(quarter, 'total_expense')) }}
                </span>
                <span class="text-gray-800">
                  <i class="fas fa-balance-scale mr-1"></i>
                  Net: {{ formatCurrency(getQuarterTotal(quarter, 'total_income') - getQuarterTotal(quarter, 'total_expense')) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class StatementsTableComponent {
  @Input() bankStatements: INode<BankStatement>[] = [];
  @Output() editStatement = new EventEmitter<INode<BankStatement>>();
  @Output() deleteStatement = new EventEmitter<INode<BankStatement>>();

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  getMonthName(month: number): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1] || '';
  }

  getGroupedStatements(): { [year: number]: { [quarter: string]: INode<BankStatement>[] } } {
    const grouped: { [year: number]: { [quarter: string]: INode<BankStatement>[] } } = {};

    this.bankStatements.forEach(statement => {
      const year = statement.data.year;
      const quarter = statement.data.quarter;

      if (!quarter) return; // Skip if quarter is undefined

      if (!grouped[year]) {
        grouped[year] = {};
      }

      if (!grouped[year][quarter]) {
        grouped[year][quarter] = [];
      }

      grouped[year][quarter].push(statement);
    });

    // Sort statements within each quarter by month (descending)
    Object.keys(grouped).forEach(yearStr => {
      const year = +yearStr;
      Object.keys(grouped[year]).forEach(quarter => {
        grouped[year][quarter].sort((a, b) => b.data.month - a.data.month);
      });
    });

    return grouped;
  }

  getOrderedYears(): number[] {
    return Object.keys(this.getGroupedStatements())
      .map(year => +year)
      .sort((a, b) => b - a);
  }

  getOrderedQuarters(year: number): string[] {
    const groupedStatements = this.getGroupedStatements();
    if (!groupedStatements[year]) return [];

    const quarters = Object.keys(groupedStatements[year]);
    return quarters.sort((a, b) => {
      const quarterOrder = { 'Q4': 4, 'Q3': 3, 'Q2': 2, 'Q1': 1 };
      const aOrder = quarterOrder[a as keyof typeof quarterOrder] || 0;
      const bOrder = quarterOrder[b as keyof typeof quarterOrder] || 0;
      return bOrder - aOrder;
    });
  }

  getStatementsForQuarter(year: number, quarter: string): INode<BankStatement>[] {
    const groupedStatements = this.getGroupedStatements();
    return groupedStatements[year]?.[quarter] || [];
  }

  getQuarterName(quarter: string): string {
    const quarterNames = {
      'Q1': 'Jan-Mar',
      'Q2': 'Apr-Jun',
      'Q3': 'Jul-Sep',
      'Q4': 'Oct-Dec'
    };
    return quarterNames[quarter as keyof typeof quarterNames] || quarter;
  }

  getQuarterStatements(quarter: string): INode<BankStatement>[] {
    return this.bankStatements.filter(stmt => stmt.data.quarter === quarter);
  }

  getQuarterTotal(quarter: string, field: 'total_income' | 'total_expense' | 'closing_balance'): number {
    const statements = this.getQuarterStatements(quarter);
    if (field === 'closing_balance') {
      // For closing balance, get the latest month's balance in the quarter
      const latest = statements.reduce((prev, curr) =>
        prev.data.month > curr.data.month ? prev : curr
      );
      return latest?.data.closing_balance || 0;
    }
    return statements.reduce((sum, stmt) => sum + (stmt.data[field] || 0), 0);
  }
}
