import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
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
      <div class="bg-white rounded-lg w-full max-w-xl max-h-[90vh] overflow-hidden">
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
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Enter key result title"
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
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Describe this key result..."
              ></textarea>
            </div>

            <!-- Target Value and Unit -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Target Value <span class="text-red-500">*</span>
                </label>
                <input
                  [(ngModel)]="formData.target_value"
                  name="target_value"
                  type="number"
                  required
                  min="0"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter target value"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Unit
                </label>
                <input
                  [(ngModel)]="formData.unit"
                  name="unit"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="e.g., users, revenue, downloads"
                />
              </div>
            </div>

            <!-- Current Value and Baseline -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Current Value
                </label>
                <input
                  [(ngModel)]="formData.current_value"
                  name="current_value"
                  type="number"
                  min="0"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Current progress value"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Baseline Value
                </label>
                <input
                  [(ngModel)]="formData.baseline_value"
                  name="baseline_value"
                  type="number"
                  min="0"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Starting point value"
                />
              </div>
            </div>

            <!-- Date Range -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Created Date <span class="text-red-500">*</span>
                </label>
                <input
                  [(ngModel)]="formData.created_date"
                  name="created_date"
                  type="date"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Target Date <span class="text-red-500">*</span>
                </label>
                <input
                  [(ngModel)]="formData.target_date"
                  name="target_date"
                  type="date"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>

            <!-- Status and Metric Type -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  [(ngModel)]="formData.status"
                  name="status"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                  Metric Type
                </label>
                <select
                  [(ngModel)]="formData.metric_type"
                  name="metric_type"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="number">Number</option>
                  <option value="percentage">Percentage</option>
                  <option value="currency">Currency</option>
                  <option value="boolean">Boolean</option>
                </select>
              </div>
            </div>

            <!-- Owner and Confidence Level -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Responsible Person
                </label>
                <input
                  [(ngModel)]="formData.responsible_person"
                  name="responsible_person"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Who owns this key result?"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Confidence Level (1-5)
                </label>
                <select
                  [(ngModel)]="formData.confidence_level"
                  name="confidence_level"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="1">1 - Very Low</option>
                  <option value="2">2 - Low</option>
                  <option value="3">3 - Medium</option>
                  <option value="4">4 - High</option>
                  <option value="5">5 - Very High</option>
                </select>
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
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Notes from mentor or additional context..."
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
            [disabled]="!formData.title || !formData.target_value || !formData.created_date || !formData.target_date"
            class="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white rounded-lg"
          >
            {{ keyResultData ? 'Update' : 'Create' }} Key Result
          </button>
        </div>
      </div>
    </div>
  `
})
export class KeyResultModalComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() keyResultData: INode<KeyResult> | null = null;
  @Input() objectiveId: string | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<KeyResult>();

  formData: KeyResult = initKeyResult();

  ngOnInit() {
    this.initializeFormData();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['keyResultData'] || changes['objectiveId']) {
      this.initializeFormData();
    }
  }

  private initializeFormData() {
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
    if (!this.formData.title || !this.formData.target_value || !this.formData.created_date || !this.formData.target_date) {
      return;
    }

    this.save.emit(this.formData);
  }
}
