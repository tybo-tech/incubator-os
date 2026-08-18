import { Component, input, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MentorshipSessionFormData, SESSION_CATEGORIES, DELIVERY_METHODS, SESSION_STATUSES } from '../../../../../models/mentorship.models';

@Component({
  selector: 'app-mentorship-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">{{ isEdit() ? 'Edit Session' : 'New Session' }}</h3>
          <button (click)="close.emit()" class="p-1 text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="p-6 space-y-6">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Session Date</label>
              <input type="date" [(ngModel)]="formData.sessionDate" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select [(ngModel)]="formData.category" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="">Select category</option>
                <option *ngFor="let c of categories" [value]="c">{{ c }}</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Topic</label>
            <input type="text" [(ngModel)]="formData.topic" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Session topic" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input type="time" [(ngModel)]="formData.startTime" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input type="time" [(ngModel)]="formData.endTime" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Activities</label>
            <textarea [(ngModel)]="formData.activities" rows="3" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="What activities were conducted?"></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Outcomes</label>
            <textarea [(ngModel)]="formData.outcomes" rows="3" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="What was achieved?"></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Next Actions</label>
            <textarea [(ngModel)]="formData.nextActions" rows="3" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="What needs to happen next?"></textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Delivery Method</label>
              <select [(ngModel)]="formData.deliveryMethod" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="">Select method</option>
                <option *ngFor="let m of deliveryMethods" [value]="m">{{ m }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input type="text" [(ngModel)]="formData.location" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Venue or link" />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select [(ngModel)]="formData.status" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option *ngFor="let s of statuses" [value]="s">{{ s }}</option>
            </select>
          </div>
        </div>

        <div class="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-200">
          <button (click)="close.emit()" class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
          <button (click)="save.emit(formData)" [disabled]="saving()" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {{ saving() ? 'Saving...' : (isEdit() ? 'Update' : 'Create') }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class MentorshipFormComponent {
  isEdit = input(false);
  initialData = input<MentorshipSessionFormData | null>(null);
  saving = input(false);
  close = output<void>();
  save = output<MentorshipSessionFormData>();

  protected categories = SESSION_CATEGORIES;
  protected deliveryMethods = DELIVERY_METHODS;
  protected statuses = SESSION_STATUSES;

  protected formData: MentorshipSessionFormData = this.emptyForm();

  constructor() {
    effect(() => {
      const data = this.initialData();
      if (data) {
        this.formData = { ...data };
      } else {
        this.formData = this.emptyForm();
      }
    });
  }

  private emptyForm(): MentorshipSessionFormData {
    return {
      sessionDate: new Date().toISOString().split('T')[0],
      startTime: '',
      endTime: '',
      category: '',
      topic: '',
      activities: '',
      outcomes: '',
      nextActions: '',
      durationHours: 0,
      hourlyRate: 0,
      sessionValue: 0,
      deliveryMethod: '',
      location: '',
      status: 'Completed'
    };
  }
}
