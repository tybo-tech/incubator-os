import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActionItemData } from '../action-item-form/action-item-form.component';

@Component({
  selector: 'app-action-item-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      (click)="onEdit()"
      class="bg-white p-4 rounded-md border cursor-pointer hover:shadow-md transition-all duration-200"
      [ngClass]="'border-' + categoryColor + '-200 hover:border-' + categoryColor + '-300'"
    >
      <div class="flex items-start justify-between">
        <div class="flex-1 min-w-0">
          <!-- Main Content -->
          <div class="mb-2">
            <p class="text-sm font-medium text-gray-900 leading-relaxed">
              {{ item.description || 'Click to add description...' }}
            </p>
            <p *ngIf="item.action_required" class="text-xs text-gray-600 mt-1 leading-relaxed">
              Action: {{ item.action_required }}
            </p>
          </div>

          <!-- Status Row -->
          <div class="flex flex-wrap items-center gap-2 mt-3">
            <!-- Status Badge -->
            <span 
              class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
              [ngClass]="{
                'bg-gray-100 text-gray-700': item.status === 'identified',
                'bg-blue-100 text-blue-700': item.status === 'planning', 
                'bg-yellow-100 text-yellow-700': item.status === 'in_progress',
                'bg-green-100 text-green-700': item.status === 'completed',
                'bg-red-100 text-red-700': item.status === 'on_hold'
              }"
            >
              {{ getStatusIcon(item.status) }} {{ getStatusDisplay(item.status) }}
            </span>

            <!-- Priority Badge -->
            <span 
              class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
              [ngClass]="{
                'bg-slate-100 text-slate-700': item.priority === 'low',
                'bg-amber-100 text-amber-700': item.priority === 'medium',
                'bg-orange-100 text-orange-700': item.priority === 'high', 
                'bg-red-100 text-red-700': item.priority === 'critical'
              }"
            >
              {{ getPriorityIcon(item.priority) }} {{ (item.priority || 'Low') | titlecase }}
            </span>

            <!-- Impact Badge (if applicable) -->
            <span 
              *ngIf="item.impact"
              class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
              [ngClass]="{
                'bg-indigo-100 text-indigo-700': item.impact === 'low',
                'bg-purple-100 text-purple-700': item.impact === 'medium',
                'bg-pink-100 text-pink-700': item.impact === 'high'
              }"
            >
              📊 {{ (item.impact || 'Low') | titlecase }} Impact
            </span>
          </div>

          <!-- Assignment and Due Date Row -->
          <div *ngIf="item.assigned_to || item.target_date" class="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-500">
            <div *ngIf="item.assigned_to" class="flex items-center">
              <i class="fas fa-user mr-1"></i>
              {{ item.assigned_to }}
            </div>
            
            <div *ngIf="item.target_date" class="flex items-center"
                 [ngClass]="{
                   'text-red-600 font-medium': isOverdue(item.target_date),
                   'text-orange-600 font-medium': isDueSoon(item.target_date)
                 }">
              <i class="fas fa-calendar mr-1"></i>
              {{ item.target_date | date:'MMM d, y' }}
              <span *ngIf="isOverdue(item.target_date)" class="ml-1">(Overdue)</span>
              <span *ngIf="isDueSoon(item.target_date) && !isOverdue(item.target_date)" class="ml-1">(Due Soon)</span>
            </div>
          </div>
        </div>

        <!-- Quick Action Button -->
        <div class="flex items-start space-x-2 ml-4">
          <button
            (click)="onEdit(); $event.stopPropagation()"
            class="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
            title="Edit Item"
          >
            <i class="fas fa-edit text-sm"></i>
          </button>
          
          <button
            (click)="onQuickDelete(); $event.stopPropagation()"
            class="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
            title="Delete Item"
          >
            <i class="fas fa-trash-alt text-sm"></i>
          </button>
        </div>
      </div>

      <!-- Progress Bar (for non-identified items) -->
      <div *ngIf="item.status && item.status !== 'identified'" class="mt-3 pt-2 border-t border-gray-100">
        <div class="w-full bg-gray-200 rounded-full h-1.5">
          <div 
            class="h-1.5 rounded-full transition-all duration-300"
            [ngClass]="{
              'bg-blue-500 w-1/4': item.status === 'planning',
              'bg-yellow-500 w-2/3': item.status === 'in_progress',
              'bg-green-500 w-full': item.status === 'completed', 
              'bg-red-500 w-1/3': item.status === 'on_hold'
            }"
          ></div>
        </div>
      </div>

      <!-- Click to edit hint -->
      <div class="text-xs text-gray-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        Click to edit or add details...
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    .cursor-pointer:hover {
      transform: translateY(-1px);
    }
  `]
})
export class ActionItemDisplayComponent {
  @Input() item!: ActionItemData;
  @Input() categoryColor: string = 'gray';
  
  @Output() edit = new EventEmitter<ActionItemData>();
  @Output() quickDelete = new EventEmitter<ActionItemData>();

  onEdit() {
    this.edit.emit(this.item);
  }

  onQuickDelete() {
    if (confirm('Are you sure you want to delete this item?')) {
      this.quickDelete.emit(this.item);
    }
  }

  getStatusDisplay(status: string): string {
    const statusMap: { [key: string]: string } = {
      'identified': 'Identified',
      'planning': 'Planning', 
      'in_progress': 'In Progress',
      'completed': 'Completed',
      'on_hold': 'On Hold'
    };
    return statusMap[status] || 'Identified';
  }

  getStatusIcon(status: string): string {
    const iconMap: { [key: string]: string } = {
      'identified': '📝',
      'planning': '📋',
      'in_progress': '⚙️', 
      'completed': '✅',
      'on_hold': '⏸️'
    };
    return iconMap[status] || '📝';
  }

  getPriorityIcon(priority: string): string {
    const iconMap: { [key: string]: string } = {
      'low': '🔵',
      'medium': '🟡',
      'high': '🟠',
      'critical': '🔴'
    };
    return iconMap[priority] || '🔵';
  }

  isOverdue(targetDate: string): boolean {
    if (!targetDate) return false;
    const today = new Date();
    const due = new Date(targetDate);
    return due < today;
  }

  isDueSoon(targetDate: string): boolean {
    if (!targetDate) return false;
    const today = new Date();
    const due = new Date(targetDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays > 0;
  }
}