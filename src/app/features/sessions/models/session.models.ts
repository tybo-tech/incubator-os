/** Session domain models (Sprint 009). */

export type SessionStatus = 'PREPARING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type SessionType =
  | 'coaching'
  | 'progress_review'
  | 'financial_review'
  | 'assessment'
  | 'workshop'
  | 'other';

export type SessionNoteVisibility = 'shared' | 'incubator';

export type AttendanceState = 'invited' | 'attended' | 'absent' | 'apology';

export type SessionRelationship =
  | 'AGENDA'
  | 'DISCUSSED'
  | 'CREATED'
  | 'UPDATED'
  | 'REVIEWED'
  | 'EVIDENCE';

export type SessionLinkEntityType =
  | 'target'
  | 'swot'
  | 'task'
  | 'financial'
  | 'result'
  | 'evidence';

/** Compact schedule projection of the Session's linked calendar event. */
export interface SessionEventRef {
  id: number;
  companyId: number | null;
  title: string;
  category: string;
  status: string;
  allDay: boolean;
  timezone: string | null;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  startAt: string | null;
  endAt: string | null;
  version: number;
}

export interface SessionSummary {
  id: number;
  companyId: number;
  companyName: string | null;
  calendarEventId: number | null;
  event: SessionEventRef | null;
  sessionType: SessionType;
  subject: string;
  status: SessionStatus;
  facilitatorLabel: string | null;
  participantCount: number;
  agendaCount: number;
  decisionCount: number;
  linkCount: number;
  version: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionParticipant {
  id: number;
  participantType: 'internal' | 'external';
  userId: number | null;
  name: string;
  email: string | null;
  role: string | null;
  attendance: AttendanceState;
}

export interface SessionAgendaItem {
  id: number;
  sortOrder: number;
  topic: string;
  description: string | null;
  status: 'pending' | 'covered' | 'deferred';
  presenterUserId: number | null;
  presenterLabel: string | null;
}

export interface SessionNote {
  id: number;
  visibility: SessionNoteVisibility;
  content: string;
  authorUserId: number | null;
  authorLabel: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface SessionDecision {
  id: number;
  decisionText: string;
  decisionDate: string;
  rationale: string | null;
  recordedBy: number | null;
  recordedByLabel: string | null;
  version: number;
  createdAt: string;
}

export interface SessionEntityLink {
  id: number;
  entityType: string;
  entityId: number;
  relationship: SessionRelationship;
  label: string | null;
}

export interface SessionActivity {
  id: number;
  actorUserId: number | null;
  actorLabel: string | null;
  action: string;
  detail: string | null;
  payload: Record<string, unknown> | null;
  createdAt: string;
}

export interface SessionDetail extends SessionSummary {
  purpose: string | null;
  preparationSummary: string | null;
  closingSummary: string | null;
  cancellationReason: string | null;
  facilitatorUserId: number | null;
  startedAt: string | null;
  cancelledAt: string | null;
  cancelledByLabel: string | null;
  createdBy: number;
  createdByName: string | null;
  participants: SessionParticipant[];
  agenda: SessionAgendaItem[];
  notes: SessionNote[];
  decisions: SessionDecision[];
  links: SessionEntityLink[];
  activity: SessionActivity[];
}

/** Server-built, read-only preparation brief. */
export interface PreparationBrief {
  sessionId: number;
  companyId: number;
  generatedAt: string;
  previousSession: {
    id: number;
    subject: string;
    completedAt: string | null;
    closingSummary: string | null;
    decisions: { id: number; decisionText: string; decisionDate: string; rationale: string | null }[];
  } | null;
  openTasks: { total: number; overdue: number; items: BriefTask[] };
  activeTargets: { total: number; overdue: number; items: BriefTarget[] };
  currentSwotItems: { analysisId: number | null; summary?: string | null; total: number; items: BriefSwotItem[] };
  financialCoverage: {
    coveredPeriods: string[];
    coveredCount: number;
    missingPeriods: string[];
    missingCount: number;
  };
  achievementsAwaitingReview: { targetId: number; measurement: unknown }[];
  recentlyVerifiedAchievements: {
    id: number;
    targetId: number | null;
    kind: string;
    title: string;
    achievedOn: string | null;
    actualValue: number | null;
    unit: string | null;
    verifiedAt: string | null;
    evidenceCount: number;
  }[];
  agendaLinks: {
    linkId: number | null;
    entityType: string;
    entityId: number;
    relationship: string;
    label: string | null;
  }[];
}

export interface BriefTask {
  id: number;
  targetId: number;
  targetTitle: string;
  title: string;
  status: string;
  dueDate: string | null;
  ownerLabel: string | null;
  overdue: boolean;
}

export interface BriefTarget {
  id: number;
  title: string;
  category: string;
  status: string;
  priority: string | null;
  dueDate: string | null;
  progressMode: string;
  progress: number;
  overdue: boolean;
}

export interface BriefSwotItem {
  id: number;
  category: string;
  description: string;
  impact: string | null;
  priority: string | null;
  status: string;
}

export interface SessionInput {
  companyId: number;
  calendarEventId?: number | null;
  sessionType: SessionType;
  subject: string;
  purpose?: string | null;
  preparationSummary?: string | null;
  facilitatorLabel?: string | null;
  eventTitle?: string;
  eventLocation?: string | null;
  allDay?: boolean;
  timezone?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  version?: number;
}

export const SESSION_TYPES: { key: SessionType; label: string }[] = [
  { key: 'coaching', label: 'Coaching' },
  { key: 'progress_review', label: 'Progress review' },
  { key: 'financial_review', label: 'Financial review' },
  { key: 'assessment', label: 'Assessment' },
  { key: 'workshop', label: 'Workshop' },
  { key: 'other', label: 'Other' },
];

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  PREPARING: 'Preparing',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const ATTENDANCE_LABELS: Record<AttendanceState, string> = {
  invited: 'Invited',
  attended: 'Attended',
  absent: 'Absent',
  apology: 'Apology',
};

export const RELATIONSHIP_LABELS: Record<SessionRelationship, string> = {
  AGENDA: 'On the agenda',
  DISCUSSED: 'Discussed',
  CREATED: 'Created',
  UPDATED: 'Updated',
  REVIEWED: 'Reviewed',
  EVIDENCE: 'Evidence',
};

export const SESSION_LINK_LABELS: Record<SessionLinkEntityType, string> = {
  target: 'Target',
  swot: 'SWOT item',
  task: 'Task',
  financial: 'Financial measure',
  result: 'Result',
  evidence: 'Evidence',
};
