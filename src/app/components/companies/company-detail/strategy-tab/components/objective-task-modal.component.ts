import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { INode } from '../../../../../../models/schema';
import { OKRTask, initOKRTask } from '../../../../../../models/business.models';

@Component({
  selector: 'app-objective-task-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-lg w-full max-w-xl max-h-[90vh] overflow-hidden">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ taskData ? 'Edit' : 'Create' }} Task
          </h3>
          <button (click)="closeModal()" class="text-gray-400 hover:text-gray-600">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Content -->
        <div class="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <form (ngSubmit)="saveTask()" #taskForm="ngForm">
            <!-- Title -->
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Task Title <span class="text-red-500">*</span>
              </label>
              <input
                [(ngModel)]="formData.title"
                name="title"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Enter task title"
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
                placeholder="Describe the task details..."
              ></textarea>
            </div>

            <!-- Assigned To and Due Date -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Assigned To
                </label>
                <input
                  [(ngModel)]="formData.assigned_to"
                  name="assigned_to"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Who will complete this task?"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Due Date <span class="text-red-500">*</span>
                </label>
                <input
                  [(ngModel)]="formData.due_date"
                  name="due_date"
                  type="date"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>

            <!-- Priority and Status -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Priority <span class="text-red-500">*</span>
                </label>
                <select
                  [(ngModel)]="formData.priority"
                  name="priority"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

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
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <!-- Estimated and Actual Hours -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Hours
                </label>
                <input
                  [(ngModel)]="formData.estimated_hours"
                  name="estimated_hours"
                  type="number"
                  min="0"
                  step="0.5"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="0.0"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Actual Hours
                </label>
                <input
                  [(ngModel)]="formData.actual_hours"
                  name="actual_hours"
                  type="number"
                  min="0"
                  step="0.5"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="0.0"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Impact Weight (1-10)
                </label>
                <input
                  [(ngModel)]="formData.impact_weight"
                  name="impact_weight"
                  type="number"
                  min="1"
                  max="10"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="5"
                />
              </div>
            </div>

            <!-- Dependencies -->
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Dependencies
              </label>
              <textarea
                [(ngModel)]="formData.dependencies"
                name="dependencies"
                rows="2"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="List any dependencies or prerequisites..."
              ></textarea>
            </div>

            <!-- Tags -->
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div class="space-y-2 mb-3">
                <div *ngFor="let tag of formData.tags || []; let i = index"
                     class="flex items-center space-x-2">
                  <input
                    [(ngModel)]="formData.tags![i]"
                    [name]="'tag-' + i"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Enter tag..."
                  />
                  <button
                    type="button"
                    (click)="removeTag(i)"
                    class="text-red-600 hover:text-red-700 p-2"
                    title="Remove tag"
                  >
                    <i class="fas fa-trash-alt"></i>
                  </button>
                </div>
              </div>
              <button
                type="button"
                (click)="addTag()"
                class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg flex items-center space-x-2"
              >
                <i class="fas fa-plus"></i>
                <span>Add Tag</span>
              </button>
            </div>

            <!-- Notes -->
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                [(ngModel)]="formData.notes"
                name="notes"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Add any additional notes..."
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
            (click)="saveTask()"
            [disabled]="!formData.title || !formData.due_date"
            class="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white rounded-lg"
          >
            {{ taskData ? 'Update' : 'Create' }} Task
          </button>
        </div>
      </div>
    </div>
  `
})
export class ObjectiveTaskModalComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() taskData: INode<OKRTask> | null = null;
  @Input() objectiveId: string | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<OKRTask>();

  formData: OKRTask = initOKRTask();

  ngOnInit() {
    this.initializeFormData();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['taskData'] || changes['objectiveId']) {
      this.initializeFormData();
    }
  }

  private initializeFormData() {
    if (this.taskData) {
      this.formData = { ...this.taskData.data };
    } else {
      this.formData = initOKRTask();
      if (this.objectiveId) {
        this.formData.key_result_id = this.objectiveId;
      }
    }
  }

  closeModal() {
    this.close.emit();
  }

  saveTask() {
    if (!this.formData.title || !this.formData.due_date) {
      return;
    }

    this.save.emit(this.formData);
  }

  addTag() {
    if (!this.formData.tags) {
      this.formData.tags = [];
    }
    this.formData.tags.push('');
  }

  removeTag(index: number) {
    if (this.formData.tags) {
      this.formData.tags.splice(index, 1);
    }
  }
}
