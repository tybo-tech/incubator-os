import { Component, OnInit, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { GrantApplicationService } from '../../services/grant-application.service';
import {
  IFinancialYear,
  IGrantBankStatementData,
  GrantBankStatement,
  FINANCIAL_YEARS,
  FY_MONTH_COLUMNS,
} from '../../interfaces/grant-application.interfaces';

interface FyRow {
  nodeId?: number;
  financial_year_id: number;
  financial_year_name: string;
  months: Record<string, number | undefined>;
  total: number;
  isSaving: boolean;
  saveTimeout?: ReturnType<typeof setTimeout>;
}

@Component({
  selector: 'app-applicant-bank-statements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-4 sm:p-6">

      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">Bank Statements</h2>
          <p class="text-sm text-gray-500 mt-0.5">Monthly turnover by financial year (Mar → Feb). One row per year.</p>
        </div>

        <!-- Add FY button + dropdown -->
        <div class="relative">
          <button
            (click)="toggleFyDropdown()"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors
                   flex items-center text-sm font-medium">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            Add Financial Year
          </button>
          <!-- Dropdown -->
          <div *ngIf="showFyDropdown()"
               class="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg
                      shadow-lg z-20 min-w-[180px] max-h-72 overflow-y-auto">
            <div *ngIf="availableFys().length === 0"
                 class="px-4 py-3 text-sm text-gray-500 text-center">
              All financial years captured
            </div>
            <button
              *ngFor="let fy of availableFys()"
              (click)="addFyRow(fy)"
              class="w-full text-left px-4 py-2.5 text-sm text-gray-700
                     hover:bg-blue-50 hover:text-blue-700 transition-colors">
              {{ fy.name }}
            </button>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading()" class="flex justify-center items-center py-16">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>

      <!-- Empty state -->
      <div *ngIf="!isLoading() && rows().length === 0"
           class="text-center py-16 bg-white rounded-xl border border-gray-200">
        <div class="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
          </svg>
        </div>
        <h3 class="text-sm font-medium text-gray-900 mb-1">No bank statements yet</h3>
        <p class="text-sm text-gray-500 mb-5">Add a financial year to start capturing monthly turnover.</p>
        <button
          (click)="toggleFyDropdown()"
          class="px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          Add First Year
        </button>
      </div>

      <!-- Table -->
      <div *ngIf="!isLoading() && rows().length > 0"
           class="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-blue-50 text-blue-800 border-b border-blue-200">
                <th class="text-left px-4 py-3 font-semibold min-w-[160px] sticky left-0 bg-blue-50 border-r border-blue-200 z-10">
                  Financial Year
                </th>
                <th *ngFor="let col of monthCols"
                    class="px-3 py-3 text-center font-semibold min-w-[80px] border-r border-blue-100">
                  {{ col.label }}
                </th>
                <th class="px-4 py-3 text-right font-semibold min-w-[110px] bg-blue-100 border-r border-blue-200">
                  Total
                </th>
                <th class="px-3 py-3 text-center font-semibold min-w-[100px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of rows(); let i = index"
                  [class.bg-gray-50]="i % 2 === 1"
                  [class.bg-white]="i % 2 === 0"
                  class="hover:bg-blue-50/30 transition-colors">

                <!-- FY Name (sticky) -->
                <td class="px-4 py-3 font-medium text-gray-800 sticky left-0 border-r border-gray-200 z-10"
                    [class.bg-gray-50]="i % 2 === 1"
                    [class.bg-white]="i % 2 === 0">
                  {{ row.financial_year_name }}
                </td>

                <!-- Month inputs -->
                <td *ngFor="let col of monthCols"
                    class="text-center border-r border-gray-100 bg-inherit p-1.5">
                  <input
                    type="number"
                    [(ngModel)]="row.months[col.key]"
                    (ngModelChange)="onMonthInput(row)"
                    min="0"
                    step="1"
                    [class]="monthInputClass(row.months[col.key])" />
                </td>

                <!-- Row total -->
                <td class="px-4 py-3 text-right font-semibold text-blue-800 bg-blue-100 border-r border-blue-200 whitespace-nowrap">
                  R {{ row.total | number:'1.0-2' }}
                </td>

                <!-- Actions -->
                <td class="px-3 py-3 text-center bg-inherit">
                  <div class="flex items-center justify-center gap-1.5">
                    <span *ngIf="row.isSaving"
                          class="text-[10px] text-gray-400 animate-pulse whitespace-nowrap">saving…</span>
                    <button
                      (click)="deleteRow(row)"
                      [disabled]="row.isSaving"
                      class="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded
                             transition-colors disabled:opacity-40"
                      title="Delete">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>

            <!-- Grand Total footer -->
            <tfoot class="border-t-2 border-blue-200 bg-blue-50 font-semibold text-blue-800">
              <tr>
                <td class="px-4 py-3 text-right sticky left-0 bg-blue-50 border-r border-blue-200"
                    colspan="13">
                  <span class="text-base">Grand Total:</span>
                </td>
                <td class="px-4 py-3 text-right bg-blue-100 text-lg font-bold whitespace-nowrap">
                  R {{ grandTotal() | number:'1.0-2' }}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Summary bar + legend -->
        <div class="px-4 py-2.5 border-t border-gray-100 bg-gray-50 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
          <span>{{ rows().length }} year(s) captured</span>
          <div class="flex items-center gap-4">
            <span class="flex items-center gap-1.5">
              <span class="inline-block w-3 h-3 rounded border-2 border-red-300 bg-white"></span>Not captured
            </span>
            <span class="flex items-center gap-1.5">
              <span class="inline-block w-3 h-3 rounded border-2 border-amber-300 bg-white"></span>Zero turnover
            </span>
            <span class="flex items-center gap-1.5">
              <span class="inline-block w-3 h-3 rounded border-2 border-green-300 bg-white"></span>Has value
            </span>
          </div>
          <span class="font-medium text-gray-700">Total: R {{ grandTotal() | number:'1.0-2' }}</span>
        </div>
      </div>

      <!-- Toast -->
      <div *ngIf="toast()"
           class="fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg text-white text-sm z-50"
           [class.bg-green-600]="toast()!.type === 'success'"
           [class.bg-red-600]="toast()!.type === 'error'">
        {{ toast()!.message }}
      </div>

    </div>
  `
})
export class ApplicantBankStatementsComponent implements OnInit {
  /** When embedded inside a parent component, set this to bypass route params. */
  @Input() set embeddedApplicantId(val: number) {
    if (val) {
      this.applicantId = val;
      this.loadStatements();
    }
  }

  /** Fires after any save or delete with the latest aggregated stats. */
  @Output() statsChanged = new EventEmitter<{ months: number; grandTotal: number }>();

  applicantId = 0;
  isLoading = signal(true);
  showFyDropdown = signal(false);
  rows = signal<FyRow[]>([]);
  toast = signal<{ message: string; type: 'success' | 'error' } | null>(null);

  readonly monthCols = FY_MONTH_COLUMNS;

  grandTotal = computed(() =>
    this.rows().reduce((sum, r) => sum + (r.total || 0), 0)
  );

  availableFys = computed(() => {
    const usedIds = new Set(this.rows().map(r => r.financial_year_id));
    return FINANCIAL_YEARS.filter(fy => !usedIds.has(fy.id));
  });

  constructor(
    private route: ActivatedRoute,
    private grantService: GrantApplicationService
  ) {}

  ngOnInit(): void {
    if (!this.applicantId) {
      this.route.parent!.params.subscribe(params => {
        this.applicantId = +params['id'];
        this.loadStatements();
      });
    }
  }

  toggleFyDropdown(): void {
    this.showFyDropdown.update(v => !v);
  }

  addFyRow(fy: IFinancialYear): void {
    const newRow: FyRow = {
      financial_year_id: fy.id,
      financial_year_name: fy.name,
      months: { m1: undefined, m2: undefined, m3: undefined, m4: undefined,
                m5: undefined, m6: undefined, m7: undefined, m8: undefined,
                m9: undefined, m10: undefined, m11: undefined, m12: undefined },
      total: 0,
      isSaving: false,
    };
    // Insert sorted by fy_start_year
    this.rows.update(rows => {
      const insertBefore = rows.findIndex(r => {
        const rFy = FINANCIAL_YEARS.find(f => f.id === r.financial_year_id);
        return rFy && rFy.fy_start_year > fy.fy_start_year;
      });
      const copy = [...rows];
      if (insertBefore === -1) copy.push(newRow);
      else copy.splice(insertBefore, 0, newRow);
      return copy;
    });
    this.showFyDropdown.set(false);
  }

  loadStatements(): void {
    this.isLoading.set(true);
    this.grantService.getBankStatements(this.applicantId).subscribe({
      next: (statements: GrantBankStatement[]) => {
        const built: FyRow[] = statements.map(node => {
          const d = node.data;
          return {
            nodeId: node.id,
            financial_year_id: d.financial_year_id,
            financial_year_name: d.financial_year_name,
            months: {
              m1:  d.m1  ?? undefined, m2:  d.m2  ?? undefined, m3:  d.m3  ?? undefined,
              m4:  d.m4  ?? undefined, m5:  d.m5  ?? undefined, m6:  d.m6  ?? undefined,
              m7:  d.m7  ?? undefined, m8:  d.m8  ?? undefined, m9:  d.m9  ?? undefined,
              m10: d.m10 ?? undefined, m11: d.m11 ?? undefined, m12: d.m12 ?? undefined,
            },
            total: d.total_amount ?? 0,
            isSaving: false,
          };
        });
        // Sort ascending by fy_start_year
        built.sort((a, b) => {
          const aFy = FINANCIAL_YEARS.find(f => f.id === a.financial_year_id)?.fy_start_year ?? 0;
          const bFy = FINANCIAL_YEARS.find(f => f.id === b.financial_year_id)?.fy_start_year ?? 0;
          return aFy - bFy;
        });
        this.rows.set(built);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  recalcTotal(row: FyRow): void {
    row.total = Object.values(row.months)
      .reduce((sum: number, v) => sum + (v != null ? Number(v) : 0), 0);
    this.rows.update(r => [...r]);
  }

  private emitStats(): void {
    const allRows = this.rows();
    // Count months that are not null/undefined (even 0 = submitted but zero turnover)
    const months = allRows.reduce((sum, r) =>
      sum + Object.values(r.months).filter(v => v != null).length, 0);
    this.statsChanged.emit({ months, grandTotal: this.grandTotal() });
  }

  onMonthInput(row: FyRow): void {
    this.recalcTotal(row);
    if (row.saveTimeout) clearTimeout(row.saveTimeout);
    row.saveTimeout = setTimeout(() => this.saveRow(row, true), 800);
  }

  monthInputClass(val: number | undefined): string {
    const base = 'w-20 rounded-md text-right px-2 py-1.5 text-sm transition-all border-2 ' +
                 'focus:ring-1 focus:ring-offset-0 bg-white ';
    if (val == null) return base + 'border-red-300   focus:ring-red-200   focus:border-red-400';
    if (val === 0)   return base + 'border-amber-300 focus:ring-amber-200 focus:border-amber-400';
    return                  base + 'border-green-300 focus:ring-green-200 focus:border-green-400';
  }

  saveRow(row: FyRow, silent = false): void {
    row.isSaving = true;
    const m = (v: number | undefined) => (v == null ? undefined : Number(v));
    const data: IGrantBankStatementData = {
      financial_year_id:   row.financial_year_id,
      financial_year_name: row.financial_year_name,
      m1:  m(row.months['m1']),  m2:  m(row.months['m2']),  m3:  m(row.months['m3']),
      m4:  m(row.months['m4']),  m5:  m(row.months['m5']),  m6:  m(row.months['m6']),
      m7:  m(row.months['m7']),  m8:  m(row.months['m8']),  m9:  m(row.months['m9']),
      m10: m(row.months['m10']), m11: m(row.months['m11']), m12: m(row.months['m12']),
      total_amount: row.total,
    };
    this.grantService.saveBankStatement(this.applicantId, data).subscribe({
      next: (node: GrantBankStatement) => {
        row.nodeId = node.id;
        row.isSaving = false;
        this.rows.update(r => [...r]);
        if (!silent) this.showToast(`${row.financial_year_name} saved`, 'success');
        this.emitStats();
      },
      error: () => {
        row.isSaving = false;
        this.rows.update(r => [...r]);
        this.showToast('Failed to save', 'error');
      },
    });
  }

  deleteRow(row: FyRow): void {
    if (!row.nodeId) {
      // Not yet saved to DB — remove from UI immediately
      this.rows.update(rows => rows.filter(r => r !== row));
      return;
    }
    if (!confirm(`Delete ${row.financial_year_name}?`)) return;
    this.grantService.deleteBankStatement(row.nodeId).subscribe({
      next: () => {
        this.rows.update(rows => rows.filter(r => r !== row));
        this.showToast(`${row.financial_year_name} deleted`, 'success');
        this.emitStats();
      },
      error: () => this.showToast('Failed to delete', 'error'),
    });
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 3500);
  }
}

