import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PdfService, PdfTemplateService, InvoiceData, ReportData } from '../../services/pdf';

@Component({
  selector: 'app-pdf-generator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="pdf-generator">
      <h2>PDF Generator</h2>

      <div class="tabs">
        <button
          [class.active]="activeTab === 'custom'"
          (click)="activeTab = 'custom'">
          Custom HTML
        </button>
        <button
          [class.active]="activeTab === 'invoice'"
          (click)="activeTab = 'invoice'">
          Invoice
        </button>
        <button
          [class.active]="activeTab === 'report'"
          (click)="activeTab = 'report'">
          Report
        </button>
      </div>

      <!-- Custom HTML Tab -->
      <div *ngIf="activeTab === 'custom'" class="tab-content">
        <div class="form-group">
          <label>HTML Content:</label>
          <textarea
            [(ngModel)]="htmlContent"
            rows="10"
            placeholder="Enter your HTML content here...">
          </textarea>
        </div>

        <div class="form-group">
          <label>Filename:</label>
          <input type="text" [(ngModel)]="filename" placeholder="document.pdf">
        </div>

        <div class="form-group">
          <label>Paper Size:</label>
          <select [(ngModel)]="paperSize">
            <option value="A4">A4</option>
            <option value="A3">A3</option>
            <option value="Letter">Letter</option>
            <option value="Legal">Legal</option>
          </select>
        </div>

        <div class="form-group">
          <label>Orientation:</label>
          <select [(ngModel)]="orientation">
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </select>
        </div>

        <div class="actions">
          <button (click)="downloadCustomPdf()" [disabled]="!htmlContent">
            Download PDF
          </button>
          <button (click)="previewCustomPdf()" [disabled]="!htmlContent">
            Preview PDF
          </button>
        </div>
      </div>

      <!-- Invoice Tab -->
      <div *ngIf="activeTab === 'invoice'" class="tab-content">
        <div class="form-group">
          <label>Invoice Number:</label>
          <input type="text" [(ngModel)]="sampleInvoice.number">
        </div>

        <div class="form-group">
          <label>Client Name:</label>
          <input type="text" [(ngModel)]="sampleInvoice.client.name">
        </div>

        <div class="form-group">
          <label>Total Amount:</label>
          <input type="number" [(ngModel)]="sampleInvoice.total">
        </div>

        <div class="actions">
          <button (click)="generateSampleInvoice()">
            Generate Invoice PDF
          </button>
        </div>
      </div>

      <!-- Report Tab -->
      <div *ngIf="activeTab === 'report'" class="tab-content">
        <div class="form-group">
          <label>Report Title:</label>
          <input type="text" [(ngModel)]="sampleReport.title">
        </div>

        <div class="form-group">
          <label>Report Subtitle:</label>
          <input type="text" [(ngModel)]="sampleReport.subtitle">
        </div>

        <div class="actions">
          <button (click)="generateSampleReport()">
            Generate Report PDF
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pdf-generator {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }

    .tabs {
      display: flex;
      margin-bottom: 20px;
      border-bottom: 1px solid #ddd;
    }

    .tabs button {
      background: none;
      border: none;
      padding: 10px 20px;
      cursor: pointer;
      border-bottom: 2px solid transparent;
    }

    .tabs button.active {
      border-bottom-color: #007bff;
      color: #007bff;
    }

    .tab-content {
      padding: 20px 0;
    }

    .form-group {
      margin-bottom: 15px;
    }

    .form-group label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }

    .form-group textarea {
      font-family: monospace;
      resize: vertical;
    }

    .actions {
      margin-top: 20px;
    }

    .actions button {
      margin-right: 10px;
      padding: 10px 20px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }

    .actions button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .actions button:hover:not(:disabled) {
      background: #0056b3;
    }
  `]
})
export class PdfGeneratorComponent {
  activeTab: 'custom' | 'invoice' | 'report' = 'custom';

  // Custom HTML properties
  htmlContent = `
    <h1 style="color: #333; text-align: center;">Sample Document</h1>
    <p style="margin: 20px; line-height: 1.6;">
      This is a sample HTML content that will be converted to PDF.
    </p>
    <table style="width: 100%; border-collapse: collapse;">
      <tr style="background: #f5f5f5;">
        <th style="border: 1px solid #ddd; padding: 8px;">Name</th>
        <th style="border: 1px solid #ddd; padding: 8px;">Value</th>
      </tr>
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">Item 1</td>
        <td style="border: 1px solid #ddd; padding: 8px;">$100</td>
      </tr>
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">Item 2</td>
        <td style="border: 1px solid #ddd; padding: 8px;">$200</td>
      </tr>
    </table>
  `;

  filename = 'my-document.pdf';
  paperSize = 'A4';
  orientation: 'portrait' | 'landscape' = 'portrait';

  // Sample invoice data
  sampleInvoice: InvoiceData = {
    number: 'INV-001',
    date: new Date().toLocaleDateString(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    client: {
      name: 'Acme Corporation',
      address: '123 Business St, City, State 12345',
      email: 'billing@acme.com'
    },
    company: {
      name: 'Your Company',
      address: '456 Company Ave, City, State 67890',
      email: 'hello@yourcompany.com',
      phone: '+1 (555) 123-4567'
    },
    items: [
      {
        description: 'Consulting Services',
        quantity: 10,
        rate: 150,
        amount: 1500
      },
      {
        description: 'Development Work',
        quantity: 20,
        rate: 100,
        amount: 2000
      }
    ],
    subtotal: 3500,
    tax: 350,
    total: 3850
  };

  // Sample report data
  sampleReport: ReportData = {
    title: 'Monthly Business Report',
    subtitle: 'Performance Analysis and Insights',
    date: new Date().toLocaleDateString(),
    sections: [
      {
        title: 'Executive Summary',
        content: 'This month showed significant growth in key performance indicators...'
      },
      {
        title: 'Financial Performance',
        content: 'Revenue increased by 15% compared to last month.',
        data: [
          { Metric: 'Revenue', Value: '$125,000', Change: '+15%' },
          { Metric: 'Expenses', Value: '$85,000', Change: '+5%' },
          { Metric: 'Profit', Value: '$40,000', Change: '+35%' }
        ]
      }
    ],
    footer: 'Confidential - For internal use only'
  };

  constructor(
    private pdfService: PdfService,
    private pdfTemplateService: PdfTemplateService
  ) {}

  downloadCustomPdf(): void {
    this.pdfService.downloadPdf(
      this.htmlContent,
      this.filename,
      this.paperSize,
      this.orientation
    );
  }

  previewCustomPdf(): void {
    this.pdfService.previewPdf(
      this.htmlContent,
      this.paperSize,
      this.orientation
    );
  }

  generateSampleInvoice(): void {
    this.pdfTemplateService.generateInvoice(this.sampleInvoice);
  }

  generateSampleReport(): void {
    this.pdfTemplateService.generateReport(this.sampleReport);
  }
}
