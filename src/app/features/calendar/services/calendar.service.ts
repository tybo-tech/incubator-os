import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, tap, throwError } from 'rxjs';
import { Constants } from '../../../../services/service';
import {
  CalendarCategory,
  CalendarEvent,
  CalendarEventInput,
  CalendarLinkType,
} from '../models/calendar.models';

/** Bounded window a caller must supply — the API rejects an unbounded range. */
export interface CalendarRange {
  start: string;
  end: string;
}

/** Canonical link types on the backend (frontend labels map to these). */
const LINK_TYPE_TO_API: Record<CalendarLinkType, string> = {
  target: 'gps_target',
  swot: 'swot_item',
  task: 'gps_target_task',
  financial: 'financial_indicator',
  result: 'achievement',
  evidence: 'achievement_evidence',
};

const API_TO_LINK_TYPE: Record<string, CalendarLinkType> = {
  gps_target: 'target',
  swot_item: 'swot',
  gps_target_task: 'task',
  financial_indicator: 'financial',
  achievement: 'result',
  achievement_evidence: 'evidence',
};

/** Shape returned by the PHP capability (camelCase). */
interface ApiCalendarEvent {
  id: number;
  companyId: number | null;
  companyName: string | null;
  title: string;
  description: string | null;
  category: string;
  status: string;
  allDay: boolean;
  timezone: string | null;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  startAt: string | null;
  endAt: string | null;
  assigneeLabel: string | null;
  assigneeUserId: number | null;
  createdBy: number;
  createdByName: string | null;
  version: number;
  links: { entityType: string; entityId: number; label: string | null }[];
  createdAt: string;
  updatedAt: string;
  sessionId?: number | null;
}

interface ApiCommandResult {
  success: boolean;
  message: string;
  data?: ApiCalendarEvent;
  warnings?: string[];
}

/**
 * Calendar data layer.
 *
 * Talks to the PHP capability (`api/calendar/...`) over the app's API base.
 * Every read is bounded by an explicit date range — the backend rejects
 * unbounded requests. The public surface (`list`/`create`/`update`/`remove`)
 * is shape-compatible with the previous local mock so the page component did
 * not need rewriting.
 *
 * DATE/TIME MAPPING:
 *  - all-day events round-trip as `YYYY-MM-DD` (never UTC-shifted).
 *  - timed events carry ISO-8601 UTC `startAt`/`endAt` + an IANA `timezone`;
 *    they are converted to/from the local wall-clock `HH:mm` the UI edits.
 */
@Injectable({ providedIn: 'root' })
export class CalendarService {
  private http = inject(HttpClient);
  private readonly base = `${Constants.ApiBase}api/calendar`;

  /**
   * Events for a bounded range.
   *  - `companyId` set  -> that company's events + system-wide events.
   *  - `companyId` null -> every company the actor may access + system-wide.
   */
  list(range: CalendarRange, companyId: number | null): Observable<CalendarEvent[]> {
    let params = new HttpParams().set('start', range.start).set('end', range.end);
    if (companyId && companyId > 0) params = params.set('company_id', String(companyId));

    return this.http
      .get<ApiCalendarEvent[]>(`${this.base}/queries/list.php`, { params, withCredentials: true })
      .pipe(map(list => (list ?? []).map(e => this.fromApi(e))));
  }

  create(input: CalendarEventInput): Observable<CalendarEvent> {
    return this.http
      .post<ApiCommandResult>(`${this.base}/commands/create.php`, this.toApi(input), { withCredentials: true })
      .pipe(
        map(res => res?.data ? this.fromApi(res.data) : this.fromApi(input as never)),
        catchError(err => throwError(() => err)),
      );
  }

  update(id: string, patch: Partial<CalendarEventInput>): Observable<CalendarEvent> {
    return this.http
      .post<ApiCommandResult>(`${this.base}/commands/update.php?id=${encodeURIComponent(id)}`, this.toApi(patch), { withCredentials: true })
      .pipe(map(res => this.fromApi(res.data as ApiCalendarEvent)));
  }

  remove(id: string): Observable<void> {
    return this.http
      .post<ApiCommandResult>(`${this.base}/commands/delete.php?id=${encodeURIComponent(id)}`, {}, { withCredentials: true })
      .pipe(map(() => void 0));
  }

  /**
   * Extracts a safe, human-readable message from an API error response.
   * Reads the body shape rather than relying on `instanceof HttpErrorResponse`,
   * so it also works with plain error objects surfaced by interceptors/tests.
   */
  errorMessage(err: unknown): string {
    const e = err as Partial<HttpErrorResponse> | null;
    if (!e || typeof e !== 'object') return 'Something went wrong.';

    const body = (e.error ?? null) as { error?: unknown; errors?: Record<string, string> } | null;
    if (body && typeof body === 'object') {
      if (body.errors && typeof body.errors === 'object') {
        const first = Object.values(body.errors)[0];
        if (typeof first === 'string' && first) return first;
      }
      if (typeof body.error === 'string' && body.error) return body.error;
    }

    switch (e.status) {
      case 401: return 'Your session has expired. Please log in again.';
      case 403: return 'You do not have access to this company.';
      case 404: return 'That appointment no longer exists.';
      case 409: return 'This appointment was changed by someone else. Reload and try again.';
      case 422: return 'Please check the appointment details and try again.';
    }
    return e.status ? 'Could not complete the request.' : 'Something went wrong.';
  }

  // ---------- mapping ----------

  private fromApi(e: ApiCalendarEvent): CalendarEvent {
    const link = e.links && e.links.length ? e.links[0] : null;
    return {
      id: String(e.id),
      company_id: e.companyId,
      company_name: e.companyName,
      title: e.title,
      description: e.description,
      category: e.category as CalendarCategory,
      date: e.allDay ? (e.startDate ?? '') : this.utcToLocalDate(e.startAt),
      all_day: e.allDay,
      start_time: e.allDay ? null : this.utcToLocalTime(e.startAt),
      end_time: e.allDay ? null : this.utcToLocalTime(e.endAt),
      location: e.location,
      assignee: e.assigneeLabel,
      link_type: link ? (API_TO_LINK_TYPE[link.entityType] ?? null) : null,
      link_id: link ? link.entityId : null,
      link_label: link ? link.label : null,
      status: e.status as CalendarEvent['status'],
      created_by: e.createdByName,
      created_at: e.createdAt,
      // Backend-only fields, preserved for optimistic concurrency.
      version: e.version,
      timezone: e.timezone,
      end_date: e.endDate,
      session_id: e.sessionId ?? null,
    };
  }

  private toApi(input: Partial<CalendarEventInput>): Record<string, unknown> {
    const tz = input.timezone || this.localTimezone();
    const allDay = !!input.all_day;

    const body: Record<string, unknown> = {
      companyId: input.company_id ?? null,
      title: input.title ?? '',
      description: input.description ?? null,
      category: input.category ?? 'other',
      status: input.status ?? 'scheduled',
      allDay,
      timezone: allDay ? null : tz,
      location: input.location ?? null,
      assigneeLabel: input.assignee ?? null,
    };

    if (allDay) {
      body['startDate'] = input.date ?? null;
      body['endDate'] = input.end_date ?? input.date ?? null;
    } else {
      body['startAt'] = this.localToUtcIso(input.date ?? '', input.start_time ?? null);
      body['endAt'] = this.localToUtcIso(input.date ?? '', input.end_time ?? input.start_time ?? null);
    }

    if (input.version != null) body['version'] = input.version;

    if (input.link_type) {
      body['links'] = [{
        entityType: LINK_TYPE_TO_API[input.link_type] ?? input.link_type,
        entityId: input.link_id ?? 0,
        label: input.link_label ?? null,
      }];
    }

    return body;
  }

  // ---------- local <-> UTC helpers ----------

  private localTimezone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Johannesburg';
    } catch {
      return 'Africa/Johannesburg';
    }
  }

  /**
   * `YYYY-MM-DD` + `HH:mm` in the browser's timezone -> ISO-8601 UTC (`...Z`).
   * Uses the host's real offset so DST is handled by the platform.
   */
  private localToUtcIso(dateIso: string, hhmm: string | null): string | null {
    if (!dateIso) return null;
    const [y, m, d] = dateIso.split('-').map(Number);
    const [hh, mm] = (hhmm ?? '00:00').split(':').map(Number);
    const local = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
    return this.toUtcIso(local);
  }

  /** UTC ISO string in the browser's timezone -> local `YYYY-MM-DD`. */
  private utcToLocalDate(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso.slice(0, 10);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /** UTC ISO string in the browser's timezone -> local `HH:mm`. */
  private utcToLocalTime(iso: string | null): string | null {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  private toUtcIso(d: Date): string {
    return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
  }
}
