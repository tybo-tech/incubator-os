export type CalendarCategory =
  | 'meeting'
  | 'deadline'
  | 'review'
  | 'check_in'
  | 'reminder'
  | 'milestone'
  | 'other';

export type CalendarStatus = 'scheduled' | 'completed' | 'cancelled';

export type CalendarLinkType =
  | 'target'
  | 'swot'
  | 'task'
  | 'financial'
  | 'result'
  | 'evidence';

export interface CalendarEvent {
  id: string;
  /** null = a system-wide event, visible in every company calendar and the global view. */
  company_id: number | null;
  company_name: string | null;
  title: string;
  description: string | null;
  category: CalendarCategory;
  /** Local calendar date, `YYYY-MM-DD`. */
  date: string;
  all_day: boolean;
  /** `HH:mm` in the browser timezone, ignored when `all_day` is true. */
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  assignee: string | null;
  link_type: CalendarLinkType | null;
  link_id: number | null;
  link_label: string | null;
  status: CalendarStatus;
  created_by: string | null;
  created_at: string;
  /** Inclusive end date for multi-day all-day events (`YYYY-MM-DD`). */
  end_date?: string | null;
  /** IANA zone for timed events; set by the backend. */
  timezone?: string | null;
  /** Optimistic-concurrency counter; sent back on update/delete. */
  version?: number;
}

export type CalendarEventInput = Omit<CalendarEvent, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

export interface CalendarCategoryMeta {
  key: CalendarCategory;
  label: string;
  icon: string;
}

export const CALENDAR_CATEGORIES: CalendarCategoryMeta[] = [
  { key: 'meeting', label: 'Meeting', icon: 'users' },
  { key: 'deadline', label: 'Deadline', icon: 'flag' },
  { key: 'review', label: 'Review', icon: 'document-text' },
  { key: 'check_in', label: 'Check-in', icon: 'check-circle' },
  { key: 'reminder', label: 'Reminder', icon: 'bell' },
  { key: 'milestone', label: 'Milestone', icon: 'calendar' },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
];

export const CALENDAR_LINK_TYPES: { key: CalendarLinkType; label: string }[] = [
  { key: 'target', label: 'Target' },
  { key: 'swot', label: 'SWOT' },
  { key: 'task', label: 'Task' },
  { key: 'financial', label: 'Financial' },
  { key: 'result', label: 'Result' },
  { key: 'evidence', label: 'Evidence' },
];

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Themed date formatting without pulling in a date library. */
export const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
