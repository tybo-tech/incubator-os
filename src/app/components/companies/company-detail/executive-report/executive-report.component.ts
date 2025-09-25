import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { INode } from '../../../../../models/schema';
import { NodeService } from '../../../../../services';
// Note: PDF export functionality temporarily disabled - html2pdf.js removed
import { CompanyReportSectionComponent } from './company-report-section.component';
import { AssessmentReportSectionComponent } from './assessment-report-section.component';
import { ICompany } from '../../../../../models/simple.schema';
import { CompanyService } from '../../../../../services/company.service';

@Component({
  selector: 'app-executive-report',
  standalone: true,
  imports: [CommonModule, CompanyReportSectionComponent, AssessmentReportSectionComponent],
  template: `
    <div class="min-h-screen bg-[#f9fafb]">
      <!-- Top bar -->
      <div class="sticky top-0 z-10 bg-[#ffffff] border-b border-[#e5e7eb]">
        <div class="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="h-9 w-9 rounded-md bg-[#3b82f6] text-white flex items-center justify-center font-bold">
              {{ company?.name?.charAt(0) || '•' }}
            </div>
            <div>
              <div class="text-sm text-[#6b7280]">Executive Report</div>
              <div class="font-semibold text-[#111827]">
                {{ company?.name || 'Loading…' }}
              </div>
            </div>
          </div>
          <button
            class="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#dc2626] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
            (click)="generatePDF()"
            [disabled]="!company || isGenerating"
          >
            <svg *ngIf="!isGenerating" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-4 w-4 fill-current"><path d="M5 20h14v-2H5v2Zm7-18-6 6h4v6h4v-6h4l-6-6Z"/></svg>
            <svg *ngIf="isGenerating" class="h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" class="opacity-25" stroke="currentColor" stroke-width="4" fill="none"></circle><path d="M4 12a8 8 0 018-8" class="opacity-75" fill="currentColor"></path></svg>
            {{ isGenerating ? 'Generating…' : 'Download PDF' }}
          </button>
        </div>
      </div>

      <!-- Loading / Error -->
      <div *ngIf="loading" class="max-w-5xl mx-auto px-4 py-16 text-center text-[#6b7280]">
        <div class="inline-block h-10 w-10 rounded-full border-2 border-[#d1d5db] border-t-[#2563eb] animate-spin"></div>
        <p class="mt-3">Loading company…</p>
      </div>
      <div *ngIf="error" class="max-w-5xl mx-auto px-4 py-8">
        <div class="p-4 border border-[#fecaca] bg-[#fef2f2] text-[#b91c1c] rounded-md">{{ error }}</div>
      </div>

      <!-- PDF content wrapper (parent owns the target) -->
      <div *ngIf="company" class="py-6">
        <div id="pdf-content" class="bg-[#ffffff] shadow-sm border border-[#e5e7eb] mx-auto w-[794px] p-8">
          <!-- Company section -->
          <app-company-report-section [company]="company"></app-company-report-section>

          <!-- Assessment section (smart child: fetches by company.id) -->
          <app-assessment-report-section [company]="company"></app-assessment-report-section>

          <!-- Future sections go here (each can be a smart child too) -->
          <!-- <app-swot-report-section [company]="company"></app-swot-report-section> -->
          <!-- <app-gps-report-section [company]="company"></app-gps-report-section> -->
        </div>
      </div>
    </div>
  `,
})
export class ExecutiveReportComponent implements OnInit {
  company: ICompany | null = null;
  loading = false;
  error: string | null = null;
  isGenerating = false;

  constructor(
    private route: ActivatedRoute,
    private nodeService: NodeService<any>,
    private companyService: CompanyService,
  ) {}

  ngOnInit(): void {
    const id = this.parseCompanyIdFromRoute();
    if (id == null) {
      this.error = 'Invalid or missing company ID in the URL.';
      return;
    }
    this.loading = true;
    this.companyService.getCompanyById(id).subscribe({
      next: (data) => (this.company = data),
      error: (err) => {
        console.error(err);
        this.error = 'Failed to load company data.';
      },
      complete: () => (this.loading = false),
    });
  }

  private parseCompanyIdFromRoute(): number | null {
    const raw =
      this.route.snapshot.paramMap.get('id') ??
      this.route.snapshot.paramMap.get('companyId');
    if (!raw) return null;
    const id = Number(raw);
    return Number.isFinite(id) ? id : null;
  }

  async generatePDF() {
    if (!this.company) return;
    this.isGenerating = true;
    try {
      const el = document.getElementById('pdf-content');
      if (!el) throw new Error('#pdf-content not found');

      const safeName = (this.company.name || 'Company').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${safeName}_Executive_Report_${new Date().toISOString().split('T')[0]}.pdf`;

      const options = {
        margin: [0.3, 0.3, 0.3, 0.3],
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          width: 794,
          height: 1123,
          scrollX: 0,
          scrollY: 0,
          backgroundColor: '#ffffff',
        },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait', compress: true },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      } as any;

      // TODO: Replace with alternative PDF generation (pdfmake or browser print)
      console.warn('PDF export temporarily disabled - html2pdf.js removed');
      alert('PDF export feature is currently being updated. Please use browser print (Ctrl+P) as an alternative.');
    } catch (e) {
      console.error('PDF error:', e);
      alert('There was an error generating the PDF.');
    } finally {
      this.isGenerating = false;
    }
  }
}
