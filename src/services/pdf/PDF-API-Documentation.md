# PDF Generation API Documentation

## Overview
A dynamic PDF generation service that converts HTML content to PDF documents via HTTP POST requests.

**Base URL:** `https://docs.tybo.co.za/pdf.php`

## API Endpoint

### Generate PDF
**URL:** `https://docs.tybo.co.za/pdf.php`  
**Method:** `POST`  
**Content-Type:** `application/json`

## Request Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `html` | string | ✅ Yes | - | HTML content to convert to PDF |
| `filename` | string | ❌ No | `document.pdf` | Name of the generated PDF file |
| `paper_size` | string | ❌ No | `A4` | Paper size (A4, A3, Letter, Legal, etc.) |
| `orientation` | string | ❌ No | `portrait` | Page orientation (`portrait` or `landscape`) |
| `download` | boolean | ❌ No | `false` | Force download (`true`) or inline view (`false`) |

## Response

- **Success:** Returns PDF file with `Content-Type: application/pdf`
- **Error:** Returns JSON with error details and appropriate HTTP status code

## Angular Integration

### 1. Service Implementation

Create a PDF service to handle API calls:

```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PdfRequest {
  html: string;
  filename?: string;
  paper_size?: string;
  orientation?: 'portrait' | 'landscape';
  download?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PdfService {
  private apiUrl = 'https://docs.tybo.co.za/pdf.php';

  constructor(private http: HttpClient) {}

  generatePdf(request: PdfRequest): Observable<Blob> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post(this.apiUrl, request, {
      headers,
      responseType: 'blob'
    });
  }

  downloadPdf(html: string, filename: string = 'document.pdf'): void {
    const request: PdfRequest = {
      html,
      filename,
      download: true
    };

    this.generatePdf(request).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('PDF generation failed:', error);
      }
    });
  }

  previewPdf(html: string): void {
    const request: PdfRequest = {
      html,
      download: false
    };

    this.generatePdf(request).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        // Clean up the URL after a delay
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      },
      error: (error) => {
        console.error('PDF preview failed:', error);
      }
    });
  }
}
```

### 2. Component Usage

Example component implementation:

```typescript
import { Component } from '@angular/core';
import { PdfService } from './pdf.service';

@Component({
  selector: 'app-pdf-generator',
  template: `
    <div class="pdf-generator">
      <h2>PDF Generator</h2>
      
      <div class="form-group">
        <label>HTML Content:</label>
        <textarea 
          [(ngModel)]="htmlContent" 
          rows="10" 
          cols="50"
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
        <button (click)="downloadPdf()" [disabled]="!htmlContent">
          Download PDF
        </button>
        <button (click)="previewPdf()" [disabled]="!htmlContent">
          Preview PDF
        </button>
      </div>
    </div>
  `
})
export class PdfGeneratorComponent {
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
    </table>
  `;
  
  filename = 'my-document.pdf';
  paperSize = 'A4';
  orientation: 'portrait' | 'landscape' = 'portrait';

  constructor(private pdfService: PdfService) {}

  downloadPdf(): void {
    this.pdfService.downloadPdf(this.htmlContent, this.filename);
  }

  previewPdf(): void {
    this.pdfService.previewPdf(this.htmlContent);
  }
}
```

### 3. Advanced Usage with Templates

For complex documents, create reusable templates:

```typescript
export class InvoiceService {
  constructor(private pdfService: PdfService) {}

  generateInvoice(invoiceData: any): void {
    const html = this.createInvoiceTemplate(invoiceData);
    this.pdfService.downloadPdf(html, `invoice-${invoiceData.number}.pdf`);
  }

  private createInvoiceTemplate(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${data.number}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          .invoice-details { margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #f2f2f2; }
          .total { font-weight: bold; background-color: #e8f4f8; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>INVOICE</h1>
          <h2>Invoice #${data.number}</h2>
        </div>
        
        <div class="invoice-details">
          <p><strong>Date:</strong> ${data.date}</p>
          <p><strong>Due Date:</strong> ${data.dueDate}</p>
          <p><strong>Client:</strong> ${data.client.name}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Quantity</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.map((item: any) => `
              <tr>
                <td>${item.description}</td>
                <td>${item.quantity}</td>
                <td>$${item.rate}</td>
                <td>$${item.amount}</td>
              </tr>
            `).join('')}
            <tr class="total">
              <td colspan="3">Total</td>
              <td>$${data.total}</td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;
  }
}
```

## Error Handling

The API returns JSON error responses with appropriate HTTP status codes:

```typescript
this.pdfService.generatePdf(request).subscribe({
  next: (blob) => {
    // Handle successful PDF generation
  },
  error: (error) => {
    if (error.status === 400) {
      console.error('Bad Request: Missing HTML content');
    } else if (error.status === 405) {
      console.error('Method not allowed');
    } else if (error.status === 500) {
      console.error('Server error during PDF generation');
    }
  }
});
```

## Best Practices

### 1. HTML Content Guidelines
- Use inline CSS for styling (external stylesheets may not load)
- Test with Google Fonts by including the font link in the HTML head
- Avoid complex JavaScript (it won't execute in PDF)
- Use absolute URLs for images

### 2. Performance Tips
- Keep HTML content reasonable in size
- Cache generated PDFs when possible
- Show loading indicators during generation

### 3. Security Considerations
- Sanitize HTML content before sending to API
- Validate file names to prevent directory traversal
- Consider implementing rate limiting on the client side

## Example Request

```typescript
const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&display=swap" rel="stylesheet">
    <style>
      body { font-family: 'Roboto', sans-serif; margin: 40px; }
      .header { background: linear-gradient(45deg, #667eea, #764ba2); color: white; padding: 20px; }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>Professional Document</h1>
    </div>
    <p>This document demonstrates the PDF generation capabilities.</p>
  </body>
  </html>
`;

const request = {
  html: htmlContent,
  filename: 'professional-doc.pdf',
  paper_size: 'A4',
  orientation: 'portrait',
  download: true
};
```

## Module Dependencies

Don't forget to import required modules in your Angular application:

```typescript
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@NgModule({
  imports: [
    HttpClientModule,
    FormsModule,
    // ... other imports
  ],
  // ...
})
export class AppModule { }
```

This documentation provides everything needed to integrate the PDF generation API into Angular applications efficiently.
