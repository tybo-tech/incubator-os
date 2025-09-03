// sessions-tab.component.ts - Sessions feedback tracking component

import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SessionService } from '../../../../../services/session.service';
import { SessionFeedback, SessionSummary, SessionFormData } from '../../../../../models/session.models';

@Component({
  selector: 'app-sessions-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-7xl mx-auto px-6 py-8">
      <!-- Header with Summary -->
      <div class="mb-8">
        <div class="flex justify-between items-center mb-6">
          <div>
            <h2 class="text-2xl font-bold text-gray-900">Session Feedback</h2>
            <p class="text-gray-600 mt-1">Track coaching session feedback and progress</p>
          </div>
          <button
            (click)="showNewSessionForm = !showNewSessionForm"
            [class]="'px-4 py-2 rounded-lg font-medium transition-colors ' + (showNewSessionForm ? 'bg-gray-500 text-white hover:bg-gray-600' : 'bg-blue-600 text-white hover:bg-blue-700')"
          >
            {{ showNewSessionForm ? 'Cancel' : '+ New Session' }}
          </button>
        </div>

        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6" *ngIf="sessionSummary">
          <div class="bg-white p-6 rounded-lg border shadow-sm">
            <div class="flex items-center">
              <div class="p-2 bg-blue-100 rounded-lg">
                <span class="text-2xl">📅</span>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600">Total Sessions</p>
                <p class="text-2xl font-bold text-gray-900">{{ sessionSummary.total_sessions }}</p>
              </div>
            </div>
          </div>

          <div class="bg-white p-6 rounded-lg border shadow-sm">
            <div class="flex items-center">
              <div class="p-2 bg-yellow-100 rounded-lg">
                <span class="text-2xl">⭐</span>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600">Average Rating</p>
                <p class="text-2xl font-bold text-gray-900">{{ sessionSummary.average_rating }}/5</p>
              </div>
            </div>
          </div>

          <div class="bg-white p-6 rounded-lg border shadow-sm">
            <div class="flex items-center">
              <div class="p-2 bg-green-100 rounded-lg">
                <span class="text-2xl">🕒</span>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600">Last Session</p>
                <p class="text-lg font-bold text-gray-900">
                  {{ sessionSummary.last_session_date ? formatDate(sessionSummary.last_session_date) : 'No sessions yet' }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- New Session Form -->
      <div *ngIf="showNewSessionForm" class="bg-white p-6 rounded-lg border shadow-sm mb-8">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">New Session Feedback</h3>

        <form (ngSubmit)="saveSession()" #sessionForm="ngForm">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

            <!-- Session Date -->
            <div>
              <label for="sessionDate" class="block text-sm font-medium text-gray-700 mb-2">
                Session Date *
              </label>
              <input
                type="date"
                id="sessionDate"
                name="sessionDate"
                [(ngModel)]="formData.session_date"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
            </div>

            <!-- Session Rating -->
            <div>
              <label for="sessionRating" class="block text-sm font-medium text-gray-700 mb-2">
                How was the session? (1-5) *
              </label>
              <select
                id="sessionRating"
                name="sessionRating"
                [(ngModel)]="formData.session_rating"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select rating</option>
                <option value="1">1 - Poor</option>
                <option value="2">2 - Fair</option>
                <option value="3">3 - Good</option>
                <option value="4">4 - Very Good</option>
                <option value="5">5 - Excellent</option>
              </select>
            </div>

            <!-- Key Takeaways -->
            <div class="md:col-span-2">
              <label for="keyTakeaways" class="block text-sm font-medium text-gray-700 mb-2">
                What were your key takeaways? *
              </label>
              <textarea
                id="keyTakeaways"
                name="keyTakeaways"
                [(ngModel)]="formData.key_takeaways"
                required
                rows="3"
                placeholder="Describe the main insights and learnings from this session..."
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              ></textarea>
            </div>

            <!-- Next Session Focus -->
            <div class="md:col-span-2">
              <label for="nextSessionFocus" class="block text-sm font-medium text-gray-700 mb-2">
                What would you like to focus on at your next session? *
              </label>
              <textarea
                id="nextSessionFocus"
                name="nextSessionFocus"
                [(ngModel)]="formData.next_session_focus"
                required
                rows="3"
                placeholder="What areas or topics would you like to work on next?"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              ></textarea>
            </div>

            <!-- Other Comments -->
            <div class="md:col-span-2">
              <label for="otherComments" class="block text-sm font-medium text-gray-700 mb-2">
                Other comments
              </label>
              <textarea
                id="otherComments"
                name="otherComments"
                [(ngModel)]="formData.other_comments"
                rows="2"
                placeholder="Any additional feedback or comments..."
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              ></textarea>
            </div>

            <!-- Client Signature -->
            <div>
              <label for="clientSignature" class="block text-sm font-medium text-gray-700 mb-2">
                Client Signature *
              </label>
              <input
                type="text"
                id="clientSignature"
                name="clientSignature"
                [(ngModel)]="formData.client_signature"
                required
                placeholder="Type your full name"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
            </div>

            <!-- Consultant Name -->
            <div>
              <label for="consultantName" class="block text-sm font-medium text-gray-700 mb-2">
                Consultant Name
              </label>
              <input
                type="text"
                id="consultantName"
                name="consultantName"
                [(ngModel)]="formData.consultant_name"
                placeholder="Consultant/Coach name"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
            </div>
          </div>

          <!-- Form Actions -->
          <div class="flex justify-end space-x-4 mt-6 pt-4 border-t">
            <button
              type="button"
              (click)="cancelForm()"
              class="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              [disabled]="!sessionForm.valid || formData.is_submitting"
              class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {{ formData.is_submitting ? 'Saving...' : 'Save Session' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Sessions List -->
      <div class="bg-white rounded-lg border shadow-sm">
        <div class="px-6 py-4 border-b">
          <h3 class="text-lg font-semibold text-gray-900">Session History</h3>
        </div>

        <div *ngIf="loading" class="p-8 text-center">
          <div class="spinner animate-spin inline-block w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
          <p class="text-gray-600 mt-2">Loading sessions...</p>
        </div>

        <div *ngIf="!loading && sessions.length === 0" class="p-8 text-center">
          <div class="text-6xl mb-4">📝</div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No sessions recorded yet</h3>
          <p class="text-gray-600 mb-4">Start tracking your coaching sessions by creating your first session feedback.</p>
          <button
            (click)="showNewSessionForm = true"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Record First Session
          </button>
        </div>

        <div *ngIf="!loading && sessions.length > 0" class="divide-y">
          <div
            *ngFor="let session of sessions; trackBy: trackBySessionId"
            class="p-6 hover:bg-gray-50 transition-colors"
          >
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <div class="flex items-center space-x-4 mb-3">
                  <div class="flex items-center space-x-2">
                    <span class="text-lg font-semibold text-gray-900">
                      {{ formatDate(session.session_date) }}
                    </span>
                    <div class="flex items-center space-x-1">
                      <span *ngFor="let star of getStarArray(session.session_rating)"
                            class="text-yellow-400">⭐</span>
                      <span class="text-sm text-gray-500 ml-1">({{ session.session_rating }}/5)</span>
                    </div>
                  </div>
                </div>

                <div class="space-y-3">
                  <div>
                    <h4 class="text-sm font-medium text-gray-700 mb-1">Key Takeaways:</h4>
                    <p class="text-gray-900">{{ session.key_takeaways }}</p>
                  </div>

                  <div>
                    <h4 class="text-sm font-medium text-gray-700 mb-1">Next Session Focus:</h4>
                    <p class="text-gray-900">{{ session.next_session_focus }}</p>
                  </div>

                  <div *ngIf="session.other_comments">
                    <h4 class="text-sm font-medium text-gray-700 mb-1">Additional Comments:</h4>
                    <p class="text-gray-900">{{ session.other_comments }}</p>
                  </div>

                  <div class="flex justify-between items-center pt-2 text-sm text-gray-500">
                    <span>Signed by: {{ session.client_signature }}</span>
                    <span *ngIf="session.consultant_name">Consultant: {{ session.consultant_name }}</span>
                  </div>
                </div>
              </div>

              <div class="ml-4 flex space-x-2">
                <button
                  (click)="editSession(session)"
                  class="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Edit
                </button>
                <button
                  (click)="deleteSession(session.id!)"
                  class="text-red-600 hover:text-red-800 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .spinner {
      border-top-color: #3b82f6;
    }
  `]
})
export class SessionsTabComponent implements OnInit {
  @Input() company!: { id: number; name: string };

  sessions: SessionFeedback[] = [];
  sessionSummary: SessionSummary | null = null;
  loading = true;
  showNewSessionForm = false;

  formData: SessionFormData = {
    session_date: new Date().toISOString().split('T')[0], // Today's date
    session_rating: 0,
    key_takeaways: '',
    next_session_focus: '',
    other_comments: '',
    client_signature: '',
    consultant_name: '',
    is_submitting: false
  };

  constructor(private sessionService: SessionService) {}

  ngOnInit() {
    this.loadSessions();
  }

  loadSessions() {
    this.loading = true;

    // Load sessions and summary
    this.sessionService.getSessionsByCompany(this.company.id).subscribe({
      next: (sessions) => {
        this.sessions = sessions;
        this.loading = false;
        this.loadSummary();
      },
      error: (error) => {
        console.error('Error loading sessions:', error);
        this.loading = false;
      }
    });
  }

  loadSummary() {
    this.sessionService.getSessionSummary(this.company.id).subscribe({
      next: (summary) => {
        this.sessionSummary = summary;
      },
      error: (error) => {
        console.error('Error loading session summary:', error);
      }
    });
  }

  saveSession() {
    if (this.formData.is_submitting) return;

    this.formData.is_submitting = true;

    const sessionData = {
      session_date: this.formData.session_date,
      session_rating: Number(this.formData.session_rating),
      key_takeaways: this.formData.key_takeaways,
      next_session_focus: this.formData.next_session_focus,
      other_comments: this.formData.other_comments,
      client_signature: this.formData.client_signature,
      consultant_name: this.formData.consultant_name
    };

    this.sessionService.createSession(this.company.id, sessionData).subscribe({
      next: (newSession) => {
        this.sessions.unshift(newSession); // Add to top of list
        this.resetForm();
        this.showNewSessionForm = false;
        this.loadSummary(); // Refresh summary
        this.showSuccessMessage('Session feedback saved successfully!');
      },
      error: (error) => {
        console.error('Error saving session:', error);
        this.showErrorMessage('Failed to save session. Please try again.');
        this.formData.is_submitting = false;
      }
    });
  }

  editSession(session: SessionFeedback) {
    // For now, just populate the form with existing data
    this.formData = {
      session_date: session.session_date,
      session_rating: session.session_rating,
      key_takeaways: session.key_takeaways,
      next_session_focus: session.next_session_focus,
      other_comments: session.other_comments || '',
      client_signature: session.client_signature || '',
      consultant_name: session.consultant_name || '',
      is_submitting: false
    };
    this.showNewSessionForm = true;
  }

  deleteSession(sessionId: number) {
    if (confirm('Are you sure you want to delete this session feedback?')) {
      this.sessionService.deleteSession(sessionId).subscribe({
        next: () => {
          this.sessions = this.sessions.filter(s => s.id !== sessionId);
          this.loadSummary();
          this.showSuccessMessage('Session deleted successfully!');
        },
        error: (error) => {
          console.error('Error deleting session:', error);
          this.showErrorMessage('Failed to delete session. Please try again.');
        }
      });
    }
  }

  cancelForm() {
    this.resetForm();
    this.showNewSessionForm = false;
  }

  resetForm() {
    this.formData = {
      session_date: new Date().toISOString().split('T')[0],
      session_rating: 0,
      key_takeaways: '',
      next_session_focus: '',
      other_comments: '',
      client_signature: '',
      consultant_name: '',
      is_submitting: false
    };
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getStarArray(rating: number): number[] {
    return Array(rating).fill(0);
  }

  trackBySessionId(index: number, session: SessionFeedback): number {
    return session.id || index;
  }

  private showSuccessMessage(message: string) {
    // You can implement toast notification here
    console.log('Success:', message);
  }

  private showErrorMessage(message: string) {
    // You can implement toast notification here
    console.error('Error:', message);
  }
}
