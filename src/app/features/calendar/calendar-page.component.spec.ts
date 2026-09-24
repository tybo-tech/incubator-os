import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { CalendarPageComponent } from './calendar-page.component';
import { CalendarService } from './services/calendar.service';
import { GoogleCalendarService } from './services/google-calendar.service';
import { AuthService } from '../../auth/auth.service';
import { of } from 'rxjs';

/** A canonical API row (camelCase, as the PHP capability returns it). */
function apiEvent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 1,
    companyId: null,
    companyName: null,
    title: 'System-wide review',
    description: null,
    category: 'review',
    status: 'scheduled',
    allDay: true,
    timezone: null,
    location: null,
    startDate: '2026-09-20',
    endDate: '2026-09-20',
    startAt: null,
    endAt: null,
    assigneeLabel: null,
    assigneeUserId: null,
    createdBy: 77,
    createdByName: 'Ndumiso Mthembu',
    version: 1,
    links: [],
    createdAt: '2026-09-19T08:00:00Z',
    updatedAt: '2026-09-19T08:00:00Z',
    ...overrides,
  };
}

describe('CalendarPageComponent', () => {
  let fixture: ComponentFixture<CalendarPageComponent>;
  let httpMock: HttpTestingController;

  function routeStub(): any {
    const emptyMap = { get: () => null };
    return {
      snapshot: { paramMap: { get: () => null }, params: {} },
      paramMap: of(emptyMap),
      queryParamMap: of(emptyMap),
      params: of({}),
      parent: null,
    };
  }

  function flushConnection() {
    const reqs = httpMock.match(r => r.url.includes('/api/google-calendar/queries/connection.php'));
    reqs.forEach(r => r.flush({
      status: 'connected',
      googleAccountEmail: 'organiser@example.test',
      calendarId: 'primary',
      connectedAt: '2026-09-24T08:00:00Z',
      lastSyncedAt: null,
      needsReconnect: false,
      pendingAccountEmail: null,
    }));
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: routeStub() },
        {
          provide: AuthService,
          useValue: { getUser: () => ({ id: 77, company_id: 99, full_name: 'Tester', username: 'tester' }) },
        },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CalendarPageComponent);
    fixture.detectChanges();
    // Flush the initial bounded-range request.
    httpMock.expectOne(req => req.url.includes('/api/calendar/queries/list.php')).flush([]);
    // Flush the connection status read.
    flushConnection();
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('renders the calendar header', () => {
    const text = fixture.nativeElement.textContent || '';
    expect(text).toContain('Calendar');
  });

  it('renders a month grid with the 7 weekday columns', () => {
    const dows = fixture.nativeElement.querySelectorAll('.cal-dow');
    expect(dows.length).toBe(7);
  });

  it('requests events for a bounded range', () => {
    const page = fixture.componentInstance;
    page.load();
    const req = httpMock.expectOne(r => r.url.includes('/api/calendar/queries/list.php'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('start')).toBeTruthy();
    expect(req.request.params.get('end')).toBeTruthy();
    req.flush([]);
  });

  it('lists system-wide events returned by the API in the agenda', () => {
    const page = fixture.componentInstance;
    page.load();
    httpMock.expectOne(r => r.url.includes('/queries/list.php')).flush([
      apiEvent({ title: 'Quarterly programme check-in' }),
    ]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Quarterly programme check-in');
  });

  it('does not append a company_id param on the global calendar', () => {
    const page = fixture.componentInstance;
    page.load();
    const req = httpMock.expectOne(r => r.url.includes('/queries/list.php'));
    expect(req.request.params.has('company_id')).toBe(false);
    req.flush([]);
  });

  it('opens and closes the create appointment dialog without closing on outside click', () => {
    const page = fixture.componentInstance;
    page.openCreate(page.todayIso);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-calendar-event-modal')).toBeTruthy();

    const modal = fixture.nativeElement.querySelector('.sw-modal') as HTMLElement;
    expect(modal.getAttribute('(click)')).toBeNull();

    page.closeForm();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-calendar-event-modal')).toBeFalsy();
  });

  it('renders the "Your Google Calendar" connection chip with the connected account', () => {
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent || '';
    expect(text).toContain('Google Calendar connected');
    expect(fixture.nativeElement.querySelector('app-google-connection-chip')).toBeTruthy();
  });

  it('does not offer Google management controls purely because the event is visible', () => {
    const page = fixture.componentInstance;
    // A projection owned by another organiser must be read-only.
    page.editing.set({
      id: '5', company_id: 11, company_name: 'Acme', title: 'External meeting',
      description: null, category: 'meeting', date: '2026-09-25', all_day: false,
      start_time: '09:00', end_time: '10:00', location: null, assignee: null,
      link_type: null, link_id: null, link_label: null, status: 'scheduled',
      created_by: null, created_at: '2026-09-24T08:00:00Z', version: 1,
    });
    page.openEdit(page.editing()!);
    fixture.detectChanges();

    const req = httpMock.expectOne(r => r.url.includes('/api/google-calendar/queries/event.php'));
    req.flush({
      success: true,
      data: {
        calendarEventId: 5, syncStatus: 'synced', conferenceStatus: 'success', published: true,
        fullySynced: true, googleEventId: 'abc', googleCalendarId: 'primary',
        googleEventUrl: 'https://calendar.google.com/event?eid=abc', meetUrl: 'https://meet.google.com/xyz',
        lastSyncedAt: '2026-09-24T08:00:00Z', lastError: null, version: 2,
        everPublished: true, isMeeting: true, attendeeCount: 2, willSendInvitations: true,
        ownedByViewer: false, syncedEventVersion: 1, upToDate: true,
      },
    });
    fixture.detectChanges();

    expect(page.googleProjection()?.ownedByViewer).toBe(false);
    const text = fixture.nativeElement.textContent || '';
    expect(text).toContain('Published by another organiser');
    expect(text).toContain('Read-only');
  });

  it('offers publishing for an event with no Google mapping yet', () => {
    const page = fixture.componentInstance;
    // Before publishing there is no mapping, so ownedByViewer is false by
    // construction; publishing must still be offered.
    page.editing.set({
      id: '9', company_id: 11, company_name: 'Acme', title: 'Fresh meeting',
      description: null, category: 'meeting', date: '2026-09-25', all_day: false,
      start_time: '09:00', end_time: '10:00', location: null, assignee: null,
      link_type: null, link_id: null, link_label: null, status: 'scheduled',
      created_by: null, created_at: '2026-09-24T08:00:00Z', version: 1,
    });
    page.openEdit(page.editing()!);
    fixture.detectChanges();

    const req = httpMock.expectOne(r => r.url.includes('/api/google-calendar/queries/event.php'));
    req.flush({
      success: true,
      data: {
        calendarEventId: 9, syncStatus: 'detached', conferenceStatus: 'none', published: false,
        fullySynced: false, googleEventId: null, googleCalendarId: null,
        googleEventUrl: null, meetUrl: null,
        lastSyncedAt: null, lastError: null, version: 1,
        everPublished: false, isMeeting: true, attendeeCount: 0, willSendInvitations: false,
        ownedByViewer: false, syncedEventVersion: null, upToDate: false,
      },
    });
    fixture.detectChanges();

    const section = fixture.nativeElement.querySelector('app-google-event-section') as HTMLElement;
    expect(section.textContent).toContain('Not in Google Calendar');
    const buttons = Array.from(section.querySelectorAll('button')).map(b => b.textContent?.trim());
    expect(buttons.some(t => t?.includes('Add to Google Calendar'))).toBe(true);
  });
});

describe('CalendarService', () => {
  let service: CalendarService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CalendarService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('maps an all-day API event without shifting the date', () => {
    let result: any;
    service.list({ start: '2026-09-01', end: '2026-09-30' }, null)
      .subscribe(events => (result = events[0]));

    httpMock.expectOne(r => r.url.includes('/queries/list.php')).flush([
      apiEvent({ startDate: '2026-09-20', endDate: '2026-09-20', allDay: true }),
    ]);

    expect(result.date).toBe('2026-09-20');
    expect(result.all_day).toBe(true);
    expect(result.start_time).toBeNull();
  });

  it('converts a timed UTC event to local date/time and keeps the version', () => {
    let result: any;
    service.list({ start: '2026-09-01', end: '2026-09-30' }, 11)
      .subscribe(events => (result = events[0]));

    const req = httpMock.expectOne(r => r.url.includes('/queries/list.php'));
    expect(req.request.params.get('company_id')).toBe('11');
    req.flush([
      apiEvent({
        allDay: false,
        startDate: null,
        endDate: null,
        timezone: 'Africa/Johannesburg',
        startAt: '2026-09-20T07:30:00Z',
        endAt: '2026-09-20T08:30:00Z',
        version: 3,
      }),
    ]);

    expect(result.all_day).toBe(false);
    expect(result.version).toBe(3);
    // Local time depends on the host zone; the date must be present.
    expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.start_time).toMatch(/^\d{2}:\d{2}$/);
  });

  it('maps a canonical gps_target link to the target label', () => {
    let result: any;
    service.list({ start: '2026-09-01', end: '2026-09-30' }, 11)
      .subscribe(events => (result = events[0]));

    httpMock.expectOne(r => r.url.includes('/queries/list.php')).flush([
      apiEvent({ links: [{ entityType: 'gps_target', entityId: 118, label: 'Revenue target' }] }),
    ]);

    expect(result.link_type).toBe('target');
    expect(result.link_id).toBe(118);
    expect(result.link_label).toBe('Revenue target');
  });

  it('posts a create with links mapped to the canonical entity type', () => {
    service.create({
      company_id: 11,
      company_name: null,
      title: 'Review',
      description: null,
      category: 'review',
      date: '2026-09-20',
      all_day: true,
      start_time: null,
      end_time: null,
      location: null,
      assignee: null,
      link_type: 'target',
      link_id: 118,
      link_label: 'Revenue target',
      status: 'scheduled',
      created_by: null,
    }).subscribe();

    const req = httpMock.expectOne(r => r.url.includes('/commands/create.php'));
    expect(req.request.method).toBe('POST');
    const body = req.request.body;
    expect(body.allDay).toBe(true);
    expect(body.startDate).toBe('2026-09-20');
    expect(body.links[0].entityType).toBe('gps_target');
    expect(body.links[0].entityId).toBe(118);
    req.flush({ success: true, message: 'ok', data: apiEvent() });
  });

  it('surfaces a structured validation message', () => {
    const message = service.errorMessage({
      status: 422,
      error: { error: 'Validation failed', errors: { title: 'A title is required.' } },
    } as any);
    expect(message).toBe('A title is required.');
  });
});

describe('GoogleCalendarService', () => {
  let service: GoogleCalendarService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(GoogleCalendarService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('reads the connection with credentials', () => {
    let result: any;
    service.getConnection().subscribe(c => (result = c));

    const req = httpMock.expectOne(r => r.url.includes('/api/google-calendar/queries/connection.php'));
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush({
      status: 'connected', googleAccountEmail: 'a@b.test', calendarId: 'primary',
      connectedAt: null, lastSyncedAt: null, needsReconnect: false, pendingAccountEmail: null,
    });

    expect(result.status).toBe('connected');
    expect(result.googleAccountEmail).toBe('a@b.test');
  });

  it('publishes with credentials and maps the projection', () => {
    let result: any;
    service.publish(7, 3).subscribe(p => (result = p));

    const req = httpMock.expectOne(r => r.url.includes('/api/google-calendar/commands/publish.php?id=7'));
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    req.flush({
      success: true, message: 'ok',
      data: {
        calendarEventId: 7, syncStatus: 'synced', conferenceStatus: 'success', published: true,
        fullySynced: true, googleEventId: 'g', googleCalendarId: 'primary',
        googleEventUrl: 'https://calendar.google.com/e', meetUrl: 'https://meet.google.com/x',
        lastSyncedAt: null, lastError: null, version: 1, everPublished: true,
        isMeeting: true, attendeeCount: 4, willSendInvitations: true, ownedByViewer: true,
        syncedEventVersion: 3, upToDate: true,
      },
    });

    expect(result.published).toBe(true);
    expect(result.attendeeCount).toBe(4);
    expect(result.ownedByViewer).toBe(true);
  });

  it('maps a sync conflict without leaking a raw error', () => {
    const err = service.toError({
      status: 409,
      error: { error: 'The Google event was changed externally. Review the conflict before syncing again.', code: 'GOOGLE_SYNC_CONFLICT' },
    } as any);
    expect(err.code).toBe('GOOGLE_SYNC_CONFLICT');
    expect(service.isConflict({ status: 409, error: { code: 'GOOGLE_SYNC_CONFLICT' } } as any)).toBe(true);
  });

  it('recognises only safe OAuth result codes', () => {
    expect(service.isKnownResultCode('connected')).toBe(true);
    expect(service.isKnownResultCode('denied')).toBe(true);
    expect(service.isKnownResultCode('access_denied')).toBe(false);
    expect(service.isKnownResultCode('<script>')).toBe(false);
    expect(service.oauthResultMessage('connected').type).toBe('success');
    expect(service.oauthResultMessage('scope_missing').message).toContain('permission');
  });

  it('treats an unknown OAuth code as a generic failure', () => {
    const { message, type } = service.oauthResultMessage('token=abc123');
    expect(type).toBe('error');
    expect(message).not.toContain('abc123');
  });
});
