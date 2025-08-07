import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { INode } from '../../../../../../models/schema';
import { GrowthArea, OKRTask } from '../../../../../../models/business.models';
import { TaskCardComponent } from './task-card.component';

@Component({
  selector: 'app-growth-area-card',
  standalone: true,
  imports: [CommonModule, TaskCardComponent],
  template: `
    <div
      class="mb-6 rounded-xl shadow-lg overflow-hidden transition-all hover:shadow-xl animate-fade-in-up"
      [ngClass]="getCardContainerClasses(growthArea.data.type)"
    >
      <!-- Header -->
      <div
        class="p-6 text-white"
        [style.background]="getBackgroundGradient(growthArea.data.type)"
      >
        <div class="flex items-start justify-between gap-4">
          <!-- Main Content -->
          <div class="flex-1">
            <div class="flex items-start gap-4 mb-4">
              <!-- Icon -->
              <div
                class="p-3 bg-black bg-opacity-30 rounded-xl backdrop-blur-sm shadow-md"
              >
                <i
                  [class]="
                    getTypeIcon(growthArea.data.type) + ' fa text-white text-xl'
                  "
                ></i>
              </div>

              <!-- Title & Type -->
              <div class="flex-1">
                <h3 class="text-xl font-bold text-white mb-1">
                  {{ growthArea.data.area }}
                </h3>
                <span
                  class="text-xs font-medium uppercase tracking-wider bg-black bg-opacity-30 px-2 py-1 rounded-full"
                >
                  {{ growthArea.data.type | titlecase }}
                </span>
              </div>
            </div>

            <!-- Description -->
            <p class="text-white text-opacity-95 mb-5 text-sm leading-relaxed">
              {{ growthArea.data.description }}
            </p>

            <!-- Metrics Grid -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <!-- Impact -->
              <div
                class="bg-black bg-opacity-30 px-3 py-2 rounded-lg backdrop-blur-sm flex items-center gap-2"
              >
                <i class="fas fa-bullseye text-white text-opacity-90"></i>
                <span class="text-white text-opacity-90 font-medium"
                  >Impact: {{ growthArea.data.impact_area }}</span
                >
              </div>

              <!-- Rating -->
              <div
                class="bg-black bg-opacity-30 px-3 py-2 rounded-lg backdrop-blur-sm flex items-center gap-2"
              >
                <i class="fas fa-star text-yellow-300"></i>
                <div class="flex items-center gap-1">
                  <span class="text-white text-opacity-90 font-medium">Rating:</span>
                  <div class="flex">
                    <i
                      *ngFor="let star of getStarArray(growthArea.data.rating)"
                      class="fas fa-star text-yellow-300 text-xs"
                    ></i>
                    <i
                      *ngFor="
                        let star of getStarArray(5 - growthArea.data.rating)
                      "
                      class="fas fa-star text-white text-opacity-30 text-xs"
                    ></i>
                  </div>
                  <span class="text-white text-opacity-90"
                    >{{ growthArea.data.rating }}/5</span
                  >
                </div>
              </div>

              <!-- Progress -->
              <div
                class="bg-black bg-opacity-30 px-3 py-2 rounded-lg backdrop-blur-sm flex items-center justify-between"
              >
                <div class="flex items-center gap-2">
                  <i class="fas fa-tasks text-white text-opacity-90"></i>
                  <span class="text-white text-opacity-90 font-medium"
                    >{{ tasks.length }} Tasks</span
                  >
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-white text-opacity-90 text-xs font-bold"
                    >{{ progress }}%</span
                  >
                  <div class="w-16 bg-white bg-opacity-30 rounded-full h-2">
                    <div
                      class="bg-white h-2 rounded-full"
                      [style.width.%]="progress"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <!-- Action Buttons (Updated) -->
          <div class="flex gap-2">
            <!-- Add Task -->
            <button
              (click)="addTask.emit(growthArea)"
              class="p-3 bg-black bg-opacity-30 text-white hover:bg-opacity-40 rounded-xl transition-all shadow-md hover:shadow-lg group backdrop-blur-sm"
              title="Add Task"
            >
              <i class="fas fa-plus"></i>
            </button>

            <!-- Edit -->
            <button
              (click)="editGrowthArea.emit(growthArea)"
              class="p-3 bg-black bg-opacity-30 hover:bg-opacity-40 rounded-xl transition-all shadow-md hover:shadow-lg group backdrop-blur-sm"
              title="Edit"
            >
              <i class="fas fa-edit text-white"></i>
            </button>

            <!-- Delete -->
            <button
              (click)="deleteGrowthArea.emit(growthArea)"
              class="p-3 bg-black bg-opacity-30 hover:bg-opacity-40 rounded-xl transition-all shadow-md hover:shadow-lg group backdrop-blur-sm"
              title="Delete"
            >
              <i class="fas fa-trash text-red-400 group-hover:text-red-300"></i>
            </button>
          </div>
        </div>

        <!-- Mentor Notes -->
        <div
          *ngIf="growthArea.data.mentor_notes"
          class="mt-4 pt-4 border-t border-white border-opacity-30"
        >
          <div class="flex gap-3">
            <div class="p-2 bg-black bg-opacity-30 rounded-lg">
              <i class="fas fa-comment-alt text-white text-opacity-90"></i>
            </div>
            <div>
              <h6 class="text-sm font-medium text-white text-opacity-90 mb-1">
                Mentor Notes
              </h6>
              <p class="text-sm text-white text-opacity-80 italic">
                {{ growthArea.data.mentor_notes }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Tasks Section -->
      <div class="p-4" [ngClass]="getTasksSectionClasses(growthArea.data.type)">
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <i class="fas fa-tasks" [ngClass]="getTasksIconClasses(growthArea.data.type)"></i>
            Action Tasks
          </h4>
          <button
            (click)="addTask.emit(growthArea)"
            class="text-white px-3 py-2 rounded-lg text-sm font-medium shadow-md transition-all flex items-center gap-1 hover:bg-opacity-90"
            [ngClass]="getAddTaskButtonClasses(growthArea.data.type)"
          >
            <i class="fas fa-plus text-xs"></i>
            <span>Add Task</span>
          </button>
        </div>

        <!-- Task List -->
        <div class="space-y-3">
          <app-task-card
            *ngFor="let task of tasks"
            [task]="task"
            (editTask)="editTask.emit($event)"
            (deleteTask)="deleteTask.emit($event)"
            (updateTaskStatus)="updateTaskStatus.emit($event)"
          >
          </app-task-card>

          <!-- Empty State -->
          <div
            *ngIf="tasks.length === 0"
            class="text-center py-6 text-gray-600"
          >
            <i class="fas fa-clipboard-list text-3xl mb-3"></i>
            <p class="text-sm mb-3">No tasks yet for this growth area</p>
            <button
              (click)="addTask.emit(growthArea)"
              class="text-sm font-medium hover:opacity-80 transition-colors"
              [ngClass]="getEmptyStateButtonClasses(growthArea.data.type)"
            >
              + Create first task
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .animate-fade-in-up {
        animation: fadeInUp 0.4s ease-out;
      }
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
})
export class GrowthAreaCardComponent {
  @Input({ required: true }) growthArea!: INode<GrowthArea>;
  @Input() tasks: INode<OKRTask>[] = [];
  @Input() progress = 0;

  @Output() editGrowthArea = new EventEmitter<INode<GrowthArea>>();
  @Output() deleteGrowthArea = new EventEmitter<INode<GrowthArea>>();
  @Output() addTask = new EventEmitter<INode<GrowthArea>>();
  @Output() editTask = new EventEmitter<INode<OKRTask>>();
  @Output() deleteTask = new EventEmitter<INode<OKRTask>>();
  @Output() updateTaskStatus = new EventEmitter<{
    task: INode<OKRTask>;
    status: string;
  }>();

  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      strength: 'fa-thumbs-up',
      weakness: 'fa-exclamation-triangle',
      opportunity: 'fa-lightbulb',
      threat: 'fa-shield-alt',
    };
    return icons[type] || 'fa-chart-line';
  }

  getCardContainerClasses(type: string): string {
    const classes: Record<string, string> = {
      strength: 'bg-green-50 border border-green-500', // Light green theme (matching form)
      weakness: 'bg-red-50 border border-red-500',   // Light red theme (matching form)
      opportunity: 'bg-blue-50 border border-blue-500', // Light blue theme (matching form)
      threat: 'bg-orange-50 border border-orange-500', // Light orange theme (matching form)
    };
    return classes[type] || 'bg-purple-50 border border-purple-500'; // Default light purple theme
  }

  getTasksSectionClasses(type: string): string {
    const classes: Record<string, string> = {
      strength: 'bg-green-100', // Light green for tasks section (matching form)
      weakness: 'bg-red-100',   // Light red for tasks section (matching form)
      opportunity: 'bg-blue-100', // Light blue for tasks section (matching form)
      threat: 'bg-orange-100', // Light orange for tasks section (matching form)
    };
    return classes[type] || 'bg-purple-100'; // Default light purple theme
  }

  getTasksIconClasses(type: string): string {
    const classes: Record<string, string> = {
      strength: 'text-green-600', // Green icon (matching form text-green-600)
      weakness: 'text-red-600',   // Red icon (matching form text-red-600)
      opportunity: 'text-blue-600', // Blue icon (matching form text-blue-600)
      threat: 'text-orange-600', // Orange icon (matching form text-orange-600)
    };
    return classes[type] || 'text-purple-600'; // Default purple theme
  }

  getAddTaskButtonClasses(type: string): string {
    const classes: Record<string, string> = {
      strength: 'bg-green-600 hover:bg-green-700', // Green buttons (matching form text-green-600)
      weakness: 'bg-red-600 hover:bg-red-700',   // Red buttons (matching form text-red-600)
      opportunity: 'bg-blue-600 hover:bg-blue-700', // Blue buttons (matching form text-blue-600)
      threat: 'bg-orange-600 hover:bg-orange-700', // Orange buttons (matching form text-orange-600)
    };
    return classes[type] || 'bg-purple-600 hover:bg-purple-700'; // Default purple theme
  }

  getEmptyStateButtonClasses(type: string): string {
    const classes: Record<string, string> = {
      strength: 'text-green-600 hover:text-green-700', // Green text (matching form text-green-600)
      weakness: 'text-red-600 hover:text-red-700',   // Red text (matching form text-red-600)
      opportunity: 'text-blue-600 hover:text-blue-700', // Blue text (matching form text-blue-600)
      threat: 'text-orange-600 hover:text-orange-700', // Orange text (matching form text-orange-600)
    };
    return classes[type] || 'text-purple-600 hover:text-purple-700'; // Default purple theme
  }

  getBackgroundGradient(type: string): string {
    const gradients: Record<string, string> = {
      strength: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', // Green gradient (matching text-green-600)
      weakness: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', // Red gradient (matching text-red-600)
      opportunity: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', // Blue gradient (matching text-blue-600)
      threat: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)', // Orange gradient (matching text-orange-600)
    };
    return (
      gradients[type] || 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)'
    ); // Default purple gradient
  }

  getStarArray(count: number): number[] {
    return Array(Math.max(0, Math.min(count, 5))).fill(0);
  }
}
