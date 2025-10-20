import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import {
  BusinessQuestionnaire,
  QuestionnaireSection,
  QuestionnaireQuestion,
  QuestionnaireProgress,
  QuestionnaireFormData,
  SectionNavigationItem,
  QuestionType
} from '../../../../../models/questionnaire.models';
import { QuestionnaireService } from '../../../../../services/questionnaire.service';
import { AssessmentExportHelperService } from '../../../../../services/pdf/assessment-export-helper.service';
import { ICompany } from '../../../../../models/simple.schema';
import { ToastService } from '../../../../services/toast.service';
import { CompanyService } from '../../../../../services/company.service';

@Component({
  selector: 'app-assessment-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Loading State -->
    <div *ngIf="loading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>

    <!-- Error State -->
    <div *ngIf="error && !loading" class="bg-red-50 border border-red-200 rounded-lg p-4">
      <div class="text-red-800">{{ error }}</div>
    </div>

    <!-- Main Content (same as original assessment-tab but without @Input dependency) -->
    <div *ngIf="company && !loading" class="space-y-6">
      <!-- Header with improved progress tracking -->
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-semibold text-gray-900">Business Assessment</h2>
            <p class="text-sm text-gray-600 mt-1">
              Complete this comprehensive assessment for {{ company.name }}
            </p>
            <!-- Last saved indicator -->
            <div *ngIf="consolidatedAssessment && !formData.is_dirty" class="text-xs text-green-600 mt-1">
              ✓ Last saved: {{ getLastSavedText() }}
            </div>
            <div *ngIf="formData.is_dirty" class="text-xs text-amber-600 mt-1">
              ⚠ You have unsaved changes
            </div>
          </div>
          <div class="text-right">
            <div class="flex items-center space-x-4">
              <div>
                <div class="text-2xl font-bold text-blue-600">{{ progress?.progress_percentage || 0 }}%</div>
                <div class="text-sm text-gray-500">Complete</div>
                <div class="text-xs text-gray-400 mt-1">
                  {{ getTotalResponseCount() }} responses saved
                </div>
              </div>
              <!-- Export Button -->
              <div *ngIf="consolidatedAssessment && getTotalResponseCount() > 0" class="ml-4">
                <button
                  (click)="exportAssessmentPdf()"
                  [disabled]="isExporting"
                  class="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <i *ngIf="!isExporting" class="fas fa-file-pdf mr-2"></i>
                  <i *ngIf="isExporting" class="fas fa-spinner fa-spin mr-2"></i>
                  {{ isExporting ? 'Generating PDF...' : 'Export PDF' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Enhanced Progress Bar -->
        <div class="mt-4">
          <div class="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{{ progress?.answered_questions || 0 }} of {{ progress?.total_questions || 0 }} questions</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div
              class="bg-blue-600 h-2 rounded-full transition-all duration-300"
              [style.width.%]="progress?.progress_percentage || 0">
            </div>
          </div>
        </div>
      </div>

      <!-- Assessment content will be added here -->
      <div *ngIf="!questionnaire" class="bg-white rounded-lg shadow-sm border p-6">
        <p class="text-gray-500">Loading assessment questionnaire...</p>
      </div>

      <!-- Coming Soon placeholder -->
      <div *ngIf="questionnaire" class="bg-white rounded-lg shadow-sm border p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Assessment Questionnaire</h3>
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div class="flex items-center">
            <i class="fas fa-info-circle text-blue-600 mr-2"></i>
            <span class="text-blue-800">Assessment functionality will be implemented here.</span>
          </div>
          <p class="text-blue-700 text-sm mt-2">Company ID: {{ companyId }} | Company: {{ company.name }}</p>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./assessment.component.scss']
})
export class AssessmentComponent implements OnInit, OnDestroy {
  // Route-based properties
  companyId: number | null = null;
  company: ICompany | null = null;
  loading = true;
  error: string | null = null;

  // Assessment properties (from original component)
  questionnaire: BusinessQuestionnaire | null = null;
  currentSection: QuestionnaireSection | null = null;
  currentSectionIndex = 0;
  progress: QuestionnaireProgress | null = null;
  sectionNavigation: SectionNavigationItem[] = [];
  consolidatedAssessment: any | null = null;
  autoSaveStatus = '';
  isExporting = false;

  // Form data
  formData: QuestionnaireFormData = {
    responses: {},
    errors: {},
    is_dirty: false,
    is_submitting: false,
    current_section_index: 0
  };

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private companyService: CompanyService,
    private questionnaireService: QuestionnaireService,
    private assessmentExportHelper: AssessmentExportHelperService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    // Get company ID from parent route parameters (/company/:id)
    this.route.parent?.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const id = params['id'];
      if (id) {
        this.companyId = parseInt(id, 10);
        this.loadCompany();
      } else {
        this.error = 'No company ID provided in parent route';
        this.loading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCompany(): void {
    if (!this.companyId) return;

    this.loading = true;
    this.error = null;

    this.companyService.getCompanyById(this.companyId).subscribe({
      next: (company) => {
        this.company = company;
        this.loading = false;
        this.loadAssessmentData();
      },
      error: (err) => {
        console.error('Error loading company:', err);
        this.error = 'Failed to load company details';
        this.loading = false;
      }
    });
  }

  private loadAssessmentData(): void {
    if (!this.company) return;

    // Load questionnaire and assessment data
    // TODO: Implement the actual assessment loading logic here
    // This is where you'd call the questionnaire service methods

    // For now, just set a placeholder
    this.questionnaire = {} as BusinessQuestionnaire;
  }

  // Placeholder methods (implement these from the original component)
  getLastSavedText(): string {
    return this.consolidatedAssessment?.updated_at || 'Never';
  }

  getTotalResponseCount(): number {
    return Object.keys(this.formData.responses).length;
  }

  exportAssessmentPdf(): void {
    if (!this.company) return;

    this.isExporting = true;
    // TODO: Implement PDF export
    setTimeout(() => {
      this.isExporting = false;
      this.toastService.show('PDF export functionality will be implemented', 'info');
    }, 1000);
  }
}
