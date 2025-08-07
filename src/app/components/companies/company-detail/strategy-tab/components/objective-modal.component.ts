import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { INode } from '../../../../../../models/schema';
import { Objective, initObjective } from '../../../../../../models/business.models';

@Component({
  selector: 'app-objective-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ objectiveData ? 'Edit' : 'Create' }} Objective
          </h3>
          <button (click)="closeModal()" class="text-gray-400 hover:text-gray-600">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Content -->
        <div class="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <form (ngSubmit)="saveObjective()" #objectiveForm="ngForm">
            <!-- Title -->
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Objective Title <span class="text-red-500">*</span>
              </label>
              <input
                [(ngModel)]="formData.title"
                name="title"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Enter the main objective"
              />
            </div>

            <!-- Description -->
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Description <span class="text-red-500">*</span>
              </label>
              <textarea
                [(ngModel)]="formData.description"
                name="description"
                required
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Describe what you want to achieve..."
              ></textarea>
            </div>

            <!-- Category and Priority -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Category <span class="text-red-500">*</span>
                </label>
                <select
                  [(ngModel)]="formData.category"
                  name="category"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="growth">Growth</option>
                  <option value="financial">Financial</option>
                  <option value="operational">Operational</option>
                  <option value="market">Market</option>
                  <option value="product">Product</option>
                  <option value="team">Team</option>
                </select>
              </div>

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
            </div>

            <!-- Timeline and Target Date -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Timeline <span class="text-red-500">*</span>
                </label>
                <select
                  [(ngModel)]="formData.timeline"
                  name="timeline"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="3_months">3 Months</option>
                  <option value="6_months">6 Months</option>
                  <option value="1_year">1 Year</option>
                  <option value="2_years">2 Years</option>
                  <option value="5_years">5 Years</option>
                </select>
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

            <!-- Status and Responsible Person -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  [(ngModel)]="formData.current_status"
                  name="current_status"
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
                  Responsible Person
                </label>
                <input
                  [(ngModel)]="formData.responsible_person"
                  name="responsible_person"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Who is responsible for this objective?"
                />
              </div>
            </div>

            <!-- Expected Outcome -->
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Expected Outcome <span class="text-red-500">*</span>
              </label>
              <textarea
                [(ngModel)]="formData.expected_outcome"
                name="expected_outcome"
                required
                rows="2"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="What do you expect to achieve?"
              ></textarea>
            </div>

            <!-- Success Criteria -->
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Success Criteria
              </label>
              <div class="space-y-2 mb-3">
                <div *ngFor="let criteria of formData.success_criteria; let i = index"
                     class="flex items-center space-x-2">
                  <input
                    [(ngModel)]="formData.success_criteria[i]"
                    [name]="'criteria-' + i"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Enter success criteria..."
                  />
                  <button
                    type="button"
                    (click)="removeCriteria(i)"
                    class="text-red-600 hover:text-red-700 p-2"
                    title="Remove criteria"
                  >
                    <i class="fas fa-trash-alt"></i>
                  </button>
                </div>
              </div>
              <button
                type="button"
                (click)="addCriteria()"
                class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg flex items-center space-x-2"
              >
                <i class="fas fa-plus"></i>
                <span>Add Success Criteria</span>
              </button>
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
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
            (click)="saveObjective()"
            [disabled]="!formData.title || !formData.description || !formData.expected_outcome"
            class="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white rounded-lg"
          >
            {{ objectiveData ? 'Update' : 'Create' }} Objective
          </button>
        </div>
      </div>
    </div>
  `
})
export class ObjectiveModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() objectiveData: INode<Objective> | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<Objective>();

  formData: Objective = initObjective();

  ngOnInit() {
    if (this.objectiveData) {
      this.formData = { ...this.objectiveData.data };
    } else {
      this.formData = initObjective();
    }
  }

  closeModal() {
    this.close.emit();
  }

  saveObjective() {
    if (!this.formData.title || !this.formData.description || !this.formData.expected_outcome) {
      return;
    }

    this.save.emit(this.formData);
  }

  addCriteria() {
    this.formData.success_criteria.push('');
  }

  removeCriteria(index: number) {
    this.formData.success_criteria.splice(index, 1);
  }
}
