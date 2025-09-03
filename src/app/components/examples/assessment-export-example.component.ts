// components/examples/assessment-export-example.component.ts - Test component for assessment export

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AssessmentExportHelperService } from '../../../services/pdf/assessment-export-helper.service';
import { ConsolidatedAssessment } from '../../../services/pdf/assessment-export.service';
import { ICompany } from '../../../models/simple.schema';

@Component({
  selector: 'app-assessment-export-example',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 bg-white rounded-lg shadow">
      <h2 class="text-xl font-semibold mb-4">Assessment Export Test</h2>

      <div class="space-y-4">
        <!-- Test with sample data -->
        <div class="bg-gray-50 p-4 rounded">
          <h3 class="font-medium mb-2">Test with Sample Data</h3>
          <button
            (click)="exportSampleData()"
            [disabled]="isExporting"
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {{ isExporting ? 'Generating PDF...' : 'Export Sample Assessment PDF' }}
          </button>
        </div>

        <!-- Test with company ID -->
        <div class="bg-gray-50 p-4 rounded">
          <h3 class="font-medium mb-2">Test with Company ID</h3>
          <div class="flex space-x-2">
            <input
              [(ngModel)]="testCompanyId"
              type="number"
              placeholder="Enter Company ID"
              class="px-3 py-2 border rounded"
            >
            <button
              (click)="exportByCompanyId()"
              [disabled]="!testCompanyId || isExporting"
              class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              Export by Company ID
            </button>
            <button
              (click)="previewData()"
              [disabled]="!testCompanyId"
              class="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
            >
              Preview Data
            </button>
          </div>
        </div>

        <!-- Export options -->
        <div class="bg-gray-50 p-4 rounded">
          <h3 class="font-medium mb-2">Export Options</h3>
          <div class="space-y-2">
            <label class="flex items-center">
              <input type="checkbox" [(ngModel)]="includeMetadata" class="mr-2">
              Include Metadata
            </label>
            <label class="flex items-center">
              <input type="checkbox" [(ngModel)]="includeEmptyAnswers" class="mr-2">
              Include Empty Answers
            </label>
          </div>
        </div>

        <!-- Results -->
        <div *ngIf="lastResult" class="bg-blue-50 p-4 rounded">
          <h3 class="font-medium mb-2">Last Result</h3>
          <pre class="text-sm">{{ lastResult | json }}</pre>
        </div>
      </div>
    </div>
  `
})
export class AssessmentExportExampleComponent implements OnInit {
  testCompanyId: number | null = null;
  isExporting = false;
  includeMetadata = true;
  includeEmptyAnswers = false;
  lastResult: any = null;

  // Sample data from your provided example
  private sampleAssessment: ConsolidatedAssessment = {
    id: 1991,
    type: "consolidated_assessment",
    company_id: 11,
    data: {
      metadata: {
        last_updated: "2025-09-03T03:21:30.275Z",
        current_section: "introduction",
        answered_questions: 25,
        progress_percentage: 100
      },
      responses: {
        "sc_how_win": "uniqueness - collaboration with other industry players. ",
        "sa_strengths": "time keeping; ensure quality control of clients-garments. excellent communication skills. ",
        "sc_where_play": "I want to play locally, be a local supplier within KCD. channels - schools; medical practitioners; corporates and farmers. including the hospitality industry. ",
        "sars_vat_status": "non_compliant",
        "sc_capabilities": "sewing and designing skills and manufacturing skills. management skills, marketing skills and strategies.",
        "ps_primary_focus": "products",
        "ps_target_market": "Individuals, schools, businesses using PPE, medical practitioners.",
        "sa_sales_ability": 6,
        "sars_paye_status": "non_compliant",
        "ps_offerings_list": "Uniforms for schools, PPE and Scrubs. Customized outfits and bags.",
        "ps_revenue_streams": "1",
        "sars_tax_clearance": true,
        "intro_business_stage": "startup",
        "sa_improvement_areas": "need help with patternmaking, assistance with financial management skills including costing. need more business skills and mentoring ie HR, ",
        "sa_leadership_skills": 7,
        "sa_marketing_ability": 6,
        "sars_compliance_notes": "New business venture.",
        "sc_management_systems": "SACAS - ISO systems - quality control systems: use whiteboard to tracks orders. need a sales and marketing system. accounting systems, HR and payroll systems. Health and Safety systems.",
        "sc_winning_aspiration": "I see myself supplying uniforms, PPE locally and sewing for individuals.",
        "sars_income_tax_status": "non_compliant",
        "intro_registration_date": "2024-02-07",
        "sars_outstanding_issues": false,
        "intro_business_motivation": "I want to make money, and this is my passion. Current state of the business. Currently sales of R 20 000. Cash in the bank R9000. There is no sales coming in at the moment....",
        "intro_business_description": "Sewing and tailoring for individual. Want to upgrade to do bulk sewing. Focusing on uniforms and PPE and scrubs.",
        "sa_accounting_understanding": 5
      },
      updated_at: "2025-09-03T03:21:30.275Z"
    },
    created_at: "2025-09-03 02:05:02",
    updated_at: "2025-09-03 03:21:30"
  };

  private sampleCompany: ICompany = {
    id: 11,
    name: "Sample Sewing Company",
    registration_no: "2024/123456/07",
    bbbee_level: null,
    cipc_status: "active",
    service_offering: "Sewing and Tailoring Services",
    description: "Sewing and tailoring for individual. Want to upgrade to do bulk sewing. Focusing on uniforms and PPE and scrubs.",
    city: "Cape Town",
    suburb: "Khayelitsha",
    address: "123 Industrial Road",
    postal_code: "7784",
    business_location: "Western Cape",
    contact_number: "+27 21 123 4567",
    email_address: "info@samplecompany.co.za",
    trading_name: "Sample Sewing Co",
    youth_owned: true,
    black_ownership: true,
    black_women_ownership: true,
    youth_owned_text: "100% Youth Owned",
    black_ownership_text: "100% Black Owned",
    black_women_ownership_text: "100% Black Women Owned",
    compliance_notes: "New business venture.",
    has_valid_bbbbee: false,
    has_tax_clearance: true,
    is_sars_registered: false,
    has_cipc_registration: true,
    bbbee_valid_status: null,
    bbbee_expiry_date: null,
    tax_valid_status: "valid",
    tax_pin_expiry_date: null,
    vat_number: null,
    turnover_estimated: 50000,
    turnover_actual: 20000,
    permanent_employees: 1,
    temporary_employees: 0,
    locations: "Western Cape",
    created_at: "2024-02-07 10:00:00",
    updated_at: "2025-09-03 03:21:30",
    industry_id: 5,
    contact_person: "Business Owner",
    sector_name: "Manufacturing"
  };

  constructor(
    private assessmentExportService: AssessmentExportHelperService
  ) {}

  ngOnInit(): void {
    console.log('Assessment Export Example Component Loaded');
  }

  exportSampleData(): void {
    this.isExporting = true;

    this.assessmentExportService.exportAssessmentFromData(
      this.sampleCompany,
      this.sampleAssessment,
      {
        includeMetadata: this.includeMetadata,
        includeEmptyAnswers: this.includeEmptyAnswers,
        customTitle: 'Sample Business Assessment Report'
      }
    ).subscribe({
      next: () => {
        this.isExporting = false;
        this.lastResult = { success: true, message: 'Sample PDF exported successfully!' };
        console.log('Sample assessment PDF exported successfully');
      },
      error: (error) => {
        this.isExporting = false;
        this.lastResult = { success: false, error: error.message };
        console.error('Error exporting sample PDF:', error);
      }
    });
  }

  exportByCompanyId(): void {
    if (!this.testCompanyId) return;

    this.isExporting = true;

    this.assessmentExportService.exportAssessmentByCompanyId(
      this.testCompanyId,
      {
        includeMetadata: this.includeMetadata,
        includeEmptyAnswers: this.includeEmptyAnswers,
        customTitle: `Assessment Report - Company ${this.testCompanyId}`
      }
    ).subscribe({
      next: () => {
        this.isExporting = false;
        this.lastResult = { success: true, message: `PDF exported for company ${this.testCompanyId}` };
      },
      error: (error) => {
        this.isExporting = false;
        this.lastResult = { success: false, error: error.message };
        console.error('Error exporting PDF by company ID:', error);
      }
    });
  }

  previewData(): void {
    if (!this.testCompanyId) return;

    this.assessmentExportService.previewAssessmentData(this.testCompanyId)
      .subscribe({
        next: (preview) => {
          this.lastResult = preview;
          console.log('Preview data:', preview);
        },
        error: (error) => {
          this.lastResult = { success: false, error: error.message };
          console.error('Error previewing data:', error);
        }
      });
  }
}
