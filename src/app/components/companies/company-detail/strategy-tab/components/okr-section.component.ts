import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { INode } from '../../../../../../models/schema';
import { Objective, KeyResult, OKRTask } from '../../../../../../models/business.models';

@Component({
  selector: 'app-okr-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-lg shadow-sm border">
      <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 flex items-center">
            <i class="fas fa-bullseye mr-2 text-purple-600"></i>
            OKRs - Objectives & Key Results
          </h3>
          <p class="text-sm text-gray-600">Set ambitious objectives and track measurable key results with actionable tasks</p>
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
          <i class="fas fa-bullseye text-4xl mb-4"></i>
          <h4 class="text-lg font-medium mb-2">No OKRs Yet</h4>
          <p class="mb-4">Create your first objective and add measurable key results to track progress.</p>
          <button
            (click)="addObjective.emit()"
            class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
          >
            Create First Objective
          </button>
        </div>

        <div *ngIf="objectives.length > 0" class="space-y-8">
          <div *ngFor="let objective of objectives" class="border border-gray-200 rounded-lg overflow-hidden">

            <!-- 🎯 OBJECTIVE HEADER -->
            <div class="bg-gradient-to-r from-purple-50 to-blue-50 px-6 py-4 border-b border-gray-200">
              <div class="flex justify-between items-start">
                <div class="flex-1">
                  <div class="flex items-center space-x-3 mb-2">
                    <h4 class="text-xl font-bold text-gray-900">🎯 {{ objective.data.title }}</h4>
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          [ngClass]="{
                            'bg-green-100 text-green-800': objective.data.current_status === 'completed',
                            'bg-blue-100 text-blue-800': objective.data.current_status === 'on_track',
                            'bg-yellow-100 text-yellow-800': objective.data.current_status === 'in_progress',
                            'bg-red-100 text-red-800': objective.data.current_status === 'at_risk',
                            'bg-gray-100 text-gray-800': objective.data.current_status === 'not_started'
                          }">
                      {{ getStatusLabel(objective.data.current_status) }}
                    </span>
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {{ objective.data.quarter }} {{ objective.data.year }}
                    </span>
                  </div>
                  <p class="text-gray-600 mb-3">{{ objective.data.description }}</p>
                  <div class="flex items-center space-x-4 text-sm text-gray-500">
                    <span><i class="fas fa-user mr-1"></i>{{ objective.data.responsible_person || 'Unassigned' }}</span>
                    <span><i class="fas fa-tag mr-1"></i>{{ getCategoryLabel(objective.data.category) }}</span>
                    <span><i class="fas fa-flag mr-1"></i>{{ getPriorityLabel(objective.data.priority) }}</span>
                  </div>
                </div>
                <div class="flex items-center space-x-2">
                  <button
                    (click)="editObjective.emit(objective)"
                    class="bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 px-3 py-1 rounded-md text-sm flex items-center space-x-1"
                    title="Edit objective"
                  >
                    <i class="fas fa-edit"></i>
                    <span>Edit</span>
                  </button>
                  <button
                    (click)="deleteObjective.emit(objective)"
                    class="text-gray-400 hover:text-red-600 p-2"
                    title="Delete objective"
                  >
                    <i class="fas fa-trash-alt"></i>
                  </button>
                </div>
              </div>

              <!-- Overall Objective Progress -->
              <div class="mt-4">
                <div class="flex justify-between items-center mb-2">
                  <span class="text-sm font-medium text-gray-700">Overall Progress</span>
                  <span class="text-sm text-gray-500">{{ getObjectiveProgress(objective) }}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div class="bg-purple-600 h-2 rounded-full transition-all duration-300"
                       [style.width.%]="getObjectiveProgress(objective)"></div>
                </div>
              </div>
            </div>

            <!-- 📊 KEY RESULTS SECTION -->
            <div class="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div class="flex justify-between items-center mb-4">
                <h5 class="text-lg font-semibold text-gray-800 flex items-center">
                  <i class="fas fa-chart-line mr-2 text-blue-600"></i>
                  Key Results
                </h5>
                <button
                  (click)="addKeyResult.emit(objective)"
                  class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center space-x-1"
                >
                  <i class="fas fa-plus"></i>
                  <span>Add Key Result</span>
                </button>
              </div>

              <div *ngIf="getKeyResultsForObjective(objective).length === 0" class="text-center text-gray-400 py-4">
                <i class="fas fa-chart-line text-2xl mb-2"></i>
                <p>No key results yet. Add measurable outcomes to track this objective.</p>
              </div>

              <div *ngIf="getKeyResultsForObjective(objective).length > 0" class="space-y-4">
                <div *ngFor="let keyResult of getKeyResultsForObjective(objective)"
                     class="bg-white rounded-lg border border-gray-200 p-4">

                  <!-- Key Result Header -->
                  <div class="flex justify-between items-start mb-3">
                    <div class="flex-1">
                      <h6 class="font-semibold text-gray-900 mb-1">📊 {{ keyResult.data.title }}</h6>
                      <p class="text-sm text-gray-600 mb-2">{{ keyResult.data.description }}</p>

                      <!-- Metric Display -->
                      <div class="flex items-center space-x-4 text-sm">
                        <span class="bg-gray-100 px-2 py-1 rounded">
                          <strong>{{ keyResult.data.current_value }}</strong> / {{ keyResult.data.target_value }} {{ keyResult.data.unit }}
                        </span>
                        <span class="text-gray-500">
                          Baseline: {{ keyResult.data.baseline_value }} {{ keyResult.data.unit }}
                        </span>
                        <span class="inline-flex items-center px-2 py-1 rounded text-xs"
                              [ngClass]="{
                                'bg-green-100 text-green-800': keyResult.data.status === 'completed',
                                'bg-blue-100 text-blue-800': keyResult.data.status === 'on_track',
                                'bg-yellow-100 text-yellow-800': keyResult.data.status === 'in_progress',
                                'bg-red-100 text-red-800': keyResult.data.status === 'at_risk',
                                'bg-gray-100 text-gray-800': keyResult.data.status === 'not_started'
                              }">
                          {{ getStatusLabel(keyResult.data.status) }}
                        </span>
                      </div>
                    </div>
                    <div class="flex items-center space-x-2">
                      <button
                        (click)="editKeyResult.emit(keyResult)"
                        class="text-gray-400 hover:text-gray-600 p-1"
                        title="Edit key result"
                      >
                        <i class="fas fa-edit"></i>
                      </button>
                      <button
                        (click)="deleteKeyResult.emit(keyResult)"
                        class="text-gray-400 hover:text-red-600 p-1"
                        title="Delete key result"
                      >
                        <i class="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  </div>

                  <!-- Key Result Progress Bar -->
                  <div class="mb-4">
                    <div class="flex justify-between items-center mb-1">
                      <span class="text-xs text-gray-600">Progress</span>
                      <span class="text-xs text-gray-600">{{ keyResult.data.progress_percentage }}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-1.5">
                      <div class="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                           [style.width.%]="keyResult.data.progress_percentage"></div>
                    </div>
                  </div>

                  <!-- 📋 TASKS SECTION -->
                  <div class="border-t border-gray-100 pt-4">
                    <div class="flex justify-between items-center mb-3">
                      <h6 class="font-medium text-gray-800 flex items-center">
                        <i class="fas fa-tasks mr-2 text-green-600"></i>
                        Action Tasks
                        <span class="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                          {{ getCompletedTasksCount(keyResult) }}/{{ getTasksForKeyResult(keyResult).length }}
                        </span>
                      </h6>
                      <button
                        (click)="addTask.emit(keyResult)"
                        class="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs flex items-center space-x-1"
                      >
                        <i class="fas fa-plus"></i>
                        <span>Add Task</span>
                      </button>
                    </div>

                    <div *ngIf="getTasksForKeyResult(keyResult).length === 0" class="text-center text-gray-400 py-2 text-sm">
                      <i class="fas fa-tasks mb-1"></i>
                      <p>No tasks yet. Break this key result into actionable steps.</p>
                    </div>

                    <div *ngIf="getTasksForKeyResult(keyResult).length > 0" class="space-y-2">
                      <div *ngFor="let task of getTasksForKeyResult(keyResult)"
                           class="flex items-center justify-between p-3 bg-gray-50 rounded border">
                        <div class="flex items-center space-x-3 flex-1">
                          <button
                            (click)="toggleTaskStatus.emit(task)"
                            class="flex-shrink-0"
                          >
                            <i class="fas fa-circle-check text-lg transition-colors duration-200"
                               [ngClass]="{
                                 'text-green-600': task.data.status === 'completed',
                                 'text-gray-300 hover:text-green-400': task.data.status !== 'completed'
                               }"></i>
                          </button>
                          <div class="flex-1">
                            <h6 class="font-medium text-gray-900"
                                [ngClass]="{'line-through text-gray-500': task.data.status === 'completed'}">
                              {{ task.data.title }}
                            </h6>
                            <div class="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                              <span *ngIf="task.data.assigned_to">
                                <i class="fas fa-user mr-1"></i>{{ task.data.assigned_to }}
                              </span>
                              <span>
                                <i class="fas fa-calendar mr-1"></i>{{ task.data.due_date | date:'MMM d' }}
                              </span>
                              <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs"
                                    [ngClass]="{
                                      'bg-red-100 text-red-800': task.data.priority === 'critical',
                                      'bg-orange-100 text-orange-800': task.data.priority === 'high',
                                      'bg-yellow-100 text-yellow-800': task.data.priority === 'medium',
                                      'bg-gray-100 text-gray-800': task.data.priority === 'low'
                                    }">
                                {{ getPriorityLabel(task.data.priority) }}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div class="flex items-center space-x-1">
                          <button
                            (click)="editTask.emit(task)"
                            class="text-gray-400 hover:text-gray-600 p-1"
                            title="Edit task"
                          >
                            <i class="fas fa-edit text-sm"></i>
                          </button>
                          <button
                            (click)="deleteTask.emit(task)"
                            class="text-gray-400 hover:text-red-600 p-1"
                            title="Delete task"
                          >
                            <i class="fas fa-trash-alt text-sm"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
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

  @Output() addTask = new EventEmitter<INode<KeyResult>>();
  @Output() editTask = new EventEmitter<INode<OKRTask>>();
  @Output() deleteTask = new EventEmitter<INode<OKRTask>>();
  @Output() toggleTaskStatus = new EventEmitter<INode<OKRTask>>();

  getKeyResultsForObjective(objective: INode<Objective>): INode<KeyResult>[] {
    return this.keyResults.filter(kr => kr.data.objective_id === String(objective.id));
  }

  getTasksForKeyResult(keyResult: INode<KeyResult>): INode<OKRTask>[] {
    return this.tasks.filter(task => task.data.key_result_id === String(keyResult.id));
  }

  getCompletedTasksCount(keyResult: INode<KeyResult>): number {
    const tasks = this.getTasksForKeyResult(keyResult);
    return tasks.filter(task => task.data.status === 'completed').length;
  }

  getObjectiveProgress(objective: INode<Objective>): number {
    const keyResults = this.getKeyResultsForObjective(objective);
    if (keyResults.length === 0) return 0;

    const totalProgress = keyResults.reduce((sum, kr) => sum + kr.data.progress_percentage, 0);
    return Math.round(totalProgress / keyResults.length);
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

  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      'growth': 'Growth',
      'financial': 'Financial',
      'operational': 'Operational',
      'market': 'Market',
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
}
