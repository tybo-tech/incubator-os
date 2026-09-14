import { Component, ChangeDetectionStrategy, inject, signal, computed, effect, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SwotService, SwotItem } from '../services/swot.service';
import { GpsService, GpsTarget, GpsTask } from '../services/gps.service';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon';
import { ViewStateService } from '../../../../services/view-state.service';

type Category = SwotItem['category'];
type View = 'table' | 'grouped';

@Component({
  selector: 'app-swot-hierarchy',
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
        <h2 class="sw-title">SWOT Strategy Workspace</h2>
        <p class="sw-subtitle">Turn business findings into measurable targets and practical tasks. Company {{ companyId() }} · Analysis {{ analysis()?.id ? '#' + analysis()!.id : '—' }}</p>
      </div>
      <div class="sw-legend" aria-label="Hierarchy legend">
        <span class="sw-key"><span class="sw-dot"></span> SWOT finding</span>
        <span class="sw-key"><span class="sw-dot target"></span> GPS target</span>
        <span class="sw-key"><span class="sw-dot task"></span> Task</span>
      </div>
    </div>

    @if (error()) { <div class="sw-alert error">{{ error() }}</div> }
    @if (successMsg()) { <div class="sw-alert success">{{ successMsg() }}</div> }

    <div class="sw-summary">
      <div class="sw-summary-item"><div class="sw-summary-value">{{ items().length }}</div><div class="sw-summary-label">SWOT findings</div></div>
      <div class="sw-summary-item"><div class="sw-summary-value">{{ linkedCount() }}</div><div class="sw-summary-label">Linked targets</div></div>
      <div class="sw-summary-item"><div class="sw-summary-value">{{ activeTasksCount() }}</div><div class="sw-summary-label">Active tasks</div></div>
      <div class="sw-summary-item"><div class="sw-summary-value">{{ overallProgress() }}%</div><div class="sw-summary-label">Overall progress</div></div>
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
        <input type="search" placeholder="Search findings…" [ngModel]="search()" (ngModelChange)="search.set($event)" aria-label="Search findings">
        @if (search()) {
          <button class="sw-search-clear" type="button" aria-label="Clear search" (click)="search.set('')"><app-icon name="x-mark"></app-icon></button>
        }
      </label>

      <button class="sw-btn" type="button" [class.active]="filtersOpen() || activeFilterCount() > 0" (click)="filtersOpen.set(!filtersOpen())">
        <app-icon name="funnel"></app-icon> Filter
        @if (activeFilterCount() > 0) { <span class="sw-filter-count">{{ activeFilterCount() }}</span> }
      </button>

      <button class="sw-btn" type="button" (click)="load()"><app-icon name="arrow-path"></app-icon> Refresh</button>

      <a class="sw-btn" [routerLink]="['/company', companyId(), 'gps-targets-v2']">GPS Targets</a>

      <button class="sw-btn primary" type="button" (click)="openCreateItem()"><app-icon name="plus"></app-icon> Add finding</button>
    </div>

    @if (filtersOpen()) {
      <div class="sw-filters">
        <div class="sw-filter-row">
          <span class="sw-filter-label">Type</span>
          <div class="sw-chipgroup">
            @for (q of quadrants; track q.key) {
              <button class="sw-chip" type="button" [class.on]="isCatFiltered(q.key)" (click)="toggleCatFilter(q.key)">{{ q.label }}</button>
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
          <span class="sw-filter-label">Impact</span>
          <div class="sw-chipgroup">
            @for (i of impacts; track i) {
              <button class="sw-chip" type="button" [class.on]="isImpactFiltered(i)" (click)="toggleSetFilter(impactFilter, i)">{{ i }}</button>
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
          <span class="sw-filter-label">Targets</span>
          <div class="sw-chipgroup">
            @for (l of linkFilters; track l.key) {
              <button class="sw-chip" type="button" [class.on]="linkFilter() === l.key" (click)="linkFilter.set(l.key)">{{ l.label }}</button>
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
        <select [(ngModel)]="bulkPriority" aria-label="Bulk priority">
          @for (p of priorities; track p) { <option [value]="p">{{ p }}</option> }
        </select>
        <button class="sw-btn sm" type="button" (click)="applyBulkPriority()">Apply priority</button>
        <button class="sw-btn sm danger" type="button" (click)="bulkDelete()">Delete</button>
        <button class="sw-btn sm" type="button" (click)="clearSelection()">Clear</button>
      </div>
    }

    @if (loading()) {
      <div class="sw-footnote">Loading…</div>
    } @else if (items().length === 0) {
      <div class="sw-empty-target"><span>No SWOT findings for this company yet.</span><button class="sw-btn primary" type="button" (click)="openCreateItem()"><app-icon name="plus"></app-icon> Add finding</button></div>
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
        <div class="sw-group-empty" style="margin-top:10px;">No findings match the current filters.</div>
      }
    } @else {
      @for (g of groups(); track g.key) {
        <section class="sw-group">
          <button class="sw-group-head" type="button" (click)="toggleGroup(g.key)" [attr.aria-expanded]="!collapsedGroups().has(g.key)">
            <app-icon [name]="collapsedGroups().has(g.key) ? 'chevron-right' : 'chevron-down'"></app-icon>
            <span class="sw-badge {{ g.key }}">{{ g.label }}</span>
            <span class="sw-group-count">{{ g.rows.length }} finding{{ g.rows.length === 1 ? '' : 's' }}</span>
            <span class="sw-group-spacer"></span>
            <span class="sw-group-meta">{{ groupTargets(g.rows) }} targets · {{ groupTasks(g.rows) }} tasks</span>
          </button>
          @if (!collapsedGroups().has(g.key)) {
            @if (g.rows.length === 0) {
              <div class="sw-group-empty">No {{ g.label.toLowerCase() }} match the current filters.</div>
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
      Analysis: {{ analysis()?.id ? '#' + analysis()!.id + ' · ' + analysis()!.status + ' · current=' + analysis()!.is_current : '— none' }} · path: company/{{ companyId() }}/swot-v2 · Sources: {{ linkedCount() }} linked, {{ legacySources() }} legacy_unlinked
    </div>
  </div>

  <ng-template #tableHead>
    <thead>
      <tr>
        <th class="sw-th-check"><input type="checkbox" [checked]="allVisibleSelected()" (change)="toggleSelectAllVisible($event)" aria-label="Select all visible findings"></th>
        @if (view() === 'table') {
          <th class="sortable" (click)="toggleSort('category')">Type <app-icon class="sw-sort-icon" [class.is-active]="sortKey() === 'category'" [name]="sortIcon('category')"></app-icon></th>
        }
        <th class="sortable" (click)="toggleSort('description')">Finding <app-icon class="sw-sort-icon" [class.is-active]="sortKey() === 'description'" [name]="sortIcon('description')"></app-icon></th>
        <th class="sortable" (click)="toggleSort('priority')">Priority <app-icon class="sw-sort-icon" [class.is-active]="sortKey() === 'priority'" [name]="sortIcon('priority')"></app-icon></th>
        <th class="sortable col-impact" (click)="toggleSort('impact')">Impact <app-icon class="sw-sort-icon" [class.is-active]="sortKey() === 'impact'" [name]="sortIcon('impact')"></app-icon></th>
        <th class="sortable" (click)="toggleSort('status')">Status <app-icon class="sw-sort-icon" [class.is-active]="sortKey() === 'status'" [name]="sortIcon('status')"></app-icon></th>
        <th class="sortable col-owner" (click)="toggleSort('owner_label')">Owner <app-icon class="sw-sort-icon" [class.is-active]="sortKey() === 'owner_label'" [name]="sortIcon('owner_label')"></app-icon></th>
        <th class="sortable col-date" (click)="toggleSort('target_date')">Target date <app-icon class="sw-sort-icon" [class.is-active]="sortKey() === 'target_date'" [name]="sortIcon('target_date')"></app-icon></th>
        <th class="sortable num" (click)="toggleSort('targets')">Targets <app-icon class="sw-sort-icon" [class.is-active]="sortKey() === 'targets'" [name]="sortIcon('targets')"></app-icon></th>
        <th class="sortable num" (click)="toggleSort('tasks')">Tasks <app-icon class="sw-sort-icon" [class.is-active]="sortKey() === 'tasks'" [name]="sortIcon('tasks')"></app-icon></th>
        <th class="sw-td-actions"></th>
      </tr>
    </thead>
  </ng-template>

  <ng-template #tableRows let-rows>
    @for (item of rows; track item.id) {
      <tr class="sw-row" [class.expanded]="expanded().has(item.id)" [class.selected]="selected().has(item.id)" (click)="toggleExpand(item.id)">
        <td class="sw-td-check" (click)="$event.stopPropagation()">
          <input type="checkbox" [checked]="selected().has(item.id)" (change)="toggleSelect(item.id)" [attr.aria-label]="'Select finding ' + item.id">
        </td>
        @if (view() === 'table') {
          <td><span class="sw-badge {{ item.category }}">{{ categoryLabel(item.category) }}</span></td>
        }
        <td class="sw-td-finding">
          <div class="sw-finding">
            <button class="sw-chevron" type="button" (click)="$event.stopPropagation(); toggleExpand(item.id)" [attr.aria-expanded]="expanded().has(item.id)" aria-label="Toggle finding details">
              <app-icon [name]="expanded().has(item.id) ? 'chevron-down' : 'chevron-right'"></app-icon>
            </button>
            <div>
              <div class="sw-finding-title">{{ item.description }}</div>
              @if (item.recommended_response) { <div class="sw-finding-sub">{{ item.recommended_response }}</div> }
            </div>
          </div>
        </td>
        <td><span class="sw-pill {{ pillClass(item.priority) }}">{{ item.priority }}</span></td>
        <td class="col-impact"><span class="sw-pill {{ pillClass(item.impact) }}">{{ item.impact }}</span></td>
        <td><span class="sw-pill {{ 'status-' + item.status }}">{{ statusLabel(item.status) }}</span></td>
        <td class="col-owner">{{ item.owner_label || '—' }}</td>
        <td class="col-date">{{ item.target_date || '—' }}</td>
        <td class="num"><span class="sw-count" [class.zero]="targetCount(item.id) === 0">{{ targetCount(item.id) }}</span></td>
        <td class="num"><span class="sw-count" [class.zero]="taskCount(item.id) === 0">{{ taskCount(item.id) }}</span></td>
        <td class="sw-td-actions" (click)="$event.stopPropagation()">
          <button class="sw-icon-btn" type="button" title="Edit finding" aria-label="Edit finding" (click)="openEditItem(item)"><app-icon name="pencil-square"></app-icon></button>
          <button class="sw-icon-btn danger" type="button" title="Delete finding" aria-label="Delete finding" (click)="deleteItem(item)"><app-icon name="trash"></app-icon></button>
        </td>
      </tr>
      @if (expanded().has(item.id)) {
        <tr class="sw-detail-row">
          <td [attr.colSpan]="colSpan()">
            <div class="sw-detail">
              <div>
                <div class="sw-detail-label">Recommended response</div>
                <div class="sw-detail-text">{{ item.recommended_response || '—' }}</div>
                <div class="sw-detail-meta">Impact: {{ item.impact }} · Status: {{ item.status }} · Owner: {{ item.owner_label || '—' }} · Target date: {{ item.target_date || '—' }}</div>
                @if (item.legacy_path) { <div class="sw-detail-meta">Legacy path: {{ item.legacy_path }}</div> }
              </div>

              <div>
                <div class="sw-detail-head">
                  <span class="sw-detail-label" style="margin:0;">Linked GPS targets</span>
                  <span class="sw-detail-actions">
                    <button class="sw-link" type="button" (click)="openLinkPicker(item.id)"><app-icon name="link"></app-icon> Link existing</button>
                    <button class="sw-link" type="button" (click)="openCreate(item.id)"><app-icon name="plus"></app-icon> Create target</button>
                  </span>
                </div>

                @if (linkPickerFor() === item.id) {
                  <div class="sw-inline-form">
                    <div class="sw-inline-row">
                      <label class="grow sw-field">
                        <span>Choose target to link</span>
                        <select class="sw-select" [(ngModel)]="linkTargetId">
                          <option [ngValue]="null">— select —</option>
                          @for (t of unlinkedTargetsFor(item.id); track t.id) {
                            <option [ngValue]="t.id">{{ t.category }} — {{ t.title }} ({{ t.status }})</option>
                          }
                        </select>
                      </label>
                      <button class="sw-btn primary" type="button" (click)="doLink(item.id)" [disabled]="!linkTargetId">Link</button>
                      <button class="sw-btn" type="button" (click)="linkPickerFor.set(null)">Cancel</button>
                    </div>
                  </div>
                }

                @if (createFor() === item.id) {
                  <div class="sw-inline-form">
                    <div class="sw-form-grid">
                      <label class="sw-field span2"><span>Description *</span><input class="sw-input" [(ngModel)]="createDescription" placeholder="What is the measurable target?"></label>
                      <label class="sw-field"><span>Title (optional)</span><input class="sw-input" [(ngModel)]="createTitle" placeholder="Auto from description"></label>
                      <label class="sw-field"><span>Category</span>
                        <select class="sw-select" [(ngModel)]="createCategory">
                          <option value="finance">Finance</option>
                          <option value="strategy_general">Strategy / General</option>
                          <option value="sales_marketing">Sales &amp; Marketing</option>
                          <option value="personal_development">Personal Development</option>
                        </select>
                      </label>
                      <label class="sw-field"><span>Priority</span>
                        <select class="sw-select" [(ngModel)]="createPriority">
                          <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
                        </select>
                      </label>
                      <label class="sw-field"><span>Due date</span><input class="sw-input" type="date" [(ngModel)]="createDueDate"></label>
                      <label class="sw-field"><span>Owner label</span><input class="sw-input" [(ngModel)]="createOwner" placeholder="e.g. Financial Manager"></label>
                    </div>
                    @if (createError()) { <div class="sw-alert error" style="margin:0;">{{ createError() }}</div> }
                    <div class="sw-inline-row">
                      <button class="sw-btn primary" type="button" (click)="doCreate(item.id)" [disabled]="createLoading()">Create &amp; link</button>
                      <button class="sw-btn" type="button" (click)="createFor.set(null)">Cancel</button>
                    </div>
                  </div>
                }

                @if (linked()[item.id] === undefined) {
                  <div class="sw-footnote">Loading…</div>
                } @else if (linked()[item.id].length === 0) {
                  <div class="sw-empty-target"><span>No measurable target has been created from this finding.</span><button class="sw-btn primary sm" type="button" (click)="openCreate(item.id)"><app-icon name="plus"></app-icon> Create GPS target</button></div>
                } @else {
                  @for (t of linked()[item.id]; track trackTargetId(t)) {
                    <div class="sw-target">
                      <div class="sw-target-top">
                        <div>
                          <div class="sw-target-title">{{ displayTargetTitle(t) }}</div>
                          <div class="sw-target-meta"><span>{{ displayTargetCategory(t) }}</span><span>Due {{ displayTargetDue(t) || '—' }}</span><span>Owner: {{ displayTargetOwner(t) || '—' }}</span></div>
                        </div>
                        <span class="sw-pill {{ 'status-' + displayTargetStatus(t) }}">{{ statusLabel(displayTargetStatus(t)) }}</span>
                      </div>
                      <div class="sw-progress-row">
                        <div class="sw-progress" [attr.aria-label]="'Target progress ' + displayTargetProgress(t) + ' percent'"><span [style.width.%]="displayTargetProgress(t)"></span></div>
                        <span class="sw-progress-value">{{ displayTargetProgress(t) }}%</span>
                      </div>
                      <div class="sw-tasks">
                        @if (tasks()[displayTargetId(t)] === undefined) { <span class="sw-footnote">Loading tasks…</span> }
                        @else {
                          @for (task of tasks()[displayTargetId(t)]; track task.id) {
                            <div class="sw-task" [class.done]="task.status === 'completed'">
                              <input type="checkbox" [checked]="task.status === 'completed'" (change)="toggleTask(task)" [attr.aria-label]="'Toggle task ' + task.title">
                              @if (taskEditing() === task.id) {
                                <span class="sw-task-name">
                                  <input class="sw-input" [(ngModel)]="taskEditTitle" (keyup.enter)="saveTaskEdit(task)" (keyup.escape)="cancelTaskEditor()" aria-label="Edit task title">
                                </span>
                                <span class="sw-task-owner">
                                  @if (taskEditError()) { <span style="color:var(--ios-red); font-size:10px;">{{ taskEditError() }}</span> }
                                  <button class="sw-link" type="button" (click)="saveTaskEdit(task)">Save</button>
                                  <button class="sw-link" type="button" (click)="cancelTaskEditor()">Cancel</button>
                                </span>
                              } @else {
                                <span class="sw-task-name">{{ task.title }}</span>
                                <span class="sw-task-owner">
                                  {{ task.owner_label || '' }}
                                  <button class="sw-link" type="button" (click)="openTaskEditor(task)">Edit</button>
                                  <button class="sw-link" type="button" style="color:var(--ios-red)" (click)="deleteTask(task)">Delete</button>
                                  <button class="sw-link" type="button" aria-label="Move task up" (click)="moveTask(task, -1)">↑</button>
                                  <button class="sw-link" type="button" aria-label="Move task down" (click)="moveTask(task, 1)">↓</button>
                                </span>
                              }
                            </div>
                          }
                          @if (tasks()[displayTargetId(t)].length === 0) { <span class="sw-footnote">No tasks yet.</span> }
                        }
                        <div class="sw-inline-row" style="margin-top:6px;">
                          <input class="sw-input grow" placeholder="New task title" [(ngModel)]="newTaskTitle[displayTargetId(t)]" (keyup.enter)="addTaskFor(displayTargetId(t))">
                          <button class="sw-btn sm" type="button" (click)="addTaskFor(displayTargetId(t))">Add task</button>
                        </div>
                      </div>
                      <div class="sw-inline-row" style="margin-top:8px;">
                        <button class="sw-btn sm danger" type="button" (click)="doUnlink(t, item.id)">Unlink</button>
                      </div>
                    </div>
                  }
                }
              </div>
            </div>
          </td>
        </tr>
      }
    }
  </ng-template>

  @if (editorOpen()) {
    <div class="sw-modal">
      <div class="sw-modal-card" (click)="$event.stopPropagation()">
        <div class="sw-modal-head">
          <h3>{{ editorMode() === 'create' ? 'Add SWOT finding' : 'Edit SWOT finding' }}</h3>
          <button class="sw-icon-btn" type="button" aria-label="Close" (click)="editorOpen.set(false)"><app-icon name="x-mark"></app-icon></button>
        </div>
        <div class="sw-modal-body">
          @if (editorError()) { <div class="sw-alert error">{{ editorError() }}</div> }
          <div class="sw-form-grid">
            <label class="sw-field span2"><span>Description *</span><textarea class="sw-textarea" [(ngModel)]="editorForm.description" placeholder="Describe the finding"></textarea></label>
            <label class="sw-field span2"><span>Recommended response</span><textarea class="sw-textarea" [(ngModel)]="editorForm.recommended_response" placeholder="What should be done about it?"></textarea></label>
            <label class="sw-field"><span>Type</span>
              <select class="sw-select" [(ngModel)]="editorForm.category">
                @for (q of quadrants; track q.key) { <option [value]="q.key">{{ q.label }}</option> }
              </select>
            </label>
            <label class="sw-field"><span>Priority</span>
              <select class="sw-select" [(ngModel)]="editorForm.priority">
                @for (p of priorities; track p) { <option [value]="p">{{ p }}</option> }
              </select>
            </label>
            <label class="sw-field"><span>Impact</span>
              <select class="sw-select" [(ngModel)]="editorForm.impact">
                @for (i of impacts; track i) { <option [value]="i">{{ i }}</option> }
              </select>
            </label>
            <label class="sw-field"><span>Status</span>
              <select class="sw-select" [(ngModel)]="editorForm.status">
                @for (s of statusOptions(); track s) { <option [value]="s">{{ statusLabel(s) }}</option> }
              </select>
            </label>
            <label class="sw-field"><span>Owner label</span><input class="sw-input" [(ngModel)]="editorForm.owner_label" placeholder="e.g. Operations Manager"></label>
            <label class="sw-field"><span>Target date</span><input class="sw-input" type="date" [(ngModel)]="editorForm.target_date"></label>
          </div>
        </div>
        <div class="sw-modal-foot">
          <button class="sw-btn" type="button" (click)="editorOpen.set(false)">Cancel</button>
          <button class="sw-btn primary" type="button" (click)="saveItem()" [disabled]="editorSaving()">{{ editorSaving() ? 'Saving…' : (editorMode() === 'create' ? 'Add finding' : 'Save changes') }}</button>
        </div>
      </div>
    </div>
  }
  `,
})
export class SwotHierarchyPage {
  private route = inject(ActivatedRoute);
  private swot = inject(SwotService);
  private gps = inject(GpsService);
  private ui = inject(ViewStateService);
  private viewStateRestored = false;

  constructor() {
    // Persist view settings (view mode, filters, sort, grouping, expansion) so a
    // refresh or returning to the page keeps the user's layout. See AGENTS.md.
    effect(() => {
      const cid = this.companyId();
      const state = this.captureViewState();
      if (!cid || !this.viewStateRestored) return;
      this.ui.save(`swot-hierarchy-view:${cid}`, state);
    });
  }

  companyId = signal<number>(0);
  loading = signal(false);
  error = signal<string | null>(null);
  successMsg = signal<string | null>(null);
  analysis = signal<any | null>(null);
  items = signal<SwotItem[]>([]);
  expanded = signal<Set<number>>(new Set());
  linked = signal<Record<number, any[]>>({});
  tasks = signal<Record<number, GpsTask[]>>({});
  newTaskTitle: Record<number, string> = {};

  // task inline editor (replaces prompt())
  taskEditing = signal<number | null>(null);
  taskEditTitle = '';
  taskEditError = signal<string | null>(null);

  allTargets = signal<GpsTarget[]>([]);

  // view state
  view = signal<View>('table');
  search = signal('');
  filtersOpen = signal(false);
  catFilter = signal<Set<Category>>(new Set());
  prioFilter = signal<Set<string>>(new Set());
  impactFilter = signal<Set<string>>(new Set());
  statusFilter = signal<Set<string>>(new Set());
  linkFilter = signal<'all' | 'linked' | 'unlinked'>('all');
  sortKey = signal<string>('category');
  sortDir = signal<'asc' | 'desc'>('asc');
  collapsedGroups = signal<Set<string>>(new Set());
  selected = signal<Set<number>>(new Set());
  bulkPriority = 'high';

  // GPS create/link UI
  createFor = signal<number | null>(null);
  linkPickerFor = signal<number | null>(null);
  linkTargetId: number | null = null;
  createTitle = '';
  createDescription = '';
  createCategory: GpsTarget['category'] = 'finance';
  createPriority = 'medium';
  createDueDate = '';
  createOwner = '';
  createError = signal<string | null>(null);
  createLoading = signal(false);

  // finding editor
  editorOpen = signal(false);
  editorMode = signal<'create' | 'edit'>('create');
  editorItem = signal<SwotItem | null>(null);
  editorError = signal<string | null>(null);
  editorSaving = signal(false);
  editorForm = {
    category: 'strength' as Category,
    description: '',
    recommended_response: '',
    impact: 'medium',
    priority: 'medium',
    status: 'identified',
    owner_label: '',
    target_date: '',
  };

  readonly quadrants = [
    { key: 'strength', label: 'Strength', plural: 'Strengths' },
    { key: 'weakness', label: 'Weakness', plural: 'Weaknesses' },
    { key: 'opportunity', label: 'Opportunity', plural: 'Opportunities' },
    { key: 'threat', label: 'Threat', plural: 'Threats' },
  ] as const;

  readonly priorities = ['low', 'medium', 'high', 'critical'];
  readonly impacts = ['low', 'medium', 'high', 'critical'];
  readonly statuses = ['identified', 'planning', 'in_progress', 'completed', 'cancelled'];
  readonly linkFilters = [
    { key: 'all', label: 'All' },
    { key: 'linked', label: 'Has targets' },
    { key: 'unlinked', label: 'No targets' },
  ] as const;

  private readonly catOrder: Record<string, number> = { strength: 0, weakness: 1, opportunity: 2, threat: 3 };
  private readonly rank: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };
  private readonly statusRank: Record<string, number> = { identified: 0, planning: 1, in_progress: 2, completed: 3, cancelled: 4 };

  // ---------- derived ----------
  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const cats = this.catFilter();
    const prios = this.prioFilter();
    const impacts = this.impactFilter();
    const stats = this.statusFilter();
    const link = this.linkFilter();
    return this.items().filter(it => {
      if (cats.size && !cats.has(it.category)) return false;
      if (prios.size && !prios.has(it.priority)) return false;
      if (impacts.size && !impacts.has(it.impact)) return false;
      if (stats.size && !stats.has(it.status)) return false;
      if (link !== 'all') {
        const n = this.targetCount(it.id);
        if (link === 'linked' && n === 0) return false;
        if (link === 'unlinked' && n > 0) return false;
      }
      if (q) {
        const hay = ((it.description || '') + ' ' + (it.recommended_response || '') + ' ' + (it.owner_label || '')).toLowerCase();
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
    return this.quadrants.map(q => ({ key: q.key, label: q.plural, rows: rows.filter(r => r.category === q.key) }));
  });

  activeFilterCount = computed(() =>
    this.catFilter().size + this.prioFilter().size + this.impactFilter().size + this.statusFilter().size + (this.linkFilter() !== 'all' ? 1 : 0)
  );

  colSpan = computed(() => (this.view() === 'table' ? 11 : 10));

  statusOptions = computed(() => {
    const cur = this.editorItem()?.status;
    return cur && !this.statuses.includes(cur) ? [cur, ...this.statuses] : this.statuses;
  });

  linkedCount = computed(() => {
    const ids = new Set<number>();
    for (const arr of Object.values(this.linked())) for (const t of arr as any[]) ids.add(this.displayTargetId(t));
    return ids.size;
  });

  legacySources = computed(() => Math.max(0, this.allTargets().length - this.linkedCount()));

  activeTasksCount = computed(() => {
    let c = 0;
    for (const arr of Object.values(this.tasks())) for (const t of arr as GpsTask[]) if (t.status !== 'completed') c++;
    return c;
  });

  overallProgress = computed(() => {
    const all = this.allTargets();
    if (!all.length) return 0;
    const avg = all.reduce((s, t) => s + Number(t.manual_progress_percentage || 0), 0) / all.length;
    return Math.round(avg);
  });

  allVisibleSelected = computed(() => {
    const rows = this.sorted();
    return rows.length > 0 && rows.every(r => this.selected().has(r.id));
  });

  // ---------- lifecycle ----------
  ngOnInit(): void {
    this.route.paramMap.subscribe(pm => {
      if (pm.get('id')) this.companyId.set(Number(pm.get('id')));
    });
    this.route.parent?.paramMap.subscribe(pm => {
      if (pm.get('id')) this.companyId.set(Number(pm.get('id')));
    });
    let r: ActivatedRoute | null = this.route;
    while (r && !this.companyId()) {
      if (r.snapshot.paramMap.get('id')) this.companyId.set(Number(r.snapshot.paramMap.get('id')));
      r = r.parent;
    }
    if (this.companyId()) this.load();
  }

  load(): void {
    const cid = this.companyId();
    if (!cid) { this.error.set('Missing company id'); return; }
    if (!this.viewStateRestored) this.restoreViewState(cid);
    this.loading.set(true); this.error.set(null);
    this.swot.listAnalyses(cid).subscribe({
      next: analyses => {
        const cur = analyses.find(a => a.is_current) || analyses[0] || null;
        this.analysis.set(cur);
        if (!cur) { this.items.set([]); this.linked.set({}); this.loading.set(false); this.loadTargets(); return; }
        this.swot.listItems(cur.id).subscribe({
          next: items => {
            this.items.set(items);
            this.loading.set(false);
            this.loadTargets();
            this.eagerLoadLinks(items);
          },
          error: e => { this.error.set(e.error?.error || e.message); this.loading.set(false); }
        });
      },
      error: e => { this.error.set(e.error?.error || e.message); this.loading.set(false); }
    });
  }

  private loadTargets(): void {
    this.gps.listTargets(this.companyId()).subscribe({ next: rows => this.allTargets.set(rows), error: () => {} });
  }

  private reloadItems(): void {
    const cur = this.analysis();
    if (!cur) { this.load(); return; }
    this.swot.listItems(cur.id).subscribe({
      next: items => { this.items.set(items); this.eagerLoadLinks(items); },
      error: e => this.error.set(e.error?.error || e.message)
    });
  }

  private eagerLoadLinks(items: SwotItem[]): void {
    if (!items.length) { this.linked.set({}); return; }
    const obs = items.map(it => this.gps.listBySwotItem(it.id).pipe(catchError(() => of([]))));
    forkJoin(obs).subscribe({
      next: arrs => {
        const m: Record<number, any[]> = {};
        items.forEach((it, idx) => m[it.id] = arrs[idx] as any[]);
        this.linked.set(m);
        const targetIds = new Set<number>();
        for (const a of arrs) for (const t of a as any[]) targetIds.add(this.displayTargetId(t as any));
        for (const tid of targetIds) this.loadTasks(tid);
      },
      error: () => {}
    });
  }

  // ---------- view persistence ----------
  private captureViewState() {
    return {
      view: this.view(),
      search: this.search(),
      cat: [...this.catFilter()],
      prio: [...this.prioFilter()],
      impact: [...this.impactFilter()],
      status: [...this.statusFilter()],
      link: this.linkFilter(),
      sortKey: this.sortKey(),
      sortDir: this.sortDir(),
      collapsed: [...this.collapsedGroups()],
      expanded: [...this.expanded()],
    };
  }

  private restoreViewState(cid: number): void {
    const s = this.ui.load(`swot-hierarchy-view:${cid}`, this.captureViewState());
    this.view.set(s.view === 'grouped' ? 'grouped' : 'table');
    this.search.set(typeof s.search === 'string' ? s.search : '');
    this.catFilter.set(new Set(this.ui.array<Category>(s.cat)));
    this.prioFilter.set(new Set(this.ui.array<string>(s.prio)));
    this.impactFilter.set(new Set(this.ui.array<string>(s.impact)));
    this.statusFilter.set(new Set(this.ui.array<string>(s.status)));
    this.linkFilter.set((['all', 'linked', 'unlinked'].includes(s.link) ? s.link : 'all') as 'all' | 'linked' | 'unlinked');
    this.sortKey.set(typeof s.sortKey === 'string' ? s.sortKey : 'category');
    this.sortDir.set(s.sortDir === 'desc' ? 'desc' : 'asc');
    this.collapsedGroups.set(new Set(this.ui.array<string>(s.collapsed)));
    this.expanded.set(new Set(this.ui.array<number>(s.expanded)));
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

  clearSelection(): void { this.selected.set(new Set<number>()); }

  toggleCatFilter(cat: Category): void {
    const next = new Set(this.catFilter());
    if (next.has(cat)) next.delete(cat); else next.add(cat);
    this.catFilter.set(next);
  }

  isCatFiltered(cat: Category): boolean { return this.catFilter().has(cat); }
  isPrioFiltered(v: string): boolean { return this.prioFilter().has(v); }
  isImpactFiltered(v: string): boolean { return this.impactFilter().has(v); }
  isStatusFiltered(v: string): boolean { return this.statusFilter().has(v); }

  clearFilters(): void {
    this.catFilter.set(new Set());
    this.prioFilter.set(new Set());
    this.impactFilter.set(new Set());
    this.statusFilter.set(new Set());
    this.linkFilter.set('all');
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

  toggleSelectAllVisible(ev: Event): void {
    const checked = (ev.target as HTMLInputElement).checked;
    const next = new Set(this.selected());
    for (const r of this.sorted()) { if (checked) next.add(r.id); else next.delete(r.id); }
    this.selected.set(next);
  }

  applyBulkPriority(): void {
    const ids = Array.from(this.selected());
    if (!ids.length) return;
    forkJoin(ids.map(id => this.swot.updateItem(id, { priority: this.bulkPriority }))).subscribe({
      next: () => { this.successMsg.set('Updated priority for ' + ids.length + ' finding(s)'); this.selected.set(new Set()); this.reloadItems(); },
      error: e => this.error.set(e.error?.error || e.message)
    });
  }

  bulkDelete(): void {
    const ids = Array.from(this.selected());
    if (!ids.length) return;
    if (!confirm('Delete ' + ids.length + ' finding(s)? This cannot be undone. Linked GPS targets will remain.')) return;
    forkJoin(ids.map(id => this.swot.deleteItem(id))).subscribe({
      next: () => { this.successMsg.set('Deleted ' + ids.length + ' finding(s)'); this.selected.set(new Set()); this.reloadItems(); },
      error: e => this.error.set(e.error?.error || e.message)
    });
  }

  // ---------- finding editor ----------
  openCreateItem(): void {
    this.editorMode.set('create');
    this.editorItem.set(null);
    this.editorError.set(null);
    this.editorForm = { category: 'strength', description: '', recommended_response: '', impact: 'medium', priority: 'medium', status: 'identified', owner_label: '', target_date: '' };
    this.editorOpen.set(true);
  }

  openEditItem(item: SwotItem): void {
    this.editorMode.set('edit');
    this.editorItem.set(item);
    this.editorError.set(null);
    this.editorForm = {
      category: item.category,
      description: item.description || '',
      recommended_response: item.recommended_response || '',
      impact: item.impact || 'medium',
      priority: item.priority || 'medium',
      status: item.status || 'identified',
      owner_label: item.owner_label || '',
      target_date: item.target_date || '',
    };
    this.editorOpen.set(true);
  }

  saveItem(): void {
    const f = this.editorForm;
    if (!f.description.trim()) { this.editorError.set('Description is required'); return; }
    this.editorSaving.set(true); this.editorError.set(null);
    const payload: Partial<SwotItem> = {
      category: f.category,
      description: f.description.trim(),
      recommended_response: f.recommended_response.trim() || null as any,
      impact: f.impact,
      priority: f.priority,
      status: f.status,
      owner_label: f.owner_label.trim() || null as any,
      target_date: f.target_date || null as any,
    };

    if (this.editorMode() === 'edit' && this.editorItem()) {
      this.swot.updateItem(this.editorItem()!.id, payload).subscribe({
        next: () => this.afterSave('Finding updated'),
        error: e => { this.editorSaving.set(false); this.editorError.set(e.error?.error || e.message); }
      });
      return;
    }

    const cur = this.analysis();
    if (cur?.id) {
      this.swot.createItem({ ...payload, swot_analysis_id: cur.id } as any).subscribe({
        next: () => this.afterSave('Finding added'),
        error: e => { this.editorSaving.set(false); this.editorError.set(e.error?.error || e.message); }
      });
    } else {
      this.swot.createAnalysis({ company_id: this.companyId(), analysis_date: new Date().toISOString().slice(0, 10), status: 'draft', is_current: true }).subscribe({
        next: created => {
          this.analysis.set(created);
          this.swot.createItem({ ...payload, swot_analysis_id: created.id } as any).subscribe({
            next: () => this.afterSave('Finding added'),
            error: e => { this.editorSaving.set(false); this.editorError.set(e.error?.error || e.message); }
          });
        },
        error: e => { this.editorSaving.set(false); this.editorError.set(e.error?.error || e.message); }
      });
    }
  }

  private afterSave(msg: string): void {
    this.editorSaving.set(false);
    this.editorOpen.set(false);
    this.successMsg.set(msg);
    this.reloadItems();
  }

  deleteItem(item: SwotItem): void {
    if (!confirm('Delete this finding? Linked GPS targets will remain. ' + (item.description || '').slice(0, 80))) return;
    this.swot.deleteItem(item.id).subscribe({
      next: () => { this.successMsg.set('Finding deleted'); this.selected.update(s => { const n = new Set(s); n.delete(item.id); return n; }); this.reloadItems(); },
      error: e => this.error.set(e.error?.error || e.message)
    });
  }

  // ---------- expand + task/links ----------
  toggleExpand(id: number): void {
    const s = new Set(this.expanded());
    const willOpen = !s.has(id);
    if (willOpen) s.add(id); else s.delete(id);
    this.expanded.set(s);
    if (willOpen && this.linked()[id] === undefined) {
      this.gps.listBySwotItem(id).subscribe({
        next: rows => {
          this.linked.update(m => ({ ...m, [id]: rows }));
          for (const t of rows as any[]) this.loadTasks(this.displayTargetId(t));
        },
        error: () => this.linked.update(m => ({ ...m, [id]: [] }))
      });
    }
  }

  // helpers to handle both GpsTarget and joined row shapes
  displayTargetId(t: any): number { return Number(t.id ?? t.gps_target_id ?? t.target_id ?? 0); }
  displayTargetTitle(t: any): string { return t.title ?? t.target_title ?? 'Untitled'; }
  displayTargetCategory(t: any): string { return t.category ?? '—'; }
  displayTargetStatus(t: any): string { return t.status ?? t.target_status ?? 'not_started'; }
  displayTargetDue(t: any): string | null { return t.due_date ?? null; }
  displayTargetOwner(t: any): string | null { return t.owner_label ?? null; }
  displayTargetProgress(t: any): number { return Math.round(Number(t.manual_progress_percentage ?? 0)); }
  trackTargetId = (t: any) => this.displayTargetId(t) + '-' + (t.swot_item_id || '');

  categoryLabel(cat: string): string { return this.quadrants.find(q => q.key === cat)?.label ?? cat; }
  statusLabel(status: string): string { return (status || '').replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()); }
  pillClass(v: string): string { return this.rank[v] !== undefined ? v : ''; }

  targetCount(itemId: number): number { return (this.linked()[itemId] || []).length; }

  taskCount(itemId: number): number {
    const rows = this.linked()[itemId] || [];
    let c = 0;
    for (const t of rows) c += (this.tasks()[this.displayTargetId(t)]?.length || 0);
    return c;
  }

  groupTargets(rows: SwotItem[]): number { return rows.reduce((s, r) => s + this.targetCount(r.id), 0); }
  groupTasks(rows: SwotItem[]): number { return rows.reduce((s, r) => s + this.taskCount(r.id), 0); }

  private sortValue(item: SwotItem, key: string): any {
    switch (key) {
      case 'targets': return this.targetCount(item.id);
      case 'tasks': return this.taskCount(item.id);
      case 'category': return this.catOrder[item.category] ?? 9;
      case 'priority': return this.rank[item.priority] ?? 0;
      case 'impact': return this.rank[item.impact] ?? 0;
      case 'status': return this.statusRank[item.status] ?? 0;
      case 'owner_label': return (item.owner_label || '').toLowerCase();
      case 'target_date': return item.target_date || '9999-99-99';
      case 'description': return (item.description || '').toLowerCase();
      default: return '';
    }
  }

  unlinkedTargetsFor(itemId: number): GpsTarget[] {
    const linkedIds = new Set((this.linked()[itemId] || []).map(t => this.displayTargetId(t)));
    return this.allTargets().filter(t => !linkedIds.has(t.id));
  }

  openLinkPicker(itemId: number): void { this.linkPickerFor.set(itemId); this.linkTargetId = null; this.successMsg.set(null); }
  openCreate(itemId: number): void { this.createFor.set(itemId); this.createError.set(null); this.createTitle = ''; this.createDescription = ''; this.createCategory = 'finance'; this.createPriority = 'medium'; this.createDueDate = ''; this.createOwner = ''; }

  doLink(swotItemId: number): void {
    if (!this.linkTargetId) return;
    this.gps.link(this.linkTargetId, swotItemId).subscribe({
      next: () => {
        this.successMsg.set('Linked target #' + this.linkTargetId);
        this.linkPickerFor.set(null);
        this.linkTargetId = null;
        this.gps.listBySwotItem(swotItemId).subscribe({
          next: rows => {
            this.linked.update(m => ({ ...m, [swotItemId]: rows }));
            this.loadTargets();
            for (const t of rows as any[]) this.loadTasks(this.displayTargetId(t));
          }
        });
      },
      error: e => this.error.set(e.error?.error || e.message)
    });
  }

  doCreate(swotItemId: number): void {
    if (!this.createDescription.trim()) { this.createError.set('Description is required'); return; }
    this.createLoading.set(true); this.createError.set(null);
    const payload: any = {
      company_id: this.companyId(),
      title: this.createTitle.trim() || undefined,
      description: this.createDescription.trim(),
      category: this.createCategory,
      priority: this.createPriority,
      due_date: this.createDueDate || undefined,
      owner_label: this.createOwner.trim() || undefined,
      status: 'not_started',
      progress_mode: 'manual',
      manual_progress_percentage: 0,
    };
    this.gps.createTarget(payload).subscribe({
      next: created => {
        this.gps.link(created.id, swotItemId).subscribe({
          next: () => {
            this.createLoading.set(false); this.createFor.set(null);
            this.successMsg.set('Created and linked target #' + created.id);
            this.gps.listBySwotItem(swotItemId).subscribe({
              next: rows => { this.linked.update(m => ({ ...m, [swotItemId]: rows })); this.loadTargets(); for (const t of rows as any[]) this.loadTasks(this.displayTargetId(t)); }
            });
          },
          error: e => { this.createLoading.set(false); this.createError.set(e.error?.error || e.message); }
        });
      },
      error: e => { this.createLoading.set(false); this.createError.set(e.error?.error || e.message); }
    });
  }

  doUnlink(t: any, swotItemId: number): void {
    const targetId = this.displayTargetId(t);
    const linkId = Number(t.source_id ?? 0);
    if (!confirm('Unlink this target from the SWOT item? The target itself will remain.')) return;
    const obs = linkId ? this.gps.unlink(linkId) : this.gps.unlinkByTargetAndSwot(targetId, swotItemId);
    obs.subscribe({
      next: () => {
        this.successMsg.set('Unlinked target #' + targetId);
        this.gps.listBySwotItem(swotItemId).subscribe({
          next: rows => { this.linked.update(m => ({ ...m, [swotItemId]: rows })); this.loadTargets(); }
        });
      },
      error: () => {
        this.gps.unlinkByTargetAndSwot(targetId, swotItemId).subscribe({
          next: () => {
            this.successMsg.set('Unlinked target #' + targetId);
            this.gps.listBySwotItem(swotItemId).subscribe({ next: rows => { this.linked.update(m => ({ ...m, [swotItemId]: rows })); this.loadTargets(); } });
          },
          error: e2 => this.error.set(e2.error?.error || e2.message)
        });
      }
    });
  }

  // tasks
  loadTasks(targetId: number): void {
    this.gps.tasks(targetId).subscribe({ next: rows => this.tasks.update(m => ({ ...m, [targetId]: rows })), error: () => this.tasks.update(m => ({ ...m, [targetId]: [] })) });
  }

  addTaskFor(targetId: number): void {
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
      error: e => this.taskEditError.set(e.error?.error || e.message)
    });
  }

  deleteTask(task: GpsTask): void {
    if (!confirm('Delete task "' + task.title + '"?')) return;
    this.gps.deleteTask(task.id).subscribe({
      next: () => { this.loadTasks(task.gps_target_id); this.refreshTarget(task.gps_target_id); },
      error: e => this.error.set(e.error?.error || e.message)
    });
  }

  moveTask(task: GpsTask, dir: number): void {
    const list = [...(this.tasks()[task.gps_target_id] || [])].sort((a, b) => a.sort_order - b.sort_order);
    const idx = list.findIndex(t => t.id === task.id);
    const nIdx = idx + dir;
    if (nIdx < 0 || nIdx >= list.length) return;
    const tmp = list[idx]; list[idx] = list[nIdx]; list[nIdx] = tmp;
    const ordered = list.map(t => t.id);
    this.gps.reorderTasks(task.gps_target_id, ordered).subscribe({
      next: rows => this.tasks.update(m => ({ ...m, [task.gps_target_id]: rows })),
      error: e => this.error.set(e.error?.error || e.message)
    });
  }

  private refreshTarget(targetId: number): void {
    this.gps.getTarget(targetId).subscribe({
      next: updated => {
        this.allTargets.update(arr => arr.map(t => t.id === updated.id ? updated : t));
        const linked = this.linked();
        const next: Record<number, any[]> = {};
        for (const [k, arr] of Object.entries(linked)) {
          next[Number(k)] = (arr as any[]).map((t: any) => this.displayTargetId(t) === targetId ? { ...t, manual_progress_percentage: updated.manual_progress_percentage, status: updated.status } : t);
        }
        this.linked.set(next);
      },
      error: () => {}
    });
  }
}
