// src/components/enrollment-context-selector.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Import context service and models
import { CompanyContextService } from '../services/company-context.service';
import { ICategoryItemWithSession } from '../models/form-system.models';

export interface EnrollmentOption {
  enrollment: ICategoryItemWithSession;
  displayText: string;
  subtitle?: string;
  isActive: boolean;
  hasFormSession: boolean;
}

@Component({
  selector: 'app-enrollment-context-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="enrollment-selector" [class.disabled]="disabled">
      <!-- Header -->
      <div class="selector-header">
        <h4 class="selector-title">
          <i class="fas fa-graduation-cap"></i>
          Program Context
        </h4>
        <div class="selector-info" *ngIf="enrollmentOptions.length > 1">
          {{ enrollmentOptions.length }} programs available
        </div>
      </div>

      <!-- Single enrollment display -->
      <div class="single-enrollment" *ngIf="enrollmentOptions.length === 1">
        <div class="enrollment-card active">
          <div class="enrollment-icon">
            <i class="fas fa-check-circle text-success"></i>
          </div>
          <div class="enrollment-details">
            <div class="enrollment-name">{{ enrollmentOptions[0].displayText }}</div>
            <div class="enrollment-subtitle" *ngIf="enrollmentOptions[0].subtitle">
              {{ enrollmentOptions[0].subtitle }}
            </div>
            <div class="enrollment-status">
              <span class="badge badge-success" *ngIf="enrollmentOptions[0].hasFormSession">
                Active Session
              </span>
              <span class="badge badge-secondary" *ngIf="!enrollmentOptions[0].hasFormSession">
                No Session
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Multiple enrollments selector -->
      <div class="multiple-enrollments" *ngIf="enrollmentOptions.length > 1">

        <!-- Dropdown Selector -->
        <div class="form-group mb-3">
          <label for="enrollmentSelect" class="form-label">Select Program:</label>
          <select
            id="enrollmentSelect"
            class="form-select"
            [value]="selectedEnrollmentId"
            (change)="onEnrollmentChange($event)"
            [disabled]="disabled">
            <option value="">Select a program...</option>
            <option
              *ngFor="let option of enrollmentOptions"
              [value]="option.enrollment.id"
              [class.active-option]="option.isActive">
              {{ option.displayText }}
              <span *ngIf="option.hasFormSession"> (Active)</span>
            </option>
          </select>
        </div>

        <!-- Selected enrollment details -->
        <div class="selected-enrollment-details" *ngIf="selectedEnrollment">
          <div class="enrollment-card" [class.active]="selectedEnrollment.isActive">
            <div class="enrollment-icon">
              <i class="fas fa-graduation-cap"
                 [class.text-success]="selectedEnrollment.hasFormSession"
                 [class.text-warning]="!selectedEnrollment.hasFormSession"></i>
            </div>
            <div class="enrollment-details">
              <div class="enrollment-name">{{ selectedEnrollment.displayText }}</div>
              <div class="enrollment-subtitle" *ngIf="selectedEnrollment.subtitle">
                {{ selectedEnrollment.subtitle }}
              </div>
              <div class="enrollment-status">
                <span class="badge badge-success" *ngIf="selectedEnrollment.hasFormSession">
                  <i class="fas fa-check"></i> Active Session
                </span>
                <span class="badge badge-warning" *ngIf="!selectedEnrollment.hasFormSession">
                  <i class="fas fa-clock"></i> No Active Session
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Grid view for many enrollments -->
        <div class="enrollment-grid" *ngIf="showGridView && enrollmentOptions.length > 3">
          <div
            *ngFor="let option of enrollmentOptions"
            class="enrollment-grid-item"
            [class.selected]="option.enrollment.id === selectedEnrollmentId"
            [class.active]="option.isActive"
            (click)="selectEnrollment(option.enrollment.id)">

            <div class="grid-item-header">
              <i class="fas fa-graduation-cap"></i>
              <span class="enrollment-status-dot"
                    [class.active]="option.hasFormSession"></span>
            </div>

            <div class="grid-item-content">
              <div class="enrollment-name">{{ option.displayText }}</div>
              <div class="enrollment-subtitle" *ngIf="option.subtitle">
                {{ option.subtitle }}
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- No enrollments message -->
      <div class="no-enrollments" *ngIf="enrollmentOptions.length === 0">
        <div class="empty-state">
          <i class="fas fa-info-circle text-muted"></i>
          <div class="empty-message">
            <h5>No Program Enrollments</h5>
            <p>This company is not enrolled in any programs yet.</p>
          </div>
        </div>
      </div>

      <!-- Loading state -->
      <div class="loading-state" *ngIf="isLoading">
        <i class="fas fa-spinner fa-spin"></i>
        <span>Loading enrollments...</span>
      </div>

      <!-- Toggle for grid view -->
      <div class="view-options" *ngIf="enrollmentOptions.length > 3">
        <button
          type="button"
          class="btn btn-sm btn-outline-secondary"
          (click)="toggleGridView()">
          <i class="fas" [class.fa-th]="!showGridView" [class.fa-list]="showGridView"></i>
          {{ showGridView ? 'List View' : 'Grid View' }}
        </button>
      </div>

    </div>
  `,
  styles: [`
    .enrollment-selector {
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
    }

    .enrollment-selector.disabled {
      opacity: 0.6;
      pointer-events: none;
    }

    .selector-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #dee2e6;
    }

    .selector-title {
      margin: 0;
      color: #495057;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .selector-title i {
      margin-right: 0.5rem;
      color: #007bff;
    }

    .selector-info {
      color: #6c757d;
      font-size: 0.875rem;
    }

    .enrollment-card {
      display: flex;
      align-items: center;
      padding: 1rem;
      background: white;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      transition: all 0.2s ease;
    }

    .enrollment-card.active {
      border-color: #007bff;
      box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
    }

    .enrollment-icon {
      margin-right: 1rem;
      font-size: 1.5rem;
    }

    .enrollment-details {
      flex: 1;
    }

    .enrollment-name {
      font-weight: 600;
      color: #212529;
      margin-bottom: 0.25rem;
    }

    .enrollment-subtitle {
      color: #6c757d;
      font-size: 0.875rem;
      margin-bottom: 0.5rem;
    }

    .enrollment-status .badge {
      font-size: 0.75rem;
    }

    .form-select {
      background-color: white;
      border: 1px solid #ced4da;
      border-radius: 4px;
      padding: 0.5rem 0.75rem;
    }

    .form-select:focus {
      border-color: #007bff;
      box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
    }

    .enrollment-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }

    .enrollment-grid-item {
      background: white;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      padding: 1rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .enrollment-grid-item:hover {
      border-color: #007bff;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }

    .enrollment-grid-item.selected {
      border-color: #007bff;
      background: #f0f8ff;
    }

    .grid-item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .enrollment-status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #dc3545;
    }

    .enrollment-status-dot.active {
      background: #28a745;
    }

    .grid-item-content .enrollment-name {
      font-size: 0.9rem;
      margin-bottom: 0.25rem;
    }

    .grid-item-content .enrollment-subtitle {
      font-size: 0.75rem;
    }

    .empty-state {
      text-align: center;
      padding: 2rem;
      color: #6c757d;
    }

    .empty-state i {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .empty-message h5 {
      margin-bottom: 0.5rem;
    }

    .loading-state {
      text-align: center;
      padding: 2rem;
      color: #6c757d;
    }

    .loading-state i {
      margin-right: 0.5rem;
    }

    .view-options {
      margin-top: 1rem;
      text-align: right;
    }

    .badge-success {
      background-color: #28a745;
      color: white;
    }

    .badge-warning {
      background-color: #ffc107;
      color: #212529;
    }

    .badge-secondary {
      background-color: #6c757d;
      color: white;
    }

    .text-success {
      color: #28a745 !important;
    }

    .text-warning {
      color: #ffc107 !important;
    }

    .text-muted {
      color: #6c757d !important;
    }
  `]
})
export class EnrollmentContextSelectorComponent implements OnInit, OnDestroy {
  @Input() companyId!: number;
  @Input() disabled = false;
  @Input() showGridView = false;

  @Output() enrollmentSelected = new EventEmitter<ICategoryItemWithSession | null>();
  @Output() contextChanged = new EventEmitter<any>();

  enrollmentOptions: EnrollmentOption[] = [];
  selectedEnrollmentId: number | null = null;
  selectedEnrollment: EnrollmentOption | null = null;
  isLoading = true;

  private destroy$ = new Subject<void>();

  constructor(private companyContextService: CompanyContextService) {}

  ngOnInit() {
    this.loadEnrollmentOptions();
    this.subscribeToContextChanges();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadEnrollmentOptions() {
    this.isLoading = true;

    this.companyContextService.getCompanyEnrollments(this.companyId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (enrollments: ICategoryItemWithSession[]) => {
          this.enrollmentOptions = enrollments.map(enrollment => ({
            enrollment,
            displayText: this.generateDisplayText(enrollment),
            subtitle: this.generateSubtitle(enrollment),
            isActive: !!(enrollment.active_sessions && enrollment.active_sessions.length > 0),
            hasFormSession: !!(enrollment.active_sessions && enrollment.active_sessions.length > 0)
          }));

          // Auto-select first active enrollment or first enrollment
          if (this.enrollmentOptions.length > 0) {
            const activeEnrollment = this.enrollmentOptions.find(opt => opt.isActive);
            const enrollmentToSelect = activeEnrollment || this.enrollmentOptions[0];
            this.selectEnrollment(enrollmentToSelect.enrollment.id);
          }

          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Error loading enrollments:', error);
          this.isLoading = false;
        }
      });
  }

  private subscribeToContextChanges() {
    this.companyContextService.currentEnrollment$
      .pipe(takeUntil(this.destroy$))
      .subscribe(enrollment => {
        if (enrollment) {
          this.selectedEnrollmentId = enrollment.id;
          this.selectedEnrollment = this.enrollmentOptions.find(
            opt => opt.enrollment.id === enrollment.id
          ) || null;
        } else {
          this.selectedEnrollmentId = null;
          this.selectedEnrollment = null;
        }
      });
  }

  private generateDisplayText(enrollment: ICategoryItemWithSession): string {
    // Use program name or cohort name or fallback
    return enrollment.program_name || enrollment.cohort_name || `Program ${enrollment.id}`;
  }

  private generateSubtitle(enrollment: ICategoryItemWithSession): string | undefined {
    const parts = [];

    if (enrollment.active_sessions && enrollment.active_sessions.length > 0) {
      parts.push(`${enrollment.active_sessions.length} active session(s)`);
    }

    if (enrollment.cohort_name && enrollment.program_name && enrollment.cohort_name !== enrollment.program_name) {
      parts.push(enrollment.cohort_name);
    }

    return parts.length > 0 ? parts.join(' • ') : undefined;
  }

  onEnrollmentChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const enrollmentId = target.value ? parseInt(target.value) : null;
    this.selectEnrollment(enrollmentId);
  }

  selectEnrollment(enrollmentId: number | null) {
    if (enrollmentId === null) {
      this.companyContextService.setEnrollmentContext(null);
      this.enrollmentSelected.emit(null);
      return;
    }

    const selectedOption = this.enrollmentOptions.find(
      opt => opt.enrollment.id === enrollmentId
    );

    if (selectedOption) {
      this.companyContextService.setEnrollmentContext(selectedOption.enrollment);
      this.enrollmentSelected.emit(selectedOption.enrollment);
      this.contextChanged.emit({
        companyId: this.companyId,
        enrollment: selectedOption.enrollment
      });
    }
  }

  toggleGridView() {
    this.showGridView = !this.showGridView;
  }

  // Public methods for parent components
  getSelectedEnrollment(): ICategoryItemWithSession | null {
    return this.selectedEnrollment?.enrollment || null;
  }

  getEnrollmentCount(): number {
    return this.enrollmentOptions.length;
  }

  hasActiveEnrollments(): boolean {
    return this.enrollmentOptions.some(opt => opt.isActive);
  }

  refreshEnrollments() {
    this.loadEnrollmentOptions();
  }
}
