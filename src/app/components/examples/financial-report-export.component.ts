import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocumentGeneratorService, DocumentSection, DocumentConfig } from '../../../services/pdf/document-generator.service';
import { PdfService } from '../../../services/pdf';

@Component({
  selector: 'app-financial-report-export',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6">
      <h2 class="text-2xl font-bold mb-4">Financial Report Export Example</h2>

      <div class="space-y-4">
        <button
          (click)="generateFinancialReport()"
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          [disabled]="isGenerating">
          {{ isGenerating ? 'Generating...' : 'Generate Financial Report' }}
        </button>

        <button
          (click)="generateComplianceReport()"
          class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          [disabled]="isGenerating">
          {{ isGenerating ? 'Generating...' : 'Generate Compliance Report' }}
        </button>

        <button
          (click)="generateProjectTimeline()"
          class="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
          [disabled]="isGenerating">
          {{ isGenerating ? 'Generating...' : 'Generate Project Timeline' }}
        </button>
      </div>
    </div>
  `
})
export class FinancialReportExportComponent {
  isGenerating = false;

  constructor(
    private documentGenerator: DocumentGeneratorService,
    private pdfService: PdfService
  ) {}

  generateFinancialReport(): void {
    this.isGenerating = true;

    try {
      // Example: Financial Report with multiple sections
      const sections: DocumentSection[] = [
        {
          type: 'header',
          config: {
            title: 'Financial Performance Report',
            subtitle: 'Quarterly Analysis Q3 2025',
            companyName: 'Acme Corporation',
            date: new Date().toLocaleDateString()
          }
        },
        {
          type: 'content',
          content: `
            <h2>Executive Summary</h2>
            <p>This report provides a comprehensive analysis of the company's financial performance
            for Q3 2025, highlighting key metrics, trends, and recommendations for future growth.</p>

            <h3>Key Highlights</h3>
            <ul>
              <li>Revenue increased by 15% compared to Q2 2025</li>
              <li>Operating margin improved to 18.5%</li>
              <li>Cash flow remained positive throughout the quarter</li>
            </ul>
          `
        },
        {
          type: 'table',
          config: {
            headers: ['Metric', 'Q2 2025', 'Q3 2025', 'Change', 'Status'],
            rows: [
              ['Revenue', '$2.4M', '$2.76M', '+15%', this.documentGenerator.generateStatusBadge({status: 'excellent', text: 'Excellent'})],
              ['Operating Costs', '$1.8M', '$2.1M', '+17%', this.documentGenerator.generateStatusBadge({status: 'fair', text: 'Fair'})],
              ['Net Profit', '$600K', '$660K', '+10%', this.documentGenerator.generateStatusBadge({status: 'good', text: 'Good'})],
              ['Cash Flow', '$450K', '$520K', '+16%', this.documentGenerator.generateStatusBadge({status: 'excellent', text: 'Excellent'})]
            ],
            styling: 'striped',
            columnWidths: ['30%', '17.5%', '17.5%', '15%', '20%']
          }
        },
        {
          type: 'priority-summary',
          config: {
            critical: 2,
            high: 5,
            medium: 8,
            low: 3,
            title: 'Financial Risk Assessment'
          }
        },
        {
          type: 'content',
          content: `
            <h2>Detailed Analysis</h2>
            <h3>Revenue Growth</h3>
            <p>The 15% revenue increase demonstrates strong market performance and effective sales strategies.
            Key growth drivers include:</p>
            <ul>
              <li>New product launches contributing 8% growth</li>
              <li>Market expansion accounting for 4% growth</li>
              <li>Customer retention improvements adding 3% growth</li>
            </ul>

            <h3>Recommendations</h3>
            <ol>
              <li>Continue investing in product development to maintain growth trajectory</li>
              <li>Optimize operational costs to improve margins</li>
              <li>Strengthen cash flow management for upcoming expansion plans</li>
            </ol>
          `
        },
        {
          type: 'footer',
          config: {
            text: 'This financial report was automatically generated from company data',
            companyName: 'Acme Corporation'
          }
        }
      ];

      const documentConfig: DocumentConfig = {
        title: 'Financial Performance Report Q3 2025',
        companyName: 'Acme Corporation',
        pageSize: 'A4',
        orientation: 'portrait'
      };

      const htmlDocument = this.documentGenerator.generateDocument(sections, documentConfig);

      // Generate PDF
      this.pdfService.downloadPdf(
        htmlDocument,
        'Acme_Financial_Report_Q3_2025.pdf',
        'A4',
        'portrait'
      );

    } catch (error) {
      console.error('Error generating financial report:', error);
      alert('Error generating report. Please try again.');
    } finally {
      this.isGenerating = false;
    }
  }

  generateComplianceReport(): void {
    this.isGenerating = true;

    try {
      // Example: Compliance Report using simple document generation
      const content = `
        <h2>Compliance Status Overview</h2>
        <p>This report provides an overview of the company's compliance status across various regulatory frameworks.</p>

        <h3>Regulatory Frameworks</h3>
        <table class="table-bordered">
          <thead>
            <tr>
              <th>Framework</th>
              <th>Status</th>
              <th>Last Audit</th>
              <th>Next Review</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>ISO 27001</td>
              <td>${this.documentGenerator.generateStatusBadge({status: 'approved', text: 'Compliant'})}</td>
              <td>2025-06-15</td>
              <td>2026-06-15</td>
            </tr>
            <tr>
              <td>GDPR</td>
              <td>${this.documentGenerator.generateStatusBadge({status: 'review', text: 'Under Review'})}</td>
              <td>2025-08-01</td>
              <td>2025-11-01</td>
            </tr>
            <tr>
              <td>SOX</td>
              <td>${this.documentGenerator.generateStatusBadge({status: 'approved', text: 'Compliant'})}</td>
              <td>2025-07-20</td>
              <td>2026-07-20</td>
            </tr>
          </tbody>
        </table>

        <h3>Key Findings</h3>
        <ul>
          <li>All critical compliance requirements are met</li>
          <li>Minor improvements needed in data retention policies</li>
          <li>Training programs updated to reflect new regulations</li>
        </ul>
      `;

      const htmlDocument = this.documentGenerator.generateSimpleDocument({
        title: 'Compliance Status Report',
        companyName: 'Acme Corporation',
        content: content,
        includeSummary: true,
        summaryData: {
          critical: 0,
          high: 2,
          medium: 3,
          low: 1,
          title: 'Compliance Issues by Priority'
        }
      });

      this.pdfService.downloadPdf(
        htmlDocument,
        'Acme_Compliance_Report_2025.pdf',
        'A4',
        'portrait'
      );

    } catch (error) {
      console.error('Error generating compliance report:', error);
      alert('Error generating report. Please try again.');
    } finally {
      this.isGenerating = false;
    }
  }

  generateProjectTimeline(): void {
    this.isGenerating = true;

    try {
      // Example: Project Timeline Report
      const sections: DocumentSection[] = [
        {
          type: 'header',
          config: {
            title: 'Project Timeline & Status Report',
            subtitle: 'Current Active Projects',
            companyName: 'Acme Corporation',
            date: new Date().toLocaleDateString()
          }
        },
        {
          type: 'content',
          content: `
            <h2>Project Overview</h2>
            <p>This report provides the current status and timeline for all active projects within the organization.</p>
          `
        },
        {
          type: 'table',
          config: {
            headers: ['Project Name', 'Status', 'Progress', 'Start Date', 'Expected Completion'],
            rows: [
              ['Website Redesign', this.documentGenerator.generateStatusBadge({status: 'active', text: 'Active'}), '75%', '2025-07-01', '2025-10-15'],
              ['ERP Implementation', this.documentGenerator.generateStatusBadge({status: 'review', text: 'In Review'}), '45%', '2025-06-15', '2025-12-31'],
              ['Mobile App Development', this.documentGenerator.generateStatusBadge({status: 'active', text: 'Active'}), '60%', '2025-08-01', '2025-11-30'],
              ['Security Audit', this.documentGenerator.generateStatusBadge({status: 'not_started', text: 'Not Started'}), '0%', '2025-10-01', '2025-12-15']
            ],
            styling: 'bordered',
            columnWidths: ['25%', '15%', '15%', '22.5%', '22.5%']
          }
        },
        {
          type: 'priority-summary',
          config: {
            critical: 1,
            high: 3,
            medium: 2,
            low: 0,
            title: 'Project Risk Assessment'
          }
        },
        {
          type: 'page-break'
        },
        {
          type: 'content',
          content: `
            <h2>Project Details</h2>

            <h3>Website Redesign</h3>
            <p><strong>Status:</strong> On track, 75% complete</p>
            <p><strong>Key Milestones:</strong></p>
            <ul>
              <li>✅ Design phase completed (July 2025)</li>
              <li>✅ Development started (August 2025)</li>
              <li>🔄 Testing phase (September 2025)</li>
              <li>⏳ Launch preparation (October 2025)</li>
            </ul>

            <h3>ERP Implementation</h3>
            <p><strong>Status:</strong> Under review due to scope changes</p>
            <p><strong>Current Issues:</strong></p>
            <ul>
              <li>Budget revision required</li>
              <li>Additional training needs identified</li>
              <li>Integration complexity higher than expected</li>
            </ul>
          `
        }
      ];

      const documentConfig: DocumentConfig = {
        title: 'Project Timeline Report',
        companyName: 'Acme Corporation',
        pageSize: 'A4',
        orientation: 'portrait'
      };

      const htmlDocument = this.documentGenerator.generateDocument(sections, documentConfig);

      this.pdfService.downloadPdf(
        htmlDocument,
        'Acme_Project_Timeline_2025.pdf',
        'A4',
        'portrait'
      );

    } catch (error) {
      console.error('Error generating project timeline:', error);
      alert('Error generating report. Please try again.');
    } finally {
      this.isGenerating = false;
    }
  }
}
