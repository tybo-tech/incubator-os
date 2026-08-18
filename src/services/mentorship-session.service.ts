import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { NodeService } from './node.service';
import { MentorshipSession, MentorshipSessionSummary } from '../models/mentorship.models';

@Injectable({
  providedIn: 'root'
})
export class MentorshipSessionService {
  private readonly NODE_TYPE = 'mentorship_session';

  constructor(private nodeService: NodeService) {}

  getSessionsByCompany(companyId: number): Observable<MentorshipSession[]> {
    return this.nodeService.getNodesByCompany(companyId, this.NODE_TYPE).pipe(
      map(nodes => {
        if (!nodes || nodes.length === 0) return [];
        return nodes.map(node => ({
          id: node.id,
          companyId: companyId,
          mentorId: node.data.mentorId || 0,
          mentorName: node.data.mentorName || '',
          sessionDate: node.data.sessionDate || '',
          startTime: node.data.startTime || '',
          endTime: node.data.endTime || '',
          category: node.data.category || '',
          topic: node.data.topic || '',
          activities: node.data.activities || '',
          outcomes: node.data.outcomes || '',
          nextActions: node.data.nextActions || '',
          durationHours: node.data.durationHours || 0,
          hourlyRate: node.data.hourlyRate || 0,
          sessionValue: node.data.sessionValue || 0,
          deliveryMethod: node.data.deliveryMethod || '',
          location: node.data.location || '',
          status: node.data.status || 'Completed',
          createdAt: node.created_at,
          updatedAt: node.updated_at
        })).sort((a, b) =>
          new Date(b.sessionDate || '').getTime() - new Date(a.sessionDate || '').getTime()
        );
      }),
      catchError(error => {
        console.error('Error fetching mentorship sessions:', error);
        return of([]);
      })
    );
  }

  getSessionSummary(companyId: number): Observable<MentorshipSessionSummary> {
    return this.getSessionsByCompany(companyId).pipe(
      map(sessions => {
        if (sessions.length === 0) {
          return {
            totalSessions: 0,
            totalHours: 0,
            totalValue: 0,
            lastSessionDate: null,
            recentSessions: []
          };
        }
        const totalHours = sessions.reduce((sum, s) => sum + (s.durationHours || 0), 0);
        const totalValue = sessions.reduce((sum, s) => sum + (s.sessionValue || 0), 0);
        return {
          totalSessions: sessions.length,
          totalHours: Math.round(totalHours * 100) / 100,
          totalValue: Math.round(totalValue * 100) / 100,
          lastSessionDate: sessions[0]?.sessionDate || null,
          recentSessions: sessions.slice(0, 5)
        };
      })
    );
  }

  createSession(companyId: number, mentorId: number, mentorName: string, data: any): Observable<MentorshipSession> {
    const nodeData = {
      type: this.NODE_TYPE,
      company_id: companyId,
      data: {
        mentorId,
        mentorName,
        sessionDate: data.sessionDate,
        startTime: data.startTime,
        endTime: data.endTime,
        category: data.category,
        topic: data.topic,
        activities: data.activities,
        outcomes: data.outcomes,
        nextActions: data.nextActions,
        durationHours: Number(data.durationHours) || 0,
        hourlyRate: Number(data.hourlyRate) || 0,
        sessionValue: Number(data.sessionValue) || 0,
        deliveryMethod: data.deliveryMethod,
        location: data.location,
        status: data.status || 'Completed'
      }
    };

    return this.nodeService.addNode(nodeData).pipe(
      map(node => ({
        id: node.id,
        companyId,
        mentorId,
        mentorName,
        ...data,
        durationHours: Number(data.durationHours) || 0,
        hourlyRate: Number(data.hourlyRate) || 0,
        sessionValue: Number(data.sessionValue) || 0,
        createdAt: node.created_at,
        updatedAt: node.updated_at
      })),
      catchError(error => {
        console.error('Error creating mentorship session:', error);
        throw error;
      })
    );
  }

  updateSession(sessionId: number, data: any): Observable<MentorshipSession> {
    const nodeData = {
      id: sessionId,
      type: this.NODE_TYPE,
      data: {
        mentorId: data.mentorId,
        mentorName: data.mentorName,
        sessionDate: data.sessionDate,
        startTime: data.startTime,
        endTime: data.endTime,
        category: data.category,
        topic: data.topic,
        activities: data.activities,
        outcomes: data.outcomes,
        nextActions: data.nextActions,
        durationHours: Number(data.durationHours) || 0,
        hourlyRate: Number(data.hourlyRate) || 0,
        sessionValue: Number(data.sessionValue) || 0,
        deliveryMethod: data.deliveryMethod,
        location: data.location,
        status: data.status || 'Completed'
      }
    };

    return this.nodeService.updateNode(nodeData).pipe(
      map(node => ({
        id: node.id,
        companyId: data.companyId,
        ...data,
        createdAt: node.created_at,
        updatedAt: node.updated_at
      })),
      catchError(error => {
        console.error('Error updating mentorship session:', error);
        throw error;
      })
    );
  }

  deleteSession(sessionId: number): Observable<boolean> {
    return this.nodeService.deleteNode(sessionId).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error deleting mentorship session:', error);
        return of(false);
      })
    );
  }
}
