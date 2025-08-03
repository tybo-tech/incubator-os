import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { INode } from '../../../../../models/schema';
import { Company, BankStatement } from '../../../../../models/business.models';
import { FinancialCheckIn } from '../../../../../models/busines.financial.checkin.models';
import { NodeService } from '../../../../../services';
import {
  FinancialOverviewComponent,
  QuarterlyViewComponent,
  StatementsTableComponent,
  StatementModalComponent,
  FinancialCheckinModalComponent,
  FinancialCheckinOverviewComponent
} from './components';
import { PdfExportModalComponent } from './components/pdf-export-modal.component';
import { FinancialCheckinQuarterlyViewComponent } from './components/financial-checkin-quarterly-view.component';
import { FinancialCheckinPdfExportModalComponent } from './components/financial-checkin-pdf-export-modal.component';

@Component({
  selector: 'app-financial-tab',
  standalone: true,
  imports: [
    CommonModule,
    FinancialOverviewComponent,
    QuarterlyViewComponent,
    StatementsTableComponent,
    StatementModalComponent,
    PdfExportModalComponent,
    FinancialCheckinModalComponent,
    FinancialCheckinOverviewComponent,
    FinancialCheckinQuarterlyViewComponent,
    FinancialCheckinPdfExportModalComponent
  ],
  templateUrl: './financial-tab.component.html'
})
export class FinancialTabComponent implements OnInit {
  @Input() company!: INode<Company>;
  @ViewChild(FinancialCheckinOverviewComponent) checkinOverview!: FinancialCheckinOverviewComponent;
  @ViewChild(FinancialCheckinModalComponent) checkinModal!: FinancialCheckinModalComponent;

  bankStatements: INode<BankStatement>[] = [];
  loadingStatements = false;
  statementsError: string | null = null;

  // Financial Check-ins data
  financialCheckIns: INode<FinancialCheckIn>[] = [];
  loadingCheckIns = false;
  checkInsError: string | null = null;

  // Modal and form properties
  showModal = false;
  isEditMode = false;
  editingStatement: INode<BankStatement> | null = null;

  // PDF Export modal properties
  showPdfModal = false;
  showFinancialCheckinPdfModal = false;

  // Financial Check-in modal properties
  showCheckInModal = false;
  isCheckInEditMode = false;
  editingCheckIn: INode<FinancialCheckIn> | null = null;

  constructor(
    private nodeService: NodeService<BankStatement>,
    private checkInService: NodeService<FinancialCheckIn>
  ) {}

  ngOnInit() {
    if (this.company?.id) {
      this.loadBankStatements();
      this.loadFinancialCheckIns();
    }
  }

  loadBankStatements() {
    this.loadingStatements = true;
    this.statementsError = null;

    // Fetch bank statements for this company
    this.nodeService.getNodes('bank_statement').subscribe({
      next: (statements: INode<BankStatement>[]) => {
        // Filter statements for this company
        this.bankStatements = statements
          .filter((stmt: INode<BankStatement>) => stmt.company_id === this.company.id)
          .sort((a: INode<BankStatement>, b: INode<BankStatement>) => this.sortByQuarterAndMonth(a, b));
        this.loadingStatements = false;
      },
      error: (err: any) => {
        console.error('Error loading bank statements:', err);
        this.statementsError = 'Failed to load bank statements';
        this.loadingStatements = false;
      }
    });
  }

  loadFinancialCheckIns() {
    this.loadingCheckIns = true;
    this.checkInsError = null;

    // Fetch financial check-ins for this company
    this.checkInService.getNodesByType('financial_checkin').subscribe({
      next: (checkIns: INode<FinancialCheckIn>[]) => {
        // Filter check-ins for this company
        this.financialCheckIns = checkIns
          .filter((checkIn: INode<FinancialCheckIn>) => checkIn.company_id === this.company.id)
          .sort((a: INode<FinancialCheckIn>, b: INode<FinancialCheckIn>) => {
            // Sort by year and month descending (newest first)
            if (a.data.year !== b.data.year) {
              return b.data.year - a.data.year;
            }
            // Handle optional month field
            const aMonth = a.data.month || 0;
            const bMonth = b.data.month || 0;
            return bMonth - aMonth;
          });
        this.loadingCheckIns = false;
      },
      error: (err: any) => {
        console.error('Error loading financial check-ins:', err);
        this.checkInsError = 'Failed to load financial check-ins';
        this.loadingCheckIns = false;
      }
    });
  }

  // ===== SORTING AND GROUPING METHODS =====

  sortByQuarterAndMonth(a: INode<BankStatement>, b: INode<BankStatement>): number {
    // First sort by year (descending - newest first)
    if (a.data.year !== b.data.year) {
      return b.data.year - a.data.year;
    }

    // Then sort by quarter (Q4, Q3, Q2, Q1)
    const quarterOrder = { 'Q4': 4, 'Q3': 3, 'Q2': 2, 'Q1': 1 };
    const aQuarter = quarterOrder[a.data.quarter as keyof typeof quarterOrder] || 0;
    const bQuarter = quarterOrder[b.data.quarter as keyof typeof quarterOrder] || 0;

    if (aQuarter !== bQuarter) {
      return bQuarter - aQuarter;
    }

    // Finally sort by month within quarter (descending - newest first)
    return b.data.month - a.data.month;
  }

  getGroupedStatements(): { [year: number]: { [quarter: string]: INode<BankStatement>[] } } {
    const grouped: { [year: number]: { [quarter: string]: INode<BankStatement>[] } } = {};

    this.bankStatements.forEach(statement => {
      const year = statement.data.year;
      const quarter = statement.data.quarter as string;

      if (!grouped[year]) {
        grouped[year] = {};
      }
      if (!grouped[year][quarter]) {
        grouped[year][quarter] = [];
      }
      grouped[year][quarter].push(statement);
    });

    return grouped;
  }

  getStatementsForYearQuarter(year: number, quarter: string): INode<BankStatement>[] {
    const groupedStatements = this.getGroupedStatements();
    return groupedStatements[year]?.[quarter] || [];
  }

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

  // ===== MODAL EVENT HANDLERS =====

  onAddStatement() {
    this.isEditMode = false;
    this.editingStatement = null;
    this.showModal = true;
  }

  onEditStatement(statement: INode<BankStatement>) {
    this.isEditMode = true;
    this.editingStatement = statement;
    this.showModal = true;
  }

  onDeleteStatement(statement: INode<BankStatement>) {
    if (confirm('Are you sure you want to delete this bank statement?')) {
      this.nodeService.deleteNode(statement.id!).subscribe({
        next: () => {
          this.loadBankStatements();
        },
        error: (err: any) => {
          console.error('Error deleting statement:', err);
        }
      });
    }
  }

  onModalClose() {
    this.showModal = false;
    this.isEditMode = false;
    this.editingStatement = null;
  }

  onStatementSaved(formData: any) {
    if (this.isEditMode && this.editingStatement) {
      // Update existing statement
      const updatedStatement: INode<BankStatement> = {
        ...this.editingStatement,
        data: formData
      };

      this.nodeService.updateNode(updatedStatement).subscribe({
        next: () => {
          this.loadBankStatements();
          this.onModalClose();
        },
        error: (err: any) => {
          console.error('Error updating statement:', err);
        }
      });
    } else {
      // Create new statement
      const newStatement: Partial<INode<BankStatement>> = {
        type: 'bank_statement',
        company_id: this.company.id,
        data: formData
      };

      this.nodeService.addNode(newStatement as INode<BankStatement>).subscribe({
        next: () => {
          this.loadBankStatements();
          this.onModalClose();
        },
        error: (err: any) => {
          console.error('Error creating statement:', err);
        }
      });
    }
  }

  // ===== PDF EXPORT METHODS =====

  onExportPDF() {
    // Use Financial Check-ins PDF export as primary option
    this.showFinancialCheckinPdfModal = true;
  }

  onExportBankStatementsPDF() {
    // Legacy bank statements PDF export (for validation/compliance)
    this.showPdfModal = true;
  }

  onPdfModalClose() {
    this.showPdfModal = false;
  }

  onFinancialCheckinPdfModalClose() {
    this.showFinancialCheckinPdfModal = false;
  }

  // ===== FINANCIAL CHECK-IN METHODS =====

  onNewCheckIn() {
    this.isCheckInEditMode = false;
    this.editingCheckIn = null;
    this.showCheckInModal = true;
  }

  onEditCheckIn(checkIn: INode<FinancialCheckIn>) {
    this.isCheckInEditMode = true;
    this.editingCheckIn = checkIn;
    this.showCheckInModal = true;
  }

  onCheckInModalClose() {
    this.showCheckInModal = false;
    this.isCheckInEditMode = false;
    this.editingCheckIn = null;
    // Reset the modal's saving state
    this.checkinModal?.resetSavingState();
  }

  onCheckInSaved(checkInData: FinancialCheckIn) {
    if (this.isCheckInEditMode && this.editingCheckIn) {
      // Update existing check-in
      const updatedCheckIn: INode<FinancialCheckIn> = {
        ...this.editingCheckIn,
        data: checkInData
      };

      this.checkInService.updateNode(updatedCheckIn).subscribe({
        next: () => {
          this.onCheckInModalClose();
          // Refresh the overview component
          this.checkinOverview?.refreshData();
        },
        error: (err: any) => {
          console.error('Error updating check-in:', err);
        }
      });
    } else {
      // Create new check-in
      const newCheckIn: Partial<INode<FinancialCheckIn>> = {
        type: 'financial_checkin',
        company_id: this.company.id,
        data: checkInData
      };

      this.checkInService.addNode(newCheckIn as INode<FinancialCheckIn>).subscribe({
        next: () => {
          this.onCheckInModalClose();
          // Refresh the overview component
          this.checkinOverview?.refreshData();
        },
        error: (err: any) => {
          console.error('Error creating check-in:', err);
        }
      });
    }
  }

  onViewTrends() {
    // TODO: Implement trends view - could be a separate modal or route
    console.log('View trends clicked - TODO: Implement trends view');
  }
}
