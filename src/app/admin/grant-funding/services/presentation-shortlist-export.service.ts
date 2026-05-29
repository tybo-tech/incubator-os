import { Injectable } from '@angular/core';
import { PdfService } from '../../../../services/pdf/pdf.service';
import { IWorkflowStage } from '../interfaces/grant-application.interfaces';
import { IFinancialOverviewApplicant } from './grant-reports.service';

/** One row on the presentation shortlist */
export interface IShortlistEntry {
  id: number;
  company_id: number | null;
  company_name: string;
  status: string;
  province: string;
  grand_total: number;
  avg_per_active_month: number;
  active_months: number;
  consistency_label: string;
  /** The stage config for this applicant's current stage (used to get templateId) */
  stage: IWorkflowStage | null;
  /** Judge voting link — generated from stage interview_template_id or form_template_id */
  judgeLink: string;
}

@Injectable({ providedIn: 'root' })
export class PresentationShortlistExportService {

  constructor(private pdfService: PdfService) {}

  // ── Public API ─────────────────────────────────────────────────────────────

  exportPdf(
    entries: IShortlistEntry[],
    stageLabel: string,
    stageColor: string,
    workflowId: string,
  ): void {
    const html = this._buildHtml(entries, stageLabel, stageColor, workflowId);
    const slug = stageLabel.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
    this.pdfService.downloadPdf(
      html,
      `Presentation_Shortlist_${slug}_${this._dateStamp()}.pdf`,
      'A4',
      'portrait'
    );
  }

  // ── HTML builder ───────────────────────────────────────────────────────────

  private _buildHtml(
    entries: IShortlistEntry[],
    stageLabel: string,
    stageColor: string,
    workflowId: string,
  ): string {
    const FF = `font-family:'DejaVu Sans',sans-serif`;
    const date = new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' });
    const esc = (s: string) => (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const fmt = (n: number) => {
      if (!n) return 'R0';
      if (n >= 1_000_000) return `R${(n / 1_000_000).toFixed(2)}M`;
      if (n >= 1_000) return `R${(n / 1_000).toFixed(1)}K`;
      return `R${n.toFixed(2)}`;
    };

    const palette: Record<string, { bg: string; text: string; border: string }> = {
      blue:   { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
      orange: { bg: '#ffedd5', text: '#c2410c', border: '#fdba74' },
      teal:   { bg: '#ccfbf1', text: '#0f766e', border: '#5eead4' },
      indigo: { bg: '#e0e7ff', text: '#4338ca', border: '#a5b4fc' },
      red:    { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' },
      green:  { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
      purple: { bg: '#f3e8ff', text: '#7c3aed', border: '#c4b5fd' },
      gray:   { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' },
    };
    const stageColors = palette[stageColor] ?? palette['gray'];

    const conColors: Record<string, { bg: string; text: string }> = {
      Consistent: { bg: '#d1fae5', text: '#065f46' },
      Moderate:   { bg: '#fef3c7', text: '#92400e' },
      Irregular:  { bg: '#fee2e2', text: '#991b1b' },
    };

    // ── Build applicant rows ───────────────────────────────────────────────
    const rows = entries.map((entry, i) => {
      const no = i + 1;
      const con = conColors[entry.consistency_label] ?? { bg: '#f3f4f6', text: '#6b7280' };
      const hasLink = !!entry.judgeLink;

      return `
      <!-- ── Applicant ${no} ── -->
      <table width="100%" style="border-collapse:collapse;margin-bottom:12px;page-break-inside:avoid">
        <tr>
          <!-- Number bubble -->
          <td width="40" style="vertical-align:top;padding-right:12px;padding-top:4px;${FF}">
            <table cellpadding="0" cellspacing="0" style="border-collapse:collapse">
              <tr>
                <td style="background:${stageColors.bg};color:${stageColors.text};
                  width:30px;height:30px;text-align:center;font-size:13px;
                  font-weight:700;${FF}">${no}</td>
              </tr>
            </table>
          </td>
          <!-- Details -->
          <td style="vertical-align:top;${FF}">
            <table width="100%" style="border-collapse:collapse;border:1px solid #e5e7eb">
              <!-- Company header -->
              <tr style="background:#f8fafc">
                <td colspan="4" style="padding:10px 14px;border-bottom:1px solid #e5e7eb;${FF}">
                  <table width="100%" style="border-collapse:collapse">
                    <tr>
                      <td style="${FF}">
                        <div style="font-size:14px;font-weight:700;color:#111827;${FF}">${esc(entry.company_name)}</div>
                        <div style="font-size:10px;color:#6b7280;margin-top:2px;${FF}">
                          ${esc(entry.province || '—')}
                          ${entry.active_months > 0 ? `&nbsp;&middot;&nbsp; ${entry.active_months} active months` : ''}
                        </div>
                      </td>
                      <!-- Consistency badge -->
                      <td style="text-align:right;vertical-align:top;${FF}">
                        ${entry.consistency_label ? `
                        <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;float:right">
                          <tr>
                            <td style="background:${con.bg};color:${con.text};
                              padding:2px 8px;font-size:9px;font-weight:700;${FF}">
                              ${esc(entry.consistency_label)}
                            </td>
                          </tr>
                        </table>` : ''}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- Financial stats -->
              <tr>
                <td width="25%" style="padding:8px 14px;border-right:1px solid #f3f4f6;${FF}">
                  <div style="font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px;${FF}">Grand Total</div>
                  <div style="font-size:13px;font-weight:700;color:#0f766e;${FF}">${fmt(entry.grand_total)}</div>
                </td>
                <td width="25%" style="padding:8px 14px;border-right:1px solid #f3f4f6;${FF}">
                  <div style="font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px;${FF}">Avg / Month</div>
                  <div style="font-size:13px;font-weight:700;color:#1d4ed8;${FF}">${fmt(entry.avg_per_active_month)}</div>
                </td>
                <td width="50%" style="padding:8px 14px;${FF}">
                  <div style="font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px;${FF}">Voting Link</div>
                  ${hasLink
                    ? `<div style="font-size:9px;color:#1d4ed8;word-break:break-all;${FF}">${esc(entry.judgeLink)}</div>`
                    : `<div style="font-size:9px;color:#9ca3af;font-style:italic;${FF}">No voting link available for this stage</div>`
                  }
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>`;
    }).join('');

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page { margin: 20px; }
  * { margin: 0; padding: 0; }
  body { font-family: 'DejaVu Sans', sans-serif; font-size: 12px; color: #111827; background: #fff; }
  table { border-collapse: collapse; }
  td, th { vertical-align: top; font-family: 'DejaVu Sans', sans-serif; page-break-inside: avoid; }
  tr { page-break-inside: avoid; }
</style>
</head>
<body>
<div style="padding: 24px 28px;">

  <!-- ══ HEADER ═══════════════════════════════════════════════════════ -->
  <table width="100%" style="border-collapse:collapse;margin-bottom:20px;border-bottom:3px solid ${stageColors.border};padding-bottom:14px">
    <tr>
      <td style="${FF}">
        <div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;
          color:${stageColors.text};margin-bottom:4px;${FF}">Presentation Shortlist</div>
        <div style="font-size:20px;font-weight:700;color:#111827;${FF}">${esc(stageLabel)}</div>
        <div style="font-size:10px;color:#6b7280;margin-top:4px;${FF}">
          Workflow: <strong>${esc(workflowId)}</strong>
          &nbsp;&middot;&nbsp; ${entries.length} applicant${entries.length !== 1 ? 's' : ''}
          &nbsp;&middot;&nbsp; Generated: <strong>${date}</strong>
        </div>
      </td>
      <td style="text-align:right;vertical-align:top;${FF}">
        <div style="font-size:12px;font-weight:700;color:#1e3a5f;${FF}">Incubator OS</div>
        <div style="font-size:9px;color:#9ca3af;margin-top:2px;${FF}">Confidential</div>
      </td>
    </tr>
  </table>

  <!-- ══ STAGE BADGE ═══════════════════════════════════════════════════ -->
  <table width="100%" style="border-collapse:collapse;margin-bottom:20px">
    <tr>
      <td style="${FF}">
        <table cellpadding="0" cellspacing="0" style="border-collapse:collapse">
          <tr>
            <td style="background:${stageColors.bg};border:1px solid ${stageColors.border};
              padding:6px 14px;font-size:11px;font-weight:700;color:${stageColors.text};${FF}">
              ${esc(stageLabel)} &mdash; ${entries.length} applicant${entries.length !== 1 ? 's' : ''}
            </td>
          </tr>
        </table>
      </td>
      <td style="text-align:right;vertical-align:middle;${FF}">
        <div style="font-size:9px;color:#9ca3af;${FF}">
          Links below open the judge voting form for each applicant.
          Share the link with judges to collect scores independently.
        </div>
      </td>
    </tr>
  </table>

  <!-- ══ COLUMN HEADERS ════════════════════════════════════════════════ -->
  <table width="100%" style="border-collapse:collapse;margin-bottom:8px">
    <tr style="background:#1e3a5f">
      <th width="40" style="padding:8px 12px;color:#fff;text-align:center;font-size:10px;font-weight:700;${FF}">#</th>
      <th style="padding:8px 12px;color:#fff;text-align:left;font-size:10px;font-weight:700;${FF}">Company</th>
      <th width="90" style="padding:8px 12px;color:#fff;text-align:right;font-size:10px;font-weight:700;${FF}">Grand Total</th>
      <th width="90" style="padding:8px 12px;color:#fff;text-align:right;font-size:10px;font-weight:700;${FF}">Avg/Month</th>
      <th width="80" style="padding:8px 12px;color:#fff;text-align:center;font-size:10px;font-weight:700;${FF}">Consistency</th>
    </tr>
  </table>

  <!-- ══ APPLICANT CARDS ═══════════════════════════════════════════════ -->
  ${rows.length > 0 ? rows : `
  <table width="100%" style="border-collapse:collapse">
    <tr>
      <td style="padding:40px;text-align:center;color:#9ca3af;font-size:12px;${FF}">
        No applicants in this stage.
      </td>
    </tr>
  </table>`}

  <!-- ══ FOOTER ════════════════════════════════════════════════════════ -->
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

  private _dateStamp(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
