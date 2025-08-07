import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { INode } from '../../../../../../models/schema';
import { OKRTask } from '../../../../../../models/business.models';

@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow bg-white"
         [ngClass]="getTaskBackgroundClass(task.data.background_color)">
      <!-- Task Header -->
      <div class="flex items-start justify-between mb-3">
        <div class="flex items-start space-x-3 flex-1">
          <!-- Task Status Dropdown -->
          <select
            [value]="task.data.status"
            (change)="onStatusChange($event)"
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
  `
})
export class TaskCardComponent {
  @Input() task!: INode<OKRTask>;
  @Output() editTask = new EventEmitter<INode<OKRTask>>();
  @Output() deleteTask = new EventEmitter<INode<OKRTask>>();
  @Output() updateTaskStatus = new EventEmitter<{task: INode<OKRTask>, status: string}>();

  onStatusChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.updateTaskStatus.emit({
      task: this.task,
      status: target.value
    });
  }

  getTaskStatusTooltip(status: string): string {
    const tooltips: Record<string, string> = {
      'not_started': 'Task has not been started yet',
      'in_progress': 'Task is currently being worked on',
      'completed': 'Task has been completed',
      'blocked': 'Task is blocked by dependencies',
      'cancelled': 'Task has been cancelled'
    };
    return tooltips[status] || '';
  }

  getTaskBackgroundClass(backgroundColor?: string): string {
    switch (backgroundColor) {
      case 'light-orange': return 'bg-orange-50 border-orange-200';
      case 'light-red': return 'bg-red-50 border-red-200';
      case 'light-green': return 'bg-green-50 border-green-200';
      case 'light-yellow': return 'bg-yellow-50 border-yellow-200';
      case 'light-purple': return 'bg-purple-50 border-purple-200';
      case 'light-blue': return 'bg-blue-50 border-blue-200';
      case 'light-pink': return 'bg-pink-50 border-pink-200';
      default: return 'bg-white border-gray-200';
    }
  }

  isTaskOverdue(dueDate: string): boolean {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  }

  isTaskDueSoon(dueDate: string): boolean {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const today = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);
    return due >= today && due <= threeDaysFromNow;
  }

  formatDueDate(dueDate: string): string {
    if (!dueDate) return '';
    const date = new Date(dueDate);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
    if (diffDays <= 7) return `${diffDays} days`;

    return date.toLocaleDateString();
  }
}
