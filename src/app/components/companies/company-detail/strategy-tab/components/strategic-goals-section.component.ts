import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { INode } from '../../../../../../models/schema';
import { StrategicGoal } from '../../../../../../models/business.models';

@Component({
  selector: 'app-strategic-goals-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-lg shadow-sm border">
      <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 flex items-center">
            <i class="fas fa-target mr-2 text-purple-600"></i>
            Strategic Goals
          </h3>
          <p class="text-sm text-gray-600">Define long-term objectives and track progress</p>
        </div>
        <button
          (click)="addGoal.emit()"
          class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <i class="fas fa-plus"></i>
          <span>Add Strategic Goal</span>
        </button>
      </div>

      <div class="p-6">
        <div *ngIf="strategicGoals.length === 0" class="text-center text-gray-500 py-8">
          <i class="fas fa-target text-4xl mb-4"></i>
          <h4 class="text-lg font-medium mb-2">No Strategic Goals Yet</h4>
          <p class="mb-4">Set long-term objectives to guide your company's direction.</p>
          <button
            (click)="addGoal.emit()"
            class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
          >
            Add First Strategic Goal
          </button>
        </div>

        <div *ngIf="strategicGoals.length > 0" class="space-y-4">
          <div *ngFor="let goal of strategicGoals" class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div class="flex justify-between items-start mb-3">
              <div class="flex-1">
                <h4 class="text-lg font-medium text-gray-900 flex items-center">
                  {{ goal.data.title }}
                  <span class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        [ngClass]="getPriorityClass(goal.data.priority)">
                    {{ goal.data.priority | titlecase }}
                  </span>
                </h4>
                <p class="text-sm text-gray-600 mt-1">{{ goal.data.description }}</p>
              </div>
              <div class="flex space-x-2 ml-4">
                <button (click)="editGoal.emit(goal)" class="text-blue-600 hover:text-blue-700" title="Edit">
                  <i class="fas fa-edit"></i>
                </button>
                <button (click)="deleteGoal.emit(goal)" class="text-red-600 hover:text-red-700" title="Delete">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <span class="text-xs font-medium text-gray-500">Category</span>
                <p class="text-sm text-gray-900">{{ goal.data.category | titlecase }}</p>
              </div>
              <div>
                <span class="text-xs font-medium text-gray-500">Timeline</span>
                <p class="text-sm text-gray-900">{{ getTimelineDisplay(goal.data.timeline) }}</p>
              </div>
              <div>
                <span class="text-xs font-medium text-gray-500">Target Date</span>
                <p class="text-sm text-gray-900">{{ goal.data.target_date | date:'MMM d, y' }}</p>
              </div>
            </div>

            <!-- Progress Bar -->
            <div class="mb-4">
              <div class="flex justify-between items-center mb-1">
                <span class="text-xs font-medium text-gray-500">Progress</span>
                <span class="text-xs text-gray-500">{{ goal.data.progress_percentage }}%</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div
                  class="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  [style.width.%]="goal.data.progress_percentage"
                ></div>
              </div>
            </div>

            <!-- Status -->
            <div class="flex items-center justify-between">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    [ngClass]="getGoalStatusClass(goal.data.current_status)">
                {{ getGoalStatusDisplay(goal.data.current_status) }}
              </span>
              <span *ngIf="goal.data.mentor_notes" class="text-xs text-blue-600 italic">
                💬 Has mentor notes
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class StrategicGoalsSectionComponent {
  @Input() strategicGoals: INode<StrategicGoal>[] = [];
  @Output() addGoal = new EventEmitter<void>();
  @Output() editGoal = new EventEmitter<INode<StrategicGoal>>();
  @Output() deleteGoal = new EventEmitter<INode<StrategicGoal>>();

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getTimelineDisplay(timeline: string): string {
    switch (timeline) {
      case '3_months': return '3 Months';
      case '6_months': return '6 Months';
      case '1_year': return '1 Year';
      case '2_years': return '2 Years';
      case '5_years': return '5 Years';
      default: return timeline;
    }
  }

  getGoalStatusClass(status: string): string {
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

  getGoalStatusDisplay(status: string): string {
    return status.replace('_', ' ').split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
}
