import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { INode } from '../../../../../../models/schema';
import { GrowthArea, OKRTask } from '../../../../../../models/business.models';

@Component({
  selector: 'app-growth-areas-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-gradient-to-br from-green-50 to-blue-50 p-6 rounded-2xl shadow-lg border border-green-100 my-6 transition-all duration-300 hover:shadow-xl">
      <!-- Header with Add Growth Area Button -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center space-x-3">
          <div class="p-3 bg-gradient-to-r from-green-500 to-blue-600 rounded-xl shadow-md transform hover:scale-105 transition-transform">
            <i class="fas fa-chart-line text-white text-xl"></i>
          </div>
          <h3 class="text-2xl font-bold text-gray-800">Growth Areas & SWOT Analysis</h3>
        </div>
        <button
          (click)="addGrowthArea.emit()"
          class="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-md transition-all duration-300 flex items-center space-x-2 group">
          <i class="fas fa-plus text-white text-sm group-hover:rotate-90 transition-transform"></i>
          <span>Add Growth Area</span>
        </button>
      </div>

      <!-- Empty State -->
      <div *ngIf="growthAreas.length === 0" class="text-center py-12 animate-fade-in">
        <div class="p-4 bg-green-100 rounded-full mx-auto w-20 h-20 flex items-center justify-center mb-4 shadow-inner">
          <i class="fas fa-chart-line text-green-500 text-3xl"></i>
        </div>
        <h4 class="text-lg font-semibold text-gray-700 mb-2">No Growth Areas Yet</h4>
        <p class="text-gray-600 mb-6 max-w-md mx-auto">Start your SWOT analysis by identifying strengths, weaknesses, opportunities, and threats to drive your growth strategy.</p>
        <button
          (click)="addGrowthArea.emit()"
          class="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-medium shadow-md transition-all duration-300 hover:shadow-lg transform hover:-translate-y-0.5">
          Create First Growth Area
        </button>
      </div>

      <!-- Growth Areas List -->
      <div *ngFor="let area of growthAreas" class="mb-6 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden transition-all hover:shadow-xl animate-fade-in-up">
        <!-- Growth Area Header -->
        <div class="p-6 text-white"
             [ngClass]="{
               'bg-gradient-to-r from-green-500 to-emerald-600': area.data.type === 'strength',
               'bg-gradient-to-r from-red-500 to-rose-600': area.data.type === 'weakness',
               'bg-gradient-to-r from-blue-500 to-indigo-600': area.data.type === 'opportunity',
               'bg-gradient-to-r from-orange-500 to-amber-600': area.data.type === 'threat'
             }">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center space-x-4 mb-3">
                <!-- Type Icon -->
                <div class="p-3 bg-white bg-opacity-20 rounded-xl shadow-lg backdrop-blur-sm">
                  <i class="fas text-white text-xl" [ngClass]="getTypeIcon(area.data.type)"></i>
                </div>
                <div class="flex-1">
                  <h4 class="text-xl font-bold text-white mb-1">{{ area.data.area }}</h4>
                  <span class="text-xs text-white opacity-90 font-medium uppercase tracking-wider bg-white bg-opacity-10 px-2 py-1 rounded-full">
                    {{ area.data.type | titlecase }}
                  </span>
                </div>
              </div>

              <p class="text-sm text-white opacity-95 mb-4 leading-relaxed">{{ area.data.description }}</p>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <!-- Impact Area -->
                <div class="bg-white bg-opacity-15 px-3 py-2 rounded-lg backdrop-blur-sm">
                  <div class="flex items-center space-x-2">
                    <i class="fas fa-bullseye text-white opacity-90"></i>
                    <span class="text-white opacity-90 font-medium">Impact: {{ area.data.impact_area }}</span>
                  </div>
                </div>

                <!-- Rating -->
                <div class="bg-white bg-opacity-15 px-3 py-2 rounded-lg backdrop-blur-sm">
                  <div class="flex items-center space-x-2">
                    <i class="fas fa-star text-yellow-300"></i>
                    <div class="flex items-center space-x-1">
                      <span class="text-white opacity-90 font-medium">Rating:</span>
                      <div class="flex">
                        <i *ngFor="let star of getStarArray(area.data.rating)"
                           class="fas fa-star text-yellow-300 text-xs"></i>
                        <i *ngFor="let star of getStarArray(5 - area.data.rating)"
                           class="fas fa-star text-white text-opacity-30 text-xs"></i>
                      </div>
                      <span class="text-white opacity-90">{{ area.data.rating }}/5</span>
                    </div>
                  </div>
                </div>

                <!-- Task Count & Progress -->
                <div class="bg-white bg-opacity-15 px-3 py-2 rounded-lg backdrop-blur-sm">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2">
                      <i class="fas fa-tasks text-white opacity-90"></i>
                      <span class="text-white opacity-90 font-medium">{{ getTasksForGrowthArea(area).length }} Tasks</span>
                    </div>
                    <div class="flex items-center space-x-2">
                      <span class="text-white opacity-90 text-xs font-bold">{{ getGrowthAreaProgress(area) }}%</span>
                      <div class="w-16 bg-white bg-opacity-30 rounded-full h-2">
                        <div class="bg-white h-2 rounded-full transition-all duration-500"
                             [style.width.%]="getGrowthAreaProgress(area)"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-start space-x-2 ml-6">
              <button
                (click)="addTask.emit(area)"
                class="p-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-110"
                title="Add Task">
                <i class="fas fa-plus text-white text-sm"></i>
              </button>
              <button
                (click)="editGrowthArea.emit(area)"
                class="p-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-110"
                title="Edit Growth Area">
                <i class="fas fa-edit text-white text-sm"></i>
              </button>
              <button
                (click)="deleteGrowthArea.emit(area)"
                class="p-3 bg-red-500 bg-opacity-30 hover:bg-opacity-50 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-110"
                title="Delete Growth Area">
                <i class="fas fa-trash text-white text-sm"></i>
              </button>
            </div>
          </div>

          <!-- Mentor Notes (if present) -->
          <div *ngIf="area.data.mentor_notes" class="mt-4 pt-4 border-t border-white border-opacity-20 animate-fade-in">
            <div class="flex items-start space-x-3">
              <div class="p-2 bg-white bg-opacity-20 rounded-lg backdrop-blur-sm">
                <i class="fas fa-comment-alt text-white text-sm"></i>
              </div>
              <div class="flex-1">
                <h6 class="text-sm font-medium text-white opacity-90 mb-1">Mentor Notes</h6>
                <p class="text-sm text-white opacity-90 italic leading-relaxed">{{ area.data.mentor_notes }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Tasks Section -->
        <div class="p-4 bg-gray-50">
          <div class="flex items-center justify-between mb-4">
            <h5 class="text-lg font-semibold text-gray-800 flex items-center">
              <i class="fas fa-tasks text-purple-600 mr-2"></i>
              Action Tasks
            </h5>
            <button
              (click)="addTask.emit(area)"
              class="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow transition-all duration-300 hover:shadow-md flex items-center space-x-1 group">
              <i class="fas fa-plus text-white text-xs group-hover:rotate-90 transition-transform"></i>
              <span>Add Task</span>
            </button>
          </div>

          <!-- Tasks List -->
          <div *ngFor="let task of getTasksForGrowthArea(area)" class="mb-3 animate-fade-in">
            <div class="p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300"
                 [ngClass]="getTaskBackgroundClass(task.data.background_color)">
              <!-- Task Header -->
              <div class="flex items-start justify-between mb-3">
                <div class="flex items-start space-x-3 flex-1">
                  <!-- Task Status Dropdown -->
                  <div class="relative">
                    <select
                      [value]="task.data.status"
                      (change)="updateTaskStatusFromDropdown(task, $event)"
                      class="appearance-none text-xs border border-gray-300 rounded-lg px-3 py-1.5 pr-6 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white cursor-pointer"
                      [title]="getTaskStatusTooltip(task.data.status)">
                      <option value="not_started">Not Started</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="blocked">Blocked</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                      <i class="fas fa-chevron-down text-xs"></i>
                    </div>
                  </div>

                  <!-- Task Status Icon -->
                  <div class="w-4 h-4 flex-shrink-0 mt-1">
                    <i *ngIf="task.data.status === 'completed'" class="fas fa-check-circle text-green-500"></i>
                    <i *ngIf="task.data.status === 'in_progress'" class="fas fa-clock text-yellow-500"></i>
                    <i *ngIf="task.data.status === 'blocked'" class="fas fa-ban text-red-500"></i>
                    <i *ngIf="task.data.status === 'not_started'" class="fas fa-dot-circle text-gray-400"></i>
                    <i *ngIf="task.data.status === 'cancelled'" class="fas fa-dot-circle text-gray-500"></i>
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
                        <i class="fas fa-flag mr-1 text-xs"></i>
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
                    class="p-1.5 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors duration-200 hover:shadow-sm"
                    title="Edit Task">
                    <i class="fas fa-edit text-purple-600 text-xs"></i>
                  </button>
                  <button
                    (click)="deleteTask.emit(task)"
                    class="p-1.5 bg-red-100 hover:bg-red-200 rounded-lg transition-colors duration-200 hover:shadow-sm"
                    title="Delete Task">
                    <i class="fas fa-trash text-red-600 text-xs"></i>
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

          <div *ngIf="getTasksForGrowthArea(area).length === 0" class="text-center py-8 animate-fade-in">
            <i class="fas fa-clipboard-list text-gray-300 text-3xl mb-3"></i>
            <p class="text-sm text-gray-500 mb-3">No action tasks yet for this growth area</p>
            <button
              (click)="addTask.emit(area)"
              class="text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors duration-200">
              Create your first task
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .animate-fade-in {
      animation: fadeIn 0.5s ease-in-out;
    }
    .animate-fade-in-up {
      animation: fadeInUp 0.5s ease-in-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    select {
      background-image: none;
    }
  `]
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

  getTypeIcon(type: string): string {
    switch(type) {
      case 'strength': return 'fa-thumbs-up';
      case 'weakness': return 'fa-exclamation-triangle';
      case 'opportunity': return 'fa-lightbulb';
      case 'threat': return 'fa-shield-alt';
      default: return 'fa-chart-line';
    }
  }

  getStarArray(rating: number): number[] {
    return Array(rating).fill(0);
  }

  getTasksForGrowthArea(area: INode<GrowthArea>): INode<OKRTask>[] {
    return this.tasks.filter(task =>
      task.data.growth_area_id === String(area.id) &&
      task.data.task_type === 'growth_area'
    );
  }

  getGrowthAreaProgress(area: INode<GrowthArea>): number {
    const tasks = this.getTasksForGrowthArea(area);
    if (tasks.length === 0) return 0;

    const completedTasks = tasks.filter(task => task.data.status === 'completed').length;
    return Math.round((completedTasks / tasks.length) * 100);
  }

  updateTaskStatusFromDropdown(task: INode<OKRTask>, event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const newStatus = selectElement.value as 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';

    // Update the task status
    task.data.status = newStatus;

    // Emit the status change event
    this.updateTaskStatus.emit({task, status: newStatus});
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

  getTaskBackgroundClass(backgroundColor?: string): string {
    switch (backgroundColor) {
      case 'light-orange':
        return 'bg-orange-50 hover:bg-orange-100';
      case 'light-red':
        return 'bg-red-50 hover:bg-red-100';
      case 'light-green':
        return 'bg-green-50 hover:bg-green-100';
      case 'light-yellow':
        return 'bg-yellow-50 hover:bg-yellow-100';
      case 'light-purple':
        return 'bg-purple-50 hover:bg-purple-100';
      case 'light-blue':
        return 'bg-blue-50 hover:bg-blue-100';
      case 'light-pink':
        return 'bg-pink-50 hover:bg-pink-100';
      case 'white':
      default:
        return 'bg-white hover:bg-gray-50';
    }
  }
}
