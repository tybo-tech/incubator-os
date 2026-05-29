import { Component, Input, OnInit, signal, computed, inject } from '@angular/core';
import { switchMap } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  PresentationScheduleService,
  IPresentationSchedule,
  IScheduleListItem,
  IScheduleBreak,
  IScheduleSlot,
  ITimetableRow,
} from './services/presentation-schedule.service';
import { GrantApplicationService } from './services/grant-application.service';
import { WorkflowService } from './services/workflow.service';
import { GrantApplication } from './interfaces/grant-application.interfaces';
import { IScheduleReference } from './interfaces/grant-application.interfaces';
import { PdfService } from '../../../services/pdf/pdf.service';

// ─── Types ───────────────────────────────────────────────────────────────────

type ViewMode = 'list' | 'editor';

@Component({
  selector: 'app-presentation-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-1">

      <!-- ═══════════════════════════════════════════════════════════════════
           LIST VIEW
      ════════════════════════════════════════════════════════════════════════ -->
      <ng-container *ngIf="view() === 'list'">

        <!-- Toolbar -->
        <div class="flex items-center justify-between gap-3 mb-5">
          <div>
            <h3 class="text-base font-semibold text-gray-800">Presentation Schedules</h3>
            <p class="text-xs text-gray-500 mt-0.5">
              Create and manage pitch presentation timetables for this workflow.
            </p>
          </div>
          <div class="flex items-center gap-2">
            <!-- Refresh -->
            <button
              (click)="loadList()"
              [disabled]="isLoadingList()"
              class="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-600 rounded-lg
                     hover:bg-gray-50 transition-colors text-sm disabled:opacity-50">
              <svg class="w-4 h-4" [class.animate-spin]="isLoadingList()" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              <span class="hidden sm:inline">Refresh</span>
            </button>
            <!-- New Schedule -->
            <button
              (click)="newSchedule()"
              class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg
                     hover:bg-blue-700 transition-colors text-sm font-medium">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              New Schedule
            </button>
          </div>
        </div>

        <!-- Loading -->
        <div *ngIf="isLoadingList()" class="flex justify-center items-center py-16">
          <div class="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div>
          <span class="ml-3 text-gray-500 text-sm">Loading schedules…</span>
        </div>

        <!-- Error -->
        <div *ngIf="listError() && !isLoadingList()"
             class="bg-red-50 border border-red-200 rounded-lg p-5 text-center">
          <p class="text-red-600 text-sm mb-3">{{ listError() }}</p>
          <button (click)="loadList()" class="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">
            Try Again
          </button>
        </div>

        <!-- Empty state -->
        <div *ngIf="!isLoadingList() && !listError() && schedules().length === 0"
             class="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
          <svg class="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          <p class="text-sm font-medium text-gray-600 mb-1">No schedules yet</p>
          <p class="text-xs text-gray-400 mb-4">Create your first presentation schedule to get started.</p>
          <button
            (click)="newSchedule()"
            class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium">
            Create Schedule
          </button>
        </div>

        <!-- Schedule cards -->
        <div *ngIf="!isLoadingList() && schedules().length > 0"
             class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            *ngFor="let s of schedules()"
            class="bg-white border border-gray-200 rounded-xl shadow-sm hover:border-blue-300
                   hover:shadow-md transition-all cursor-pointer group"
            (click)="openSchedule(s.id)">

            <!-- Card top -->
            <div class="px-4 py-4 border-b border-gray-100">
              <div class="flex items-start justify-between gap-2">
                <div class="flex-1 min-w-0">
                  <p class="font-semibold text-gray-900 truncate">{{ s.title }}</p>
                  <p class="text-xs text-gray-500 mt-0.5 truncate">{{ s.location || '—' }}</p>
                </div>
                <span class="flex-shrink-0 text-xs font-semibold bg-blue-50 text-blue-700
                             px-2 py-0.5 rounded-full tabular-nums">
                  {{ s.slot_count }} presenter{{ s.slot_count !== 1 ? 's' : '' }}
                </span>
              </div>
            </div>

            <!-- Card meta -->
            <div class="px-4 py-3 flex items-center justify-between gap-2">
              <div class="flex items-center gap-1.5 text-xs text-gray-500">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                {{ formatDate(s.date) }}
              </div>
              <div class="flex items-center gap-1">
                <!-- Edit -->
                <button
                  (click)="$event.stopPropagation(); openSchedule(s.id)"
                  class="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  title="Edit schedule">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </button>
                <!-- Delete -->
                <button
                  (click)="$event.stopPropagation(); confirmDelete(s)"
                  class="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Delete schedule">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
            </div>

          </div>
        </div>

      </ng-container><!-- /list view -->


      <!-- ═══════════════════════════════════════════════════════════════════
           EDITOR VIEW
      ════════════════════════════════════════════════════════════════════════ -->
      <ng-container *ngIf="view() === 'editor'">

        <!-- Editor header -->
        <div class="flex items-center gap-3 mb-6">
          <button
            (click)="backToList()"
            class="p-2 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 transition-colors flex-shrink-0"
            title="Back to list">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div class="flex-1">
            <h3 class="text-base font-semibold text-gray-900">
              {{ editingId() ? 'Edit Schedule' : 'New Schedule' }}
            </h3>
            <p class="text-xs text-gray-500 mt-0.5">
              {{ editingId() ? 'Update schedule details and timetable' : 'Set up a new presentation timetable' }}
            </p>
          </div>
          <!-- Action buttons -->
          <div class="flex items-center gap-2 flex-shrink-0">
            <button
              *ngIf="editingId() && timetable().length > 0"
              (click)="exportPdf()"
              [disabled]="isExporting()"
              class="flex items-center gap-2 px-3.5 py-2 border border-red-300 text-red-700 rounded-lg
                     hover:bg-red-50 transition-colors text-sm disabled:opacity-50">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
              </svg>
              {{ isExporting() ? 'Exporting…' : 'Export PDF' }}
            </button>
            <button
              (click)="saveSchedule()"
              [disabled]="isSaving()"
              class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg
                     hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M5 13l4 4L19 7"/>
              </svg>
              {{ isSaving() ? 'Saving…' : 'Save Schedule' }}
            </button>
          </div>
        </div>

        <!-- Save error -->
        <div *ngIf="saveError()"
             class="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          {{ saveError() }}
        </div>

        <!-- Two-column layout: form on left, timetable on right -->
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">

          <!-- ── LEFT PANEL: Schedule Settings ── -->
          <div class="space-y-5">

            <!-- ─── Schedule Header Card ─── -->
            <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div class="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <h4 class="text-sm font-semibold text-gray-700">Schedule Details</h4>
              </div>
              <div class="p-4 space-y-3">
                <!-- Title -->
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Group / Title <span class="text-red-500">*</span></label>
                  <input type="text" [(ngModel)]="form.title" placeholder="e.g. GROUP B"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
                <!-- Date + Location row -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Date <span class="text-red-500">*</span></label>
                    <input type="date" [(ngModel)]="form.date"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Start Time <span class="text-red-500">*</span></label>
                    <input type="time" [(ngModel)]="form.start_time"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  </div>
                </div>
                <!-- Location -->
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Location</label>
                  <input type="text" [(ngModel)]="form.location"
                    placeholder="e.g. SOUTH32 ESD CENTRE TRAINING ROOM"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
                <!-- Slot duration -->
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">
                    Slot Duration (minutes) <span class="text-red-500">*</span>
                  </label>
                  <div class="flex items-center gap-2">
                    <input type="number" [(ngModel)]="form.slot_duration" min="1" max="120"
                      class="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <span class="text-xs text-gray-400">minutes per presenter</span>
                  </div>
                </div>
                <!-- Description -->
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Description / Notes</label>
                  <textarea [(ngModel)]="form.description" rows="3"
                    placeholder="e.g. Applicants will be provided with 10 minutes to present..."
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"></textarea>
                </div>
              </div>
            </div><!-- /schedule header card -->

            <!-- ─── Breaks Card ─── -->
            <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div class="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <svg class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <h4 class="text-sm font-semibold text-gray-700">Breaks</h4>
                  <span class="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {{ form.breaks.length }}
                  </span>
                </div>
                <button
                  (click)="addBreak()"
                  class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-amber-300
                         text-amber-700 rounded-lg hover:bg-amber-50 transition-colors">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                  </svg>
                  Add Break
                </button>
              </div>

              <div *ngIf="form.breaks.length === 0"
                   class="px-4 py-6 text-center text-xs text-gray-400 italic">
                No breaks configured. Add a break to insert gaps in the timetable.
              </div>

              <div class="divide-y divide-gray-100">
                <div *ngFor="let brk of form.breaks; let bi = index"
                     class="px-4 py-3 flex flex-wrap items-end gap-3">
                  <div>
                    <label class="block text-[10px] text-gray-500 mb-1 uppercase tracking-wide font-medium">After Slot #</label>
                    <input type="number" [(ngModel)]="brk.after_slot" min="1"
                      [max]="form.slots.length"
                      class="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm
                             focus:ring-2 focus:ring-amber-400 focus:border-transparent">
                  </div>
                  <div>
                    <label class="block text-[10px] text-gray-500 mb-1 uppercase tracking-wide font-medium">Duration (min)</label>
                    <input type="number" [(ngModel)]="brk.duration" min="1" max="120"
                      class="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm
                             focus:ring-2 focus:ring-amber-400 focus:border-transparent">
                  </div>
                  <div class="flex-1">
                    <label class="block text-[10px] text-gray-500 mb-1 uppercase tracking-wide font-medium">Label</label>
                    <input type="text" [(ngModel)]="brk.label" placeholder="e.g. 15 Minute Break"
                      class="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm
                             focus:ring-2 focus:ring-amber-400 focus:border-transparent">
                  </div>
                  <button
                    (click)="removeBreak(bi)"
                    class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                    title="Remove break">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div><!-- /breaks card -->

            <!-- ─── Presenters Card ─── -->
            <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div class="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                  </svg>
                  <h4 class="text-sm font-semibold text-gray-700">Presenters</h4>
                  <span class="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {{ form.slots.length }}
                  </span>
                </div>
                <button
                  (click)="addManualSlot()"
                  class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-gray-300
                         text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                  </svg>
                  Add Manually
                </button>
              </div>

              <!-- Applicant picker button -->
              <div class="px-4 pt-3 pb-2 border-b border-gray-100">
                <button
                  (click)="openPickerModal()"
                  [disabled]="isLoadingApplicants()"
                  class="flex items-center gap-2 px-4 py-2 border border-blue-300 text-blue-700 rounded-lg
                         hover:bg-blue-50 transition-colors text-sm font-medium w-full justify-center
                         disabled:opacity-50 disabled:cursor-not-allowed">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  {{ isLoadingApplicants() ? 'Loading applicants…' : 'Browse & Add Applicants' }}
                </button>
              </div>

              <!-- Slot list -->
              <div *ngIf="form.slots.length === 0"
                   class="px-4 py-6 text-center text-xs text-gray-400 italic">
                No presenters added yet.
              </div>

              <div cdkDropList class="divide-y divide-gray-100">
                <div *ngFor="let slot of form.slots; let si = index"
                     class="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 group">
                  <!-- Drag handle -->
                  <svg class="w-4 h-4 text-gray-300 cursor-move flex-shrink-0 group-hover:text-gray-400"
                       fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M4 6h16M4 12h16M4 18h16"/>
                  </svg>
                  <!-- Number badge -->
                  <span class="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs
                               font-bold flex items-center justify-center flex-shrink-0">
                    {{ si + 1 }}
                  </span>
                  <!-- Name (editable) -->
                  <input type="text" [(ngModel)]="slot.applicant_name"
                    placeholder="Presenter name"
                    class="flex-1 px-2 py-1 border border-transparent rounded text-sm text-gray-800
                           hover:border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-300
                           focus:outline-none bg-transparent transition-colors">
                  <!-- Move up / down -->
                  <button
                    *ngIf="si > 0"
                    (click)="moveSlot(si, -1)"
                    class="p-1 text-gray-300 hover:text-gray-600 transition-colors flex-shrink-0"
                    title="Move up">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>
                    </svg>
                  </button>
                  <button
                    *ngIf="si < form.slots.length - 1"
                    (click)="moveSlot(si, 1)"
                    class="p-1 text-gray-300 hover:text-gray-600 transition-colors flex-shrink-0"
                    title="Move down">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                    </svg>
                  </button>
                  <!-- Remove -->
                  <button
                    (click)="removeSlot(si)"
                    class="p-1 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                    title="Remove">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              </div>

            </div><!-- /presenters card -->

          </div><!-- /left panel -->


          <!-- ── RIGHT PANEL: Live Timetable Preview ── -->
          <div>
            <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden sticky top-4">

              <!-- Preview header -->
              <div class="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <h4 class="text-sm font-semibold text-gray-700">Timetable Preview</h4>
                <span class="ml-auto text-xs text-gray-400">
                  {{ form.slots.length }} presenters · {{ form.slot_duration }}min slots
                </span>
              </div>

              <!-- Schedule title block -->
              <div *ngIf="form.title" class="px-4 pt-4 pb-2">
                <p class="text-lg font-bold text-gray-900">{{ form.title }}</p>
                <div *ngIf="form.date || form.location" class="mt-1 text-sm text-gray-600 space-y-0.5">
                  <p *ngIf="form.date">{{ formatDate(form.date) }}</p>
                  <p *ngIf="form.location" class="text-xs text-gray-500">{{ form.location }}</p>
                </div>
                <p *ngIf="form.description" class="mt-2 text-xs text-gray-500 leading-relaxed italic border-l-2 border-gray-200 pl-2">
                  {{ form.description }}
                </p>
              </div>

              <!-- Empty state -->
              <div *ngIf="timetable().length === 0"
                   class="px-4 py-10 text-center text-xs text-gray-400 italic">
                Add presenters to see the timetable preview.
              </div>

              <!-- Table -->
              <div *ngIf="timetable().length > 0" class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="text-center px-3 py-2.5 text-xs font-semibold text-gray-500 w-10">#</th>
                      <th class="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 w-20">Start</th>
                      <th class="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 w-20">End</th>
                      <th class="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">Applicant</th>
                    </tr>
                  </thead>
                  <tbody>
                    <ng-container *ngFor="let row of timetable()">
                      <!-- Break row -->
                      <tr *ngIf="row.type === 'break'"
                          class="bg-amber-50 border-t border-amber-100">
                        <td colspan="4" class="px-3 py-2.5">
                          <div class="flex items-center gap-2">
                            <svg class="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <span class="text-xs font-semibold text-amber-700">{{ row.label }}</span>
                            <span class="text-xs text-amber-500 ml-auto tabular-nums">
                              {{ row.start_time }} – {{ row.end_time }}
                            </span>
                          </div>
                        </td>
                      </tr>
                      <!-- Slot row -->
                      <tr *ngIf="row.type === 'slot'"
                          class="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                        <td class="px-3 py-2.5 text-center">
                          <span class="text-xs font-bold text-gray-500 tabular-nums">{{ row.number }}</span>
                        </td>
                        <td class="px-3 py-2.5 text-xs text-gray-600 tabular-nums font-medium">{{ row.start_time }}</td>
                        <td class="px-3 py-2.5 text-xs text-gray-600 tabular-nums">{{ row.end_time }}</td>
                        <td class="px-3 py-2.5 text-sm text-gray-800 font-medium">{{ row.applicant_name }}</td>
                      </tr>
                    </ng-container>
                  </tbody>
                </table>
              </div>

              <!-- End time summary -->
              <div *ngIf="timetable().length > 0 && endTime()"
                   class="px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 text-right">
                Session ends at <strong class="text-gray-700">{{ endTime() }}</strong>
              </div>

            </div>
          </div><!-- /right panel -->

        </div><!-- /two-column grid -->

      </ng-container><!-- /editor view -->

    </div>


    <!-- ═══════════════════════════════════════════════════════════════════
         APPLICANT PICKER MODAL
    ════════════════════════════════════════════════════════════════════════ -->
    <div *ngIf="showPickerModal()"
         class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
         (click)="showPickerModal.set(false)">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
           (click)="$event.stopPropagation()">

        <!-- Modal header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h3 class="text-base font-bold text-gray-900">Add Applicants to Schedule</h3>
            <p class="text-xs text-gray-500 mt-0.5">Click an applicant to add them as a presenter slot.</p>
          </div>
          <button
            (click)="showPickerModal.set(false)"
            class="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Search + stage filter -->
        <div class="px-5 py-3 border-b border-gray-100 space-y-2 bg-gray-50">
          <input
            type="text"
            [ngModel]="pickerSearch()"
            (ngModelChange)="pickerSearch.set($event)"
            placeholder="Search by company name…"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
          <!-- Stage filter pills -->
          <div class="flex flex-wrap gap-1.5">
            <button
              (click)="pickerStageFilter.set(null)"
              [class]="!pickerStageFilter()
                ? 'px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-800 text-white'
                : 'px-2.5 py-1 text-xs font-medium rounded-full bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'">
              All Stages
            </button>
            <button
              *ngFor="let stage of workflowStages()"
              (click)="pickerStageFilter.set(stage.key)"
              [class]="pickerStageFilter() === stage.key
                ? 'px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-800 text-white'
                : 'px-2.5 py-1 text-xs font-medium rounded-full bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'">
              {{ stage.label }}
            </button>
          </div>
        </div>

        <!-- Applicant list -->
        <div class="overflow-y-auto flex-1">
          <div *ngIf="filteredApplicants().length === 0"
               class="py-12 text-center text-sm text-gray-400 italic">
            No applicants match your search / filter.
          </div>
          <button
            *ngFor="let ap of filteredApplicants()"
            (click)="addApplicantSlot(ap)"
            [disabled]="isAlreadyInSlots(ap.id)"
            class="w-full text-left px-5 py-3 hover:bg-blue-50 transition-colors
                   flex items-center justify-between gap-3 border-b border-gray-50 last:border-0
                   disabled:opacity-60 disabled:cursor-default">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-teal-600
                          flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {{ (ap.data.company_name || '?')[0].toUpperCase() }}
              </div>
              <div class="min-w-0">
                <p class="font-semibold text-gray-900 text-sm leading-tight truncate">
                  {{ ap.data.company_name }}
                </p>
                <p class="text-[10px] text-gray-400 mt-0.5">
                  {{ ap.data.province || '—' }} &middot; {{ ap.data.status }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <span *ngIf="isAlreadyInSlots(ap.id)"
                    class="text-[10px] text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                Added
              </span>
              <svg *ngIf="!isAlreadyInSlots(ap.id)"
                   class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
            </div>
          </button>
        </div>

        <!-- Modal footer -->
        <div class="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <span class="text-xs text-gray-500">
            {{ filteredApplicants().length }} shown &middot; {{ form.slots.length }} in schedule
          </span>
          <button
            (click)="showPickerModal.set(false)"
            class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium">
            Done
          </button>
        </div>

      </div>
    </div><!-- /applicant picker modal -->


  `
})
export class PresentationScheduleComponent implements OnInit {

  @Input() workflowId = 'grant-2026';

  private scheduleSvc = inject(PresentationScheduleService);
  private grantAppSvc = inject(GrantApplicationService);
  private workflowSvc = inject(WorkflowService);
  private pdfService  = inject(PdfService);

  // ── View state ────────────────────────────────────────────────────────────
  view        = signal<ViewMode>('list');
  editingId   = signal<number | null>(null);

  // ── List state ────────────────────────────────────────────────────────────
  schedules      = signal<IScheduleListItem[]>([]);
  isLoadingList  = signal(false);
  listError      = signal<string | null>(null);

  // ── Editor state ──────────────────────────────────────────────────────────
  form: IPresentationSchedule = this._emptyForm();
  isSaving    = signal(false);
  saveError   = signal<string | null>(null);
  isExporting = signal(false);

  // ── Applicant picker ──────────────────────────────────────────────────────
  allApplicants       = signal<GrantApplication[]>([]);
  isLoadingApplicants = signal(false);
  showPickerModal     = signal(false);
  pickerSearch        = signal('');
  pickerStageFilter   = signal<string | null>(null);
  workflowStages      = signal<Array<{ key: string; label: string; color: string }>>([]);

  filteredApplicants = computed(() => {
    const q     = this.pickerSearch().trim().toLowerCase();
    const stage = this.pickerStageFilter();
    return this.allApplicants().filter(ap => {
      const name       = (ap.data?.company_name ?? '').toLowerCase();
      const matchSearch = !q || name.includes(q);
      const matchStage  = !stage || ap.data?.status === stage;
      return matchSearch && matchStage;
    });
  });

  // ── Live timetable (computed from form state) ─────────────────────────────
  timetable = computed<ITimetableRow[]>(() => {
    if (!this.form.slots.length || !this.form.start_time || !this.form.slot_duration) return [];
    return this.scheduleSvc.buildTimetable(this.form);
  });

  endTime = computed<string>(() => {
    const rows = this.timetable();
    if (!rows.length) return '';
    return rows[rows.length - 1].end_time;
  });

  // ─────────────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadList();
    this.loadApplicants();
    this._loadWorkflowStages();
  }

  // ── List actions ──────────────────────────────────────────────────────────

  loadList(): void {
    this.isLoadingList.set(true);
    this.listError.set(null);
    this.scheduleSvc.list(this.workflowId).subscribe({
      next: data => { this.schedules.set(data); this.isLoadingList.set(false); },
      error: err => {
        this.listError.set(err?.error?.error ?? 'Failed to load schedules');
        this.isLoadingList.set(false);
      },
    });
  }

  newSchedule(): void {
    this.form = this._emptyForm();
    this.editingId.set(null);
    this.saveError.set(null);
    this.view.set('editor');
  }

  openSchedule(id: number): void {
    this.saveError.set(null);
    this.scheduleSvc.get(id).subscribe({
      next: sched => {
        this.form = { ...sched };
        this.editingId.set(id);
        this.view.set('editor');
      },
      error: () => alert('Could not load schedule.'),
    });
  }

  confirmDelete(item: IScheduleListItem): void {
    if (!confirm(`Delete schedule "${item.title}"? This cannot be undone.`)) return;
    this.scheduleSvc.delete(item.id).subscribe({
      next: () => this.loadList(),
      error: () => alert('Failed to delete schedule.'),
    });
  }

  backToList(): void {
    this.view.set('list');
    this.loadList();
  }

  // ── Editor actions ────────────────────────────────────────────────────────

  saveSchedule(): void {
    this.saveError.set(null);
    if (!this.form.title?.trim()) { this.saveError.set('Title is required.'); return; }
    if (!this.form.date)          { this.saveError.set('Date is required.'); return; }
    if (!this.form.start_time)    { this.saveError.set('Start time is required.'); return; }
    if (!this.form.slot_duration || this.form.slot_duration < 1) {
      this.saveError.set('Slot duration must be at least 1 minute.'); return;
    }

    const payload: Omit<IPresentationSchedule, 'id' | 'created_at'> = {
      title:         this.form.title.trim(),
      workflow_id:   this.workflowId,
      date:          this.form.date,
      location:      this.form.location?.trim() ?? '',
      description:   this.form.description?.trim() ?? '',
      start_time:    this.form.start_time,
      slot_duration: +this.form.slot_duration,
      breaks:        this.form.breaks,
      slots:         this.form.slots.map((s, i) => ({ ...s, number: i + 1 })),
    };

    this.isSaving.set(true);
    const op$ = this.editingId()
      ? this.scheduleSvc.update(this.editingId()!, payload)
      : this.scheduleSvc.create(payload);

    op$.subscribe({
      next: saved => {
        this.editingId.set(saved.id ?? null);
        this.form = { ...saved };
        this.isSaving.set(false);
        this._patchApplicantsWithScheduleRef(saved);
      },
      error: err => {
        this.saveError.set(err?.error?.error ?? 'Failed to save schedule.');
        this.isSaving.set(false);
      },
    });
  }

  exportPdf(): void {
    this.isExporting.set(true);
    const html = this._buildPdfHtml();
    const slug = (this.form.title ?? 'Schedule').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
    this.pdfService.downloadPdf(html, `Presentation_Schedule_${slug}_${this._dateStamp()}.pdf`, 'A4', 'portrait');
    this.isExporting.set(false);
  }

  // ── Break actions ─────────────────────────────────────────────────────────

  addBreak(): void {
    this.form.breaks = [
      ...this.form.breaks,
      { after_slot: this.form.slots.length, duration: 15, label: '15 Minute Break' },
    ];
  }

  removeBreak(index: number): void {
    this.form.breaks = this.form.breaks.filter((_, i) => i !== index);
  }

  // ── Slot actions ──────────────────────────────────────────────────────────

  addManualSlot(): void {
    this.form.slots = [
      ...this.form.slots,
      { number: this.form.slots.length + 1, applicant_id: null, applicant_name: '' },
    ];
  }

  openPickerModal(): void {
    this.pickerSearch.set('');
    this.pickerStageFilter.set(null);
    this.showPickerModal.set(true);
  }

  addApplicantSlot(ap: GrantApplication): void {
    if (this.isAlreadyInSlots(ap.id)) return;
    this.form.slots = [
      ...this.form.slots,
      { number: this.form.slots.length + 1, applicant_id: ap.id ?? null, applicant_name: ap.data?.company_name ?? '' },
    ];
  }

  isAlreadyInSlots(applicantId: number | undefined): boolean {
    if (applicantId === undefined) return false;
    return this.form.slots.some(s => s.applicant_id === applicantId);
  }

  removeSlot(index: number): void {
    this.form.slots = this.form.slots
      .filter((_, i) => i !== index)
      .map((s, i) => ({ ...s, number: i + 1 }));
  }

  moveSlot(index: number, direction: -1 | 1): void {
    const arr  = [...this.form.slots];
    const swap = index + direction;
    if (swap < 0 || swap >= arr.length) return;
    [arr[index], arr[swap]] = [arr[swap], arr[index]];
    this.form.slots = arr.map((s, i) => ({ ...s, number: i + 1 }));
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  formatDate(iso: string): string {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('en-ZA', {
        day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
      });
    } catch { return iso; }
  }

  private loadApplicants(): void {
    this.isLoadingApplicants.set(true);
    this.grantAppSvc.getAllApplications().subscribe({
      next: apps => {
        this.allApplicants.set(apps);
        this.isLoadingApplicants.set(false);
      },
      error: () => this.isLoadingApplicants.set(false),
    });
  }

  private _loadWorkflowStages(): void {
    try {
      const wf = this.workflowSvc.getWorkflow(this.workflowId);
      this.workflowStages.set((wf.stages ?? []) as Array<{ key: string; label: string; color: string }>);
    } catch { /* stages just won't show in filter */ }
  }

  /** After a save, write a lightweight back-reference onto each assigned applicant. */
  private _patchApplicantsWithScheduleRef(saved: IPresentationSchedule): void {
    if (!saved.id) return;
    const ref: IScheduleReference = {
      schedule_id: saved.id,
      title:       saved.title,
      date:        saved.date,
      location:    saved.location,
    };
    const unique = [...new Set(
      this.form.slots.map(s => s.applicant_id).filter((id): id is number => !!id)
    )];
    unique.forEach(applicantId => {
      this.grantAppSvc.getApplicationById(applicantId).pipe(
        switchMap(app => {
          const existing: IScheduleReference[] = app.data?.schedules ?? [];
          // deduplicate by schedule_id so re-saving doesn't create duplicates
          const deduped = existing.filter(r => r.schedule_id !== ref.schedule_id);
          return this.grantAppSvc.updateApplication(applicantId, {
            schedules: [...deduped, ref],
          });
        })
      ).subscribe();
    });
  }

  private _emptyForm(): IPresentationSchedule {
    return {
      title: '',
      workflow_id: this.workflowId,
      date: '',
      location: '',
      description: '',
      start_time: '09:00',
      slot_duration: 15,
      breaks: [],
      slots: [],
    };
  }

  private _dateStamp(): string {
    return new Date().toISOString().slice(0, 10).replace(/-/g, '');
  }

  // ── PDF Builder ───────────────────────────────────────────────────────────

  private _buildPdfHtml(): string {
    const FF   = `font-family:'DejaVu Sans',sans-serif`;
    const esc  = (s: string) => (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const rows = this.timetable();

    const dateStr = this.formatDate(this.form.date);

    const tableRows = rows.map(row => {
      if (row.type === 'break') {
        return `
        <tr style="background:#fffbeb">
          <td colspan="4" style="padding:8px 12px;border-bottom:1px solid #fde68a;${FF}">
            <table width="100%" style="border-collapse:collapse">
              <tr>
                <td style="${FF}">
                  <span style="font-size:11px;font-weight:700;color:#b45309;${FF}">${esc(row.label ?? '')}</span>
                </td>
                <td style="text-align:right;${FF}">
                  <span style="font-size:10px;color:#d97706;${FF}">${esc(row.start_time)} – ${esc(row.end_time)}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
      }
      return `
        <tr style="border-bottom:1px solid #f3f4f6">
          <td style="width:40px;text-align:center;padding:8px 6px;font-size:12px;font-weight:700;color:#6b7280;${FF}">${row.number}</td>
          <td style="width:60px;padding:8px 6px;font-size:12px;color:#374151;font-weight:600;${FF}">${esc(row.start_time)}</td>
          <td style="width:60px;padding:8px 6px;font-size:12px;color:#6b7280;${FF}">${esc(row.end_time)}</td>
          <td style="padding:8px 12px;font-size:12px;color:#111827;font-weight:500;${FF}">${esc(row.applicant_name ?? '')}</td>
        </tr>`;
    }).join('');

    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;${FF}">
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;padding:32px 40px;max-width:700px;margin:0 auto">
    <!-- Header -->
    <tr>
      <td style="padding:32px 40px 24px;${FF}">
        <table width="100%" style="border-collapse:collapse">
          <tr>
            <td style="${FF}">
              <div style="font-size:22px;font-weight:900;color:#111827;letter-spacing:-0.5px;${FF}">${esc(this.form.title)}</div>
              <div style="font-size:14px;color:#374151;margin-top:6px;font-weight:600;${FF}">${esc(dateStr)}</div>
              ${this.form.location ? `<div style="font-size:12px;color:#6b7280;margin-top:4px;${FF}">LOCATION: ${esc(this.form.location)}</div>` : ''}
            </td>
          </tr>
          ${this.form.description ? `
          <tr>
            <td style="padding-top:12px;${FF}">
              <div style="font-size:11px;color:#4b5563;line-height:1.6;padding:10px 14px;background:#f9fafb;border-left:3px solid #d1d5db;${FF}">
                ${esc(this.form.description)}
              </div>
            </td>
          </tr>` : ''}
        </table>
      </td>
    </tr>
    <!-- Timetable -->
    <tr>
      <td style="padding:0 40px 40px;${FF}">
        <table width="100%" cellpadding="0" cellspacing="0"
               style="border-collapse:collapse;border:1px solid #e5e7eb;${FF}">
          <!-- Table header -->
          <thead>
            <tr style="background:#f3f4f6;border-bottom:2px solid #e5e7eb">
              <th style="width:40px;text-align:center;padding:9px 6px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;${FF}">No.</th>
              <th style="width:70px;text-align:left;padding:9px 6px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;${FF}">Start</th>
              <th style="width:70px;text-align:left;padding:9px 6px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;${FF}">End</th>
              <th style="text-align:left;padding:9px 12px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;${FF}">Applicant</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        ${this.endTime() ? `
        <div style="text-align:right;font-size:10px;color:#9ca3af;margin-top:8px;${FF}">
          Session ends at <strong style="color:#374151;${FF}">${this.endTime()}</strong>
        </div>` : ''}
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}
