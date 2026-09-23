import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { SessionService } from './session.service';
import { EnvironmentInjector, runInInjectionContext } from '@angular/core';

describe('SessionService', () => {
  let service: SessionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SessionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists sessions for a company with scoped params', () => {
    service.list(11, { status: 'PREPARING' }).subscribe(list => expect(list.length).toBe(1));
    const req = http.expectOne(r => r.url.endsWith('/api/sessions/queries/list.php'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('company_id')).toBe('11');
    expect(req.request.params.get('status')).toBe('PREPARING');
    expect(req.request.withCredentials).toBe(true);
    req.flush([{ id: 1, companyId: 11, subject: 'x', status: 'PREPARING' }]);
  });

  it('creates a session through the command endpoint and unwraps data', () => {
    let result: unknown;
    service.create({ companyId: 11, sessionType: 'coaching', subject: 'Kickoff' }).subscribe(r => (result = r));
    const req = http.expectOne(r => r.url.endsWith('/api/sessions/commands/create.php'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body.subject).toBe('Kickoff');
    req.flush({ success: true, message: 'Session created', data: { id: 9, subject: 'Kickoff' } });
    expect((result as { id: number }).id).toBe(9);
  });

  it('sends the version when updating (optimistic concurrency)', () => {
    service.update(9, { companyId: 11, sessionType: 'other', subject: 'v2', version: 3 }).subscribe();
    const req = http.expectOne(r => r.url.includes('/commands/update.php?id=9'));
    expect(req.request.body.version).toBe(3);
    req.flush({ success: true, message: 'ok', data: { id: 9 } });
  });

  it('maps the frontend link label to the canonical backend entity type', () => {
    service.links(9, 'add', { entityType: service.toApiLinkType('target'), entityId: 118 }).subscribe();
    const req = http.expectOne(r => r.url.includes('/commands/links.php'));
    expect(req.request.body.entityType).toBe('gps_target');
    req.flush({ success: true, message: 'ok', data: { id: 9 } });
  });

  it('requests backlinks with the canonical entity type', () => {
    service.backlinks('swot', 42).subscribe();
    const req = http.expectOne(r => r.url.endsWith('/api/sessions/queries/backlinks.php'));
    expect(req.request.params.get('entity_type')).toBe('swot_item');
    expect(req.request.params.get('entity_id')).toBe('42');
    req.flush([]);
  });

  it('bounds the eligible-events window', () => {
    service.eligibleEvents(11, '2026-09-01', '2026-12-01').subscribe();
    const req = http.expectOne(r => r.url.endsWith('/api/sessions/queries/eligible-events.php'));
    expect(req.request.params.get('start')).toBe('2026-09-01');
    expect(req.request.params.get('end')).toBe('2026-12-01');
    expect(req.request.params.get('company_id')).toBe('11');
    req.flush([]);
  });

  it('surfaces the SESSION_LINKED conflict as a friendly message', () => {
    const message = service.errorMessage({ status: 409, error: { error: 'SESSION_LINKED: nope', code: 'SESSION_LINKED' } });
    expect(message).toContain('Cancel the Session');
  });

  it('strips the machine-readable prefix from a frozen-session error', () => {
    const message = service.errorMessage({ status: 409, error: { error: 'SESSION_FROZEN: A COMPLETED Session is read-only.', code: 'SESSION_FROZEN' } });
    expect(message).toBe('A COMPLETED Session is read-only.');
  });

  it('treats only company meeting events as convertible', () => {
    const meeting = { category: 'meeting', companyId: 11 } as never;
    const deadline = { category: 'deadline', companyId: 11 } as never;
    const systemWide = { category: 'meeting', companyId: null } as never;
    expect(service.isConvertible(meeting)).toBe(true);
    expect(service.isConvertible(deadline)).toBe(false);
    expect(service.isConvertible(systemWide)).toBe(false);
    expect(service.isConvertible(null)).toBe(false);
  });
});
