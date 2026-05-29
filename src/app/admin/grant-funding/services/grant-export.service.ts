import { Injectable } from '@angular/core';
import { PdfService } from '../../../../services/pdf/pdf.service';
import { IFinancialOverview, IFinancialOverviewApplicant, IFormAnalytics, IFormStageAnalytics, IFormQuestionAnalytics } from './grant-reports.service';

@Injectable({ providedIn: 'root' })
export class GrantExportService {

  constructor(private pdfService: PdfService) {}

  // ── Excel ──────────────────────────────────────────────────────────────────

  async exportExcel(overview: IFinancialOverview, filterLabels: string[] = [], statusLabels: Record<string, string> = {}): Promise<void> {
    // Lazy-import ExcelJS so it doesn't bloat the initial bundle
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Incubator OS';
    workbook.created = new Date();

    this._buildSummarySheet(workbook, overview, filterLabels);
    this._buildLeaderboardSheet(workbook, overview, filterLabels, statusLabels);

    const buffer = await workbook.xlsx.writeBuffer();
    this._downloadBuffer(
      buffer,
      `Grant_Funding_Report_${overview.workflow_id ?? 'report'}_${this._dateStamp()}.xlsx`,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  }

  // ── PDF ────────────────────────────────────────────────────────────────────

  exportPdf(overview: IFinancialOverview, filterLabels: string[] = [], statusLabels: Record<string, string> = {}, statusColors: Record<string, string> = {}): void {
    const html = this._buildPdfHtml(overview, filterLabels, statusLabels, statusColors);
    this.pdfService.downloadPdf(
      html,
      `Grant_Funding_Report_${overview.workflow_id ?? 'report'}_${this._dateStamp()}.pdf`,
      'A4',
      'landscape'
    );
  }

  // ── Excel sheet builders ───────────────────────────────────────────────────

  private _buildSummarySheet(workbook: any, overview: IFinancialOverview, filterLabels: string[] = []): void {
    const ws = workbook.addWorksheet('Summary');
    ws.properties.defaultColWidth = 22;

    // Title
    ws.mergeCells('A1:D1');
    const title = ws.getCell('A1');
    title.value = `Grant Funding Report — ${overview.workflow_id ?? ''}`;
    title.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF1F4E79' } };
    title.alignment = { horizontal: 'left' };
    ws.getRow(1).height = 30;

    ws.mergeCells('A2:D2');
    ws.getCell('A2').value = `Generated: ${new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' })}`;
    ws.getCell('A2').font = { name: 'Calibri', size: 10, color: { argb: 'FF6B7280' } };

    ws.addRow([]);

    // ── Applied Filters section ──────────────────────────────────────────────
    const filterRowStart = ws.rowCount + 1;
    ws.mergeCells(`A${filterRowStart}:D${filterRowStart}`);
    const filterHeader = ws.getCell(`A${filterRowStart}`);
    filterHeader.value = filterLabels.length > 0 ? 'FILTERED REPORT — Active Filters' : 'FULL DATASET — No filters applied';
    filterHeader.font = { name: 'Calibri', size: 11, bold: true, color: { argb: filterLabels.length > 0 ? 'FF92400E' : 'FF065F46' } };
    filterHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: filterLabels.length > 0 ? 'FFFEF3C7' : 'FFD1FAE5' } };
    filterHeader.border = {
      top: { style: 'medium', color: { argb: filterLabels.length > 0 ? 'FFF59E0B' : 'FF10B981' } },
      bottom: { style: 'thin', color: { argb: filterLabels.length > 0 ? 'FFF59E0B' : 'FF10B981' } },
    };
    filterHeader.alignment = { horizontal: 'left', indent: 1 };
    ws.getRow(filterRowStart).height = 22;

    if (filterLabels.length > 0) {
      for (const label of filterLabels) {
        const r = ws.rowCount + 1;
        ws.mergeCells(`A${r}:D${r}`);
        const cell = ws.getCell(`A${r}`);
        cell.value = `    •  ${label}`;
        cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF92400E' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
        cell.alignment = { horizontal: 'left', indent: 1 };
      }
      const summaryR = ws.rowCount + 1;
      ws.mergeCells(`A${summaryR}:D${summaryR}`);
      const summaryCell = ws.getCell(`A${summaryR}`);
      summaryCell.value = `    Showing ${overview.applicants.length} of ${overview.total_applicants} applicants`;
      summaryCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF6B7280' } };
      summaryCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
    } else {
      const r = ws.rowCount + 1;
      ws.mergeCells(`A${r}:D${r}`);
      const cell = ws.getCell(`A${r}`);
      cell.value = `    Showing all ${overview.applicants.length} applicants`;
      cell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF6B7280' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
    }

    ws.addRow([]);

    // KPI block header
    this._sectionHeader(ws, `A${ws.rowCount + 1}`, `D${ws.rowCount + 1}`, 'Key Performance Indicators');

    const kpiHeaders = ws.addRow(['Metric', 'Value', '', '']);
    kpiHeaders.getCell(1).font = { bold: true };
    kpiHeaders.getCell(2).font = { bold: true };

    const kpis: [string, string | number][] = [
      ['Total Applicants', overview.total_applicants],
      ['Applicants with Financial Data', overview.applicants_with_data],
      ['Applicants without Data', overview.total_applicants - overview.applicants_with_data],
      ['Total Pool Value (Turnover)', this._fmt(overview.total_pool_value)],
      ['Overall Active Months', overview.overall_active_months],
      ['Overall Captured Months', overview.overall_captured_months],
      ['Overall Avg / Active Month', this._fmt(overview.overall_avg_per_active_month)],
      ['Highest Single Avg / Month', this._fmt(overview.top_avg_per_month)],
    ];

    for (const [label, value] of kpis) {
      const row = ws.addRow([label, value]);
      row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      row.getCell(2).font = { bold: true, color: { argb: 'FF0F5132' } };
      row.getCell(1).border = { bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } } };
      row.getCell(2).border = { bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } } };
    }

    ws.addRow([]);

    // Consistency distribution
    this._sectionHeader(ws, `A${ws.rowCount + 1}`, `D${ws.rowCount + 1}`, 'Consistency Distribution');
    const appsWithData = overview.applicants.filter(a => a.captured_months > 0);
    const total = appsWithData.length || 1;
    const dist = ['Consistent', 'Moderate', 'Irregular'].map(l => ({
      label: l,
      count: appsWithData.filter(a => a.consistency_label === l).length,
    }));
    const cHead = ws.addRow(['Category', 'Count', '% of Applicants with Data', '']);
    cHead.eachCell((c: any) => { c.font = { bold: true }; });
    for (const { label, count } of dist) {
      const row = ws.addRow([label, count, `${((count / total) * 100).toFixed(1)}%`, '']);
      const color = label === 'Consistent' ? 'FFD1FAE5' : label === 'Moderate' ? 'FFFEF3C7' : 'FFFEE2E2';
      row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    }

    ws.columns[0].width = 34;
    ws.columns[1].width = 20;
    ws.columns[2].width = 26;
  }

  private _buildLeaderboardSheet(workbook: any, overview: IFinancialOverview, filterLabels: string[] = [], statusLabels: Record<string, string> = {}): void {
    const ws = workbook.addWorksheet('Leaderboard');

    // Title row
    ws.mergeCells('A1:J1');
    const title = ws.getCell('A1');
    title.value = `Applicant Financial Leaderboard — ${overview.workflow_id ?? ''}`;
    title.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FF1F4E79' } };
    ws.getRow(1).height = 24;

    // Filter banner on leaderboard sheet
    ws.mergeCells('A2:J2');
    const filterBanner = ws.getCell('A2');
    if (filterLabels.length > 0) {
      filterBanner.value = `FILTERED: ${filterLabels.join('  |  ')}  —  ${overview.applicants.length} of ${overview.total_applicants} applicants`;
      filterBanner.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF92400E' } };
      filterBanner.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
      filterBanner.border = { bottom: { style: 'thin', color: { argb: 'FFF59E0B' } } };
    } else {
      filterBanner.value = `Full dataset — all ${overview.applicants.length} applicants — no filters applied`;
      filterBanner.font = { name: 'Calibri', size: 9, color: { argb: 'FF6B7280' } };
      filterBanner.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    }
    filterBanner.alignment = { horizontal: 'left', indent: 1 };
    ws.getRow(2).height = 16;

    // Freeze through filter banner + column headers
    ws.views = [{ state: 'frozen', ySplit: 3 }];

    // Column headers
    const headers = [
      'Rank', 'Company Name', 'Status', 'Province',
      'Grand Total (R)', 'Avg / Active Month (R)', 'Active Months',
      'Captured Months', 'Consistency %', 'Consistency Label'
    ];
    const hRow = ws.addRow(headers);
    hRow.height = 18;
    hRow.eachCell((cell: any) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FF134E92' } },
        right: { style: 'hair', color: { argb: 'FF93C5FD' } },
      };
    });

    // Data rows
    for (const app of overview.applicants) {
      const row = ws.addRow([
        app.rank,
        app.company_name,
        statusLabels[app.status ?? ''] || app.status || '',
        app.province || '',
        app.grand_total,
        app.avg_per_active_month,
        app.active_months,
        app.captured_months,
        app.consistency_rate,
        app.consistency_label,
      ]);

      // Alternate row shading
      const bg = app.rank % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF';
      row.eachCell({ includeEmpty: true }, (cell: any) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      });

      // Currency cells
      row.getCell(5).numFmt = 'R#,##0.00';
      row.getCell(6).numFmt = 'R#,##0.00';

      // Consistency % cell
      row.getCell(9).numFmt = '0.0"%"';

      // Consistency label coloring
      const labelCell = row.getCell(10);
      const labelColors: Record<string, string> = {
        Consistent: 'FFD1FAE5',
        Moderate: 'FFFEF3C7',
        Irregular: 'FFFEE2E2',
      };
      if (labelColors[app.consistency_label]) {
        labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: labelColors[app.consistency_label] } };
      }

      // Top 3 rank styling
      if (app.rank <= 3) {
        const rankCell = row.getCell(1);
        const rankColors = ['FFFFF9C4', 'FFE5E7EB', 'FFFDE68A'];
        rankCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rankColors[app.rank - 1] } };
        rankCell.font = { bold: true };
      }

      // Grand total bar (conditional: teal for top 25%, green otherwise)
      const pct = overview.total_pool_value > 0 ? app.grand_total / overview.total_pool_value : 0;
      if (pct >= 0.08) {
        row.getCell(5).font = { bold: true, color: { argb: 'FF0F766E' } };
      }
    }

    // Column widths
    const widths = [7, 36, 14, 18, 18, 22, 16, 18, 16, 18];
    ws.columns.forEach((col: any, i: number) => { col.width = widths[i] ?? 14; });

    // Auto-filter on header row
    ws.autoFilter = { from: 'A2', to: 'J2' };

    // Summary totals row
    ws.addRow([]);
    const totalsRow = ws.addRow([
      '', 'TOTALS / AVERAGES', '', '',
      overview.total_pool_value,
      overview.overall_avg_per_active_month,
      overview.overall_active_months,
      overview.overall_captured_months,
      '', '',
    ]);
    totalsRow.eachCell({ includeEmpty: true }, (cell: any) => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
    });
    totalsRow.getCell(5).numFmt = 'R#,##0.00';
    totalsRow.getCell(6).numFmt = 'R#,##0.00';
  }

  // ── PDF HTML builder ───────────────────────────────────────────────────────

  private _buildPdfHtml(overview: IFinancialOverview, filterLabels: string[] = [], statusLabels: Record<string, string> = {}, statusColors: Record<string, string> = {}): string {
    const FF = `font-family:'DejaVu Sans',sans-serif`;
    const stageLabel = (key?: string) => this._esc(statusLabels[key ?? ''] || key || '—');

    // Hex palette matched to workflow stage color names
    const stagePalette: Record<string, { bg: string; text: string }> = {
      blue:   { bg: '#dbeafe', text: '#1d4ed8' },
      orange: { bg: '#ffedd5', text: '#c2410c' },
      teal:   { bg: '#ccfbf1', text: '#0f766e' },
      indigo: { bg: '#e0e7ff', text: '#4338ca' },
      red:    { bg: '#fee2e2', text: '#dc2626' },
      green:  { bg: '#dcfce7', text: '#15803d' },
      purple: { bg: '#f3e8ff', text: '#7c3aed' },
      yellow: { bg: '#fef9c3', text: '#a16207' },
      gray:   { bg: '#f3f4f6', text: '#374151' },
    };
    const stageBadge = (key?: string) => {
      const color = statusColors[key ?? ''] ?? 'gray';
      return stagePalette[color] ?? stagePalette['gray'];
    };
    const date = new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' });
    const isFiltered = filterLabels.length > 0;

    // Filter banner HTML block
    const filterBannerHtml = isFiltered
      ? `
  <!-- ══ FILTER BANNER ════════════════════════════════════════════════ -->
  <table width="100%" style="margin-bottom:18px;border-collapse:collapse">
    <tr>
      <td style="background:#fef3c7;border:2px solid #f59e0b;border-radius:6px;padding:12px 18px">
        <table width="100%" style="border-collapse:collapse">
          <tr>
            <td style="vertical-align:middle">
              <table style="border-collapse:collapse;margin-bottom:7px">
                <tr>
                  <td style="vertical-align:middle;padding-right:8px">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#92400e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </td>
                  <td style="vertical-align:middle">
                    <span style="font-size:11px;font-weight:700;color:#92400e;letter-spacing:.04em">
                      FILTERED REPORT &mdash; This export reflects only the selection below
                    </span>
                  </td>
                </tr>
              </table>
              <table style="border-collapse:collapse">
                <tr>
                  ${filterLabels.map(l => `
                  <td style="padding-right:8px;padding-bottom:4px">
                    <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;display:inline-table">
                      <tr>
                        <td style="background:#fffbeb;border:1px solid #f59e0b;
                          padding:4px 10px;font-size:10px;font-weight:700;color:#92400e">
                          ${this._esc(l)}
                        </td>
                      </tr>
                    </table>
                  </td>`).join('')}
                </tr>
              </table>
            </td>
            <td style="text-align:right;vertical-align:middle;white-space:nowrap;padding-left:16px">
              <div style="font-size:18px;font-weight:700;color:#92400e">${overview.applicants.length}</div>
              <div style="font-size:9px;color:#b45309;margin-top:2px">of ${overview.total_applicants} applicants</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`
      : `
  <!-- ══ FULL DATASET BADGE ═══════════════════════════════════════════ -->
  <table width="100%" style="margin-bottom:18px;border-collapse:collapse">
    <tr>
      <td style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:8px 18px">
        <table style="border-collapse:collapse">
          <tr>
            <td style="vertical-align:middle;padding-right:8px">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17l-5-5" stroke="#065f46" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </td>
            <td style="vertical-align:middle">
              <span style="font-size:10px;font-weight:700;color:#065f46">FULL DATASET</span>
              <span style="font-size:10px;color:#6b7280;margin-left:10px">No filters applied &mdash; all ${overview.applicants.length} applicants included</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
    const appsWithData = overview.applicants.filter(a => a.captured_months > 0);
    const consistent  = appsWithData.filter(a => a.consistency_label === 'Consistent').length;
    const moderate    = appsWithData.filter(a => a.consistency_label === 'Moderate').length;
    const irregular   = appsWithData.filter(a => a.consistency_label === 'Irregular').length;
    const totalWithData = appsWithData.length || 1;

    const consistentPct = Math.round((consistent / totalWithData) * 100);
    const moderatePct   = Math.round((moderate   / totalWithData) * 100);
    const irregularPct  = Math.round((irregular  / totalWithData) * 100);

    const leaderboardRows = overview.applicants.map(app => {
      const rowBg = app.rank % 2 === 0 ? '#f8fafc' : '#ffffff';
      const rankColor =
        app.rank === 1 ? '#92400e' :
        app.rank === 2 ? '#374151' :
        app.rank === 3 ? '#9a3412' : '#374151';
      const rankBg =
        app.rank === 1 ? '#fef3c7' :
        app.rank === 2 ? '#f3f4f6' :
        app.rank === 3 ? '#ffedd5' : 'transparent';
      const conBg    = app.consistency_label === 'Consistent' ? '#d1fae5' : app.consistency_label === 'Moderate' ? '#fef3c7' : '#fee2e2';
      const conColor = app.consistency_label === 'Consistent' ? '#065f46' : app.consistency_label === 'Moderate' ? '#92400e' : '#991b1b';

      return `
        <tr style="background:${rowBg}">
          <td style="text-align:center;padding:8px 6px;border-bottom:1px solid #e5e7eb;${FF}">
            <table cellpadding="0" cellspacing="0" style="margin:0 auto;border-collapse:collapse">
              <tr>
                <td style="background:${rankBg};padding:2px 7px;font-weight:bold;
                  color:${rankColor};font-size:11px;${FF}">
                  ${app.rank}
                </td>
              </tr>
            </table>
          </td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-weight:${app.rank <= 3 ? '600' : 'normal'};${FF}">
            ${this._esc(app.company_name)}
          </td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;${FF}">
            <table cellpadding="0" cellspacing="0" style="margin:0 auto;border-collapse:collapse">
              <tr>
                <td style="background:${stageBadge(app.status).bg};color:${stageBadge(app.status).text};
                  padding:3px 10px;font-size:10px;font-weight:700;${FF}">
                  ${stageLabel(app.status)}
                </td>
              </tr>
            </table>
          </td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right;
            font-weight:700;color:#0f766e;white-space:nowrap;${FF}">
            ${this._fmt(app.grand_total)}
          </td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right;
            color:#1d4ed8;white-space:nowrap;${FF}">
            ${this._fmt(app.avg_per_active_month)}
          </td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;color:#374151;${FF}">
            ${app.active_months} / ${app.captured_months}
          </td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;${FF}">
            <table cellpadding="0" cellspacing="0" style="margin:0 auto;border-collapse:collapse">
              <tr>
                <td style="background:${conBg};color:${conColor};padding:3px 9px;
                  font-size:10px;font-weight:700;${FF}">
                  ${app.consistency_label}
                </td>
              </tr>
            </table>
            <div style="font-size:9px;color:#9ca3af;margin-top:3px;${FF}">${app.consistency_rate}%</div>
          </td>
        </tr>`;
    }).join('');

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page { margin: 16px; }
  * { margin: 0; padding: 0; }
  body {
    font-family: 'DejaVu Sans', sans-serif;
    font-size: 12px;
    color: #1a1a2e;
    background: #ffffff;
  }
  table { border-collapse: collapse; }
  td, th { vertical-align: top; font-family: 'DejaVu Sans', sans-serif; font-size: 12px;
    page-break-inside: avoid; }
  tr { page-break-inside: avoid; }
</style>
</head>
<body>
<div style="padding: 32px 36px;">

  <!-- ══ HEADER ══════════════════════════════════════════════════════ -->
  <table width="100%" style="margin-bottom:22px;border-bottom:3px solid #1e3a8a;padding-bottom:16px">
    <tr>
      <td>
        <div style="font-size:22px;font-weight:700;color:#1e3a5f;letter-spacing:-0.3px">
          Grant Funding Report
        </div>
        <div style="font-size:11px;color:#6b7280;margin-top:5px">
          Workflow: <strong>${this._esc(overview.workflow_id ?? '')}</strong>
          &nbsp;&nbsp;|&nbsp;&nbsp;
          Generated: <strong>${date}</strong>
        </div>
      </td>
      <td style="text-align:right;vertical-align:top">
        <div style="font-size:13px;font-weight:700;color:#1e3a5f">Incubator OS</div>
        <div style="font-size:10px;color:#9ca3af;margin-top:3px">Confidential</div>
      </td>
    </tr>
  </table>

  ${filterBannerHtml}

  <!-- ══ KPI CARDS ════════════════════════════════════════════════════ -->
  <table width="100%" style="margin-bottom:24px;border-spacing:0">
    <tr>
      <td width="25%" style="padding-right:8px">
        <table width="100%" style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px">
          <tr>
            <td style="padding:14px 16px">
              <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#0369a1;margin-bottom:6px">
                Total Applicants
              </div>
              <div style="font-size:26px;font-weight:700;color:#0c4a6e;line-height:1">${overview.total_applicants}</div>
              <div style="font-size:10px;color:#0284c7;margin-top:6px">${overview.applicants_with_data} with financial data</div>
            </td>
          </tr>
        </table>
      </td>
      <td width="25%" style="padding-right:8px">
        <table width="100%" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px">
          <tr>
            <td style="padding:14px 16px">
              <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#15803d;margin-bottom:6px">
                Total Pool Value
              </div>
              <div style="font-size:22px;font-weight:700;color:#14532d;line-height:1">${this._fmt(overview.total_pool_value)}</div>
              <div style="font-size:10px;color:#16a34a;margin-top:6px">Combined turnover</div>
            </td>
          </tr>
        </table>
      </td>
      <td width="25%" style="padding-right:8px">
        <table width="100%" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px">
          <tr>
            <td style="padding:14px 16px">
              <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#1d4ed8;margin-bottom:6px">
                Avg / Active Month
              </div>
              <div style="font-size:22px;font-weight:700;color:#1e3a8a;line-height:1">${this._fmt(overview.overall_avg_per_active_month)}</div>
              <div style="font-size:10px;color:#2563eb;margin-top:6px">${overview.overall_active_months} active months</div>
            </td>
          </tr>
        </table>
      </td>
      <td width="25%">
        <table width="100%" style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:6px">
          <tr>
            <td style="padding:14px 16px">
              <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#7c3aed;margin-bottom:6px">
                Top Avg / Month
              </div>
              <div style="font-size:22px;font-weight:700;color:#4c1d95;line-height:1">${this._fmt(overview.top_avg_per_month)}</div>
              <div style="font-size:10px;color:#9333ea;margin-top:6px">Highest single applicant</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- ══ SECTION TITLE: Consistency ══════════════════════════════════ -->
  <table width="100%" style="margin-bottom:10px">
    <tr>
      <td>
        <div style="font-size:12px;font-weight:700;color:#1e3a5f;
          border-left:4px solid #1d4ed8;padding-left:10px;margin-bottom:12px">
          Consistency Distribution
        </div>
      </td>
    </tr>
  </table>

  <!-- Consistency bar — 3 cells -->
  <table width="100%" style="margin-bottom:24px;border-spacing:0">
    <tr>
      <td width="33%" style="padding-right:6px">
        <table width="100%" style="background:#d1fae5;border-radius:6px">
          <tr>
            <td style="padding:12px 16px;text-align:center">
              <div style="font-size:24px;font-weight:700;color:#065f46">${consistent}</div>
              <div style="font-size:10px;font-weight:700;color:#047857;margin-top:3px">CONSISTENT</div>
              <div style="font-size:9px;color:#6b7280;margin-top:2px">${consistentPct}% of applicants</div>
            </td>
          </tr>
        </table>
      </td>
      <td width="33%" style="padding-right:6px">
        <table width="100%" style="background:#fef3c7;border-radius:6px">
          <tr>
            <td style="padding:12px 16px;text-align:center">
              <div style="font-size:24px;font-weight:700;color:#92400e">${moderate}</div>
              <div style="font-size:10px;font-weight:700;color:#b45309;margin-top:3px">MODERATE</div>
              <div style="font-size:9px;color:#6b7280;margin-top:2px">${moderatePct}% of applicants</div>
            </td>
          </tr>
        </table>
      </td>
      <td width="33%">
        <table width="100%" style="background:#fee2e2;border-radius:6px">
          <tr>
            <td style="padding:12px 16px;text-align:center">
              <div style="font-size:24px;font-weight:700;color:#991b1b">${irregular}</div>
              <div style="font-size:10px;font-weight:700;color:#b91c1c;margin-top:3px">IRREGULAR</div>
              <div style="font-size:9px;color:#6b7280;margin-top:2px">${irregularPct}% of applicants</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- ══ SECTION TITLE: Leaderboard ══════════════════════════════════ -->
  <table width="100%" style="margin-bottom:10px">
    <tr>
      <td>
        <div style="font-size:12px;font-weight:700;color:#1e3a5f;
          border-left:4px solid #1d4ed8;padding-left:10px;margin-bottom:12px">
          Applicant Leaderboard — ranked by total turnover
        </div>
      </td>
    </tr>
  </table>

  <!-- ══ LEADERBOARD TABLE ════════════════════════════════════════════ -->
  <table width="100%" style="border-collapse:collapse;font-size:11px">
    <thead>
      <tr style="background:#1e3a5f">
        <th style="padding:10px 8px;color:#fff;text-align:center;font-weight:700;
          border-right:1px solid #2d4e7a;width:40px">#</th>
        <th style="padding:10px 12px;color:#fff;text-align:left;font-weight:700;
          border-right:1px solid #2d4e7a">Company</th>
        <th style="padding:10px 12px;color:#fff;text-align:center;font-weight:700;
          border-right:1px solid #2d4e7a;width:90px">Stage</th>
        <th style="padding:10px 12px;color:#fff;text-align:right;font-weight:700;
          border-right:1px solid #2d4e7a;white-space:nowrap;width:110px">Grand Total</th>
        <th style="padding:10px 12px;color:#fff;text-align:right;font-weight:700;
          border-right:1px solid #2d4e7a;white-space:nowrap;width:110px">Avg / Month</th>
        <th style="padding:10px 12px;color:#fff;text-align:center;font-weight:700;
          border-right:1px solid #2d4e7a;white-space:nowrap;width:90px">Active / Cap.</th>
        <th style="padding:10px 12px;color:#fff;text-align:center;font-weight:700;
          width:100px">Consistency</th>
      </tr>
    </thead>
    <tbody>
      ${leaderboardRows}
    </tbody>
    <tfoot>
      <tr style="background:#e0f2fe">
        <td style="padding:10px 8px;border-top:2px solid #0284c7;text-align:center;${FF}"></td>
        <td style="padding:10px 12px;border-top:2px solid #0284c7;font-weight:700;color:#0c4a6e;${FF}">
          TOTALS / AVERAGES
        </td>
        <td style="padding:10px 12px;border-top:2px solid #0284c7;${FF}"></td>
        <td style="padding:10px 12px;border-top:2px solid #0284c7;text-align:right;
          font-weight:700;color:#0f766e;white-space:nowrap;${FF}">
          ${this._fmt(overview.total_pool_value)}
        </td>
        <td style="padding:10px 12px;border-top:2px solid #0284c7;text-align:right;
          font-weight:700;color:#1d4ed8;white-space:nowrap;${FF}">
          ${this._fmt(overview.overall_avg_per_active_month)}
        </td>
        <td style="padding:10px 12px;border-top:2px solid #0284c7;text-align:center;font-weight:700;color:#374151;${FF}">
          ${overview.overall_active_months} / ${overview.overall_captured_months}
        </td>
        <td style="padding:10px 12px;border-top:2px solid #0284c7;${FF}"></td>
      </tr>
    </tfoot>
  </table>

  <!-- ══ FOOTER ════════════════════════════════════════════════════════ -->
  <table width="100%" style="margin-top:28px;border-top:1px solid #e5e7eb">
    <tr>
      <td style="padding-top:10px;text-align:center;font-size:9px;color:#9ca3af;${FF}">
        Generated by <strong style="${FF}">Incubator OS</strong>
        &nbsp;&nbsp;·&nbsp;&nbsp; ${date}
        &nbsp;&nbsp;·&nbsp;&nbsp; Confidential — For internal use only
      </td>
    </tr>
  </table>

</div>
</body>
</html>`;
  }

  // ── Form Analytics — Excel ────────────────────────────────────────────────

  async exportFormsExcel(analytics: IFormAnalytics): Promise<void> {
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Incubator OS';
    workbook.created = new Date();

    // ── Summary sheet ───────────────────────────────────────────────────────
    const ws = workbook.addWorksheet('Summary');
    ws.properties.defaultColWidth = 20;

    ws.mergeCells('A1:D1');
    const title = ws.getCell('A1');
    title.value = `Form Analytics — ${analytics.workflow_name}`;
    title.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FF1F4E79' } };
    ws.getRow(1).height = 28;

    ws.mergeCells('A2:D2');
    ws.getCell('A2').value = `Generated: ${new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' })}`;
    ws.getCell('A2').font = { name: 'Calibri', size: 10, color: { argb: 'FF6B7280' } };
    ws.addRow([]);

    const statsRow = ws.addRow(['Total Applicants', analytics.total_applicants, '', '']);
    statsRow.getCell(1).font = { bold: true };
    ws.addRow(['Stages with Forms', analytics.stage_count, '', '']);
    ws.addRow([]);

    for (const stage of analytics.stages) {
      this._sectionHeader(ws, `A${ws.rowCount + 1}`, `D${ws.rowCount + 1}`,
        `${stage.stage_label} — ${stage.template_name}`);

      ws.addRow(['Submissions', stage.total_submissions, 'Submitted', stage.submitted_count]);
      ws.addRow(['', '', 'Draft', stage.draft_count]);
      ws.addRow([]);
    }

    ws.columns[0].width = 36;
    ws.columns[1].width = 16;
    ws.columns[2].width = 16;
    ws.columns[3].width = 16;

    // ── One sheet per stage ────────────────────────────────────────────────
    for (const stage of analytics.stages) {
      if (stage.sections.length === 0) continue;
      const sheetName = stage.stage_label.slice(0, 31); // Excel limit
      const sw = workbook.addWorksheet(sheetName);
      sw.properties.defaultColWidth = 18;

      sw.mergeCells('A1:E1');
      const stageTitle = sw.getCell('A1');
      stageTitle.value = `${stage.stage_label} — ${stage.template_name}`;
      stageTitle.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FF1F4E79' } };
      sw.getRow(1).height = 22;

      sw.mergeCells('A2:E2');
      sw.getCell('A2').value = `${stage.submitted_count} submitted  |  ${stage.draft_count} draft  |  ${stage.total_submissions} total`;
      sw.getCell('A2').font = { name: 'Calibri', size: 10, color: { argb: 'FF6B7280' } };
      sw.addRow([]);

      for (const section of stage.sections) {
        this._sectionHeader(sw, `A${sw.rowCount + 1}`, `E${sw.rowCount + 1}`, section.title);

        const hRow = sw.addRow(['Question', 'Type', 'Response', 'Count', 'Response Rate']);
        hRow.eachCell((c: any) => { c.font = { bold: true }; });

        for (const q of section.questions) {
          if (q.type === 'boolean') {
            for (const opt of ['Yes', 'No']) {
              const count = (q.breakdown as Record<string, number>)[opt] ?? 0;
              const rate = q.total_answered > 0 ? `${Math.round((count / q.total_answered) * 100)}%` : '0%';
              const row = sw.addRow([q.label, q.type, opt, count, rate]);
              row.getCell(3).fill = { type: 'pattern', pattern: 'solid',
                fgColor: { argb: opt === 'Yes' ? 'FFD1FAE5' : 'FFFEE2E2' } };
            }
          } else if (q.type === 'select') {
            const opts = q.options?.length ? q.options : Object.keys(q.breakdown ?? {});
            for (const opt of opts) {
              const count = (q.breakdown as Record<string, number>)[opt] ?? 0;
              const rate = q.total_answered > 0 ? `${Math.round((count / q.total_answered) * 100)}%` : '0%';
              sw.addRow([q.label, q.type, opt, count, rate]);
            }
          } else if (q.type === 'number' && q.stats) {
            sw.addRow([q.label, q.type, 'Min', q.stats.min, '']);
            sw.addRow(['', '', 'Avg', q.stats.avg, '']);
            sw.addRow(['', '', 'Max', q.stats.max, '']);
            sw.addRow(['', '', 'Sum', q.stats.sum, '']);
          }
          sw.addRow([]);
        }
      }

      sw.columns[0].width = 48;
      sw.columns[1].width = 12;
      sw.columns[2].width = 18;
      sw.columns[3].width = 10;
      sw.columns[4].width = 14;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    this._downloadBuffer(
      buffer,
      `Grant_Form_Analytics_${analytics.workflow_id}_${this._dateStamp()}.xlsx`,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  }

  // ── Form Analytics — PDF ──────────────────────────────────────────────────

  exportFormsPdf(analytics: IFormAnalytics): void {
    const html = this._buildFormsPdfHtml(analytics);
    this.pdfService.downloadPdf(
      html,
      `Grant_Form_Analytics_${analytics.workflow_id}_${this._dateStamp()}.pdf`,
      'A4',
      'portrait'
    );
  }

  private _buildFormsPdfHtml(analytics: IFormAnalytics): string {

    const date = new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' });
    const FF = `font-family:'DejaVu Sans',sans-serif`;

    const stagesHtml = analytics.stages.map(stage => {
      const dotColor: Record<string, string> = {
        blue: '#3b82f6', orange: '#f97316', teal: '#14b8a6',
        indigo: '#6366f1', red: '#ef4444', green: '#22c55e', purple: '#a855f7',
      };
      const color = dotColor[stage.stage_color] ?? '#6b7280';

      const submissionBadge = stage.submitted_count > 0
        ? `<span style="background:#d1fae5;color:#065f46;padding:2px 8px;font-size:9px;font-weight:700;${FF}">${stage.submitted_count} submitted</span>`
        : '';
      const draftBadge = stage.draft_count > 0
        ? `<span style="background:#fef3c7;color:#92400e;padding:2px 8px;font-size:9px;font-weight:700;margin-left:4px;${FF}">${stage.draft_count} draft</span>`
        : '';
      const noBadge = stage.total_submissions === 0
        ? `<span style="background:#f3f4f6;color:#6b7280;padding:2px 8px;font-size:9px;${FF}">no submissions</span>`
        : '';

      const sectionsHtml = stage.sections.map(section => {
        const questionsHtml = section.questions.map(q => {
          let chartHtml = '';

          if (q.type === 'boolean') {
            const opts = [
              { key: 'Yes', bg: '#d1fae5', color: '#065f46', bar: '#10b981' },
              { key: 'No',  bg: '#fee2e2', color: '#991b1b', bar: '#f87171' },
            ];
            chartHtml = opts.map(o => {
              const count = (q.breakdown as Record<string, number>)[o.key] ?? 0;
              const pct = q.total_answered > 0 ? Math.round((count / q.total_answered) * 100) : 0;
              return `
              <tr>
                <td style="width:46px;padding:3px 6px 3px 0;${FF}">
                  <table cellpadding="0" cellspacing="0" style="border-collapse:collapse">
                    <tr>
                      <td style="background:${o.bg};color:${o.color};text-align:center;
                        font-size:9px;font-weight:700;padding:2px 6px;${FF}">
                        ${o.key}
                      </td>
                    </tr>
                  </table>
                </td>
                <td style="padding:3px 6px 3px 0;${FF}">
                  <table width="200" style="border-collapse:collapse;height:10px">
                    <tr>
                      <td width="${pct}%" style="background:${o.bar};height:10px;padding:0;font-size:0">&nbsp;</td>
                      <td style="background:#f3f4f6;height:10px;padding:0;font-size:0">&nbsp;</td>
                    </tr>
                  </table>
                </td>
                <td style="padding:3px 0;font-weight:700;font-size:11px;width:20px;text-align:right;${FF}">${count}</td>
                <td style="padding:3px 0 3px 8px;font-size:10px;color:#9ca3af;width:34px;text-align:right;${FF}">${pct}%</td>
              </tr>`;
            }).join('');
          } else if (q.type === 'select') {
            const opts = q.options?.length ? q.options : Object.keys(q.breakdown ?? {});
            chartHtml = opts.map(opt => {
              const count = (q.breakdown as Record<string, number>)[opt] ?? 0;
              const pct = q.total_answered > 0 ? Math.round((count / q.total_answered) * 100) : 0;
              return `
              <tr>
                <td style="width:90px;padding:3px 6px 3px 0;font-size:10px;color:#374151;${FF}">${this._esc(opt)}</td>
                <td style="padding:3px 6px 3px 0;${FF}">
                  <table width="160" style="border-collapse:collapse;height:10px">
                    <tr>
                      <td width="${pct}%" style="background:#3b82f6;height:10px;padding:0;font-size:0">&nbsp;</td>
                      <td style="background:#f3f4f6;height:10px;padding:0;font-size:0">&nbsp;</td>
                    </tr>
                  </table>
                </td>
                <td style="padding:3px 0;font-weight:700;font-size:11px;width:20px;text-align:right;${FF}">${count}</td>
                <td style="padding:3px 0 3px 8px;font-size:10px;color:#9ca3af;width:34px;text-align:right;${FF}">${pct}%</td>
              </tr>`;
            }).join('');
          } else if (q.type === 'number' && q.stats) {
            chartHtml = `
              <tr>
                <td style="padding:4px 0;${FF}">
                  <table style="border-collapse:collapse">
                    <tr>
                      <td style="padding:6px 14px;background:#f9fafb;border-radius:4px;text-align:center;padding-right:20px;${FF}">
                        <div style="font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;${FF}">Min</div>
                        <div style="font-size:13px;font-weight:700;color:#374151;${FF}">${q.stats.min}</div>
                      </td>
                      <td style="padding:6px 14px;background:#eff6ff;border-radius:4px;text-align:center;padding-right:20px;${FF}">
                        <div style="font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;${FF}">Avg</div>
                        <div style="font-size:13px;font-weight:700;color:#1d4ed8;${FF}">${q.stats.avg}</div>
                      </td>
                      <td style="padding:6px 14px;background:#f9fafb;border-radius:4px;text-align:center;padding-right:20px;${FF}">
                        <div style="font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;${FF}">Max</div>
                        <div style="font-size:13px;font-weight:700;color:#374151;${FF}">${q.stats.max}</div>
                      </td>
                      <td style="padding:6px 14px;background:#f0fdf4;border-radius:4px;text-align:center;${FF}">
                        <div style="font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;${FF}">Total</div>
                        <div style="font-size:13px;font-weight:700;color:#065f46;${FF}">${q.stats.sum}</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>`;
          }

          const responsePct = q.total_possible > 0
            ? Math.round((q.total_answered / q.total_possible) * 100) : 0;

          return `
          <tr>
            <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;vertical-align:top;${FF}">
              <table width="100%" style="border-collapse:collapse;margin-bottom:6px">
                <tr>
                  <td style="font-size:11px;font-weight:600;color:#374151;${FF}">${this._esc(q.label)}</td>
                  <td style="font-size:9px;color:#9ca3af;white-space:nowrap;text-align:right;${FF}">
                    ${q.total_answered}/${q.total_possible} &mdash; ${responsePct}%
                  </td>
                </tr>
              </table>
              <table style="border-collapse:collapse">
                ${chartHtml}
              </table>
            </td>
          </tr>`;
        }).join('');

        return `
        <table width="100%" style="border-collapse:collapse;margin-bottom:16px;page-break-inside:avoid">
          <tr>
            <td style="background:#f8fafc;padding:7px 12px;border:1px solid #e5e7eb;
              border-radius:4px 4px 0 0;${FF}">
              <span style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;
                letter-spacing:.06em;${FF}">${this._esc(section.title)}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:0;border:1px solid #e5e7eb;border-top:none;${FF}">
              <table width="100%" style="border-collapse:collapse">
                ${questionsHtml}
              </table>
            </td>
          </tr>
        </table>`;
      }).join('');

      return `
      <!-- ── Stage block ── -->
      <table width="100%" style="border-collapse:collapse;margin-bottom:28px">
        <tr>
          <td style="padding-bottom:10px;${FF}">
            <table width="100%" style="border-collapse:collapse">
              <tr>
                <td style="vertical-align:middle;${FF}">
                  <span style="color:${color};font-size:14px;vertical-align:middle;margin-right:6px">&bull;</span>
                  <span style="font-size:14px;font-weight:700;color:#1f2937;${FF}">${this._esc(stage.stage_label)}</span>
                  <span style="font-size:11px;color:#9ca3af;padding-left:8px;${FF}">${this._esc(stage.template_name)}</span>
                </td>
                <td style="text-align:right;vertical-align:middle;white-space:nowrap;${FF}">
                  ${submissionBadge}${draftBadge}${noBadge}
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="${FF}">
            ${sectionsHtml}
          </td>
        </tr>
      </table>`;
    }).join('');

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page { margin: 16px; }
  * { margin: 0; padding: 0; }
  body { font-family: 'DejaVu Sans', sans-serif; font-size:12px; color:#1a1a2e; background:#fff; }
  table { border-collapse:collapse; }
  td, th { vertical-align:top; font-family: 'DejaVu Sans', sans-serif; page-break-inside: avoid; }
  tr { page-break-inside: avoid; }
</style>
</head>
<body>
<div style="padding:28px 32px">

  <!-- HEADER -->
  <table width="100%" style="margin-bottom:20px;border-bottom:3px solid #1e3a8a;padding-bottom:14px;border-collapse:collapse">
    <tr>
      <td style="${FF}">
        <div style="font-size:20px;font-weight:700;color:#1e3a5f;${FF}">Form Analytics Report</div>
        <div style="font-size:11px;color:#6b7280;margin-top:4px;${FF}">
          ${this._esc(analytics.workflow_name)}
          &nbsp;&nbsp;|&nbsp;&nbsp;
          ${analytics.total_applicants} applicants &nbsp;&middot;&nbsp; ${analytics.stage_count} stages
          &nbsp;&nbsp;|&nbsp;&nbsp; Generated: <strong>${date}</strong>
        </div>
      </td>
      <td style="text-align:right;vertical-align:top;${FF}">
        <div style="font-size:13px;font-weight:700;color:#1e3a5f;${FF}">Incubator OS</div>
        <div style="font-size:10px;color:#9ca3af;margin-top:2px;${FF}">Confidential</div>
      </td>
    </tr>
  </table>

  ${stagesHtml}

  <!-- FOOTER -->
  <table width="100%" style="margin-top:24px;border-top:1px solid #e5e7eb;border-collapse:collapse">
    <tr>
      <td style="padding-top:10px;text-align:center;font-size:9px;color:#9ca3af;${FF}">
        Generated by <strong>Incubator OS</strong>
        &nbsp;&middot;&nbsp; ${date}
        &nbsp;&middot;&nbsp; Confidential &mdash; For internal use only
      </td>
    </tr>
  </table>

</div>
</body>
</html>`;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private _fmt(value: number): string {
    if (!value) return 'R0';
    if (value >= 1_000_000) return `R${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `R${(value / 1_000).toFixed(1)}K`;
    return `R${value.toFixed(2)}`;
  }

  private _esc(s: string): string {
    return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private _dateStamp(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private _downloadBuffer(buffer: ArrayBuffer, filename: string, mimeType: string): void {
    const blob = new Blob([buffer], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private _sectionHeader(ws: any, from: string, to: string, text: string): void {
    ws.mergeCells(`${from}:${to}`);
    const cell = ws.getCell(from);
    cell.value = text;
    cell.font = { bold: true, color: { argb: 'FF1F4E79' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FF93C5FD' } } };
    ws.getRow(ws.rowCount).height = 20;
  }
}
