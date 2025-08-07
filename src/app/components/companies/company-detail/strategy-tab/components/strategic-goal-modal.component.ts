import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { INode } from '../../../../../../models/schema';
import { StrategicGoal, initStrategicGoal } from '../../../../../../models/business.models';

@Component({
  selector: 'app-strategic-goal-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ goalData ? 'Edit' : 'Add' }} Strategic Goal
          </h3>
          <button (click)="closeModal()" class="text-gray-400 hover:text-gray-600">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Content -->
        <div class="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <form (ngSubmit)="saveGoal()" #goalForm="ngForm">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Left Column -->
              <div class="space-y-4">
                <!-- Title -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Goal Title <span class="text-red-500">*</span>
                  </label>
                  <input
                    [(ngModel)]="formData.title"
                    name="title"
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Enter goal title"
                  />
                </div>

                <!-- Category -->
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

                <!-- Priority -->
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

                <!-- Timeline -->
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

                <!-- Target Date -->
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

                <!-- Status -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Current Status
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

                <!-- Progress Percentage -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Progress Percentage
                  </label>
                  <input
                    [(ngModel)]="formData.progress_percentage"
                    name="progress_percentage"
                    type="number"
                    min="0"
                    max="100"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="0"
                  />
                </div>

                <!-- Responsible Person -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Responsible Person
                  </label>
                  <input
                    [(ngModel)]="formData.responsible_person"
                    name="responsible_person"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Who is responsible for this goal?"
                  />
                </div>

                <!-- Budget Required -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Budget Required (R)
                  </label>
                  <input
                    [(ngModel)]="formData.budget_required"
                    name="budget_required"
                    type="number"
                    min="0"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="0"
                  />
                </div>
              </div>

              <!-- Right Column -->
              <div class="space-y-4">
                <!-- Description -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Description <span class="text-red-500">*</span>
                  </label>
                  <textarea
                    [(ngModel)]="formData.description"
                    name="description"
                    required
                    rows="4"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Describe the strategic goal in detail..."
                  ></textarea>
                </div>

                <!-- Expected Outcome -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Expected Outcome <span class="text-red-500">*</span>
                  </label>
                  <textarea
                    [(ngModel)]="formData.expected_outcome"
                    name="expected_outcome"
                    required
                    rows="3"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="What do you expect to achieve?"
                  ></textarea>
                </div>

                <!-- Success Criteria -->
                <div>
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
                    <span>Add Criteria</span>
                  </button>
                </div>

                <!-- Key Milestones -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Key Milestones
                  </label>
                  <div class="space-y-2 mb-3">
                    <div *ngFor="let milestone of formData.key_milestones; let i = index"
                         class="flex items-center space-x-2">
                      <input
                        [(ngModel)]="formData.key_milestones[i]"
                        [name]="'milestone-' + i"
                        class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="Enter milestone..."
                      />
                      <button
                        type="button"
                        (click)="removeMilestone(i)"
                        class="text-red-600 hover:text-red-700 p-2"
                        title="Remove milestone"
                      >
                        <i class="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    (click)="addMilestone()"
                    class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg flex items-center space-x-2"
                  >
                    <i class="fas fa-plus"></i>
                    <span>Add Milestone</span>
                  </button>
                </div>

                <!-- Dependencies -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Dependencies
                  </label>
                  <div class="space-y-2 mb-3">
                    <div *ngFor="let dependency of formData.dependencies; let i = index"
                         class="flex items-center space-x-2">
                      <input
                        [(ngModel)]="formData.dependencies[i]"
                        [name]="'dependency-' + i"
                        class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="Enter dependency..."
                      />
                      <button
                        type="button"
                        (click)="removeDependency(i)"
                        class="text-red-600 hover:text-red-700 p-2"
                        title="Remove dependency"
                      >
                        <i class="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    (click)="addDependency()"
                    class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg flex items-center space-x-2"
                  >
                    <i class="fas fa-plus"></i>
                    <span>Add Dependency</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Mentor Notes -->
            <div class="mt-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Mentor Notes
              </label>
              <textarea
                [(ngModel)]="formData.mentor_notes"
                name="mentor_notes"
                rows="3"
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
            (click)="saveGoal()"
            [disabled]="!formData.title || !formData.description || !formData.expected_outcome"
            class="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white rounded-lg"
          >
            {{ goalData ? 'Update' : 'Save' }} Strategic Goal
          </button>
        </div>
      </div>
    </div>
  `
})
export class StrategicGoalModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() goalData: INode<StrategicGoal> | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<StrategicGoal>();

  formData: StrategicGoal = initStrategicGoal();

  ngOnInit() {
    if (this.goalData) {
      this.formData = { ...this.goalData.data };
    } else {
      this.formData = initStrategicGoal();
    }
  }

  closeModal() {
    this.close.emit();
  }

  saveGoal() {
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

  addMilestone() {
    this.formData.key_milestones.push('');
  }

  removeMilestone(index: number) {
    this.formData.key_milestones.splice(index, 1);
  }

  addDependency() {
    this.formData.dependencies.push('');
  }

  removeDependency(index: number) {
    this.formData.dependencies.splice(index, 1);
  }
}
