import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Constants } from '../../../../services/service';
import {
  PreparationBrief,
  SessionDetail,
  SessionEntityLink,
  SessionInput,
  SessionLinkEntityType,
  SessionRelationship,
  SessionSummary,
  SessionEventRef,
} from '../models/session.models';

interface ApiCommandResult {
  success: boolean;
  message: string;
  data?: SessionDetail;
  warnings?: string[];
}

/** Company meeting event eligible to become a Session. */
export interface EligibleEvent {
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
}

/** Canonical link types on the backend (frontend labels map to these). */
const LINK_TYPE_TO_API: Record<SessionLinkEntityType, string> = {
  target: 'gps_target',
  swot: 'swot_item',
  task: 'gps_target_task',
  financial: 'financial_indicator',
  result: 'achievement',
  evidence: 'achievement_evidence',
};

/**
 * Sessions data layer.
 *
 * Creation is atomic on the server: a Session and its company calendar event are
 * written together, so this service never orchestrates two calls. The backend
 * rejects unbounded ranges and derives the actor/tenant from the session cookie.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private http = inject(HttpClient);
  private readonly base = `${Constants.ApiBase}api/sessions`;

  // ---------- queries ----------

  list(companyId: number, filters: { status?: string; sessionType?: string } = {}): Observable<SessionSummary[]> {
    let params = new HttpParams().set('company_id', String(companyId));
    if (filters.status) params = params.set('status', filters.status);
    if (filters.sessionType) params = params.set('session_type', filters.sessionType);
    return this.http.get<SessionSummary[]>(`${this.base}/queries/list.php`, { params, withCredentials: true });
  }

  upcoming(start: string, end: string, companyId?: number | null): Observable<SessionSummary[]> {
    let params = new HttpParams().set('start', start).set('end', end);
    if (companyId && companyId > 0) params = params.set('company_id', String(companyId));
    return this.http.get<SessionSummary[]>(`${this.base}/queries/upcoming.php`, { params, withCredentials: true });
  }

  get(id: number): Observable<SessionDetail> {
    return this.http.get<SessionDetail>(`${this.base}/queries/get.php?id=${id}`, { withCredentials: true });
  }

  brief(id: number): Observable<PreparationBrief> {
    return this.http.get<PreparationBrief>(`${this.base}/queries/brief.php?id=${id}`, { withCredentials: true });
  }

  backlinks(entityType: SessionLinkEntityType, entityId: number): Observable<SessionSummary[]> {
    const params = new HttpParams()
      .set('entity_type', LINK_TYPE_TO_API[entityType])
      .set('entity_id', String(entityId));
    return this.http.get<SessionSummary[]>(`${this.base}/queries/backlinks.php`, { params, withCredentials: true });
  }

  eligibleEvents(companyId: number, start: string, end: string): Observable<EligibleEvent[]> {
    const params = new HttpParams()
      .set('company_id', String(companyId))
      .set('start', start)
      .set('end', end);
    return this.http.get<EligibleEvent[]>(`${this.base}/queries/eligible-events.php`, { params, withCredentials: true });
  }

  // ---------- lifecycle ----------

  create(input: SessionInput): Observable<SessionDetail> {
    return this.http
      .post<ApiCommandResult>(`${this.base}/commands/create.php`, input, { withCredentials: true })
      .pipe(map(res => res.data as SessionDetail));
  }

  convert(input: SessionInput): Observable<SessionDetail> {
    return this.http
      .post<ApiCommandResult>(`${this.base}/commands/convert.php`, input, { withCredentials: true })
      .pipe(map(res => res.data as SessionDetail));
  }

  update(id: number, input: SessionInput): Observable<SessionDetail> {
    return this.http
      .post<ApiCommandResult>(`${this.base}/commands/update.php?id=${id}`, input, { withCredentials: true })
      .pipe(map(res => res.data as SessionDetail));
  }

  start(id: number, version?: number): Observable<SessionDetail> {
    return this.http
      .post<ApiCommandResult>(`${this.base}/commands/start.php?id=${id}`, { version }, { withCredentials: true })
      .pipe(map(res => res.data as SessionDetail));
  }

  complete(id: number, closingSummary: string | null, version?: number): Observable<SessionDetail> {
    return this.http
      .post<ApiCommandResult>(`${this.base}/commands/complete.php?id=${id}`, { closingSummary, version }, { withCredentials: true })
      .pipe(map(res => res.data as SessionDetail));
  }

  cancel(id: number, cancellationReason: string, version?: number): Observable<SessionDetail> {
    return this.http
      .post<ApiCommandResult>(`${this.base}/commands/cancel.php?id=${id}`, { cancellationReason, version }, { withCredentials: true })
      .pipe(map(res => res.data as SessionDetail));
  }

  // ---------- sub-resources ----------

  agenda(id: number, action: 'add' | 'update' | 'reorder' | 'delete', payload: Record<string, unknown>): Observable<SessionDetail> {
    return this.command('agenda', id, action, payload);
  }

  notes(id: number, action: 'add' | 'update' | 'delete', payload: Record<string, unknown>): Observable<SessionDetail> {
    return this.command('notes', id, action, payload);
  }

  decisions(id: number, action: 'record' | 'update' | 'delete', payload: Record<string, unknown>): Observable<SessionDetail> {
    return this.command('decisions', id, action, payload);
  }

  links(id: number, action: 'add' | 'remove', payload: Record<string, unknown>): Observable<SessionDetail> {
    return this.command('links', id, action, payload);
  }

  participants(id: number, action: 'add' | 'update' | 'remove' | 'attendance', payload: Record<string, unknown>): Observable<SessionDetail> {
    return this.command('participants', id, action, payload);
  }

  private command(
    resource: string,
    id: number,
    action: string,
    payload: Record<string, unknown>,
  ): Observable<SessionDetail> {
    return this.http
      .post<ApiCommandResult>(`${this.base}/commands/${resource}.php?id=${id}&action=${action}`, payload, { withCredentials: true })
      .pipe(map(res => res.data as SessionDetail));
  }

  // ---------- helpers ----------

  /** Canonical link type sent to the API (used when creating a link). */
  toApiLinkType(type: SessionLinkEntityType): string {
    return LINK_TYPE_TO_API[type] ?? type;
  }

  /**
   * Human-readable API error. Reads the response body so it also works with plain
   * error objects surfaced by interceptors/tests.
   */
  errorMessage(err: unknown): string {
    const e = err as Partial<HttpErrorResponse> | null;
    if (!e || typeof e !== 'object') return 'Something went wrong.';

    const body = (e.error ?? null) as { error?: unknown; errors?: Record<string, string>; code?: string } | null;
    if (body && typeof body === 'object') {
      if (body.code === 'SESSION_LINKED') {
        return 'This appointment belongs to a Session. Cancel the Session instead of deleting the appointment.';
      }
      if (body.errors && typeof body.errors === 'object') {
        const first = Object.values(body.errors)[0];
        if (typeof first === 'string' && first) return first;
      }
      if (typeof body.error === 'string' && body.error) {
        // Strip the machine-readable prefix (e.g. "SESSION_FROZEN: ").
        return body.error.replace(/^[A-Z][A-Z0-9_]+:\s*/, '');
      }
    }

    switch (e.status) {
      case 401: return 'Your session has expired. Please log in again.';
      case 403: return 'You do not have access to this company.';
      case 404: return 'That Session no longer exists.';
      case 409: return 'This Session was changed by someone else. Reload and try again.';
      case 422: return 'Please check the details and try again.';
    }
    return e.status ? 'Could not complete the request.' : 'Something went wrong.';
  }

  /** Whether an event is eligible to become a Session (mirrors the server rule). */
  isConvertible(event: SessionEventRef | EligibleEvent | null): boolean {
    return !!event && event.category === 'meeting' && event.companyId !== null;
  }

  /** Flattened link label for display. */
  linkLabel(link: SessionEntityLink): string {
    return link.label ?? `${link.entityType} #${link.entityId}`;
  }
}
