import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { INode, ICollection } from '../../../models/schema';
import { NodeService } from '../../../services/node.service';
import { DynamicFormService, DynamicFormConfig } from '../../services/dynamic-form.service';
import { FormGroupRendererComponent } from '../form-group-renderer/form-group-renderer.component';

@Component({
  selector: 'app-standalone-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormGroupRendererComponent],
  template: `
    <div class="min-h-screen bg-gray-50 py-8">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <!-- Loading State -->
        <div *ngIf="isLoading" class="text-center py-12">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p class="mt-4 text-gray-600">Loading form...</p>
        </div>

        <!-- Error State -->
        <div *ngIf="error" class="text-center py-12">
          <div class="text-red-600 mb-4">
            <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 19.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">Form Not Found</h3>
          <p class="text-sm text-gray-600 mb-4">{{ error }}</p>
        </div>

        <!-- Form Content -->
        <div *ngIf="formConfig && !isLoading && !error">
          <!-- Form Header -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h1 class="text-2xl font-bold text-gray-900 mb-2">
              {{ formConfig.collection.data.name }}
            </h1>
            <p class="text-sm text-gray-500 mt-2">
              Please fill out all required fields marked with *
            </p>
          </div>

          <!-- Form -->
          <form [formGroup]="formConfig.mainForm" (ngSubmit)="onSubmit()" class="space-y-6">
            <!-- Form Groups -->
            <app-form-group-renderer
              *ngFor="let groupConfig of formConfig.formGroups; trackBy: trackByGroup"
              [group]="groupConfig.group"
              [fields]="groupConfig.fields"
              [formGroup]="groupConfig.formGroup"
              [collectionOptions]="formConfig.collectionOptions"
            >
            </app-form-group-renderer>

            <!-- Submit Section -->
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div class="flex items-center justify-between">
                <div class="text-sm text-gray-600">
                  <span class="font-medium">{{ getRequiredFieldsCount() }}</span> required fields
                </div>
                <button
                  type="submit"
                  [disabled]="formConfig.mainForm.invalid || isSubmitting"
                  class="px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span *ngIf="!isSubmitting">Submit Form</span>
                  <span *ngIf="isSubmitting" class="flex items-center">
                    <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </span>
                </button>
              </div>

              <!-- Form Validation Summary -->
              <div *ngIf="formConfig.mainForm.invalid && formConfig.mainForm.touched" class="mt-4">
                <div class="bg-red-50 border border-red-200 rounded-md p-3">
                  <div class="flex">
                    <div class="flex-shrink-0">
                      <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                      </svg>
                    </div>
                    <div class="ml-3">
                      <h3 class="text-sm font-medium text-red-800">
                        Please correct the following errors:
                      </h3>
                      <div class="mt-2 text-sm text-red-700">
                        <ul class="list-disc list-inside space-y-1">
                          <li *ngFor="let error of getFormErrors()">{{ error }}</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>

          <!-- Success Message -->
          <div *ngIf="isSuccess" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div class="text-center">
                <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                  <svg class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <h3 class="text-lg font-medium text-gray-900 mt-4">Form Submitted Successfully!</h3>
                <p class="text-sm text-gray-600 mt-2">Thank you for submitting the form. Your data has been saved.</p>
                <button
                  (click)="resetForm()"
                  class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Submit Another
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class StandaloneFormComponent implements OnInit {
  formConfig: DynamicFormConfig | null = null;
  isLoading = true;
  isSubmitting = false;
  isSuccess = false;
  error: string | null = null;
  collectionId!: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private nodeService: NodeService,
    private dynamicFormService: DynamicFormService
  ) {}

  async ngOnInit() {
    this.route.params.subscribe(async (params) => {
      this.collectionId = params['collectionId'];
      if (this.collectionId) {
        await this.loadForm();
      } else {
        this.error = 'No collection ID provided';
        this.isLoading = false;
      }
    });
  }

  private async loadForm() {
    try {
      this.isLoading = true;
      this.error = null;

      // Load collection schema
      const collection = await this.nodeService.getNodeById(parseInt(this.collectionId)).toPromise() as INode<ICollection>;

      if (!collection || collection.type !== 'collection') {
        throw new Error('Invalid collection or collection not found');
      }

      // Generate form configuration
      this.formConfig = await this.dynamicFormService.generateFormConfig(collection);

    } catch (error) {
      console.error('Error loading form:', error);
      this.error = error instanceof Error ? error.message : 'Failed to load form';
    } finally {
      this.isLoading = false;
    }
  }

  async onSubmit() {
    if (!this.formConfig || this.formConfig.mainForm.invalid) {
      return;
    }

    try {
      this.isSubmitting = true;

      // Extract form data
      const formData = this.dynamicFormService.extractFormData(this.formConfig.formGroups);

      // Create new record
      const newRecord = await this.nodeService.addNode({
        type: this.formConfig.collection.data.targetType,
        data: formData,
        parent_id: this.formConfig.collection.id
      }).toPromise();

      console.log('Record created successfully:', newRecord);
      this.isSuccess = true;

    } catch (error) {
      console.error('Error submitting form:', error);
      // Handle error (could show error message)
    } finally {
      this.isSubmitting = false;
    }
  }

  resetForm() {
    this.isSuccess = false;
    if (this.formConfig) {
      this.formConfig.mainForm.reset();
      // Reload form to get fresh configuration
      this.loadForm();
    }
  }

  getRequiredFieldsCount(): number {
    if (!this.formConfig) return 0;

    let count = 0;
    this.formConfig.formGroups.forEach(group => {
      count += group.fields.filter(field => field.required).length;
    });
    return count;
  }

  getFormErrors(): string[] {
    if (!this.formConfig) return [];

    const errors: string[] = [];
    this.formConfig.formGroups.forEach(group => {
      group.fields.forEach(field => {
        if (this.dynamicFormService.isFieldInvalid(group.formGroup, field.key)) {
          const fieldErrors = group.formGroup.get(field.key)?.errors;
          if (fieldErrors?.['required']) {
            errors.push(`${field.label} is required`);
          }
          if (fieldErrors?.['invalidJson']) {
            errors.push(`${field.label} contains invalid JSON`);
          }
        }
      });
    });
    return errors;
  }

  trackByGroup(index: number, groupConfig: any): any {
    return groupConfig.group.id;
  }
}
