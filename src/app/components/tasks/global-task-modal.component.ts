import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task, initTask } from '../../../models/business.models';
import { INode } from '../../../models/schema';
import { NodeService } from '../../../services';

@Component({
  selector: 'app-global-task-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="isVisible" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <!-- Modal Header -->
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-medium text-gray-900 flex items-center">
              <i class="fas fa-tasks mr-2 text-blue-600"></i>
              {{ editMode ? 'Edit Task' : 'Create New Task' }}
            </h3>
            <button (click)="closeModal()"
                    class="text-gray-400 hover:text-gray-600">
              <i class="fas fa-times text-xl"></i>
            </button>
          </div>

          <!-- Task Form -->
          <form (ngSubmit)="saveTask()" #taskForm="ngForm">
            <!-- Title -->
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Task Title *
              </label>
              <input
                type="text"
                [(ngModel)]="taskData.title"
                name="title"
                required
                placeholder="Enter task title..."
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>

            <!-- Description -->
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                [(ngModel)]="taskData.description"
                name="description"
                rows="3"
                placeholder="Task description (optional)..."
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
            </div>

            <!-- Due Date & Priority Row -->
            <div class="grid grid-cols-2 gap-4 mb-4">
              <!-- Due Date -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Due Date *
                </label>
                <input
                  type="date"
                  [(ngModel)]="taskData.due_date"
                  name="due_date"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              </div>

              <!-- Priority -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  [(ngModel)]="taskData.priority"
                  name="priority"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="low">🔵 Low</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="high">🔴 High</option>
                </select>
              </div>
            </div>

            <!-- Assigned To & Status Row -->
            <div class="grid grid-cols-2 gap-4 mb-4">
              <!-- Assigned To -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Assigned To
                </label>
                <input
                  type="text"
                  [(ngModel)]="taskData.assigned_to"
                  name="assigned_to"
                  placeholder="Name or email..."
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              </div>

              <!-- Status -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  [(ngModel)]="taskData.status"
                  name="status"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="todo">📋 To Do</option>
                  <option value="in_progress">⚙️ In Progress</option>
                  <option value="done">✅ Done</option>
                </select>
              </div>
            </div>

            <!-- Company Assignment -->
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Link to Company
                <span *ngIf="defaultCompanyId" class="text-xs text-blue-600">(Auto-assigned)</span>
              </label>
              <select
                [(ngModel)]="taskData.company_id"
                name="company_id"
                [disabled]="availableCompanies.length <= 1"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100">
                <option [value]="undefined" *ngIf="!defaultCompanyId">No company link</option>
                <option *ngFor="let company of availableCompanies" [value]="company.id">
                  {{ company.data.name }}
                </option>
              </select>
              <p *ngIf="availableCompanies.length <= 1 && defaultCompanyId" class="text-xs text-gray-500 mt-1">
                This task will be automatically linked to {{ availableCompanies[0].data.name }}
              </p>
            </div>

            <!-- Action Buttons -->
            <div class="flex justify-end space-x-3">
              <button
                type="button"
                (click)="closeModal()"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                [disabled]="!taskForm.valid || isSaving"
                class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md transition-colors">
                <span *ngIf="isSaving" class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                {{ isSaving ? 'Saving...' : (editMode ? 'Update Task' : 'Create Task') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .animate-spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class GlobalTaskModalComponent implements OnInit {
  @Input() isVisible = false;
  @Input() editMode = false;
  @Input() taskToEdit: INode<Task> | null = null;
  @Input() availableCompanies: INode<any>[] = []; // Available companies for linking
  @Input() defaultCompanyId: number | null = null; // For pre-selecting company
  @Output() close = new EventEmitter<void>();
  @Output() taskSaved = new EventEmitter<INode<Task>>();

  taskData: Task = initTask();
  isSaving = false;

  constructor(private nodeService: NodeService<Task>) {}

  ngOnInit() {
    this.resetForm();
  }

  ngOnChanges() {
    if (this.isVisible) {
      this.resetForm();
    }
  }

  resetForm() {
    if (this.editMode && this.taskToEdit) {
      // Edit mode - populate with existing data
      this.taskData = { ...this.taskToEdit.data };
    } else {
      // Create mode - fresh form
      this.taskData = initTask();

      // If we have a default company ID, pre-populate it
      if (this.defaultCompanyId) {
        this.taskData.company_id = this.defaultCompanyId;
      }
      // If we only have one company available, auto-select it
      else if (this.availableCompanies.length === 1) {
        this.taskData.company_id = this.availableCompanies[0].id!;
      }
    }
  }

  async saveTask() {
    if (!this.taskData.title.trim()) {
      return;
    }

    this.isSaving = true;

    try {
      let savedTask: INode<Task>;

      if (this.editMode && this.taskToEdit) {
        // Update existing task
        const updatedTask: INode<Task> = {
          ...this.taskToEdit,
          data: {
            ...this.taskData,
            // Preserve created_date, update other fields
            created_date: this.taskToEdit.data.created_date
          }
        };

        savedTask = await this.nodeService.updateNode(updatedTask).toPromise() || updatedTask;
      } else {
        // Create new task
        const newTaskData: Task = {
          ...this.taskData,
          created_date: new Date().toISOString().split('T')[0]
        };

        // Ensure company_id is set - use taskData.company_id or defaultCompanyId
        const companyId = this.taskData.company_id || this.defaultCompanyId;

        const newTask: INode<Task> = {
          id: undefined,
          type: 'task',
          data: newTaskData,
          company_id: companyId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        savedTask = await this.nodeService.addNode(newTask).toPromise() || newTask;
      }

      this.taskSaved.emit(savedTask);
      this.closeModal();

    } catch (error) {
      console.error('❌ Error saving task:', error);
      alert('Failed to save task. Please try again.');
    } finally {
      this.isSaving = false;
    }
  }

  closeModal() {
    this.close.emit();
    this.resetForm();
  }

  public resetSavingState() {
    this.isSaving = false;
  }
}
