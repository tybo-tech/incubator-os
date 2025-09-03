// services/session.service.ts - Service for managing session feedback

import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { NodeService } from './node.service';
import { SessionFeedback, SessionSummary } from '../models/session.models';

@Injectable({
  providedIn: 'root'
})
export class SessionService {

  constructor(private nodeService: NodeService) {}

  /**
   * Get all sessions for a company
   */
  getSessionsByCompany(companyId: number): Observable<SessionFeedback[]> {
    return this.nodeService.getNodesByCompany(companyId, 'session_feedback').pipe(
      map(nodes => {
        if (!nodes || nodes.length === 0) {
          return [];
        }

        // Convert nodes to session feedback objects
        return nodes.map(node => ({
          id: node.id,
          company_id: companyId,
          session_date: node.data.session_date || node.created_at || '',
          session_rating: node.data.session_rating || 0,
          key_takeaways: node.data.key_takeaways || '',
          next_session_focus: node.data.next_session_focus || '',
          other_comments: node.data.other_comments || '',
          client_signature: node.data.client_signature || '',
          signature_data: node.data.signature_data || '',
          consultant_name: node.data.consultant_name || '',
          created_at: node.created_at,
          updated_at: node.updated_at
        })).sort((a, b) =>
          new Date(b.session_date || b.created_at || '').getTime() -
          new Date(a.session_date || a.created_at || '').getTime()
        );
      }),
      catchError(error => {
        console.error('Error fetching sessions:', error);
        return of([]);
      })
    );
  }

  /**
   * Get session summary statistics
   */
  getSessionSummary(companyId: number): Observable<SessionSummary> {
    return this.getSessionsByCompany(companyId).pipe(
      map(sessions => {
        if (sessions.length === 0) {
          return {
            total_sessions: 0,
            last_session_date: null,
            average_rating: 0,
            recent_sessions: []
          };
        }

        const totalRating = sessions.reduce((sum, session) => sum + session.session_rating, 0);
        const averageRating = totalRating / sessions.length;

        return {
          total_sessions: sessions.length,
          last_session_date: sessions[0]?.session_date || null,
          average_rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
          recent_sessions: sessions.slice(0, 5) // Last 5 sessions
        };
      })
    );
  }

  /**
   * Create a new session feedback
   */
  createSession(companyId: number, sessionData: Omit<SessionFeedback, 'id' | 'company_id' | 'created_at' | 'updated_at'>): Observable<SessionFeedback> {
    const nodeData = {
      type: 'session_feedback',
      company_id: companyId,
      data: {
        session_date: sessionData.session_date,
        session_rating: sessionData.session_rating,
        key_takeaways: sessionData.key_takeaways,
        next_session_focus: sessionData.next_session_focus,
        other_comments: sessionData.other_comments,
        client_signature: sessionData.client_signature,
        signature_data: sessionData.signature_data,
        consultant_name: sessionData.consultant_name
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return this.nodeService.addNode(nodeData).pipe(
      map(node => ({
        id: node.id,
        company_id: companyId,
        session_date: sessionData.session_date,
        session_rating: sessionData.session_rating,
        key_takeaways: sessionData.key_takeaways,
        next_session_focus: sessionData.next_session_focus,
        other_comments: sessionData.other_comments,
        client_signature: sessionData.client_signature,
        consultant_name: sessionData.consultant_name,
        signature_data: sessionData.signature_data,
        created_at: node.created_at,
        updated_at: node.updated_at
      })),
      catchError(error => {
        console.error('Error creating session:', error);
        throw error;
      })
    );
  }

  /**
   * Update an existing session feedback
   */
  updateSession(sessionId: number, sessionData: Partial<SessionFeedback>): Observable<SessionFeedback> {
    const nodeData = {
      id: sessionId,
      type: 'session_feedback',
      data: {
        session_date: sessionData.session_date,
        session_rating: sessionData.session_rating,
        key_takeaways: sessionData.key_takeaways,
        next_session_focus: sessionData.next_session_focus,
        other_comments: sessionData.other_comments,
        client_signature: sessionData.client_signature,
        consultant_name: sessionData.consultant_name,
        signature_data: sessionData.signature_data
      },
      updated_at: new Date().toISOString()
    };

    return this.nodeService.updateNode(nodeData).pipe(
      map(node => ({
        id: node.id,
        company_id: sessionData.company_id!,
        session_date: sessionData.session_date!,
        session_rating: sessionData.session_rating!,
        key_takeaways: sessionData.key_takeaways!,
        next_session_focus: sessionData.next_session_focus!,
        other_comments: sessionData.other_comments!,
        client_signature: sessionData.client_signature!,
        consultant_name: sessionData.consultant_name!,
        signature_data: sessionData.signature_data!,
        created_at: node.created_at,
        updated_at: node.updated_at
      })),
      catchError(error => {
        console.error('Error updating session:', error);
        throw error;
      })
    );
  }

  /**
   * Delete a session feedback
   */
  deleteSession(sessionId: number): Observable<boolean> {
    // For now, we'll implement a soft delete or mark as inactive
    // You can implement actual deletion based on your API structure
    console.log('Would delete session:', sessionId);
    return of(true);
  }
}
