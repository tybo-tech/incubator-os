import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  GrantReportsService,
  IFinancialOverview,
  IFinancialOverviewApplicant,
  IFormAnalytics,
  IFormStageAnalytics,
  IFormQuestionAnalytics,
} from './services/grant-reports.service';
import { GrantExportService } from './services/grant-export.service';
import { WorkflowService } from './services/workflow.service';
import { IWorkflow } from './interfaces/grant-application.interfaces';
import { PresentationShortlistExportService, IShortlistEntry } from './services/presentation-shortlist-export.service';
import { PresentationScoringComponent } from './presentation-scoring.component';
import { PresentationScheduleComponent } from './presentation-schedule.component';

@Component({
  selector: 'app-grant-funding-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, PresentationScoringComponent, PresentationScheduleComponent],
  template: `
    <div class="p-4 sm:p-6">

      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div class="flex items-center gap-3">
          <button
            (click)="goBack()"
            class="p-2 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50
                   hover:border-gray-400 transition-colors flex-shrink-0"
            title="Back to Applications">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <h2 class="text-xl font-semibold text-gray-900">Grant Funding Report</h2>
            <p class="text-sm text-gray-500 mt-0.5">
              Financial overview and applicant analysis — {{ workflowId }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <!-- Refresh -->
          <button
            (click)="activeTab() === 'financial' ? load() : loadForms()"
            [disabled]="isLoading() || isLoadingForms()"
            class="flex items-center gap-2 px-3.5 py-2 border border-gray-300 text-gray-600 rounded-lg
                   hover:bg-gray-50 transition-colors text-sm disabled:opacity-50 flex-shrink-0"
            title="Refresh data">
            <svg class="w-4 h-4"
                 [class.animate-spin]="isLoading() || isLoadingForms()"
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            <span class="hidden sm:inline">{{ (isLoading() || isLoadingForms()) ? 'Loading\u2026' : 'Refresh' }}</span>
          </button>
        </div>
      </div>

      <!-- ── Tab Bar ────────────────────────────────────────────────────── -->
      <div class="flex border-b border-gray-200 mb-6">
        <button
          (click)="setTab('financial')"
          [class]="tabClass(activeTab() === 'financial')">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
          Financial Overview
        </button>
        <button
          (click)="setTab('forms')"
          [class]="tabClass(activeTab() === 'forms')">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
          </svg>
          Form Analytics
        </button>
        <button
          (click)="setTab('shortlist')"
          [class]="tabClass(activeTab() === 'shortlist')">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
          </svg>
          Presentation Shortlist
        </button>
        <button
          (click)="setTab('scoring')"
          [class]="tabClass(activeTab() === 'scoring')">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/>
          </svg>
          Presentation Scoring
        </button>
        <button
          (click)="setTab('schedule')"
          [class]="tabClass(activeTab() === 'schedule')">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          Presentation Schedule
        </button>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading()" class="flex justify-center items-center py-20">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span class="ml-3 text-gray-500 text-sm">Loading report data…</span>
      </div>

      <!-- Error -->
      <div *ngIf="error() && !isLoading()"
           class="bg-red-50 border border-red-200 rounded-lg p-6 text-center mb-6">
        <p class="text-red-600 text-sm mb-3">{{ error() }}</p>
        <button (click)="load()" class="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">
          Try Again
        </button>
      </div>

      <!-- ═══════════════════════════════════════════════════════════════════
           FORM ANALYTICS TAB
      ════════════════════════════════════════════════════════════════════════ -->
      <ng-container *ngIf="activeTab() === 'forms'">

        <!-- Forms loading -->
        <div *ngIf="isLoadingForms()" class="flex justify-center items-center py-20">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span class="ml-3 text-gray-500 text-sm">Loading form analytics…</span>
        </div>

        <!-- Forms error -->
        <div *ngIf="formsError() && !isLoadingForms()"
             class="bg-red-50 border border-red-200 rounded-lg p-6 text-center mb-6">
          <p class="text-red-600 text-sm mb-3">{{ formsError() }}</p>
          <button (click)="loadForms()" class="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">
            Try Again
          </button>
        </div>

        <ng-container *ngIf="!isLoadingForms() && analytics()">

          <!-- Form Analytics export toolbar -->
          <div class="flex items-center justify-end gap-2 mb-5">
            <button
              (click)="exportFormsExcel()"
              [disabled]="isExportingForms()"
              class="flex items-center gap-2 px-3.5 py-2 border border-emerald-300 text-emerald-700 rounded-lg
                     hover:bg-emerald-50 transition-colors text-sm disabled:opacity-50"
              title="Export form analytics to Excel">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              {{ isExportingForms() ? 'Exporting\u2026' : 'Export Excel' }}
            </button>
            <button
              (click)="exportFormsPdf()"
              [disabled]="isExportingForms()"
              class="flex items-center gap-2 px-3.5 py-2 border border-red-300 text-red-700 rounded-lg
                     hover:bg-red-50 transition-colors text-sm disabled:opacity-50"
              title="Export form analytics to PDF">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
              </svg>
              Export PDF
            </button>
          </div>

          <!-- Header summary bar -->
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4 mb-6
                      flex flex-wrap gap-6 items-center">
            <div>
              <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Workflow</p>
              <p class="text-sm font-semibold text-gray-800 mt-0.5">{{ analytics()!.workflow_name }}</p>
            </div>
            <div class="w-px h-8 bg-gray-200 hidden sm:block"></div>
            <div>
              <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Total Applicants</p>
              <p class="text-2xl font-bold text-gray-900 mt-0.5">{{ analytics()!.total_applicants }}</p>
            </div>
            <div class="w-px h-8 bg-gray-200 hidden sm:block"></div>
            <div>
              <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Stages with Forms</p>
              <p class="text-2xl font-bold text-blue-700 mt-0.5">{{ analytics()!.stage_count }}</p>
            </div>
          </div>

          <!-- Stage cards -->
          <div *ngFor="let stage of analytics()!.stages" class="mb-8">

            <!-- Stage header -->
            <div class="flex items-center gap-3 mb-3">
              <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" [class]="stageDot(stage.stage_color)"></span>
              <h3 class="text-base font-semibold text-gray-800">{{ stage.stage_label }}</h3>
              <span class="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{{ stage.template_name }}</span>
              <div class="ml-auto flex items-center gap-2 text-xs">
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                  {{ stage.submitted_count }} submitted
                </span>
                <span *ngIf="stage.draft_count > 0"
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  {{ stage.draft_count }} draft
                </span>
                <span *ngIf="stage.total_submissions === 0"
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  no submissions yet
                </span>
              </div>
            </div>

            <!-- Empty state -->
            <div *ngIf="stage.sections.length === 0"
                 class="bg-white rounded-xl border border-gray-100 px-5 py-8 text-center text-sm text-gray-400 italic">
              No reportable questions in this form, or no submissions yet.
            </div>

            <!-- Sections -->
            <div *ngFor="let section of stage.sections"
                 class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4">
              <div class="px-5 py-3 bg-gray-50 border-b border-gray-100">
                <h4 class="text-xs font-semibold text-gray-600 uppercase tracking-wide">{{ section.title }}</h4>
              </div>
              <div class="divide-y divide-gray-50">
                <div *ngFor="let q of section.questions" class="px-5 py-4">

                  <!-- Question label + response rate -->
                  <div class="flex items-start justify-between gap-4 mb-3">
                    <p class="text-sm font-medium text-gray-700 leading-snug">{{ q.label }}</p>
                    <span class="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0 mt-0.5">
                      {{ q.total_answered }}/{{ q.total_possible }} responded
                    </span>
                  </div>

                  <!-- BOOLEAN: Yes / No bars -->
                  <ng-container *ngIf="q.type === 'boolean'">
                    <div class="space-y-1.5">
                      <div *ngFor="let entry of booleanEntries(q)" class="flex items-center gap-3">
                        <span [class]="booleanLabelClass(entry.key)" class="w-8 text-xs font-semibold text-center py-0.5 rounded">
                          {{ entry.key }}
                        </span>
                        <div class="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div class="h-full rounded-full transition-all"
                               [class]="entry.key === 'Yes' ? 'bg-teal-500' : 'bg-red-400'"
                               [style.width.%]="pct(entry.count, q.total_answered)">
                          </div>
                        </div>
                        <span class="text-xs font-semibold text-gray-700 tabular-nums w-6 text-right">{{ entry.count }}</span>
                        <span class="text-[10px] text-gray-400 w-9 text-right tabular-nums">
                          {{ pct(entry.count, q.total_answered) | number:'1.0-0' }}%
                        </span>
                      </div>
                    </div>
                  </ng-container>

                  <!-- SELECT: per-option bars -->
                  <ng-container *ngIf="q.type === 'select'">
                    <div class="space-y-1.5">
                      <div *ngFor="let opt of selectOptions(q)" class="flex items-center gap-3">
                        <span class="text-xs text-gray-600 w-24 flex-shrink-0 truncate" [title]="opt">{{ opt }}</span>
                        <div class="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div class="h-full bg-blue-500 rounded-full transition-all"
                               [style.width.%]="pct(q.breakdown[opt] ?? 0, q.total_answered)">
                          </div>
                        </div>
                        <span class="text-xs font-semibold text-gray-700 tabular-nums w-6 text-right">{{ q.breakdown[opt] ?? 0 }}</span>
                        <span class="text-[10px] text-gray-400 w-9 text-right tabular-nums">
                          {{ pct(q.breakdown[opt] ?? 0, q.total_answered) | number:'1.0-0' }}%
                        </span>
                      </div>
                    </div>
                  </ng-container>

                  <!-- NUMBER: stats + distribution -->
                  <ng-container *ngIf="q.type === 'number' && q.stats">
                    <div class="flex flex-wrap gap-4 text-center">
                      <div class="bg-gray-50 rounded-lg px-4 py-2">
                        <p class="text-[10px] text-gray-400 uppercase tracking-wide">Min</p>
                        <p class="text-sm font-bold text-gray-800">{{ q.stats.min }}</p>
                      </div>
                      <div class="bg-blue-50 rounded-lg px-4 py-2">
                        <p class="text-[10px] text-gray-400 uppercase tracking-wide">Avg</p>
                        <p class="text-sm font-bold text-blue-700">{{ q.stats.avg }}</p>
                      </div>
                      <div class="bg-gray-50 rounded-lg px-4 py-2">
                        <p class="text-[10px] text-gray-400 uppercase tracking-wide">Max</p>
                        <p class="text-sm font-bold text-gray-800">{{ q.stats.max }}</p>
                      </div>
                      <div class="bg-teal-50 rounded-lg px-4 py-2">
                        <p class="text-[10px] text-gray-400 uppercase tracking-wide">Total</p>
                        <p class="text-sm font-bold text-teal-700">{{ q.stats.sum }}</p>
                      </div>
                    </div>
                  </ng-container>

                </div><!-- /question -->
              </div>
            </div><!-- /section -->

          </div><!-- /stage -->

        </ng-container>
      </ng-container><!-- /forms tab -->

      <!-- ═══════════════════════════════════════════════════════════════════
           FINANCIAL TAB
      ════════════════════════════════════════════════════════════════════════ -->
      <ng-container *ngIf="!isLoading() && overview() && activeTab() === 'financial'">

        <!-- ── Financial export toolbar ───────────────────────────────────── -->
        <div class="flex items-center justify-end gap-2 mb-5">
          <button
            (click)="exportExcel()"
            [disabled]="isExporting()"
            class="flex items-center gap-2 px-3.5 py-2 border border-emerald-300 text-emerald-700 rounded-lg
                   hover:bg-emerald-50 transition-colors text-sm disabled:opacity-50"
            title="Export to Excel">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            {{ isExporting() ? 'Exporting\u2026' : 'Export Excel' }}
          </button>
          <button
            (click)="exportPdf()"
            [disabled]="isExporting()"
            class="flex items-center gap-2 px-3.5 py-2 border border-red-300 text-red-700 rounded-lg
                   hover:bg-red-50 transition-colors text-sm disabled:opacity-50"
            title="Export to PDF">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
            Export PDF
          </button>
        </div>

        <!-- ── KPI Cards ──────────────────────────────────────────────── -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

          <div class="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
            <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Total Applicants</p>
            <p class="text-3xl font-bold text-gray-900">{{ overview()!.total_applicants }}</p>
            <p class="text-xs text-gray-400 mt-1">{{ overview()!.applicants_with_data }} with financial data</p>
          </div>

          <div class="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
            <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Total Pool Value</p>
            <p class="text-2xl font-bold text-teal-700 tabular-nums">{{ formatAmount(overview()!.total_pool_value) }}</p>
            <p class="text-xs text-gray-400 mt-1">Combined turnover all applicants</p>
          </div>

          <div class="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
            <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Avg / Active Month</p>
            <p class="text-2xl font-bold text-blue-700 tabular-nums">{{ formatAmount(overview()!.overall_avg_per_active_month) }}</p>
            <p class="text-xs text-gray-400 mt-1">Across {{ overview()!.overall_active_months }} active months</p>
          </div>

          <div class="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
            <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Top Avg / Month</p>
            <p class="text-2xl font-bold text-purple-700 tabular-nums">{{ formatAmount(overview()!.top_avg_per_month) }}</p>
            <p class="text-xs text-gray-400 mt-1">Highest single applicant average</p>
          </div>
        </div>

        <!-- ── Status Distribution + Consistency Distribution ─────────── -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

          <!-- Status breakdown -->
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 class="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
              Applicants by Stage
            </h3>
            <div class="space-y-2">
              <div *ngFor="let s of statusBreakdown()" class="flex items-center gap-3">
                <span class="text-xs text-gray-600 w-28 flex-shrink-0 truncate" [title]="s.label">{{ s.label }}</span>
                <div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div [class]="stageBarBg(s.color)"
                       [style.width.%]="s.pct">
                  </div>
                </div>
                <span class="text-xs font-semibold text-gray-700 tabular-nums w-8 text-right">{{ s.count }}</span>
                <span class="text-[10px] text-gray-400 tabular-nums w-8 text-right">{{ s.pct | number:'1.0-0' }}%</span>
              </div>
            </div>
          </div>

          <!-- Consistency distribution -->
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 class="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <svg class="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
              Consistency Distribution
            </h3>
            <div class="space-y-3">
              <div *ngFor="let c of consistencyBreakdown()" class="flex items-center gap-3">
                <span [class]="c.badgeClass">{{ c.label }}</span>
                <div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all" [class]="c.barClass"
                       [style.width.%]="c.pct">
                  </div>
                </div>
                <span class="text-xs font-semibold text-gray-700 tabular-nums w-8 text-right">{{ c.count }}</span>
                <span class="text-[10px] text-gray-400 tabular-nums w-8 text-right">{{ c.pct | number:'1.0-0' }}%</span>
              </div>
              <p *ngIf="consistencyBreakdown().length === 0" class="text-xs text-gray-400 italic">
                No financial data captured yet.
              </p>
            </div>
          </div>
        </div>

        <!-- ── Filters ────────────────────────────────────────────────────── -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">

          <!-- Status pills -->
          <div class="flex flex-wrap gap-2 mb-3">
            <button
              (click)="setStatusFilter('')"
              [class]="pillClass('gray', activeStatusFilter() === '')">
              All
              <span class="bg-white/60 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums">
                {{ overview()!.applicants.length }}
              </span>
            </button>
            <button
              *ngFor="let s of statusList()"
              (click)="setStatusFilter(s.key)"
              [class]="pillClass(s.color, activeStatusFilter() === s.key)">
              {{ s.label }}
              <span class="bg-white/60 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums">
                {{ s.count }}
              </span>
            </button>
          </div>

          <!-- Toggles + search + sort row -->
          <div class="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Search by company name…"
              [(ngModel)]="searchQuery"
              class="flex-1 min-w-[180px] max-w-xs px-4 py-2 border border-gray-300 rounded-lg text-sm
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent">

            <!-- Has turnover -->
            <button (click)="toggleTurnover()" [class]="toggleClass(hasTurnoverFilter())">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
              Has turnover
            </button>

            <!-- R1M & under -->
            <button (click)="toggleUnder1M()" [class]="toggleClass(under1MFilter())">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              R1M &amp; under
            </button>

            <!-- 12+ months -->
            <button (click)="toggle12Months()" [class]="toggleClass(has12MonthsFilter())">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              12+ months
            </button>

            <!-- Consistency toggles -->
            <button (click)="setConsistency('Consistent')" [class]="consistencyToggleClass('Consistent')">
              Consistent
            </button>
            <button (click)="setConsistency('Moderate')" [class]="consistencyToggleClass('Moderate')">
              Moderate
            </button>
            <button (click)="setConsistency('Irregular')" [class]="consistencyToggleClass('Irregular')">
              Irregular
            </button>

            <!-- Sort -->
            <select
              [(ngModel)]="sortField"
              class="px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white text-gray-700
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent ml-auto">
              <option value="rank">Rank (turnover)</option>
              <option value="name">Company name</option>
              <option value="consistency">Consistency %</option>
              <option value="avg">Avg / month</option>
            </select>

            <!-- Clear filters -->
            <button
              *ngIf="hasActiveFilters"
              (click)="clearFilters()"
              class="px-3 py-2 text-xs text-red-600 border border-red-200 rounded-lg
                     hover:bg-red-50 transition-colors">
              Clear filters
            </button>
          </div>

          <!-- Active filter summary -->
          <div *ngIf="hasActiveFilters" class="mt-2 text-xs text-gray-500">
            Showing <strong class="text-gray-800">{{ filteredApplicants().length }}</strong>
            of {{ overview()!.applicants.length }} applicants — exports will include only this selection
          </div>
        </div>

        <!-- ── Leaderboard Table ─────────────────────────────────────────── -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th class="text-center px-3 py-3 font-medium text-gray-500 w-10">#</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-600">Company</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Status</th>
                  <th class="text-right px-4 py-3 font-medium text-gray-600">Grand Total</th>
                  <th class="text-right px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Avg/Month</th>
                  <th class="text-center px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Active Months</th>
                  <th class="text-center px-4 py-3 font-medium text-gray-600">Consistency</th>
                  <th class="text-right px-3 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr *ngFor="let app of filteredApplicants()"
                    class="hover:bg-gray-50 transition-colors">
                  <!-- Rank -->
                  <td class="px-3 py-3 text-center">
                    <span *ngIf="app.rank <= 3"
                          class="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
                          [class]="app.rank === 1 ? 'bg-yellow-100 text-yellow-700'
                                 : app.rank === 2 ? 'bg-gray-200 text-gray-600'
                                 : 'bg-orange-100 text-orange-600'">
                      {{ app.rank }}
                    </span>
                    <span *ngIf="app.rank > 3" class="text-xs text-gray-400">{{ app.rank }}</span>
                  </td>

                  <!-- Company -->
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 bg-gradient-to-br from-green-400 to-teal-500 rounded-lg
                                  flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {{ (app.company_name || '?')[0].toUpperCase() }}
                      </div>
                      <div>
                        <p class="font-medium text-gray-900 leading-tight">{{ app.company_name }}</p>
                        <p class="text-[10px] text-gray-400">{{ app.province || '—' }}</p>
                      </div>
                    </div>
                  </td>

                  <!-- Status -->
                  <td class="px-4 py-3 hidden md:table-cell">
                    <span [class]="workflowStatusBadgeClass(app.status)">
                      {{ workflowStatusLabel(app.status) }}
                    </span>
                  </td>

                  <!-- Grand Total -->
                  <td class="px-4 py-3 text-right tabular-nums">
                    <span *ngIf="app.grand_total > 0; else noData"
                          class="font-semibold text-teal-700">
                      {{ formatAmount(app.grand_total) }}
                    </span>
                    <ng-template #noData>
                      <span class="text-gray-300 text-xs">—</span>
                    </ng-template>
                    <!-- Progress bar relative to top -->
                    <div *ngIf="app.grand_total > 0 && overview()!.total_pool_value > 0"
                         class="mt-1 w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div class="h-full bg-teal-400 rounded-full"
                           [style.width.%]="(app.grand_total / overview()!.total_pool_value) * 100">
                      </div>
                    </div>
                  </td>

                  <!-- Avg / month -->
                  <td class="px-4 py-3 text-right tabular-nums text-gray-600 hidden sm:table-cell">
                    {{ app.avg_per_active_month > 0 ? formatAmount(app.avg_per_active_month) : '—' }}
                  </td>

                  <!-- Active months -->
                  <td class="px-4 py-3 text-center hidden lg:table-cell">
                    <span *ngIf="app.captured_months > 0"
                          class="text-xs font-semibold"
                          [class]="app.active_months >= 10 ? 'text-teal-600'
                                 : app.active_months >= 6  ? 'text-amber-600'
                                 : 'text-red-500'">
                      {{ app.active_months }}/{{ app.captured_months }}
                    </span>
                    <span *ngIf="app.captured_months === 0" class="text-gray-300 text-xs">—</span>
                  </td>

                  <!-- Consistency badge -->
                  <td class="px-4 py-3 text-center">
                    <ng-container *ngIf="app.captured_months > 0; else noConsistency">
                      <span [class]="consistencyBadge(app.consistency_label)">
                        {{ app.consistency_label }}
                      </span>
                      <p class="text-[10px] text-gray-400 mt-0.5 tabular-nums">
                        {{ app.consistency_rate | number:'1.0-0' }}%
                      </p>
                    </ng-container>
                    <ng-template #noConsistency>
                      <span class="text-gray-300 text-xs">—</span>
                    </ng-template>
                  </td>

                  <!-- Open -->
                  <td class="px-3 py-3 text-right">
                    <button
                      (click)="openApplicant(app)"
                      class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="View applicant">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                      </svg>
                    </button>
                  </td>
                </tr>

                <!-- Empty filtered state -->
                <tr *ngIf="filteredApplicants().length === 0">
                  <td colspan="8" class="px-4 py-12 text-center text-sm text-gray-400 italic">
                    No applicants match your search.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
            {{ filteredApplicants().length }} of {{ overview()!.applicants.length }} ranked applicants
            ({{ overview()!.total_applicants - overview()!.applicants_with_data }} with no financial data excluded from ranking)
          </div>
        </div>

      </ng-container><!-- /financial tab -->

      <!-- ═══════════════════════════════════════════════════════════════════
           PRESENTATION SHORTLIST TAB
      ════════════════════════════════════════════════════════════════════════ -->
      <ng-container *ngIf="activeTab() === 'shortlist'">

        <!-- Stage selector + export toolbar -->
        <div class="flex flex-wrap items-center gap-3 mb-5">
          <!-- Stage pills (only stages with a judge/form template) -->
          <div class="flex flex-wrap gap-2 flex-1">
            <button
              *ngFor="let s of presentationStages()"
              (click)="setShortlistStage(s.key)"
              [class]="pillClass(s.color, shortlistStageFilter() === s.key)">
              {{ s.label }}
              <span class="bg-white/60 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums">
                {{ shortlistByStage(s.key).length }}
              </span>
            </button>
          </div>
          <!-- Export PDF button -->
          <button
            *ngIf="shortlistStageFilter()"
            (click)="exportShortlistPdf()"
            class="flex items-center gap-2 px-3.5 py-2 border border-red-300 text-red-700 rounded-lg
                   hover:bg-red-50 transition-colors text-sm flex-shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
            Export PDF
          </button>
        </div>

        <!-- No presentation stages at all -->
        <div *ngIf="presentationStages().length === 0"
             class="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
          <svg class="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          <p class="text-sm text-gray-500">No presentation stages found in the workflow.</p>
          <p class="text-xs text-gray-400 mt-1">Stages with an interview or form template will appear here.</p>
        </div>

        <!-- Prompt to pick a stage -->
        <div *ngIf="presentationStages().length > 0 && !shortlistStageFilter()"
             class="bg-blue-50 border border-blue-100 rounded-xl p-6 text-center">
          <p class="text-sm text-blue-700 font-medium">Select a stage above to view its applicant shortlist</p>
          <p class="text-xs text-blue-500 mt-1">Each applicant's voting link will be shown alongside their financial summary.</p>
        </div>

        <!-- Applicant cards -->
        <ng-container *ngIf="shortlistStageFilter()">

          <!-- search + sort row -->
          <div class="flex flex-wrap items-center gap-2 mb-4">
            <input
              type="text"
              placeholder="Search company…"
              [(ngModel)]="shortlistSearch"
              class="flex-1 min-w-[180px] max-w-xs px-4 py-2 border border-gray-300 rounded-lg text-sm
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <span class="text-xs text-gray-500 ml-auto">
              {{ filteredShortlist().length }} applicant{{ filteredShortlist().length !== 1 ? 's' : '' }}
            </span>
          </div>

          <!-- Empty -->
          <div *ngIf="filteredShortlist().length === 0"
               class="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center text-sm text-gray-400 italic">
            No applicants in this stage.
          </div>

          <!-- Cards grid -->
          <div class="space-y-3">
            <div *ngFor="let entry of filteredShortlist(); let i = index"
                 class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden
                        hover:border-gray-300 transition-colors">

              <!-- Card header -->
              <div class="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
                <!-- Number -->
                <span class="inline-flex items-center justify-center w-7 h-7 rounded-full
                             text-xs font-bold flex-shrink-0"
                      [class]="shortlistNumberClass(shortlistStageFilter())">
                  {{ i + 1 }}
                </span>
                <!-- Company name -->
                <div class="flex-1 min-w-0">
                  <p class="font-semibold text-gray-900 text-sm leading-tight truncate">{{ entry.company_name }}</p>
                  <p class="text-xs text-gray-400 mt-0.5">{{ entry.province || '—' }}</p>
                </div>
                <!-- Consistency badge -->
                <span *ngIf="entry.consistency_label"
                      [class]="consistencyBadge(entry.consistency_label)">
                  {{ entry.consistency_label }}
                </span>
                <!-- Open applicant link -->
                <button
                  (click)="openApplicantById(entry.id)"
                  class="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex-shrink-0"
                  title="Open applicant">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                  </svg>
                </button>
              </div>

              <!-- Financial stats row -->
              <div class="grid grid-cols-3 divide-x divide-gray-100 px-0">
                <div class="px-4 py-3">
                  <p class="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Grand Total</p>
                  <p class="text-sm font-bold text-teal-700 tabular-nums">{{ formatAmount(entry.grand_total) }}</p>
                </div>
                <div class="px-4 py-3">
                  <p class="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Avg / Month</p>
                  <p class="text-sm font-bold text-blue-700 tabular-nums">{{ formatAmount(entry.avg_per_active_month) }}</p>
                </div>
                <div class="px-4 py-3">
                  <p class="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Active Months</p>
                  <p class="text-sm font-bold text-gray-700 tabular-nums">{{ entry.active_months }}</p>
                </div>
              </div>

              <!-- Voting link row -->
              <div class="px-4 py-3 border-t border-gray-100 bg-blue-50/50">
                <p class="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5 font-medium">Judge Voting Link</p>
                <div *ngIf="entry.judgeLink; else noLink" class="flex items-center gap-2">
                  <input
                    type="text"
                    readonly
                    [value]="entry.judgeLink"
                    class="flex-1 text-xs text-gray-700 bg-white border border-blue-200 rounded-lg
                           px-3 py-1.5 truncate focus:outline-none focus:ring-1 focus:ring-blue-400">
                  <button
                    (click)="copyLink(entry, i)"
                    [title]="copiedIndex() === i ? 'Copied!' : 'Copy link'"
                    class="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg
                           border transition-colors flex-shrink-0"
                    [class]="copiedIndex() === i
                      ? 'bg-green-100 text-green-700 border-green-300'
                      : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path *ngIf="copiedIndex() !== i" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/>
                      <path *ngIf="copiedIndex() === i" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M5 13l4 4L19 7"/>
                    </svg>
                    {{ copiedIndex() === i ? 'Copied!' : 'Copy' }}
                  </button>
                  <a
                    [href]="entry.judgeLink"
                    target="_blank"
                    rel="noopener"
                    class="flex items-center gap-1 px-3 py-1.5 text-xs font-medium
                           bg-violet-50 text-violet-700 border border-violet-200 rounded-lg
                           hover:bg-violet-100 transition-colors flex-shrink-0">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                    </svg>
                    Open
                  </a>
                </div>
                <ng-template #noLink>
                  <p class="text-xs text-gray-400 italic">No voting template configured for this stage.</p>
                </ng-template>
              </div>

            </div>
          </div>

        </ng-container>

      </ng-container><!-- /shortlist tab -->

      <!-- ═══════════════════════════════════════════════════════════════════
           PRESENTATION SCORING TAB
      ════════════════════════════════════════════════════════════════════════ -->
      <ng-container *ngIf="activeTab() === 'scoring'">
        <app-presentation-scoring />
      </ng-container><!-- /scoring tab -->

      <!-- ═══════════════════════════════════════════════════════════════════
           PRESENTATION SCHEDULE TAB
      ════════════════════════════════════════════════════════════════════════ -->
      <ng-container *ngIf="activeTab() === 'schedule'">
        <app-presentation-schedule [workflowId]="workflowId" />
      </ng-container><!-- /schedule tab -->

    </div>
  `
})
export class GrantFundingReportsComponent implements OnInit {
  private readonly WORKFLOW_ID = 'grant-2026';
  readonly workflowId = this.WORKFLOW_ID;

  activeTab = signal<'financial' | 'forms' | 'shortlist' | 'scoring' | 'schedule'>('financial');

  // ── Presentation Shortlist state ──────────────────────────────────────
  shortlistStageFilter = signal<string>('');
  shortlistSearch = '';
  copiedIndex = signal<number | null>(null);

  isLoading = signal(false);
  isExporting = signal(false);
  error = signal<string | null>(null);
  overview = signal<IFinancialOverview | null>(null);

  isLoadingForms = signal(false);
  formsError = signal<string | null>(null);
  analytics = signal<IFormAnalytics | null>(null);
  isExportingForms = signal(false);

  searchQuery = '';
  sortField: 'rank' | 'name' | 'consistency' | 'avg' = 'rank';

  // ── Filter state ──────────────────────────────────────────────────────
  activeStatusFilter = signal<string>('');
  hasTurnoverFilter  = signal(false);
  under1MFilter      = signal(false);
  has12MonthsFilter  = signal(false);
  consistencyFilter  = signal<string>('');  // 'Consistent'|'Moderate'|'Irregular'|''

  workflow = signal<IWorkflow | null>(null);

  constructor(
    private router: Router,
    private reportsService: GrantReportsService,
    private exportService: GrantExportService,
    private workflowSvc: WorkflowService,
    private shortlistExportSvc: PresentationShortlistExportService,
  ) {}

  ngOnInit(): void {
    this.workflowSvc.loadWorkflowFromDB(this.WORKFLOW_ID).subscribe(() => {
      this.workflow.set(this.workflowSvc.getWorkflow(this.WORKFLOW_ID));
      this.load();
      this.loadForms();
    });
  }

  setTab(tab: 'financial' | 'forms' | 'shortlist' | 'scoring' | 'schedule'): void {
    this.activeTab.set(tab);
  }

  load(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.reportsService.getFinancialOverview(this.WORKFLOW_ID).subscribe({
      next: data => {
        this.overview.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Failed to load report data. Please try again.');
        this.isLoading.set(false);
      },
    });
  }

  loadForms(): void {
    this.isLoadingForms.set(true);
    this.formsError.set(null);
    this.reportsService.getFormAnalytics(this.WORKFLOW_ID).subscribe({
      next: data => {
        this.analytics.set(data);
        this.isLoadingForms.set(false);
      },
      error: () => {
        this.formsError.set('Failed to load form analytics.');
        this.isLoadingForms.set(false);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/grant-funding/applications']);
  }

  get statusLabels(): Record<string, string> {
    const wf = this.workflow();
    if (!wf) return {};
    return Object.fromEntries(wf.stages.map(s => [s.key, s.label]));
  }

  get statusColors(): Record<string, string> {
    const wf = this.workflow();
    if (!wf) return {};
    return Object.fromEntries(wf.stages.map(s => [s.key, s.color]));
  }

  exportExcel(): void {
    const data = this.overview();
    if (!data) return;
    this.isExporting.set(true);
    const filtered = this.filteredApplicants();
    const exportData: IFinancialOverview = { ...data, applicants: filtered as any };
    this.exportService.exportExcel(exportData, this.activeFilterLabels, this.statusLabels).finally(() => this.isExporting.set(false));
  }

  exportPdf(): void {
    const data = this.overview();
    if (!data) return;
    const filtered = this.filteredApplicants();
    const exportData: IFinancialOverview = { ...data, applicants: filtered as any };
    this.exportService.exportPdf(exportData, this.activeFilterLabels, this.statusLabels, this.statusColors);
  }

  exportFormsExcel(): void {
    const data = this.analytics();
    if (!data) return;
    this.isExportingForms.set(true);
    this.exportService.exportFormsExcel(data).finally(() => this.isExportingForms.set(false));
  }

  exportFormsPdf(): void {
    const data = this.analytics();
    if (!data) return;
    this.exportService.exportFormsPdf(data);
  }

  // ── Filter helpers ────────────────────────────────────────────────────
  setStatusFilter(key: string): void { this.activeStatusFilter.set(key); }
  toggleTurnover(): void { this.hasTurnoverFilter.update(v => !v); }
  toggleUnder1M(): void  { this.under1MFilter.update(v => !v); }
  toggle12Months(): void { this.has12MonthsFilter.update(v => !v); }
  setConsistency(val: string): void {
    this.consistencyFilter.set(this.consistencyFilter() === val ? '' : val);
  }
  clearFilters(): void {
    this.searchQuery = '';
    this.activeStatusFilter.set('');
    this.hasTurnoverFilter.set(false);
    this.under1MFilter.set(false);
    this.has12MonthsFilter.set(false);
    this.consistencyFilter.set('');
  }
  get hasActiveFilters(): boolean {
    return !!this.searchQuery.trim() ||
      !!this.activeStatusFilter() ||
      this.hasTurnoverFilter() ||
      this.under1MFilter() ||
      this.has12MonthsFilter() ||
      !!this.consistencyFilter();
  }
  get activeFilterLabels(): string[] {
    const labels: string[] = [];
    if (this.activeStatusFilter()) labels.push(`Stage: ${this.activeStatusFilter()}`);
    if (this.hasTurnoverFilter())  labels.push('Has turnover');
    if (this.under1MFilter())      labels.push('R1M & under');
    if (this.has12MonthsFilter())  labels.push('12+ active months');
    if (this.consistencyFilter())  labels.push(`Consistency: ${this.consistencyFilter()}`);
    if (this.searchQuery.trim())   labels.push(`Search: "${this.searchQuery.trim()}"`);
    return labels;
  }

  statusList = computed(() => {
    const data = this.overview();
    const wf = this.workflow();
    if (!data) return [];
    // Count all applicants (including those without financial data) by status
    const counts: Record<string, number> = {};
    for (const app of data.applicants) {
      const s = app.status || 'unknown';
      counts[s] = (counts[s] ?? 0) + 1;
    }
    if (!wf) {
      // Fallback: no workflow loaded yet, show raw keys
      return Object.entries(counts)
        .map(([key, count]) => ({ key, label: key, color: 'gray', count }))
        .sort((a, b) => b.count - a.count);
    }
    // Return stages in workflow order (only those with at least 1 applicant)
    return wf.stages
      .filter(s => counts[s.key] > 0)
      .map(s => ({ key: s.key, label: s.label, color: s.color, count: counts[s.key] }));
  });

  openApplicant(app: IFinancialOverviewApplicant): void {
    this.router.navigate(['/admin/grant-funding/applications', app.id, 'overview']);
  }

  filteredApplicants = computed(() => {
    const data = this.overview();
    if (!data) return [];

    let list = [...data.applicants];

    // Search
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(a => a.company_name?.toLowerCase().includes(q));
    }

    // Status pill
    const status = this.activeStatusFilter();
    if (status) list = list.filter(a => a.status === status);

    // Has turnover
    if (this.hasTurnoverFilter()) list = list.filter(a => a.grand_total > 0);

    // R1M & under
    if (this.under1MFilter()) list = list.filter(a => a.grand_total > 0 && a.grand_total <= 1_000_000);

    // 12+ months
    if (this.has12MonthsFilter()) list = list.filter(a => a.active_months >= 12);

    // Consistency
    const con = this.consistencyFilter();
    if (con) list = list.filter(a => a.consistency_label === con);

    // Sort
    switch (this.sortField) {
      case 'name':
        list.sort((a, b) => (a.company_name ?? '').localeCompare(b.company_name ?? ''));
        break;
      case 'consistency':
        list.sort((a, b) => b.consistency_rate - a.consistency_rate);
        break;
      case 'avg':
        list.sort((a, b) => b.avg_per_active_month - a.avg_per_active_month);
        break;
      default:
        list.sort((a, b) => a.rank - b.rank);
    }

    return list;
  });

  statusBreakdown = computed(() => {
    const data = this.overview();
    const wf = this.workflow();
    if (!data) return [];
    const counts: Record<string, number> = {};
    const total = data.total_applicants;
    for (const app of data.applicants) {
      const s = app.status || 'unknown';
      counts[s] = (counts[s] ?? 0) + 1;
    }
    if (!wf) {
      return Object.entries(counts)
        .map(([label, count]) => ({ label, color: 'gray', count, pct: total > 0 ? (count / total) * 100 : 0 }))
        .sort((a, b) => b.count - a.count);
    }
    // Return in workflow stage order with proper labels and colors
    return wf.stages
      .filter(s => counts[s.key] > 0)
      .map(s => ({
        label: s.label,
        color: s.color,
        count: counts[s.key],
        pct: total > 0 ? (counts[s.key] / total) * 100 : 0,
      }));
  });

  consistencyBreakdown = computed(() => {
    const data = this.overview();
    if (!data) return [];
    const appsWithData = data.applicants.filter(a => a.captured_months > 0);
    const total = appsWithData.length;
    const counts = { Consistent: 0, Moderate: 0, Irregular: 0 };
    for (const app of appsWithData) {
      const l = app.consistency_label as keyof typeof counts;
      if (l in counts) counts[l]++;
    }
    const cfg = [
      { label: 'Consistent', barClass: 'bg-teal-500',   badgeClass: 'inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700 w-20 justify-center' },
      { label: 'Moderate',   barClass: 'bg-amber-400',  badgeClass: 'inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 w-20 justify-center' },
      { label: 'Irregular',  barClass: 'bg-red-400',    badgeClass: 'inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600 w-20 justify-center'   },
    ];
    return cfg.map(c => ({
      ...c,
      count: counts[c.label as keyof typeof counts],
      pct: total > 0 ? (counts[c.label as keyof typeof counts] / total) * 100 : 0,
    }));
  });

  pillClass(color: string, isActive: boolean): string {
    const base = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer select-none ';
    const map: Record<string, { off: string; on: string }> = {
      blue:   { off: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',       on: 'bg-blue-100 text-blue-800 border-blue-400 ring-1 ring-blue-400' },
      orange: { off: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100', on: 'bg-orange-100 text-orange-800 border-orange-400 ring-1 ring-orange-400' },
      purple: { off: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100', on: 'bg-purple-100 text-purple-800 border-purple-400 ring-1 ring-purple-400' },
      indigo: { off: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100', on: 'bg-indigo-100 text-indigo-800 border-indigo-400 ring-1 ring-indigo-400' },
      green:  { off: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',     on: 'bg-green-100 text-green-800 border-green-400 ring-1 ring-green-400' },
      red:    { off: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',             on: 'bg-red-100 text-red-800 border-red-400 ring-1 ring-red-400' },
      teal:   { off: 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100',         on: 'bg-teal-100 text-teal-800 border-teal-400 ring-1 ring-teal-400' },
      yellow: { off: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100', on: 'bg-yellow-100 text-yellow-800 border-yellow-400 ring-1 ring-yellow-400' },
      gray:   { off: 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100',         on: 'bg-gray-100 text-gray-800 border-gray-400 ring-1 ring-gray-400' },
    };
    const c = map[color] ?? map['gray'];
    return base + (isActive ? c.on : c.off);
  }

  workflowStatusBadgeClass(status?: string): string {
    const wf = this.workflow();
    if (!wf) return 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600';
    return this.workflowSvc.getStatusBadgeClass(wf, status);
  }

  workflowStatusLabel(status?: string): string {
    const wf = this.workflow();
    if (!wf) return status || '—';
    return this.workflowSvc.getStatusLabel(wf, status);
  }

  toggleClass(isActive: boolean): string {
    const base = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ';
    return base + (isActive
      ? 'bg-teal-100 text-teal-800 border-teal-400 ring-1 ring-teal-400'
      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100');
  }

  consistencyToggleClass(label: string): string {
    const active = this.consistencyFilter() === label;
    const base = 'inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ';
    if (label === 'Consistent')
      return base + (active ? 'bg-teal-100 text-teal-800 border-teal-400 ring-1 ring-teal-400' : 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100');
    if (label === 'Moderate')
      return base + (active ? 'bg-amber-100 text-amber-800 border-amber-400 ring-1 ring-amber-400' : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100');
    return base + (active ? 'bg-red-100 text-red-800 border-red-400 ring-1 ring-red-400' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100');
  }

  consistencyBadge(label: string): string {
    if (label === 'Consistent') return 'inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-100 text-teal-700';
    if (label === 'Moderate')   return 'inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700';
    return 'inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-600';
  }

  // ── Form analytics helpers ───────────────────────────────────────────

  tabClass(isActive: boolean): string {
    const base = 'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ';
    return base + (isActive
      ? 'border-blue-500 text-blue-600'
      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 cursor-pointer');
  }

  stageDot(color: string): string {
    const m: Record<string, string> = {
      blue: 'bg-blue-500', indigo: 'bg-indigo-500', purple: 'bg-purple-500',
      orange: 'bg-orange-500', green: 'bg-green-500', red: 'bg-red-500',
      teal: 'bg-teal-500', yellow: 'bg-yellow-400', gray: 'bg-gray-400',
    };
    return m[color] ?? 'bg-gray-400';
  }

  stageBarBg(color: string): string {
    const m: Record<string, string> = {
      blue:   'bg-blue-500',   indigo: 'bg-indigo-500', purple: 'bg-purple-500',
      orange: 'bg-orange-500', green:  'bg-green-500',  red:    'bg-red-400',
      teal:   'bg-teal-500',   yellow: 'bg-yellow-400', pink:   'bg-pink-400', gray: 'bg-gray-400',
    };
    return (m[color] ?? 'bg-gray-400') + ' h-full rounded-full transition-all';
  }

  pct(count: number, total: number): number {
    return total > 0 ? (count / total) * 100 : 0;
  }

  booleanEntries(q: IFormQuestionAnalytics): { key: string; count: number }[] {
    // Always show Yes then No, even if zero
    return ['Yes', 'No'].map(k => ({ key: k, count: q.breakdown[k] ?? 0 }));
  }

  booleanLabelClass(key: string): string {
    return key === 'Yes'
      ? 'bg-teal-100 text-teal-700'
      : 'bg-red-100 text-red-600';
  }

  selectOptions(q: IFormQuestionAnalytics): string[] {
    // Use defined options if available, else derive from breakdown keys
    if (q.options?.length) return q.options;
    return Object.keys(q.breakdown);
  }

  formatAmount(value: number): string {
    if (!value) return 'R0';
    if (value >= 1_000_000) return `R${+(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000)     return `R${+(value / 1_000).toFixed(1)}K`;
    return `R${value}`;
  }

  // ── Presentation Shortlist ───────────────────────────────────────────────

  /** Stages that have a judge template (interview_template_id or form_template_id)
   *  or have a type of 'evaluation' / 'review' — these are the stageable stages. */
  presentationStages = computed(() => {
    const wf = this.workflow();
    if (!wf) return [];
    return wf.stages.filter(
      s => s.interview_template_id || s.form_template_id || s.type === 'evaluation' || s.type === 'review'
    );
  });

  /** All applicants in a given stage key */
  shortlistByStage(stageKey: string): IFinancialOverviewApplicant[] {
    return (this.overview()?.applicants ?? []).filter(a => a.status === stageKey);
  }

  /** Build IShortlistEntry objects for the selected stage */
  filteredShortlist = computed<IShortlistEntry[]>(() => {
    const stageKey = this.shortlistStageFilter();
    if (!stageKey) return [];
    const wf = this.workflow();
    const stage = wf?.stages.find(s => s.key === stageKey) ?? null;
    const templateId = stage?.interview_template_id ?? stage?.form_template_id;
    const origin = window.location.origin;

    let list = (this.overview()?.applicants ?? []).filter(a => a.status === stageKey);

    if (this.shortlistSearch.trim()) {
      const q = this.shortlistSearch.toLowerCase();
      list = list.filter(a => a.company_name?.toLowerCase().includes(q));
    }

    return list.map(app => {
      const companyId = app.company_id ?? app.id;
      const judgeLink = templateId && companyId
        ? `${origin}/f/${templateId}?mode=judge&companyId=${companyId}&applicantLabel=${encodeURIComponent(app.company_name ?? '')}`
        : '';
      return {
        id: app.id,
        company_id: app.company_id,
        company_name: app.company_name,
        status: app.status,
        province: app.province,
        grand_total: app.grand_total,
        avg_per_active_month: app.avg_per_active_month,
        active_months: app.active_months,
        consistency_label: app.consistency_label,
        stage,
        judgeLink,
      } satisfies IShortlistEntry;
    });
  });

  setShortlistStage(key: string): void {
    this.shortlistStageFilter.set(key);
    this.shortlistSearch = '';
  }

  copyLink(entry: IShortlistEntry, index: number): void {
    if (!entry.judgeLink) return;
    navigator.clipboard.writeText(entry.judgeLink).then(() => {
      this.copiedIndex.set(index);
      setTimeout(() => this.copiedIndex.set(null), 2000);
    });
  }

  exportShortlistPdf(): void {
    const stageKey = this.shortlistStageFilter();
    const wf = this.workflow();
    if (!stageKey || !wf) return;
    const stage = wf.stages.find(s => s.key === stageKey);
    const entries = this.filteredShortlist();
    this.shortlistExportSvc.exportPdf(
      entries,
      stage?.label ?? stageKey,
      stage?.color ?? 'gray',
      this.WORKFLOW_ID,
    );
  }

  openApplicantById(id: number): void {
    this.router.navigate(['/admin/grant-funding/applications', id, 'overview']);
  }

  shortlistNumberClass(stageKey: string): string {
    const wf = this.workflow();
    const color = wf?.stages.find(s => s.key === stageKey)?.color ?? 'gray';
    const map: Record<string, string> = {
      blue:   'bg-blue-100 text-blue-800',
      orange: 'bg-orange-100 text-orange-800',
      teal:   'bg-teal-100 text-teal-800',
      indigo: 'bg-indigo-100 text-indigo-800',
      red:    'bg-red-100 text-red-800',
      green:  'bg-green-100 text-green-800',
      purple: 'bg-purple-100 text-purple-800',
      gray:   'bg-gray-100 text-gray-800',
    };
    return map[color] ?? map['gray'];
  }
}
