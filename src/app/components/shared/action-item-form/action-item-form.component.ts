import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface ActionItemFormConfig {
  primaryLabel: string; // e.g., "Strength Description", "GPS Target Description"
  primaryPlaceholder: string; // e.g., "Describe this strength...", "Describe this target..."
  actionLabel?: string; // defaults to "Action Required"
  actionPlaceholder?: string; // defaults to "What action is needed..."
  categoryColor: string; // e.g., "green", "blue", "red", "yellow"
  category: string; // e.g., "strength", "target", "weakness"
  showImpact?: boolean; // whether to show impact field, defaults to true
}

export interface ActionItemData {
  id?: number;
  description: string;
  action_required: string;
  assigned_to: string;
  target_date: string;
  status: string;
  priority: string;
  impact?: string;
}

@Component({
  selector: 'app-action-item-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white p-4 rounded-md border" 
         [ngClass]="'border-' + config.categoryColor + '-300'">
      
      <!-- Primary Description and Action Required Row -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-2">
            {{ config.primaryLabel }}
          </label>
          <textarea
            [(ngModel)]="item.description"
            (ngModelChange)="onItemChange()"
            rows="3"
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 transition-colors"
            [ngClass]="'focus:ring-' + config.categoryColor + '-500 focus:border-' + config.categoryColor + '-500'"
            [placeholder]="config.primaryPlaceholder"
          ></textarea>
        </div>
        
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-2">
            {{ config.actionLabel || 'Action Required' }}
          </label>
          <textarea
            [(ngModel)]="item.action_required"
            (ngModelChange)="onItemChange()"
            rows="3"
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 transition-colors"
            [ngClass]="'focus:ring-' + config.categoryColor + '-500 focus:border-' + config.categoryColor + '-500'"
            [placeholder]="config.actionPlaceholder || 'What action is needed...'"
          ></textarea>
        </div>
      </div>

      <!-- Action Details Row -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-2">Assigned To</label>
          <input
            [(ngModel)]="item.assigned_to"
            (ngModelChange)="onItemChange()"
            type="text"
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 transition-colors"
            [ngClass]="'focus:ring-' + config.categoryColor + '-500 focus:border-' + config.categoryColor + '-500'"
            placeholder="Who will handle this..."
          />
        </div>
        
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-2">Due Date</label>
          <input
            [(ngModel)]="item.target_date"
            (ngModelChange)="onItemChange()"
            type="date"
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 transition-colors"
            [ngClass]="'focus:ring-' + config.categoryColor + '-500 focus:border-' + config.categoryColor + '-500'"
          />
        </div>
        
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-2">Status</label>
          <select
            [(ngModel)]="item.status"
            (ngModelChange)="onItemChange()"
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 transition-colors"
            [ngClass]="'focus:ring-' + config.categoryColor + '-500 focus:border-' + config.categoryColor + '-500'"
          >
            <option value="identified">📝 Identified</option>
            <option value="planning">📋 Planning</option>
            <option value="in_progress">⚙️ In Progress</option>
            <option value="completed">✅ Completed</option>
            <option value="on_hold">⏸️ On Hold</option>
          </select>
        </div>
      </div>

      <!-- Priority and Impact Row -->
      <div class="flex items-center justify-between mt-4">
        <div class="flex items-center space-x-4">
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-2">Priority</label>
            <select
              [(ngModel)]="item.priority"
              (ngModelChange)="onItemChange()"
              class="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 transition-colors"
              [ngClass]="'focus:ring-' + config.categoryColor + '-500 focus:border-' + config.categoryColor + '-500'"
            >
              <option value="low">🔵 Low Priority</option>
              <option value="medium">🟡 Medium Priority</option>
              <option value="high">🟠 High Priority</option>
              <option value="critical">🔴 Critical</option>
            </select>
          </div>

          <div *ngIf="config.showImpact !== false">
            <label class="block text-xs font-medium text-gray-700 mb-2">Impact</label>
            <select
              [(ngModel)]="item.impact"
              (ngModelChange)="onItemChange()"
              class="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 transition-colors"
              [ngClass]="'focus:ring-' + config.categoryColor + '-500 focus:border-' + config.categoryColor + '-500'"
            >
              <option value="low">📊 Low Impact</option>
              <option value="medium">📈 Medium Impact</option>
              <option value="high">🎯 High Impact</option>
            </select>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center space-x-2">
          <button
            (click)="onSave()"
            class="px-4 py-2 text-sm font-medium text-white rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
            [ngClass]="'bg-' + config.categoryColor + '-600 hover:bg-' + config.categoryColor + '-700 focus:ring-' + config.categoryColor + '-500'"
          >
            💾 Save
          </button>
          
          <button
            (click)="onCancel()"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            ❌ Cancel
          </button>
          
          <button
            (click)="onDelete()"
            class="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            title="Delete Item"
          >
            🗑️
          </button>
        </div>
      </div>

      <!-- Progress Indicator (optional) -->
      <div *ngIf="item.status && item.status !== 'identified'" class="mt-4 pt-3 border-t border-gray-200">
        <div class="flex items-center justify-between text-xs text-gray-600">
          <span>Progress:</span>
          <div class="flex items-center space-x-2">
            <div class="w-32 bg-gray-200 rounded-full h-2">
              <div 
                class="h-2 rounded-full transition-all"
                [ngClass]="{
                  'bg-blue-600 w-1/4': item.status === 'planning',
                  'bg-yellow-600 w-2/3': item.status === 'in_progress', 
                  'bg-green-600 w-full': item.status === 'completed',
                  'bg-red-600 w-1/3': item.status === 'on_hold'
                }"
              ></div>
            </div>
            <span class="font-medium">
              {{ getStatusDisplay(item.status) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    .focus\:ring-2:focus {
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
    }
    
    .transition-colors {
      transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
    }
    
    textarea {
      resize: vertical;
      min-height: 60px;
    }
    
    select, input, textarea {
      transition: all 0.15s ease-in-out;
    }
    
    select:hover, input:hover, textarea:hover {
      border-color: #d1d5db;
    }
  `]
})
export class ActionItemFormComponent {
  @Input() item!: ActionItemData;
  @Input() config!: ActionItemFormConfig;
  
  @Output() itemChange = new EventEmitter<ActionItemData>();
  @Output() save = new EventEmitter<ActionItemData>();
  @Output() cancel = new EventEmitter<void>();
  @Output() delete = new EventEmitter<ActionItemData>();

  onItemChange() {
    this.itemChange.emit(this.item);
  }

  onSave() {
    this.save.emit(this.item);
  }

  onCancel() {
    this.cancel.emit();
  }

  onDelete() {
    this.delete.emit(this.item);
  }

  getStatusDisplay(status: string): string {
    const statusMap: { [key: string]: string } = {
      'identified': 'Identified',
      'planning': 'Planning',
      'in_progress': 'In Progress', 
      'completed': 'Completed',
      'on_hold': 'On Hold'
    };
    return statusMap[status] || status;
  }
}