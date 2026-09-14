import { Component, ChangeDetectionStrategy, inject, signal, computed, effect, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { GpsService, GpsTarget, GpsTask, GpsUpdate, GpsTargetSource, GpsTargetMetric, MeasureOption } from '../services/gps.service';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon';
import { ViewStateService } from '../../../../services/view-state.service';
import { AchievementsService, Achievement } from '../services/achievements.service';
import { AuthService } from '../../../auth/auth.service';
import { FinancialYearService } from '../../../../services/financial-year.service';

type View = 'table' | 'grouped';
type PopupMode = 'view' | 'edit';

@Component({
  selector: 'app-gps-hierarchy',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AppIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { --ios-navy:#0f1a31; --ios-blue:#1763ff; --ios-purple:#7c3aed; --ios-green:#079447; --ios-orange:#e95a0c; --ios-red:#d92d20; --ios-ink:#15213a; --ios-copy:#41516d; --ios-muted:#71809a; --ios-line:#dfe5ee; --ios-canvas:#f6f8fb; --ios-white:#fff; --ios-blue-soft:#edf4ff; --ios-green-soft:#ecfdf3; --ios-red-soft:#fff1f0; --ios-orange-soft:#fff7ed; --ios-purple-soft:#f5f3ff; display:block; background:var(--ios-canvas); min-height:100%; }
  `],
  template: `
  <div class="sw-wrap">
    <div class="sw-heading">
      <div>
        <h2 class="sw-title">GPS Targets</h2>
        <p class="sw-subtitle">Track measurable outcomes while preserving the strategic source behind each target. Company {{ companyId() }}</p>
      </div>
      <div class="sw-legend" aria-label="Legend">
        <span class="sw-key"><span class="sw-dot target"></span> GPS target</span>
        <span class="sw-key"><span class="sw-dot task"></span> Task</span>
      </div>
    </div>

    @if (error()) { <div class="sw-alert error">{{ error() }}</div> }
    @if (successMsg()) { <div class="sw-alert success">{{ successMsg() }}</div> }

    <div class="sw-summary">
      <div class="sw-summary-item"><div class="sw-summary-value">{{ total() }}</div><div class="sw-summary-label">GPS targets</div></div>
      <div class="sw-summary-item"><div class="sw-summary-value">{{ linkedCount() }}</div><div class="sw-summary-label">Linked to SWOT</div></div>
      <div class="sw-summary-item"><div class="sw-summary-value">{{ activeTasksCount() }}</div><div class="sw-summary-label">Active tasks</div></div>
      <div class="sw-summary-item"><div class="sw-summary-value">{{ avgProgress() }}%</div><div class="sw-summary-label">Average progress</div></div>
    </div>

    <div class="sw-toolbar">
      <div class="sw-seg" role="tablist" aria-label="View">
        <button type="button" role="tab" [class.active]="view() === 'table'" [attr.aria-selected]="view() === 'table'" (click)="view.set('table')">
          <app-icon name="table-cells"></app-icon> Table
        </button>
        <button type="button" role="tab" [class.active]="view() === 'grouped'" [attr.aria-selected]="view() === 'grouped'" (click)="view.set('grouped')">
          <app-icon name="rectangle-group"></app-icon> Grouped
        </button>
      </div>

      <div class="sw-spacer"></div>

      <label class="sw-search">
        <app-icon name="magnifying-glass"></app-icon>
        <input type="search" placeholder="Search targets…" [ngModel]="search()" (ngModelChange)="search.set($event)" aria-label="Search targets">
        @if (search()) {
          <button class="sw-search-clear" type="button" aria-label="Clear search" (click)="search.set('')"><app-icon name="x-mark"></app-icon></button>
        }
      </label>

      <button class="sw-btn" type="button" [class.active]="filtersOpen() || activeFilterCount() > 0" (click)="filtersOpen.set(!filtersOpen())">
        <app-icon name="funnel"></app-icon> Filter
        @if (activeFilterCount() > 0) { <span class="sw-filter-count">{{ activeFilterCount() }}</span> }
      </button>

      <button class="sw-btn" type="button" (click)="load()"><app-icon name="arrow-path"></app-icon> Refresh</button>

      <a class="sw-btn" [routerLink]="['/company', companyId(), 'swot-v2']">SWOT Workspace</a>

      <button class="sw-btn primary" type="button" (click)="openCreate()"><app-icon name="plus"></app-icon> Add target</button>
    </div>

    @if (filtersOpen()) {
      <div class="sw-filters">
        <div class="sw-filter-row">
          <span class="sw-filter-label">Category</span>
          <div class="sw-chipgroup">
            @for (c of categories; track c.key) {
              <button class="sw-chip" type="button" [class.on]="isCatFiltered(c.key)" (click)="toggleCatFilter(c.key)">{{ c.label }}</button>
            }
          </div>
        </div>
        <div class="sw-filter-row">
          <span class="sw-filter-label">Priority</span>
          <div class="sw-chipgroup">
            @for (p of priorities; track p) {
              <button class="sw-chip" type="button" [class.on]="isPrioFiltered(p)" (click)="toggleSetFilter(prioFilter, p)">{{ p }}</button>
            }
          </div>
        </div>
        <div class="sw-filter-row">
          <span class="sw-filter-label">Status</span>
          <div class="sw-chipgroup">
            @for (s of statuses; track s) {
              <button class="sw-chip" type="button" [class.on]="isStatusFiltered(s)" (click)="toggleSetFilter(statusFilter, s)">{{ statusLabel(s) }}</button>
            }
          </div>
        </div>
        <div class="sw-filter-row">
          <span class="sw-filter-label">Source</span>
          <div class="sw-chipgroup">
            @for (l of sourceFilters; track l.key) {
              <button class="sw-chip" type="button" [class.on]="sourceFilter() === l.key" (click)="sourceFilter.set(l.key)">{{ l.label }}</button>
            }
            @if (activeFilterCount() > 0) {
              <button class="sw-chip" type="button" style="color:var(--ios-red); border-color:#fecdca;" (click)="clearFilters()">Clear all</button>
            }
          </div>
        </div>
      </div>
    }

    @if (selected().size > 0) {
      <div class="sw-bulk">
        <span><strong>{{ selected().size }}</strong> selected</span>
        <span class="sw-spacer" style="flex:1"></span>
        <select [(ngModel)]="bulkStatus" aria-label="Bulk status">
          @for (s of statuses; track s) { <option [value]="s">{{ statusLabel(s) }}</option> }
        </select>
        <button class="sw-btn sm" type="button" (click)="applyBulkStatus()">Apply status</button>
        <button class="sw-btn sm danger" type="button" (click)="bulkDelete()">Delete</button>
        <button class="sw-btn sm" type="button" (click)="clearSelection()">Clear</button>
      </div>
    }

    @if (loading()) {
      <div class="sw-footnote">Loading…</div>
    } @else if (total() === 0) {
      <div class="sw-empty-target"><span>No GPS targets for this company yet.</span><button class="sw-btn primary" type="button" (click)="openCreate()"><app-icon name="plus"></app-icon> Add target</button></div>
    } @else if (view() === 'table') {
      <div class="sw-table-card">
        <table class="sw-table">
          <ng-container [ngTemplateOutlet]="tableHead"></ng-container>
          <tbody>
            <ng-container [ngTemplateOutlet]="tableRows" [ngTemplateOutletContext]="{ $implicit: sorted() }"></ng-container>
          </tbody>
        </table>
      </div>
      @if (sorted().length === 0) {
        <div class="sw-group-empty" style="margin-top:10px;">No targets match the current filters.</div>
      }
    } @else {
      @for (g of groups(); track g.key) {
        <section class="sw-group">
          <button class="sw-group-head" type="button" (click)="toggleGroup(g.key)" [attr.aria-expanded]="!collapsedGroups().has(g.key)">
            <app-icon [name]="collapsedGroups().has(g.key) ? 'chevron-right' : 'chevron-down'"></app-icon>
            <span class="sw-badge {{ g.key }}">{{ g.label }}</span>
            <span class="sw-group-count">{{ g.rows.length }} target{{ g.rows.length === 1 ? '' : 's' }}</span>
            <span class="sw-group-spacer"></span>
            <span class="sw-group-meta">{{ groupProgress(g.rows) }}% avg · {{ groupTasks(g.rows) }} tasks</span>
          </button>
          @if (!collapsedGroups().has(g.key)) {
            @if (g.rows.length === 0) {
              <div class="sw-group-empty">No {{ g.label.toLowerCase() }} targets match the current filters.</div>
            } @else {
              <div class="sw-table-card">
                <table class="sw-table">
                  <ng-container [ngTemplateOutlet]="tableHead"></ng-container>
                  <tbody>
                    <ng-container [ngTemplateOutlet]="tableRows" [ngTemplateOutletContext]="{ $implicit: g.rows }"></ng-container>
                  </tbody>
                </table>
              </div>
            }
          }
        </section>
      }
    }

    <div class="sw-footnote">
      path: company/{{ companyId() }}/gps-targets-v2 · Total {{ total() }}
      @if (counts(); as c) {
        · Overdue: {{ c.counts?.overdue ?? c.overdue ?? 0 }} · At risk: {{ c.counts?.at_risk ?? c.at_risk ?? 0 }} · Due this month: {{ c.counts?.due_30_days ?? c.due_this_month ?? 0 }}
      }
    </div>
  </div>

  <ng-template #tableHead>
    <thead>
      <tr>
        <th class="sw-th-check"><input type="checkbox" [checked]="allVisibleSelected()" (change)="toggleSelectAllVisible($event)" aria-label="Select all visible targets"></th>
        @if (view() === 'table') {
          <th class="sortable" (click)="toggleSort('category')">Category <app-icon class="sw-sort-icon" [class.is-active]="sortKey() === 'category'" [name]="sortIcon('category')"></app-icon></th>
        }
        <th class="sortable" (click)="toggleSort('title')">Target <app-icon class="sw-sort-icon" [class.is-active]="sortKey() === 'title'" [name]="sortIcon('title')"></app-icon></th>
        <th class="sortable" (click)="toggleSort('priority')">Priority <app-icon class="sw-sort-icon" [class.is-active]="sortKey() === 'priority'" [name]="sortIcon('priority')"></app-icon></th>
        <th class="sortable" (click)="toggleSort('status')">Status <app-icon class="sw-sort-icon" [class.is-active]="sortKey() === 'status'" [name]="sortIcon('status')"></app-icon></th>
        <th class="sortable col-owner" (click)="toggleSort('owner_label')">Owner <app-icon class="sw-sort-icon" [class.is-active]="sortKey() === 'owner_label'" [name]="sortIcon('owner_label')"></app-icon></th>
        <th class="sortable col-date" (click)="toggleSort('due_date')">Due date <app-icon class="sw-sort-icon" [class.is-active]="sortKey() === 'due_date'" [name]="sortIcon('due_date')"></app-icon></th>
        <th class="sortable" (click)="toggleSort('source')">Source <app-icon class="sw-sort-icon" [class.is-active]="sortKey() === 'source'" [name]="sortIcon('source')"></app-icon></th>
        <th class="sortable num" (click)="toggleSort('tasks')">Tasks <app-icon class="sw-sort-icon" [class.is-active]="sortKey() === 'tasks'" [name]="sortIcon('tasks')"></app-icon></th>
        <th class="sortable num" (click)="toggleSort('progress')">Progress <app-icon class="sw-sort-icon" [class.is-active]="sortKey() === 'progress'" [name]="sortIcon('progress')"></app-icon></th>
        <th class="sw-td-actions"></th>
      </tr>
    </thead>
  </ng-template>

  <ng-template #tableRows let-rows>
    @for (t of rows; track t.id) {
      <tr class="sw-row" [class.selected]="selected().has(t.id)" (click)="openView(t)">
        <td class="sw-td-check" (click)="$event.stopPropagation()">
          <input type="checkbox" [checked]="selected().has(t.id)" (change)="toggleSelect(t.id)" [attr.aria-label]="'Select target ' + t.id">
        </td>
        @if (view() === 'table') {
          <td><span class="sw-badge {{ t.category }}">{{ categoryLabel(t.category) }}</span></td>
        }
        <td class="sw-td-finding">
          <div class="sw-finding">
            <div>
              <div class="sw-finding-title">{{ t.title }}</div>
              @if (t.description && t.description !== t.title) { <div class="sw-finding-sub">{{ t.description }}</div> }
            </div>
          </div>
        </td>
        <td><span class="sw-pill {{ pillClass(t.priority) }}">{{ t.priority }}</span></td>
        <td><span class="sw-pill {{ 'status-' + t.status }}">{{ statusLabel(t.status) }}</span></td>
        <td class="col-owner">{{ t.owner_label || '—' }}</td>
        <td class="col-date">{{ t.due_date || '—' }}</td>
        <td>
          @if (sources()[t.id] === undefined) { <span style="color:var(--ios-muted)">…</span> }
          @else if (hasSwotSource(t.id)) { <span class="sw-pill status-completed">Linked</span> }
          @else { <span class="sw-pill">Not linked</span> }
        </td>
        <td class="num"><span class="sw-count" [class.zero]="taskCount(t.id) === 0">{{ taskCount(t.id) }}</span></td>
        <td class="num" style="min-width:132px;">
          <div style="display:flex; align-items:center; gap:8px; justify-content:flex-end;">
            <div class="sw-progress" style="width:64px; margin:0;"><span [style.width.%]="t.manual_progress_percentage"></span></div>
            <span class="sw-progress-value">{{ t.manual_progress_percentage }}%</span>
          </div>
        </td>
        <td class="sw-td-actions" (click)="$event.stopPropagation()">
          <button class="sw-icon-btn" type="button" title="View / edit target" aria-label="View target" (click)="openView(t)"><app-icon name="pencil-square"></app-icon></button>
          <button class="sw-icon-btn danger" type="button" title="Delete target" aria-label="Delete target" (click)="deleteTarget(t)"><app-icon name="trash"></app-icon></button>
        </td>
      </tr>
    }
  </ng-template>

  @if (popupOpen()) {
    <div class="sw-modal">
      <div class="sw-modal-card wide" (click)="$event.stopPropagation()">
        <div class="sw-modal-head">
          <div>
            <h3>{{ popupIsCreate() ? 'Add GPS target' : (popupMode() === 'edit' ? 'Edit GPS target' : (popupTarget()?.title || 'GPS target')) }}</h3>
            <div class="sw-head-sub">
              @if (popupIsCreate() || popupMode() === 'edit') { Company {{ companyId() }} — normalized API, no nodes }
              @else {
                @if (popupTarget(); as t) { {{ categoryLabel(t.category) }} · target #{{ t.id }} }
              }
            </div>
          </div>
          <button class="sw-icon-btn" type="button" aria-label="Close" (click)="closePopup()"><app-icon name="x-mark"></app-icon></button>
        </div>

        <div class="sw-modal-body">
          @if (popupMode() === 'view' && popupTarget(); as t) {
            <div class="sw-detail-text">{{ t.description || '—' }}</div>

            <div class="sw-section">
              <div class="sw-section-title">Progress <span>activity and outcome are kept separate</span></div>
              <div class="sw-kv">
                <div>
                  <span>Task progress</span>
                  <strong>{{ t.task_progress?.completed ?? 0 }}/{{ t.task_progress?.total ?? 0 }} · {{ t.task_progress?.percent ?? 0 }}%</strong>
                </div>
                @if (t.progress_mode === 'manual') {
                  <div><span>Manual progress</span><strong>{{ t.manual_progress_percentage }}%</strong></div>
                }
                @if (t.progress_mode === 'metric') {
                  <div><span>Outcome progress</span><strong>{{ outcomeProgressLabel() }}</strong></div>
                }
              </div>
              @if (t.progress_mode === 'manual') {
                <div class="sw-progress-row" style="margin-top:10px;">
                  <div class="sw-progress" [attr.aria-label]="'Manual progress ' + t.manual_progress_percentage + ' percent'"><span [style.width.%]="t.manual_progress_percentage"></span></div>
                  <span class="sw-progress-value">Manual</span>
                </div>
              }
              @if (t.progress_mode === 'tasks') {
                <div class="sw-progress-row" style="margin-top:10px;">
                  <div class="sw-progress" [attr.aria-label]="'Task progress ' + (t.task_progress?.percent ?? 0) + ' percent'"><span [style.width.%]="(t.task_progress?.percent ?? 0)"></span></div>
                  <span class="sw-progress-value">Tasks</span>
                </div>
              }
              @if (t.progress_mode === 'metric') {
                <div class="sw-progress-row" style="margin-top:10px;">
                  <div class="sw-progress" [attr.aria-label]="'Outcome progress ' + (actual()?.progress?.percent_display ?? 0) + ' percent'"><span [style.width.%]="(actual()?.progress?.percent_display ?? 0)"></span></div>
                  <span class="sw-progress-value">Outcome</span>
                </div>
              }
            </div>

            <div class="sw-section">
              <div class="sw-kv">
                <div><span>Priority</span><strong>{{ t.priority }}</strong></div>
                <div><span>Status</span><strong>{{ statusLabel(t.status) }}</strong></div>
                <div><span>Owner</span><strong>{{ t.owner_label || '—' }}</strong></div>
                <div><span>Due date</span><strong>{{ t.due_date || '—' }}</strong></div>
                <div><span>Progress mode</span><strong>{{ t.progress_mode }}</strong></div>
                <div><span>Record</span><strong>{{ t.legacy_node_id ? 'legacy #' + t.legacy_node_id : 'native' }}</strong></div>
              </div>
            </div>

            @if (t.progress_mode === 'metric') {
              <div class="sw-section">
                <div class="sw-section-title">Actual <span>derived from financial data · read-only</span></div>
                @if (actualLoading()) { <div class="sw-footnote" style="margin:0;">Calculating…</div> }
                @else if (actualError()) { <div class="sw-alert error" style="margin:0;">{{ actualError() }}</div> }
                @else {
                  @if (actual(); as m) {
                  @if (!m.configured) {
                    <div class="sw-alert" style="margin:0;">Not measurable — {{ statusLabel(m.reason || m.progress?.status) }}. Bind a measure in edit mode.</div>
                  } @else {
                    <div class="sw-trio" style="font-size:16px;">
                      {{ m.baseline?.subtotal ?? '—' }}<span class="arrow">→</span><span class="goal">{{ m.measure?.target_value ?? '—' }}</span><span class="arrow">→</span><span class="actual">{{ m.target?.subtotal ?? '—' }}</span>
                      @if (m.measure?.unit) { <span class="unit">{{ m.measure.unit }}</span> }
                    </div>
                    <div class="sw-kv" style="margin-top:10px;">
                      <div><span>Measure</span><strong>{{ m.measure?.metric_name }} ({{ m.measure?.metric_code }})</strong></div>
                      <div><span>Direction</span><strong>{{ m.measure?.direction }}</strong></div>
                      <div><span>Calculation</span><strong>{{ m.measure?.calculation_method }}</strong></div>
                      <div><span>Calculation version</span><strong>{{ m.calculation_version }}</strong></div>
                      <div><span>Baseline period</span><strong>{{ m.baseline?.period?.label || '—' }}</strong></div>
                      <div><span>Target period</span><strong>{{ m.target?.period?.label || '—' }}</strong></div>
                    </div>
                    <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:10px;">
                      <span class="sw-pill">baseline: {{ statusLabel(m.baseline?.status) }}</span>
                      <span class="sw-pill">target: {{ statusLabel(m.target?.status) }}</span>
                      <span class="sw-pill" [class.status-verified]="m.authoritative" [class.status-rejected]="!m.authoritative">{{ m.authoritative ? 'authoritative' : 'not authoritative' }}</span>
                      <span class="sw-pill" [class.status-verified]="m.eligible_for_achievement" [class.status-unverified]="!m.eligible_for_achievement">{{ m.eligible_for_achievement ? 'eligible for achievement' : 'not eligible for achievement' }}</span>
                    </div>
                    @if (m.baseline?.subtotal_is_partial || m.target?.subtotal_is_partial) {
                      <div class="sw-footnote" style="margin:8px 0 0; color:var(--ios-red);">Subtotals are partial — do not read these as achieved revenue.</div>
                    }
                    <div class="sw-kv" style="margin-top:10px;">
                      <div><span>Baseline coverage</span><strong>{{ coverageLabel(m.baseline) }}</strong></div>
                      <div><span>Target coverage</span><strong>{{ coverageLabel(m.target) }}</strong></div>
                      <div><span>Baseline missing</span><strong>{{ missingLabel(m.baseline) }}</strong></div>
                      <div><span>Target missing</span><strong>{{ missingLabel(m.target) }}</strong></div>
                      <div><span>Baseline unresolved rows</span><strong>{{ m.baseline?.unresolved_rows ?? 0 }}</strong></div>
                      <div><span>Target unresolved rows</span><strong>{{ m.target?.unresolved_rows ?? 0 }}</strong></div>
                    </div>
                    @if (m.progress?.status && m.progress.status !== 'computed') {
                      <div class="sw-alert" style="margin:10px 0 0;">Outcome progress: {{ statusLabel(m.progress.status) }} — {{ m.progress.reason }}</div>
                    }
                    @if (m.warnings?.length) {
                      <ul style="margin:8px 0 0; padding-left:16px;">
                        @for (w of m.warnings; track w) { <li class="sw-footnote" style="margin:0;">{{ w }}</li> }
                      </ul>
                    }
                    }
                  }
                }
              </div>
            }

            <div class="sw-section">
              <div class="sw-section-title">
                <span>Results &amp; achievements ({{ achievementOutcomes().length }})</span>
                <button class="sw-btn sm" type="button" (click)="openAchievementForm()"><app-icon name="plus"></app-icon> Add</button>
              </div>
              @if (achievementsLoading()) { <div class="sw-footnote" style="margin:0;">Loading…</div> }
              @else if (targetAchievements().length === 0) { <div class="sw-footnote" style="margin:0;">No results, achievements or decisions linked to this target yet.</div> }
              @else {
                @for (a of targetAchievements(); track a.id) {
                  <div class="sw-source-row">
                    <span class="sw-source-kind">
                      <span class="sw-badge {{ a.kind }}">{{ a.kind === 'achievement' ? 'Achievement' : a.kind === 'decision' ? 'Decision' : 'Result' }}</span>
                      @if (a.kind === 'decision') { <span class="sw-pill">Event · excluded from counts</span> }
                      @else { <span class="sw-pill status-{{ a.verification_status }}">{{ statusLabel(a.verification_status) }}</span> }
                      <span class="sw-pill">{{ a.evidence_count ?? 0 }} evidence</span>
                    </span>
                    <div style="font-weight:600; color:var(--ios-ink);">{{ a.title }}</div>
                    <div class="sw-mini" style="color:var(--ios-muted);">Achieved {{ a.achieved_on || '—' }}{{ a.verified_by ? ' · verified by ' + a.verified_by : '' }}</div>
                    @if (a.kind !== 'decision' && (canVerifyAchievement(a) || canRevokeAchievement(a))) {
                      <div style="margin-top:6px; display:flex; gap:6px; flex-wrap:wrap;">
                        @if (canVerifyAchievement(a)) {
                          <button class="sw-btn sm" type="button" (click)="rejectAchievement(a)">Reject</button>
                          <button class="sw-btn sm primary" type="button" (click)="verifyAchievement(a)">Verify</button>
                        }
                        @if (canRevokeAchievement(a)) {
                          @if (revokingId() === a.id) {
                            <input class="sw-input" [(ngModel)]="revokeReason" placeholder="Revocation reason (required)" (keyup.enter)="confirmRevoke(a)">
                            <button class="sw-btn sm danger" type="button" (click)="confirmRevoke(a)">Confirm revoke</button>
                            <button class="sw-btn sm" type="button" (click)="cancelRevoke()">Cancel</button>
                            @if (revokeError()) { <span style="color:var(--ios-red); font-size:10px;">{{ revokeError() }}</span> }
                          } @else {
                            <button class="sw-btn sm danger" type="button" (click)="revokeAchievement(a)">Revoke…</button>
                            <button class="sw-btn sm" type="button" (click)="supersedeAchievement(a)">Supersede</button>
                          }
                        }
                      </div>
                    }
                  </div>
                }
              }
              @if (achOpen()) {
                <div class="sw-form-grid" style="margin-top:8px; border-top:1px solid var(--ios-line); padding-top:10px;">
                  <label class="sw-field span2"><span>Title *</span><input class="sw-input" [(ngModel)]="achTitle" placeholder="e.g. Q4 domestic revenue exceeded target"></label>
                  <label class="sw-field"><span>Kind</span>
                    <select class="sw-select" [(ngModel)]="achKind">
                      <option value="result">Result</option>
                      <option value="achievement">Achievement</option>
                    </select>
                  </label>
                  <label class="sw-field"><span>Achieved on</span><input class="sw-input" type="date" [(ngModel)]="achAchievedOn"></label>
                  <label class="sw-field span2"><span>Description</span><textarea class="sw-textarea" [(ngModel)]="achDescription" placeholder="What happened, and how do you know?"></textarea></label>
                  <label class="sw-field span2"><span>Evidence summary</span><textarea class="sw-textarea" [(ngModel)]="achEvidenceSummary" placeholder="Optional — supporting evidence summary"></textarea></label>
                </div>
                @if (achError()) { <div class="sw-alert error" style="margin-top:8px;">{{ achError() }}</div> }
                <div class="sw-inline-row" style="margin-top:8px;">
                  <button class="sw-btn" type="button" (click)="cancelAchievementForm()">Cancel</button>
                  <button class="sw-btn primary" type="button" [disabled]="achSaving()" (click)="createAchievementDraft()">{{ achSaving() ? 'Creating…' : 'Create draft' }}</button>
                </div>
                <div class="sw-footnote" style="margin:6px 0 0;">Verification captures the authoritative financial snapshot at review time; only a System Administrator can verify, reject, revoke or supersede.</div>
              }
            </div>

            <div class="sw-section">
              <div class="sw-section-title">Linked SWOT findings</div>
              @if (sources()[t.id] === undefined) { <div class="sw-footnote" style="margin:0;">Loading…</div> }
              @else if (swotSources(t.id).length) {
                @for (s of swotSources(t.id); track s.id) {
                  <div class="sw-source-row">
                    <span class="sw-source-kind">SWOT {{ s.swot_category || 'finding' }} · #{{ s.swot_item_id }}</span>
                    {{ s.swot_description || '—' }}
                  </div>
                }
              } @else {
                <div class="sw-empty-target">Legacy import — not linked to a SWOT item</div>
              }
            </div>

            <div class="sw-section">
              <div class="sw-section-title"><span>Tasks ({{ tasks()[t.id]?.length || 0 }})</span></div>
              @if (tasks()[t.id] === undefined) { <div class="sw-footnote" style="margin:0;">Loading tasks…</div> }
              @else {
                @if (tasks()[t.id].length) {
                  <div class="sw-tasks" style="border-top:0; margin-top:0; padding-top:0;">
                    @for (task of tasks()[t.id]; track task.id) {
                      <div class="sw-task" [class.done]="task.status === 'completed'">
                        <input type="checkbox" [checked]="task.status === 'completed'" (change)="toggleTask(task)" [attr.aria-label]="'Toggle task ' + task.title">
                        @if (taskEditing() === task.id) {
                          <span class="sw-task-name">
                            <input class="sw-input" [(ngModel)]="taskEditTitle" (keyup.enter)="saveTaskEdit(task)" (keyup.escape)="cancelTaskEditor()" aria-label="Edit task title">
                          </span>
                          <span class="sw-task-owner">
                            @if (taskEditError()) { <span style="color:var(--ios-red); font-size:10px;">{{ taskEditError() }}</span> }
                            <button class="sw-link" (click)="saveTaskEdit(task)">Save</button>
                            <button class="sw-link" (click)="cancelTaskEditor()">Cancel</button>
                          </span>
                        } @else {
                          <span class="sw-task-name">{{ task.title }} <span style="color:var(--ios-muted); font-size:10px;">· {{ statusLabel(task.status) }} · due {{ task.due_date || '—' }}</span></span>
                          <span class="sw-task-owner">
                            <button class="sw-link" (click)="openTaskEditor(task)">Edit</button>
                            <button class="sw-link" style="color:var(--ios-red)" (click)="deleteTask(task)">Delete</button>
                            <button class="sw-link" (click)="moveTask(task, -1)" aria-label="Move task up">↑</button>
                            <button class="sw-link" (click)="moveTask(task, 1)" aria-label="Move task down">↓</button>
                          </span>
                        }
                      </div>
                    }
                  </div>
                } @else { <div class="sw-footnote" style="margin:0;">No tasks yet.</div> }
                <div class="sw-inline-row" style="margin-top:8px;">
                  <input class="sw-input grow" placeholder="New task title" [(ngModel)]="newTaskTitle[t.id]" (keyup.enter)="addTask(t.id)">
                  <button class="sw-btn sm" type="button" (click)="addTask(t.id)">Add task</button>
                </div>
              }
            </div>

            <div class="sw-section">
              <div class="sw-section-title"><span>Progress updates ({{ updates()[t.id]?.length || 0 }})</span></div>
              @if (updates()[t.id] === undefined) { <div class="sw-footnote" style="margin:0;">Loading updates…</div> }
              @else {
                @for (u of updates()[t.id]; track u.id) {
                  <div class="sw-note-row">
                    <div class="sw-note-top"><span class="sw-note-strong">{{ statusLabel(u.status) }} · {{ u.progress_percentage }}%</span><span class="sw-note-when">{{ u.recorded_at }}</span></div>
                    @if (u.note) { <div style="color:var(--ios-copy); margin-top:2px;">{{ u.note }}</div> }
                    <div class="sw-note-by">by {{ u.recorded_by || '—' }}</div>
                  </div>
                }
                @if (updates()[t.id].length === 0) { <div class="sw-footnote" style="margin:0;">No updates yet.</div> }
              }
              <div class="sw-form-grid" style="margin-top:8px;">
                <label class="sw-field"><span>Progress %</span><input class="sw-input" type="number" min="0" max="100" [(ngModel)]="newUpdateProgress[t.id]"></label>
                <label class="sw-field"><span>Status</span>
                  <select class="sw-select" [(ngModel)]="newUpdateStatus[t.id]">
                    @for (s of statuses; track s) { <option [value]="s">{{ statusLabel(s) }}</option> }
                  </select>
                </label>
                <label class="sw-field span2"><span>Note</span><textarea class="sw-textarea" placeholder="Optional" [(ngModel)]="newUpdateNote[t.id]"></textarea></label>
              </div>
              @if (updateError()[t.id]) { <div class="sw-alert error" style="margin:8px 0 0;">{{ updateError()[t.id] }}</div> }
              <button class="sw-btn primary sm" type="button" style="margin-top:8px;" (click)="addUpdate(t.id)">Add update</button>
            </div>
          } @else {
            <div class="sw-form-grid">
              <label class="sw-field span2"><span>Description *</span><textarea class="sw-textarea" [(ngModel)]="formDescription" placeholder="What is the measurable target?"></textarea></label>
              <label class="sw-field span2"><span>Title (optional)</span><input class="sw-input" [(ngModel)]="formTitle" placeholder="Auto from description if blank"></label>
              <label class="sw-field"><span>Category</span>
                <select class="sw-select" [(ngModel)]="formCategory">
                  @for (c of categories; track c.key) { <option [value]="c.key">{{ c.label }}</option> }
                </select>
              </label>
              <label class="sw-field"><span>Priority</span>
                <select class="sw-select" [(ngModel)]="formPriority">
                  @for (p of priorities; track p) { <option [value]="p">{{ p }}</option> }
                </select>
              </label>
              <label class="sw-field"><span>Status</span>
                <select class="sw-select" [(ngModel)]="formStatus">
                  @for (s of statuses; track s) { <option [value]="s">{{ statusLabel(s) }}</option> }
                </select>
              </label>
              <label class="sw-field"><span>Due date</span><input class="sw-input" type="date" [(ngModel)]="formDueDate"></label>
              <label class="sw-field"><span>Owner label</span><input class="sw-input" [(ngModel)]="formOwner" placeholder="e.g. Financial Manager"></label>
              <label class="sw-field"><span>Progress mode</span>
                <select class="sw-select" [(ngModel)]="formProgressMode">
                  <option value="manual">Manual</option><option value="tasks">Tasks</option><option value="metric">Metric</option>
                </select>
              </label>
              <label class="sw-field span2"><span>Manual progress %</span><input class="sw-input" type="number" min="0" max="100" [(ngModel)]="formProgress"></label>
            </div>
            @if (!popupIsCreate()) {
              <div class="sw-section" style="border-top:1px solid var(--ios-line); padding-top:12px;">
                <div class="sw-section-title">
                  <span>Measure binding</span>
                  <span class="sw-pill">{{ bindings().length ? 'bound' : 'not bound' }}</span>
                </div>
                @if (!measures().length) {
                  <div class="sw-footnote" style="margin:0 0 8px;">No measures with account bindings are available.</div>
                }
                <div class="sw-form-grid">
                  <label class="sw-field"><span>Measure</span>
                    <select class="sw-select" [(ngModel)]="bindMetricTypeId">
                      @for (m of measures(); track m.id) { <option [ngValue]="m.id">{{ m.name }} ({{ m.code }}){{ m.usable === false ? ' — no company accounts (will read no_accounts)' : '' }}</option> }
                    </select>
                  </label>
                  <label class="sw-field"><span>Direction</span>
                    <select class="sw-select" [(ngModel)]="bindDirection">
                      <option value="increase">Increase</option>
                      <option value="decrease">Decrease</option>
                      <option value="maintain">Maintain</option>
                    </select>
                  </label>
                  <label class="sw-field"><span>Baseline FY</span>
                    <select class="sw-select" [(ngModel)]="bindBaselineYearId">
                      <option [ngValue]="0">—</option>
                      @for (y of financialYears(); track y.id) { <option [ngValue]="y.id">{{ y.name }}</option> }
                    </select>
                  </label>
                  <label class="sw-field"><span>Baseline period</span>
                    <select class="sw-select" [(ngModel)]="bindBaselineQuarter">
                      <option value="FY">Full year</option><option value="1">Q1</option><option value="2">Q2</option><option value="3">Q3</option><option value="4">Q4</option>
                    </select>
                  </label>
                  <label class="sw-field"><span>Target FY</span>
                    <select class="sw-select" [(ngModel)]="bindTargetYearId">
                      <option [ngValue]="0">—</option>
                      @for (y of financialYears(); track y.id) { <option [ngValue]="y.id">{{ y.name }}</option> }
                    </select>
                  </label>
                  <label class="sw-field"><span>Target period</span>
                    <select class="sw-select" [(ngModel)]="bindTargetQuarter">
                      <option value="FY">Full year</option><option value="1">Q1</option><option value="2">Q2</option><option value="3">Q3</option><option value="4">Q4</option>
                    </select>
                  </label>
                  <label class="sw-field"><span>Goal ({{ measureUnit() }}) *</span><input class="sw-input" type="number" [(ngModel)]="bindGoal"></label>
                  <label class="sw-field"><span>Calculation method</span><input class="sw-input" value="period_total" disabled></label>
                  @if (bindDirection === 'maintain') {
                    <label class="sw-field"><span>Tolerance</span><input class="sw-input" type="number" [(ngModel)]="bindToleranceValue"></label>
                    <label class="sw-field"><span>Tolerance unit</span>
                      <select class="sw-select" [(ngModel)]="bindToleranceUnit">
                        <option value="absolute">Absolute</option><option value="percent">Percent</option>
                      </select>
                    </label>
                  }
                </div>
                @if (bindError()) { <div class="sw-alert error" style="margin-top:8px;">{{ bindError() }}</div> }
                <div class="sw-inline-row" style="margin-top:8px;">
                  @if (bindings().length) { <button class="sw-btn danger" type="button" [disabled]="bindSaving()" (click)="removeBinding()">Remove binding</button> }
                  <button class="sw-btn primary" type="button" [disabled]="bindSaving()" (click)="saveBinding()">{{ bindSaving() ? 'Saving…' : (bindings().length ? 'Update binding' : 'Bind measure') }}</button>
                </div>
                <div class="sw-footnote" style="margin:6px 0 0;">Only the implemented <strong>period_total</strong> method is available. Saving reloads the binding and derived actual from the server.</div>
              </div>
            }
            @if (formError()) { <div class="sw-alert error" style="margin-top:10px;">{{ formError() }}</div> }
          }
        </div>

        <div class="sw-modal-foot">
          @if (popupMode() === 'view' && popupTarget()) {
            <button class="sw-btn danger" type="button" (click)="deletePopupTarget()">Delete</button>
            <button class="sw-btn" type="button" (click)="closePopup()">Close</button>
            <button class="sw-btn primary" type="button" (click)="startEdit()">Edit</button>
          } @else {
            <button class="sw-btn" type="button" (click)="cancelEdit()">Cancel</button>
            <button class="sw-btn primary" type="button" (click)="saveTarget()" [disabled]="formLoading()">{{ formLoading() ? 'Saving…' : (popupIsCreate() ? 'Create target' : 'Save changes') }}</button>
          }
        </div>
      </div>
    </div>
  }
  `,
})
export class GpsHierarchyPage {
  private route = inject(ActivatedRoute);
  private gps = inject(GpsService);
  private ui = inject(ViewStateService);
  private achievementsApi = inject(AchievementsService);
  private auth = inject(AuthService);
  private yearsApi = inject(FinancialYearService);
  private viewStateRestored = false;

  constructor() {
    // Persist view settings (view mode, filters, sort, grouping) so a refresh or
    // returning to the page keeps the user's layout. See AGENTS.md.
    effect(() => {
      const cid = this.companyId();
      const state = this.captureViewState();
      if (!cid || !this.viewStateRestored) return;
      this.ui.save(`gps-hierarchy-view:${cid}`, state);
    });
  }

  companyId = signal<number>(0);
  loading = signal(false);
  error = signal<string | null>(null);
  successMsg = signal<string | null>(null);
  grouped = signal<Record<string, GpsTarget[]>>({});
  counts = signal<any>(null);
  tasks = signal<Record<number, GpsTask[]>>({});
  updates = signal<Record<number, GpsUpdate[]>>({});
  sources = signal<Record<number, GpsTargetSource[]>>({});

  newTaskTitle: Record<number, string> = {};
  newUpdateProgress: Record<number, number | null> = {};
  newUpdateStatus: Record<number, string> = {};
  newUpdateNote: Record<number, string> = {};
  updateError = signal<Record<number, string | null>>({});

  // view state
  view = signal<View>('table');
  search = signal('');
  filtersOpen = signal(false);
  catFilter = signal<Set<string>>(new Set());
  prioFilter = signal<Set<string>>(new Set());
  statusFilter = signal<Set<string>>(new Set());
  sourceFilter = signal<'all' | 'linked' | 'independent'>('all');
  sortKey = signal<string>('category');
  sortDir = signal<'asc' | 'desc'>('asc');
  collapsedGroups = signal<Set<string>>(new Set());
  selected = signal<Set<number>>(new Set());
  bulkStatus = 'in_progress';

  // popup
  popupOpen = signal(false);
  popupMode = signal<PopupMode>('view');
  popupIsCreate = signal(false);
  popupTarget = signal<GpsTarget | null>(null);

  // edit/create form
  formTitle = '';
  formDescription = '';
  formCategory: GpsTarget['category'] = 'finance';
  formPriority = 'medium';
  formStatus: GpsTarget['status'] = 'not_started';
  formDueDate = '';
  formOwner = '';
  formProgressMode: GpsTarget['progress_mode'] = 'manual';
  formProgress: number | null = 0;
  formError = signal<string | null>(null);
  formLoading = signal(false);

  // ---- Phase 7: actual measurement, measure binding, achievements, task editor ----
  isSA = computed(() => this.auth.isSystemAdministrator());
  actual = signal<any | null>(null);
  actualLoading = signal(false);
  actualError = signal<string | null>(null);

  bindings = signal<GpsTargetMetric[]>([]);
  measures = signal<MeasureOption[]>([]);
  financialYears = signal<{ id: number; name: string }[]>([]);

  bindMetricTypeId: number | null = null;
  bindDirection: 'increase' | 'decrease' | 'maintain' = 'increase';
  bindBaselineYearId = 0;
  bindBaselineQuarter: 'FY' | '1' | '2' | '3' | '4' = 'FY';
  bindTargetYearId = 0;
  bindTargetQuarter: 'FY' | '1' | '2' | '3' | '4' = 'FY';
  bindGoal: number | null = null;
  bindToleranceValue: number | null = null;
  bindToleranceUnit: 'absolute' | 'percent' = 'absolute';
  bindError = signal<string | null>(null);
  bindSaving = signal(false);

  targetAchievements = signal<Achievement[]>([]);
  achievementsLoading = signal(false);
  revokingId = signal<number | null>(null);
  revokeReason = '';
  revokeError = signal<string | null>(null);

  taskEditing = signal<number | null>(null);
  taskEditTitle = '';
  taskEditError = signal<string | null>(null);

  achOpen = signal(false);
  achSaving = signal(false);
  achError = signal<string | null>(null);
  achTitle = '';
  achKind: 'result' | 'achievement' = 'result';
  achAchievedOn = '';
  achDescription = '';
  achEvidenceSummary = '';

  readonly categories = [
    { key: 'finance', label: 'Finance' },
    { key: 'strategy_general', label: 'Strategy / General' },
    { key: 'sales_marketing', label: 'Sales & Marketing' },
    { key: 'personal_development', label: 'Personal Development' },
  ] as const;

  readonly priorities = ['low', 'medium', 'high', 'critical'];
  readonly statuses = ['not_started', 'in_progress', 'at_risk', 'completed', 'cancelled'];
  readonly sourceFilters = [
    { key: 'all', label: 'All' },
    { key: 'linked', label: 'Linked to SWOT' },
    { key: 'independent', label: 'Not linked' },
  ] as const;

  private readonly catOrder: Record<string, number> = { finance: 0, strategy_general: 1, sales_marketing: 2, personal_development: 3 };
  private readonly rank: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };
  private readonly statusRank: Record<string, number> = { not_started: 0, in_progress: 1, at_risk: 2, completed: 3, cancelled: 4 };

  // ---------- derived ----------
  allTargets = computed(() => Object.values(this.grouped()).flatMap(arr => arr as GpsTarget[]));
  total = computed(() => this.allTargets().length);

  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const cats = this.catFilter();
    const prios = this.prioFilter();
    const stats = this.statusFilter();
    const src = this.sourceFilter();
    return this.allTargets().filter(t => {
      if (cats.size && !cats.has(t.category)) return false;
      if (prios.size && !prios.has(t.priority)) return false;
      if (stats.size && !stats.has(t.status)) return false;
      if (src !== 'all') {
        const linked = this.hasSwotSource(t.id);
        if (src === 'linked' && !linked) return false;
        if (src === 'independent' && linked) return false;
      }
      if (q) {
        const hay = ((t.title || '') + ' ' + (t.description || '') + ' ' + (t.owner_label || '')).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  });

  sorted = computed(() => {
    const key = this.sortKey();
    const dir = this.sortDir() === 'asc' ? 1 : -1;
    return [...this.filtered()].sort((a, b) => {
      const av = this.sortValue(a, key);
      const bv = this.sortValue(b, key);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      const ap = this.rank[a.priority] ?? 0;
      const bp = this.rank[b.priority] ?? 0;
      if (ap !== bp) return bp - ap;
      return b.id - a.id;
    });
  });

  groups = computed(() => {
    const rows = this.sorted();
    return this.categories.map(c => ({ key: c.key, label: c.label, rows: rows.filter(r => r.category === c.key) }));
  });

  activeFilterCount = computed(() =>
    this.catFilter().size + this.prioFilter().size + this.statusFilter().size + (this.sourceFilter() !== 'all' ? 1 : 0)
  );

  linkedCount = computed(() => this.allTargets().filter(t => this.hasSwotSource(t.id)).length);

  activeTasksCount = computed(() => {
    let c = 0;
    for (const arr of Object.values(this.tasks())) for (const t of arr as GpsTask[]) if (t.status !== 'completed') c++;
    return c;
  });

  avgProgress = computed(() => {
    const all = this.allTargets();
    if (!all.length) return 0;
    return Math.round(all.reduce((s, t) => s + Number(t.manual_progress_percentage || 0), 0) / all.length);
  });

  allVisibleSelected = computed(() => {
    const rows = this.sorted();
    return rows.length > 0 && rows.every(r => this.selected().has(r.id));
  });

  // ---------- lifecycle ----------
  ngOnInit(): void {
    this.loadFinancialYears();
    this.route.paramMap.subscribe(pm => {
      const v = Number(pm.get('id') || 0);
      if (v) { this.companyId.set(v); this.load(); }
    });
    this.route.parent?.paramMap.subscribe(pm => {
      const v = Number(pm.get('id') || 0);
      if (v) { this.companyId.set(v); this.load(); }
    });
    let r: ActivatedRoute | null = this.route;
    while (r && !this.companyId()) {
      const v = Number(r.snapshot.paramMap.get('id') || 0);
      if (v) { this.companyId.set(v); this.load(); break; }
      r = r.parent;
    }
  }

  load(): void {
    const cid = this.companyId();
    if (!cid) { this.error.set('Missing company id'); return; }
    if (!this.viewStateRestored) this.restoreViewState(cid);
    this.loadMeasures(cid);
    this.loading.set(true); this.error.set(null);
    this.gps.grouped(cid).subscribe({
      next: g => {
        this.grouped.set(g || {});
        this.loading.set(false);
        for (const t of this.allTargets()) { this.loadSources(t.id); this.loadTasks(t.id); }
      },
      error: e => { this.error.set(e.error?.error || e.message); this.loading.set(false); }
    });
    this.gps.dashboardCounts(cid).subscribe({ next: c => this.counts.set(c), error: () => {} });
  }

  hasSwotSource(targetId: number): boolean { return (this.sources()[targetId] || []).some(s => !!s.swot_item_id); }
  swotSources(targetId: number): GpsTargetSource[] { return (this.sources()[targetId] || []).filter(s => !!s.swot_item_id); }

  loadTasks(id: number): void { this.gps.tasks(id).subscribe({ next: rows => this.tasks.update(m => ({ ...m, [id]: rows })), error: () => this.tasks.update(m => ({ ...m, [id]: [] })) }); }
  loadUpdates(id: number): void { this.gps.updates(id).subscribe({ next: rows => this.updates.update(m => ({ ...m, [id]: rows })), error: () => this.updates.update(m => ({ ...m, [id]: [] })) }); }
  loadSources(id: number): void { this.gps.listByTarget(id).subscribe({ next: rows => this.sources.update(m => ({ ...m, [id]: rows as any })), error: () => this.sources.update(m => ({ ...m, [id]: [] })) }); }

  // ---------- view persistence ----------
  private captureViewState() {
    return {
      view: this.view(),
      search: this.search(),
      cat: [...this.catFilter()],
      prio: [...this.prioFilter()],
      status: [...this.statusFilter()],
      source: this.sourceFilter(),
      sortKey: this.sortKey(),
      sortDir: this.sortDir(),
      collapsed: [...this.collapsedGroups()],
    };
  }

  private restoreViewState(cid: number): void {
    const s = this.ui.load(`gps-hierarchy-view:${cid}`, this.captureViewState());
    this.view.set(s.view === 'grouped' ? 'grouped' : 'table');
    this.search.set(typeof s.search === 'string' ? s.search : '');
    this.catFilter.set(new Set(this.ui.array<string>(s.cat)));
    this.prioFilter.set(new Set(this.ui.array<string>(s.prio)));
    this.statusFilter.set(new Set(this.ui.array<string>(s.status)));
    this.sourceFilter.set((['all', 'linked', 'independent'].includes(s.source) ? s.source : 'all') as 'all' | 'linked' | 'independent');
    this.sortKey.set(typeof s.sortKey === 'string' ? s.sortKey : 'category');
    this.sortDir.set(s.sortDir === 'desc' ? 'desc' : 'asc');
    this.collapsedGroups.set(new Set(this.ui.array<string>(s.collapsed)));
    this.viewStateRestored = true;
  }

  // ---------- filters / sort / view ----------
  toggleSort(key: string): void {
    if (this.sortKey() === key) this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    else { this.sortKey.set(key); this.sortDir.set('asc'); }
  }

  sortIcon(key: string): string {
    if (this.sortKey() !== key) return 'chevron-up-down';
    return this.sortDir() === 'asc' ? 'arrow-up' : 'arrow-down';
  }

  toggleSetFilter(target: WritableSignal<Set<string>>, value: string): void {
    const next = new Set(target());
    if (next.has(value)) next.delete(value); else next.add(value);
    target.set(next);
  }

  toggleCatFilter(cat: string): void {
    const next = new Set(this.catFilter());
    if (next.has(cat)) next.delete(cat); else next.add(cat);
    this.catFilter.set(next);
  }

  isCatFiltered(cat: string): boolean { return this.catFilter().has(cat); }
  isPrioFiltered(v: string): boolean { return this.prioFilter().has(v); }
  isStatusFiltered(v: string): boolean { return this.statusFilter().has(v); }

  clearFilters(): void {
    this.catFilter.set(new Set());
    this.prioFilter.set(new Set());
    this.statusFilter.set(new Set());
    this.sourceFilter.set('all');
    this.search.set('');
  }

  toggleGroup(key: string): void {
    const next = new Set(this.collapsedGroups());
    if (next.has(key)) next.delete(key); else next.add(key);
    this.collapsedGroups.set(next);
  }

  // ---------- selection / bulk ----------
  toggleSelect(id: number): void {
    const next = new Set(this.selected());
    if (next.has(id)) next.delete(id); else next.add(id);
    this.selected.set(next);
  }

  clearSelection(): void { this.selected.set(new Set<number>()); }

  toggleSelectAllVisible(ev: Event): void {
    const checked = (ev.target as HTMLInputElement).checked;
    const next = new Set(this.selected());
    for (const r of this.sorted()) { if (checked) next.add(r.id); else next.delete(r.id); }
    this.selected.set(next);
  }

  applyBulkStatus(): void {
    const ids = Array.from(this.selected());
    if (!ids.length) return;
    const status = this.bulkStatus as GpsTarget['status'];
    const progress = status === 'completed' ? 100 : undefined;
    const calls = ids.map(id => this.gps.updateTarget(id, progress !== undefined ? { status, manual_progress_percentage: progress } : { status }));
    forkJoin(calls).subscribe({
      next: () => { this.successMsg.set('Updated status for ' + ids.length + ' target(s)'); this.clearSelection(); this.load(); },
      error: e => this.error.set(e.error?.error || e.message)
    });
  }

  bulkDelete(): void {
    const ids = Array.from(this.selected());
    if (!ids.length) return;
    if (!confirm('Delete ' + ids.length + ' target(s)? This cannot be undone.')) return;
    forkJoin(ids.map(id => this.gps.deleteTarget(id))).subscribe({
      next: () => { this.successMsg.set('Deleted ' + ids.length + ' target(s)'); this.clearSelection(); this.load(); },
      error: e => this.error.set(e.error?.error || e.message)
    });
  }

  // ---------- popup ----------
  openView(t: GpsTarget): void {
    this.popupTarget.set(t);
    this.popupIsCreate.set(false);
    this.popupMode.set('view');
    this.popupOpen.set(true);
    this.formError.set(null);
    this.achOpen.set(false);
    this.taskEditing.set(null);
    this.actual.set(null); this.actualError.set(null);
    if (this.tasks()[t.id] === undefined) this.loadTasks(t.id);
    if (this.updates()[t.id] === undefined) this.loadUpdates(t.id);
    if (this.sources()[t.id] === undefined) this.loadSources(t.id);
    this.refreshTarget(t.id);
    this.loadActual(t.id);
    this.loadBindings(t.id);
    this.loadAchievements(t.id);
  }

  openCreate(): void {
    this.popupTarget.set(null);
    this.popupIsCreate.set(true);
    this.popupMode.set('edit');
    this.popupOpen.set(true);
    this.formTitle = ''; this.formDescription = ''; this.formCategory = 'finance'; this.formPriority = 'medium';
    this.formStatus = 'not_started'; this.formDueDate = ''; this.formOwner = ''; this.formProgressMode = 'manual';
    this.formProgress = 0; this.formError.set(null);
  }

  startEdit(): void {
    const t = this.popupTarget();
    if (!t) return;
    this.formTitle = t.title; this.formDescription = t.description; this.formCategory = t.category;
    this.formPriority = t.priority; this.formStatus = t.status; this.formDueDate = t.due_date || '';
    this.formOwner = t.owner_label || ''; this.formProgressMode = t.progress_mode;
    this.formProgress = t.manual_progress_percentage; this.formError.set(null);
    this.initBindingForm();
    this.popupMode.set('edit');
  }

  cancelEdit(): void {
    if (this.popupIsCreate()) { this.closePopup(); return; }
    this.popupMode.set('view');
  }

  closePopup(): void {
    this.popupOpen.set(false);
    this.popupTarget.set(null);
    this.popupIsCreate.set(false);
    this.popupMode.set('view');
  }

  saveTarget(): void {
    if (!this.formDescription.trim()) { this.formError.set('Description is required'); return; }
    if (this.formProgress !== null && (this.formProgress < 0 || this.formProgress > 100)) { this.formError.set('Progress must be 0..100'); return; }
    this.formLoading.set(true); this.formError.set(null);
    const payload: any = {
      company_id: this.companyId(),
      title: this.formTitle.trim() || undefined,
      description: this.formDescription.trim(),
      category: this.formCategory,
      priority: this.formPriority,
      status: this.formStatus,
      due_date: this.formDueDate || undefined,
      owner_label: this.formOwner.trim() || undefined,
      progress_mode: this.formProgressMode,
      manual_progress_percentage: this.formProgress ?? 0,
    };
    const existing = this.popupTarget();
    const obs = this.popupIsCreate() || !existing ? this.gps.createTarget(payload) : this.gps.updateTarget(existing.id, payload);
    obs.subscribe({
      next: (saved: GpsTarget) => {
        this.formLoading.set(false);
        this.successMsg.set(this.popupIsCreate() ? 'Target created' : 'Target updated');
        if (this.popupIsCreate()) { this.closePopup(); }
        else { this.popupTarget.set(saved); this.popupMode.set('view'); }
        this.load();
        if (saved?.id) { this.loadTasks(saved.id); this.loadSources(saved.id); if (this.updates()[saved.id] !== undefined) this.loadUpdates(saved.id); }
      },
      error: e => { this.formLoading.set(false); this.formError.set(e.error?.error || e.message); }
    });
  }

  deleteTarget(t: GpsTarget): void {
    if (!confirm('Delete target "' + t.title + '"? This cannot be undone.')) return;
    this.gps.deleteTarget(t.id).subscribe({
      next: () => { this.successMsg.set('Target deleted'); this.closePopup(); this.selected.update(s => { const n = new Set(s); n.delete(t.id); return n; }); this.load(); },
      error: e => this.error.set(e.error?.error || e.message)
    });
  }

  deletePopupTarget(): void {
    const t = this.popupTarget();
    if (t) this.deleteTarget(t);
  }

  // ---------- tasks ----------
  addTask(targetId: number): void {
    const title = (this.newTaskTitle[targetId] || '').trim();
    if (!title) return;
    this.gps.createTask({ gps_target_id: targetId, title }).subscribe({
      next: () => { this.newTaskTitle[targetId] = ''; this.loadTasks(targetId); this.refreshTarget(targetId); this.successMsg.set('Task added'); },
      error: e => this.error.set(e.error?.error || e.message)
    });
  }

  toggleTask(task: GpsTask): void {
    const nextStatus = task.status === 'completed' ? 'not_started' : 'completed';
    this.gps.updateTask(task.id, { status: nextStatus }).subscribe({
      next: () => { this.loadTasks(task.gps_target_id); this.refreshTarget(task.gps_target_id); },
      error: e => this.error.set(e.error?.error || e.message)
    });
  }

  editTask(task: GpsTask): void {
    // Kept for compatibility — task title editing now uses the inline editor (Phase 7).
    this.openTaskEditor(task);
  }

  deleteTask(task: GpsTask): void {
    if (!confirm('Delete task "' + task.title + '"?')) return;
    this.gps.deleteTask(task.id).subscribe({ next: () => { this.loadTasks(task.gps_target_id); this.refreshTarget(task.gps_target_id); }, error: e => this.error.set(e.error?.error || e.message) });
  }

  moveTask(task: GpsTask, dir: number): void {
    const list = [...(this.tasks()[task.gps_target_id] || [])].sort((a, b) => a.sort_order - b.sort_order);
    const idx = list.findIndex(t => t.id === task.id);
    const nIdx = idx + dir;
    if (nIdx < 0 || nIdx >= list.length) return;
    const tmp = list[idx]; list[idx] = list[nIdx]; list[nIdx] = tmp;
    this.gps.reorderTasks(task.gps_target_id, list.map(t => t.id)).subscribe({ next: rows => this.tasks.update(m => ({ ...m, [task.gps_target_id]: rows })), error: e => this.error.set(e.error?.error || e.message) });
  }

  // ---------- Phase 7: actual / measure binding / achievements ----------
  loadMeasures(companyId: number): void {
    this.gps.measures(companyId).subscribe({ next: rows => this.measures.set(rows || []), error: () => this.measures.set([]) });
  }

  loadFinancialYears(): void {
    this.yearsApi.getAllFinancialYears().subscribe({
      next: years => this.financialYears.set((years || []).map(y => ({ id: y.id, name: y.name }))),
      error: () => this.financialYears.set([]),
    });
  }

  loadActual(targetId: number): void {
    this.actualLoading.set(true); this.actualError.set(null);
    this.gps.actual(targetId).subscribe({
      next: m => { this.actual.set(m); this.actualLoading.set(false); },
      error: e => { this.actualLoading.set(false); this.actualError.set(e.error?.error || e.message); },
    });
  }

  loadBindings(targetId: number): void {
    this.gps.metrics(targetId).subscribe({
      next: rows => { this.bindings.set(rows || []); this.initBindingForm(); },
      error: () => { this.bindings.set([]); this.initBindingForm(); },
    });
  }

  loadAchievements(targetId: number): void {
    this.achievementsLoading.set(true);
    this.achievementsApi.byTarget(targetId).subscribe({
      next: rows => { this.targetAchievements.set(rows || []); this.achievementsLoading.set(false); },
      error: () => { this.targetAchievements.set([]); this.achievementsLoading.set(false); },
    });
  }

  /** Non-decision records only — decisions are events and are excluded from counts. */
  achievementOutcomes = computed(() => this.targetAchievements().filter(a => a.kind !== 'decision'));
  achievementDecisions = computed(() => this.targetAchievements().filter(a => a.kind === 'decision'));

  /** Outcome progress label from the measurement response (metric targets only). */
  outcomeProgressLabel(): string {
    const p = this.actual()?.progress;
    if (!p) return '—';
    if (p.status === 'computed') return (p.percent_display ?? p.percent ?? '—') + '%' + (p.met === true ? ' · met' : p.met === false ? ' · not met' : '');
    return this.statusLabel(p.status);
  }

  canVerifyAchievement(a: Achievement): boolean { return this.isSA() && a.kind !== 'decision' && a.verification_status === 'unverified'; }
  canRevokeAchievement(a: Achievement): boolean { return this.isSA() && a.verification_status === 'verified'; }

  private parsePeriodRef(type: string | null, ref: string | null): { yearId: number; quarter: 'FY' | '1' | '2' | '3' | '4' } {
    const t = (type || 'financial_year').toLowerCase();
    const r = String(ref || '');
    if (t === 'quarter') {
      const m = r.match(/^(\d+):Q([1-4])$/i);
      if (m) return { yearId: Number(m[1]), quarter: m[2] as '1' | '2' | '3' | '4' };
    }
    return { yearId: /^\d+$/.test(r) ? Number(r) : 0, quarter: 'FY' };
  }

  private periodPayload(yearId: number, quarter: string): { period_type: string; period_ref: string } {
    if (quarter === 'FY') return { period_type: 'financial_year', period_ref: String(yearId) };
    return { period_type: 'quarter', period_ref: `${yearId}:Q${quarter}` };
  }

  initBindingForm(): void {
    const b = this.bindings()[0] || null;
    const firstYear = this.financialYears()[0]?.id ?? 0;
    if (b) {
      this.bindMetricTypeId = b.metric_type_id;
      this.bindDirection = (b.direction || 'increase') as 'increase' | 'decrease' | 'maintain';
      const bp = this.parsePeriodRef(b.baseline_period_type, b.baseline_period_ref);
      const tp = this.parsePeriodRef(b.target_period_type, b.target_period_ref);
      this.bindBaselineYearId = bp.yearId; this.bindBaselineQuarter = bp.quarter;
      this.bindTargetYearId = tp.yearId; this.bindTargetQuarter = tp.quarter;
      this.bindGoal = b.target_value;
      this.bindToleranceValue = b.maintain_tolerance_value;
      this.bindToleranceUnit = (b.maintain_tolerance_unit || 'absolute') as 'absolute' | 'percent';
    } else {
      this.bindMetricTypeId = this.measures()[0]?.id ?? null;
      this.bindDirection = 'increase';
      this.bindBaselineYearId = firstYear; this.bindBaselineQuarter = 'FY';
      this.bindTargetYearId = firstYear; this.bindTargetQuarter = 'FY';
      this.bindGoal = null; this.bindToleranceValue = null; this.bindToleranceUnit = 'absolute';
    }
    this.bindError.set(null);
  }

  saveBinding(): void {
    const t = this.popupTarget();
    if (!t) return;
    if (!this.bindMetricTypeId) { this.bindError.set('Select a measure.'); return; }
    if (!this.bindBaselineYearId || !this.bindTargetYearId) { this.bindError.set('Baseline and target periods require a financial year.'); return; }
    if (this.bindGoal === null || this.bindGoal === undefined || String(this.bindGoal) === '') { this.bindError.set('A goal value is required.'); return; }
    if (this.bindDirection === 'maintain' && (this.bindToleranceValue === null || this.bindToleranceValue === undefined)) {
      this.bindError.set('A tolerance value is required when direction is maintain.'); return;
    }

    const bp = this.periodPayload(this.bindBaselineYearId, this.bindBaselineQuarter);
    const tp = this.periodPayload(this.bindTargetYearId, this.bindTargetQuarter);
    const payload: Record<string, unknown> = {
      gps_target_id: t.id,
      metric_type_id: this.bindMetricTypeId,
      target_value: this.bindGoal,
      direction: this.bindDirection,
      calculation_method: 'period_total',
      baseline_period_type: bp.period_type, baseline_period_ref: bp.period_ref,
      target_period_type: tp.period_type, target_period_ref: tp.period_ref,
    };
    if (this.bindDirection === 'maintain') {
      payload['maintain_tolerance_value'] = this.bindToleranceValue;
      payload['maintain_tolerance_unit'] = this.bindToleranceUnit;
    }

    this.bindSaving.set(true); this.bindError.set(null);
    this.gps.attachMetric(payload).subscribe({
      next: () => {
        this.bindSaving.set(false);
        this.successMsg.set('Measure bound');
        // Reload target, binding and derived actual from the backend — no optimistic state.
        this.refreshTarget(t.id);
        this.loadBindings(t.id);
        this.loadActual(t.id);
        this.gps.dashboardCounts(this.companyId()).subscribe({ next: c => this.counts.set(c) });
      },
      error: e => { this.bindSaving.set(false); this.bindError.set(e.error?.error || e.message); },
    });
  }

  removeBinding(): void {
    const t = this.popupTarget();
    const b = this.bindings()[0];
    if (!t || !b) return;
    if (!confirm('Remove the measure binding? The target reverts to manual progress if no measure remains.')) return;
    this.bindSaving.set(true); this.bindError.set(null);
    this.gps.detachMetric(b.id).subscribe({
      next: () => {
        this.bindSaving.set(false);
        this.successMsg.set('Measure removed');
        this.refreshTarget(t.id);
        this.loadBindings(t.id);
        this.loadActual(t.id);
      },
      error: e => { this.bindSaving.set(false); this.bindError.set(e.error?.error || e.message); },
    });
  }

  // ---------- task inline editor (replaces prompt()) ----------
  openTaskEditor(task: GpsTask): void {
    this.taskEditing.set(task.id);
    this.taskEditTitle = task.title;
    this.taskEditError.set(null);
  }

  cancelTaskEditor(): void {
    this.taskEditing.set(null);
    this.taskEditTitle = '';
    this.taskEditError.set(null);
  }

  saveTaskEdit(task: GpsTask): void {
    const trimmed = (this.taskEditTitle || '').trim();
    if (!trimmed) { this.taskEditError.set('Task title is required.'); return; }
    if (trimmed === task.title) { this.cancelTaskEditor(); return; }
    this.gps.updateTask(task.id, { title: trimmed }).subscribe({
      next: () => { this.cancelTaskEditor(); this.loadTasks(task.gps_target_id); this.refreshTarget(task.gps_target_id); },
      error: e => this.taskEditError.set(e.error?.error || e.message),
    });
  }

  // ---------- target-linked achievement draft ----------
  openAchievementForm(): void {
    this.achOpen.set(true);
    this.achError.set(null);
    this.achTitle = '';
    this.achKind = 'result';
    this.achAchievedOn = new Date().toISOString().slice(0, 10);
    this.achDescription = '';
    this.achEvidenceSummary = '';
  }

  cancelAchievementForm(): void { this.achOpen.set(false); this.achError.set(null); }

  createAchievementDraft(): void {
    const t = this.popupTarget();
    if (!t) return;
    if (!this.achTitle.trim()) { this.achError.set('Title is required.'); return; }
    this.achSaving.set(true); this.achError.set(null);
    this.achievementsApi.create({
      company_id: this.companyId(),
      gps_target_id: t.id,
      kind: this.achKind,
      category: t.category,
      title: this.achTitle.trim(),
      description: this.achDescription || null,
      achieved_on: this.achAchievedOn || null,
      evidence_summary: this.achEvidenceSummary || null,
    } as any).subscribe({
      next: () => { this.achSaving.set(false); this.achOpen.set(false); this.successMsg.set('Draft achievement created'); this.loadAchievements(t.id); },
      // A 409/400 leaves local state unchanged and surfaces the server message.
      error: e => { this.achSaving.set(false); this.achError.set(e.error?.error || e.message); },
    });
  }

  verifyAchievement(a: Achievement): void {
    if (!confirm('Verify "' + a.title + '"? Verification captures the authoritative financial snapshot; if the measurement is not eligible the record stays unchanged.')) return;
    this.achievementsApi.verify(a.id).subscribe({
      next: () => { this.successMsg.set('Verified'); this.loadAchievements(a.gps_target_id || this.popupTarget()?.id || 0); },
      error: e => { this.error.set(e.error?.error || e.message); this.loadAchievements(a.gps_target_id || this.popupTarget()?.id || 0); },
    });
  }

  rejectAchievement(a: Achievement): void {
    if (!confirm('Reject "' + a.title + '"? No measurement snapshot is taken.')) return;
    this.achievementsApi.reject(a.id).subscribe({
      next: () => { this.successMsg.set('Rejected'); this.loadAchievements(a.gps_target_id || this.popupTarget()?.id || 0); },
      error: e => { this.error.set(e.error?.error || e.message); this.loadAchievements(a.gps_target_id || this.popupTarget()?.id || 0); },
    });
  }

  revokeAchievement(a: Achievement): void {
    this.revokingId.set(a.id);
    this.revokeReason = '';
    this.revokeError.set(null);
  }

  cancelRevoke(): void {
    this.revokingId.set(null);
    this.revokeReason = '';
    this.revokeError.set(null);
  }

  confirmRevoke(a: Achievement): void {
    const reason = (this.revokeReason || '').trim();
    if (!reason) { this.revokeError.set('A reason is required to revoke an achievement.'); return; }
    this.achievementsApi.revoke(a.id, reason).subscribe({
      next: () => { this.cancelRevoke(); this.successMsg.set('Revoked'); this.loadAchievements(a.gps_target_id || this.popupTarget()?.id || 0); },
      error: e => { this.revokeError.set(e.error?.error || e.message); },
    });
  }

  supersedeAchievement(a: Achievement): void {
    if (!confirm('Create a superseding draft for "' + a.title + '"? The original and its evidence are preserved.')) return;
    this.achievementsApi.supersede(a.id, {}).subscribe({
      next: () => { this.successMsg.set('Superseding draft created'); this.loadAchievements(a.gps_target_id || this.popupTarget()?.id || 0); },
      error: e => { this.error.set(e.error?.error || e.message); this.loadAchievements(a.gps_target_id || this.popupTarget()?.id || 0); },
    });
  }

  // ---------- updates ----------
  addUpdate(targetId: number): void {
    const prog = Number(this.newUpdateProgress[targetId]);
    const status = (this.newUpdateStatus[targetId] || 'in_progress').trim();
    const note = (this.newUpdateNote[targetId] || '').trim() || undefined;
    if (!Number.isFinite(prog) || prog < 0 || prog > 100) {
      this.updateError.update(m => ({ ...m, [targetId]: 'Progress must be 0..100' })); return;
    }
    this.updateError.update(m => ({ ...m, [targetId]: null }));
    this.gps.addUpdate({ gps_target_id: targetId, progress_percentage: prog, status, note }).subscribe({
      next: () => {
        this.newUpdateProgress[targetId] = null; this.newUpdateNote[targetId] = '';
        this.loadUpdates(targetId); this.refreshTarget(targetId);
        this.gps.dashboardCounts(this.companyId()).subscribe({ next: c => this.counts.set(c) });
        this.successMsg.set('Update added');
      },
      error: e => this.updateError.update(m => ({ ...m, [targetId]: e.error?.error || e.message }))
    });
  }

  // ---------- helpers ----------
  categoryLabel(key: string): string { return this.categories.find(c => c.key === key)?.label ?? key; }
  statusLabel(status: string): string { return (status || '').replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()); }
  pillClass(v: string): string { return this.rank[v] !== undefined ? v : ''; }

  coverageLabel(p: any): string {
    if (!p?.coverage) return '—';
    return p.coverage.resolved_bindings + '/' + p.coverage.required_bindings + ' bindings';
  }

  missingLabel(p: any): string {
    if (!p) return '—';
    const parts: string[] = [];
    if (p.missing_accounts?.length) parts.push(p.missing_accounts.length + ' account(s)');
    if (p.missing_months?.length) parts.push('months ' + p.missing_months.join(', '));
    return parts.length ? parts.join(' · ') : 'none';
  }

  measureUnit(): string { return this.measures().find(m => m.id === this.bindMetricTypeId)?.unit || 'value'; }

  taskCount(targetId: number): number { return (this.tasks()[targetId] || []).length; }
  groupTasks(rows: GpsTarget[]): number { return rows.reduce((s, r) => s + this.taskCount(r.id), 0); }
  groupProgress(rows: GpsTarget[]): number {
    if (!rows.length) return 0;
    return Math.round(rows.reduce((s, r) => s + Number(r.manual_progress_percentage || 0), 0) / rows.length);
  }

  private sortValue(t: GpsTarget, key: string): any {
    switch (key) {
      case 'title': return (t.title || '').toLowerCase();
      case 'category': return this.catOrder[t.category] ?? 9;
      case 'priority': return this.rank[t.priority] ?? 0;
      case 'status': return this.statusRank[t.status] ?? 0;
      case 'owner_label': return (t.owner_label || '').toLowerCase();
      case 'due_date': return t.due_date || '9999-99-99';
      case 'source': return this.hasSwotSource(t.id) ? 0 : 1;
      case 'tasks': return this.taskCount(t.id);
      case 'progress': return Number(t.manual_progress_percentage || 0);
      default: return '';
    }
  }

  private refreshTarget(targetId: number): void {
    this.gps.getTarget(targetId).subscribe({
      next: updated => {
        const g = this.grouped();
        const next: Record<string, GpsTarget[]> = {};
        for (const [k, arr] of Object.entries(g)) next[k] = (arr as GpsTarget[]).map(t => t.id === updated.id ? updated : t);
        this.grouped.set(next);
        if (this.popupTarget()?.id === updated.id) this.popupTarget.set(updated);
        this.gps.dashboardCounts(this.companyId()).subscribe({ next: c => this.counts.set(c) });
      },
      error: () => {}
    });
  }
}
