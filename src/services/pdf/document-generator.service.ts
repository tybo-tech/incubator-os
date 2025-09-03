import { Injectable } from '@angular/core';

export interface DocumentConfig {
  title: string;
  companyName?: string;
  pageSize?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
  margins?: string;
  includeHeader?: boolean;
  includeFooter?: boolean;
  customStyles?: string;
}

export interface StatusBadgeConfig {
  status: string;
  text: string;
  colorScheme?: 'default' | 'action-plan' | 'financial' | 'project';
}

export interface PrioritySummaryConfig {
  critical: number;
  high: number;
  medium: number;
  low: number;
  title?: string;
  colorScheme?: 'default' | 'vibrant' | 'muted';
}

export interface TableConfig {
  headers: string[];
  rows: any[][];
  styling?: 'default' | 'striped' | 'bordered' | 'minimal';
  columnWidths?: string[];
  sortable?: boolean;
}

export interface DocumentSection {
  type: 'header' | 'content' | 'table' | 'priority-summary' | 'footer' | 'page-break';
  content?: string;
  config?: any;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentGeneratorService {

  constructor() { }

  /**
   * Generate a complete HTML document optimized for DomPDF
   */
  generateDocument(sections: DocumentSection[], config: DocumentConfig): string {
    const styles = this.generateDomPdfStyles(config);
    const content = sections.map(section => this.renderSection(section)).join('\n');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${config.title}</title>
        ${styles}
      </head>
      <body>
        <div id="pdf-content">
          ${content}
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate standardized DomPDF styles
   */
  private generateDomPdfStyles(config: DocumentConfig): string {
    const pageSize = config.pageSize || 'A4';
    const orientation = config.orientation || 'portrait';
    const margins = config.margins || '1cm';

    return `
      <style>
        @page {
          margin: ${margins};
          size: ${pageSize} ${orientation};
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: DejaVu Sans, Arial, sans-serif;
          font-size: 10pt;
          line-height: 1.4;
          color: #333;
          background: white;
        }

        /* Page break controls */
        .page-break-before { page-break-before: always; }
        .page-break-after { page-break-after: always; }
        .no-page-break { page-break-inside: avoid; }

        /* Content wrapper */
        #pdf-content {
          width: 100%;
          padding: 0;
          margin: 0;
        }

        /* Typography hierarchy */
        h1 {
          font-size: 18pt;
          font-weight: bold;
          color: #111;
          margin-bottom: 8pt;
          page-break-after: avoid;
          border-bottom: 2pt solid #e5e7eb;
          padding-bottom: 4pt;
        }

        h2 {
          font-size: 14pt;
          font-weight: bold;
          color: #333;
          margin: 15pt 0 8pt 0;
          page-break-after: avoid;
        }

        h3 {
          font-size: 12pt;
          font-weight: bold;
          color: #555;
          margin: 10pt 0 5pt 0;
          page-break-after: avoid;
        }

        h4 {
          font-size: 11pt;
          font-weight: 600;
          color: #666;
          margin: 8pt 0 4pt 0;
          page-break-after: avoid;
        }

        p {
          margin-bottom: 8pt;
          font-size: 9pt;
          color: #666;
          line-height: 1.5;
        }

        /* Table styling optimized for DomPDF */
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15pt;
          page-break-inside: avoid;
        }

        th, td {
          padding: 6pt 8pt;
          vertical-align: top;
          word-wrap: break-word;
          font-size: 8pt;
          border: 1pt solid #e5e7eb;
        }

        th {
          background-color: #f9fafb;
          font-weight: bold;
          page-break-after: avoid;
          text-align: left;
        }

        tr {
          page-break-inside: avoid;
        }

        /* Table styling variants */
        .table-striped tr:nth-child(even) {
          background-color: #f9fafb;
        }

        .table-bordered {
          border: 2pt solid #d1d5db;
        }

        .table-minimal th,
        .table-minimal td {
          border: none;
          border-bottom: 1pt solid #e5e7eb;
        }

        /* Priority Summary Table */
        .priority-summary-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15pt;
        }

        .priority-summary-table td {
          text-align: center;
          padding: 12pt;
          border: 1pt solid #e5e7eb;
          font-size: 9pt;
          font-weight: 600;
        }

        /* Status Badge Styling */
        .status-badge {
          display: inline-block;
          padding: 2pt 6pt;
          border-radius: 3pt;
          font-size: 7pt;
          font-weight: bold;
          border: 1pt solid #cbd5e1;
          white-space: nowrap;
        }

        /* Enhanced Status Color Scheme */
        .status-identified { background-color: #f1f5f9; color: #334155; border-color: #cbd5e1; }
        .status-planning { background-color: #dbeafe; color: #1d4ed8; border-color: #93c5fd; }
        .status-in-progress { background-color: #fef3c7; color: #b45309; border-color: #fcd34d; }
        .status-completed { background-color: #dcfce7; color: #15803d; border-color: #86efac; }
        .status-on-hold { background-color: #fee2e2; color: #dc2626; border-color: #fca5a5; }

        /* Financial Status Colors */
        .status-excellent { background-color: #dcfce7; color: #15803d; border-color: #86efac; }
        .status-good { background-color: #d1fae5; color: #16a34a; border-color: #86efac; }
        .status-fair { background-color: #fef3c7; color: #d97706; border-color: #fcd34d; }
        .status-poor { background-color: #fed7aa; color: #ea580c; border-color: #fdba74; }
        .status-critical { background-color: #fee2e2; color: #dc2626; border-color: #fca5a5; }

        /* Project Status Colors */
        .status-not-started { background-color: #f3f4f6; color: #6b7280; border-color: #d1d5db; }
        .status-active { background-color: #dbeafe; color: #2563eb; border-color: #93c5fd; }
        .status-review { background-color: #e0e7ff; color: #6366f1; border-color: #c7d2fe; }
        .status-approved { background-color: #dcfce7; color: #16a34a; border-color: #86efac; }
        .status-rejected { background-color: #fee2e2; color: #dc2626; border-color: #fca5a5; }

        /* Priority Colors */
        .priority-critical { background-color: #fee2e2; color: #991b1b; }
        .priority-high { background-color: #fed7aa; color: #c2410c; }
        .priority-medium { background-color: #fef3c7; color: #92400e; }
        .priority-low { background-color: #f3f4f6; color: #4b5563; }

        /* Document header/footer */
        .document-header {
          border-bottom: 2pt solid #e5e7eb;
          padding-bottom: 10pt;
          margin-bottom: 20pt;
          page-break-after: avoid;
        }

        .document-footer {
          border-top: 1pt solid #e5e7eb;
          padding-top: 10pt;
          margin-top: 20pt;
          text-align: center;
          font-size: 8pt;
          color: #6b7280;
        }

        .company-logo {
          max-height: 40pt;
          margin-bottom: 10pt;
        }

        /* Content sections */
        .content-section {
          margin-bottom: 20pt;
          page-break-inside: avoid;
        }

        .summary-card {
          background-color: #f9fafb;
          border: 1pt solid #e5e7eb;
          padding: 10pt;
          margin-bottom: 15pt;
          page-break-inside: avoid;
        }

        /* Remove modern CSS that DomPDF doesn't support */
        .rounded-lg, .shadow-sm, .shadow {
          border-radius: 0;
          box-shadow: none;
        }

        /* Utility classes */
        .text-center { text-align: center; }
        .text-left { text-align: left; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .font-semibold { font-weight: 600; }
        .text-muted { color: #6b7280; }
        .mb-small { margin-bottom: 5pt; }
        .mb-medium { margin-bottom: 10pt; }
        .mb-large { margin-bottom: 15pt; }

        ${config.customStyles || ''}
      </style>
    `;
  }

  /**
   * Render individual document sections
   */
  private renderSection(section: DocumentSection): string {
    switch (section.type) {
      case 'header':
        return this.renderHeader(section.config);
      case 'content':
        return `<div class="content-section">${section.content}</div>`;
      case 'table':
        return this.renderTable(section.config);
      case 'priority-summary':
        return this.renderPrioritySummary(section.config);
      case 'footer':
        return this.renderFooter(section.config);
      case 'page-break':
        return '<div class="page-break-before"></div>';
      default:
        return section.content || '';
    }
  }

  /**
   * Generate document header
   */
  renderHeader(config: any): string {
    const { title, subtitle, companyName, date, logoUrl } = config;

    return `
      <div class="document-header">
        ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="company-logo">` : ''}
        <h1>${title}</h1>
        ${subtitle ? `<h2 class="text-muted">${subtitle}</h2>` : ''}
        <div class="text-right text-muted" style="font-size: 8pt;">
          ${companyName ? `${companyName} | ` : ''}
          Generated on ${date || new Date().toLocaleDateString()}
        </div>
      </div>
    `;
  }

  /**
   * Generate document footer
   */
  renderFooter(config: any): string {
    const { text, companyName, date } = config;

    return `
      <div class="document-footer">
        <p>${text || `This document was generated on ${date || new Date().toLocaleDateString()}`}</p>
        ${companyName ? `<p>Generated for ${companyName}</p>` : ''}
      </div>
    `;
  }

  /**
   * Generate status badge HTML
   */
  generateStatusBadge(config: StatusBadgeConfig): string {
    const colorScheme = config.colorScheme || 'default';
    const statusClass = `status-${config.status.toLowerCase().replace('_', '-')}`;

    return `
      <span class="status-badge ${statusClass}">
        ${config.text}
      </span>
    `;
  }

  /**
   * Generate priority summary table
   */
  renderPrioritySummary(config: PrioritySummaryConfig): string {
    const title = config.title || 'Priority Summary';

    return `
      <div class="summary-card">
        <h3 class="mb-medium">${title}</h3>
        <table class="priority-summary-table">
          <tr>
            <td class="priority-critical">
              <div style="font-size: 14pt; font-weight: bold;">${config.critical}</div>
              <div>Critical</div>
            </td>
            <td class="priority-high">
              <div style="font-size: 14pt; font-weight: bold;">${config.high}</div>
              <div>High</div>
            </td>
            <td class="priority-medium">
              <div style="font-size: 14pt; font-weight: bold;">${config.medium}</div>
              <div>Medium</div>
            </td>
            <td class="priority-low">
              <div style="font-size: 14pt; font-weight: bold;">${config.low}</div>
              <div>Low</div>
            </td>
          </tr>
        </table>
      </div>
    `;
  }

  /**
   * Generate table HTML
   */
  renderTable(config: TableConfig): string {
    const styling = config.styling || 'default';
    const tableClass = styling !== 'default' ? `table-${styling}` : '';

    const headers = config.headers.map((header, index) => {
      const width = config.columnWidths?.[index] || 'auto';
      return `<th style="width: ${width};">${header}</th>`;
    }).join('');

    const rows = config.rows.map(row => {
      const cells = row.map(cell => `<td>${cell}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    return `
      <table class="${tableClass}">
        <thead>
          <tr>${headers}</tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  /**
   * Clean HTML content for DomPDF compatibility
   */
  cleanContentForDomPdf(content: string): string {
    let processedContent = content;

    // Remove CSS Grid layouts and replace with table layouts
    processedContent = processedContent.replace(
      /style="display:\s*grid[^"]*"/g,
      'style="width: 100%"'
    );

    // Convert CSS Grid summary to table layout
    processedContent = processedContent.replace(
      /<div[^>]*grid-template-columns[^>]*>(.*?)<\/div>/gs,
      (match, content) => {
        const items = content.match(/<div[^>]*?>(.*?)<\/div>/gs) || [];
        if (items.length >= 4) {
          const cells = items.slice(0, 4).map((item: string) => {
            const cleanContent = item.replace(/<\/?div[^>]*>/g, '');
            return `<td style="text-align: center; padding: 15px; width: 25%;">${cleanContent}</td>`;
          }).join('');
          return `<table style="width: 100%; border-collapse: collapse;"><tr>${cells}</tr></table>`;
        }
        return match;
      }
    );

    // Remove modern CSS properties that DomPDF doesn't support
    processedContent = processedContent.replace(/border-radius:[^;]+;/g, '');
    processedContent = processedContent.replace(/box-shadow:[^;]+;/g, '');
    processedContent = processedContent.replace(/transform:[^;]+;/g, '');
    processedContent = processedContent.replace(/transition:[^;]+;/g, '');

    return processedContent;
  }

  /**
   * Generate a simple document with predefined structure
   */
  generateSimpleDocument(config: {
    title: string;
    companyName?: string;
    content: string;
    includeSummary?: boolean;
    summaryData?: PrioritySummaryConfig;
  }): string {
    const sections: DocumentSection[] = [
      {
        type: 'header',
        config: {
          title: config.title,
          companyName: config.companyName,
          date: new Date().toLocaleDateString()
        }
      },
      {
        type: 'content',
        content: config.content
      }
    ];

    if (config.includeSummary && config.summaryData) {
      sections.push({
        type: 'priority-summary',
        config: config.summaryData
      });
    }

    sections.push({
      type: 'footer',
      config: {
        companyName: config.companyName,
        date: new Date().toLocaleDateString()
      }
    });

    const documentConfig: DocumentConfig = {
      title: config.title,
      companyName: config.companyName,
      pageSize: 'A4',
      orientation: 'portrait'
    };

    return this.generateDocument(sections, documentConfig);
  }
}
