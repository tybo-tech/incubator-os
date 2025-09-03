# PDF Service Usage Guide

This guide demonstrates how to use the PDF generation services in your Angular components.

## Basic Usage

### 1. Import the Services

```typescript
import { Component } from '@angular/core';
import { PdfService, PdfTemplateService, InvoiceData, ReportData } from '../../services/pdf';
```

### 2. Inject Services in Constructor

```typescript
constructor(
  private pdfService: PdfService,
  private pdfTemplateService: PdfTemplateService
) {}
```

### 3. Generate Simple PDF

```typescript
generateSimplePdf(): void {
  const htmlContent = `
    <h1>My Document</h1>
    <p>This is a simple PDF document.</p>
  `;
  
  this.pdfService.downloadPdf(htmlContent, 'my-document.pdf');
}
```

## Advanced Usage Examples

### Invoice Generation

```typescript
generateInvoice(): void {
  const invoiceData: InvoiceData = {
    number: 'INV-001',
    date: '2025-09-03',
    dueDate: '2025-10-03',
    client: {
      name: 'Client Company',
      address: '123 Client St',
      email: 'client@company.com'
    },
    company: {
      name: 'Your Company',
      address: '456 Your St',
      email: 'hello@yourcompany.com'
    },
    items: [
      {
        description: 'Service 1',
        quantity: 1,
        rate: 100,
        amount: 100
      }
    ],
    subtotal: 100,
    tax: 10,
    total: 110
  };

  this.pdfTemplateService.generateInvoice(invoiceData);
}
```

### Financial Report Generation

```typescript
generateFinancialReport(companyId: string): void {
  // Fetch company financial data
  this.companyFinancialsService.getFinancials(companyId).subscribe(data => {
    this.pdfTemplateService.generateFinancialSummary(data);
  });
}
```

### Custom Styled PDF

```typescript
generateStyledPdf(): void {
  const content = `
    <div class="header">
      <h1>Custom Report</h1>
    </div>
    <div class="content">
      <p>Your content here...</p>
    </div>
  `;

  const customStyles = `
    .header {
      background: linear-gradient(45deg, #667eea, #764ba2);
      color: white;
      padding: 20px;
      text-align: center;
    }
    .content {
      padding: 20px;
    }
  `;

  const html = this.pdfService.createHtmlTemplate(content, 'Custom Report', customStyles);
  this.pdfService.downloadPdf(html, 'custom-report.pdf');
}
```

## Integration with Existing Services

### Company Financial PDF Export

```typescript
export class CompanyFinancialComponent {
  constructor(
    private companyFinancialsService: CompanyFinancialsService,
    private pdfTemplateService: PdfTemplateService
  ) {}

  exportFinancialsPdf(companyId: string): void {
    this.companyFinancialsService.getFinancials(companyId).subscribe({
      next: (financials) => {
        this.pdfTemplateService.generateFinancialSummary(financials);
      },
      error: (error) => {
        console.error('Failed to fetch financial data:', error);
      }
    });
  }
}
```

### Form Session PDF Export

```typescript
export class FormSessionComponent {
  constructor(
    private formSessionService: FormSessionService,
    private pdfService: PdfService
  ) {}

  exportSessionPdf(sessionId: string): void {
    this.formSessionService.getSession(sessionId).subscribe({
      next: (session) => {
        const html = this.createSessionReport(session);
        this.pdfService.downloadPdf(html, `session-${sessionId}.pdf`);
      }
    });
  }

  private createSessionReport(session: any): string {
    const content = `
      <div class="header">
        <h1>Form Session Report</h1>
        <h2>Session ID: ${session.id}</h2>
        <p>Date: ${new Date(session.created_at).toLocaleDateString()}</p>
      </div>
      
      <div class="content">
        <h3>Responses</h3>
        ${session.responses.map((response: any) => `
          <div style="margin: 15px 0; padding: 10px; border-left: 3px solid #007bff;">
            <strong>${response.field_name}:</strong> ${response.value}
          </div>
        `).join('')}
      </div>
    `;

    return this.pdfService.createHtmlTemplate(content, 'Session Report');
  }
}
```

## Error Handling

The PDF service includes built-in error handling, but you can also implement custom error handling:

```typescript
generatePdfWithErrorHandling(): void {
  const html = '<h1>Test Document</h1>';
  
  this.pdfService.generatePdfBlob(html).subscribe({
    next: (blob) => {
      // Success - handle the blob
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    },
    error: (error) => {
      // Custom error handling
      if (error.status === 0) {
        alert('Network error: Please check your internet connection');
      } else if (error.status === 500) {
        alert('Server error: Please try again later');
      } else {
        alert('PDF generation failed');
      }
    }
  });
}
```

## Performance Tips

1. **Reuse HTML templates** - Create reusable template functions
2. **Optimize HTML content** - Keep content concise and well-structured
3. **Use loading indicators** - PDF generation can take a few seconds
4. **Cache generated PDFs** - Store frequently accessed PDFs

```typescript
@Component({
  template: `
    <button 
      (click)="generatePdf()" 
      [disabled]="isGenerating">
      {{ isGenerating ? 'Generating...' : 'Generate PDF' }}
    </button>
  `
})
export class MyComponent {
  isGenerating = false;

  generatePdf(): void {
    this.isGenerating = true;
    
    this.pdfService.generatePdfBlob(this.htmlContent).subscribe({
      next: (blob) => {
        this.isGenerating = false;
        // Handle success
      },
      error: (error) => {
        this.isGenerating = false;
        // Handle error
      }
    });
  }
}
```

## Testing

For unit testing, you can mock the PDF services:

```typescript
import { TestBed } from '@angular/core/testing';
import { PdfService } from './pdf.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('Component with PDF', () => {
  let mockPdfService: jasmine.SpyObj<PdfService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('PdfService', ['downloadPdf', 'previewPdf']);
    
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: PdfService, useValue: spy }
      ]
    });
    
    mockPdfService = TestBed.inject(PdfService) as jasmine.SpyObj<PdfService>;
  });

  it('should call PDF service', () => {
    // Your test implementation
    component.generatePdf();
    expect(mockPdfService.downloadPdf).toHaveBeenCalled();
  });
});
```
