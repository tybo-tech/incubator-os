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

  /**
   * Generate PDF from HTML content
   * @param request PDF generation request parameters
   * @returns Observable<Blob> PDF file blob
   */
  generatePdf(request: PdfRequest): Observable<Blob> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post(this.apiUrl, request, {
      headers,
      responseType: 'blob'
    });
  }

  /**
   * Download PDF file directly
   * @param html HTML content to convert
   * @param filename Name of the PDF file (default: 'document.pdf')
   * @param paperSize Paper size (default: 'A4')
   * @param orientation Page orientation (default: 'portrait')
   */
  downloadPdf(
    html: string,
    filename: string = 'document.pdf',
    paperSize: string = 'A4',
    orientation: 'portrait' | 'landscape' = 'portrait'
  ): void {
    const request: PdfRequest = {
      html,
      filename,
      paper_size: paperSize,
      orientation,
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
        this.handleError(error);
      }
    });
  }

  /**
   * Preview PDF in new tab
   * @param html HTML content to convert
   * @param paperSize Paper size (default: 'A4')
   * @param orientation Page orientation (default: 'portrait')
   */
  previewPdf(
    html: string,
    paperSize: string = 'A4',
    orientation: 'portrait' | 'landscape' = 'portrait'
  ): void {
    const request: PdfRequest = {
      html,
      paper_size: paperSize,
      orientation,
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
        this.handleError(error);
      }
    });
  }

  /**
   * Generate PDF and return as blob for custom handling
   * @param html HTML content to convert
   * @param options PDF generation options
   * @returns Observable<Blob>
   */
  generatePdfBlob(
    html: string,
    options: {
      filename?: string;
      paperSize?: string;
      orientation?: 'portrait' | 'landscape';
    } = {}
  ): Observable<Blob> {
    const request: PdfRequest = {
      html,
      filename: options.filename || 'document.pdf',
      paper_size: options.paperSize || 'A4',
      orientation: options.orientation || 'portrait',
      download: false
    };

    return this.generatePdf(request);
  }

  /**
   * Handle API errors with user-friendly messages
   * @param error HTTP error response
   */
  private handleError(error: any): void {
    let message = 'PDF generation failed';

    if (error.status === 400) {
      message = 'Bad Request: Missing or invalid HTML content';
    } else if (error.status === 405) {
      message = 'Method not allowed';
    } else if (error.status === 500) {
      message = 'Server error during PDF generation';
    } else if (error.status === 0) {
      message = 'Network error: Unable to reach PDF service';
    }

    // You can implement a toast notification service here
    console.error(message, error);

    // Example: this.notificationService.showError(message);
  }

  /**
   * Create a styled HTML template for PDF generation
   * @param content Main content HTML
   * @param title Document title
   * @param styles Additional CSS styles
   * @returns Complete HTML document string
   */
  createHtmlTemplate(
    content: string,
    title: string = 'Document',
    styles: string = ''
  ): string {
    const defaultStyles = `
      body {
        font-family: 'Arial', sans-serif;
        margin: 40px;
        line-height: 1.6;
        color: #333;
      }
      .header {
        text-align: center;
        margin-bottom: 30px;
        border-bottom: 2px solid #eee;
        padding-bottom: 20px;
      }
      .content {
        margin: 20px 0;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
      }
      th, td {
        border: 1px solid #ddd;
        padding: 12px;
        text-align: left;
      }
      th {
        background-color: #f2f2f2;
        font-weight: bold;
      }
      .footer {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid #eee;
        text-align: center;
        font-size: 12px;
        color: #666;
      }
    `;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          ${defaultStyles}
          ${styles}
        </style>
      </head>
      <body>
        ${content}
      </body>
      </html>
    `;
  }
}
