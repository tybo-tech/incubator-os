import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Mirror structure pattern from SwotActionPlanExportService but tailored for GPS Targets
export interface GpsTargetItemExport {
  category: 'strategy_general' | 'finance' | 'sales_marketing' | 'personal_development';
  description: string;
  evidence?: string;
  due_date?: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assigned_to?: string;
  progress_percentage: number; // 0-100
  date_added?: string;
}

export interface GpsTargetsExportData {
  companyName: string;
  companyId: string;
  targets: GpsTargetItemExport[];
  lastUpdated?: string; // from node last_updated field
  generatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class GpsTargetsExportService {
  private readonly PDF_ENDPOINT = 'https://docs.tybo.co.za/pdf.php';

  constructor(private http: HttpClient) {}

  generateGpsTargetsPDF(data: GpsTargetsExportData): Observable<Blob> {
    const html = this.generateHTML(data);
    const formData = new FormData();
    formData.append('html', html);
    formData.append('filename', `${data.companyName}_GPS_Targets_${new Date().toISOString().split('T')[0]}.pdf`);
    formData.append('format', 'A4');
    formData.append('orientation', 'portrait');
    return this.http.post(this.PDF_ENDPOINT, formData, { responseType: 'blob' });
  }

  convertNodeToExport(nodeData: any, companyName: string, companyId: string): GpsTargetsExportData {
    const categories: Array<keyof any> = ['strategy_general', 'finance', 'sales_marketing', 'personal_development'];
    const targets: GpsTargetItemExport[] = [];

    categories.forEach(cat => {
      const catObj = nodeData?.[cat];
      const items = catObj?.targets || [];
      items.forEach((t: any) => {
        targets.push({
          category: cat as any,
          description: t.description || '',
          evidence: t.evidence || '',
            due_date: t.due_date,
          status: t.status || 'not_started',
          priority: t.priority || 'medium',
          assigned_to: t.assigned_to,
          progress_percentage: typeof t.progress_percentage === 'number' ? t.progress_percentage : 0,
          date_added: t.date_added
        });
      });
    });

    return {
      companyName,
      companyId,
      targets,
      lastUpdated: nodeData?.last_updated,
      generatedAt: new Date().toISOString()
    };
  }

  // ================= HTML Generation ==================
  private generateHTML(data: GpsTargetsExportData): string {
    const stats = this.calculateStats(data.targets);
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>GPS Targets - ${this.escapeHtml(data.companyName)}</title>${this.getStyles()}</head><body>
      ${this.generateHeader(data)}
      ${this.generateSummary(stats)}
      ${this.generateProgressOverview(stats)}
      ${this.generateTargetsTable(data.targets)}
      ${this.generateFooter(data)}
    </body></html>`;
  }

  private getStyles(): string { return `<style>
    body { font-family: 'DejaVu Sans', sans-serif; font-size:10pt; line-height:1.4; color:#333; padding:15pt; }
    h1 { font-size:18pt; margin:0 0 5pt; color:#1e3a8a; }
    .header { text-align:center; margin-bottom:18pt; border-bottom:2pt solid #2563eb; padding-bottom:10pt; }
    .subtitle { font-size:11pt; color:#475569; }
    .date { font-size:8pt; color:#64748b; }
    .stats-grid { display: table; width:100%; margin:15pt 0; }
    .stats-row { display: table-row; }
    .stat { display: table-cell; width:16.66%; text-align:center; border:1pt solid #e2e8f0; padding:8pt; }
    .stat-number { font-size:14pt; font-weight:bold; }
    .stat-label { font-size:7pt; text-transform:uppercase; color:#64748b; }
    .cat-strategy_general { border-left:3pt solid #7e22ce; }
    .cat-finance { border-left:3pt solid #15803d; }
    .cat-sales_marketing { border-left:3pt solid #1d4ed8; }
    .cat-personal_development { border-left:3pt solid #c2410c; }
    .progress-overview { margin:10pt 0 18pt; }
    .progress-bar-container { background:#f1f5f9; border-radius:4pt; height:10pt; width:100%; position:relative; }
    .progress-bar { background:#2563eb; height:100%; border-radius:4pt; }
    table { width:100%; border-collapse:collapse; margin-bottom:15pt; }
    th, td { border:1pt solid #d1d5db; padding:6pt 5pt; font-size:8pt; vertical-align:top; }
    th { background:#f8fafc; font-weight:bold; color:#374151; }
    .badge { display:inline-block; padding:2pt 5pt; border-radius:3pt; font-size:7pt; font-weight:bold; }
    .badge-status-not_started { background:#f1f5f9; color:#475569; }
    .badge-status-in_progress { background:#fef3c7; color:#b45309; }
    .badge-status-completed { background:#dcfce7; color:#166534; }
    .badge-status-overdue { background:#fee2e2; color:#b91c1c; }
    .badge-status-cancelled { background:#e2e8f0; color:#475569; }
    .badge-priority-critical { background:#fee2e2; color:#991b1b; }
    .badge-priority-high { background:#fed7aa; color:#c2410c; }
    .badge-priority-medium { background:#fef3c7; color:#b45309; }
    .badge-priority-low { background:#f1f5f9; color:#475569; }
    .category-pill { font-size:7pt; padding:2pt 6pt; border-radius:3pt; font-weight:bold; }
    .pill-strategy_general { background:#ede9fe; color:#5b21b6; }
    .pill-finance { background:#dcfce7; color:#166534; }
    .pill-sales_marketing { background:#dbeafe; color:#1e3a8a; }
    .pill-personal_development { background:#ffedd5; color:#9a3412; }
    .footer { margin-top:20pt; border-top:1pt solid #e2e8f0; padding-top:10pt; font-size:8pt; text-align:center; color:#64748b; }
  </style>`; }

  private generateHeader(data: GpsTargetsExportData): string {
    const date = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
    return `<div class="header"><h1>GPS Targets Report</h1><div class="subtitle">${this.escapeHtml(data.companyName)}</div><div class="date">Generated on ${date}</div></div>`;
  }

  private calculateStats(items: GpsTargetItemExport[]) {
    const byCategory = {
      strategy_general: items.filter(i => i.category==='strategy_general').length,
      finance: items.filter(i => i.category==='finance').length,
      sales_marketing: items.filter(i => i.category==='sales_marketing').length,
      personal_development: items.filter(i => i.category==='personal_development').length
    } as const;
    const byStatus = {
      not_started: items.filter(i => i.status==='not_started').length,
      in_progress: items.filter(i => i.status==='in_progress').length,
      completed: items.filter(i => i.status==='completed').length,
      overdue: items.filter(i => i.status==='overdue').length,
      cancelled: items.filter(i => i.status==='cancelled').length
    };
    const avgProgress = items.length ? Math.round(items.reduce((s,i)=> s + (i.progress_percentage||0),0)/items.length) : 0;
    return { total: items.length, byCategory, byStatus, avgProgress };
  }

  private generateSummary(stats: ReturnType<typeof this.calculateStats>): string {
    return `<div class="stats-grid"><div class="stats-row">
      <div class="stat cat-strategy_general"><div class="stat-number">${stats.byCategory.strategy_general}</div><div class="stat-label">Strategy</div></div>
      <div class="stat cat-finance"><div class="stat-number">${stats.byCategory.finance}</div><div class="stat-label">Finance</div></div>
      <div class="stat cat-sales_marketing"><div class="stat-number">${stats.byCategory.sales_marketing}</div><div class="stat-label">Sales & Mkt</div></div>
      <div class="stat cat-personal_development"><div class="stat-number">${stats.byCategory.personal_development}</div><div class="stat-label">Personal Dev</div></div>
      <div class="stat"><div class="stat-number">${stats.total}</div><div class="stat-label">Total Targets</div></div>
      <div class="stat"><div class="stat-number">${stats.avgProgress}%</div><div class="stat-label">Avg Progress</div></div>
    </div></div>`;
  }

  private generateProgressOverview(stats: ReturnType<typeof this.calculateStats>): string {
    return `<div class="progress-overview">
      <div style="font-weight:bold; font-size:11pt; margin-bottom:6pt;">Overall Progress</div>
      <div class="progress-bar-container"><div class="progress-bar" style="width:${stats.avgProgress}%;"></div></div>
    </div>`;
  }

  private generateTargetsTable(items: GpsTargetItemExport[]): string {
    const sorted = this.sortTargets(items);
    const rows = sorted.map(t => `<tr>
      <td style="width:14%;"><span class="category-pill pill-${t.category}">${this.categoryLabel(t.category)}</span></td>
      <td style="width:28%; font-weight:bold;">${this.escapeHtml(t.description || 'No description')}</td>
      <td style="width:15%; font-size:7pt;">${this.escapeHtml(t.evidence || '')}</td>
      <td style="width:10%;">${t.due_date ? this.formatDate(t.due_date) : '-'}</td>
      <td style="width:10%;"><span class="badge badge-status-${t.status}">${this.statusLabel(t.status)}</span></td>
      <td style="width:9%;"><span class="badge badge-priority-${t.priority}">${this.capitalizeFirst(t.priority)}</span></td>
      <td style="width:7%; text-align:center;">${t.progress_percentage ?? 0}%</td>
      <td style="width:7%; font-size:7pt;">${t.assigned_to ? this.escapeHtml(t.assigned_to) : '-'}</td>
    </tr>`).join('');

    return `<table><thead><tr>
      <th>Category</th><th>Description</th><th>Evidence</th><th>Due Date</th><th>Status</th><th>Priority</th><th>Progress</th><th>Owner</th>
    </tr></thead><tbody>${rows}</tbody></table>`;
  }

  private generateFooter(data: GpsTargetsExportData): string {
    return `<div class="footer">GPS Targets Report - ${this.escapeHtml(data.companyName)} | Total Targets: ${data.targets.length} | Generated: ${new Date().toLocaleString()}</div>`;
  }

  private sortTargets(items: GpsTargetItemExport[]): GpsTargetItemExport[] {
    const priorityOrder = { critical:0, high:1, medium:2, low:3 } as const;
    return [...items].sort((a,b) => {
      const p = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (p!==0) return p;
      if (a.due_date && !b.due_date) return -1;
      if (!a.due_date && b.due_date) return 1;
      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      return a.category.localeCompare(b.category);
    });
  }

  // ================= Helpers ==================
  private escapeHtml(text: string): string { return text ? text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;') : ''; }
  private capitalizeFirst(text: string): string { return text ? text.charAt(0).toUpperCase() + text.slice(1) : ''; }
  private formatDate(dateString: string): string { return new Date(dateString).toLocaleDateString('en-US',{ month:'short', day:'numeric', year:'numeric'}); }
  private statusLabel(status: GpsTargetItemExport['status']): string { const map: any = { not_started:'Not Started', in_progress:'In Progress', completed:'Completed', overdue:'Overdue', cancelled:'Cancelled' }; return map[status] || status; }
  private categoryLabel(cat: GpsTargetItemExport['category']): string { const map: any = { strategy_general:'Strategy', finance:'Finance', sales_marketing:'Sales & Marketing', personal_development:'Personal Dev' }; return map[cat] || cat; }
}
