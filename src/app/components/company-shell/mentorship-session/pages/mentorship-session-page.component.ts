import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MentorshipSessionFacade } from '../services/mentorship-session.facade';
import { MentorshipSession, MentorshipSessionSummary, MentorshipSessionFormData } from '../../../../../models/mentorship.models';
import { MentorshipExportService } from '../../../../../services/mentorship-export.service';
import { AuthService } from '../../../../auth/auth.service';
import { MentorshipListComponent } from '../components/mentorship-list.component';
import { MentorshipFormComponent } from '../components/mentorship-form.component';
import { MentorshipViewComponent } from '../components/mentorship-view.component';

@Component({
  selector: 'app-mentorship-session-page',
  standalone: true,
  imports: [
    CommonModule,
    MentorshipListComponent,
    MentorshipFormComponent,
    MentorshipViewComponent,
  ],
  providers: [MentorshipSessionFacade],
  template: `
    <div class="p-4 lg:p-8">
      <div class="max-w-7xl mx-auto space-y-6">
        <!-- Page Header -->
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-bold text-gray-900">Log Book</h2>
            <p class="text-gray-600 text-sm mt-1">Record and track mentorship sessions</p>
          </div>
        </div>

        <!-- Toolbar -->
        <div class="flex items-center flex-wrap gap-2">
          <button (click)="openCreate()" class="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            New Session
          </button>
          <button (click)="loadAll()" class="inline-flex items-center px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50">
            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Refresh
          </button>
          <button (click)="exportLogbook()" class="inline-flex items-center px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50">
            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Export Logbook
          </button>
        </div>

        <!-- Loading overlay -->
        <div *ngIf="loading()" class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span class="ml-3 text-gray-500">Loading...</span>
        </div>

        <!-- Error -->
        <div *ngIf="error()" class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-sm">{{ error() }}</div>

        <!-- Summary Cards -->
        <div *ngIf="!loading() && summary() as s">
          <h3 class="text-lg font-semibold text-gray-900 mb-3">Summary</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="bg-white rounded-lg border border-gray-200 p-4">
              <p class="text-sm text-gray-500">Total Sessions</p>
              <p class="text-2xl font-bold text-gray-900">{{ s.totalSessions }}</p>
            </div>
            <div class="bg-white rounded-lg border border-gray-200 p-4">
              <p class="text-sm text-gray-500">Total Hours</p>
              <p class="text-2xl font-bold text-gray-900">{{ s.totalHours }}</p>
            </div>
            <div class="bg-white rounded-lg border border-gray-200 p-4">
              <p class="text-sm text-gray-500">Total Value</p>
              <p class="text-2xl font-bold text-gray-900">{{ s.totalValue | currency:'ZAR':'symbol':'1.0-0' }}</p>
            </div>
            <div class="bg-white rounded-lg border border-gray-200 p-4">
              <p class="text-sm text-gray-500">Last Session</p>
              <p class="text-2xl font-bold text-gray-900">{{ s.lastSessionDate || 'N/A' }}</p>
            </div>
          </div>
        </div>

        <!-- Sessions List -->
        <div *ngIf="!loading()">
          <h3 class="text-lg font-semibold text-gray-900 mb-3">Session Records</h3>
          <app-mentorship-list
            [sessions]="sessions()"
            (view)="viewSession($event)"
            (edit)="editSession($event)"
            (delete)="deleteSession($event)" />
        </div>
      </div>
    </div>

    <!-- Create/Edit Dialog -->
    <app-mentorship-form
      *ngIf="showForm()"
      [isEdit]="isEditing()"
      [initialData]="editingData()"
      [saving]="saving()"
      (close)="closeForm()"
      (save)="saveSession($event)" />

    <!-- View Dialog -->
    <app-mentorship-view
      *ngIf="showView()"
      [session]="viewingSession()"
      (close)="closeView()" />
  `
})
export class MentorshipSessionPageComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private facade: MentorshipSessionFacade,
    private exportService: MentorshipExportService,
    private authService: AuthService,
  ) {}

  companyId = signal<number>(0);
  companyName = signal<string>('');
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);

  summary = signal<MentorshipSessionSummary | null>(null);
  sessions = signal<MentorshipSession[]>([]);

  showForm = signal(false);
  isEditing = signal(false);
  editingData = signal<MentorshipSessionFormData | null>(null);
  editingId = signal<number | null>(null);

  showView = signal(false);
  viewingSession = signal<MentorshipSession | null>(null);

  ngOnInit(): void {
    this.route.parent?.parent?.params.subscribe(params => {
      const id = parseInt(params['id'], 10);
      if (id) {
        this.companyId.set(id);
        this.loadAll();
      }
    });
  }

  loadAll(): void {
    const cid = this.companyId();
    if (!cid) return;

    this.loading.set(true);
    this.error.set(null);

    this.facade.getSessionSummary(cid).subscribe({
      next: (s) => { this.summary.set(s); },
      error: () => {}
    });

    this.facade.getSessionsByCompany(cid).subscribe({
      next: (r) => { this.sessions.set(r); },
      error: () => {}
    });

    this.loading.set(false);
  }

  openCreate(): void {
    this.isEditing.set(false);
    this.editingData.set(null);
    this.editingId.set(null);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.isEditing.set(false);
    this.editingData.set(null);
    this.editingId.set(null);
  }

  saveSession(data: MentorshipSessionFormData): void {
    const cid = this.companyId();
    if (!cid) return;

    const user = this.authService.getUser();
    const mentorId = user?.id || 0;
    const mentorName = user?.full_name || user?.username || 'Unknown';

    this.saving.set(true);
    this.error.set(null);

    const obs = this.isEditing() && this.editingId()
      ? this.facade.updateSession(this.editingId()!, { ...data, companyId: cid, mentorId, mentorName })
      : this.facade.createSession(cid, mentorId, mentorName, data);

    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeForm();
        this.loadAll();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err.error?.error || 'Failed to save session');
      }
    });
  }

  viewSession(item: MentorshipSession): void {
    this.viewingSession.set(item);
    this.showView.set(true);
  }

  closeView(): void {
    this.showView.set(false);
    this.viewingSession.set(null);
  }

  editSession(item: MentorshipSession): void {
    this.isEditing.set(true);
    this.editingId.set(item.id ?? null);
    this.editingData.set({
      sessionDate: item.sessionDate,
      startTime: item.startTime,
      endTime: item.endTime,
      category: item.category,
      topic: item.topic,
      activities: item.activities,
      outcomes: item.outcomes,
      nextActions: item.nextActions,
      durationHours: item.durationHours,
      hourlyRate: item.hourlyRate,
      sessionValue: item.sessionValue,
      deliveryMethod: item.deliveryMethod,
      location: item.location,
      status: item.status,
    });
    this.showForm.set(true);
  }

  deleteSession(item: MentorshipSession): void {
    if (!confirm('Delete this mentorship session?')) return;
    if (!item.id) return;

    this.facade.deleteSession(item.id).subscribe({
      next: (success) => {
        if (success) {
          this.loadAll();
        } else {
          this.error.set('Failed to delete session');
        }
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Failed to delete');
      }
    });
  }

  exportLogbook(): void {
    const cid = this.companyId();
    if (!cid) return;
    const name = this.companyName() || `Company_${cid}`;
    this.exportService.exportLogbook(this.sessions(), name);
  }
}
