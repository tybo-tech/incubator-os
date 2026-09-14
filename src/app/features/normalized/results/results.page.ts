import { Component, ChangeDetectionStrategy, inject, signal, computed, effect, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AchievementsService, Achievement, AchievementEvidence, AchievementCounts, AwaitingReview, EvidenceSourceType, VerificationStatus } from '../services/achievements.service';
import { GpsService, GpsTarget } from '../services/gps.service';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon';
import { AuthService } from '../../../auth/auth.service';
import { ViewStateService } from '../../../../services/view-state.service';

type View = 'table' | 'grouped';
type PopupMode = 'view' | 'edit';
type Scope = 'outcomes' | 'decisions' | 'awaiting';

@Component({
  selector: 'app-results',
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
        <h2 class="sw-title">Results &amp; Achievements</h2>
        <p class="sw-subtitle">What actually changed — measured results, qualitative achievements and dated decisions. Company {{ companyId() }}</p>
      </div>
      <div class="sw-legend" aria-label="Legend">
        <span class="sw-key"><span class="sw-dot target"></span> Result</span>
        <span class="sw-key"><span class="sw-dot task"></span> Achievement</span>
        <span class="sw-key"><span class="sw-dot"></span> Decision</span>
      </div>
    </div>

    @if (error()) { <div class="sw-alert error">{{ error() }}</div> }
    @if (successMsg()) { <div class="sw-alert success">{{ successMsg() }}</div> }

    <div class="sw-summary">
      <div class="sw-summary-item"><div class="sw-summary-value">{{ awaiting().length }}</div><div class="sw-summary-label">Awaiting review</div></div>
      <div class="sw-summary-item"><div class="sw-summary-value">{{ outcomes().length }}</div><div class="sw-summary-label">Results &amp; achievements</div></div>
      <div class="sw-summary-item"><div class="sw-summary-value">{{ verifiedCount() }}</div><div class="sw-summary-label">Verified</div></div>
      <div class="sw-summary-item"><div class="sw-summary-value">{{ decisions().length }}</div><div class="sw-summary-label">Decisions (excluded from totals)</div></div>
    </div>

    <div class="sw-toolbar">
      <div class="sw-seg" role="tablist" aria-label="Scope">
        <button type="button" role="tab" [class.active]="scope() === 'outcomes'" [attr.aria-selected]="scope() === 'outcomes'" (click)="scope.set('outcomes')">
          <app-icon name="document-text"></app-icon> Results &amp; achievements
        </button>
        <button type="button" role="tab" [class.active]="scope() === 'decisions'" [attr.aria-selected]="scope() === 'decisions'" (click)="scope.set('decisions')">
          <app-icon name="bars-3"></app-icon> Decisions
        </button>
        <button type="button" role="tab" [class.active]="scope() === 'awaiting'" [attr.aria-selected]="scope() === 'awaiting'" (click)="scope.set('awaiting')">
          <app-icon name="check"></app-icon> Awaiting review
        </button>
      </div>

      @if (scope() !== 'awaiting') {
        <div class="sw-seg" role="tablist" aria-label="View">
          <button type="button" role="tab" [class.active]="view() === 'table'" [attr.aria-selected]="view() === 'table'" (click)="view.set('table')"><app-icon name="table-cells"></app-icon> Table</button>
          <button type="button" role="tab" [class.active]="view() === 'grouped'" [attr.aria-selected]="view() === 'grouped'" (click)="view.set('grouped')"><app-icon name="rectangle-group"></app-icon> Grouped</button>
        </div>

        <label class="sw-search">
          <app-icon name="magnifying-glass"></app-icon>
          <input type="search" placeholder="Search results…" [ngModel]="search()" (ngModelChange)="search.set($event)" aria-label="Search results">
          @if (search()) { <button class="sw-search-clear" type="button" aria-label="Clear search" (click)="search.set('')"><app-icon name="x-mark"></app-icon></button> }
        </label>

        <button class="sw-btn" type="button" [class.active]="filtersOpen() || activeFilterCount() > 0" (click)="filtersOpen.set(!filtersOpen())">
          <app-icon name="funnel"></app-icon> Filter
          @if (activeFilterCount() > 0) { <span class="sw-filter-count">{{ activeFilterCount() }}</span> }
        </button>
      }

      <button class="sw-btn" type="button" (click)="load()"><app-icon name="arrow-path"></app-icon> Refresh</button>
      <a class="sw-btn" [routerLink]="['/company', companyId(), 'gps-targets-v2']">Targets</a>
      <button class="sw-btn primary" type="button" (click)="openCreate()"><app-icon name="plus"></app-icon> Add result</button>
    </div>

    @if (scope() !== 'awaiting' && filtersOpen()) {
      <div class="sw-filters">
        @if (scope() === 'outcomes') {
          <div class="sw-filter-row">
            <span class="sw-filter-label">Kind</span>
            <div class="sw-chipgroup">
              @for (k of outcomeKinds; track k.key) {
                <button class="sw-chip" type="button" [class.on]="kindFilter().has(k.key)" (click)="toggleSet(kindFilter, k.key)">{{ k.label }}</button>
              }
            </div>
          </div>
        }
        <div class="sw-filter-row">
          <span class="sw-filter-label">State</span>
          <div class="sw-chipgroup">
            @for (s of verificationStates; track s) {
              <button class="sw-chip" type="button" [class.on]="statusFilter().has(s)" (click)="toggleSet(statusFilter, s)">{{ statusLabel(s) }}</button>
            }
          </div>
        </div>
        <div class="sw-filter-row">
          <span class="sw-filter-label">Category</span>
          <div class="sw-chipgroup">
            @for (c of categories; track c.key) {
              <button class="sw-chip" type="button" [class.on]="categoryFilter().has(c.key)" (click)="toggleSet(categoryFilter, c.key)">{{ c.label }}</button>
            }
          </div>
        </div>
        <div class="sw-filter-row">
          <span class="sw-filter-label">Target</span>
          <div class="sw-chipgroup">
            @for (t of targetFilters; track t.key) {
              <button class="sw-chip" type="button" [class.on]="targetFilter() === t.key" (click)="targetFilter.set(t.key)">{{ t.label }}</button>
            }
            @if (activeFilterCount() > 0) { <button class="sw-chip" type="button" style="color:var(--ios-red); border-color:#fecdca;" (click)="clearFilters()">Clear all</button> }
          </div>
        </div>
      </div>
    }

    @if (scope() !== 'awaiting' && selected().size > 0) {
      <div class="sw-bulk">
        <span><strong>{{ selected().size }}</strong> selected</span>
        <span class="sw-spacer" style="flex:1"></span>
        <button class="sw-btn sm danger" type="button" (click)="bulkDelete()">Delete drafts</button>
        <button class="sw-btn sm" type="button" (click)="clearSelection()">Clear</button>
      </div>
    }

    @if (loading()) {
      <div class="sw-footnote">Loading…</div>
    } @else if (scope() === 'awaiting') {
      @if (awaiting().length === 0) {
        <div class="sw-empty-target"><span>No measured targets awaiting review. Awaiting review appears when a measurable target's financial data is complete and authoritative but no outcome has been recorded yet.</span></div>
      } @else {
        @for (a of awaiting(); track a.gps_target_id) {
          <div class="sw-await-row">
            <div style="flex:1">
              <div class="sw-await-title">{{ targetTitle(a.gps_target_id) }}</div>
              <div class="sw-await-meta">
                {{ trioLabel(a.measurement) }}
                @if (a.measurement?.target?.period?.label) { · {{ a.measurement.target.period.label }} }
                @if (a.measurement?.baseline?.status) { · baseline {{ statusLabel(a.measurement.baseline.status) }} / target {{ statusLabel(a.measurement.target.status) }} }
              </div>
            </div>
            <a class="sw-btn sm" [routerLink]="['/company', companyId(), 'gps-targets-v2']">Open target</a>
            <button class="sw-btn primary sm" type="button" (click)="openCreateForTarget(a)"><app-icon name="plus"></app-icon> Record outcome</button>
          </div>
        }
      }
    } @else if (scopeRows().length === 0) {
      <div class="sw-empty-target">
        <span>
          @if (scope() === 'decisions') { No decisions recorded for this company yet. }
          @else { No results or achievements recorded for this company yet. }
        </span>
        <button class="sw-btn primary" type="button" (click)="openCreate()"><app-icon name="plus"></app-icon> Add {{ scope() === 'decisions' ? 'decision' : 'result' }}</button>
      </div>
    } @else if (view() === 'table') {
      <div class="sw-table-card">
        <table class="sw-table">
          <ng-container [ngTemplateOutlet]="tableHead"></ng-container>
          <tbody>
            <ng-container [ngTemplateOutlet]="tableRows" [ngTemplateOutletContext]="{ $implicit: sorted() }"></ng-container>
          </tbody>
        </table>
      </div>
      @if (sorted().length === 0) { <div class="sw-group-empty" style="margin-top:10px;">No records match the current filters.</div> }
    } @else {
      @for (g of groups(); track g.key) {
        <section class="sw-group">
          <button class="sw-group-head" type="button" (click)="toggleGroup(g.key)" [attr.aria-expanded]="!collapsedGroups().has(g.key)">
            <app-icon [name]="collapsedGroups().has(g.key) ? 'chevron-right' : 'chevron-down'"></app-icon>
            <span class="sw-badge {{ g.key }}">{{ g.label }}</span>
            <span class="sw-group-count">{{ g.rows.length }} record{{ g.rows.length === 1 ? '' : 's' }}</span>
            <span class="sw-group-spacer"></span>
          </button>
          @if (!collapsedGroups().has(g.key)) {
            @if (g.rows.length === 0) {
              <div class="sw-group-empty">No {{ g.label.toLowerCase() }} records match the current filters.</div>
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
      path: company/{{ companyId() }}/results · Results &amp; achievements {{ outcomes().length }}
      @if (counts(); as c) { · verified {{ c.by_status?.['verified'] || 0 }} · unverified {{ c.by_status?.['unverified'] || 0 }} · decisions {{ c.decisions }} (excluded) }
      · <span>verification is captured from the authoritative financial snapshot at the moment of review</span>
    </div>
  </div>

  <ng-template #tableHead>
    <thead>
      <tr>
        <th class="sw-th-check"><input type="checkbox" [checked]="allVisibleSelected()" (change)="toggleSelectAllVisible($event)" aria-label="Select all visible"></th>
        <th class="sortable" (click)="toggleSort('kind')">Kind <app-icon class="sw-sort-icon" [class.is-active]="sortKey() === 'kind'" [name]="sortIcon('kind')"></app-icon></th>
        <th class="sortable" (click)="toggleSort('title')">Record <app-icon class="sw-sort-icon" [class.is-active]="sortKey() === 'title'" [name]="sortIcon('title')"></app-icon></th>
        <th>Baseline → Goal → Actual</th>
        <th class="sortable col-date" (click)="toggleSort('achieved_on')">Date <app-icon class="sw-sort-icon" [class.is-active]="sortKey() === 'achieved_on'" [name]="sortIcon('achieved_on')"></app-icon></th>
        <th class="sortable" (click)="toggleSort('verification_status')">State <app-icon class="sw-sort-icon" [class.is-active]="sortKey() === 'verification_status'" [name]="sortIcon('verification_status')"></app-icon></th>
        <th class="sw-td-actions"></th>
      </tr>
    </thead>
  </ng-template>

  <ng-template #tableRows let-rows>
    @for (r of rows; track r.id) {
      <tr class="sw-row" [class.selected]="selected().has(r.id)" (click)="openView(r)">
        <td class="sw-td-check" (click)="$event.stopPropagation()">
          <input type="checkbox" [checked]="selected().has(r.id)" (change)="toggleSelect(r.id)" [attr.aria-label]="'Select ' + r.title">
        </td>
        <td><span class="sw-badge {{ r.kind }}">{{ kindLabel(r.kind) }}</span></td>
        <td class="sw-td-finding">
          <div class="sw-finding">
            <div>
              <div class="sw-finding-title">{{ r.title }}</div>
              @if (r.description) { <div class="sw-finding-sub">{{ r.description }}</div> }
            </div>
          </div>
        </td>
        <td>
          @if (isMeasurable(r)) { <span class="sw-trio">{{ num(r.baseline_value) }}<span class="arrow">→</span><span class="goal">{{ num(r.target_value) }}</span><span class="arrow">→</span><span class="actual">{{ num(r.actual_value) }}</span>@if (r.unit) {<span class="unit">{{ r.unit }}</span>}</span> }
          @else { <span class="sw-qualitative">Qualitative</span> }
        </td>
        <td class="col-date">{{ r.achieved_on || '—' }}</td>
        <td>
          @if (r.kind === 'decision') { <span class="sw-pill">Event</span> }
          @else { <span class="sw-pill status-{{ r.verification_status }}">{{ statusLabel(r.verification_status) }}</span> }
        </td>
        <td class="sw-td-actions" (click)="$event.stopPropagation()">
          <button class="sw-icon-btn" type="button" title="View" aria-label="View" (click)="openView(r)"><app-icon name="document-text"></app-icon></button>
          @if (canEdit(r)) {
            <button class="sw-icon-btn" type="button" title="Edit draft" aria-label="Edit draft" (click)="openEdit(r)"><app-icon name="pencil-square"></app-icon></button>
            <button class="sw-icon-btn danger" type="button" title="Delete draft" aria-label="Delete draft" (click)="deleteRecord(r)"><app-icon name="trash"></app-icon></button>
          }
        </td>
      </tr>
    }
  </ng-template>

  @if (popupOpen()) {
    <div class="sw-modal">
      <div class="sw-modal-card wide" (click)="$event.stopPropagation()">
        <div class="sw-modal-head">
          <div>
            <h3>{{ popupIsCreate() ? (formKind === 'decision' ? 'Add decision' : 'Add result') : (popupMode() === 'edit' ? 'Edit ' + kindLabel(popupRecord()?.kind || 'result').toLowerCase() : (popupRecord()?.title || 'Record')) }}</h3>
            <div class="sw-head-sub">
              @if (popupIsCreate() || popupMode() === 'edit') {
                Company {{ companyId() }} — normalized API
              } @else {
                {{ kindLabel(popupRecord()?.kind || 'result') }} · #{{ popupRecord()?.id }}
              }
            </div>
          </div>
          <button class="sw-icon-btn" type="button" aria-label="Close" (click)="closePopup()"><app-icon name="x-mark"></app-icon></button>
        </div>

        <div class="sw-modal-body">
          @if (popupMode() === 'view' && popupRecord(); as r) {
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:10px;">
              <span class="sw-badge {{ r.kind }}">{{ kindLabel(r.kind) }}</span>
              @if (r.kind === 'decision') { <span class="sw-pill">Event · excluded from totals</span> }
              @else { <span class="sw-pill status-{{ r.verification_status }}">{{ statusLabel(r.verification_status) }}</span> }
              @if (r.category) { <span class="sw-pill">{{ categoryLabel(r.category) }}</span> }
              @if (r.supersedes_id) { <span class="sw-pill">supersedes #{{ r.supersedes_id }}</span> }
            </div>

            <div class="sw-detail-text">{{ r.description || '—' }}</div>

            @if (isMeasurable(r)) {
              <div class="sw-section">
                <div class="sw-section-title">Measured outcome</div>
                <div class="sw-trio" style="font-size:16px;">{{ num(r.baseline_value) }}<span class="arrow">→</span><span class="goal">{{ num(r.target_value) }}</span><span class="arrow">→</span><span class="actual">{{ num(r.actual_value) }}</span>@if (r.unit) {<span class="unit">{{ r.unit }}</span>}</div>
                <div class="sw-kv" style="margin-top:10px;">
                  <div><span>Direction</span><strong>{{ r.direction || '—' }}</strong></div>
                  <div><span>Unit</span><strong>{{ r.unit || '—' }}</strong></div>
                </div>
              </div>
            }

            <div class="sw-section">
              <div class="sw-kv">
                <div><span>Achieved / event date</span><strong>{{ r.achieved_on || '—' }}</strong></div>
                <div><span>Linked target</span><strong>{{ r.gps_target_id ? targetTitle(r.gps_target_id) : '— none (qualitative)' }}</strong></div>
                <div><span>Recorded by</span><strong>{{ r.recorded_by || '—' }} · {{ r.recorded_at }}</strong></div>
                <div><span>{{ r.kind === 'decision' ? 'Decided by' : 'Verified by' }}</span><strong>{{ r.verified_by ? r.verified_by + ' · ' + (r.verified_at || '') : '—' }}</strong></div>
                @if (r.revoked_reason) { <div class="span2"><span>Revocation reason</span><strong>{{ r.revoked_reason }}</strong></div> }
              </div>
              @if (r.evidence_summary) { <div class="sw-note-row" style="margin-top:10px;">{{ r.evidence_summary }}</div> }
            </div>

            <div class="sw-section">
              <div class="sw-section-title"><span>Evidence ({{ popupEvidence().length }})</span></div>
              @if (popupEvidence().length === 0) { <div class="sw-footnote" style="margin:0;">No evidence attached.</div> }
              @else {
                @for (e of popupEvidence(); track e.id) {
                  <div class="sw-source-row">
                    <span class="sw-source-kind">{{ evidenceLabel(e.source_type) }}{{ e.label ? ' · ' + e.label : '' }}</span>
                    @if (e.reference) { <div>{{ e.reference }}</div> }
                    @if (e.snapshot; as snap) {
                      <div class="sw-snapshot" style="margin-top:6px;">
                        <strong>Measurement snapshot</strong> · calc {{ snap.calculation_version }} · {{ snap.authoritative ? 'authoritative' : 'non-authoritative' }}
                        <div class="sw-mini">
                          Baseline {{ snap.baseline?.period?.label || '—' }}: <strong>{{ snap.baseline?.subtotal ?? '—' }}</strong> ({{ snap.baseline?.status }})
                          · Target {{ snap.target?.period?.label || '—' }}: <strong>{{ snap.target?.subtotal ?? '—' }}</strong> ({{ snap.target?.status }})
                          @if (snap.measure?.unit) { · unit {{ snap.measure.unit }} }
                          @if (snap.measure?.direction) { · direction {{ snap.measure.direction }} }
                          @if (snap.measure?.tolerance?.value !== null && snap.measure?.tolerance?.value !== undefined) { · tolerance {{ snap.measure.tolerance.value }} {{ snap.measure.tolerance.unit }} }
                          @if (snap.baseline?.unresolved_rows) { · baseline unresolved rows {{ snap.baseline.unresolved_rows }} }
                          @if (snap.target?.unresolved_rows) { · target unresolved rows {{ snap.target.unresolved_rows }} }
                        </div>
                      </div>
                    }
                    <div class="sw-mini" style="margin-top:5px; color:var(--ios-muted);">by {{ e.created_by || '—' }} · {{ e.created_at }}</div>
                    @if (canEdit(r)) { <button class="sw-link" style="color:var(--ios-red)" (click)="deleteEvidence(e)">Delete</button> }
                  </div>
                }
              }

              @if (canEdit(r)) {
                <div class="sw-form-grid" style="margin-top:8px;">
                  <label class="sw-field"><span>Type</span>
                    <select class="sw-select" [(ngModel)]="evidenceType">
                      @for (t of evidenceTypes; track t.key) { <option [value]="t.key">{{ t.label }}</option> }
                    </select>
                  </label>
                  <label class="sw-field"><span>Label</span><input class="sw-input" [(ngModel)]="evidenceLabelInput" placeholder="Optional label"></label>
                  <label class="sw-field span2"><span>{{ evidenceType === 'url' ? 'URL' : (evidenceType === 'file' ? 'Asset ID or URL' : 'Reference / note') }}</span><input class="sw-input" [(ngModel)]="evidenceReference"></label>
                </div>
                <div class="sw-footnote" style="margin:6px 0 0;">{{ evidenceHint() }}</div>
                @if (evidenceError()) { <div class="sw-alert error" style="margin:8px 0 0;">{{ evidenceError() }}</div> }
                <button class="sw-btn sm" type="button" style="margin-top:8px;" (click)="addEvidence(r.id)">Add evidence</button>
              }
            </div>
          } @else {
            <div class="sw-form-grid">
              <label class="sw-field span2"><span>Title *</span><input class="sw-input" [(ngModel)]="formTitle" placeholder="e.g. Q4 domestic revenue exceeded target"></label>
              <label class="sw-field"><span>Kind</span>
                <select class="sw-select" [(ngModel)]="formKind">
                  <option value="result">Result</option>
                  <option value="achievement">Achievement</option>
                  <option value="decision">Decision (event, not verifiable)</option>
                </select>
              </label>
              <label class="sw-field"><span>Category</span>
                <select class="sw-select" [(ngModel)]="formCategory">
                  <option value="">—</option>
                  @for (c of categories; track c.key) { <option [value]="c.key">{{ c.label }}</option> }
                </select>
              </label>
              <label class="sw-field"><span>{{ formKind === 'decision' ? 'Decision date' : 'Achieved on' }}</span><input class="sw-input" type="date" [(ngModel)]="formAchievedOn"></label>
              <label class="sw-field"><span>Linked target</span>
                <select class="sw-select" [(ngModel)]="formTargetId">
                  <option value="">— none (qualitative) —</option>
                  @for (t of targets(); track t.id) { <option [value]="t.id">#{{ t.id }} · {{ t.title }}</option> }
                </select>
              </label>
              <label class="sw-field span2"><span>Description</span><textarea class="sw-textarea" [(ngModel)]="formDescription" placeholder="What happened, and how do you know?"></textarea></label>

              @if (formKind !== 'decision') {
                <label class="sw-field"><span>Baseline value</span><input class="sw-input" type="number" [(ngModel)]="formBaseline"></label>
                <label class="sw-field"><span>Goal value</span><input class="sw-input" type="number" [(ngModel)]="formGoal"></label>
                <label class="sw-field"><span>Actual value</span><input class="sw-input" type="number" [(ngModel)]="formActual"></label>
                <label class="sw-field"><span>Unit</span><input class="sw-input" [(ngModel)]="formUnit" placeholder="e.g. ZAR"></label>
                <label class="sw-field"><span>Direction</span>
                  <select class="sw-select" [(ngModel)]="formDirection">
                    <option value="">—</option>
                    <option value="increase">Increase</option>
                    <option value="decrease">Decrease</option>
                    <option value="maintain">Maintain</option>
                  </select>
                </label>
              }
              <label class="sw-field span2"><span>Evidence summary</span><textarea class="sw-textarea" [(ngModel)]="formEvidenceSummary" placeholder="Optional — supporting evidence summary"></textarea></label>
            </div>
            <div class="sw-footnote" style="margin-top:8px;">Measurable records linked to a target with a configured measure are populated from the authoritative financial snapshot at verification; manual values above are only used otherwise.</div>
            @if (formError()) { <div class="sw-alert error" style="margin-top:10px;">{{ formError() }}</div> }
          }
        </div>

        <div class="sw-modal-foot">
          @if (popupMode() === 'view' && popupRecord(); as r) {
            @if (canEdit(r)) { <button class="sw-btn danger" type="button" (click)="deleteRecord(r)">Delete draft</button> }
            <span class="sw-spacer" style="flex:1"></span>
            <button class="sw-btn" type="button" (click)="closePopup()">Close</button>
            @if (canEdit(r)) { <button class="sw-btn primary" type="button" (click)="startEdit()">Edit</button> }
            @if (isSA() && r.kind !== 'decision' && r.verification_status === 'unverified') {
              <button class="sw-btn danger" type="button" (click)="rejectRecord(r)">Reject</button>
              <button class="sw-btn primary" type="button" (click)="verifyRecord(r)">Verify</button>
            }
            @if (isSA() && r.verification_status === 'verified') {
              <button class="sw-btn danger" type="button" (click)="revokeRecord(r)">Revoke…</button>
              <button class="sw-btn" type="button" (click)="supersedeRecord(r)">Supersede</button>
            }
          } @else {
            <button class="sw-btn" type="button" (click)="cancelEdit()">Cancel</button>
            <button class="sw-btn primary" type="button" (click)="saveRecord()" [disabled]="formLoading()">{{ formLoading() ? 'Saving…' : (popupIsCreate() ? 'Create' : 'Save changes') }}</button>
          }
        </div>
      </div>
    </div>
  }
  `,
})
export class ResultsPage {
  private route = inject(ActivatedRoute);
  private api = inject(AchievementsService);
  private gps = inject(GpsService);
  private auth = inject(AuthService);
  private ui = inject(ViewStateService);
  private viewStateRestored = false;

  constructor() {
    // Persist view settings (scope, view mode, filters, sort, grouping) so a
    // refresh or returning to the page keeps the user's layout. See AGENTS.md.
    effect(() => {
      const cid = this.companyId();
      const state = this.captureViewState();
      if (!cid || !this.viewStateRestored) return;
      this.ui.save(`results-view:${cid}`, state);
    });
  }

  companyId = signal<number>(0);
  loading = signal(false);
  error = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  records = signal<Achievement[]>([]);
  counts = signal<AchievementCounts | null>(null);
  awaiting = signal<AwaitingReview[]>([]);
  targets = signal<GpsTarget[]>([]);

  scope = signal<Scope>('outcomes');
  view = signal<View>('table');
  search = signal('');
  filtersOpen = signal(false);
  kindFilter = signal<Set<string>>(new Set());
  statusFilter = signal<Set<string>>(new Set());
  categoryFilter = signal<Set<string>>(new Set());
  targetFilter = signal<'all' | 'linked' | 'unlinked'>('all');
  sortKey = signal<string>('achieved_on');
  sortDir = signal<'asc' | 'desc'>('desc');
  collapsedGroups = signal<Set<string>>(new Set());
  selected = signal<Set<number>>(new Set());

  popupOpen = signal(false);
  popupMode = signal<PopupMode>('view');
  popupIsCreate = signal(false);
  popupRecord = signal<Achievement | null>(null);
  popupEvidence = signal<AchievementEvidence[]>([]);

  formTitle = '';
  formKind: 'result' | 'achievement' | 'decision' = 'result';
  formCategory = '';
  formAchievedOn = '';
  formDescription = '';
  formTargetId = '';
  formBaseline: number | null = null;
  formGoal: number | null = null;
  formActual: number | null = null;
  formUnit = '';
  formDirection = '';
  formEvidenceSummary = '';
  formError = signal<string | null>(null);
  formLoading = signal(false);

  evidenceType: EvidenceSourceType = 'note';
  evidenceLabelInput = '';
  evidenceReference = '';
  evidenceError = signal<string | null>(null);

  readonly outcomeKinds = [
    { key: 'result', label: 'Result' },
    { key: 'achievement', label: 'Achievement' },
  ] as const;
  readonly verificationStates: VerificationStatus[] = ['unverified', 'verified', 'rejected', 'revoked'];
  readonly categories = [
    { key: 'finance', label: 'Finance' },
    { key: 'strategy_general', label: 'Strategy / General' },
    { key: 'sales_marketing', label: 'Sales & Marketing' },
    { key: 'personal_development', label: 'Personal Development' },
  ] as const;
  readonly targetFilters = [
    { key: 'all', label: 'All' },
    { key: 'linked', label: 'Linked to target' },
    { key: 'unlinked', label: 'Qualitative' },
  ] as const;
  readonly evidenceTypes = [
    { key: 'note', label: 'Note' },
    { key: 'url', label: 'Link (URL)' },
    { key: 'financial_stat', label: 'Financial statement' },
    { key: 'file', label: 'Asset reference' },
  ] as const;

  private readonly kindOrder: Record<string, number> = { result: 0, achievement: 1, decision: 2 };
  private readonly statusOrder: Record<string, number> = { unverified: 0, verified: 1, rejected: 2, revoked: 3 };

  isSA = computed(() => this.auth.isSystemAdministrator());
  decisions = computed(() => this.records().filter(r => r.kind === 'decision'));
  outcomes = computed(() => this.records().filter(r => r.kind !== 'decision'));
  verifiedCount = computed(() => this.outcomes().filter(r => r.verification_status === 'verified').length);

  scopeRows = computed(() => this.scope() === 'decisions' ? this.decisions() : this.outcomes());

  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const kinds = this.kindFilter();
    const states = this.statusFilter();
    const cats = this.categoryFilter();
    const tgt = this.targetFilter();
    return this.scopeRows().filter(r => {
      if (kinds.size && !kinds.has(r.kind)) return false;
      if (states.size && !states.has(r.verification_status)) return false;
      if (cats.size && !cats.has(r.category || '')) return false;
      if (tgt !== 'all') {
        const linked = r.gps_target_id !== null && r.gps_target_id !== undefined;
        if (tgt === 'linked' && !linked) return false;
        if (tgt === 'unlinked' && linked) return false;
      }
      if (q) {
        const hay = ((r.title || '') + ' ' + (r.description || '') + ' ' + (r.evidence_summary || '')).toLowerCase();
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
      return b.id - a.id;
    });
  });

  groups = computed(() => {
    const rows = this.sorted();
    const list = [...this.categories.map(c => ({ key: c.key, label: c.label, rows: rows.filter(r => r.category === c.key) })),
                  { key: 'uncategorised', label: 'Uncategorised', rows: rows.filter(r => !r.category) }];
    return list.filter(g => g.rows.length > 0 || g.key !== 'uncategorised');
  });

  activeFilterCount = computed(() =>
    this.kindFilter().size + this.statusFilter().size + this.categoryFilter().size + (this.targetFilter() !== 'all' ? 1 : 0)
  );

  allVisibleSelected = computed(() => {
    const rows = this.sorted();
    return rows.length > 0 && rows.every(r => this.selected().has(r.id));
  });

  ngOnInit(): void {
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
    this.loading.set(true); this.error.set(null);
    forkJoin({
      records: this.api.list(cid),
      counts: this.api.counts(cid),
      awaiting: this.api.awaitingReview(cid),
      targets: this.gps.listTargets(cid),
    }).subscribe({
      next: res => {
        this.records.set(res.records || []);
        this.counts.set(res.counts || null);
        this.awaiting.set(res.awaiting || []);
        this.targets.set(res.targets || []);
        this.loading.set(false);
      },
      error: e => { this.error.set(e.error?.error || e.message); this.loading.set(false); }
    });
  }

  // ---------- display helpers ----------
  kindLabel(kind: string): string { return kind === 'achievement' ? 'Achievement' : kind === 'decision' ? 'Decision' : 'Result'; }
  statusLabel(v: string): string { return (v || '').replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()); }
  categoryLabel(key: string): string { return this.categories.find(c => c.key === key)?.label ?? key; }
  evidenceLabel(t: string): string { return this.evidenceTypes.find(e => e.key === t)?.label ?? t; }
  num(v: number | null | undefined): string { return v === null || v === undefined ? '—' : String(v); }
  isMeasurable(r: Achievement): boolean {
    return r.baseline_value !== null || r.target_value !== null || r.actual_value !== null || !!r.unit || !!r.direction;
  }
  targetTitle(id: number | null): string {
    if (!id) return '—';
    const t = this.targets().find(x => x.id === id);
    return t ? `${t.title} (#${id})` : `Target #${id}`;
  }
  trioLabel(m: any): string {
    if (!m) return '';
    const b = m.baseline?.subtotal ?? '—';
    const g = m.measure?.target_value ?? '—';
    const a = m.target?.subtotal ?? '—';
    const u = m.measure?.unit ? ' ' + m.measure.unit : '';
    return `${b} → ${g} → ${a}${u}`;
  }
  evidenceHint(): string {
    if (this.evidenceType === 'url') return 'Paste a URL to an external record.';
    if (this.evidenceType === 'file') return 'Reference an existing asset ID or URL — binary uploads are not part of this phase.';
    if (this.evidenceType === 'financial_stat') return 'Reference the financial statement used at review.';
    return 'Free-text note.';
  }

  // ---------- capability gating ----------
  canEdit(r: Achievement): boolean { return r.verification_status === 'unverified'; }

  // ---------- view persistence ----------
  private captureViewState() {
    return {
      scope: this.scope(),
      view: this.view(),
      search: this.search(),
      kind: [...this.kindFilter()],
      status: [...this.statusFilter()],
      category: [...this.categoryFilter()],
      target: this.targetFilter(),
      sortKey: this.sortKey(),
      sortDir: this.sortDir(),
      collapsed: [...this.collapsedGroups()],
    };
  }

  private restoreViewState(cid: number): void {
    const s = this.ui.load(`results-view:${cid}`, this.captureViewState());
    this.scope.set((['outcomes', 'decisions', 'awaiting'].includes(s.scope) ? s.scope : 'outcomes') as Scope);
    this.view.set(s.view === 'grouped' ? 'grouped' : 'table');
    this.search.set(typeof s.search === 'string' ? s.search : '');
    this.kindFilter.set(new Set(this.ui.array<string>(s.kind)));
    this.statusFilter.set(new Set(this.ui.array<string>(s.status)));
    this.categoryFilter.set(new Set(this.ui.array<string>(s.category)));
    this.targetFilter.set((['all', 'linked', 'unlinked'].includes(s.target) ? s.target : 'all') as 'all' | 'linked' | 'unlinked');
    this.sortKey.set(typeof s.sortKey === 'string' ? s.sortKey : 'achieved_on');
    this.sortDir.set(s.sortDir === 'asc' ? 'asc' : 'desc');
    this.collapsedGroups.set(new Set(this.ui.array<string>(s.collapsed)));
    this.viewStateRestored = true;
  }

  // ---------- filters / sort / view ----------
  toggleSet(target: WritableSignal<Set<string>>, value: string): void {
    const next = new Set(target());
    if (next.has(value)) next.delete(value); else next.add(value);
    target.set(next);
  }
  clearFilters(): void {
    this.kindFilter.set(new Set());
    this.statusFilter.set(new Set());
    this.categoryFilter.set(new Set());
    this.targetFilter.set('all');
    this.search.set('');
  }
  toggleSort(key: string): void {
    if (this.sortKey() === key) this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    else { this.sortKey.set(key); this.sortDir.set('asc'); }
  }
  sortIcon(key: string): string {
    if (this.sortKey() !== key) return 'chevron-up-down';
    return this.sortDir() === 'asc' ? 'arrow-up' : 'arrow-down';
  }
  toggleGroup(key: string): void {
    const next = new Set(this.collapsedGroups());
    if (next.has(key)) next.delete(key); else next.add(key);
    this.collapsedGroups.set(next);
  }
  private sortValue(r: Achievement, key: string): any {
    switch (key) {
      case 'title': return (r.title || '').toLowerCase();
      case 'kind': return this.kindOrder[r.kind] ?? 9;
      case 'verification_status': return this.statusOrder[r.verification_status] ?? 9;
      case 'achieved_on': return r.achieved_on || '0000-00-00';
      default: return '';
    }
  }

  // ---------- selection ----------
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
  bulkDelete(): void {
    const ids = Array.from(this.selected());
    const drafts = this.records().filter(r => ids.includes(r.id) && this.canEdit(r));
    if (!drafts.length) { this.error.set('Only draft records can be deleted.'); return; }
    if (!confirm('Delete ' + drafts.length + ' draft record(s)? This cannot be undone.')) return;
    forkJoin(drafts.map(r => this.api.remove(r.id))).subscribe({
      next: () => { this.successMsg.set('Deleted ' + drafts.length + ' draft(s)'); this.clearSelection(); this.load(); },
      error: e => this.error.set(e.error?.error || e.message)
    });
  }

  // ---------- popup ----------
  openView(r: Achievement): void {
    this.popupRecord.set(r);
    this.popupIsCreate.set(false);
    this.popupMode.set('view');
    this.popupOpen.set(true);
    this.formError.set(null);
    this.loadEvidence(r.id);
  }

  openCreate(): void {
    this.popupRecord.set(null);
    this.popupIsCreate.set(true);
    this.popupMode.set('edit');
    this.popupOpen.set(true);
    this.formTitle = ''; this.formKind = this.scope() === 'decisions' ? 'decision' : 'result';
    this.formCategory = ''; this.formAchievedOn = ''; this.formDescription = ''; this.formTargetId = '';
    this.formBaseline = null; this.formGoal = null; this.formActual = null; this.formUnit = ''; this.formDirection = '';
    this.formEvidenceSummary = ''; this.formError.set(null);
  }

  openCreateForTarget(a: AwaitingReview): void {
    this.openCreate();
    this.formTargetId = String(a.gps_target_id);
    this.formKind = 'result';
    this.formAchievedOn = new Date().toISOString().slice(0, 10);
  }

  openEdit(r: Achievement): void {
    this.popupRecord.set(r);
    this.popupIsCreate.set(false);
    this.popupOpen.set(true);
    this.startEdit();
  }

  startEdit(): void {
    const r = this.popupRecord();
    if (!r) return;
    this.formTitle = r.title; this.formKind = r.kind; this.formCategory = r.category || '';
    this.formAchievedOn = r.achieved_on || ''; this.formDescription = r.description || '';
    this.formTargetId = r.gps_target_id ? String(r.gps_target_id) : '';
    this.formBaseline = r.baseline_value; this.formGoal = r.target_value; this.formActual = r.actual_value;
    this.formUnit = r.unit || ''; this.formDirection = r.direction || '';
    this.formEvidenceSummary = r.evidence_summary || '';
    this.formError.set(null);
    this.popupMode.set('edit');
  }

  cancelEdit(): void {
    if (this.popupIsCreate()) { this.closePopup(); return; }
    this.popupMode.set('view');
  }

  closePopup(): void {
    this.popupOpen.set(false);
    this.popupRecord.set(null);
    this.popupIsCreate.set(false);
    this.popupMode.set('view');
    this.popupEvidence.set([]);
  }

  saveRecord(): void {
    if (!this.formTitle.trim()) { this.formError.set('Title is required'); return; }
    this.formLoading.set(true); this.formError.set(null);
    const payload: any = {
      company_id: this.companyId(),
      title: this.formTitle.trim(),
      kind: this.formKind,
      category: this.formCategory || null,
      achieved_on: this.formAchievedOn || null,
      description: this.formDescription || null,
      gps_target_id: this.formTargetId ? Number(this.formTargetId) : null,
      baseline_value: this.formKind === 'decision' ? null : this.formBaseline,
      target_value: this.formKind === 'decision' ? null : this.formGoal,
      actual_value: this.formKind === 'decision' ? null : this.formActual,
      unit: this.formKind === 'decision' ? null : (this.formUnit || null),
      direction: this.formKind === 'decision' ? null : (this.formDirection || null),
      evidence_summary: this.formEvidenceSummary || null,
    };
    const existing = this.popupRecord();
    const obs = this.popupIsCreate() || !existing ? this.api.create(payload) : this.api.update(existing.id, payload);
    obs.subscribe({
      next: (saved) => {
        this.formLoading.set(false);
        this.successMsg.set(this.popupIsCreate() ? 'Record created' : 'Draft updated');
        if (this.popupIsCreate()) { this.closePopup(); this.load(); }
        else { this.popupRecord.set(saved); this.popupMode.set('view'); this.loadEvidence(saved.id); }
      },
      error: e => { this.formLoading.set(false); this.formError.set(e.error?.error || e.message); }
    });
  }

  deleteRecord(r: Achievement): void {
    if (!this.canEdit(r)) { this.error.set('Verified records are immutable — revoke or supersede instead.'); return; }
    if (!confirm('Delete "' + r.title + '"? This cannot be undone.')) return;
    this.api.remove(r.id).subscribe({
      next: () => { this.successMsg.set('Draft deleted'); this.closePopup(); this.load(); },
      error: e => this.error.set(e.error?.error || e.message)
    });
  }

  // ---------- lifecycle (SA) ----------
  verifyRecord(r: Achievement): void {
    const msg = 'Verify "' + r.title + '"?\n\n' +
      (this.isMeasurable(r) || r.gps_target_id
        ? 'Verification captures the current authoritative financial snapshot at this moment. If the measurement is not eligible (incomplete, unknown, partial coverage or no accounts) verification will be refused and the record will stay unchanged.'
        : 'This is a qualitative record — no measurement snapshot is taken.');
    if (!confirm(msg)) return;
    this.api.verify(r.id).subscribe({
      next: saved => { this.successMsg.set('Verified'); this.refreshRecord(saved); },
      error: e => { this.error.set(e.error?.error || e.message); this.load(); }
    });
  }

  rejectRecord(r: Achievement): void {
    if (!confirm('Reject "' + r.title + '"? No measurement snapshot is taken.')) return;
    this.api.reject(r.id).subscribe({
      next: saved => { this.successMsg.set('Rejected'); this.refreshRecord(saved); },
      error: e => { this.error.set(e.error?.error || e.message); this.load(); }
    });
  }

  revokeRecord(r: Achievement): void {
    const reason = prompt('Reason for revoking "' + r.title + '" (required):');
    if (reason === null) return;
    if (!reason.trim()) { this.error.set('A reason is required to revoke an achievement.'); return; }
    this.api.revoke(r.id, reason.trim()).subscribe({
      next: saved => { this.successMsg.set('Revoked'); this.refreshRecord(saved); },
      error: e => { this.error.set(e.error?.error || e.message); this.load(); }
    });
  }

  supersedeRecord(r: Achievement): void {
    if (!confirm('Create a superseding draft for "' + r.title + '"? The original record and its evidence are preserved; the new draft is verified separately.')) return;
    this.api.supersede(r.id, {}).subscribe({
      next: saved => { this.successMsg.set('Superseding draft created'); this.closePopup(); this.load(); this.openEdit(saved); },
      error: e => this.error.set(e.error?.error || e.message)
    });
  }

  private refreshRecord(saved: Achievement): void {
    this.records.update(list => list.map(x => x.id === saved.id ? saved : x));
    if (this.popupRecord()?.id === saved.id) {
      this.popupRecord.set(saved);
      // Lifecycle actions (verify writes a metric snapshot) change the evidence list —
      // reload it so the open popup does not show a stale count.
      this.loadEvidence(saved.id);
    }
    this.api.counts(this.companyId()).subscribe({ next: c => this.counts.set(c), error: () => {} });
    this.api.awaitingReview(this.companyId()).subscribe({ next: a => this.awaiting.set(a), error: () => {} });
  }

  // ---------- evidence ----------
  loadEvidence(achievementId: number): void {
    this.api.evidence(achievementId).subscribe({ next: rows => this.popupEvidence.set(rows || []), error: () => this.popupEvidence.set([]) });
  }

  addEvidence(achievementId: number): void {
    if (this.evidenceType !== 'note' && !this.evidenceReference.trim()) {
      this.evidenceError.set('A reference is required for ' + this.evidenceLabel(this.evidenceType) + '.'); return;
    }
    this.evidenceError.set(null);
    this.api.addEvidence({
      achievement_id: achievementId,
      source_type: this.evidenceType,
      label: this.evidenceLabelInput.trim() || undefined,
      reference: this.evidenceReference.trim() || undefined,
    }).subscribe({
      next: () => {
        this.evidenceLabelInput = ''; this.evidenceReference = '';
        this.loadEvidence(achievementId);
        this.records.update(list => list.map(x => x.id === achievementId ? { ...x, evidence_count: (x.evidence_count || 0) + 1 } : x));
        this.successMsg.set('Evidence added');
      },
      error: e => this.evidenceError.set(e.error?.error || e.message)
    });
  }

  deleteEvidence(e: AchievementEvidence): void {
    if (!confirm('Delete this evidence?')) return;
    this.api.deleteEvidence(e.id).subscribe({
      next: () => { this.loadEvidence(e.achievement_id); this.successMsg.set('Evidence deleted'); },
      error: err => this.evidenceError.set(err.error?.error || err.message)
    });
  }
}
