import { Injectable } from '@angular/core';
import { PdfService } from '../../../../services/pdf/pdf.service';
import { IGrantApplicationData, FY_MONTH_COLUMNS } from '../interfaces/grant-application.interfaces';
import { FormTemplate, IFormQuestion } from '../../form-templates/interfaces/form-template.interfaces';

// ── Export payload types ───────────────────────────────────────────────────────

export interface BankSummaryRow {
  financial_year_name: string;
  months: (number | undefined)[];
  total: number;
  activeMonths: number;
  capturedMonths: number;
}

export interface JudgeExportRow {
  name: string;
  submissionId: number;
  scores: Record<string, number>;
  answers: Record<string, any>;
  total: number;
  submittedAt: string;
}

export interface IInterviewExportPayload {
  applicantData: IGrantApplicationData;
  companyName: string;
  stageName: string;
  template: FormTemplate;
  answers: Record<string, any>;
  interviewerNotes?: string;
  decisionValue?: string;
  submissionStatus?: string;
  isMultiJudge: boolean;
  judgeRows: JudgeExportRow[];
  criteriaList: { id: string; label: string; max: number }[];
  criteriaAverages: Record<string, number>;
  judgeMaxTotal: number;
  judgeAverage: number;
  bankStatementRows: BankSummaryRow[];
}

// ── Service ────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ApplicantExportService {

  constructor(private pdfService: PdfService) {}

  // ── Public API ─────────────────────────────────────────────────────────────

  async exportInterviewExcel(payload: IInterviewExportPayload): Promise<void> {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Incubator OS';
    wb.created = new Date();

    this._buildProfileSheet(wb, payload);
    this._buildBankSheet(wb, payload);
    if (payload.isMultiJudge) {
      // Multi-judge: skip the single-submission form sheet;
      // instead add scorecard + one response sheet per judge
      if (payload.judgeRows.length > 0) {
        this._buildScorecardSheet(wb, payload);
        for (const judge of payload.judgeRows) {
          this._buildJudgeResponseSheet(wb, payload, judge);
        }
      }
    } else {
      this._buildFormSheet(wb, payload);
    }

    const buf = await wb.xlsx.writeBuffer();
    const slug = payload.companyName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
    this._downloadBuffer(
      buf,
      `${slug}_${payload.stageName}_${this._dateStamp()}.xlsx`,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  }

  exportInterviewPdf(payload: IInterviewExportPayload): void {
    const html = this._buildPdfHtml(payload);
    const slug = payload.companyName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
    this.pdfService.downloadPdf(
      html,
      `${slug}_${payload.stageName}_${this._dateStamp()}.pdf`,
      'A4',
      'portrait'
    );
  }

  // ── Excel sheet builders ───────────────────────────────────────────────────

  private _buildProfileSheet(wb: any, p: IInterviewExportPayload): void {
    const ws = wb.addWorksheet('Applicant Profile');
    const d = p.applicantData;
    const dir = d.directors?.[0];

    // Title
    ws.mergeCells('A1:C1');
    const titleCell = ws.getCell('A1');
    titleCell.value = `${p.companyName} — Applicant Profile`;
    titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF1F4E79' } };
    ws.getRow(1).height = 26;

    ws.mergeCells('A2:C2');
    ws.getCell('A2').value =
      `Stage: ${p.stageName}   |   Exported: ${new Date().toLocaleDateString('en-ZA', {
        day: '2-digit', month: 'long', year: 'numeric',
      })}`;
    ws.getCell('A2').font = { name: 'Calibri', size: 10, color: { argb: 'FF6B7280' } };
    ws.addRow([]);

    const addSection = (label: string) => {
      const r = ws.rowCount + 1;
      ws.mergeCells(`A${r}:C${r}`);
      const c = ws.getCell(`A${r}`);
      c.value = label;
      c.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
      c.alignment = { horizontal: 'left', indent: 1 };
      ws.getRow(r).height = 18;
    };

    const addRow = (label: string, value: string | number | null | undefined) => {
      const row = ws.addRow([label, value ?? '—', '']);
      row.getCell(1).font = { name: 'Calibri', size: 10, color: { argb: 'FF374151' } };
      row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
      row.getCell(2).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF111827' } };
    };

    addSection('Company Information');
    addRow('Company Name', d.company_name);
    addRow('Trade Name', d.trade_name);
    addRow('Registration Number', d.registration_number);
    addRow('Industry / Sector', d.industry_name);

    ws.addRow([]);

    addSection('Location');
    addRow('Address', [d.address_line1, d.address_line2, d.suburb].filter(Boolean).join(', ') || undefined);
    addRow('City / Town', d.city);
    addRow('Municipality', d.municipality);
    addRow('Province', d.province);
    addRow('Residential Area', d.residential_area);

    ws.addRow([]);

    addSection('Primary Director');
    if (dir) {
      addRow('Name', [dir.name, dir.surname].filter(Boolean).join(' '));
      addRow('ID Number', dir.id_number);
      addRow('Gender', dir.gender);
      addRow('Race', dir.race);
      addRow('Date of Birth', dir.date_of_birth);
      addRow('Email', dir.email);
      addRow('Cell Phone', dir.cell_phone);
    } else {
      ws.addRow(['No director on record', '', '']);
    }

    ws.addRow([]);

    addSection('Ownership');
    addRow('Youth Owned (18–35)', d.youth_owned ? 'Yes' : 'No');
    addRow('Black / Majority Owned', d.black_owned ? 'Yes' : 'No');
    addRow('Black Women Owned', d.black_women_owned ? 'Yes' : 'No');

    ws.addRow([]);

    addSection('Financial Summary');
    addRow('Bank Statement Months Captured', d.bank_statement_months ?? 0);
    addRow('Annual Turnover (Grand Total)', this._fmt(d.bank_statement_grand_total));
    addRow('Turnover ≤ R1M?', (d.bank_statement_grand_total ?? 0) <= 1_000_000 ? 'Yes' : 'No');

    if (p.submissionStatus || p.decisionValue || p.interviewerNotes) {
      ws.addRow([]);
      addSection(`${p.stageName} — Submission`);
      if (p.submissionStatus) addRow('Status', p.submissionStatus);
      if (p.decisionValue)    addRow('Decision', p.decisionValue);
      if (p.interviewerNotes) addRow('Interviewer Notes', p.interviewerNotes);
    }

    ws.columns = [{ width: 32 }, { width: 40 }, { width: 10 }];
  }

  private _buildBankSheet(wb: any, p: IInterviewExportPayload): void {
    const ws = wb.addWorksheet('Bank Statements');
    const cols = FY_MONTH_COLUMNS;
    const lastColLetter = String.fromCharCode(65 + cols.length + 1);

    ws.mergeCells(`A1:${lastColLetter}1`);
    const titleCell = ws.getCell('A1');
    titleCell.value = `${p.companyName} — Monthly Turnover Summary`;
    titleCell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FF0F766E' } };
    ws.getRow(1).height = 22;

    const headers = ['Financial Year', ...cols.map(c => c.label), 'Active Months', 'Total (R)'];
    const hRow = ws.addRow(headers);
    hRow.eachCell((cell: any) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
      cell.alignment = { horizontal: 'center' };
    });
    ws.views = [{ state: 'frozen', ySplit: 2 }];

    let grandTotal = 0;
    let grandActive = 0;

    for (const row of p.bankStatementRows) {
      const rowData: any[] = [row.financial_year_name, ...row.months.map(v => v ?? null), row.activeMonths, row.total];
      const r = ws.addRow(rowData);
      grandTotal += row.total;
      grandActive += row.activeMonths;

      row.months.forEach((val, idx) => {
        const cell = r.getCell(idx + 2);
        if (val == null) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
        } else if (val === 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEFCE8' } };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
        }
        cell.numFmt = '#,##0.00';
        cell.alignment = { horizontal: 'right' };
      });

      const totalCell = r.getCell(cols.length + 3);
      totalCell.numFmt = 'R#,##0.00';
      totalCell.font = { bold: true, color: { argb: 'FF0F766E' } };
    }

    if (p.bankStatementRows.length === 0) {
      ws.addRow(['No bank statement data captured.', ...new Array(cols.length + 1).fill('')]);
    }

    const totRow = ws.addRow(['GRAND TOTAL', ...new Array(cols.length).fill(null), grandActive, grandTotal]);
    totRow.eachCell({ includeEmpty: true }, (cell: any) => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
    });
    totRow.getCell(cols.length + 3).numFmt = 'R#,##0.00';

    ws.columns[0].width = 20;
    cols.forEach((_: any, i: number) => { ws.columns[i + 1].width = 10; });
    ws.columns[cols.length + 1].width = 14;
    ws.columns[cols.length + 2].width = 16;
  }

  private _buildFormSheet(wb: any, p: IInterviewExportPayload): void {
    const ws = wb.addWorksheet('Interview Form');
    ws.mergeCells('A1:D1');
    const titleCell = ws.getCell('A1');
    titleCell.value = `${p.stageName} — ${p.template.data.name}`;
    titleCell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FF5B21B6' } };
    ws.getRow(1).height = 22;

    if (p.interviewerNotes) {
      ws.addRow(['Interviewer Notes:', p.interviewerNotes, '', '']);
      ws.getRow(ws.rowCount).getCell(1).font = { bold: true, size: 10 };
      ws.getRow(ws.rowCount).getCell(2).font = { size: 10, italic: true, color: { argb: 'FF374151' } };
    }
    if (p.decisionValue) {
      ws.addRow(['Decision:', p.decisionValue, '', '']);
      ws.getRow(ws.rowCount).getCell(1).font = { bold: true, size: 10 };
      ws.getRow(ws.rowCount).getCell(2).font = { bold: true, size: 10, color: { argb: 'FF111827' } };
    }
    ws.addRow([]);

    const hRow = ws.addRow(['#', 'Question', 'Type', 'Answer']);
    hRow.eachCell((cell: any) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B21B6' } };
      cell.alignment = { horizontal: 'center' };
    });

    let qNum = 0;
    for (const section of p.template.data.sections) {
      // Section sub-header
      const sRow = ws.addRow(['', section.title, '', '']);
      ws.mergeCells(`B${ws.rowCount}:D${ws.rowCount}`);
      sRow.eachCell({ includeEmpty: true }, (cell: any) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDE9FE' } };
        cell.font = { bold: true, size: 10, color: { argb: 'FF5B21B6' } };
      });

      for (const q of section.questions) {
        qNum++;
        const answer = this._renderAnswer(q, p.answers);
        const bg = qNum % 2 === 0 ? 'FFF9FAFB' : 'FFFFFFFF';
        const row = ws.addRow([qNum, q.label, q.type, answer]);
        row.eachCell({ includeEmpty: true }, (cell: any) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
          cell.alignment = { wrapText: true, vertical: 'top' };
        });
        row.getCell(1).alignment = { horizontal: 'center', vertical: 'top' };
        row.getCell(3).font = { size: 9, color: { argb: 'FF9CA3AF' }, italic: true };
      }
    }

    ws.columns = [{ width: 6 }, { width: 52 }, { width: 16 }, { width: 44 }];
  }

  private _buildScorecardSheet(wb: any, p: IInterviewExportPayload): void {
    const ws = wb.addWorksheet('Panel Scorecard');
    const judges = p.judgeRows;
    const criteria = p.criteriaList;

    // Title
    ws.mergeCells(`A1:${String.fromCharCode(65 + 2 + judges.length)}1`);
    const titleCell = ws.getCell('A1');
    titleCell.value = `${p.companyName} — Panel Scorecard`;
    titleCell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FF5B21B6' } };
    ws.getRow(1).height = 22;

    // Summary
    ws.addRow(['Panel Average:', `${p.judgeAverage.toFixed(1)} / ${p.judgeMaxTotal}`,
      'Score %:', `${p.judgeMaxTotal ? ((p.judgeAverage / p.judgeMaxTotal) * 100).toFixed(1) : '0'}%`,
      'Evaluations:', judges.length]);
    ws.getRow(ws.rowCount).font = { bold: true, size: 11 };
    ws.addRow([]);

    // Column headers
    const hRow = ws.addRow(['#', 'Criterion', ...judges.map(j => j.name.split(' ')[0]), 'Avg']);
    hRow.eachCell((cell: any) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B21B6' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });
    ws.views = [{ state: 'frozen', ySplit: ws.rowCount }];

    criteria.forEach((c, i) => {
      const judgeScores = judges.map(j => j.scores[c.id] ?? '—');
      const avg = p.criteriaAverages[c.id] ?? 0;
      const row = ws.addRow([i + 1, c.label, ...judgeScores, avg.toFixed(1)]);
      const bg = i % 2 === 0 ? 'FFF9FAFB' : 'FFFFFFFF';
      row.eachCell({ includeEmpty: true }, (cell: any) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.alignment = { horizontal: 'center' };
      });
      row.getCell(2).alignment = { horizontal: 'left', wrapText: true };
      const avgCell = row.getCell(2 + judges.length + 1);
      avgCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDE9FE' } };
      avgCell.font = { bold: true, color: { argb: 'FF5B21B6' } };
    });

    // Totals
    const totRow = ws.addRow(['', 'TOTAL', ...judges.map(j => j.total), p.judgeAverage.toFixed(1)]);
    totRow.eachCell({ includeEmpty: true }, (cell: any) => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDE9FE' } };
      cell.alignment = { horizontal: 'center' };
    });
    totRow.getCell(2 + judges.length + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDD6FE' } };

    ws.addRow([]);

    // Per-judge detail
    const jHeaderRow = ws.addRow(['Judge', 'Total', 'Max', 'Score %', 'Submitted At']);
    jHeaderRow.eachCell((cell: any) => {
      cell.font = { bold: true, color: { argb: 'FF5B21B6' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDE9FE' } };
    });
    for (const j of judges) {
      const pct = p.judgeMaxTotal ? ((j.total / p.judgeMaxTotal) * 100).toFixed(1) + '%' : '—';
      ws.addRow([
        j.name,
        j.total,
        p.judgeMaxTotal,
        pct,
        j.submittedAt ? new Date(j.submittedAt).toLocaleString('en-ZA') : '—',
      ]);
    }

    ws.columns = [
      { width: 6 },
      { width: 44 },
      ...judges.map(() => ({ width: 14 })),
      { width: 10 },
    ];
  }

  /** One Excel sheet per judge showing ALL their question responses */
  private _buildJudgeResponseSheet(wb: any, p: IInterviewExportPayload, judge: JudgeExportRow): void {
    const safeName = judge.name.replace(/[*?:/\\[\]]/g, '').slice(0, 28);
    const ws = wb.addWorksheet(`${safeName} — Responses`);

    // Title
    ws.mergeCells('A1:D1');
    const titleCell = ws.getCell('A1');
    titleCell.value = `${judge.name} — Evaluation Responses`;
    titleCell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FF5B21B6' } };
    ws.getRow(1).height = 22;

    // Summary row
    const pct = p.judgeMaxTotal
      ? ((judge.total / p.judgeMaxTotal) * 100).toFixed(1) + '%'
      : '—';
    ws.addRow(['Score:', `${judge.total} / ${p.judgeMaxTotal}`, 'Percentage:', pct]);
    ws.getRow(ws.rowCount).font = { bold: true, size: 10 };
    ws.addRow(['Submitted:', judge.submittedAt
      ? new Date(judge.submittedAt).toLocaleString('en-ZA') : '—', '', '']);
    ws.getRow(ws.rowCount).font = { size: 10, italic: true, color: { argb: 'FF6B7280' } };
    ws.addRow([]);

    // Column headers
    const hRow = ws.addRow(['#', 'Question', 'Type', 'Answer']);
    hRow.eachCell((cell: any) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B21B6' } };
      cell.alignment = { horizontal: 'center' };
    });

    let qNum = 0;
    for (const section of p.template.data.sections) {
      // Section sub-header
      const sRow = ws.addRow(['', section.title, '', '']);
      ws.mergeCells(`B${ws.rowCount}:D${ws.rowCount}`);
      sRow.eachCell({ includeEmpty: true }, (cell: any) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDE9FE' } };
        cell.font = { bold: true, size: 10, color: { argb: 'FF5B21B6' } };
      });

      for (const q of section.questions) {
        qNum++;
        const answer = this._renderAnswer(q, judge.answers);
        const bg = qNum % 2 === 0 ? 'FFF9FAFB' : 'FFFFFFFF';
        const row = ws.addRow([qNum, q.label, q.type, answer]);
        row.eachCell({ includeEmpty: true }, (cell: any) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
          cell.alignment = { wrapText: true, vertical: 'top' };
        });
        row.getCell(1).alignment = { horizontal: 'center', vertical: 'top' };
        row.getCell(3).font = { size: 9, color: { argb: 'FF9CA3AF' }, italic: true };
      }
    }

    ws.columns = [{ width: 6 }, { width: 52 }, { width: 16 }, { width: 44 }];
  }

  // ── PDF HTML builder ───────────────────────────────────────────────────────

  private _buildPdfHtml(p: IInterviewExportPayload): string {
    const d = p.applicantData;
    const dir = d.directors?.[0];
    const date = new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' });
    const F = 'font-family:Arial,sans-serif;';

    /** Label / value data row */
    const tdCell = (label: string, value: string | number | null | undefined) =>
      `<tr>
        <td style="${F}padding:5px 10px;font-size:10px;color:#6B7280;width:180px;vertical-align:top;border-bottom:1px solid #F3F4F6">${label}</td>
        <td style="${F}padding:5px 10px;font-size:10px;font-weight:700;color:#111827;border-bottom:1px solid #F3F4F6">${value ?? '-'}</td>
      </tr>`;

    /** Coloured section-header row inside a table */
    const secHeader = (label: string, bg = '#1F4E79') =>
      `<tr><td colspan="2" style="${F}background:${bg};color:#ffffff;font-size:11px;font-weight:700;
        padding:7px 10px;letter-spacing:0.04em">${label}</td></tr>`;

    /** Inline Yes / No text (no spans, explicit font) */
    const boolText = (v: boolean | undefined) =>
      v
        ? `<td style="${F}padding:5px 10px;font-size:10px;font-weight:700;color:#059669;border-bottom:1px solid #F3F4F6">Yes</td>`
        : `<td style="${F}padding:5px 10px;font-size:10px;font-weight:700;color:#DC2626;border-bottom:1px solid #F3F4F6">No</td>`;

    // ── Profile table ────────────────────────────────────────────────────────
    const profileHtml = `
      <table style="border-collapse:collapse;width:100%;margin-bottom:20px;border:1px solid #E5E7EB">
        ${secHeader('Company Information')}
        ${tdCell('Company Name', d.company_name)}
        ${tdCell('Trade Name', d.trade_name)}
        ${tdCell('Registration Number', d.registration_number)}
        ${tdCell('Industry / Sector', d.industry_name)}
        ${secHeader('Location')}
        ${tdCell('Address', [d.address_line1, d.address_line2, d.suburb].filter(Boolean).join(', ') || undefined)}
        ${tdCell('City / Town', d.city)}
        ${tdCell('Municipality', d.municipality)}
        ${tdCell('Province', d.province)}
        ${tdCell('Residential Area', d.residential_area)}
        ${secHeader('Primary Director')}
        ${dir
          ? tdCell('Name', [dir.name, dir.surname].filter(Boolean).join(' ')) +
            tdCell('ID Number', dir.id_number) +
            tdCell('Gender', dir.gender) +
            tdCell('Race', dir.race) +
            tdCell('Date of Birth', dir.date_of_birth)
          : `<tr><td colspan="2" style="${F}padding:6px 10px;color:#9CA3AF;font-size:10px">No director on record</td></tr>`}
        ${secHeader('Ownership')}
        <tr>
          <td style="${F}padding:5px 10px;font-size:10px;color:#6B7280;width:180px;border-bottom:1px solid #F3F4F6">Youth Owned (18-35)</td>
          ${boolText(d.youth_owned)}
        </tr>
        <tr>
          <td style="${F}padding:5px 10px;font-size:10px;color:#6B7280;width:180px;border-bottom:1px solid #F3F4F6">Black / Majority Owned</td>
          ${boolText(d.black_owned)}
        </tr>
        <tr>
          <td style="${F}padding:5px 10px;font-size:10px;color:#6B7280;width:180px;border-bottom:1px solid #F3F4F6">Black Women Owned</td>
          ${boolText(d.black_women_owned)}
        </tr>
        ${secHeader('Financial Summary')}
        ${tdCell('Bank Statement Months Captured', d.bank_statement_months ?? 0)}
        ${tdCell('Annual Turnover (Grand Total)', this._fmt(d.bank_statement_grand_total))}
        ${tdCell('Turnover within R1M?', (d.bank_statement_grand_total ?? 0) <= 1_000_000 ? 'Yes' : 'No')}
        ${p.submissionStatus
          ? secHeader(`${p.stageName} - Submission`) +
            tdCell('Status', p.submissionStatus) +
            (p.decisionValue ? tdCell('Decision', p.decisionValue) : '') +
            (p.interviewerNotes ? tdCell('Interviewer Notes', p.interviewerNotes) : '')
          : ''}
      </table>`;

    // ── Bank statement section header ────────────────────────────────────────
    const cols = FY_MONTH_COLUMNS;
    let bankHtml = `
      <table style="border-collapse:collapse;width:100%;margin-bottom:6px">
        <tr>
          <td style="${F}font-size:12px;font-weight:700;color:#0F766E;padding:14px 0 6px 0;border-bottom:2px solid #0F766E">
            Monthly Turnover Summary
          </td>
        </tr>
      </table>
      <table style="border-collapse:collapse;width:100%;font-size:9px;margin-bottom:20px">
        <thead>
          <tr style="background:#0F766E">
            <th style="${F}padding:5px 7px;text-align:left;color:#ffffff;font-weight:700;font-size:9px">Financial Year</th>
            ${cols.map(c => `<th style="${F}padding:5px 4px;text-align:right;color:#ffffff;font-weight:700;font-size:9px;min-width:32px">${c.label}</th>`).join('')}
            <th style="${F}padding:5px 7px;text-align:right;color:#ffffff;font-weight:700;font-size:9px">Total</th>
          </tr>
        </thead>
        <tbody>`;

    let grandTotal = 0;
    if (p.bankStatementRows.length === 0) {
      bankHtml += `<tr><td colspan="${cols.length + 2}" style="${F}padding:8px 10px;color:#9CA3AF;font-size:10px;font-style:italic">
        No bank statement data captured.</td></tr>`;
    } else {
      for (const row of p.bankStatementRows) {
        grandTotal += row.total;
        bankHtml += `<tr>
          <td style="${F}padding:3px 7px;font-weight:700;font-size:9px;color:#1F2937">${row.financial_year_name}</td>
          ${row.months.map(v => {
            const cellStyle = v == null
              ? `background:#FEF2F2;color:#9CA3AF`
              : v === 0
              ? `background:#FEFCE8;color:#92400E`
              : `background:#F0FDF4;color:#065F46`;
            return `<td style="${F}padding:3px 4px;text-align:right;font-size:9px;${cellStyle}">${v != null ? v.toLocaleString('en-ZA', { maximumFractionDigits: 0 }) : '-'}</td>`;
          }).join('')}
          <td style="${F}padding:3px 7px;text-align:right;font-weight:700;font-size:9px;color:#0F766E">${this._fmt(row.total)}</td>
        </tr>`;
      }
    }
    bankHtml += `<tr style="background:#D1FAE5">
      <td style="${F}padding:5px 7px;font-weight:700;font-size:9px;color:#065F46">GRAND TOTAL</td>
      ${cols.map(() => `<td style="${F}padding:5px 4px;font-size:9px"></td>`).join('')}
      <td style="${F}padding:5px 7px;text-align:right;font-weight:700;font-size:9px;color:#065F46">${this._fmt(grandTotal)}</td>
    </tr></tbody></table>`;

    // ── Form answers OR per-judge responses ──────────────────────────────────
    let formHtml = '';

    if (!p.isMultiJudge) {
      // Standard mode: show the single form submission answers
      formHtml = `
        <table style="border-collapse:collapse;width:100%;margin-bottom:6px">
          <tr>
            <td style="${F}font-size:12px;font-weight:700;color:#5B21B6;padding:14px 0 6px 0;border-bottom:2px solid #5B21B6">
              ${p.stageName} - ${p.template.data.name}
            </td>
          </tr>
        </table>`;
      if (p.interviewerNotes) {
        formHtml += `<table style="border-collapse:collapse;width:100%;margin-bottom:8px">
          <tr>
            <td style="${F}padding:5px 8px;font-size:9px;color:#6B7280;font-style:italic;background:#F9FAFB;border-left:3px solid #D1D5DB">
              <span style="${F}font-weight:700;font-size:9px;color:#374151">Interviewer Notes: </span>${p.interviewerNotes}
            </td>
          </tr>
        </table>`;
      }
      if (p.decisionValue) {
        formHtml += `<table style="border-collapse:collapse;width:100%;margin-bottom:8px">
          <tr>
            <td style="${F}padding:5px 8px;font-size:10px;font-weight:700;color:#111827;background:#F3F4F6;border-left:3px solid #6B7280">
              Decision: ${p.decisionValue}
            </td>
          </tr>
        </table>`;
      }
      formHtml += this._buildFormQuestionsHtml(p.template, p.answers, F);
    }

    // ── Scorecard (multi-judge) ───────────────────────────────────────────────
    let scorecardHtml = '';
    if (p.isMultiJudge && p.judgeRows.length > 0) {
      const judges = p.judgeRows;
      const scorePct = p.judgeMaxTotal
        ? ((p.judgeAverage / p.judgeMaxTotal) * 100).toFixed(1)
        : '0';
      scorecardHtml = `
        <div style="page-break-before:always"></div>
        <table style="border-collapse:collapse;width:100%;margin-bottom:6px">
          <tr>
            <td style="${F}font-size:12px;font-weight:700;color:#5B21B6;padding:14px 0 6px 0;border-bottom:2px solid #5B21B6">
              Panel Scorecard
            </td>
          </tr>
        </table>

        <!-- Summary stats row -->
        <table style="border-collapse:collapse;width:100%;margin-bottom:14px;background:#F5F3FF;border:1px solid #DDD6FE">
          <tr>
            <td style="${F}padding:8px 14px;font-size:10px;color:#6B7280;width:33%;border-right:1px solid #DDD6FE">
              Panel Average<br>
              <span style="${F}font-size:16px;font-weight:700;color:#5B21B6">${p.judgeAverage.toFixed(1)}</span>
              <span style="${F}font-size:10px;color:#6B7280"> / ${p.judgeMaxTotal}</span>
            </td>
            <td style="${F}padding:8px 14px;font-size:10px;color:#6B7280;width:33%;border-right:1px solid #DDD6FE">
              Score Percentage<br>
              <span style="${F}font-size:16px;font-weight:700;color:#5B21B6">${scorePct}%</span>
            </td>
            <td style="${F}padding:8px 14px;font-size:10px;color:#6B7280;width:33%">
              Evaluations<br>
              <span style="${F}font-size:16px;font-weight:700;color:#1F2937">${judges.length}</span>
            </td>
          </tr>
        </table>

        <!-- Criteria matrix -->
        <table style="border-collapse:collapse;width:100%;font-size:9px;margin-bottom:14px;border:1px solid #DDD6FE">
          <thead>
            <tr style="background:#5B21B6">
              <th style="${F}padding:5px 6px;text-align:center;color:#ffffff;font-weight:700;font-size:9px;width:26px">#</th>
              <th style="${F}padding:5px 8px;text-align:left;color:#ffffff;font-weight:700;font-size:9px">Criterion</th>
              <th style="${F}padding:5px 6px;text-align:center;color:#ffffff;font-weight:700;font-size:9px">Max</th>
              ${judges.map(j =>
                `<th style="${F}padding:5px 8px;text-align:center;color:#ffffff;font-weight:700;font-size:9px;min-width:50px">${j.name.split(' ')[0]}</th>`
              ).join('')}
              <th style="${F}padding:5px 8px;text-align:center;color:#ffffff;font-weight:700;font-size:9px;background:#3B0764">Avg</th>
            </tr>
          </thead>
          <tbody>
            ${p.criteriaList.map((c, i) => {
              const avg = p.criteriaAverages[c.id] ?? 0;
              const bg = i % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
              return `<tr style="background:${bg}">
                <td style="${F}padding:4px 6px;text-align:center;color:#9CA3AF;font-size:9px;border-right:1px solid #F3F4F6">${i + 1}</td>
                <td style="${F}padding:4px 8px;color:#374151;font-size:9px;border-right:1px solid #F3F4F6">${c.label}</td>
                <td style="${F}padding:4px 6px;text-align:center;color:#9CA3AF;font-size:9px;border-right:1px solid #F3F4F6">${c.max}</td>
                ${judges.map(j => {
                  const score = j.scores[c.id];
                  const scoreColor = score != null && score >= c.max ? '#059669' : '#374151';
                  return `<td style="${F}padding:4px 8px;text-align:center;font-weight:700;color:${scoreColor};font-size:9px;border-right:1px solid #F3F4F6">${score ?? '-'}</td>`;
                }).join('')}
                <td style="${F}padding:4px 8px;text-align:center;font-weight:700;color:#5B21B6;font-size:9px;background:#EDE9FE">${avg.toFixed(1)}</td>
              </tr>`;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="background:#EDE9FE">
              <td colspan="3" style="${F}padding:5px 8px;text-align:right;font-weight:700;font-size:9px;color:#374151">TOTAL</td>
              ${judges.map(j =>
                `<td style="${F}padding:5px 8px;text-align:center;font-weight:700;font-size:9px;color:#5B21B6;border-right:1px solid #DDD6FE">${j.total} / ${p.judgeMaxTotal}</td>`
              ).join('')}
              <td style="${F}padding:5px 8px;text-align:center;font-weight:700;font-size:9px;color:#5B21B6;background:#DDD6FE">${p.judgeAverage.toFixed(1)}</td>
            </tr>
          </tfoot>
        </table>

        <!-- Per-judge summary strip -->
        <table style="border-collapse:collapse;width:70%;font-size:9px;border:1px solid #DDD6FE;margin-bottom:20px">
          <thead>
            <tr style="background:#EDE9FE">
              <th style="${F}padding:5px 10px;text-align:left;color:#5B21B6;font-weight:700;font-size:9px">Judge</th>
              <th style="${F}padding:5px 10px;text-align:center;color:#5B21B6;font-weight:700;font-size:9px">Score</th>
              <th style="${F}padding:5px 10px;text-align:center;color:#5B21B6;font-weight:700;font-size:9px">%</th>
              <th style="${F}padding:5px 10px;text-align:right;color:#5B21B6;font-weight:700;font-size:9px">Submitted</th>
            </tr>
          </thead>
          <tbody>
            ${judges.map((j, i) => {
              const pct = p.judgeMaxTotal ? ((j.total / p.judgeMaxTotal) * 100).toFixed(1) + '%' : '-';
              const bg = i % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
              return `<tr style="background:${bg}">
                <td style="${F}padding:4px 10px;font-weight:700;font-size:9px;color:#1F2937">${j.name}</td>
                <td style="${F}padding:4px 10px;text-align:center;font-weight:700;font-size:9px;color:#5B21B6">${j.total} / ${p.judgeMaxTotal}</td>
                <td style="${F}padding:4px 10px;text-align:center;font-size:9px;color:#374151">${pct}</td>
                <td style="${F}padding:4px 10px;text-align:right;font-size:9px;color:#6B7280">${j.submittedAt ? new Date(j.submittedAt).toLocaleString('en-ZA') : '-'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>

        <!-- Per-judge full response breakdown -->
        ${judges.map((j, ji) => `
          <div style="page-break-before:${ji === 0 ? 'always' : 'avoid'}"></div>
          <table style="border-collapse:collapse;width:100%;margin-bottom:6px;margin-top:${ji > 0 ? '24px' : '0'}">
            <tr>
              <td style="${F}font-size:11px;font-weight:700;color:#5B21B6;padding:10px 0 5px 0;border-bottom:2px solid #DDD6FE">
                ${j.name} — Full Responses
                <span style="${F}font-size:9px;font-weight:400;color:#9CA3AF;margin-left:8px">
                  Score: ${j.total}/${p.judgeMaxTotal} &nbsp;·&nbsp;
                  Submitted: ${j.submittedAt ? new Date(j.submittedAt).toLocaleString('en-ZA') : '-'}
                </span>
              </td>
            </tr>
          </table>
          ${this._buildFormQuestionsHtml(p.template, j.answers, F)}
        `).join('')}
      `;
    }

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 24px 32px; color: #1F2937; font-size: 10px; }
    * { box-sizing: border-box; font-family: Arial, sans-serif; }
    @page { margin: 18mm 14mm; }
  </style>
</head>
<body>
  <!-- Document header table -->
  <table style="border-collapse:collapse;width:100%;margin-bottom:18px;border-bottom:2px solid #E5E7EB;padding-bottom:0">
    <tr>
      <td style="${F}vertical-align:top;padding-bottom:12px">
        <p style="${F}font-size:17px;font-weight:800;color:#1F4E79;margin:0;padding:0">${p.companyName}</p>
        <p style="${F}font-size:10px;color:#6B7280;margin:4px 0 0;padding:0">
          Stage: <strong style="${F}font-size:10px;color:#374151">${p.stageName}</strong>
          &nbsp;|&nbsp; Exported: ${date}
        </p>
      </td>
      <td style="${F}vertical-align:top;text-align:right;padding-bottom:12px">
        <p style="${F}font-size:10px;font-weight:700;color:#374151;margin:0;padding:0">${p.template.data.name}</p>
        ${p.submissionStatus
          ? `<p style="${F}font-size:9px;color:#6B7280;margin:3px 0 0;padding:0">Status: <strong style="${F}font-size:9px;color:#111827">${p.submissionStatus}</strong></p>`
          : ''}
      </td>
    </tr>
  </table>

  ${profileHtml}
  ${bankHtml}
  ${formHtml}
  ${scorecardHtml}
</body>
</html>`;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Reusable HTML block: renders all sections+questions for a given answers map */
  private _buildFormQuestionsHtml(template: FormTemplate, answers: Record<string, any>, F: string): string {
    let html = '';
    let qNum = 0;
    for (const section of template.data.sections) {
      html += `
        <table style="border-collapse:collapse;width:100%;margin-bottom:0">
          <tr>
            <td colspan="3" style="${F}background:#EDE9FE;padding:6px 10px;font-size:10px;font-weight:700;color:#5B21B6">
              ${section.title}
            </td>
          </tr>
        </table>
        <table style="border-collapse:collapse;width:100%;font-size:9px;margin-bottom:10px;border:1px solid #E5E7EB">`;
      for (const q of section.questions) {
        qNum++;
        const answer = this._renderAnswer(q, answers);
        const bg = qNum % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
        html += `
          <tr style="background:${bg}">
            <td style="${F}padding:4px 6px;width:26px;text-align:center;color:#9CA3AF;font-size:9px;border-right:1px solid #F3F4F6">${qNum}</td>
            <td style="${F}padding:4px 8px;color:#374151;font-size:9px;border-right:1px solid #F3F4F6">${q.label}</td>
            <td style="${F}padding:4px 8px;font-weight:700;color:#111827;font-size:9px;text-align:right">${answer}</td>
          </tr>`;
      }
      html += '</table>';
    }
    return html;
  }

  private _renderAnswer(q: IFormQuestion, answers: Record<string, any>): string {
    const v = answers[q.id];
    if (v == null || v === '') return '—';
    switch (q.type) {
      case 'boolean':
        return v === true || v === 'true' || v === 1 ? 'Yes' : 'No';
      case 'rating':
        return `${v} / ${q.scale ?? 5}`;
      case 'applicant_picker':
        if (typeof v === 'object' && v !== null) return v.company_name ?? v.id ?? '—';
        return String(v);
      case 'user_picker':
        if (typeof v === 'object' && v !== null) return v.full_name ?? v.id ?? '—';
        return String(v);
      default:
        if (typeof v === 'object') return JSON.stringify(v);
        return String(v);
    }
  }

  private _fmt(v: number | null | undefined): string {
    if (v == null) return '—';
    return 'R ' + v.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private _dateStamp(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private _downloadBuffer(buffer: any, filename: string, mimeType: string): void {
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
}
