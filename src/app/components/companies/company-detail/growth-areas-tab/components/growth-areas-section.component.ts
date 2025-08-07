import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { INode } from '../../../../../../models/schema';
import { GrowthArea, OKRTask } from '../../../../../../models/business.models';

@Component({
  selector: 'app-growth-areas-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-gradient-to-br from-green-50 to-blue-100 p-6 rounded-xl shadow-lg border border-green-200 my-4">
      <!-- Header with Add Growth Area Button -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center space-x-3">
          <div class="p-2 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg shadow-md">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
          </div>
          <h3 class="text-2xl font-bold text-green-900">Growth Areas & SWOT Analysis</h3>
        </div>
        <button
          (click)="addGrowthArea.emit()"
          class="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-md transition-all duration-200 flex items-center space-x-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          <span>Add Growth Area</span>
        </button>
      </div>

      <!-- Empty State -->
      <div *ngIf="growthAreas.length === 0" class="text-center py-12">
        <div class="p-4 bg-green-100 rounded-full mx-auto w-20 h-20 flex items-center justify-center mb-4">
          <svg class="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
          </svg>
        </div>
        <h4 class="text-lg font-semibold text-green-700 mb-2">No Growth Areas Yet</h4>
        <p class="text-green-600 mb-6">Start your SWOT analysis by identifying strengths, weaknesses, opportunities, and threats.</p>
        <button
          (click)="addGrowthArea.emit()"
          class="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white px-6 py-3 rounded-lg font-medium shadow-md transition-all duration-200">
          Create First Growth Area
        </button>
      </div>

      <!-- Growth Areas List -->
      <div *ngFor="let area of growthAreas" class="mb-6 bg-white rounded-xl shadow-md border border-green-200 overflow-hidden">
        <!-- Growth Area Header -->
        <div class="p-4 text-white"
             [ngClass]="{
               'bg-gradient-to-r from-green-500 to-emerald-600': area.data.type === 'strength',
               'bg-gradient-to-r from-red-500 to-rose-600': area.data.type === 'weakness',
               'bg-gradient-to-r from-blue-500 to-indigo-600': area.data.type === 'opportunity',
               'bg-gradient-to-r from-orange-500 to-amber-600': area.data.type === 'threat'
             }">
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <div class="flex items-center space-x-3 mb-2">
                <!-- Type Icon -->
                <div class="p-2 bg-white bg-opacity-20 rounded-lg">
                  <i class="text-lg"
                     [ngClass]="{
                       'fas fa-thumbs-up': area.data.type === 'strength',
                       'fas fa-exclamation-triangle': area.data.type === 'weakness',
                       'fas fa-lightbulb': area.data.type === 'opportunity',
                       'fas fa-shield-alt': area.data.type === 'threat'
                     }"></i>
                </div>
                <div>
                  <h4 class="text-lg font-bold">{{ area.data.area }}</h4>
                  <span class="text-sm opacity-90 font-medium">{{ area.data.type | titlecase }}</span>
                </div>
              </div>

              <p class="text-sm opacity-90 mb-3">{{ area.data.description }}</p>

              <div class="flex items-center space-x-4 text-xs">
                <!-- Impact Area -->
                <span class="bg-white bg-opacity-20 px-2 py-1 rounded">
                  Impact: {{ area.data.impact_area }}
                </span>

                <!-- Rating -->
                <span class="bg-white bg-opacity-20 px-2 py-1 rounded flex items-center space-x-1">
                  <span>Rating:</span>
                  <div class="flex">
                    <i *ngFor="let star of getStarArray(area.data.rating)"
                       class="fas fa-star text-yellow-300 text-xs"></i>
                    <i *ngFor="let star of getStarArray(5 - area.data.rating)"
                       class="fas fa-star text-white text-opacity-30 text-xs"></i>
                  </div>
                  <span>{{ area.data.rating }}/5</span>
                </span>

                <!-- Task Count -->
                <span class="bg-white bg-opacity-20 px-2 py-1 rounded">
                  Tasks: {{ getTasksForGrowthArea(area).length }}
                </span>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center space-x-2 ml-4">
              <button
                (click)="addTask.emit(area)"
                class="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-all"
                title="Add Task">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
              </button>
              <button
                (click)="editGrowthArea.emit(area)"
                class="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-all"
                title="Edit Growth Area">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </button>
              <button
                (click)="deleteGrowthArea.emit(area)"
                class="p-2 bg-red-400 bg-opacity-30 hover:bg-opacity-50 rounded-lg transition-all"
                title="Delete Growth Area">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>
          </div>

          <!-- Mentor Notes (if present) -->
          <div *ngIf="area.data.mentor_notes" class="mt-3 pt-3 border-t border-white border-opacity-20">
            <div class="flex items-start space-x-2">
              <i class="fas fa-comment-alt text-white text-opacity-90 text-sm mt-0.5 flex-shrink-0"></i>
              <p class="text-sm text-white text-opacity-90 italic">{{ area.data.mentor_notes }}</p>
            </div>
          </div>
        </div>

        <!-- Tasks Section -->
        <div class="p-4 bg-gray-50">
          <div class="flex items-center justify-between mb-4">
            <h5 class="text-lg font-semibold text-gray-800 flex items-center">
              <svg class="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v1a2 2 0 002 2h2m5-5V7a2 2 0 00-2 2H9m5-5a2 2 0 012 2v1a2 2 0 01-2 2H9m5-5H9"></path>
              </svg>
              Action Tasks
            </h5>
            <button
              (click)="addTask.emit(area)"
              class="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-lg text-sm font-medium shadow transition-colors flex items-center space-x-1">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
              </svg>
              <span>Add Task</span>
            </button>
          </div>

          <!-- Tasks List -->
          <div *ngFor="let task of getTasksForGrowthArea(area)" class="mb-3">
            <div class="p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow bg-white">
              <!-- Task Header -->
              <div class="flex items-start justify-between mb-3">
                <div class="flex items-start space-x-3 flex-1">
                  <!-- Task Status Icon -->
                  <div class="w-4 h-4 flex-shrink-0 mt-0.5">
                    <svg *ngIf="task.data.status === 'completed'" class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                    </svg>
                    <svg *ngIf="task.data.status === 'in_progress'" class="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                    </svg>
                    <svg *ngIf="task.data.status === 'not_started'" class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clip-rule="evenodd"></path>
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

              <!-- Task Details -->
              <div class="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-100">
                <div *ngIf="task.data.assigned_to" class="flex items-center space-x-1">
                  <i class="fas fa-user text-blue-500 text-xs"></i>
                  <span class="text-xs text-gray-600 truncate">{{ task.data.assigned_to }}</span>
                </div>
                <div *ngIf="task.data.due_date" class="flex items-center space-x-1">
                  <i class="fas fa-calendar text-purple-500 text-xs"></i>
                  <span class="text-xs text-gray-600">{{ task.data.due_date | date:'shortDate' }}</span>
                </div>
                <div *ngIf="task.data.impact_weight" class="flex items-center space-x-1">
                  <i class="fas fa-weight-hanging text-indigo-500 text-xs"></i>
                  <span class="text-xs text-gray-600">Impact: {{ task.data.impact_weight }}/10</span>
                </div>
              </div>
            </div>
          </div>

          <div *ngIf="getTasksForGrowthArea(area).length === 0" class="text-center py-8">
            <i class="fas fa-clipboard-list text-gray-300 text-3xl mb-3"></i>
            <p class="text-sm text-gray-500 mb-3">No action tasks yet for this growth area</p>
            <button
              (click)="addTask.emit(area)"
              class="text-sm text-purple-600 hover:text-purple-700 font-medium">
              Create your first task
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class GrowthAreasSectionComponent {
  @Input() growthAreas: INode<GrowthArea>[] = [];
  @Input() tasks: INode<OKRTask>[] = [];

  @Output() addGrowthArea = new EventEmitter<void>();
  @Output() editGrowthArea = new EventEmitter<INode<GrowthArea>>();
  @Output() deleteGrowthArea = new EventEmitter<INode<GrowthArea>>();
  @Output() addTask = new EventEmitter<INode<GrowthArea>>();
  @Output() editTask = new EventEmitter<INode<OKRTask>>();
  @Output() deleteTask = new EventEmitter<INode<OKRTask>>();
  @Output() updateTaskStatus = new EventEmitter<{task: INode<OKRTask>, status: string}>();

  getStarArray(rating: number): number[] {
    return Array(rating).fill(0);
  }

  getTasksForGrowthArea(area: INode<GrowthArea>): INode<OKRTask>[] {
    return this.tasks.filter(task =>
      task.data.growth_area_id === String(area.id) &&
      task.data.task_type === 'growth_area'
    );
  }
}
