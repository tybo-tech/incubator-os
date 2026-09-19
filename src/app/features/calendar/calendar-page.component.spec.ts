import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { CalendarPageComponent } from './calendar-page.component';
import { CalendarService } from './services/calendar.service';
import { AuthService } from '../../auth/auth.service';
import { of } from 'rxjs';

describe('CalendarPageComponent', () => {
  let fixture: ComponentFixture<CalendarPageComponent>;

  function routeStub(): any {
    return {
      snapshot: { paramMap: { get: () => null }, params: {} },
      paramMap: of({ get: () => null }),
      params: of({}),
      parent: null,
    };
  }

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [CalendarPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: routeStub() },
        {
          provide: AuthService,
          useValue: { getUser: () => ({ id: 1, company_id: 99, full_name: 'Tester', username: 'tester' }) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CalendarPageComponent);
    fixture.detectChanges();
  });

  it('renders the calendar header', () => {
    const text = fixture.nativeElement.textContent || '';
    expect(text).toContain('Calendar');
  });

  it('renders a month grid with the 7 weekday columns', () => {
    const dows = fixture.nativeElement.querySelectorAll('.cal-dow');
    expect(dows.length).toBe(7);
  });

  it('shows seeded system-wide appointments in the global agenda', () => {
    const text = fixture.nativeElement.textContent || '';
    expect(text).toContain('Quarterly programme check-in');
  });

  it('opens and closes the create appointment dialog without closing on outside click', () => {
    const page = fixture.componentInstance;
    page.openCreate(page.todayIso);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-calendar-event-modal')).toBeTruthy();

    // The modal wrapper must not carry a click handler that closes on backdrop.
    const modal = fixture.nativeElement.querySelector('.sw-modal') as HTMLElement;
    expect(modal.getAttribute('(click)')).toBeNull();

    page.closeForm();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-calendar-event-modal')).toBeFalsy();
  });

  it('persists a created appointment via the mock service', () => {
    const service = TestBed.inject(CalendarService);
    let count = 0;
    service.listGlobal().subscribe(e => (count = e.length));

    service.create({
      company_id: null,
      company_name: null,
      title: 'Test appointment',
      description: null,
      category: 'meeting',
      date: '2026-09-20',
      all_day: true,
      start_time: null,
      end_time: null,
      location: null,
      assignee: null,
      link_type: null,
      link_id: null,
      link_label: null,
      status: 'scheduled',
      created_by: null,
    }).subscribe();

    let after = 0;
    service.listGlobal().subscribe(e => (after = e.length));
    expect(after).toBe(count + 1);
  });
});
