// assessment-tab.component.ts - Assessment questionnaire using consolidated data approach

import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

@Component({
  selector: 'app-assessment-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Same template as original, but now works with consolidated data -->
    <div class="space-y-6">
      <!-- Header with improved progress tracking -->
        <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-semibold text-gray-900">Business Assessment</h2>
            <p class="text-sm text-gray-600 mt-1">
              Complete this comprehensive assessment to help us understand your business better
            </p>
            <!-- New: Last saved indicator -->
            <div *ngIf="consolidatedAssessment && !formData.is_dirty" class="text-xs text-green-600 mt-1">
              ✓ Last saved: {{ getLastSavedText() }}
            </div>
            <div *ngIf="formData.is_dirty" class="text-xs text-amber-600 mt-1">
              ⏳ Changes pending...
            </div>
          </div>
          <div class="text-right">
            <div class="flex items-center space-x-4">
              <div>
                <div class="text-2xl font-bold text-blue-600">{{ progress?.progress_percentage || 0 }}%</div>
                <div class="text-sm text-gray-500">Complete</div>
                <!-- New: Response count -->
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
                  <svg *ngIf="!isExporting" class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  <svg *ngIf="isExporting" class="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {{ isExporting ? 'Generating PDF...' : 'Export PDF' }}
                </button>
              </div>
            </div>
          </div>
        </div>        <!-- Enhanced Progress Bar -->
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

      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <!-- Enhanced Section Navigation -->
        <div class="lg:col-span-1">
          <div class="bg-white rounded-lg shadow-sm border">
            <div class="p-4 border-b">
              <h3 class="font-medium text-gray-900">Sections</h3>
              <!-- New: Overall completion indicator -->
              <div class="text-xs text-gray-500 mt-1">
                {{ getCompletedSectionsCount() }} of {{ sectionNavigation.length }} completed
              </div>
            </div>
            <nav class="p-2">
              <div *ngFor="let nav of sectionNavigation" class="mb-1">
                <button
                  (click)="navigateToSection(nav.section_id)"
                  [disabled]="!nav.accessible"
                  [class]="getSectionNavClass(nav)"
                  class="w-full text-left px-3 py-2 rounded-md text-sm transition-colors"
                >
                  <div class="flex items-center justify-between">
                    <span>{{ nav.name }}</span>
                    <div class="flex items-center space-x-1">
                      <span *ngIf="nav.completed" class="text-green-500">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                        </svg>
                      </span>
                      <span class="text-xs text-gray-400">{{ nav.order }}</span>
                    </div>
                  </div>
                  <!-- New: Progress indicator for each section -->
                  <div class="mt-1">
                    <div class="w-full bg-gray-100 rounded-full h-1">
                      <div
                        class="bg-blue-400 h-1 rounded-full transition-all duration-200"
                        [style.width.%]="getSectionProgress(nav.section_id)">
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </nav>
          </div>
        </div>

        <!-- Main Content - Same as original -->
        <div class="lg:col-span-3">
          <div *ngIf="currentSection" class="bg-white rounded-lg shadow-sm border">
            <!-- Section Header -->
            <div class="p-6 border-b">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-lg font-medium text-gray-900">{{ currentSection.name }}</h3>
                  <p *ngIf="currentSection.description" class="text-sm text-gray-600 mt-1">
                    {{ currentSection.description }}
                  </p>
                </div>
                <div class="flex items-center space-x-2">
                  <span *ngIf="currentSection.required" class="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                    Required
                  </span>
                  <div class="text-sm text-gray-500">
                    Section {{ currentSection.order }} of {{ questionnaire?.sections?.length || 0 }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Questions Form -->
            <div class="p-6">
              <form #assessmentForm="ngForm">
                <div class="space-y-6">
                  <div *ngFor="let question of currentSection.questions" class="space-y-2">
                    <!-- Question Label -->
                    <label class="block">
                      <div class="flex items-start justify-between">
                        <span class="text-sm font-medium text-gray-700">
                          {{ question.question }}
                          <span *ngIf="question.required" class="text-red-500 ml-1">*</span>
                        </span>
                        <span class="text-xs text-gray-400 ml-2">
                          {{ getQuestionTypeDisplay(question.type) }}
                        </span>
                      </div>

                      <!-- Help Text -->
                      <div *ngIf="question.help_text" class="text-xs text-gray-500 mt-1">
                        {{ question.help_text }}
                      </div>

                      <!-- Question Input -->
                      <div class="mt-2">
                        <!-- Text Input -->
                        <input
                          *ngIf="question.type === 'text' || question.type === 'email' || question.type === 'phone' || question.type === 'url'"
                          [(ngModel)]="formData.responses[question.id]"
                          (change)="onFormDataChange()"
                          [name]="question.id"
                          [type]="getInputType(question.type)"
                          [placeholder]="question.placeholder"
                          [required]="question.required"
                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />

                        <!-- Textarea -->
                        <textarea
                          *ngIf="question.type === 'textarea'"
                          [(ngModel)]="formData.responses[question.id]"
                          (change)="onFormDataChange()"
                          [name]="question.id"
                          [placeholder]="question.placeholder"
                          [required]="question.required"
                          rows="4"
                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        ></textarea>

                        <!-- Number Input -->
                        <input
                          *ngIf="question.type === 'number' || question.type === 'currency' || question.type === 'percentage'"
                          [(ngModel)]="formData.responses[question.id]"
                          (change)="onFormDataChange()"
                          [name]="question.id"
                          type="number"
                          [placeholder]="question.placeholder"
                          [required]="question.required"
                          [min]="question.validation?.min_value || null"
                          [max]="question.validation?.max_value || null"
                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />

                        <!-- Date Input -->
                        <input
                          *ngIf="question.type === 'date'"
                          [(ngModel)]="formData.responses[question.id]"
                          (change)="onFormDataChange()"
                          [name]="question.id"
                          type="date"
                          [required]="question.required"
                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />

                        <!-- Dropdown -->
                        <select
                          *ngIf="question.type === 'dropdown'"
                          [(ngModel)]="formData.responses[question.id]"
                          (change)="onFormDataChange()"
                          [name]="question.id"
                          [required]="question.required"
                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select an option...</option>
                          <option *ngFor="let option of question.options" [value]="option.value">
                            {{ option.label }}
                          </option>
                        </select>

                        <!-- Radio Buttons -->
                        <div *ngIf="question.type === 'radio'" class="space-y-2">
                          <div *ngFor="let option of question.options" class="flex items-center">
                            <input
                              [(ngModel)]="formData.responses[question.id]"
                              (change)="onFormDataChange()"
                              [name]="question.id"
                              [value]="option.value"
                              [required]="question.required"
                              type="radio"
                              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <label class="ml-2 text-sm text-gray-700">{{ option.label }}</label>
                          </div>
                        </div>

                        <!-- Rating -->
                        <div *ngIf="question.type === 'rating'" class="flex items-center space-x-2">
                          <span class="text-sm text-gray-500">1</span>
                          <div class="flex space-x-1">
                            <button
                              *ngFor="let rating of getRatingOptions(question)"
                              type="button"
                              (click)="setRating(question.id, rating)"
                              [class]="getRatingClass(question.id, rating)"
                              class="w-8 h-8 rounded-full border-2 text-xs font-medium transition-colors"
                            >
                              {{ rating }}
                            </button>
                          </div>
                          <span class="text-sm text-gray-500">10</span>
                        </div>

                        <!-- Yes/No Toggle -->
                        <div *ngIf="question.type === 'yesno'" class="flex items-center space-x-4">
                          <div class="flex items-center">
                            <input
                              [(ngModel)]="formData.responses[question.id]"
                              (change)="onFormDataChange()"
                              [name]="question.id"
                              [value]="true"
                              [required]="question.required"
                              type="radio"
                              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <label class="ml-2 text-sm text-gray-700">Yes</label>
                          </div>
                          <div class="flex items-center">
                            <input
                              [(ngModel)]="formData.responses[question.id]"
                              (change)="onFormDataChange()"
                              [name]="question.id"
                              [value]="false"
                              [required]="question.required"
                              type="radio"
                              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <label class="ml-2 text-sm text-gray-700">No</label>
                          </div>
                        </div>
                      </div>

                      <!-- Validation Error -->
                      <div *ngIf="formData.errors[question.id]" class="text-red-600 text-xs mt-1">
                        {{ formData.errors[question.id] }}
                      </div>
                    </label>
                  </div>
                </div>
              </form>
            </div>

            <!-- Enhanced Section Navigation Footer -->
            <div class="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
              <button
                *ngIf="currentSectionIndex > 0"
                (click)="previousSection()"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Previous Section
              </button>
              <div></div>
              <div class="flex space-x-3">
                <!-- Auto-save indicator -->
                <div *ngIf="autoSaveStatus" class="text-xs text-gray-500 flex items-center px-2">
                  <span>{{ autoSaveStatus }}</span>
                </div>
                <button
                  (click)="saveProgress()"
                  [disabled]="formData.is_submitting"
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {{ formData.is_submitting ? 'Saving...' : 'Save Progress' }}
                </button>
                <button
                  *ngIf="currentSectionIndex < (questionnaire?.sections?.length || 0) - 1"
                  (click)="nextSection()"
                  class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Next Section
                </button>
                <button
                  *ngIf="currentSectionIndex === (questionnaire?.sections?.length || 0) - 1"
                  (click)="submitAssessment()"
                  [disabled]="formData.is_submitting"
                  class="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {{ formData.is_submitting ? 'Submitting...' : 'Complete Assessment' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- New: Debug panel (can be removed in production) -->
      <div *ngIf="showDebugInfo" class="bg-gray-50 border rounded-lg p-4">
        <h4 class="font-medium text-gray-900 mb-2">Debug Info</h4>
        <div class="text-xs text-gray-600 space-y-1">
          <div>Assessment ID: {{ consolidatedAssessment?.id }}</div>
          <div>Total Responses: {{ getTotalResponseCount() }}</div>
          <div>Current Section: {{ currentSection?.id }}</div>
          <div>Last Updated: {{ consolidatedAssessment?.updated_at }}</div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./assessment-tab.component.scss']
})
export class AssessmentTabComponent implements OnInit, OnDestroy {
  @Input() company: ICompany | null = null;
  @Input() showDebugInfo = false; // For development

  questionnaire: BusinessQuestionnaire | null = null;
  currentSection: QuestionnaireSection | null = null;
  currentSectionIndex = 0;
  progress: QuestionnaireProgress | null = null;
  sectionNavigation: SectionNavigationItem[] = [];
  consolidatedAssessment: any | null = null;
  autoSaveStatus = '';
  isExporting = false;

  formData: QuestionnaireFormData = {
    current_section_index: 0,
    responses: {},
    errors: {},
    is_dirty: false,
    is_submitting: false
  };

  private destroy$ = new Subject<void>();
  private autoSaveTimeout: any;

  constructor(
    private questionnaireService: QuestionnaireService,
    private assessmentExportService: AssessmentExportHelperService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadQuestionnaire();
  }

  ngOnDestroy(): void {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Load questionnaire and consolidated assessment data
  private loadQuestionnaire(): void {
    if (!this.company?.id) return;

    // Load questionnaire structure (this can be cached)
    this.questionnaireService.getBusinessAssessmentQuestionnaire()
      .pipe(takeUntil(this.destroy$))
      .subscribe(questionnaire => {
        this.questionnaire = questionnaire;
        this.setupNavigation();
        this.loadConsolidatedData();
      });
  }

  // Load all assessment data in one call
  private loadConsolidatedData(): void {
    if (!this.company?.id) return;

    this.questionnaireService.getConsolidatedAssessment(this.company.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(assessment => {
        this.consolidatedAssessment = assessment;

        if (assessment) {
          // Load all responses
          this.formData.responses = { ...assessment.responses };

          // Set current section from metadata
          this.setCurrentSection(assessment.metadata.current_section_index || 0);

          // Update progress
          this.updateProgress();
          this.setupNavigation();
        } else {
          // No existing data, start fresh
          this.setCurrentSection(0);
        }
      });
  }

  // Enhanced navigation setup with completion status
  private setupNavigation(): void {
    if (!this.questionnaire) return;

    this.sectionNavigation = this.questionnaire.sections.map(section => ({
      section_id: section.id,
      name: section.name,
      order: section.order,
      completed: this.isSectionCompleted(section),
      current: false,
      accessible: true
    }));

    this.updateProgress();
  }

  // Save progress using consolidated approach (single API call)
  saveProgress(): void {
    if (!this.company?.id || !this.questionnaire?.id || !this.currentSection) return;

    this.formData.is_submitting = true;
    this.autoSaveStatus = 'Saving...';

    // Get responses for current section only
    const sectionResponses: { [questionId: string]: any } = {};
    this.currentSection.questions.forEach(question => {
      const value = this.formData.responses[question.id];
      if (value !== undefined && value !== null && value !== '') {
        sectionResponses[question.id] = value;
      }
    });

    // Save to consolidated assessment
    this.questionnaireService.savePartialResponse(
      this.company.id,
      sectionResponses,
      this.currentSection.id
    ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          this.formData.is_submitting = false;
          this.formData.is_dirty = false;
          this.autoSaveStatus = success ? 'Saved ✓' : 'Error ✗';

          if (success) {
            // Reload consolidated data to get updated metadata
            this.loadConsolidatedData();
            this.showSuccessMessage('Progress saved successfully!');
          }

          // Clear status after 2 seconds
          setTimeout(() => this.autoSaveStatus = '', 2000);
        },
        error: (error) => {
          console.error('Error saving progress:', error);
          this.formData.is_submitting = false;
          this.autoSaveStatus = 'Error ✗';
          this.showErrorMessage('Failed to save progress. Please try again.');
          setTimeout(() => this.autoSaveStatus = '', 3000);
        }
      });
  }

  // Enhanced auto-save with consolidated data
  onFormDataChange(): void {
    this.formData.is_dirty = true;
    this.updateProgress();

    // Update current section in metadata
    if (this.company?.id && this.currentSection) {
      this.questionnaireService.updateCurrentSection(
        this.company.id,
        this.currentSection.id
      ).subscribe();
    }

    // Auto-save after 2 seconds of inactivity
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    this.autoSaveTimeout = setTimeout(() => {
      if (this.formData.is_dirty && !this.formData.is_submitting) {
        this.autoSaveStatus = 'Auto-saving...';
        this.saveProgress();
      }
    }, 2000);
  }

  // New helper methods for enhanced UI

  getLastSavedText(): string {
    if (!this.consolidatedAssessment?.updated_at) return 'Never';

    const lastSaved = new Date(this.consolidatedAssessment.updated_at);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastSaved.getTime()) / (1000 * 60));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} min ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

    return lastSaved.toLocaleDateString();
  }

  getTotalResponseCount(): number {
    return Object.keys(this.formData.responses).length;
  }

  getCompletedSectionsCount(): number {
    return this.sectionNavigation.filter(nav => nav.completed).length;
  }

  getSectionProgress(sectionId: string): number {
    if (!this.questionnaire || !this.consolidatedAssessment) return 0;

    const section = this.questionnaire.sections.find(s => s.id === sectionId);
    if (!section) return 0;

    const answeredQuestions = section.questions.filter(q =>
      this.consolidatedAssessment!.responses[q.id] !== undefined
    ).length;

    return section.questions.length > 0
      ? Math.round((answeredQuestions / section.questions.length) * 100)
      : 0;
  }

  // Rest of the methods remain largely the same as original component
  // ... (include other methods from original component)

  private setCurrentSection(index: number): void {
    if (!this.questionnaire || index < 0 || index >= this.questionnaire.sections.length) return;

    this.currentSectionIndex = index;
    this.currentSection = this.questionnaire.sections[index];
    this.formData.current_section_index = index;

    // Update navigation
    this.sectionNavigation.forEach((nav, i) => {
      nav.current = i === index;
    });
  }

  navigateToSection(sectionId: string): void {
    if (!this.questionnaire) return;

    const index = this.questionnaire.sections.findIndex(s => s.id === sectionId);
    if (index !== -1) {
      this.setCurrentSection(index);
    }
  }

  previousSection(): void {
    if (this.currentSectionIndex > 0) {
      this.setCurrentSection(this.currentSectionIndex - 1);
    }
  }

  nextSection(): void {
    if (this.questionnaire && this.currentSectionIndex < this.questionnaire.sections.length - 1) {
      this.setCurrentSection(this.currentSectionIndex + 1);
    }
  }

  private updateProgress(): void {
    if (!this.questionnaire) return;

    this.progress = this.questionnaireService.calculateProgress(
      this.questionnaire,
      this.formData.responses
    );

    // Update section completion status
    this.sectionNavigation.forEach(nav => {
      const section = this.questionnaire?.sections.find(s => s.id === nav.section_id);
      if (section) {
        nav.completed = this.isSectionCompleted(section);
      }
    });
  }

  private isSectionCompleted(section: QuestionnaireSection): boolean {
    return section.questions.every(question => {
      const value = this.formData.responses[question.id];
      return !question.required || (value !== undefined && value !== null && value !== '');
    });
  }

  getSectionNavClass(nav: SectionNavigationItem): string {
    if (nav.current) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (nav.completed) {
      return 'bg-green-50 text-green-700 hover:bg-green-100';
    }
    return 'text-gray-600 hover:bg-gray-50 hover:text-gray-900';
  }

  private showSuccessMessage(message: string): void {
    this.toast.success(message);
  }

  private showErrorMessage(message: string): void {
    this.toast.error(message);
  }

  submitAssessment(): void {
    if (!this.validateForm()) return;

    this.formData.is_submitting = true;
    this.saveCurrentSectionAsComplete();
  }

  private saveCurrentSectionAsComplete(): void {
    if (!this.company?.id || !this.questionnaire?.id || !this.currentSection) return;

    // Save current responses first, then mark complete
    this.saveProgress();

    // Mark section as complete
    this.questionnaireService.markSectionComplete(
      this.company.id,
      this.currentSection.id,
      this.formData.responses
    ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.formData.is_submitting = false;
          this.loadConsolidatedData(); // Refresh data

          if (this.isAssessmentComplete()) {
            this.showSuccessMessage('Assessment completed successfully!');
          } else {
            this.showSuccessMessage('Section completed! Continue with the next section.');
            // Auto-advance to next section
            if (this.currentSectionIndex < (this.questionnaire?.sections?.length || 0) - 1) {
              setTimeout(() => this.nextSection(), 1000);
            }
          }
        },
        error: (error) => {
          console.error('Error marking section complete:', error);
          this.formData.is_submitting = false;
        }
      });
  }

  private isAssessmentComplete(): boolean {
    return this.sectionNavigation.every(nav => nav.completed);
  }

  private validateForm(): boolean {
    this.formData.errors = {};
    let isValid = true;

    if (!this.currentSection) return false;

    this.currentSection.questions.forEach(question => {
      const value = this.formData.responses[question.id];

      if (question.required && (!value || value === '')) {
        this.formData.errors[question.id] = 'This field is required';
        isValid = false;
      }
    });

    return isValid;
  }

  // Helper methods for question rendering
  getQuestionTypeDisplay(type: QuestionType): string {
    const typeMap: { [key in QuestionType]: string } = {
      text: 'Text',
      textarea: 'Long Text',
      number: 'Number',
      email: 'Email',
      phone: 'Phone',
      url: 'URL',
      date: 'Date',
      dropdown: 'Dropdown',
      radio: 'Single Choice',
      checkbox: 'Multiple Choice',
      rating: 'Rating 1-10',
      scale: 'Scale',
      yesno: 'Yes/No',
      file: 'File Upload',
      currency: 'Currency',
      percentage: 'Percentage'
    };
    return typeMap[type] || 'Text';
  }

  getInputType(questionType: QuestionType): string {
    switch (questionType) {
      case 'email': return 'email';
      case 'phone': return 'tel';
      case 'url': return 'url';
      case 'number': return 'number';
      default: return 'text';
    }
  }

  getRatingOptions(question: QuestionnaireQuestion): number[] {
    const max = question.validation?.max_value || 10;
    const min = question.validation?.min_value || 1;
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
  }

  setRating(questionId: string, rating: number): void {
    this.formData.responses[questionId] = rating;
    this.onFormDataChange();
  }

  getRatingClass(questionId: string, rating: number): string {
    const selectedRating = this.formData.responses[questionId];
    if (selectedRating === rating) {
      return 'bg-blue-600 text-white border-blue-600';
    }
    return 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50';
  }

  /**
   * Export assessment as PDF
   */
  exportAssessmentPdf(): void {
    if (!this.company?.id || !this.consolidatedAssessment) {
      this.showErrorMessage('No assessment data available for export');
      return;
    }

    this.isExporting = true;

    this.assessmentExportService.exportAssessmentFromData(
      this.company,
      this.consolidatedAssessment,
      {
        includeEmptyAnswers: false,
        groupBySection: true,
        includeMetadata: true,
        customTitle: 'Business Assessment Report'
      }
    ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isExporting = false;
          this.showSuccessMessage('Assessment PDF exported successfully!');
        },
        error: (error) => {
          console.error('Error exporting assessment PDF:', error);
          this.isExporting = false;
          this.showErrorMessage('Failed to export PDF. Please try again.');
        }
      });
  }

  /**
   * Preview assessment data for debugging
   */
  previewAssessmentData(): void {
    if (!this.company?.id) return;

    this.assessmentExportService.previewAssessmentData(this.company.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(preview => {
        console.log('Assessment Preview:', preview);
        this.showSuccessMessage(`Assessment has ${preview.responseCount} responses (${preview.completionPercentage}% complete)`);
      });
  }
}
