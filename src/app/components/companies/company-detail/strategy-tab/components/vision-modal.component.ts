import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { INode } from '../../../../../../models/schema';
import { CompanyVision, initCompanyVision } from '../../../../../../models/business.models';

@Component({
  selector: 'app-vision-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ visionData ? 'Edit' : 'Add' }} Vision & Mission
          </h3>
          <button (click)="closeModal()" class="text-gray-400 hover:text-gray-600">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Content -->
        <div class="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <form (ngSubmit)="saveVision()" #visionForm="ngForm">
            <!-- Purpose Statement -->
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Purpose Statement
                <span class="text-red-500">*</span>
                <span class="text-xs text-gray-500 font-normal ml-2">
                  (e.g., "To provide sustainable fishing solutions", "To revolutionize paper manufacturing", "To build innovative machines")
                </span>
              </label>
              <textarea
                [(ngModel)]="formData.purpose_statement"
                name="purpose_statement"
                required
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Why does your company exist? What problem do you solve? e.g., 'To help small fishing businesses thrive through sustainable technology'"
              ></textarea>
              <p class="text-sm text-gray-600 mt-1">
                Your company's reason for being - the fundamental problem you solve for your customers.
              </p>
            </div>

            <!-- Vision Statement -->
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Vision Statement
                <span class="text-red-500">*</span>
                <span class="text-xs text-gray-500 font-normal ml-2">
                  (e.g., "To be the leading fishing equipment provider in Africa", "To transform the global paper industry")
                </span>
              </label>
              <textarea
                [(ngModel)]="formData.vision_statement"
                name="vision_statement"
                required
                rows="4"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe your company's long-term vision and aspirations..."
              ></textarea>
              <p class="text-sm text-gray-600 mt-1">
                What does your company aspire to achieve in the long term?
              </p>
            </div>

            <!-- Mission Statement -->
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Mission Statement
                <span class="text-red-500">*</span>
                <span class="text-xs text-gray-500 font-normal ml-2">
                  (e.g., "We design and manufacture high-quality fishing nets", "We produce eco-friendly paper products")
                </span>
              </label>
              <textarea
                [(ngModel)]="formData.mission_statement"
                name="mission_statement"
                required
                rows="4"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe your company's purpose and core activities..."
              ></textarea>
              <p class="text-sm text-gray-600 mt-1">
                What is your company's purpose and how do you serve your customers?
              </p>
            </div>

            <!-- Core Values -->
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Core Values
              </label>

              <!-- Values List -->
              <div class="space-y-2 mb-3">
                <div *ngFor="let value of formData.core_values; let i = index"
                     class="flex items-center space-x-2">
                  <input
                    [(ngModel)]="formData.core_values[i]"
                    [name]="'value-' + i"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter a core value..."
                  />
                  <button
                    type="button"
                    (click)="removeValue(i)"
                    class="text-red-600 hover:text-red-700 p-2"
                    title="Remove value"
                  >
                    <i class="fas fa-trash-alt"></i>
                  </button>
                </div>
              </div>

              <!-- Add Value Button -->
              <button
                type="button"
                (click)="addValue()"
                class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg flex items-center space-x-2"
              >
                <i class="fas fa-plus"></i>
                <span>Add Core Value</span>
              </button>

              <p class="text-sm text-gray-600 mt-1">
                What principles guide your company's decisions and behavior?
              </p>
            </div>

            <!-- Value Proposition -->
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Value Proposition
              </label>
              <textarea
                [(ngModel)]="formData.value_proposition"
                name="value_proposition"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="What unique value does your company provide to customers?"
              ></textarea>
              <p class="text-sm text-gray-600 mt-1">
                Optional: What makes your company's offering unique and valuable?
              </p>
            </div>

            <!-- Long-term Goals -->
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Long-term Goals
              </label>
              <textarea
                [(ngModel)]="formData.long_term_goals"
                name="long_term_goals"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="What are your company's long-term objectives?"
              ></textarea>
              <p class="text-sm text-gray-600 mt-1">
                Optional: Where do you see your company in the next 5-10 years?
              </p>
            </div>

            <!-- Success Metrics -->
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Success Metrics
              </label>

              <!-- Metrics List -->
              <div class="space-y-2 mb-3">
                <div *ngFor="let metric of formData.success_metrics; let i = index"
                     class="flex items-center space-x-2">
                  <input
                    [(ngModel)]="formData.success_metrics[i]"
                    [name]="'metric-' + i"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter a success metric..."
                  />
                  <button
                    type="button"
                    (click)="removeMetric(i)"
                    class="text-red-600 hover:text-red-700 p-2"
                    title="Remove metric"
                  >
                    <i class="fas fa-trash-alt"></i>
                  </button>
                </div>
              </div>

              <!-- Add Metric Button -->
              <button
                type="button"
                (click)="addMetric()"
                class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg flex items-center space-x-2"
              >
                <i class="fas fa-plus"></i>
                <span>Add Success Metric</span>
              </button>

              <p class="text-sm text-gray-600 mt-1">
                Optional: How will you measure success and progress?
              </p>
            </div>
          </form>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            type="button"
            (click)="closeModal()"
            class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            (click)="saveVision()"
            [disabled]="!formData.purpose_statement || !formData.vision_statement || !formData.mission_statement"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg"
          >
            {{ visionData ? 'Update' : 'Save' }} Vision & Mission
          </button>
        </div>
      </div>
    </div>
  `
})
export class VisionModalComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() visionData: INode<CompanyVision> | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<CompanyVision>();

  formData: CompanyVision = initCompanyVision();

  ngOnInit() {
    this.initializeFormData();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visionData']) {
      this.initializeFormData();
    }
  }

  private initializeFormData() {
    if (this.visionData) {
      this.formData = { ...this.visionData.data };
      // Ensure arrays are properly initialized
      if (!this.formData.core_values) {
        this.formData.core_values = [];
      }
      if (!this.formData.success_metrics) {
        this.formData.success_metrics = [];
      }
    } else {
      this.formData = initCompanyVision();
    }
  }

  closeModal() {
    this.close.emit();
  }

  saveVision() {
    if (!this.formData.purpose_statement || !this.formData.vision_statement || !this.formData.mission_statement) {
      return;
    }

    this.save.emit(this.formData);
  }

  addValue() {
    this.formData.core_values.push('');
  }

  removeValue(index: number) {
    this.formData.core_values.splice(index, 1);
  }

  addMetric() {
    this.formData.success_metrics.push('');
  }

  removeMetric(index: number) {
    this.formData.success_metrics.splice(index, 1);
  }
}
