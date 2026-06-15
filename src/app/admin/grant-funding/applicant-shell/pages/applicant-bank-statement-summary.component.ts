import { Component, Input, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GrantApplicationService } from '../../services/grant-application.service';
import {
  GrantBankStatement,
  FY_MONTH_COLUMNS,
  FINANCIAL_YEARS,
} from '../../interfaces/grant-application.interfaces';

interface SummaryRow {
  financial_year_name: string;
  financial_year_id: number;
  months: (number | undefined)[];  // 12 values, m1-m12
  total: number;
  activeMonths: number;            // months with value > 0
  capturedMonths: number;          // months not null/undefined
  avgActive: number;               // total / activeMonths
}

@Component({
  selector: 'app-applicant-bank-statement-summary',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden border-l-4 border-l-teal-500 mb-4">

      <!-- Header -->
      <div class="flex items-center justify-between px-5 py-3 bg-teal-50 border-b border-teal-100">
        <div class="flex items-center gap-3">
          <svg class="w-4 h-4 text-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
          <span class="text-sm font-semibold text-teal-800">{{ companyName || 'Company' }}</span>
          <span class="text-xs text-teal-500 font-medium">— Monthly Turnover Summary</span>
        </div>
        <div class="flex items-center gap-3">
          <!-- Consistency badge -->
          <span *ngIf="!isLoading() && rows().length > 0"
                [class]="consistencyBadgeClass()">
            {{ consistencyLabel() }}
          </span>
          <!-- Grand total pill -->
          <span *ngIf="!isLoading() && rows().length > 0"
                class="bg-teal-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full tabular-nums">
            R {{ grandTotal() | number:'1.0-2' }}
          </span>
          <button
            (click)="toggleCollapse()"
            class="p-1 text-teal-500 hover:text-teal-700 transition-colors"
            [title]="collapsed() ? 'Expand' : 'Collapse'">
            <svg class="w-4 h-4 transition-transform" [class.rotate-180]="collapsed()"
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Body -->
      <div *ngIf="!collapsed()">

        <!-- Loading -->
        <div *ngIf="isLoading()" class="flex items-center justify-center py-6 gap-2">
          <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-teal-600"></div>
          <span class="text-xs text-gray-400">Loading turnover data…</span>
        </div>

        <!-- No data -->
        <div *ngIf="!isLoading() && rows().length === 0"
             class="px-5 py-4 text-xs text-gray-400 italic">
          No bank statement data captured yet.
        </div>

        <ng-container *ngIf="!isLoading() && rows().length > 0">

          <!-- ── Stats strip ──────────────────────────────────────── -->
          <div class="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-100 border-b border-gray-100">

            <!-- Grand total -->
            <div class="px-4 py-3 flex flex-col gap-0.5">
              <span class="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Grand Total</span>
              <span class="text-base font-bold text-gray-900 tabular-nums">R {{ grandTotal() | number:'1.0-2' }}</span>
            </div>

            <!-- Average per active month -->
            <div class="px-4 py-3 flex flex-col gap-0.5">
              <span class="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Avg / Active Month</span>
              <span class="text-base font-bold text-gray-900 tabular-nums">
                {{ totalActiveMonths() > 0 ? 'R ' + (grandTotal() / totalActiveMonths() | number:'1.0-2') : '—' }}
              </span>
              <span class="text-[10px] text-gray-400">over {{ totalActiveMonths() }} month(s) with revenue</span>
            </div>

            <!-- Submitted months out of 12 required -->
            <div class="px-4 py-3 flex flex-col gap-0.5">
              <span class="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Submitted</span>
              <div class="flex items-end gap-1.5">
                <span class="text-base font-bold text-gray-900 tabular-nums">{{ submittedCount() }}</span>
                <span class="text-xs text-gray-400 mb-0.5">of 12 required</span>
              </div>
              <!-- Mini progress bar -->
              <div class="w-full h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                <div class="h-full rounded-full transition-all"
                     [class]="consistencyBarClass()"
                     [style.width.%]="submissionRate()">
                </div>
              </div>
            </div>

            <!-- Submission score -->
            <div class="px-4 py-3 flex flex-col gap-0.5">
              <span class="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Submission</span>
              <div class="flex items-center gap-2">
                <span class="text-base font-bold tabular-nums" [class]="consistencyRateClass()">
                  {{ submissionRate() | number:'1.0-0' }}%
                </span>
                <span [class]="consistencyBadgeClass()">{{ consistencyLabel() }}</span>
              </div>
              <span class="text-[10px] text-gray-400">{{ consistencyNote() }}</span>
            </div>
          </div>

          <!-- ── Gap map ──────────────────────────────────────────── -->
          <div class="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Monthly Gap Map</span>
              <div class="flex items-center gap-3 ml-auto text-[10px] text-gray-400">
                <span class="flex items-center gap-1">
                  <span class="inline-block w-3 h-3 rounded-sm bg-teal-400"></span>Revenue
                </span>
                <span class="flex items-center gap-1">
                  <span class="inline-block w-3 h-3 rounded-sm bg-amber-300"></span>Zero
                </span>
                <span class="flex items-center gap-1">
                  <span class="inline-block w-3 h-3 rounded-sm bg-gray-200"></span>Not captured
                </span>
              </div>
            </div>
            <!-- Month labels -->
            <div class="flex items-center gap-1 mb-1 pl-[104px]">
              <span *ngFor="let col of monthCols"
                    class="w-6 text-center text-[9px] text-gray-400 font-medium flex-shrink-0">
                {{ col.label }}
              </span>
            </div>
            <!-- One dot-row per FY -->
            <div *ngFor="let row of rows()" class="flex items-center gap-2 mb-1">
              <span class="text-[10px] text-gray-500 font-medium w-24 flex-shrink-0 truncate">
                {{ row.financial_year_name }}
              </span>
              <div class="flex items-center gap-1">
                <span *ngFor="let val of row.months"
                      [class]="dotClass(val)"
                      [title]="val != null ? 'R ' + val : 'Not captured'">
                </span>
              </div>
              <!-- Per-year active count -->
              <span class="text-[10px] text-gray-400 ml-1 whitespace-nowrap">
                {{ row.activeMonths }}/{{ row.capturedMonths }} active
              </span>
            </div>
          </div>

          <!-- ── Full table ───────────────────────────────────────── -->
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead>
                <tr class="bg-gray-50 border-b border-gray-100 text-gray-500">
                  <th class="text-left px-4 py-2 font-medium whitespace-nowrap sticky left-0 bg-gray-50 border-r border-gray-200 z-10 min-w-[120px]">
                    Financial Year
                  </th>
                  <th *ngFor="let col of monthCols"
                      class="px-2 py-2 text-center font-medium whitespace-nowrap min-w-[72px]">
                    {{ col.label }}
                  </th>
                  <th class="px-3 py-2 text-center font-medium whitespace-nowrap text-gray-500 min-w-[60px]">
                    Active
                  </th>
                  <th class="px-3 py-2 text-right font-medium whitespace-nowrap text-gray-500 min-w-[90px]">
                    Avg/Month
                  </th>
                  <th class="px-4 py-2 text-right font-semibold whitespace-nowrap bg-teal-50 text-teal-700 border-l border-teal-100 min-w-[100px]">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50">
                <tr *ngFor="let row of rows(); let i = index"
                    [class.bg-white]="i % 2 === 0"
                    [class.bg-gray-50]="i % 2 === 1">
                  <td class="px-4 py-2 font-medium text-gray-700 sticky left-0 border-r border-gray-200 z-10 whitespace-nowrap"
                      [class.bg-white]="i % 2 === 0"
                      [class.bg-gray-50]="i % 2 === 1">
                    {{ row.financial_year_name }}
                  </td>
                  <td *ngFor="let val of row.months"
                      class="px-2 py-2 text-center tabular-nums whitespace-nowrap"
                      [class]="cellBg(val)">
                    <span *ngIf="val != null; else dash"
                          [class]="val === 0 ? 'text-amber-600' : 'text-gray-800 font-medium'">
                      {{ val | number:'1.0-2' }}
                    </span>
                    <ng-template #dash>
                      <span class="text-gray-300">—</span>
                    </ng-template>
                  </td>
                  <!-- Active months indicator -->
                  <td class="px-3 py-2 text-center whitespace-nowrap"
                      [class.bg-white]="i % 2 === 0"
                      [class.bg-gray-50]="i % 2 === 1">
                    <span class="text-[10px] font-semibold"
                          [class]="row.activeMonths >= 10 ? 'text-teal-600' : row.activeMonths >= 6 ? 'text-amber-600' : 'text-red-500'">
                      {{ row.activeMonths }}/{{ row.capturedMonths }}
                    </span>
                  </td>
                  <!-- Avg per active month -->
                  <td class="px-3 py-2 text-right tabular-nums whitespace-nowrap text-gray-500"
                      [class.bg-white]="i % 2 === 0"
                      [class.bg-gray-50]="i % 2 === 1">
                    {{ row.activeMonths > 0 ? 'R ' + (row.avgActive | number:'1.0-2') : '—' }}
                  </td>
                  <td class="px-4 py-2 text-right font-semibold text-teal-700 bg-teal-50 border-l border-teal-100 tabular-nums whitespace-nowrap">
                    R {{ row.total | number:'1.0-2' }}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="border-t-2 border-teal-200 bg-teal-50 font-bold text-teal-800">
                  <td class="px-4 py-2 sticky left-0 bg-teal-50 border-r border-teal-200 text-right text-xs font-semibold"
                      [attr.colspan]="monthCols.length + 1">
                    Grand Total
                  </td>
                  <!-- Submitted months total -->
                  <td class="px-3 py-2 text-center text-xs font-semibold text-teal-700">
                    {{ submittedCount() }}/12
                  </td>
                  <!-- Overall avg -->
                  <td class="px-3 py-2 text-right text-xs font-semibold text-teal-700 tabular-nums">
                    {{ totalActiveMonths() > 0 ? 'R ' + (grandTotal() / totalActiveMonths() | number:'1.0-2') : '—' }}
                  </td>
                  <td class="px-4 py-2 text-right tabular-nums text-sm border-l border-teal-200">
                    R {{ grandTotal() | number:'1.0-2' }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

        </ng-container>
      </div>
    </div>
  `
})
export class ApplicantBankStatementSummaryComponent implements OnInit {
  @Input() applicantId = 0;
  @Input() companyName = '';

  readonly monthCols = FY_MONTH_COLUMNS;

  isLoading = signal(true);
  collapsed = signal(this.getStoredCollapseState('bank-statement-summary'));
  rows = signal<SummaryRow[]>([]);

  private getStoredCollapseState(componentName: string): boolean {
    try {
      const stored = localStorage.getItem(`collapsed-${componentName}`);
      return stored ? JSON.parse(stored) : false;
    } catch {
      return false;
    }
  }

  private setStoredCollapseState(componentName: string, collapsed: boolean): void {
    try {
      localStorage.setItem(`collapsed-${componentName}`, JSON.stringify(collapsed));
    } catch {
      // Ignore storage errors
    }
  }

  toggleCollapse(): void {
    const newState = !this.collapsed();
    this.collapsed.set(newState);
    this.setStoredCollapseState('bank-statement-summary', newState);
  }

  grandTotal = computed(() => this.rows().reduce((s, r) => s + r.total, 0));

  totalCapturedMonths = computed(() =>
    this.rows().reduce((s, r) => s + r.capturedMonths, 0)
  );

  totalActiveMonths = computed(() =>
    this.rows().reduce((s, r) => s + r.activeMonths, 0)
  );

  /** Statements submitted, capped at the 12-month requirement */
  submittedCount = computed(() => Math.min(this.totalCapturedMonths(), 12));

  /** % of the 12-statement requirement met (max 100) */
  submissionRate = computed(() => (this.submittedCount() / 12) * 100);

  consistencyLabel = computed(() => {
    const r = this.submissionRate();
    if (r >= 100) return 'Complete';
    if (r >= 50)  return 'Partial';
    return 'Incomplete';
  });

  consistencyNote = computed(() => {
    const c = this.submittedCount();
    if (c >= 12) return '12 of 12 statements submitted';
    return `${c} of 12 statements submitted`;
  });

  constructor(private grantService: GrantApplicationService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.grantService.getBankStatements(this.applicantId).subscribe({
      next: (statements: GrantBankStatement[]) => {
        const built: SummaryRow[] = statements.map(node => {
          const d = node.data;
          const months: (number | undefined)[] = [
            d.m1, d.m2, d.m3, d.m4, d.m5, d.m6,
            d.m7, d.m8, d.m9, d.m10, d.m11, d.m12,
          ];
          const capturedMonths = months.filter(v => v != null).length;
          const activeMonths = months.filter(v => v != null && v > 0).length;
          const total = d.total_amount ?? 0;
          return {
            financial_year_id: d.financial_year_id,
            financial_year_name: d.financial_year_name,
            months,
            total,
            capturedMonths,
            activeMonths,
            avgActive: activeMonths > 0 ? total / activeMonths : 0,
          };
        });
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

  dotClass(val: number | undefined): string {
    const base = 'inline-block w-6 h-4 rounded-sm flex-shrink-0 ';
    if (val == null)  return base + 'bg-gray-200';
    if (val === 0)    return base + 'bg-amber-300';
    return                   base + 'bg-teal-400';
  }

  cellBg(val: number | undefined): string {
    if (val == null) return 'bg-red-50/40';
    if (val === 0)   return 'bg-amber-50/60';
    return '';
  }

  consistencyBadgeClass(): string {
    const base = 'text-[10px] font-semibold px-2 py-0.5 rounded-full ';
    const r = this.submissionRate();
    if (r >= 100) return base + 'bg-teal-100 text-teal-700';
    if (r >= 50)  return base + 'bg-amber-100 text-amber-700';
    return               base + 'bg-red-100 text-red-600';
  }

  consistencyBarClass(): string {
    const r = this.submissionRate();
    if (r >= 100) return 'bg-teal-500';
    if (r >= 50)  return 'bg-amber-400';
    return 'bg-red-400';
  }

  consistencyRateClass(): string {
    const r = this.submissionRate();
    if (r >= 100) return 'text-teal-600';
    if (r >= 50)  return 'text-amber-600';
    return 'text-red-500';
  }
}
