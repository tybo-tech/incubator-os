import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { INode } from '../../../../../models/schema';
import { Company, BankStatement } from '../../../../../models/business.models';
import { NodeService } from '../../../../../services';

@Component({
  selector: 'app-financial-tab',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './financial-tab.component.html'
})
export class FinancialTabComponent implements OnInit {
  @Input() company!: INode<Company>;
  
  bankStatements: INode<BankStatement>[] = [];
  loadingStatements = false;
  statementsError: string | null = null;

  constructor(private nodeService: NodeService<BankStatement>) {}

  ngOnInit() {
    if (this.company?.id) {
      this.loadBankStatements();
    }
  }

  loadBankStatements() {
    this.loadingStatements = true;
    this.statementsError = null;

    // Fetch bank statements for this company
    this.nodeService.getNodes('bank_statement').subscribe({
      next: (statements) => {
        // Filter statements for this company
        this.bankStatements = statements
          .filter(stmt => stmt.company_id === this.company.id)
          .sort((a, b) => {
            // Sort by year desc, then month desc
            if (a.data.year !== b.data.year) {
              return b.data.year - a.data.year;
            }
            return b.data.month - a.data.month;
          });
        this.loadingStatements = false;
      },
      error: (err) => {
        console.error('Error loading bank statements:', err);
        this.statementsError = 'Failed to load bank statements';
        this.loadingStatements = false;
      }
    });
  }

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

  getAvailableYears(): number[] {
    const years = [...new Set(this.bankStatements.map(stmt => stmt.data.year))];
    return years.sort((a, b) => b - a);
  }

  getStatementsForYear(year: number): INode<BankStatement>[] {
    return this.bankStatements.filter(stmt => stmt.data.year === year);
  }

  getTotalIncomeForYear(year: number): number {
    return this.getStatementsForYear(year).reduce((sum, stmt) => sum + (stmt.data.total_income || 0), 0);
  }

  getTotalExpenseForYear(year: number): number {
    return this.getStatementsForYear(year).reduce((sum, stmt) => sum + (stmt.data.total_expense || 0), 0);
  }
}
