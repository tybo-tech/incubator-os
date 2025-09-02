import { Component, Input, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subject, switchMap, takeUntil, catchError, EMPTY } from 'rxjs';
import { CompanyFormIntegrationService } from '../../../services';
import {
  CompanyFormTab,
  ICategoryItemWithSession,
  IForm,
  IFormSession
} from '../../../models/form-system.models';
import { ICompany } from '../../../models/simple.schema';

/**
 * Dynamic Company Detail Component
 *
 * This component demonstrates the integration between company details and dynamic forms.
 * It shows how forms configured for different programs create dynamic tabs in the company detail view.
 *
 * Key Features:
 * - Loads all company enrollments across different programs
 * - Dynamically generates tabs based on program-specific forms
 * - Manages form sessions for each enrollment context
 * - Tracks completion status and progress
 */
@Component({
  selector: 'app-company-detail-dynamic',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-2xl shadow-lg overflow-hidden">
      <!-- Company Header -->
      <div class="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="text-white">
            <h1 class="text-2xl font-bold">{{ company()?.name || 'Company Details' }}</h1>
            @if (company()?.email_address) {
              <p class="text-blue-100">{{ company()!.email_address }}</p>
            }
          </div>
          <div class="bg-white/20 rounded-lg px-3 py-2">
            <span class="text-white text-sm font-medium">
              {{ completionStats()?.completion_percentage || 0 }}% Complete
            </span>
          </div>
        </div>
      </div>

      <!-- Enrollment Context Selector -->
      @if (enrollments().length > 1) {
        <div class="border-b border-gray-200 px-6 py-3">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Select Program Enrollment:
          </label>
          <select
            [value]="selectedEnrollmentId()"
            (change)="onEnrollmentChange($event)"
            class="form-select rounded-lg border-gray-300 text-sm"
          >
            @for (enrollment of enrollments(); track enrollment.id) {
              <option [value]="enrollment.id">
                {{ enrollment.program_name }} - {{ enrollment.cohort_name }}
                ({{ enrollment.status }})
              </option>
            }
          </select>
        </div>
      }

      <!-- Dynamic Tabs -->
      @if (formTabs().length > 0) {
        <div class="border-b border-gray-200">
          <nav class="flex space-x-8 px-6" role="tablist">
            <!-- Overview Tab -->
            <button
              type="button"
              [class]="getTabClasses('overview')"
              (click)="selectTab('overview')"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Overview
            </button>

            <!-- Dynamic Form Tabs -->
            @for (tab of formTabs(); track tab.form.id) {
              <button
                type="button"
                [class]="getTabClasses('form-' + tab.form.id)"
                (click)="selectTab('form-' + tab.form.id)"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                {{ tab.form.title }}
                @if (tab.session && tab.is_active) {
                  <span class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    In Progress
                  </span>
                }
                @if (tab.session && tab.session.status === 'program_approved') {
                  <span class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ✓ Completed
                  </span>
                }
              </button>
            }

            <!-- Documents Tab -->
            <button
              type="button"
              [class]="getTabClasses('documents')"
              (click)="selectTab('documents')"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
              </svg>
              Documents
            </button>
          </nav>
        </div>
      }

      <!-- Tab Content -->
      <div class="p-6">
        @switch (activeTab()) {
          @case ('overview') {
            <div class="space-y-6">
              <h2 class="text-lg font-semibold text-gray-900">Company Overview</h2>

              @if (company()) {
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 class="text-sm font-medium text-gray-500 mb-2">Basic Information</h3>
                    <div class="bg-gray-50 rounded-lg p-4 space-y-2">
                      <p><span class="font-medium">Name:</span> {{ company()!.name }}</p>
                      @if (company()!.registration_no) {
                        <p><span class="font-medium">Registration:</span> {{ company()!.registration_no }}</p>
                      }
                      @if (company()!.email_address) {
                        <p><span class="font-medium">Email:</span> {{ company()!.email_address }}</p>
                      }
                    </div>
                  </div>

                  <div>
                    <h3 class="text-sm font-medium text-gray-500 mb-2">Program Participation</h3>
                    <div class="bg-gray-50 rounded-lg p-4">
                        @if (enrollments().length > 0) {
                        <p class="text-sm text-gray-600 mb-2">Active in {{ enrollments().length }} program(s)</p>
                        @for (enrollment of enrollments(); track enrollment.id) {
                          <div class="flex items-center justify-between text-sm">
                            <span>{{ enrollment.program_name }}</span>
                            <span [class]="getStatusClasses(enrollment.status)">
                              {{ enrollment.status }}
                            </span>
                          </div>
                        }
                      } @else {
                        <p class="text-sm text-gray-500">Not enrolled in any programs</p>
                      }
                    </div>
                  </div>
                </div>
              }

              @if (completionStats()) {
                <div>
                  <h3 class="text-sm font-medium text-gray-500 mb-2">Form Completion Progress</h3>
                  <div class="bg-gray-50 rounded-lg p-4">
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-sm font-medium">Overall Progress</span>
                      <span class="text-sm text-gray-600">
                        {{ completionStats()!.completed_forms }} / {{ completionStats()!.total_forms }} forms completed
                      </span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                      <div
                        class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        [style.width.%]="completionStats()!.completion_percentage"
                      ></div>
                    </div>

                    @if (completionStats()!.by_program?.length > 0) {
                      <div class="mt-4 space-y-2">
                        <h4 class="text-xs font-medium text-gray-500 uppercase">By Program</h4>
                        @for (prog of completionStats()!.by_program; track prog.program_id) {
                          <div class="flex items-center justify-between text-sm">
                            <span>{{ prog.program_name }}</span>
                            <span class="text-gray-600">{{ prog.completion_percentage }}%</span>
                          </div>
                        }
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          }

          @case ('documents') {
            <div>
              <h2 class="text-lg font-semibold text-gray-900 mb-4">Documents & Files</h2>
              <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                <p class="mt-2 text-sm text-gray-600">Document management coming soon</p>
              </div>
            </div>
          }

          @default {
            @if (activeFormTab()) {
              <div>
                <div class="flex items-center justify-between mb-6">
                  <div>
                    <h2 class="text-lg font-semibold text-gray-900">{{ activeFormTab()!.form.title }}</h2>
                    @if (activeFormTab()!.form.description) {
                      <p class="text-sm text-gray-600 mt-1">{{ activeFormTab()!.form.description }}</p>
                    }
                  </div>

                  @if (activeFormTab()!.session) {
                    <div class="flex items-center space-x-3">
                      <span [class]="getSessionStatusClasses(activeFormTab()!.session!.status)">
                        {{ getSessionStatusText(activeFormTab()!.session!.status) }}
                      </span>

                      @if (activeFormTab()!.can_edit) {
                        <button
                          type="button"
                          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                          (click)="editForm(activeFormTab()!)"
                        >
                          {{ activeFormTab()!.session!.status === 'draft' ? 'Continue Editing' : 'Edit Form' }}
                        </button>
                      }
                    </div>
                  } @else {
                    <button
                      type="button"
                      class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                      (click)="startForm(activeFormTab()!)"
                    >
                      Start Form
                    </button>
                  }
                </div>

                <!-- Form Node Preview -->
                @if (activeFormTab() && activeFormTab()!.nodes.length > 0) {
                  <div class="space-y-4">
                    <h3 class="text-sm font-medium text-gray-500 mb-3">Form Structure</h3>
                    @for (node of activeFormTab()!.nodes; track node.id) {
                      <div class="border border-gray-200 rounded-lg p-4">
                        <div class="flex items-center justify-between">
                          <div>
                            <h4 class="font-medium text-gray-900">{{ node.title || node.node_key }}</h4>
                            @if (node.description) {
                              <p class="text-sm text-gray-600">{{ node.description }}</p>
                            }
                          </div>
                          <span class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            {{ node.node_type }}
                          </span>
                        </div>
                      </div>
                    }
                  </div>
                } @else {
                  <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <p class="text-sm text-gray-600">Form structure not loaded</p>
                  </div>
                }
              </div>
            }
          }
        }
      </div>
    </div>
  `
})
export class CompanyDetailDynamicComponent implements OnInit, OnDestroy {
  @Input() companyId?: number;
  @Input() company = signal<ICompany | null>(null);
  @Input() initialEnrollmentId?: number;

  private readonly integrationService = inject(CompanyFormIntegrationService);
  private readonly destroy$ = new Subject<void>();

  // State
  enrollments = signal<ICategoryItemWithSession[]>([]);
  selectedEnrollmentId = signal<number | null>(null);
  formTabs = signal<CompanyFormTab[]>([]);
  activeTab = signal<string>('overview');
  completionStats = signal<any>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);

  // Computed
  activeFormTab = computed(() => {
    const activeTabId = this.activeTab();
    if (!activeTabId.startsWith('form-')) return null;

    const formId = parseInt(activeTabId.replace('form-', ''));
    return this.formTabs().find(tab => tab.form.id === formId) || null;
  });

  ngOnInit() {
    if (this.companyId) {
      this.loadCompanyData();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCompanyData() {
    if (!this.companyId) return;

    this.isLoading.set(true);
    this.error.set(null);

    // Load enrollments
    this.integrationService.getCompanyEnrollments(this.companyId)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error loading company enrollments:', error);
          this.error.set('Failed to load company data');
          return EMPTY;
        })
      )
      .subscribe(enrollments => {
        this.enrollments.set(enrollments);

        // Set initial enrollment
        if (enrollments.length > 0) {
          const initialId = this.initialEnrollmentId || enrollments[0].id;
          this.selectedEnrollmentId.set(initialId);
          this.loadFormTabs();
        }

        this.loadCompletionStats();
        this.isLoading.set(false);
      });
  }

  private loadFormTabs() {
    const enrollmentId = this.selectedEnrollmentId();
    if (!this.companyId || !enrollmentId) return;

    this.integrationService.generateCompanyTabs(this.companyId, enrollmentId)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error loading form tabs:', error);
          return EMPTY;
        })
      )
      .subscribe(tabs => {
        this.formTabs.set(tabs);
      });
  }

  private loadCompletionStats() {
    if (!this.companyId) return;

    this.integrationService.getCompanyFormStatistics(this.companyId)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error loading completion stats:', error);
          return EMPTY;
        })
      )
      .subscribe(stats => {
        this.completionStats.set(stats);
      });
  }

  onEnrollmentChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const enrollmentId = parseInt(select.value);
    this.selectedEnrollmentId.set(enrollmentId);
    this.loadFormTabs();
  }

  selectTab(tabId: string) {
    this.activeTab.set(tabId);
  }

  getTabClasses(tabId: string): string {
    const isActive = this.activeTab() === tabId;
    const baseClasses = 'inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors';

    if (isActive) {
      return `${baseClasses} border-blue-500 text-blue-600`;
    }
    return `${baseClasses} border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300`;
  }

  getStatusClasses(status: string): string {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800';
      case 'completed':
        return 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800';
      case 'withdrawn':
        return 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800';
      default:
        return 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800';
    }
  }

  getSessionStatusClasses(status: string): string {
    switch (status) {
      case 'draft':
        return 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800';
      case 'submitted':
        return 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800';
      case 'advisor_verified':
        return 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800';
      case 'program_approved':
        return 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800';
      case 'cancelled':
        return 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800';
      default:
        return 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800';
    }
  }

  getSessionStatusText(status: string): string {
    switch (status) {
      case 'draft': return 'Draft';
      case 'submitted': return 'Submitted';
      case 'advisor_verified': return 'Verified';
      case 'program_approved': return 'Approved';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  }

  startForm(tab: CompanyFormTab) {
    // TODO: Navigate to form builder/editor
    console.log('Starting form:', tab.form.title);
  }

  editForm(tab: CompanyFormTab) {
    // TODO: Navigate to form builder/editor with existing session
    console.log('Editing form:', tab.form.title, 'Session:', tab.session?.id);
  }
}
