import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { INode } from '../../../../../../models/schema';
import { KeyResult } from '../../../../../../models/business.models';

@Component({
  selector: 'app-key-result-progress-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 class="text-lg font-semibold text-gray-900 flex items-center">
            <i class="fas fa-chart-line mr-2 text-blue-600"></i>
            Update Progress: {{ keyResultData?.data?.title || 'Key Result' }}
          </h3>
          <button (click)="closeModal()" class="text-gray-400 hover:text-gray-600">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="p-6">
          <div *ngIf="keyResultData" class="space-y-6">

            <!-- Current Metrics Overview -->
            <div class="bg-gray-50 p-4 rounded-lg">
              <h4 class="font-medium text-gray-900 mb-3">Current Metrics</h4>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="text-center">
                  <div class="text-2xl font-bold text-gray-600">{{ keyResultData.data.baseline_value }}</div>
                  <div class="text-sm text-gray-500">Baseline {{ keyResultData.data.unit || '' }}</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-blue-600">{{ currentValue }}</div>
                  <div class="text-sm text-gray-500">Current {{ keyResultData.data.unit || '' }}</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-green-600">{{ keyResultData.data.target_value }}</div>
                  <div class="text-sm text-gray-500">Target {{ keyResultData.data.unit || '' }}</div>
                </div>
              </div>

              <!-- Progress Bar -->
              <div class="mt-4">
                <div class="flex justify-between items-center mb-2">
                  <span class="text-sm font-medium text-gray-700">Progress</span>
                  <span class="text-sm text-gray-500">{{ calculateProgress() }}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-3">
                  <div class="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                       [style.width.%]="calculateProgress()"></div>
                </div>
              </div>
            </div>

            <!-- Update Current Value -->
            <div class="space-y-4">
              <h4 class="font-medium text-gray-900 flex items-center">
                <i class="fas fa-edit mr-2 text-blue-600"></i>
                Update Current Value
              </h4>

              <div class="flex items-center space-x-4">
                <div class="flex-1">
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Current Value
                  </label>
                  <div class="relative">
                    <input
                      type="number"
                      [(ngModel)]="currentValue"
                      (ngModelChange)="onCurrentValueChange()"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      [placeholder]="'Enter current ' + keyResultData.data.unit"
                      step="0.01"
                    />
                    <span *ngIf="keyResultData.data.unit"
                          class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 text-sm">
                      {{ keyResultData.data.unit }}
                    </span>
                  </div>
                </div>

                <div class="flex-shrink-0">
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Progress %
                  </label>
                  <div class="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-center font-medium"
                       [class.text-green-600]="calculateProgress() >= 100"
                       [class.text-yellow-600]="calculateProgress() >= 70 && calculateProgress() < 100"
                       [class.text-red-600]="calculateProgress() < 70">
                    {{ calculateProgress() }}%
                  </div>
                </div>
              </div>

              <!-- Quick Increment Buttons -->
              <div class="flex space-x-2">
                <button *ngFor="let increment of getQuickIncrements()"
                        (click)="addIncrement(increment)"
                        class="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-sm font-medium transition-colors">
                  +{{ increment }} {{ keyResultData.data.unit }}
                </button>
              </div>
            </div>

            <!-- Status and Notes -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  [(ngModel)]="status"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="on_track">On Track</option>
                  <option value="at_risk">At Risk</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Confidence Level
                </label>
                <select
                  [(ngModel)]="confidenceLevel"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="1">1 - Very Low</option>
                  <option value="2">2 - Low</option>
                  <option value="3">3 - Medium</option>
                  <option value="4">4 - High</option>
                  <option value="5">5 - Very High</option>
                </select>
              </div>
            </div>

            <!-- Progress Notes -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Progress Notes
              </label>
              <textarea
                [(ngModel)]="notes"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add notes about current progress, challenges, or achievements..."
              ></textarea>
            </div>

            <!-- Progress Insights -->
            <div class="bg-blue-50 p-4 rounded-lg" *ngIf="getProgressInsight()">
              <div class="flex items-start space-x-3">
                <i class="fas fa-lightbulb text-blue-600 mt-1"></i>
                <div>
                  <h5 class="font-medium text-blue-900">Progress Insight</h5>
                  <p class="text-blue-700 text-sm mt-1">{{ getProgressInsight() }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            (click)="closeModal()"
            class="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            (click)="saveProgress()"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Update Progress
          </button>
        </div>
      </div>
    </div>
  `
})
export class KeyResultProgressModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() keyResultData: INode<KeyResult> | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<Partial<KeyResult>>();

  currentValue = 0;
  status = 'not_started';
  confidenceLevel = 3;
  notes = '';

  ngOnChanges() {
    if (this.keyResultData) {
      this.currentValue = this.keyResultData.data.current_value;
      this.status = this.keyResultData.data.status;
      this.confidenceLevel = this.keyResultData.data.confidence_level;
      this.notes = this.keyResultData.data.mentor_notes || '';
    }
  }

  calculateProgress(): number {
    if (!this.keyResultData) return 0;

    const baseline = this.keyResultData.data.baseline_value;
    const target = this.keyResultData.data.target_value;
    const current = this.currentValue;

    if (target === baseline) return current >= target ? 100 : 0;

    const progress = ((current - baseline) / (target - baseline)) * 100;
    return Math.max(0, Math.min(100, Math.round(progress)));
  }

  onCurrentValueChange() {
    // Auto-update status based on progress
    const progress = this.calculateProgress();
    if (progress >= 100) {
      this.status = 'completed';
    } else if (progress >= 70) {
      this.status = 'on_track';
    } else if (progress > 0) {
      this.status = 'in_progress';
    }
  }

  getQuickIncrements(): number[] {
    if (!this.keyResultData) return [];

    const target = this.keyResultData.data.target_value;
    const baseline = this.keyResultData.data.baseline_value;
    const range = target - baseline;

    // Generate increments based on the target range
    if (range <= 10) {
      return [1, 2, 5];
    } else if (range <= 100) {
      return [5, 10, 25];
    } else if (range <= 1000) {
      return [10, 50, 100];
    } else {
      return [100, 500, 1000];
    }
  }

  addIncrement(increment: number) {
    this.currentValue = Math.max(0, this.currentValue + increment);
    this.onCurrentValueChange();
  }

  getProgressInsight(): string {
    if (!this.keyResultData) return '';

    const progress = this.calculateProgress();
    const daysLeft = this.getDaysUntilTarget();

    if (progress >= 100) {
      return '🎉 Congratulations! You\'ve achieved this key result!';
    } else if (progress >= 90) {
      return '🔥 You\'re almost there! Just a little more to reach your target.';
    } else if (progress >= 70) {
      return '✅ Great progress! You\'re on track to meet your target.';
    } else if (progress >= 50) {
      return '📈 Good momentum! Consider what you can do to accelerate progress.';
    } else if (progress >= 25) {
      return '⚡ You\'ve made a start! Focus on consistent daily actions.';
    } else if (daysLeft < 30 && progress < 50) {
      return '⚠️ Time is running short. Consider adjusting your target or increasing effort.';
    } else {
      return '🚀 Ready to get started? Break this down into smaller actionable tasks.';
    }
  }

  private getDaysUntilTarget(): number {
    if (!this.keyResultData) return 0;

    const targetDate = new Date(this.keyResultData.data.target_date);
    const today = new Date();
    const diffTime = targetDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  closeModal() {
    this.close.emit();
  }

  saveProgress() {
    if (!this.keyResultData) return;

    const updatedData: Partial<KeyResult> = {
      current_value: this.currentValue,
      progress_percentage: this.calculateProgress(),
      status: this.status as any,
      confidence_level: this.confidenceLevel as any,
      mentor_notes: this.notes
    };

    this.save.emit(updatedData);
  }
}
