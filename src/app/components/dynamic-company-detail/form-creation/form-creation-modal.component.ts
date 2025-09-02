// src/app/components/dynamic-company-detail/form-creation/form-creation-modal.component.ts
import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable } from 'rxjs';

// Import form service and models
import { FormService } from '../../../../services/form.service';
import { IForm, ScopeType, FormStatus } from '../../../../models/form-system.models';

export interface FormCreationData {
  title: string;
  description: string;
  form_key: string;
  scope_type: ScopeType;
  scope_id: number;
}

export interface ProgramContext {
  clientId: number;
  clientName: string;
  programId: number;
  programName: string;
  cohortId: number;
  cohortName: string;
}

@Component({
  selector: 'app-form-creation-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="modal-overlay" *ngIf="show()" (click)="onOverlayClick($event)">
      <div class="modal-container" (click)="$event.stopPropagation()">

        <!-- Modal Header -->
        <div class="modal-header">
          <h3 class="modal-title">
            <i class="fas fa-plus-circle text-primary"></i>
            Create New Form
          </h3>
          <button
            type="button"
            class="btn-close"
            (click)="cancel()"
            [disabled]="isCreating()">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Context Display -->
        <div class="context-banner" *ngIf="programContext()">
          <div class="context-info">
            <div class="context-path">
              <span class="context-item">
                <i class="fas fa-user"></i>
                {{ programContext()?.clientName }}
              </span>
              <i class="fas fa-chevron-right"></i>
              <span class="context-item">
                <i class="fas fa-layer-group"></i>
                {{ programContext()?.programName }}
              </span>
              <i class="fas fa-chevron-right"></i>
              <span class="context-item">
                <i class="fas fa-users"></i>
                {{ programContext()?.cohortName }}
              </span>
            </div>
            <div class="context-note">
              Form will be created for this specific cohort
            </div>
          </div>
        </div>

        <!-- Form Creation Form -->
        <form [formGroup]="formCreationForm" (ngSubmit)="onSubmit()" class="modal-form">

          <!-- Form Title -->
          <div class="form-group">
            <label for="title" class="form-label required">
              <i class="fas fa-heading"></i>
              Form Title
            </label>
            <input
              type="text"
              id="title"
              class="form-control"
              formControlName="title"
              placeholder="e.g., Business Assessment, Financial Check-in"
              [class.is-invalid]="isFieldInvalid('title')"
              maxlength="100">
            <div class="form-text">
              This will be displayed as the tab name in company details
            </div>
            <div class="invalid-feedback" *ngIf="isFieldInvalid('title')">
              Form title is required and must be between 3-100 characters
            </div>
          </div>

          <!-- Form Key (Auto-generated) -->
          <div class="form-group">
            <label for="formKey" class="form-label">
              <i class="fas fa-key"></i>
              Form Key
            </label>
            <input
              type="text"
              id="formKey"
              class="form-control"
              formControlName="form_key"
              [value]="generatedFormKey()"
              readonly>
            <div class="form-text">
              Auto-generated unique identifier for this form
            </div>
          </div>

          <!-- Description -->
          <div class="form-group">
            <label for="description" class="form-label">
              <i class="fas fa-align-left"></i>
              Description
            </label>
            <textarea
              id="description"
              class="form-control"
              formControlName="description"
              rows="3"
              placeholder="Describe what this form is used for..."
              maxlength="500"></textarea>
            <div class="form-text">
              Optional description to help users understand the form's purpose
            </div>
          </div>

          <!-- Scope Information (Read-only display) -->
          <div class="scope-info">
            <h5>
              <i class="fas fa-bullseye"></i>
              Form Scope
            </h5>
            <div class="scope-details">
              <div class="scope-item">
                <label>Scope Type:</label>
                <span class="badge badge-info">{{ selectedScopeType() }}</span>
              </div>
              <div class="scope-item" *ngIf="selectedScopeType() !== 'global'">
                <label>Scope Target:</label>
                <span class="scope-target">{{ getScopeDisplayName() }}</span>
              </div>
            </div>
          </div>

          <!-- Scope Type Selection -->
          <div class="form-group">
            <label class="form-label">
              <i class="fas fa-target"></i>
              Where should this form be available?
            </label>

            <div class="scope-options">
              <div class="scope-option"
                   [class.selected]="selectedScopeType() === 'cohort'"
                   (click)="selectScopeType('cohort')">
                <div class="option-header">
                  <i class="fas fa-users"></i>
                  <strong>This Cohort Only</strong>
                  <span class="badge badge-primary" *ngIf="selectedScopeType() === 'cohort'">
                    Selected
                  </span>
                </div>
                <div class="option-description">
                  Form will only be available for companies in {{ programContext()?.cohortName }}
                </div>
              </div>

              <div class="scope-option"
                   [class.selected]="selectedScopeType() === 'program'"
                   (click)="selectScopeType('program')">
                <div class="option-header">
                  <i class="fas fa-layer-group"></i>
                  <strong>Entire Program</strong>
                  <span class="badge badge-primary" *ngIf="selectedScopeType() === 'program'">
                    Selected
                  </span>
                </div>
                <div class="option-description">
                  Form will be available for all cohorts in {{ programContext()?.programName }}
                </div>
              </div>

              <div class="scope-option"
                   [class.selected]="selectedScopeType() === 'client'"
                   (click)="selectScopeType('client')">
                <div class="option-header">
                  <i class="fas fa-building"></i>
                  <strong>All Client Programs</strong>
                  <span class="badge badge-primary" *ngIf="selectedScopeType() === 'client'">
                    Selected
                  </span>
                </div>
                <div class="option-description">
                  Form will be available across all programs for {{ programContext()?.clientName }}
                </div>
              </div>

              <div class="scope-option"
                   [class.selected]="selectedScopeType() === 'global'"
                   (click)="selectScopeType('global')">
                <div class="option-header">
                  <i class="fas fa-globe"></i>
                  <strong>Global Template</strong>
                  <span class="badge badge-primary" *ngIf="selectedScopeType() === 'global'">
                    Selected
                  </span>
                </div>
                <div class="option-description">
                  Form template available system-wide for all clients and programs
                </div>
              </div>
            </div>
          </div>

        </form>

        <!-- Modal Footer -->
        <div class="modal-footer">
          <button
            type="button"
            class="btn btn-secondary"
            (click)="cancel()"
            [disabled]="isCreating()">
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-primary"
            (click)="onSubmit()"
            [disabled]="!formCreationForm.valid || isCreating()">
            <span *ngIf="isCreating()" class="spinner">
              <i class="fas fa-spinner fa-spin"></i>
            </span>
            <span *ngIf="!isCreating()">
              <i class="fas fa-plus"></i>
            </span>
            {{ isCreating() ? 'Creating Form...' : 'Create Form' }}
          </button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }

    .modal-container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      max-width: 600px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid #dee2e6;
      background: #f8f9fa;
      border-radius: 12px 12px 0 0;
    }

    .modal-title {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: #212529;
    }

    .btn-close {
      background: none;
      border: none;
      font-size: 1.2rem;
      color: #6c757d;
      cursor: pointer;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: all 0.2s ease;
    }

    .btn-close:hover {
      background: #e9ecef;
      color: #495057;
    }

    .context-banner {
      background: linear-gradient(135deg, #007bff, #0056b3);
      color: white;
      padding: 1rem 1.5rem;
    }

    .context-path {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .context-item {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-weight: 500;
    }

    .context-note {
      font-size: 0.875rem;
      opacity: 0.9;
    }

    .modal-form {
      padding: 1.5rem;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;
      color: #495057;
      margin-bottom: 0.5rem;
    }

    .form-label.required::after {
      content: '*';
      color: #dc3545;
      margin-left: 0.25rem;
    }

    .form-control {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ced4da;
      border-radius: 6px;
      font-size: 1rem;
      transition: border-color 0.2s ease;
    }

    .form-control:focus {
      outline: none;
      border-color: #007bff;
      box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
    }

    .form-control.is-invalid {
      border-color: #dc3545;
    }

    .form-text {
      font-size: 0.875rem;
      color: #6c757d;
      margin-top: 0.25rem;
    }

    .invalid-feedback {
      font-size: 0.875rem;
      color: #dc3545;
      margin-top: 0.25rem;
    }

    .scope-info {
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      padding: 1rem;
      margin-bottom: 1.5rem;
    }

    .scope-info h5 {
      margin: 0 0 1rem 0;
      color: #495057;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .scope-details {
      display: grid;
      gap: 0.5rem;
    }

    .scope-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .scope-item label {
      font-weight: 500;
      color: #6c757d;
    }

    .scope-target {
      font-weight: 600;
      color: #495057;
    }

    .scope-options {
      display: grid;
      gap: 1rem;
    }

    .scope-option {
      border: 2px solid #dee2e6;
      border-radius: 8px;
      padding: 1rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .scope-option:hover {
      border-color: #007bff;
      background: #f8f9fa;
    }

    .scope-option.selected {
      border-color: #007bff;
      background: #e7f3ff;
    }

    .option-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }

    .option-header strong {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #495057;
    }

    .option-description {
      font-size: 0.875rem;
      color: #6c757d;
      line-height: 1.4;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      padding: 1.5rem;
      border-top: 1px solid #dee2e6;
      background: #f8f9fa;
      border-radius: 0 0 12px 12px;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #5a6268;
    }

    .btn-primary {
      background: #007bff;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #0056b3;
    }

    .badge {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .badge-info {
      background: #17a2b8;
      color: white;
    }

    .badge-primary {
      background: #007bff;
      color: white;
    }

    .spinner {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .text-primary {
      color: #007bff !important;
    }
  `]
})
export class FormCreationModalComponent {
  @Input() show = signal(false);
  @Input() programContext = signal<ProgramContext | null>(null);
  @Input() isCreating = signal(false);

  @Output() formCreated = new EventEmitter<IForm>();
  @Output() cancelled = new EventEmitter<void>();

  // Form management
  formCreationForm: FormGroup;
  selectedScopeType = signal<ScopeType>('cohort');

  // Computed properties
  generatedFormKey = computed(() => {
    const title = this.formCreationForm?.get('title')?.value || '';
    const context = this.programContext();
    const scopeType = this.selectedScopeType();

    if (!title.trim()) return '';

    // Generate form key based on title and context
    const baseKey = title.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 30);

    const contextSuffix = scopeType === 'cohort' ? `_c${context?.cohortId}` :
                         scopeType === 'program' ? `_p${context?.programId}` :
                         scopeType === 'client' ? `_cl${context?.clientId}` : '';

    return `${baseKey}${contextSuffix}`;
  });

  constructor(
    private fb: FormBuilder,
    private formService: FormService
  ) {
    this.formCreationForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      form_key: ['']
    });

    // Update form_key when title changes
    this.formCreationForm.get('title')?.valueChanges.subscribe(() => {
      this.formCreationForm.patchValue({
        form_key: this.generatedFormKey()
      });
    });
  }

  selectScopeType(scopeType: ScopeType) {
    this.selectedScopeType.set(scopeType);
    // Update form key when scope changes
    this.formCreationForm.patchValue({
      form_key: this.generatedFormKey()
    });
  }

  getScopeDisplayName(): string {
    const context = this.programContext();
    const scopeType = this.selectedScopeType();

    if (!context) return '';

    switch (scopeType) {
      case 'cohort': return context.cohortName;
      case 'program': return context.programName;
      case 'client': return context.clientName;
      case 'global': return 'All Systems';
      default: return '';
    }
  }

  getScopeId(): number | null {
    const context = this.programContext();
    const scopeType = this.selectedScopeType();

    if (!context) return null;

    switch (scopeType) {
      case 'cohort': return context.cohortId;
      case 'program': return context.programId;
      case 'client': return context.clientId;
      case 'global': return null;
      default: return null;
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.formCreationForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  onSubmit() {
    if (this.formCreationForm.valid && !this.isCreating()) {
      this.isCreating.set(true);

      const formData: Partial<IForm> = {
        title: this.formCreationForm.get('title')?.value,
        description: this.formCreationForm.get('description')?.value || null,
        form_key: this.generatedFormKey(),
        scope_type: this.selectedScopeType(),
        scope_id: this.getScopeId(),
        status: 'draft' as FormStatus,
        version: 1
      };

      this.formService.addForm(formData).subscribe({
        next: (createdForm) => {
          this.formCreated.emit(createdForm);
          this.resetForm();
          this.isCreating.set(false);
        },
        error: (error) => {
          console.error('Failed to create form:', error);
          // TODO: Show error message to user
          this.isCreating.set(false);
        }
      });
    }
  }

  cancel() {
    this.cancelled.emit();
    this.resetForm();
  }

  onOverlayClick(event: Event) {
    // Close modal if clicking on overlay (not on modal content)
    this.cancel();
  }

  private resetForm() {
    this.formCreationForm.reset();
    this.selectedScopeType.set('cohort');
    this.show.set(false);
  }
}
