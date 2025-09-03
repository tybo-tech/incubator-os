import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SwotActionPlanItem {
  description: string;
  action_required: string;
  assigned_to?: string;
  target_date?: string;
  status: 'identified' | 'planning' | 'in_progress' | 'completed' | 'on_hold';
  priority: 'low' | 'medium' | 'high' | 'critical';
  impact: 'low' | 'medium' | 'high';
  category: 'strength' | 'weakness' | 'opportunity' | 'threat';
  date_added?: string;
}

export interface SwotActionPlanData {
  companyName: string;
  companyId: string;
  actionItems: SwotActionPlanItem[];
  summary?: string;
  analysisDate?: string;
  lastUpdated?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SwotActionPlanExportService {
  private readonly PDF_ENDPOINT = 'https://docs.tybo.co.za/pdf.php';

  constructor(private http: HttpClient) {}

  /**
   * Generate PDF from SWOT analysis data
   */
  generateActionPlanPDF(data: SwotActionPlanData): Observable<Blob> {
    const htmlContent = this.generateActionPlanHTML(data);

    const formData = new FormData();
    formData.append('html', htmlContent);
    formData.append('filename', `${data.companyName}_SWOT_Action_Plan_${new Date().toISOString().split('T')[0]}.pdf`);
    formData.append('format', 'A4');
    formData.append('orientation', 'portrait');

    return this.http.post(this.PDF_ENDPOINT, formData, {
      responseType: 'blob'
    });
  }

  /**
   * Generate HTML content for the action plan
   */
  private generateActionPlanHTML(data: SwotActionPlanData): string {
    const stats = this.calculateStats(data.actionItems);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>SWOT Action Plan - ${data.companyName}</title>
        ${this.getStyles()}
      </head>
      <body>
        ${this.generateHeader(data)}
        ${this.generateSummaryStats(stats)}
        ${this.generatePriorityOverview(data.actionItems)}
        ${this.generateActionItemsTable(data.actionItems)}
        ${this.generateFooter(data)}
      </body>
      </html>
    `;
  }

  /**
   * Generate CSS styles optimized for DomPDF
   */
  private getStyles(): string {
    return `
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'DejaVu Sans', sans-serif;
          font-size: 10pt;
          line-height: 1.4;
          color: #333;
          margin: 0;
          padding: 15pt;
        }

        .header {
          text-align: center;
          margin-bottom: 20pt;
          border-bottom: 2pt solid #2563eb;
          padding-bottom: 15pt;
        }

        .header h1 {
          font-size: 18pt;
          font-weight: bold;
          color: #1e40af;
          margin-bottom: 5pt;
        }

        .header .subtitle {
          font-size: 12pt;
          color: #6b7280;
          margin-bottom: 5pt;
        }

        .header .date {
          font-size: 9pt;
          color: #9ca3af;
        }

        .stats-grid {
          display: table;
          width: 100%;
          margin-bottom: 20pt;
        }

        .stats-row {
          display: table-row;
        }

        .stat-card {
          display: table-cell;
          width: 25%;
          text-align: center;
          border: 1pt solid #e5e7eb;
          padding: 10pt;
          vertical-align: middle;
        }

        .stat-number {
          font-size: 16pt;
          font-weight: bold;
          margin-bottom: 3pt;
        }

        .stat-label {
          font-size: 8pt;
          color: #6b7280;
          text-transform: uppercase;
        }

        .strengths { color: #16a34a; border-left: 3pt solid #16a34a; }
        .weaknesses { color: #dc2626; border-left: 3pt solid #dc2626; }
        .opportunities { color: #2563eb; border-left: 3pt solid #2563eb; }
        .threats { color: #ea580c; border-left: 3pt solid #ea580c; }

        .priority-overview {
          margin-bottom: 20pt;
        }

        .priority-title {
          font-size: 12pt;
          font-weight: bold;
          margin-bottom: 10pt;
          color: #374151;
        }

        .priority-grid {
          display: table;
          width: 100%;
        }

        .priority-row {
          display: table-row;
        }

        .priority-cell {
          display: table-cell;
          width: 25%;
          text-align: center;
          padding: 8pt;
          border: 1pt solid #e5e7eb;
        }

        .priority-critical { background-color: #fef2f2; color: #991b1b; }
        .priority-high { background-color: #fff7ed; color: #c2410c; }
        .priority-medium { background-color: #fffbeb; color: #d97706; }
        .priority-low { background-color: #f9fafb; color: #6b7280; }

        .actions-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20pt;
          page-break-inside: auto;
        }

        .actions-table th {
          background-color: #f3f4f6;
          border: 1pt solid #d1d5db;
          padding: 8pt 6pt;
          font-size: 9pt;
          font-weight: bold;
          text-align: left;
          color: #374151;
        }

        .actions-table td {
          border: 1pt solid #e5e7eb;
          padding: 6pt;
          font-size: 8pt;
          vertical-align: top;
          page-break-inside: avoid;
        }

        .actions-table tr {
          page-break-inside: avoid;
        }

        .category-badge {
          display: inline-block;
          padding: 2pt 6pt;
          border-radius: 3pt;
          font-size: 7pt;
          font-weight: bold;
          text-transform: uppercase;
        }

        .status-badge {
          display: inline-block;
          padding: 2pt 6pt;
          border-radius: 3pt;
          font-size: 7pt;
          font-weight: bold;
        }

        .priority-badge {
          display: inline-block;
          padding: 2pt 6pt;
          border-radius: 3pt;
          font-size: 7pt;
          font-weight: bold;
        }

        .badge-strength { background-color: #dcfce7; color: #166534; }
        .badge-weakness { background-color: #fee2e2; color: #991b1b; }
        .badge-opportunity { background-color: #dbeafe; color: #1e40af; }
        .badge-threat { background-color: #fed7aa; color: #c2410c; }

        .status-identified { background-color: #f3f4f6; color: #374151; }
        .status-planning { background-color: #dbeafe; color: #1e40af; }
        .status-in_progress { background-color: #fef3c7; color: #d97706; }
        .status-completed { background-color: #dcfce7; color: #166534; }
        .status-on_hold { background-color: #fee2e2; color: #991b1b; }

        .priority-critical-badge { background-color: #fee2e2; color: #991b1b; }
        .priority-high-badge { background-color: #fed7aa; color: #c2410c; }
        .priority-medium-badge { background-color: #fef3c7; color: #d97706; }
        .priority-low-badge { background-color: #f3f4f6; color: #6b7280; }

        .overdue {
          color: #dc2626;
          font-weight: bold;
        }

        .due-soon {
          color: #ea580c;
          font-weight: bold;
        }

        .footer {
          margin-top: 20pt;
          border-top: 1pt solid #e5e7eb;
          padding-top: 10pt;
          font-size: 8pt;
          color: #6b7280;
          text-align: center;
        }

        .page-break {
          page-break-before: always;
        }
      </style>
    `;
  }

  /**
   * Generate document header
   */
  private generateHeader(data: SwotActionPlanData): string {
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
      <div class="header">
        <h1>SWOT Analysis Action Plan</h1>
        <div class="subtitle">${data.companyName}</div>
        <div class="date">Generated on ${currentDate}</div>
        ${data.analysisDate ? `<div class="date">Analysis Date: ${new Date(data.analysisDate).toLocaleDateString()}</div>` : ''}
      </div>
    `;
  }

  /**
   * Generate summary statistics
   */
  private generateSummaryStats(stats: any): string {
    return `
      <div class="stats-grid">
        <div class="stats-row">
          <div class="stat-card strengths">
            <div class="stat-number">${stats.byCategory.strength}</div>
            <div class="stat-label">Strengths</div>
          </div>
          <div class="stat-card weaknesses">
            <div class="stat-number">${stats.byCategory.weakness}</div>
            <div class="stat-label">Weaknesses</div>
          </div>
          <div class="stat-card opportunities">
            <div class="stat-number">${stats.byCategory.opportunity}</div>
            <div class="stat-label">Opportunities</div>
          </div>
          <div class="stat-card threats">
            <div class="stat-number">${stats.byCategory.threat}</div>
            <div class="stat-label">Threats</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate priority overview
   */
  private generatePriorityOverview(items: SwotActionPlanItem[]): string {
    const priorityStats = this.calculatePriorityStats(items);

    return `
      <div class="priority-overview">
        <div class="priority-title">Priority Distribution</div>
        <div class="priority-grid">
          <div class="priority-row">
            <div class="priority-cell priority-critical">
              <div style="font-weight: bold; font-size: 11pt;">${priorityStats.critical}</div>
              <div style="font-size: 8pt;">Critical</div>
            </div>
            <div class="priority-cell priority-high">
              <div style="font-weight: bold; font-size: 11pt;">${priorityStats.high}</div>
              <div style="font-size: 8pt;">High</div>
            </div>
            <div class="priority-cell priority-medium">
              <div style="font-weight: bold; font-size: 11pt;">${priorityStats.medium}</div>
              <div style="font-size: 8pt;">Medium</div>
            </div>
            <div class="priority-cell priority-low">
              <div style="font-weight: bold; font-size: 11pt;">${priorityStats.low}</div>
              <div style="font-size: 8pt;">Low</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate action items table
   */
  private generateActionItemsTable(items: SwotActionPlanItem[]): string {
    // Sort by priority and then by due date
    const sortedItems = this.sortActionItems(items);

    const tableRows = sortedItems.map(item => `
      <tr>
        <td>
          <div style="font-weight: bold; margin-bottom: 3pt;">${this.escapeHtml(item.action_required || 'No action specified')}</div>
          <div style="color: #6b7280; font-size: 7pt;">${this.escapeHtml(item.description || '')}</div>
        </td>
        <td>
          <span class="category-badge badge-${item.category}">
            ${this.capitalizeFirst(item.category)}
          </span>
        </td>
        <td>
          <span class="priority-badge priority-${item.priority}-badge">
            ${this.capitalizeFirst(item.priority)}
          </span>
        </td>
        <td>
          <span class="status-badge status-${item.status}">
            ${this.getStatusDisplay(item.status)}
          </span>
        </td>
        <td style="font-size: 7pt;">
          ${item.assigned_to ? this.escapeHtml(item.assigned_to) : '-'}
        </td>
        <td style="font-size: 7pt; ${this.getDateClass(item.target_date)}">
          ${item.target_date ? this.formatDate(item.target_date) : '-'}
        </td>
        <td style="text-align: center;">
          <span style="color: ${this.getImpactColor(item.impact)}; font-weight: bold;">
            ${this.capitalizeFirst(item.impact)}
          </span>
        </td>
      </tr>
    `).join('');

    return `
      <table class="actions-table">
        <thead>
          <tr>
            <th style="width: 30%;">Action Required</th>
            <th style="width: 12%;">Category</th>
            <th style="width: 10%;">Priority</th>
            <th style="width: 12%;">Status</th>
            <th style="width: 15%;">Assigned To</th>
            <th style="width: 12%;">Due Date</th>
            <th style="width: 9%;">Impact</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    `;
  }

  /**
   * Generate footer
   */
  private generateFooter(data: SwotActionPlanData): string {
    return `
      <div class="footer">
        <div>SWOT Analysis Action Plan - ${data.companyName}</div>
        <div>Total Action Items: ${data.actionItems.length} | Generated: ${new Date().toLocaleString()}</div>
        ${data.lastUpdated ? `<div>Last Updated: ${new Date(data.lastUpdated).toLocaleString()}</div>` : ''}
      </div>
    `;
  }

  /**
   * Calculate statistics
   */
  private calculateStats(items: SwotActionPlanItem[]) {
    return {
      total: items.length,
      byCategory: {
        strength: items.filter(item => item.category === 'strength').length,
        weakness: items.filter(item => item.category === 'weakness').length,
        opportunity: items.filter(item => item.category === 'opportunity').length,
        threat: items.filter(item => item.category === 'threat').length
      },
      byStatus: {
        identified: items.filter(item => item.status === 'identified').length,
        planning: items.filter(item => item.status === 'planning').length,
        in_progress: items.filter(item => item.status === 'in_progress').length,
        completed: items.filter(item => item.status === 'completed').length,
        on_hold: items.filter(item => item.status === 'on_hold').length
      }
    };
  }

  /**
   * Calculate priority statistics
   */
  private calculatePriorityStats(items: SwotActionPlanItem[]) {
    return {
      critical: items.filter(item => item.priority === 'critical').length,
      high: items.filter(item => item.priority === 'high').length,
      medium: items.filter(item => item.priority === 'medium').length,
      low: items.filter(item => item.priority === 'low').length
    };
  }

  /**
   * Sort action items by priority and due date
   */
  private sortActionItems(items: SwotActionPlanItem[]): SwotActionPlanItem[] {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

    return [...items].sort((a, b) => {
      // First sort by priority
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by due date (items with dates first, then by date)
      if (a.target_date && !b.target_date) return -1;
      if (!a.target_date && b.target_date) return 1;
      if (a.target_date && b.target_date) {
        return new Date(a.target_date).getTime() - new Date(b.target_date).getTime();
      }

      // Finally by category
      return a.category.localeCompare(b.category);
    });
  }

  /**
   * Helper methods
   */
  private escapeHtml(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private capitalizeFirst(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  private getStatusDisplay(status: string): string {
    const statusMap = {
      identified: '📝 Identified',
      planning: '📋 Planning',
      in_progress: '⚙️ In Progress',
      completed: '✅ Completed',
      on_hold: '⏸️ On Hold'
    };
    return statusMap[status as keyof typeof statusMap] || status;
  }

  private formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  private getDateClass(dateString?: string): string {
    if (!dateString) return '';

    const dueDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dueDate < today) {
      return 'color: #dc2626; font-weight: bold;'; // Overdue
    }

    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

    if (dueDate <= threeDaysFromNow) {
      return 'color: #ea580c; font-weight: bold;'; // Due soon
    }

    return '';
  }

  private getImpactColor(impact: string): string {
    const colorMap = {
      low: '#6b7280',
      medium: '#d97706',
      high: '#dc2626'
    };
    return colorMap[impact as keyof typeof colorMap] || '#6b7280';
  }

  /**
   * Convert SWOT data structure to action plan data
   */
  convertSwotToActionPlan(swotData: any, companyName: string, companyId: string): SwotActionPlanData {
    const actionItems: SwotActionPlanItem[] = [];

    // Extract action items from all SWOT categories
    const categories = ['strengths', 'weaknesses', 'opportunities', 'threats'];
    const categoryMap = {
      strengths: 'strength',
      weaknesses: 'weakness',
      opportunities: 'opportunity',
      threats: 'threat'
    };

    categories.forEach(category => {
      const items = swotData.data?.internal?.[category] || swotData.data?.external?.[category] || [];
      items.forEach((item: any) => {
        if (item.action_required && item.action_required.trim()) {
          actionItems.push({
            description: item.description || '',
            action_required: item.action_required,
            assigned_to: item.assigned_to,
            target_date: item.target_date,
            status: item.status || 'identified',
            priority: item.priority || 'medium',
            impact: item.impact || 'medium',
            category: categoryMap[category as keyof typeof categoryMap] as any,
            date_added: item.date_added
          });
        }
      });
    });

    return {
      companyName,
      companyId,
      actionItems,
      summary: swotData.data?.summary,
      analysisDate: swotData.data?.analysis_date,
      lastUpdated: swotData.data?.last_updated
    };
  }
}
