import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { INode } from '../../../../../../models/schema';
import { Objective, KeyResult, OKRTask } from '../../../../../../models/business.models';

@Component({
  selector: 'app-okr-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-gradient-to-br from-blue-50 to-indigo-100 p-6 rounded-xl shadow-lg border border-blue-200 my-4">
      <!-- Header with Add Objective Button -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center space-x-3">
          <div class="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg shadow-md">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h3 class="text-2xl font-bold text-blue-900">OKR & Objectives</h3>
        </div>
        <button
          (click)="addObjective.emit()"
          class="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-4 py-2 rounded-lg font-medium shadow-md transition-all duration-200 flex items-center space-x-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          <span>Add Objective</span>
        </button>
      </div>

      <!-- Empty State -->
      <div *ngIf="objectives.length === 0" class="text-center py-12">
        <div class="p-4 bg-blue-100 rounded-full mx-auto w-20 h-20 flex items-center justify-center mb-4">
          <svg class="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <h4 class="text-lg font-semibold text-blue-700 mb-2">No Objectives Yet</h4>
        <p class="text-blue-600 mb-6">Create your first objective to start tracking your OKRs and goals.</p>
        <button
          (click)="addObjective.emit()"
          class="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-3 rounded-lg font-medium shadow-md transition-all duration-200">
          Create First Objective
        </button>
      </div>

      <!-- Objectives List -->
      <div *ngFor="let objective of objectives" class="mb-6 bg-white rounded-xl shadow-md border border-blue-200 overflow-hidden">
        <!-- Objective Header -->
        <div class="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 text-white">
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <h4 class="text-lg font-bold mb-1">{{ objective.data.title }}</h4>
              <p class="text-blue-100 text-sm mb-2">{{ objective.data.description }}</p>
              <div class="flex items-center space-x-4 text-xs">
                <span class="bg-blue-400 bg-opacity-30 px-2 py-1 rounded">
                  Category: {{ getCategoryLabel(objective.data.category) }}
                </span>
                <span class="bg-blue-400 bg-opacity-30 px-2 py-1 rounded">
                  Priority: {{ getPriorityLabel(objective.data.priority) }}
                </span>
                <span class="bg-blue-400 bg-opacity-30 px-2 py-1 rounded">
                  Status: {{ getStatusLabel(objective.data.current_status) }}
                </span>
              </div>
            </div>
            <div class="flex items-center space-x-2 ml-4">
              <button
                (click)="editObjective.emit(objective)"
                class="p-2 bg-blue-400 bg-opacity-30 hover:bg-opacity-50 rounded-lg transition-all">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </button>
              <button
                (click)="deleteObjective.emit(objective)"
                class="p-2 bg-red-400 bg-opacity-30 hover:bg-opacity-50 rounded-lg transition-all">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Key Results Section -->
        <div class="p-4 bg-gray-50">
          <div class="flex items-center justify-between mb-4">
            <h5 class="text-lg font-semibold text-gray-800 flex items-center">
              <svg class="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
              Key Results
            </h5>
            <button
              (click)="addKeyResult.emit(objective)"
              class="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded-lg text-sm font-medium shadow transition-colors flex items-center space-x-1">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
              </svg>
              <span>Add Key Result</span>
            </button>
          </div>

          <div *ngFor="let keyResult of getKeyResultsForObjective(objective)" class="mb-4 bg-white rounded-lg shadow-sm border border-gray-200">
            <!-- Key Result Header -->
            <div class="p-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200">
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <h6 class="font-semibold text-gray-800 mb-1">{{ keyResult.data.title }}</h6>
                  <p class="text-gray-600 text-sm mb-2">{{ keyResult.data.description }}</p>
                  <div class="flex items-center space-x-4">
                    <div class="flex items-center space-x-2">
                      <span class="text-xs text-gray-500">Progress:</span>
                      <div class="w-20 bg-gray-200 rounded-full h-2">
                        <div class="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full"
                             [style.width.%]="keyResult.data.progress_percentage"></div>
                      </div>
                      <span class="text-xs font-medium text-gray-700">
                        {{ keyResult.data.progress_percentage }}%
                      </span>
                    </div>
                    <button
                      (click)="updateProgress.emit(keyResult)"
                      class="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-2 py-1 rounded text-xs font-medium transition-colors">
                      Update Progress
                    </button>
                  </div>
                </div>
                <div class="flex items-center space-x-2 ml-4">
                  <button
                    (click)="editKeyResult.emit(keyResult)"
                    class="p-1 bg-indigo-100 hover:bg-indigo-200 rounded transition-colors">
                    <svg class="w-3 h-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                  </button>
                  <button
                    (click)="deleteKeyResult.emit(keyResult)"
                    class="p-1 bg-red-100 hover:bg-red-200 rounded transition-colors">
                    <svg class="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- Tasks Section -->
            <div class="p-3">
              <div class="flex items-center justify-between mb-3">
                <h6 class="text-sm font-semibold text-gray-700 flex items-center">
                  <svg class="w-4 h-4 mr-1 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v1a2 2 0 002 2h2m5-5V7a2 2 0 00-2 2H9m5-5a2 2 0 012 2v1a2 2 0 01-2 2H9m5-5H9"></path>
                  </svg>
                  Tasks
                </h6>
                <button
                  (click)="addTask.emit(keyResult)"
                  class="bg-purple-500 hover:bg-purple-600 text-white px-2 py-1 rounded text-xs font-medium shadow transition-colors flex items-center space-x-1">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                  </svg>
                  <span>Add Task</span>
                </button>
              </div>

              <div *ngFor="let task of getTasksForKeyResult(keyResult)" class="mb-3 p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <!-- Task Header -->
                <div class="flex items-start justify-between mb-3">
                  <div class="flex items-start space-x-3 flex-1">
                    <!-- Task Status Dropdown -->
                    <select
                      [value]="task.data.status"
                      (change)="updateTaskStatusFromDropdown(task, $event)"
                      class="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      [title]="getTaskStatusTooltip(task.data.status)">
                      <option value="not_started">Not Started</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="blocked">Blocked</option>
                      <option value="cancelled">Cancelled</option>
                    </select>

                    <!-- Task Status Icon -->
                    <div class="w-4 h-4 flex-shrink-0 mt-0.5">
                      <svg *ngIf="task.data.status === 'completed'" class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                      </svg>
                      <svg *ngIf="task.data.status === 'in_progress'" class="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                      </svg>
                      <svg *ngIf="task.data.status === 'blocked'" class="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
                      </svg>
                      <svg *ngIf="task.data.status === 'not_started'" class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clip-rule="evenodd"></path>
                      </svg>
                      <svg *ngIf="task.data.status === 'cancelled'" class="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12zm-4.293-7.293a1 1 0 011.414 0L10 10.586l2.879-2.879a1 1 0 111.414 1.414L11.414 12l2.879 2.879a1 1 0 01-1.414 1.414L10 13.414l-2.879 2.879a1 1 0 01-1.414-1.414L8.586 12 5.707 9.121a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                      </svg>
                    </div>

                    <!-- Task Title and Description -->
                    <div class="flex-1">
                      <div class="flex items-center space-x-2 mb-1">
                        <h6 class="font-semibold text-gray-800 text-sm">{{ task.data.title }}</h6>
                        <!-- Priority Badge -->
                        <span
                          class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                          [ngClass]="{
                            'bg-red-100 text-red-800': task.data.priority === 'critical',
                            'bg-orange-100 text-orange-800': task.data.priority === 'high',
                            'bg-yellow-100 text-yellow-800': task.data.priority === 'medium',
                            'bg-green-100 text-green-800': task.data.priority === 'low'
                          }">
                          <i class="fas fa-flag mr-1"></i>
                          {{ task.data.priority | titlecase }}
                        </span>
                      </div>
                      <p *ngIf="task.data.description" class="text-gray-600 text-xs mb-2">{{ task.data.description }}</p>
                    </div>
                  </div>

                  <!-- Action Buttons -->
                  <div class="flex items-center space-x-2 ml-4">
                    <button
                      (click)="editTask.emit(task)"
                      class="p-1 bg-purple-100 hover:bg-purple-200 rounded transition-colors"
                      title="Edit Task">
                      <svg class="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                      </svg>
                    </button>
                    <button
                      (click)="deleteTask.emit(task)"
                      class="p-1 bg-red-100 hover:bg-red-200 rounded transition-colors"
                      title="Delete Task">
                      <svg class="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                    </button>
                  </div>
                </div>

                <!-- Task Details Grid -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 pt-3 border-t border-gray-100">
                  <!-- Assigned To -->
                  <div *ngIf="task.data.assigned_to" class="flex items-center space-x-1">
                    <i class="fas fa-user text-blue-500 text-xs"></i>
                    <span class="text-xs text-gray-600 truncate" title="{{ task.data.assigned_to }}">{{ task.data.assigned_to }}</span>
                  </div>

                  <!-- Due Date -->
                  <div *ngIf="task.data.due_date" class="flex items-center space-x-1">
                    <i class="fas fa-calendar text-purple-500 text-xs"></i>
                    <span
                      class="text-xs"
                      [ngClass]="{
                        'text-red-600 font-medium': isTaskOverdue(task.data.due_date),
                        'text-orange-600 font-medium': isTaskDueSoon(task.data.due_date),
                        'text-gray-600': !isTaskOverdue(task.data.due_date) && !isTaskDueSoon(task.data.due_date)
                      }"
                      title="{{ task.data.due_date }}">
                      {{ formatDueDate(task.data.due_date) }}
                    </span>
                  </div>

                  <!-- Estimated Hours -->
                  <div *ngIf="task.data.estimated_hours" class="flex items-center space-x-1">
                    <i class="fas fa-clock text-green-500 text-xs"></i>
                    <span class="text-xs text-gray-600">{{ task.data.estimated_hours }}h est.</span>
                  </div>

                  <!-- Impact Weight -->
                  <div *ngIf="task.data.impact_weight" class="flex items-center space-x-1">
                    <i class="fas fa-weight-hanging text-indigo-500 text-xs"></i>
                    <span class="text-xs text-gray-600">Impact: {{ task.data.impact_weight }}/10</span>
                  </div>
                </div>

                <!-- Tags -->
                <div *ngIf="task.data.tags && task.data.tags.length > 0" class="flex flex-wrap gap-1 mt-2">
                  <span
                    *ngFor="let tag of task.data.tags"
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                    #{{ tag }}
                  </span>
                </div>
              </div>

              <div *ngIf="getTasksForKeyResult(keyResult).length === 0" class="text-center py-4 text-gray-500 text-sm">
                No tasks yet. Add your first task to get started.
              </div>
            </div>
          </div>

          <div *ngIf="getKeyResultsForObjective(objective).length === 0" class="text-center py-6 text-gray-500">
            No key results yet. Add your first key result to track progress.
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bg-gradient-to-br {
      background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%);
    }
    .bg-gradient-to-r {
      background: linear-gradient(90deg, #3b82f6 0%, #4f46e5 100%);
    }
  `]
})
export class OKRSectionComponent {
  @Input() objectives: INode<Objective>[] = [];
  @Input() keyResults: INode<KeyResult>[] = [];
  @Input() tasks: INode<OKRTask>[] = [];

  @Output() addObjective = new EventEmitter<void>();
  @Output() editObjective = new EventEmitter<INode<Objective>>();
  @Output() deleteObjective = new EventEmitter<INode<Objective>>();

  @Output() addKeyResult = new EventEmitter<INode<Objective>>();
  @Output() editKeyResult = new EventEmitter<INode<KeyResult>>();
  @Output() deleteKeyResult = new EventEmitter<INode<KeyResult>>();
  @Output() updateProgress = new EventEmitter<INode<KeyResult>>();

  @Output() addTask = new EventEmitter<INode<KeyResult>>();
  @Output() editTask = new EventEmitter<INode<OKRTask>>();
  @Output() deleteTask = new EventEmitter<INode<OKRTask>>();
  @Output() toggleTaskStatus = new EventEmitter<INode<OKRTask>>();
  @Output() taskStatusChange = new EventEmitter<{task: INode<OKRTask>, status: string}>();

  getKeyResultsForObjective(objective: INode<Objective>): INode<KeyResult>[] {
    return this.keyResults.filter(kr => kr.data.objective_id === String(objective.id));
  }

  getTasksForKeyResult(keyResult: INode<KeyResult>): INode<OKRTask>[] {
    return this.tasks.filter(task => task.data.key_result_id === String(keyResult.id));
  }

  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      'growth': 'Growth',
      'efficiency': 'Efficiency',
      'innovation': 'Innovation',
      'customer': 'Customer',
      'financial': 'Financial',
      'operational': 'Operational',
      'strategic': 'Strategic',
      'product': 'Product',
      'team': 'Team'
    };
    return labels[category] || category;
  }

  getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      'low': 'Low',
      'medium': 'Medium',
      'high': 'High',
      'critical': 'Critical'
    };
    return labels[priority] || priority;
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'not_started': 'Not Started',
      'in_progress': 'In Progress',
      'on_track': 'On Track',
      'at_risk': 'At Risk',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    };
    return labels[status] || status;
  }

  getTaskStatusTooltip(status: string): string {
    const tooltips: Record<string, string> = {
      'not_started': 'Task not yet started',
      'in_progress': 'Task is currently being worked on',
      'completed': 'Task has been completed',
      'blocked': 'Task is blocked by external factors',
      'cancelled': 'Task has been cancelled'
    };
    return tooltips[status] || 'Task status';
  }

  updateTaskStatusFromDropdown(task: INode<OKRTask>, event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const newStatus = selectElement.value as 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';

    // Update the task status
    task.data.status = newStatus;

    // Emit the status change event
    this.taskStatusChange.emit({task, status: newStatus});
  }

  // Helper methods for task display
  isTaskOverdue(dueDate: string): boolean {
    const today = new Date();
    const due = new Date(dueDate);
    return due < today;
  }

  isTaskDueSoon(dueDate: string): boolean {
    const today = new Date();
    const due = new Date(dueDate);
    const daysDiff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 3600 * 24));
    return daysDiff <= 3 && daysDiff >= 0; // Due within 3 days
  }

  formatDueDate(dueDate: string): string {
    const due = new Date(dueDate);
    const today = new Date();
    const daysDiff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 3600 * 24));

    if (daysDiff < 0) {
      return `${Math.abs(daysDiff)} days overdue`;
    } else if (daysDiff === 0) {
      return 'Due today';
    } else if (daysDiff === 1) {
      return 'Due tomorrow';
    } else if (daysDiff <= 7) {
      return `Due in ${daysDiff} days`;
    } else {
      return due.toLocaleDateString();
    }
  }
}
