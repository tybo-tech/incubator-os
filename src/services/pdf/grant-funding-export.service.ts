import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  GrantFundingRequestData,
  FundingLineItem,
  Approval,
  STATUS_LABELS,
} from '../../models/grant-funding.models';

@Injectable({ providedIn: 'root' })
export class GrantFundingExportService {
  private readonly PDF_ENDPOINT = 'https://docs.tybo.co.za/pdf.php';

  constructor(private http: HttpClient) {}

  /** Generate a single-request expenditure authorisation PDF */
  generateRequestPDF(data: GrantFundingRequestData, companyName: string): Observable<Blob> {
    const html = this.buildRequestHTML(data, companyName);
    const formData = new FormData();
    formData.append('html', html);
    formData.append('filename', `${companyName}_Grant_Funding_${this.safeTitle(data.request_title)}_${this.today()}.pdf`);
    formData.append('format', 'A4');
    formData.append('orientation', 'portrait');
    return this.http.post(this.PDF_ENDPOINT, formData, { responseType: 'blob' });
  }

  /** Generate a summary report PDF covering all requests for a company */
  generateReportPDF(requests: GrantFundingRequestData[], companyName: string): Observable<Blob> {
    const html = this.buildReportHTML(requests, companyName);
    const formData = new FormData();
    formData.append('html', html);
    formData.append('filename', `${companyName}_Grant_Funding_Report_${this.today()}.pdf`);
    formData.append('format', 'A4');
    formData.append('orientation', 'landscape');
    return this.http.post(this.PDF_ENDPOINT, formData, { responseType: 'blob' });
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private today(): string {
    return new Date().toISOString().split('T')[0];
  }

  private safeTitle(title: string): string {
    return (title || 'Request').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
  }

  private fmtCurrency(val: number): string {
    return 'R ' + (val ?? 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  private fmtDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  private statusColor(status: string): string {
    const map: Record<string, string> = {
      draft:                '#6b7280',
      submitted:            '#2563eb',
      advisor_approved:     '#d97706',
      coordinator_approved: '#ea580c',
      manager_approved:     '#7c3aed',
      payment_released:     '#16a34a',
    };
    return map[status] ?? '#6b7280';
  }

  private approvalColor(status: string): string {
    const map: Record<string, string> = { pending: '#d97706', approved: '#16a34a', rejected: '#dc2626' };
    return map[status] ?? '#6b7280';
  }

  // ─── Shared Styles ─────────────────────────────────────────────────────────

  private getStyles(): string {
    return `
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'DejaVu Sans', sans-serif;
          font-size: 9pt;
          line-height: 1.4;
          color: #1f2937;
          padding: 15pt;
        }
        .header {
          border-bottom: 2pt solid #16a34a;
          padding-bottom: 12pt;
          margin-bottom: 16pt;
        }
        .header h1 { font-size: 16pt; font-weight: bold; color: #15803d; }
        .header .sub { font-size: 10pt; color: #6b7280; margin-top: 2pt; }
        .header .meta { font-size: 8pt; color: #9ca3af; margin-top: 4pt; }

        .status-badge {
          display: inline-block;
          padding: 2pt 8pt;
          border-radius: 3pt;
          font-size: 8pt;
          font-weight: bold;
          color: #fff;
        }

        /* ── Two-column info block ── */
        .info-grid { display: table; width: 100%; margin-bottom: 14pt; }
        .info-row { display: table-row; }
        .info-cell { display: table-cell; width: 50%; vertical-align: top; padding-right: 10pt; }
        .info-label { font-size: 7pt; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.5pt; }
        .info-value { font-size: 9pt; font-weight: bold; color: #111827; }

        /* ── Totals strip ── */
        .totals-strip { display: table; width: 100%; margin-bottom: 16pt; }
        .totals-row { display: table-row; }
        .totals-cell {
          display: table-cell;
          text-align: center;
          border: 1pt solid #d1fae5;
          background-color: #f0fdf4;
          padding: 8pt 4pt;
        }
        .totals-number { font-size: 11pt; font-weight: bold; color: #15803d; }
        .totals-label { font-size: 7pt; color: #6b7280; margin-top: 2pt; }

        /* ── Table ── */
        table { width: 100%; border-collapse: collapse; margin-bottom: 14pt; }
        th {
          background-color: #f0fdf4;
          border: 1pt solid #d1fae5;
          padding: 6pt 5pt;
          font-size: 8pt;
          font-weight: bold;
          text-align: left;
          color: #166534;
        }
        td {
          border: 1pt solid #e5e7eb;
          padding: 5pt;
          font-size: 8pt;
          vertical-align: top;
        }
        tr.alt { background-color: #f9fafb; }
        td.num { text-align: right; }
        td.total-row { font-weight: bold; background-color: #f0fdf4; }

        /* ── Approvals ── */
        .approvals-section { margin-bottom: 14pt; }
        .section-title {
          font-size: 10pt;
          font-weight: bold;
          color: #374151;
          border-bottom: 1pt solid #e5e7eb;
          padding-bottom: 4pt;
          margin-bottom: 8pt;
        }
        .approval-grid { display: table; width: 100%; }
        .approval-row { display: table-row; page-break-inside: avoid; }
        .approval-cell {
          display: table-cell;
          width: 25%;
          border: 1pt solid #e5e7eb;
          padding: 8pt;
          vertical-align: top;
          text-align: center;
        }
        .approval-role { font-size: 7pt; text-transform: uppercase; color: #9ca3af; margin-bottom: 3pt; }
        .approval-name { font-size: 8pt; font-weight: bold; color: #111827; margin-bottom: 4pt; }
        .approval-sig {
          border-top: 1pt solid #9ca3af;
          margin-top: 20pt;
          padding-top: 3pt;
          font-size: 7pt;
          color: #6b7280;
          min-height: 30pt;
        }
        .approval-date { font-size: 7pt; color: #6b7280; margin-top: 3pt; }

        /* ── Report summary ── */
        .report-card { border: 1pt solid #d1d5db; padding: 10pt; margin-bottom: 12pt; page-break-inside: avoid; }
        .report-card-header {
          display: table;
          width: 100%;
          margin-bottom: 8pt;
        }
        .report-card-title { display: table-cell; font-size: 10pt; font-weight: bold; color: #111827; vertical-align: middle; }
        .report-card-badge { display: table-cell; text-align: right; vertical-align: middle; }

        .footer {
          margin-top: 16pt;
          border-top: 1pt solid #e5e7eb;
          padding-top: 8pt;
          font-size: 7pt;
          color: #9ca3af;
          text-align: center;
        }
      </style>
    `;
  }

  // ─── Single Request HTML ────────────────────────────────────────────────────

  private buildRequestHTML(data: GrantFundingRequestData, companyName: string): string {
    const statusLabel = STATUS_LABELS[data.status] ?? data.status;
    const statusBg    = this.statusColor(data.status);

    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Expenditure Authorisation Form</title>${this.getStyles()}</head>
<body>

  <div class="header">
    <h1>Expenditure Authorisation Form</h1>
    <div class="sub">${companyName} &mdash; ${data.grant_program || ''}</div>
    <div class="meta">
      Generated: ${this.fmtDate(new Date().toISOString())} &nbsp;|&nbsp;
      Request Date: ${this.fmtDate(data.request_date)} &nbsp;|&nbsp;
      <span class="status-badge" style="background-color:${statusBg}">${statusLabel}</span>
    </div>
  </div>

  <!-- Info block -->
  <div class="info-grid">
    <div class="info-row">
      <div class="info-cell">
        <div class="info-label">Request Title</div>
        <div class="info-value">${data.request_title || '—'}</div>
      </div>
      <div class="info-cell">
        <div class="info-label">Grant Program</div>
        <div class="info-value">${data.grant_program || '—'}</div>
      </div>
    </div>
    <div class="info-row" style="margin-top:6pt">
      <div class="info-cell">
        <div class="info-label">Company</div>
        <div class="info-value">${companyName}</div>
      </div>
      <div class="info-cell">
        <div class="info-label">Currency</div>
        <div class="info-value">${data.currency || 'ZAR'}</div>
      </div>
    </div>
  </div>

  <!-- Totals strip -->
  <div class="totals-strip">
    <div class="totals-row">
      <div class="totals-cell">
        <div class="totals-number">${this.fmtCurrency(data.totals.total_excl_vat)}</div>
        <div class="totals-label">Subtotal (excl. VAT)</div>
      </div>
      <div class="totals-cell">
        <div class="totals-number">${this.fmtCurrency(data.totals.total_vat)}</div>
        <div class="totals-label">VAT (15%)</div>
      </div>
      <div class="totals-cell">
        <div class="totals-number">${this.fmtCurrency(data.totals.total_incl_vat)}</div>
        <div class="totals-label">Total (incl. VAT)</div>
      </div>
      ${data.totals.grant_budget > 0 ? `
      <div class="totals-cell">
        <div class="totals-number" style="color:${data.totals.total_incl_vat > data.totals.grant_budget ? '#dc2626' : '#15803d'}">${this.fmtCurrency(data.totals.grant_budget)}</div>
        <div class="totals-label">Grant Budget</div>
      </div>` : ''}
    </div>
  </div>

  <!-- Line items table -->
  <div class="section-title">Line Items</div>
  <table>
    <thead>
      <tr>
        <th style="width:5%">#</th>
        <th style="width:14%">Invoice No.</th>
        <th style="width:22%">Description</th>
        <th style="width:20%">Supplier</th>
        <th style="width:15%" class="num">Excl. VAT</th>
        <th style="width:12%" class="num">VAT</th>
        <th style="width:12%" class="num">Total</th>
      </tr>
    </thead>
    <tbody>
      ${data.line_items.map((item: FundingLineItem, i: number) => `
      <tr class="${i % 2 === 1 ? 'alt' : ''}">
        <td>${i + 1}</td>
        <td>${item.invoice_number || '—'}</td>
        <td>${item.description || '—'}</td>
        <td>${item.supplier?.name || '—'}${item.supplier?.preferred_supplier ? ' ✓' : ''}</td>
        <td class="num">${this.fmtCurrency(item.amount_excl_vat)}</td>
        <td class="num">${this.fmtCurrency(item.vat_amount)}</td>
        <td class="num">${this.fmtCurrency(item.total_amount)}</td>
      </tr>`).join('')}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="4" class="total-row">TOTAL</td>
        <td class="total-row num">${this.fmtCurrency(data.totals.total_excl_vat)}</td>
        <td class="total-row num">${this.fmtCurrency(data.totals.total_vat)}</td>
        <td class="total-row num">${this.fmtCurrency(data.totals.total_incl_vat)}</td>
      </tr>
    </tfoot>
  </table>

  <!-- Approvals -->
  <div class="approvals-section">
    <div class="section-title">Approvals &amp; Authorizations</div>
    <div class="approval-grid">
      <div class="approval-row">
        ${data.approvals.map((approval: Approval) => `
        <div class="approval-cell">
          <div class="approval-role">${this.roleLabel(approval.role)}</div>
          <div class="approval-name">${approval.name || '&nbsp;'}</div>
          <div class="approval-sig" style="color:${this.approvalColor(approval.status)}">
            ${approval.status === 'approved' && approval.signature ? approval.signature : '&nbsp;'}
          </div>
          <div style="display:inline-block;padding:2pt 6pt;border-radius:3pt;font-size:7pt;font-weight:bold;color:#fff;background-color:${this.approvalColor(approval.status)};margin-top:4pt">
            ${approval.status.toUpperCase()}
          </div>
          <div class="approval-date">${this.fmtDate(approval.approval_date)}</div>
        </div>`).join('')}
      </div>
    </div>
  </div>

  <!-- Payment -->
  <div style="margin-bottom:14pt">
    <div class="section-title">Payment Information</div>
    <div class="info-grid">
      <div class="info-row">
        <div class="info-cell">
          <div class="info-label">Payment Status</div>
          <div class="info-value" style="color:${data.payment.status === 'released' ? '#15803d' : '#d97706'}">${data.payment.status.toUpperCase()}</div>
        </div>
        <div class="info-cell">
          <div class="info-label">Payment Reference</div>
          <div class="info-value">${data.payment.payment_reference || '—'}</div>
        </div>
      </div>
      <div class="info-row" style="margin-top:6pt">
        <div class="info-cell">
          <div class="info-label">Released By</div>
          <div class="info-value">${data.payment.released_by || '—'}</div>
        </div>
        <div class="info-cell">
          <div class="info-label">Release Date</div>
          <div class="info-value">${this.fmtDate(data.payment.payment_release_date)}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    ${companyName} &mdash; ${data.grant_program} &mdash; Generated ${new Date().toLocaleString('en-ZA')}
  </div>

</body>
</html>`;
  }

  // ─── Summary Report HTML ────────────────────────────────────────────────────

  private buildReportHTML(requests: GrantFundingRequestData[], companyName: string): string {
    const grandTotal = requests.reduce((s, r) => s + (r.totals?.total_incl_vat || 0), 0);
    const released   = requests.filter(r => r.status === 'payment_released').length;

    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Grant Funding Report</title>${this.getStyles()}</head>
<body>

  <div class="header">
    <h1>Grant Funding Report</h1>
    <div class="sub">${companyName}</div>
    <div class="meta">Generated: ${this.fmtDate(new Date().toISOString())} &nbsp;|&nbsp; ${requests.length} applications &nbsp;|&nbsp; ${released} released</div>
  </div>

  <!-- Summary strip -->
  <div class="totals-strip">
    <div class="totals-row">
      <div class="totals-cell">
        <div class="totals-number">${requests.length}</div>
        <div class="totals-label">Total Applications</div>
      </div>
      <div class="totals-cell">
        <div class="totals-number">${released}</div>
        <div class="totals-label">Payment Released</div>
      </div>
      <div class="totals-cell">
        <div class="totals-number">${this.fmtCurrency(grandTotal)}</div>
        <div class="totals-label">Grand Total (incl. VAT)</div>
      </div>
    </div>
  </div>

  <!-- Per-application summary table -->
  <div class="section-title">Applications Summary</div>
  <table>
    <thead>
      <tr>
        <th style="width:25%">Title</th>
        <th style="width:22%">Program</th>
        <th style="width:12%">Date</th>
        <th style="width:12%" class="num">Excl. VAT</th>
        <th style="width:12%" class="num">Incl. VAT</th>
        <th style="width:10%">Payment</th>
        <th style="width:7%">Status</th>
      </tr>
    </thead>
    <tbody>
      ${requests.map((r, i) => `
      <tr class="${i % 2 === 1 ? 'alt' : ''}">
        <td>${r.request_title || '—'}</td>
        <td>${r.grant_program || '—'}</td>
        <td>${this.fmtDate(r.request_date)}</td>
        <td class="num">${this.fmtCurrency(r.totals.total_excl_vat)}</td>
        <td class="num">${this.fmtCurrency(r.totals.total_incl_vat)}</td>
        <td style="color:${r.payment.status === 'released' ? '#15803d' : '#d97706'};font-weight:bold">${r.payment.status.toUpperCase()}</td>
        <td style="color:${this.statusColor(r.status)};font-weight:bold;font-size:7pt">${STATUS_LABELS[r.status] ?? r.status}</td>
      </tr>`).join('')}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3" class="total-row">GRAND TOTAL</td>
        <td class="total-row num">${this.fmtCurrency(requests.reduce((s, r) => s + r.totals.total_excl_vat, 0))}</td>
        <td class="total-row num">${this.fmtCurrency(grandTotal)}</td>
        <td colspan="2"></td>
      </tr>
    </tfoot>
  </table>

  ${requests.map((r, idx) => `
  <div class="report-card" ${idx > 0 ? 'style="page-break-before: always;"' : ''}>
    <div class="report-card-header">
      <div class="report-card-title">${r.request_title || 'Untitled'} &mdash; ${r.grant_program}</div>
      <div class="report-card-badge">
        <span class="status-badge" style="background-color:${this.statusColor(r.status)}">${STATUS_LABELS[r.status] ?? r.status}</span>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width:5%">#</th>
          <th style="width:20%">Invoice</th>
          <th style="width:25%">Description</th>
          <th style="width:20%">Supplier</th>
          <th style="width:15%" class="num">Excl. VAT</th>
          <th style="width:15%" class="num">Total incl. VAT</th>
        </tr>
      </thead>
      <tbody>
        ${r.line_items.map((item: FundingLineItem, i: number) => `
        <tr class="${i % 2 === 1 ? 'alt' : ''}">
          <td>${i + 1}</td>
          <td>${item.invoice_number || '—'}</td>
          <td>${item.description || '—'}</td>
          <td>${item.supplier?.name || '—'}</td>
          <td class="num">${this.fmtCurrency(item.amount_excl_vat)}</td>
          <td class="num">${this.fmtCurrency(item.total_amount)}</td>
        </tr>`).join('')}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="4" class="total-row">TOTAL</td>
          <td class="total-row num">${this.fmtCurrency(r.totals.total_excl_vat)}</td>
          <td class="total-row num">${this.fmtCurrency(r.totals.total_incl_vat)}</td>
        </tr>
      </tfoot>
    </table>
  </div>`).join('')}

  <div class="footer">${companyName} &mdash; Grant Funding Report &mdash; Generated ${new Date().toLocaleString('en-ZA')}</div>

</body>
</html>`;
  }

  private roleLabel(role: string): string {
    return role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}
