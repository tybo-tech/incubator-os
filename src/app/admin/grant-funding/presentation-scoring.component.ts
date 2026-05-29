import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  NodeGrantFundService,
  IScoreReportEntry,
  IScoreVote,
} from './services/node-grant-fund.service';
import { PdfService } from '../../../services/pdf/pdf.service';

@Component({
  selector: 'app-presentation-scoring',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-1">

      <!-- Toolbar -->
      <div class="flex flex-wrap items-center gap-2 mb-5">
        <!-- Search -->
        <input
          type="text"
          placeholder="Search company or entrepreneur…"
          [(ngModel)]="searchQuery"
          class="flex-1 min-w-[200px] max-w-sm px-4 py-2 border border-gray-300 rounded-lg text-sm
                 focus:ring-2 focus:ring-blue-500 focus:border-transparent">

        <!-- Only show scored -->
        <button
          (click)="toggleScoredOnly()"
          [class]="toggleClass(scoredOnly())">
          Scored only
        </button>

        <span class="text-xs text-gray-400 ml-auto tabular-nums">
          {{ filtered().length }} applicant{{ filtered().length !== 1 ? 's' : '' }}
        </span>

        <!-- Refresh -->
        <button
          (click)="load()"
          [disabled]="isLoading()"
          class="flex items-center gap-2 px-3.5 py-2 border border-gray-300 text-gray-600 rounded-lg
                 hover:bg-gray-50 transition-colors text-sm disabled:opacity-50">
          <svg class="w-4 h-4" [class.animate-spin]="isLoading()"
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          {{ isLoading() ? 'Loading…' : 'Refresh' }}
        </button>

        <!-- Excel export -->
        <button
          (click)="exportExcel()"
          [disabled]="isExporting() || isLoading()"
          class="flex items-center gap-2 px-3.5 py-2 border border-emerald-300 text-emerald-700 rounded-lg
                 hover:bg-emerald-50 transition-colors text-sm disabled:opacity-50">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          {{ isExporting() ? 'Exporting…' : 'Export Excel' }}
        </button>

        <!-- PDF export -->
        <button
          (click)="exportPdf()"
          [disabled]="isLoading()"
          class="flex items-center gap-2 px-3.5 py-2 border border-red-300 text-red-700 rounded-lg
                 hover:bg-red-50 transition-colors text-sm disabled:opacity-50">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
          </svg>
          Export PDF
        </button>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading()" class="flex justify-center items-center py-20">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span class="ml-3 text-gray-500 text-sm">Loading score report…</span>
      </div>

      <!-- Error -->
      <div *ngIf="error() && !isLoading()"
           class="bg-red-50 border border-red-200 rounded-lg p-6 text-center mb-6">
        <p class="text-red-600 text-sm mb-3">{{ error() }}</p>
        <button (click)="load()" class="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">
          Try Again
        </button>
      </div>

      <!-- Table -->
      <ng-container *ngIf="!isLoading() && !error()">

        <!-- KPI strip -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3">
            <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Total Applicants</p>
            <p class="text-2xl font-bold text-gray-900 mt-0.5">{{ report().length }}</p>
          </div>
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3">
            <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Scored</p>
            <p class="text-2xl font-bold text-blue-700 mt-0.5">{{ scoredCount() }}</p>
          </div>
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3">
            <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Top Score</p>
            <p class="text-2xl font-bold text-teal-700 mt-0.5">{{ topScore() }}</p>
          </div>
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3">
            <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Judges</p>
            <p class="text-2xl font-bold text-purple-700 mt-0.5">{{ judgeCount() }}</p>
          </div>
        </div>

        <!-- Scored table -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-gray-50 border-b border-gray-200">
                  <th class="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide w-8">#</th>
                  <th class="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Company</th>
                  <th class="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Entrepreneur</th>
                  <th class="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Sector</th>
                  <th
                    *ngFor="let j of allJudges()"
                    class="px-4 py-3 text-center text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {{ j }}
                  </th>
                  <th class="px-4 py-3 text-center text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr
                  *ngFor="let row of filtered(); let i = index"
                  class="hover:bg-gray-50 transition-colors"
                  [class.bg-blue-50]="row.totalScore > 0">

                  <td class="px-4 py-3 text-gray-400 text-xs tabular-nums">{{ i + 1 }}</td>

                  <td class="px-4 py-3">
                    <p class="font-medium text-gray-900 leading-tight">{{ row.companyName }}</p>
                  </td>

                  <td class="px-4 py-3 text-gray-600 text-xs">
                    {{ row.directorName || '—' }}
                  </td>

                  <td class="px-4 py-3">
                    <span *ngIf="row.industryName"
                          class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium
                                 bg-blue-100 text-blue-700">
                      {{ row.industryName }}
                    </span>
                    <span *ngIf="!row.industryName" class="text-gray-300 text-xs">—</span>
                  </td>

                  <!-- Per-judge score cell -->
                  <td
                    *ngFor="let j of allJudges()"
                    class="px-4 py-3 text-center tabular-nums">
                    <ng-container *ngIf="voteFor(row, j) as v; else noVote">
                      <span class="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold"
                            [class]="scoreClass(v.score)">
                        {{ v.score }}
                      </span>
                    </ng-container>
                    <ng-template #noVote>
                      <span class="text-gray-300 text-xs">—</span>
                    </ng-template>
                  </td>

                  <!-- Total -->
                  <td class="px-4 py-3 text-center">
                    <span *ngIf="row.totalScore > 0"
                          class="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold"
                          [class]="totalScoreClass(row.totalScore)">
                      {{ row.totalScore }}
                    </span>
                    <span *ngIf="row.totalScore === 0" class="text-gray-300 text-xs">—</span>
                  </td>
                </tr>

                <tr *ngIf="filtered().length === 0">
                  <td [attr.colspan]="4 + allJudges().length + 1"
                      class="px-4 py-12 text-center text-sm text-gray-400 italic">
                    No results match your search.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </ng-container>
    </div>
  `,
})
export class PresentationScoringComponent implements OnInit {
  report = signal<IScoreReportEntry[]>([]);
  isLoading = signal(false);
  isExporting = signal(false);
  error = signal<string | null>(null);

  searchQuery = '';
  scoredOnly = signal(false);

  constructor(
    private grantFundSvc: NodeGrantFundService,
    private pdfService: PdfService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.grantFundSvc.getScoreReport().subscribe({
      next: data => {
        // Sort by totalScore descending
        this.report.set([...data].sort((a, b) => b.totalScore - a.totalScore));
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Failed to load score report.');
        this.isLoading.set(false);
      },
    });
  }

  // ── Derived ──────────────────────────────────────────────────────────────

  allJudges = computed((): string[] => {
    const set = new Set<string>();
    for (const row of this.report()) {
      for (const v of row.votes) set.add(v.judge);
    }
    return Array.from(set).sort();
  });

  scoredCount = computed(() => this.report().filter(r => r.totalScore > 0).length);
  judgeCount  = computed(() => this.allJudges().length);
  topScore    = computed(() => Math.max(0, ...this.report().map(r => r.totalScore)));

  filtered = computed((): IScoreReportEntry[] => {
    const q = this.searchQuery.trim().toLowerCase();
    return this.report().filter(r => {
      if (this.scoredOnly() && r.totalScore === 0) return false;
      if (!q) return true;
      return (
        r.companyName.toLowerCase().includes(q) ||
        (r.directorName ?? '').toLowerCase().includes(q) ||
        (r.industryName ?? '').toLowerCase().includes(q)
      );
    });
  });

  toggleScoredOnly(): void { this.scoredOnly.update(v => !v); }

  voteFor(row: IScoreReportEntry, judge: string): IScoreVote | null {
    return row.votes.find(v => v.judge === judge) ?? null;
  }

  // ── Styling ──────────────────────────────────────────────────────────────

  scoreClass(score: number): string {
    if (score >= 40) return 'bg-teal-100 text-teal-800';
    if (score >= 30) return 'bg-blue-100 text-blue-800';
    if (score >= 20) return 'bg-amber-100 text-amber-800';
    return 'bg-gray-100 text-gray-600';
  }

  totalScoreClass(score: number): string {
    if (score >= 100) return 'bg-teal-600 text-white';
    if (score >= 70)  return 'bg-blue-600 text-white';
    if (score >= 40)  return 'bg-amber-500 text-white';
    return 'bg-gray-200 text-gray-700';
  }

  toggleClass(active: boolean): string {
    return active
      ? 'flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors'
      : 'flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 text-sm transition-colors';
  }

  // ── Exports ──────────────────────────────────────────────────────────────

  async exportExcel(): Promise<void> {
    this.isExporting.set(true);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      wb.creator = 'Incubator OS';
      wb.created = new Date();

      const ws = wb.addWorksheet('Presentation Scoring');
      ws.properties.defaultColWidth = 20;

      const judges = this.allJudges();
      const data   = this.filtered();

      // Header row
      const headerRow = ws.addRow([
        '#', 'Company Name', 'Entrepreneur', 'Sector',
        ...judges,
        'Total Score',
      ]);
      headerRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
        cell.alignment = { horizontal: 'center' };
      });

      data.forEach((row, idx) => {
        const judgeScores = judges.map(j => {
          const v = this.voteFor(row, j);
          return v ? v.score : '';
        });
        ws.addRow([
          idx + 1,
          row.companyName,
          row.directorName ?? '',
          row.industryName ?? '',
          ...judgeScores,
          row.totalScore || '',
        ]);
      });

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Presentation_Scoring_${this._dateStamp()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      this.isExporting.set(false);
    }
  }

  exportPdf(): void {
    const FF     = `font-family:'DejaVu Sans',sans-serif`;
    const judges = this.allJudges();
    const data   = this.filtered();
    const date   = new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' });

    // ── Score badge as nested table (DomPDF-safe, no inline-block) ──────────
    const scoreBadge = (score: number): string => {
      let bg = '#f3f4f6'; let color = '#6b7280';
      if (score >= 40) { bg = '#ccfbf1'; color = '#0f766e'; }
      else if (score >= 30) { bg = '#dbeafe'; color = '#1d4ed8'; }
      else if (score >= 20) { bg = '#fef3c7'; color = '#92400e'; }
      return `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 auto">
        <tr><td style="background:${bg};color:${color};padding:3px 8px;font-size:10px;
          font-weight:700;${FF};text-align:center">${score}</td></tr>
      </table>`;
    };

    const totalBadge = (score: number): string => {
      if (score === 0) return `<span style="color:#ccc;${FF}">—</span>`;
      let bg = '#6b7280'; let color = '#fff';
      if (score >= 100) { bg = '#0f766e'; }
      else if (score >= 70) { bg = '#1d4ed8'; }
      else if (score >= 40) { bg = '#d97706'; }
      return `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 auto">
        <tr><td style="background:${bg};color:${color};padding:3px 10px;font-size:11px;
          font-weight:700;${FF};text-align:center">${score}</td></tr>
      </table>`;
    };

    // ── Judge header cells ───────────────────────────────────────────────────
    const judgeHeaders = judges.map(j =>
      `<th style="background:#1e3a5f;color:#fff;padding:7px 10px;${FF};
        font-size:9px;text-align:center;border:1px solid #162d4a;
        white-space:nowrap">${j}</th>`
    ).join('');

    // ── Data rows ────────────────────────────────────────────────────────────
    const rows = data.map((row, i) => {
      const rowBg = i % 2 === 0 ? '#ffffff' : '#f8fafc';

      const judgeCells = judges.map(j => {
        const v = this.voteFor(row, j);
        const cell = v
          ? scoreBadge(v.score)
          : `<span style="color:#ccc;${FF}">—</span>`;
        return `<td style="text-align:center;padding:5px 6px;border:1px solid #e5e7eb;
          background:${rowBg};${FF}">${cell}</td>`;
      }).join('');

      const industrySector = row.industryName
        ? `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse">
            <tr><td style="background:#dbeafe;color:#1d4ed8;padding:2px 7px;
              font-size:9px;font-weight:700;${FF}">${row.industryName}</td></tr>
          </table>`
        : `<span style="color:#ccc;${FF}">—</span>`;

      return `
        <tr style="page-break-inside:avoid">
          <td style="padding:6px 8px;text-align:center;color:#9ca3af;font-size:10px;
            border:1px solid #e5e7eb;background:${rowBg};${FF}">${i + 1}</td>
          <td style="padding:6px 10px;font-weight:700;font-size:11px;color:#111827;
            border:1px solid #e5e7eb;background:${rowBg};${FF}">${row.companyName}</td>
          <td style="padding:6px 10px;color:#374151;font-size:10px;
            border:1px solid #e5e7eb;background:${rowBg};${FF}">${row.directorName ?? '—'}</td>
          <td style="padding:6px 8px;border:1px solid #e5e7eb;background:${rowBg};${FF}">
            ${industrySector}
          </td>
          ${judgeCells}
          <td style="text-align:center;padding:6px 8px;border:1px solid #e5e7eb;
            background:${rowBg};${FF}">${totalBadge(row.totalScore)}</td>
        </tr>`;
    }).join('');

    const html = `
      <html>
      <head>
      <style>
        @page { margin: 16px; }
        * { margin: 0; padding: 0; }
        body { ${FF}; font-size: 11px; color: #1a1a2e; background: #ffffff; }
        table { border-collapse: collapse; }
        td, th { vertical-align: middle; ${FF}; font-size: 11px; page-break-inside: avoid; }
        tr { page-break-inside: avoid; }
      </style>
      </head>
      <body>

        <!-- Header -->
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:14px">
          <tr>
            <td style="${FF};padding:0">
              <div style="font-size:18px;font-weight:700;color:#1e3a5f;${FF}">
                Presentation Scoring Report
              </div>
              <div style="font-size:10px;color:#6b7280;margin-top:3px;${FF}">
                Generated: ${date} &nbsp;&middot;&nbsp; ${data.length} applicant${data.length !== 1 ? 's' : ''} &nbsp;&middot;&nbsp; ${judges.length} judge${judges.length !== 1 ? 's' : ''}
              </div>
            </td>
          </tr>
        </table>

        <!-- Score table -->
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
          <thead>
            <tr>
              <th style="background:#1e3a5f;color:#fff;padding:7px 8px;${FF};
                font-size:9px;text-align:center;border:1px solid #162d4a;width:28px">#</th>
              <th style="background:#1e3a5f;color:#fff;padding:7px 10px;${FF};
                font-size:9px;text-align:left;border:1px solid #162d4a">Company</th>
              <th style="background:#1e3a5f;color:#fff;padding:7px 10px;${FF};
                font-size:9px;text-align:left;border:1px solid #162d4a">Entrepreneur</th>
              <th style="background:#1e3a5f;color:#fff;padding:7px 10px;${FF};
                font-size:9px;text-align:left;border:1px solid #162d4a">Sector</th>
              ${judgeHeaders}
              <th style="background:#1e3a5f;color:#fff;padding:7px 10px;${FF};
                font-size:9px;text-align:center;border:1px solid #162d4a">Total</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

      </body>
      </html>`;

    this.pdfService.downloadPdf(html, `Presentation_Scoring_${this._dateStamp()}.pdf`, 'A4', 'landscape');
  }

  private _dateStamp(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
