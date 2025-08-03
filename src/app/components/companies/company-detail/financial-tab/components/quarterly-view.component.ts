import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BankStatement } from '../../../../../../models/business.models';
import { INode } from '../../../../../../models/schema';

@Component({
  selector: 'app-quarterly-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div *ngFor="let quarter of ['Q1', 'Q2', 'Q3', 'Q4']"
           class="bg-gray-50 rounded-lg p-4">
        <div class="flex items-center mb-2">
          <i class="fas fa-calendar-quarter text-blue-600 mr-2"></i>
          <h6 class="font-medium text-gray-900">{{ quarter }}</h6>
        </div>
        <div class="space-y-1 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600">
              <i class="fas fa-arrow-up text-green-500 mr-1"></i>
              Income:
            </span>
            <span class="font-medium text-green-600">{{ formatCurrency(getQuarterTotal(quarter, 'total_income')) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">
              <i class="fas fa-arrow-down text-red-500 mr-1"></i>
              Expenses:
            </span>
            <span class="font-medium text-red-600">{{ formatCurrency(getQuarterTotal(quarter, 'total_expense')) }}</span>
          </div>
          <div class="flex justify-between border-t pt-1">
            <span class="text-gray-600">
              <i class="fas fa-wallet text-blue-500 mr-1"></i>
              Balance:
            </span>
            <span class="font-medium">{{ formatCurrency(getQuarterTotal(quarter, 'closing_balance')) }}</span>
          </div>
        </div>
      </div>
    </div>
  `
})
export class QuarterlyViewComponent {
  @Input() bankStatements: INode<BankStatement>[] = [];

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
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
