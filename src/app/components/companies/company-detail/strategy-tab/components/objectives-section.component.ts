import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { INode } from '../../../../../../models/schema';
import { Objective, ObjectiveTask } from '../../../../../../models/business.models';

@Component({
  selector: 'app-objectives-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-lg shadow-sm border mb-6">
      <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 flex items-center">
            <i class="fas fa-target mr-2 text-purple-600"></i>
            Objectives & Tasks
          </h3>
          <p class="text-sm text-gray-600">Set objectives and break them down into actionable tasks</p>
        </div>
        <button
          (click)="addObjective.emit()"
          class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <i class="fas fa-plus"></i>
          <span>Add Objective</span>
        </button>
      </div>

      <div class="p-6">
        <div *ngIf="objectives.length === 0" class="text-center text-gray-500 py-8">
          <i class="fas fa-target text-4xl mb-4"></i>
          <h4 class="text-lg font-medium mb-2">No Objectives Yet</h4>
          <p class="mb-4">Create your first objective and add tasks to achieve it.</p>
          <button
            (click)="addObjective.emit()"
            class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
          >
            Create First Objective
          </button>
        </div>

        <div *ngIf="objectives.length > 0" class="space-y-6">
          <div *ngFor="let objective of objectives" class="border border-gray-200 rounded-lg overflow-hidden">
            <!-- Objective Header -->
            <div class="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div class="flex justify-between items-start">
                <div class="flex-1">
                  <div class="flex items-center space-x-3 mb-2">
                    <h4 class="text-lg font-semibold text-gray-900">{{ objective.data.title }}</h4>
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          [ngClass]="getPriorityClass(objective.data.priority)">
                      {{ objective.data.priority | titlecase }}
                    </span>
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          [ngClass]="getStatusClass(objective.data.current_status)">
                      {{ getStatusDisplay(objective.data.current_status) }}
                    </span>
                  </div>
                  <p class="text-sm text-gray-600 mb-3">{{ objective.data.description }}</p>

                  <!-- Progress Bar -->
                  <div class="flex items-center space-x-3">
                    <div class="flex-1">
                      <div class="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Progress</span>
                        <span>{{ getObjectiveProgress(objective) }}%</span>
                      </div>
                      <div class="w-full bg-gray-200 rounded-full h-2">
                        <div
                          class="bg-purple-600 h-2 rounded-full transition-all duration-300"
                          [style.width.%]="getObjectiveProgress(objective)"
                        ></div>
                      </div>
                    </div>
                    <div class="text-xs text-gray-500">
                      {{ getCompletedTasksCount(objective.id!) }} /
                      {{ getObjectiveTasks(objective.id!).length }} tasks
                    </div>
                  </div>
                </div>

                <div class="flex items-center space-x-2 ml-4">
                  <button
                    (click)="addTask.emit(objective)"
                    class="text-green-600 hover:text-green-700 p-2 rounded-lg hover:bg-green-50"
                    title="Add Task"
                  >
                    <i class="fas fa-plus"></i>
                  </button>
                  <button
                    (click)="editObjective.emit(objective)"
                    class="text-blue-600 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50"
                    title="Edit Objective"
                  >
                    <i class="fas fa-edit"></i>
                  </button>
                  <button
                    (click)="deleteObjective.emit(objective)"
                    class="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50"
                    title="Delete Objective"
                  >
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>

            <!-- Tasks List -->
            <div class="px-6 py-4">
              <div class="space-y-3">
                <div *ngFor="let task of getObjectiveTasks(objective.id!)"
                     class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div class="flex items-center space-x-3 flex-1">
                    <!-- Task Status Icon -->
                    <div class="flex-shrink-0">
                      <i class="fas"
                         [ngClass]="{
                           'fa-circle text-gray-400': task.data.status === 'not_started',
                           'fa-play-circle text-blue-500': task.data.status === 'in_progress',
                           'fa-check-circle text-green-500': task.data.status === 'completed',
                           'fa-times-circle text-red-500': task.data.status === 'cancelled'
                         }"></i>
                    </div>

                    <!-- Task Content -->
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center space-x-2 mb-1">
                        <h5 class="text-sm font-medium text-gray-900 truncate">{{ task.data.title }}</h5>
                        <span *ngIf="task.data.priority === 'high'"
                              class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          High
                        </span>
                      </div>
                      <div class="flex items-center space-x-4 text-xs text-gray-500">
                        <span *ngIf="task.data.assigned_to">
                          <i class="fas fa-user mr-1"></i>{{ task.data.assigned_to }}
                        </span>
                        <span>
                          <i class="fas fa-calendar mr-1"></i>{{ task.data.due_date | date:'MMM d' }}
                        </span>
                        <span *ngIf="task.data.progress_percentage > 0">
                          {{ task.data.progress_percentage }}% complete
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Task Actions -->
                  <div class="flex items-center space-x-2 ml-4">
                    <!-- Quick Status Toggle -->
                    <button
                      *ngIf="task.data.status === 'not_started'"
                      (click)="updateTaskStatus.emit({task: task, status: 'in_progress'})"
                      class="text-blue-600 hover:text-blue-700 p-1"
                      title="Start Task"
                    >
                      <i class="fas fa-play text-xs"></i>
                    </button>
                    <button
                      *ngIf="task.data.status === 'in_progress'"
                      (click)="updateTaskStatus.emit({task: task, status: 'completed'})"
                      class="text-green-600 hover:text-green-700 p-1"
                      title="Complete Task"
                    >
                      <i class="fas fa-check text-xs"></i>
                    </button>

                    <button
                      (click)="editTask.emit(task)"
                      class="text-gray-600 hover:text-gray-700 p-1"
                      title="Edit Task"
                    >
                      <i class="fas fa-edit text-xs"></i>
                    </button>
                    <button
                      (click)="deleteTask.emit(task)"
                      class="text-red-600 hover:text-red-700 p-1"
                      title="Delete Task"
                    >
                      <i class="fas fa-trash text-xs"></i>
                    </button>
                  </div>
                </div>

                <!-- Add Task Button (when tasks exist) -->
                <button
                  *ngIf="getObjectiveTasks(objective.id!).length > 0"
                  (click)="addTask.emit(objective)"
                  class="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-purple-300 hover:text-purple-600 transition-colors flex items-center justify-center space-x-2"
                >
                  <i class="fas fa-plus text-sm"></i>
                  <span class="text-sm">Add another task</span>
                </button>

                <!-- No Tasks Message -->
                <div *ngIf="getObjectiveTasks(objective.id!).length === 0"
                     class="text-center py-4 text-gray-500">
                  <p class="text-sm mb-2">No tasks yet for this objective</p>
                  <button
                    (click)="addTask.emit(objective)"
                    class="text-purple-600 hover:text-purple-700 text-sm font-medium"
                  >
                    <i class="fas fa-plus mr-1"></i>Add first task
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ObjectivesSectionComponent {
  @Input() objectives: INode<Objective>[] = [];
  @Input() objectiveTasks: INode<ObjectiveTask>[] = [];

  @Output() addObjective = new EventEmitter<void>();
  @Output() editObjective = new EventEmitter<INode<Objective>>();
  @Output() deleteObjective = new EventEmitter<INode<Objective>>();

  @Output() addTask = new EventEmitter<INode<Objective>>();
  @Output() editTask = new EventEmitter<INode<ObjectiveTask>>();
  @Output() deleteTask = new EventEmitter<INode<ObjectiveTask>>();
  @Output() updateTaskStatus = new EventEmitter<{task: INode<ObjectiveTask>, status: string}>();

  getObjectiveTasks(objectiveId: number): INode<ObjectiveTask>[] {
    return this.objectiveTasks.filter(task => task.data.objective_id === objectiveId.toString());
  }

  getCompletedTasksCount(objectiveId: number): number {
    return this.getObjectiveTasks(objectiveId).filter(task => task.data.status === 'completed').length;
  }

  getObjectiveProgress(objective: INode<Objective>): number {
    const tasks = this.getObjectiveTasks(objective.id!);
    if (tasks.length === 0) return 0;

    const totalProgress = tasks.reduce((sum, task) => sum + task.data.progress_percentage, 0);
    return Math.round(totalProgress / tasks.length);
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'not_started': return 'bg-gray-100 text-gray-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'on_track': return 'bg-green-100 text-green-800';
      case 'at_risk': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusDisplay(status: string): string {
    return status.replace('_', ' ').split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
}
