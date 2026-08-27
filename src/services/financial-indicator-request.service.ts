import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { NodeService } from './node.service';
import { INode } from '../models/schema';

export interface FinancialIndicatorRequest {
  id?: number;
  companyId: number;
  financialYear: number;
  month: number;
  token: string;
  publicUrl: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  body: string;
  emailSent: boolean;
  sentAt?: string;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class FinancialIndicatorRequestService {
  private readonly NODE_TYPE = 'financial_indicator_request';

  constructor(private nodeService: NodeService) {}

  getHistory(companyId: number): Observable<FinancialIndicatorRequest[]> {
    return this.nodeService.getNodesByCompany(companyId, this.NODE_TYPE).pipe(
      map(nodes => {
        if (!nodes || nodes.length === 0) return [];
        return nodes.map(node => this.mapNode(node)).sort((a, b) =>
          new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
        );
      }),
      catchError(() => of([]))
    );
  }

  updateRequestEmail(
    id: number,
    recipientEmail: string,
    recipientName: string,
    subject: string,
    body: string,
  ): Observable<FinancialIndicatorRequest> {
    const node: INode = {
      id,
      type: this.NODE_TYPE,
      data: {
        recipientEmail,
        recipientName,
        subject,
        body,
        emailSent: false,
      },
    };
    return this.nodeService.updateNode(node).pipe(
      map(saved => this.mapNode(saved)),
      catchError(error => {
        console.error('Error updating request email details:', error);
        throw error;
      })
    );
  }

  markEmailSent(id: number, sentAt: string): Observable<FinancialIndicatorRequest> {
    const node: INode = {
      id,
      type: this.NODE_TYPE,
      data: { emailSent: true, sentAt },
    };
    return this.nodeService.updateNode(node).pipe(
      map(saved => this.mapNode(saved)),
      catchError(error => {
        console.error('Error marking request email sent:', error);
        throw error;
      })
    );
  }

  private mapNode(node: INode): FinancialIndicatorRequest {
    const d = node.data || {};
    const financialYear = d.financialYear ?? d.financial_year ?? 0;
    const month = d.month ?? 0;
    const token = d.token ?? (node as any).token ?? '';
    const publicUrl = d.publicUrl ?? (token ? `${window.location.origin}/financial/${token}` : '');
    return {
      id: node.id,
      companyId: d.companyId ?? d.company_id ?? node.company_id ?? 0,
      financialYear,
      month,
      token,
      publicUrl,
      recipientEmail: d.recipientEmail ?? d.recipient_email ?? '',
      recipientName: d.recipientName ?? d.recipient_name ?? '',
      subject: d.subject ?? '',
      body: d.body ?? '',
      emailSent: !!d.emailSent,
      sentAt: d.sentAt ?? d.sent_at,
      createdAt: node.created_at,
    };
  }
}
