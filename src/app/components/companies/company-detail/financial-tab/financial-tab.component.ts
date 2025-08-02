import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { INode } from '../../../../../models/schema';
import { Company, BankStatement } from '../../../../../models/business.models';
import { NodeService } from '../../../../../services';

@Component({
  selector: 'app-financial-tab',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './financial-tab.component.html'
})
export class FinancialTabComponent implements OnInit {
  @Input() company!: INode<Company>;

  bankStatements: INode<BankStatement>[] = [];
  loadingStatements = false;
  statementsError: string | null = null;

  // Modal and form properties
  showModal = false;
  isEditMode = false;
  editingStatement: INode<BankStatement> | null = null;
  savingStatement = false;
  statementForm: FormGroup;

  // PDF export properties
  showReportModal = false;
  generatingPdf = false;
  selectedReportPeriod = 'all';
  selectedYear = new Date().getFullYear();

  constructor(
    private nodeService: NodeService<BankStatement>,
    private fb: FormBuilder
  ) {
    this.statementForm = this.createForm();
  }

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
          .sort((a, b) => this.sortByQuarterAndMonth(a, b));
        this.loadingStatements = false;
      },
      error: (err) => {
        console.error('Error loading bank statements:', err);
        this.statementsError = 'Failed to load bank statements';
        this.loadingStatements = false;
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

  // ===== MODAL AND FORM METHODS =====

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

  openCreateModal() {
    this.isEditMode = false;
    this.editingStatement = null;
    this.statementForm = this.createForm();
    this.setQuarterFromMonth();
    this.showModal = true;
  }

  openEditModal(statement: INode<BankStatement>) {
    this.isEditMode = true;
    this.editingStatement = statement;

    this.statementForm = this.fb.group({
      year: [statement.data.year, [Validators.required, Validators.min(2000), Validators.max(2100)]],
      month: [statement.data.month, [Validators.required, Validators.min(1), Validators.max(12)]],
      quarter: [statement.data.quarter || '', Validators.required],
      opening_balance: [statement.data.opening_balance, [Validators.required, Validators.min(0)]],
      closing_balance: [statement.data.closing_balance, [Validators.required, Validators.min(0)]],
      total_income: [statement.data.total_income, [Validators.required, Validators.min(0)]],
      total_expense: [statement.data.total_expense, [Validators.required, Validators.min(0)]],
      account_name: [statement.data.account_name || '', [Validators.maxLength(100)]]
    });

    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.isEditMode = false;
    this.editingStatement = null;
    this.statementForm.reset();
  }

  onMonthChange() {
    this.setQuarterFromMonth();
  }

  setQuarterFromMonth() {
    const month = this.statementForm.get('month')?.value;
    if (month) {
      let quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
      if (month <= 3) quarter = 'Q1';
      else if (month <= 6) quarter = 'Q2';
      else if (month <= 9) quarter = 'Q3';
      else quarter = 'Q4';

      this.statementForm.patchValue({ quarter });
    }
  }

  saveStatement() {
    if (this.statementForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.savingStatement = true;
    const formData = this.statementForm.value;

    if (this.isEditMode && this.editingStatement) {
      // Update existing statement
      const updatedStatement: INode<BankStatement> = {
        ...this.editingStatement,
        data: formData
      };

      this.nodeService.updateNode(updatedStatement).subscribe({
        next: () => {
          this.loadBankStatements();
          this.closeModal();
          this.savingStatement = false;
        },
        error: (err) => {
          console.error('Error updating statement:', err);
          this.savingStatement = false;
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
          this.closeModal();
          this.savingStatement = false;
        },
        error: (err) => {
          console.error('Error creating statement:', err);
          this.savingStatement = false;
        }
      });
    }
  }

  deleteStatement(statement: INode<BankStatement>) {
    if (confirm('Are you sure you want to delete this bank statement?')) {
      this.nodeService.deleteNode(statement.id!).subscribe({
        next: () => {
          this.loadBankStatements();
        },
        error: (err) => {
          console.error('Error deleting statement:', err);
        }
      });
    }
  }

  markFormGroupTouched() {
    Object.keys(this.statementForm.controls).forEach(key => {
      const control = this.statementForm.get(key);
      control?.markAsTouched();
    });
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

  // ===== PDF EXPORT METHODS =====

  openReportModal() {
    this.showReportModal = true;
    this.selectedYear = new Date().getFullYear();
    this.selectedReportPeriod = 'all';
  }

  closeReportModal() {
    this.showReportModal = false;
    this.generatingPdf = false;
  }

  async generatePDF() {
    this.generatingPdf = true;

    try {
      // Dynamic import for html2pdf
      const html2pdf = (await import('html2pdf.js')).default;

      // Wait a moment for any UI updates to render
      setTimeout(async () => {
        const element = document.getElementById('financial-report-content');
        if (!element) {
          console.error('Report content element not found');
          this.generatingPdf = false;
          return;
        }

        // Add CSS overrides for pdf-compatible colors
        this.addPdfColorOverrides();

        const companyName = this.company.data.name || 'Company';
        const reportDate = new Date().toLocaleDateString('en-ZA');
        const filename = `${companyName.replace(/[^a-z0-9]/gi, '_')}_Financial_Report_${reportDate.replace(/\//g, '_')}.pdf`;

        const options = {
          margin: [0.5, 0.5, 0.5, 0.5],
          filename: filename,
          image: {
            type: 'jpeg',
            quality: 0.98
          },
          html2canvas: {
            scale: 2,
            useCORS: true,
            letterRendering: true,
            backgroundColor: '#ffffff',
            logging: false,
            allowTaint: true,
            foreignObjectRendering: false
          },
          jsPDF: {
            unit: 'in',
            format: 'a4',
            orientation: 'portrait'
          }
        };

        try {
          await html2pdf().set(options).from(element).save();
          console.log('PDF generated successfully');
        } catch (error) {
          console.error('Error generating PDF:', error);
        } finally {
          // Remove the CSS overrides
          this.removePdfColorOverrides();
          this.generatingPdf = false;
        }
      }, 100);
    } catch (error) {
      console.error('Error in PDF generation:', error);
      this.generatingPdf = false;
    }
  }

  getFilteredStatements(): INode<BankStatement>[] {
    let filtered: INode<BankStatement>[] = [];

    if (this.selectedReportPeriod === 'all') {
      filtered = this.bankStatements;
    } else if (this.selectedReportPeriod === 'year') {
      filtered = this.bankStatements.filter(stmt => stmt.data.year === this.selectedYear);
    } else if (this.selectedReportPeriod.startsWith('Q')) {
      filtered = this.bankStatements.filter(stmt =>
        stmt.data.year === this.selectedYear &&
        stmt.data.quarter === this.selectedReportPeriod
      );
    } else {
      filtered = this.bankStatements;
    }

    // Apply the same sorting to filtered results
    return filtered.sort((a, b) => this.sortByQuarterAndMonth(a, b));
  }

  getReportTitle(): string {
    const companyName = this.company.data.name || 'Company';

    if (this.selectedReportPeriod === 'all') {
      return `${companyName} - Complete Financial Report`;
    }

    if (this.selectedReportPeriod === 'year') {
      return `${companyName} - Financial Report ${this.selectedYear}`;
    }

    if (this.selectedReportPeriod.startsWith('Q')) {
      return `${companyName} - Financial Report ${this.selectedReportPeriod} ${this.selectedYear}`;
    }

    return `${companyName} - Financial Report`;
  }

  getReportSummary() {
    const statements = this.getFilteredStatements();

    if (statements.length === 0) {
      return {
        totalIncome: 0,
        totalExpenses: 0,
        netIncome: 0,
        avgClosingBalance: 0,
        periodCount: 0
      };
    }

    const totalIncome = statements.reduce((sum, stmt) => sum + (stmt.data.total_income || 0), 0);
    const totalExpenses = statements.reduce((sum, stmt) => sum + (stmt.data.total_expense || 0), 0);
    const netIncome = totalIncome - totalExpenses;
    const avgClosingBalance = statements.reduce((sum, stmt) => sum + (stmt.data.closing_balance || 0), 0) / statements.length;

    return {
      totalIncome,
      totalExpenses,
      netIncome,
      avgClosingBalance,
      periodCount: statements.length
    };
  }

  getAvailableYearsForReport(): number[] {
    return this.getAvailableYears();
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('en-ZA');
  }

  getCurrentDateTime(): string {
    return new Date().toLocaleString('en-ZA');
  }

  // PDF color override methods to handle modern CSS functions
  private pdfStyleElement: HTMLStyleElement | null = null;

  addPdfColorOverrides() {
    // Create a style element with PDF-compatible colors
    this.pdfStyleElement = document.createElement('style');
    this.pdfStyleElement.id = 'pdf-color-overrides';
    this.pdfStyleElement.innerHTML = `
      #financial-report-content .text-gray-900 { color: #111827 !important; }
      #financial-report-content .text-gray-800 { color: #1f2937 !important; }
      #financial-report-content .text-gray-700 { color: #374151 !important; }
      #financial-report-content .text-gray-600 { color: #4b5563 !important; }
      #financial-report-content .text-gray-500 { color: #6b7280 !important; }
      #financial-report-content .text-blue-900 { color: #1e3a8a !important; }
      #financial-report-content .text-blue-800 { color: #1e40af !important; }
      #financial-report-content .text-blue-700 { color: #1d4ed8 !important; }
      #financial-report-content .text-blue-600 { color: #2563eb !important; }
      #financial-report-content .text-green-600 { color: #16a34a !important; }
      #financial-report-content .text-green-800 { color: #166534 !important; }
      #financial-report-content .text-red-600 { color: #dc2626 !important; }
      #financial-report-content .text-red-800 { color: #991b1b !important; }
      #financial-report-content .bg-blue-50 { background-color: #eff6ff !important; }
      #financial-report-content .bg-green-50 { background-color: #f0fdf4 !important; }
      #financial-report-content .bg-red-50 { background-color: #fef2f2 !important; }
      #financial-report-content .bg-gray-50 { background-color: #f9fafb !important; }
      #financial-report-content .bg-white { background-color: #ffffff !important; }
      #financial-report-content .border-gray-200 { border-color: #e5e7eb !important; }
      #financial-report-content .border-b { border-bottom: 1px solid #e5e7eb !important; }
      #financial-report-content .border { border: 1px solid #e5e7eb !important; }
    `;

    document.head.appendChild(this.pdfStyleElement);
  }

  removePdfColorOverrides() {
    if (this.pdfStyleElement) {
      document.head.removeChild(this.pdfStyleElement);
      this.pdfStyleElement = null;
    }
  }
}
