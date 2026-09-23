import {
  Component, ChangeDetectionStrategy, input, output, signal, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon';
import {
  AttendanceState, PreparationBrief, SessionDetail, SessionEntityLink,
  SessionInput, SessionLinkEntityType, SessionRelationship,
  ATTENDANCE_LABELS, RELATIONSHIP_LABELS, SESSION_LINK_LABELS,
  SESSION_STATUS_LABELS, SESSION_TYPES,
} from '../models/session.models';

type Tab = 'prepare' | 'run' | 'close' | 'history';

/**
 * The Session workspace: Prepare → Run → Close → History.
 *
 * All mutations are emitted to the page, which calls the API and refreshes. This
 * component owns only presentation and local form state.
 */
@Component({
  selector: 'app-session-workspace',
  standalone: true,
  imports: [CommonModule, FormsModule, AppIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sw-modal" role="dialog" aria-modal="true">
      <div class="sw-modal-card wide">
        <div class="sw-modal-head">
          <div>
            <h3>{{ session().subject }}</h3>
            <div class="sw-head-sub">
              <span class="sw-pill" [class]="'sess-st-' + session().status">{{ statusLabel() }}</span>
              {{ typeLabel() }}
              @if (scheduleLabel(); as when) { · {{ when }} }
            </div>
          </div>
          <button type="button" class="sw-icon-btn" aria-label="Close" title="Close" (click)="close.emit()">
            <app-icon name="x-mark"></app-icon>
          </button>
        </div>

        <div class="sw-modal-body">
          @if (session().status === 'CANCELLED' && session().cancellationReason) {
            <div class="sw-alert error">Cancelled: {{ session().cancellationReason }}</div>
          }

          <div class="sw-seg" role="tablist" aria-label="Workspace" style="margin-bottom:12px;">
            <button type="button" role="tab" [class.active]="tab() === 'prepare'" (click)="tab.set('prepare')">
              <app-icon name="document-text"></app-icon> Prepare
            </button>
            <button type="button" role="tab" [class.active]="tab() === 'run'" (click)="tab.set('run')">
              <app-icon name="list-bullet"></app-icon> Run
            </button>
            <button type="button" role="tab" [class.active]="tab() === 'close'" (click)="tab.set('close')">
              <app-icon name="check-circle"></app-icon> Close
            </button>
            <button type="button" role="tab" [class.active]="tab() === 'history'" (click)="tab.set('history')">
              <app-icon name="clock"></app-icon> History
            </button>
          </div>

          @if (frozen()) {
            <div class="sw-alert success" style="background:var(--ios-blue-soft); border-color:#c7d7fe; color:var(--ios-blue);">
              This Session is {{ statusLabel().toLowerCase() }} and read-only.
            </div>
          }

          @switch (tab()) {
            @case ('prepare') {
              <section class="sess-block">
                <div class="sw-section-title">Purpose</div>
                @if (editable()) {
                  <textarea class="sw-textarea" [(ngModel)]="purpose" placeholder="Why are we meeting?"></textarea>
                  <label class="sw-field" style="margin-top:8px;">
                    <span>Preparation summary — what should be reviewed</span>
                    <textarea class="sw-textarea" [(ngModel)]="preparationSummary" placeholder="What to prepare for this session"></textarea>
                  </label>
                  <div style="margin-top:8px;">
                    <button class="sw-btn primary sm" type="button" [disabled]="saving()" (click)="savePreparation()">
                      <app-icon name="check"></app-icon> Save preparation
                    </button>
                  </div>
                } @else {
                  <div class="sw-detail-text">{{ session().purpose || 'No purpose recorded.' }}</div>
                  @if (session().preparationSummary) {
                    <div class="sw-snapshot" style="margin-top:8px;">{{ session().preparationSummary }}</div>
                  }
                }
              </section>

              <section class="sess-block">
                <div class="sw-section-title">
                  Participants <span class="sw-group-count">{{ session().participants.length }}</span>
                </div>
                @for (p of session().participants; track p.id) {
                  <div class="sw-await-row">
                    <span class="sw-await-title">{{ p.name }}
                      <span class="sw-badge">{{ p.participantType }}</span>
                      @if (p.email) { <span class="sw-await-meta">{{ p.email }}</span> }
                    </span>
                    <span class="sw-pill">{{ attendanceLabel(p.attendance) }}</span>
                  </div>
                } @empty {
                  <div class="sw-footnote">No participants yet.</div>
                }
                @if (editable()) {
                  <div class="sw-inline-row" style="margin-top:8px;">
                    <label class="sw-field grow"><span>Name</span><input class="sw-input" [(ngModel)]="newParticipantName" placeholder="Attendee name"></label>
                    <label class="sw-field grow"><span>Email (optional)</span><input class="sw-input" [(ngModel)]="newParticipantEmail" placeholder="name@example.com"></label>
                    <label class="sw-field"><span>Role</span><input class="sw-input" [(ngModel)]="newParticipantRole" placeholder="Optional"></label>
                    <button class="sw-btn sm" type="button" (click)="addParticipant()"><app-icon name="plus"></app-icon> Add</button>
                  </div>
                }
              </section>

              <section class="sess-block">
                <div class="sw-section-title">Preparation brief <span class="sw-group-count">read-only</span></div>
                @if (brief(); as b) {
                  @if (b.previousSession; as prev) {
                    <div class="sw-snapshot">
                      <strong>Previous session:</strong> {{ prev.subject }}
                      @if (prev.closingSummary) { <div class="sw-mini">{{ prev.closingSummary }}</div> }
                      @if (prev.decisions.length) {
                        <div class="sw-mini">{{ prev.decisions.length }} decision(s) recorded</div>
                      }
                    </div>
                  }
                  <div class="sw-kv" style="margin-top:10px;">
                    <div><span>Open tasks</span><strong>{{ b.openTasks.total }} ({{ b.openTasks.overdue }} overdue)</strong></div>
                    <div><span>Active targets</span><strong>{{ b.activeTargets.total }} ({{ b.activeTargets.overdue }} overdue)</strong></div>
                    <div><span>Current SWOT items</span><strong>{{ b.currentSwotItems.total }}</strong></div>
                    <div><span>Financial coverage</span><strong>{{ b.financialCoverage.coveredCount }}/12 months</strong></div>
                    <div><span>Awaiting review</span><strong>{{ b.achievementsAwaitingReview.length }}</strong></div>
                    <div><span>Recently verified</span><strong>{{ b.recentlyVerifiedAchievements.length }}</strong></div>
                  </div>
                  @if (b.activeTargets.items.length) {
                    <div class="sw-section-title" style="margin-top:12px;">Targets to review</div>
                    @for (t of b.activeTargets.items; track t.id) {
                      <div class="sw-await-row">
                        <span class="sw-await-title">{{ t.title }}
                          <span class="sw-await-meta">{{ t.category }} · {{ t.status }}@if (t.overdue) { · overdue }</span>
                        </span>
                      </div>
                    }
                  }
                  @if (b.financialCoverage.missingCount) {
                    <div class="sw-footnote">Missing financial periods: {{ b.financialCoverage.missingPeriods.join(', ') }}</div>
                  }
                } @else {
                  <div class="sw-footnote">Brief unavailable.</div>
                }
              </section>

              <section class="sess-block">
                <div class="sw-section-title">
                  Agenda <span class="sw-group-count">{{ session().agenda.length }}</span>
                </div>
                @for (a of session().agenda; track a.id; let i = $index) {
                  <div class="sw-await-row">
                    <span class="sess-order">{{ i + 1 }}</span>
                    <span class="sw-await-title">{{ a.topic }}
                      <span class="sw-await-meta">{{ a.status }}@if (a.presenterLabel) { · {{ a.presenterLabel }} }</span>
                    </span>
                    @if (editable()) {
                      <div class="sw-detail-actions">
                        <button class="sw-icon-btn" title="Move up" [disabled]="i === 0" (click)="move(i, -1)"><app-icon name="arrow-up"></app-icon></button>
                        <button class="sw-icon-btn" title="Move down" [disabled]="i === session().agenda.length - 1" (click)="move(i, 1)"><app-icon name="arrow-down"></app-icon></button>
                        <button class="sw-icon-btn danger" title="Remove" (click)="removeAgenda(a.id)"><app-icon name="trash"></app-icon></button>
                      </div>
                    }
                  </div>
                } @empty {
                  <div class="sw-footnote">No agenda yet.</div>
                }
                @if (editable()) {
                  <div class="sw-inline-row" style="margin-top:8px;">
                    <label class="sw-field grow"><span>New agenda topic</span><input class="sw-input" [(ngModel)]="newAgendaTopic" placeholder="What will be covered?"></label>
                    <button class="sw-btn sm" type="button" (click)="addAgenda()"><app-icon name="plus"></app-icon> Add</button>
                  </div>
                }
              </section>

              <section class="sess-block">
                <div class="sw-section-title">
                  Linked records <span class="sw-group-count">{{ session().links.length }}</span>
                </div>
                @for (l of session().links; track l.id) {
                  <div class="sw-await-row">
                    <span class="sw-await-title">{{ linkLabel(l) }}
                      <span class="sw-await-meta">{{ relationshipLabel(l.relationship) }}</span>
                    </span>
                    @if (editable()) {
                      <button class="sw-icon-btn danger" title="Remove link" (click)="removeLink(l.id)"><app-icon name="trash"></app-icon></button>
                    }
                  </div>
                } @empty {
                  <div class="sw-footnote">Nothing linked yet.</div>
                }
                @if (editable()) {
                  <div class="sw-inline-row" style="margin-top:8px;">
                    <label class="sw-field"><span>Type</span>
                      <select class="sw-select" [(ngModel)]="newLinkType">
                        @for (t of linkTypes; track t) { <option [value]="t">{{ linkTypeLabel(t) }}</option> }
                      </select>
                    </label>
                    <label class="sw-field"><span>Record id</span><input class="sw-input" type="number" [(ngModel)]="newLinkId" placeholder="e.g. 118"></label>
                    <label class="sw-field"><span>Relationship</span>
                      <select class="sw-select" [(ngModel)]="newLinkRelationship">
                        @for (r of relationships; track r) { <option [value]="r">{{ relationshipLabel(r) }}</option> }
                      </select>
                    </label>
                    <button class="sw-btn sm" type="button" [disabled]="!newLinkId" (click)="addLink()"><app-icon name="link"></app-icon> Link</button>
                  </div>
                  <div class="sw-footnote">
                    Records are created through their own screens (Targets, Results, Financial Indicators) — linking only references them.
                  </div>
                }
              </section>
            }

            @case ('run') {
              <section class="sess-block">
                <div class="sw-section-title">Agenda navigation</div>
                @for (a of session().agenda; track a.id) {
                  <div class="sw-await-row">
                    <span class="sw-await-title">{{ a.topic }}</span>
                    @if (editable()) {
                      <button class="sw-btn sm" type="button" (click)="setAgendaStatus(a.id, a.status === 'covered' ? 'pending' : 'covered')">
                        <app-icon name="check"></app-icon> {{ a.status === 'covered' ? 'Covered' : 'Mark covered' }}
                      </button>
                    } @else {
                      <span class="sw-pill">{{ a.status }}</span>
                    }
                  </div>
                } @empty {
                  <div class="sw-footnote">No agenda.</div>
                }
              </section>

              <section class="sess-block">
                <div class="sw-section-title">
                  Shared notes <span class="sw-group-count">visible to the company</span>
                </div>
                @for (n of sharedNotes(); track n.id) {
                  <div class="sw-note-row">
                    <div class="sw-note-top"><span class="sw-note-strong">{{ n.authorLabel || 'Someone' }}</span><span class="sw-note-when">{{ n.createdAt }}</span></div>
                    <div>{{ n.content }}</div>
                  </div>
                } @empty {
                  <div class="sw-footnote">No shared notes.</div>
                }
                @if (editable()) {
                  <div class="sw-inline-row" style="margin-top:8px;">
                    <label class="sw-field grow"><span>Add shared note</span><input class="sw-input" [(ngModel)]="newSharedNote" placeholder="Discussed…"></label>
                    <button class="sw-btn sm" type="button" (click)="addNote('shared')"><app-icon name="plus"></app-icon> Add</button>
                  </div>
                }
              </section>

              @if (isAdmin()) {
                <section class="sess-block">
                  <div class="sw-section-title">
                    Incubator-team notes <span class="sw-badge">internal only</span>
                  </div>
                  @for (n of incubatorNotes(); track n.id) {
                    <div class="sw-note-row" style="background:var(--ios-purple-soft); border-color:#ddd6fe;">
                      <div class="sw-note-top"><span class="sw-note-strong">{{ n.authorLabel || 'Incubator' }}</span><span class="sw-note-when">{{ n.createdAt }}</span></div>
                      <div>{{ n.content }}</div>
                    </div>
                  } @empty {
                    <div class="sw-footnote">No internal notes.</div>
                  }
                  @if (editable()) {
                    <div class="sw-inline-row" style="margin-top:8px;">
                      <label class="sw-field grow"><span>Add internal note</span><input class="sw-input" [(ngModel)]="newIncubatorNote" placeholder="Not visible to the company"></label>
                      <button class="sw-btn sm" type="button" (click)="addNote('incubator')"><app-icon name="plus"></app-icon> Add</button>
                    </div>
                  }
                </section>
              }

              <section class="sess-block">
                <div class="sw-section-title">
                  Decisions <span class="sw-group-count">{{ session().decisions.length }}</span>
                </div>
                @for (d of session().decisions; track d.id) {
                  <div class="sw-note-row">
                    <div class="sw-note-top"><span class="sw-note-strong">{{ d.decisionDate }}</span><span class="sw-note-when">{{ d.recordedByLabel || '' }}</span></div>
                    <div>{{ d.decisionText }}</div>
                    @if (d.rationale) { <div class="sw-mini">{{ d.rationale }}</div> }
                  </div>
                } @empty {
                  <div class="sw-footnote">No decisions recorded.</div>
                }
                @if (editable()) {
                  <div class="sw-inline-row" style="margin-top:8px;">
                    <label class="sw-field grow"><span>Decision</span><input class="sw-input" [(ngModel)]="newDecisionText" placeholder="What was decided?"></label>
                    <label class="sw-field"><span>Date</span><input class="sw-input" type="date" [(ngModel)]="newDecisionDate"></label>
                    <button class="sw-btn sm" type="button" (click)="addDecision()"><app-icon name="plus"></app-icon> Record</button>
                  </div>
                }
              </section>
            }

            @case ('close') {
              <section class="sess-block">
                <div class="sw-section-title">Attendance</div>
                @for (p of session().participants; track p.id) {
                  <div class="sw-await-row">
                    <span class="sw-await-title">{{ p.name }}</span>
                    @if (editable()) {
                      <select class="sw-select" style="width:auto;" [ngModel]="p.attendance" (ngModelChange)="setAttendance(p.id, $event)">
                        @for (a of attendanceStates; track a) { <option [value]="a">{{ attendanceLabel(a) }}</option> }
                      </select>
                    } @else {
                      <span class="sw-pill">{{ attendanceLabel(p.attendance) }}</span>
                    }
                  </div>
                } @empty {
                  <div class="sw-footnote">No participants.</div>
                }
              </section>

              <section class="sess-block">
                <div class="sw-section-title">What came out of this Session</div>
                <div class="sw-kv">
                  <div><span>Decisions</span><strong>{{ session().decisions.length }}</strong></div>
                  <div><span>Linked records</span><strong>{{ session().links.length }}</strong></div>
                  <div><span>Agenda covered</span><strong>{{ coveredCount() }}/{{ session().agenda.length }}</strong></div>
                  <div><span>Participants</span><strong>{{ session().participants.length }}</strong></div>
                </div>
                @if (session().links.length) {
                  <div class="sw-section-title" style="margin-top:12px;">Records created / reviewed</div>
                  @for (l of session().links; track l.id) {
                    <div class="sw-await-row">
                      <span class="sw-await-title">{{ linkLabel(l) }}<span class="sw-await-meta">{{ relationshipLabel(l.relationship) }}</span></span>
                    </div>
                  }
                }
              </section>

              <section class="sess-block">
                <div class="sw-section-title">Closing summary</div>
                @if (editable()) {
                  <textarea class="sw-textarea" [(ngModel)]="closingSummary" placeholder="Summarise the outcome"></textarea>
                } @else {
                  <div class="sw-detail-text">{{ session().closingSummary || 'No closing summary.' }}</div>
                }
              </section>

              @if (editable() && session().status === 'IN_PROGRESS') {
                <button class="sw-btn primary" type="button" [disabled]="saving()" (click)="complete.emit(closingSummary)">
                  <app-icon name="check-circle"></app-icon> Complete Session
                </button>
              }
            }

            @case ('history') {
              <section class="sess-block">
                <div class="sw-section-title">Activity timeline</div>
                @for (a of session().activity; track a.id) {
                  <div class="sw-note-row">
                    <div class="sw-note-top">
                      <span class="sw-note-strong">{{ a.action }}</span>
                      <span class="sw-note-when">{{ a.createdAt }}</span>
                    </div>
                    @if (a.detail) { <div>{{ a.detail }}</div> }
                    <div class="sw-mini">{{ a.actorLabel || 'System' }}</div>
                  </div>
                } @empty {
                  <div class="sw-footnote">No activity recorded.</div>
                }
              </section>

              <section class="sess-block">
                <div class="sw-section-title">Backlinks to business records</div>
                @for (l of session().links; track l.id) {
                  <div class="sw-await-row">
                    <span class="sw-await-title">{{ linkLabel(l) }}<span class="sw-await-meta">{{ l.entityType }} #{{ l.entityId }} · {{ relationshipLabel(l.relationship) }}</span></span>
                  </div>
                } @empty {
                  <div class="sw-footnote">Nothing linked.</div>
                }
              </section>
            }
          }
        </div>

        <div class="sw-modal-foot">
          <div style="margin-right:auto; display:flex; gap:8px;">
            @if (session().status === 'PREPARING') {
              <button class="sw-btn primary" type="button" [disabled]="saving()" (click)="start.emit()">
                <app-icon name="arrow-right"></app-icon> Start Session
              </button>
            }
            @if (editable()) {
              <button class="sw-btn danger" type="button" [disabled]="saving()" (click)="askCancel()">
                <app-icon name="x-mark"></app-icon> Cancel Session
              </button>
            }
          </div>
          <button type="button" class="sw-btn" (click)="close.emit()">Close</button>
        </div>
      </div>
    </div>

    @if (cancelPrompt()) {
      <div class="sw-modal" role="dialog" aria-modal="true" style="z-index:70;">
        <div class="sw-modal-card">
          <div class="sw-modal-head"><h3>Cancel Session</h3></div>
          <div class="sw-modal-body">
            <div class="sw-footnote">A reason is required. Cancelling also cancels the linked calendar appointment.</div>
            <textarea class="sw-textarea" style="margin-top:8px;" [(ngModel)]="cancelReason" placeholder="Why is this Session being cancelled?"></textarea>
          </div>
          <div class="sw-modal-foot">
            <button class="sw-btn" type="button" (click)="cancelPrompt.set(false)">Back</button>
            <button class="sw-btn danger" type="button" [disabled]="!cancelReason.trim()" (click)="confirmCancel()">Cancel Session</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .sess-block { margin-bottom: 16px; }
    .sess-order { display:inline-flex; align-items:center; justify-content:center; width:20px; height:20px; border-radius:50%; background:#eef2f8; color:var(--ios-copy); font-size:10px; font-weight:700; flex:0 0 auto; }
    .sw-badge { display:inline-flex; align-items:center; border-radius:999px; padding:2px 8px; font-size:10px; font-weight:700; background:var(--ios-purple-soft); color:var(--ios-purple); }
  `],
})
export class SessionWorkspaceComponent {
  readonly session = input.required<SessionDetail>();
  readonly brief = input<PreparationBrief | null>(null);
  readonly isAdmin = input<boolean>(false);
  readonly saving = input<boolean>(false);

  readonly close = output<void>();
  readonly refresh = output<void>();
  readonly start = output<void>();
  readonly complete = output<string>();
  readonly cancel = output<string>();
  readonly agenda = output<{ action: 'add' | 'update' | 'reorder' | 'delete'; payload: Record<string, unknown> }>();
  readonly note = output<{ action: 'add' | 'update' | 'delete'; payload: Record<string, unknown> }>();
  readonly decision = output<{ action: 'record' | 'update' | 'delete'; payload: Record<string, unknown> }>();
  readonly link = output<{ action: 'add' | 'remove'; payload: Record<string, unknown> }>();
  readonly participant = output<{ action: 'add' | 'update' | 'remove' | 'attendance'; payload: Record<string, unknown> }>();
  readonly updatePreparation = output<SessionInput>();

  readonly tab = signal<Tab>('prepare');
  readonly cancelPrompt = signal(false);

  readonly linkTypes: SessionLinkEntityType[] = ['target', 'swot', 'task', 'financial', 'result', 'evidence'];
  readonly relationships: SessionRelationship[] = ['AGENDA', 'DISCUSSED', 'CREATED', 'UPDATED', 'REVIEWED', 'EVIDENCE'];
  readonly attendanceStates: AttendanceState[] = ['invited', 'attended', 'absent', 'apology'];

  // Local form state
  purpose = '';
  preparationSummary = '';
  closingSummary = '';
  cancelReason = '';
  newAgendaTopic = '';
  newParticipantName = '';
  newParticipantEmail = '';
  newParticipantRole = '';
  newSharedNote = '';
  newIncubatorNote = '';
  newDecisionText = '';
  newDecisionDate = new Date().toISOString().slice(0, 10);
  newLinkType: SessionLinkEntityType = 'target';
  newLinkId: number | null = null;
  newLinkRelationship: SessionRelationship = 'DISCUSSED';

  private hydratedId = -1;

  constructor() {
    // Hydrate local editable fields whenever a different Session is opened.
    // (Kept out of ngOnChanges because the whole object is replaced on refresh.)
    // eslint-disable-next-line no-restricted-syntax
    queueMicrotask(() => {
      const s = this.session();
      if (s && this.hydratedId !== s.id) {
        this.hydratedId = s.id;
        this.purpose = s.purpose ?? '';
        this.preparationSummary = s.preparationSummary ?? '';
        this.closingSummary = s.closingSummary ?? '';
      }
    });
  }

  readonly frozen = computed(() =>
    this.session().status === 'COMPLETED' || this.session().status === 'CANCELLED');
  readonly editable = computed(() => !this.frozen());
  readonly sharedNotes = computed(() => this.session().notes.filter(n => n.visibility === 'shared'));
  readonly incubatorNotes = computed(() => this.session().notes.filter(n => n.visibility === 'incubator'));
  readonly coveredCount = computed(() => this.session().agenda.filter(a => a.status === 'covered').length);

  statusLabel(): string { return SESSION_STATUS_LABELS[this.session().status] ?? this.session().status; }
  typeLabel(): string { return SESSION_TYPES.find(t => t.key === this.session().sessionType)?.label ?? this.session().sessionType; }
  relationshipLabel(r: SessionRelationship | string): string { return RELATIONSHIP_LABELS[r as SessionRelationship] ?? r; }
  linkTypeLabel(t: SessionLinkEntityType): string { return SESSION_LINK_LABELS[t] ?? t; }
  attendanceLabel(a: AttendanceState | string): string { return ATTENDANCE_LABELS[a as AttendanceState] ?? a; }
  linkLabel(l: SessionEntityLink): string { return l.label ?? `${l.entityType} #${l.entityId}`; }

  scheduleLabel(): string | null {
    const e = this.session().event;
    if (!e) return null;
    if (e.allDay) return e.startDate ?? null;
    if (!e.startAt) return null;
    const d = new Date(e.startAt);
    if (isNaN(d.getTime())) return e.startAt.slice(0, 10);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  // ---------- actions ----------

  savePreparation(): void {
    this.updatePreparation.emit({
      companyId: this.session().companyId,
      sessionType: this.session().sessionType,
      subject: this.session().subject,
      purpose: this.purpose || null,
      preparationSummary: this.preparationSummary || null,
      facilitatorLabel: this.session().facilitatorLabel,
    });
  }

  addAgenda(): void {
    const topic = this.newAgendaTopic.trim();
    if (!topic) return;
    this.agenda.emit({ action: 'add', payload: { topic } });
    this.newAgendaTopic = '';
  }

  setAgendaStatus(id: number, status: string): void {
    const item = this.session().agenda.find(a => a.id === id);
    if (!item) return;
    this.agenda.emit({ action: 'update', payload: { id, topic: item.topic, description: item.description, status } });
  }

  removeAgenda(id: number): void {
    this.agenda.emit({ action: 'delete', payload: { id } });
  }

  move(index: number, delta: number): void {
    const items = [...this.session().agenda];
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const tmp = items[index];
    items[index] = items[target];
    items[target] = tmp;
    this.agenda.emit({ action: 'reorder', payload: { orderedIds: items.map(a => a.id) } });
  }

  addNote(visibility: 'shared' | 'incubator'): void {
    const content = visibility === 'shared' ? this.newSharedNote.trim() : this.newIncubatorNote.trim();
    if (!content) return;
    this.note.emit({ action: 'add', payload: { content, visibility } });
    if (visibility === 'shared') this.newSharedNote = '';
    else this.newIncubatorNote = '';
  }

  addDecision(): void {
    const text = this.newDecisionText.trim();
    if (!text || !this.newDecisionDate) return;
    this.decision.emit({ action: 'record', payload: { decisionText: text, decisionDate: this.newDecisionDate } });
    this.newDecisionText = '';
  }

  addLink(): void {
    if (!this.newLinkId || this.newLinkId <= 0) return;
    this.link.emit({
      action: 'add',
      payload: {
        entityType: this.todoLinkType(),
        entityId: this.newLinkId,
        relationship: this.newLinkRelationship,
      },
    });
    this.newLinkId = null;
  }

  removeLink(id: number): void {
    this.link.emit({ action: 'remove', payload: { id } });
  }

  addParticipant(): void {
    const name = this.newParticipantName.trim();
    if (!name) return;
    this.participant.emit({
      action: 'add',
      payload: {
        participantType: 'external',
        name,
        email: this.newParticipantEmail.trim() || null,
        role: this.newParticipantRole.trim() || null,
      },
    });
    this.newParticipantName = '';
    this.newParticipantEmail = '';
    this.newParticipantRole = '';
  }

  setAttendance(id: number, attendance: string): void {
    this.participant.emit({ action: 'attendance', payload: { id, attendance } });
  }

  askCancel(): void {
    this.cancelReason = '';
    this.cancelPrompt.set(true);
  }

  confirmCancel(): void {
    const reason = this.cancelReason.trim();
    if (!reason) return;
    this.cancelPrompt.set(false);
    this.cancel.emit(reason);
  }

  /**
   * The API expects canonical entity names. `SessionService.toApiLinkType` is used
   * by the page, but the workspace emits the frontend label; the page's service
   * maps it. To keep that mapping in one place the label is emitted as-is.
   */
  private todoLinkType(): string {
    return this.newLinkType;
  }
}
