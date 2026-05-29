import { Injectable } from '@angular/core';
import { Observable, map, switchMap } from 'rxjs';
import { NodeService } from '../../../../services/node.service';
import {
  GRANT_NODE_TYPES,
  GrantApplication,
  GrantBankStatement,
  GrantCompliance,
  IGrantApplicationData,
  IGrantBankStatementData,
  IGrantComplianceData,
} from '../interfaces/grant-application.interfaces';

@Injectable({ providedIn: 'root' })
export class GrantApplicationService {
  constructor(private nodeService: NodeService) {}

  // ── Applications ────────────────────────────────────────────────────────────

  getAllApplications(): Observable<GrantApplication[]> {
    return this.nodeService.getNodesByType(
      GRANT_NODE_TYPES.APPLICATION
    ) as Observable<GrantApplication[]>;
  }

  getApplicationById(id: number): Observable<GrantApplication> {
    return this.nodeService.getNodeById(id) as Observable<GrantApplication>;
  }

  createApplication(data: IGrantApplicationData): Observable<GrantApplication> {
    const now = new Date().toISOString();
    const node: GrantApplication = {
      type: GRANT_NODE_TYPES.APPLICATION,
      data: {
        ...data,
        workflow_id: data.workflow_id ?? 'grant-2026',
        status: data.status ?? 'applied',
        status_history: data.status_history ?? [
          { status: 'applied', timestamp: now },
        ],
      },
    };
    return this.nodeService.addNode(node) as Observable<GrantApplication>;
  }

  updateApplication(
    id: number,
    data: Partial<IGrantApplicationData>
  ): Observable<GrantApplication> {
    return this.getApplicationById(id).pipe(
      switchMap(existing => {
        const updated: GrantApplication = {
          ...existing,
          data: { ...existing.data, ...data },
        };
        return this.nodeService.updateNode(updated) as Observable<GrantApplication>;
      })
    );
  }

  deleteApplication(id: number): Observable<any> {
    return this.nodeService.deleteNode(id);
  }

  // ── Compliance ───────────────────────────────────────────────────────────────

  getCompliance(applicationId: number): Observable<GrantCompliance | null> {
    return (
      this.nodeService.getNodes(
        GRANT_NODE_TYPES.COMPLIANCE,
        applicationId
      ) as Observable<GrantCompliance[]>
    ).pipe(map(results => (results.length > 0 ? results[0] : null)));
  }

  saveCompliance(
    applicationId: number,
    data: IGrantComplianceData
  ): Observable<GrantCompliance> {
    return this.getCompliance(applicationId).pipe(
      switchMap(existing => {
        if (existing) {
          const updated: GrantCompliance = {
            ...existing,
            data: { ...existing.data, ...data },
          };
          return this.nodeService.updateNode(updated) as Observable<GrantCompliance>;
        }
        const node: GrantCompliance = {
          type: GRANT_NODE_TYPES.COMPLIANCE,
          parent_id: applicationId,
          data,
        };
        return this.nodeService.addNode(node) as Observable<GrantCompliance>;
      })
    );
  }

  // ── Bank Statements ──────────────────────────────────────────────────────────

  getBankStatements(applicationId: number): Observable<GrantBankStatement[]> {
    return this.nodeService.getNodes(
      GRANT_NODE_TYPES.BANK_STATEMENT,
      applicationId
    ) as Observable<GrantBankStatement[]>;
  }

  /**
   * Upsert: if a record for that financial_year_id already exists, update it;
   * otherwise create a new one.
   */
  saveBankStatement(
    applicationId: number,
    data: IGrantBankStatementData
  ): Observable<GrantBankStatement> {
    return this.getBankStatements(applicationId).pipe(
      switchMap(existing => {
        const match = existing.find(
          s => s.data.financial_year_id === data.financial_year_id
        );
        if (match) {
          const updated: GrantBankStatement = {
            ...match,
            data: { ...match.data, ...data },
          };
          return this.nodeService.updateNode(updated) as Observable<GrantBankStatement>;
        }
        const node: GrantBankStatement = {
          type: GRANT_NODE_TYPES.BANK_STATEMENT,
          parent_id: applicationId,
          data,
        };
        return this.nodeService.addNode(node) as Observable<GrantBankStatement>;
      })
    );
  }

  deleteBankStatement(id: number): Observable<any> {
    return this.nodeService.deleteNode(id);
  }
}
