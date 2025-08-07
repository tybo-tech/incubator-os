import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
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

            <!-- Quarter and Year -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Quarter <span class="text-red-500">*</span>
                </label>
                <select
                  [(ngModel)]="formData.quarter"
                  name="quarter"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="Q1">Q1</option>
                  <option value="Q2">Q2</option>
                  <option value="Q3">Q3</option>
                  <option value="Q4">Q4</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Year <span class="text-red-500">*</span>
                </label>
                <input
                  [(ngModel)]="formData.year"
                  name="year"
                  type="number"
                  required
                  min="2024"
                  max="2030"
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
            [disabled]="!formData.title || !formData.description"
            class="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white rounded-lg"
          >
            {{ objectiveData ? 'Update' : 'Create' }} Objective
          </button>
        </div>
      </div>
    </div>
  `
})
export class ObjectiveModalComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() objectiveData: INode<Objective> | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<Objective>();

  formData: Objective = initObjective();

  ngOnInit() {
    this.updateFormData();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['objectiveData'] || changes['isOpen']) {
      this.updateFormData();
    }
  }

  updateFormData() {
    console.log('updateFormData called with objectiveData:', this.objectiveData);
    if (this.objectiveData) {
      this.formData = { ...this.objectiveData.data };
      console.log('Form data populated with:', this.formData);
    } else {
      this.formData = initObjective();
      console.log('Form data initialized with new objective:', this.formData);
    }
  }

  closeModal() {
    this.close.emit();
  }

  saveObjective() {
    if (!this.formData.title || !this.formData.description) {
      return;
    }

    this.save.emit(this.formData);
  }
}
