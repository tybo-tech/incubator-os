import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { INode } from '../../../../../../models/schema';
import { KeyResult, initKeyResult } from '../../../../../../models/business.models';

@Component({
  selector: 'app-key-result-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-hidden">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ keyResultData ? 'Edit' : 'Create' }} Key Result
          </h3>
          <button (click)="closeModal()" class="text-gray-400 hover:text-gray-600">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Content -->
        <div class="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <form (ngSubmit)="saveKeyResult()" #keyResultForm="ngForm">
            <!-- Title -->
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Key Result Title <span class="text-red-500">*</span>
              </label>
              <input
                [(ngModel)]="formData.title"
                name="title"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter the measurable outcome"
              />
            </div>

            <!-- Description -->
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                [(ngModel)]="formData.description"
                name="description"
                rows="2"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe what this key result measures..."
              ></textarea>
            </div>

            <!-- Metric Type and Unit -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Metric Type <span class="text-red-500">*</span>
                </label>
                <select
                  [(ngModel)]="formData.metric_type"
                  name="metric_type"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="number">Number</option>
                  <option value="percentage">Percentage</option>
                  <option value="currency">Currency</option>
                  <option value="boolean">Yes/No</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Unit
                </label>
                <input
                  [(ngModel)]="formData.unit"
                  name="unit"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., followers, $, %"
                />
              </div>
            </div>

            <!-- Baseline, Current, and Target Values -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Baseline Value <span class="text-red-500">*</span>
                </label>
                <input
                  [(ngModel)]="formData.baseline_value"
                  name="baseline_value"
                  type="number"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Starting point"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Current Value <span class="text-red-500">*</span>
                </label>
                <input
                  [(ngModel)]="formData.current_value"
                  name="current_value"
                  type="number"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Current progress"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Target Value <span class="text-red-500">*</span>
                </label>
                <input
                  [(ngModel)]="formData.target_value"
                  name="target_value"
                  type="number"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Goal to reach"
                />
              </div>
            </div>

            <!-- Target Date and Confidence -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Target Date <span class="text-red-500">*</span>
                </label>
                <input
                  [(ngModel)]="formData.target_date"
                  name="target_date"
                  type="date"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Confidence Level ({{ formData.confidence_level }}/5)
                </label>
                <input
                  [(ngModel)]="formData.confidence_level"
                  name="confidence_level"
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div class="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Low</span>
                  <span>High</span>
                </div>
              </div>
            </div>

            <!-- Status and Responsible Person -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  [(ngModel)]="formData.status"
                  name="status"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="on_track">On Track</option>
                  <option value="at_risk">At Risk</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Responsible Person
                </label>
                <input
                  [(ngModel)]="formData.responsible_person"
                  name="responsible_person"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Who owns this key result?"
                />
              </div>
            </div>

            <!-- Mentor Notes -->
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Mentor Notes
              </label>
              <textarea
                [(ngModel)]="formData.mentor_notes"
                name="mentor_notes"
                rows="2"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add any mentor feedback or notes..."
              ></textarea>
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
            (click)="saveKeyResult()"
            [disabled]="!formData.title || !formData.target_value"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg"
          >
            {{ keyResultData ? 'Update' : 'Create' }} Key Result
          </button>
        </div>
      </div>
    </div>
  `
})
export class KeyResultModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() keyResultData: INode<KeyResult> | null = null;
  @Input() objectiveId: string | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<KeyResult>();

  formData: KeyResult = initKeyResult();

  ngOnInit() {
    if (this.keyResultData) {
      this.formData = { ...this.keyResultData.data };
    } else {
      this.formData = initKeyResult();
      if (this.objectiveId) {
        this.formData.objective_id = this.objectiveId;
      }
    }
  }

  closeModal() {
    this.close.emit();
  }

  saveKeyResult() {
    if (!this.formData.title || !this.formData.target_value) {
      return;
    }

    // Calculate progress percentage
    const progress = Math.min(100, Math.max(0,
      ((this.formData.current_value - this.formData.baseline_value) /
       (this.formData.target_value - this.formData.baseline_value)) * 100
    ));
    this.formData.progress_percentage = Math.round(progress) || 0;

    this.save.emit(this.formData);
  }
}
