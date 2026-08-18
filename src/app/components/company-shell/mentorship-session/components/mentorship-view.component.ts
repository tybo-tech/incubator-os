import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MentorshipSession } from '../../../../../models/mentorship.models';

@Component({
  selector: 'app-mentorship-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" (click)="close.emit()">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto mx-4" (click)="$event.stopPropagation()">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">Mentorship Session</h3>
          <button (click)="close.emit()" class="p-1 text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="p-6 space-y-4" *ngIf="session() as s">
          <div class="flex items-center justify-between">
            <div>
              <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">{{ s.category }}</span>
              <span class="ml-2 inline-flex px-2 py-1 text-xs font-medium rounded-full"
                [class.bg-green-100]="s.status === 'Completed'"
                [class.text-green-800]="s.status === 'Completed'"
                [class.bg-yellow-100]="s.status === 'Rescheduled'"
                [class.text-yellow-800]="s.status === 'Rescheduled'"
                [class.bg-red-100]="s.status === 'Cancelled'"
                [class.text-red-800]="s.status === 'Cancelled'">
                {{ s.status }}
              </span>
            </div>
            <span class="text-sm text-gray-500">{{ s.sessionDate }}</span>
          </div>

          <div>
            <h4 class="text-sm font-semibold text-gray-800 mb-1">Topic</h4>
            <p class="text-sm text-gray-700">{{ s.topic }}</p>
          </div>

          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-gray-500">Mentor:</span>
              <p class="font-medium text-gray-900">{{ s.mentorName }}</p>
            </div>
            <div>
              <span class="text-gray-500">Delivery:</span>
              <p class="font-medium text-gray-900">{{ s.deliveryMethod || 'N/A' }}</p>
            </div>
            <div>
              <span class="text-gray-500">Time:</span>
              <p class="font-medium text-gray-900">{{ s.startTime || 'N/A' }} - {{ s.endTime || 'N/A' }}</p>
            </div>
            <div>
              <span class="text-gray-500">Location:</span>
              <p class="font-medium text-gray-900">{{ s.location || 'N/A' }}</p>
            </div>
          </div>

          <div>
            <h4 class="text-sm font-semibold text-gray-800 mb-1">Activities</h4>
            <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ s.activities || 'None recorded' }}</p>
          </div>

          <div>
            <h4 class="text-sm font-semibold text-gray-800 mb-1">Outcomes</h4>
            <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ s.outcomes || 'None recorded' }}</p>
          </div>

          <div>
            <h4 class="text-sm font-semibold text-gray-800 mb-1">Next Actions</h4>
            <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ s.nextActions || 'None recorded' }}</p>
          </div>

          <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div class="grid grid-cols-3 gap-4 text-sm">
              <div><span class="text-blue-600">Hours:</span> <strong>{{ s.durationHours }}</strong></div>
              <div><span class="text-blue-600">Rate:</span> <strong>R{{ (s.hourlyRate || 0).toLocaleString() }}</strong></div>
              <div><span class="text-blue-600">Value:</span> <strong>R{{ (s.sessionValue || 0).toLocaleString() }}</strong></div>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end px-6 py-4 border-t border-gray-200">
          <button (click)="close.emit()" class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Close</button>
        </div>
      </div>
    </div>
  `
})
export class MentorshipViewComponent {
  session = input.required<MentorshipSession | null>();
  close = output<void>();
}
