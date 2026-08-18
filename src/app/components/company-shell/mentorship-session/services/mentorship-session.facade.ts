import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MentorshipSessionService } from '../../../../../services/mentorship-session.service';
import { MentorshipSession, MentorshipSessionSummary } from '../../../../../models/mentorship.models';

@Injectable()
export class MentorshipSessionFacade {
  constructor(private api: MentorshipSessionService) {}

  getSessionsByCompany(companyId: number): Observable<MentorshipSession[]> {
    return this.api.getSessionsByCompany(companyId);
  }

  getSessionSummary(companyId: number): Observable<MentorshipSessionSummary> {
    return this.api.getSessionSummary(companyId);
  }

  createSession(companyId: number, mentorId: number, mentorName: string, data: any): Observable<MentorshipSession> {
    return this.api.createSession(companyId, mentorId, mentorName, data);
  }

  updateSession(sessionId: number, data: any): Observable<MentorshipSession> {
    return this.api.updateSession(sessionId, data);
  }

  deleteSession(sessionId: number): Observable<boolean> {
    return this.api.deleteSession(sessionId);
  }
}
