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
import { ICompany } from '../../../../../models/simple.schema';

@Component({
  selector: 'app-assessment-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-semibold text-gray-900">Business Assessment</h2>
            <p class="text-sm text-gray-600 mt-1">
              Complete this comprehensive assessment to help us understand your business better
            </p>
          </div>
          <div class="text-right">
            <div class="text-2xl font-bold text-blue-600">{{ progress?.progress_percentage || 0 }}%</div>
            <div class="text-sm text-gray-500">Complete</div>
          </div>
        </div>

        <!-- Progress Bar -->
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
        <!-- Section Navigation -->
        <div class="lg:col-span-1">
          <div class="bg-white rounded-lg shadow-sm border">
            <div class="p-4 border-b">
              <h3 class="font-medium text-gray-900">Sections</h3>
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
                </button>
              </div>
            </nav>
          </div>
        </div>

        <!-- Main Content -->
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

            <!-- Section Navigation Footer -->
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
    </div>
  `,
  styleUrls: ['./assessment-tab.component.scss']
})
export class AssessmentTabComponent implements OnInit, OnDestroy {
  @Input() company: ICompany | null = null;

  questionnaire: BusinessQuestionnaire | null = null;
  currentSection: QuestionnaireSection | null = null;
  currentSectionIndex = 0;
  progress: QuestionnaireProgress | null = null;
  sectionNavigation: SectionNavigationItem[] = [];

  formData: QuestionnaireFormData = {
    current_section_index: 0,
    responses: {},
    errors: {},
    is_dirty: false,
    is_submitting: false
  };

  private destroy$ = new Subject<void>();

  constructor(private questionnaireService: QuestionnaireService) {}

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

  private loadQuestionnaire(): void {
    this.questionnaireService.getBusinessAssessmentQuestionnaire()
      .pipe(takeUntil(this.destroy$))
      .subscribe(questionnaire => {
        this.questionnaire = questionnaire;
        this.setupNavigation();
        this.setCurrentSection(0);
        this.loadExistingResponses();
      });
  }

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

  private setCurrentSection(index: number): void {
    if (!this.questionnaire || index < 0 || index >= this.questionnaire.sections.length) return;

    this.currentSectionIndex = index;
    this.currentSection = this.questionnaire.sections[index];
    this.formData.current_section_index = index;

    // Update navigation
    this.sectionNavigation.forEach((nav, i) => {
      nav.current = i === index;
    });

    // Load responses for this section
    this.loadSectionResponses();
  }

  private loadExistingResponses(): void {
    if (!this.company?.id || !this.questionnaire?.id) return;

    this.questionnaireService.getResponse(this.company.id.toString(), this.questionnaire.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(response => {
        if (response) {
          // Populate form with existing responses
          response.section_responses.forEach(sectionResponse => {
            sectionResponse.question_responses.forEach(questionResponse => {
              this.formData.responses[questionResponse.question_id] = questionResponse.value;
            });
          });
          this.updateProgress();
          this.setupNavigation(); // Refresh navigation with completion status
        }
      });
  }

  private loadSectionResponses(): void {
    if (!this.company?.id || !this.questionnaire?.id || !this.currentSection) return;

    this.questionnaireService.getSectionResponses(
      this.company.id.toString(),
      this.questionnaire.id,
      this.currentSection.id
    ).pipe(takeUntil(this.destroy$))
      .subscribe(responses => {
        // Merge responses for current section
        Object.assign(this.formData.responses, responses);
        this.updateProgress();
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

  saveProgress(): void {
    if (!this.company?.id || !this.questionnaire?.id || !this.currentSection) return;

    this.formData.is_submitting = true;

    // Get responses for current section only
    const sectionResponses: { [questionId: string]: any } = {};
    this.currentSection.questions.forEach(question => {
      const value = this.formData.responses[question.id];
      if (value !== undefined && value !== null && value !== '') {
        sectionResponses[question.id] = value;
      }
    });

    // Save partial responses for current section
    this.questionnaireService.savePartialResponse(
      this.company.id.toString(),
      this.questionnaire.id,
      this.currentSection.id,
      sectionResponses
    ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          this.formData.is_submitting = false;
          this.formData.is_dirty = false;
          if (success) {
            this.updateProgress();
            this.setupNavigation(); // Refresh completion status
            // Show success message
            this.showSuccessMessage('Progress saved successfully!');
          }
        },
        error: (error) => {
          console.error('Error saving progress:', error);
          this.formData.is_submitting = false;
          this.showErrorMessage('Failed to save progress. Please try again.');
        }
      });
  }

  submitAssessment(): void {
    if (!this.validateForm()) return;

    this.formData.is_submitting = true;

    // Mark current section as complete and save
    this.saveCurrentSectionAsComplete();
  }

  private saveCurrentSectionAsComplete(): void {
    if (!this.company?.id || !this.questionnaire?.id || !this.currentSection) return;

    // First save the current responses
    const sectionResponses: { [questionId: string]: any } = {};
    this.currentSection.questions.forEach(question => {
      const value = this.formData.responses[question.id];
      if (value !== undefined && value !== null && value !== '') {
        sectionResponses[question.id] = value;
      }
    });

    this.questionnaireService.savePartialResponse(
      this.company.id.toString(),
      this.questionnaire.id,
      this.currentSection.id,
      sectionResponses
    ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Mark section as complete
          if (!this.company?.id || !this.questionnaire?.id || !this.currentSection?.id) return;

          this.questionnaireService.markSectionComplete(
            this.company.id.toString(),
            this.questionnaire.id,
            this.currentSection.id
          ).pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                this.formData.is_submitting = false;
                this.updateProgress();
                this.setupNavigation();

                // Check if all sections are complete
                if (this.isAssessmentComplete()) {
                  this.showSuccessMessage('Assessment completed successfully!');
                } else {
                  this.showSuccessMessage('Section completed! Continue with the next section.');
                  // Auto-advance to next section if available
                  if (this.currentSectionIndex < (this.questionnaire?.sections?.length || 0) - 1) {
                    setTimeout(() => {
                      this.nextSection();
                    }, 1000);
                  }
                }
              },
              error: (error) => {
                console.error('Error marking section complete:', error);
                this.formData.is_submitting = false;
              }
            });
        },
        error: (error) => {
          console.error('Error saving section:', error);
          this.formData.is_submitting = false;
        }
      });
  }

  private isAssessmentComplete(): boolean {
    return this.sectionNavigation.every(nav => nav.completed);
  }

  private showSuccessMessage(message: string): void {
    // Simple alert for now - could be replaced with a toast notification
    alert(message);
  }

  private showErrorMessage(message: string): void {
    // Simple alert for now - could be replaced with a toast notification
    alert(message);
  }  private validateForm(): boolean {
    this.formData.errors = {};
    let isValid = true;

    if (!this.currentSection) return false;

    this.currentSection.questions.forEach(question => {
      const value = this.formData.responses[question.id];

      if (question.required && (!value || value === '')) {
        this.formData.errors[question.id] = 'This field is required';
        isValid = false;
      }

      if (value && question.validation) {
        const validation = question.validation;

        if (validation.min_length && value.length < validation.min_length) {
          this.formData.errors[question.id] = `Minimum ${validation.min_length} characters required`;
          isValid = false;
        }

        if (validation.max_length && value.length > validation.max_length) {
          this.formData.errors[question.id] = `Maximum ${validation.max_length} characters allowed`;
          isValid = false;
        }
      }
    });

    return isValid;
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

  onFormDataChange(): void {
    this.formData.is_dirty = true;
    this.updateProgress();

    // Auto-save after 2 seconds of inactivity
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    this.autoSaveTimeout = setTimeout(() => {
      if (this.formData.is_dirty && !this.formData.is_submitting) {
        this.saveProgress();
      }
    }, 2000);
  }

  private autoSaveTimeout: any;

  getRatingClass(questionId: string, rating: number): string {
    const selectedRating = this.formData.responses[questionId];
    if (selectedRating === rating) {
      return 'bg-blue-600 text-white border-blue-600';
    }
    return 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50';
  }
}
