import { Injectable } from '@angular/core';
import { Observable, switchMap } from 'rxjs';
import { NodeService } from '../../../../services/node.service';
import {
  FORM_NODE_TYPES,
  FormTemplate,
  FormSubmission,
  IFormTemplateData,
  IFormSubmissionData,
} from '../interfaces/form-template.interfaces';

@Injectable({ providedIn: 'root' })
export class FormTemplateService {
  constructor(private nodeService: NodeService) {}

  // ── Templates ────────────────────────────────────────────────────────────────

  getAllTemplates(): Observable<FormTemplate[]> {
    return this.nodeService.getNodesByType(
      FORM_NODE_TYPES.TEMPLATE
    ) as Observable<FormTemplate[]>;
  }

  getTemplateById(id: number): Observable<FormTemplate> {
    return this.nodeService.getNodeById(id) as Observable<FormTemplate>;
  }

  createTemplate(data: IFormTemplateData): Observable<FormTemplate> {
    const node: FormTemplate = {
      type: FORM_NODE_TYPES.TEMPLATE,
      data,
    };
    return this.nodeService.addNode(node) as Observable<FormTemplate>;
  }

  updateTemplate(id: number, data: IFormTemplateData): Observable<FormTemplate> {
    return this.getTemplateById(id).pipe(
      switchMap(existing => {
        const updated: FormTemplate = { ...existing, data };
        return this.nodeService.updateNode(updated) as Observable<FormTemplate>;
      })
    );
  }

  deleteTemplate(id: number): Observable<any> {
    return this.nodeService.deleteNode(id);
  }

  // ── Submissions ───────────────────────────────────────────────────────────────

  /**
   * All internal (interview) submissions for a template.
   * Submissions now use parent_id = templateId so all submissions for a
   * template are co-located and can be shown alongside public responses.
   */
  getAllSubmissionsForTemplate(templateId: number): Observable<FormSubmission[]> {
    return this.nodeService.getNodes(
      FORM_NODE_TYPES.SUBMISSION,
      templateId
    ) as Observable<FormSubmission[]>;
  }

  /**
   * Get submissions for a specific template + company (applicant) combination.
   * companyId is always required — callers must pass effectiveCompanyId (never null).
   * Generates: GET get-nodes.php?type=form_submission&parentId=X&companyId=Y
   */
  getSubmissionsByTemplate(
    companyId: number,
    templateId: number
  ): Observable<FormSubmission[]> {
    return this.nodeService.getNodes(
      FORM_NODE_TYPES.SUBMISSION,
      templateId,
      companyId
    ) as Observable<FormSubmission[]>;
  }

  createSubmission(
    templateId: number,
    companyId: number | null,
    data: IFormSubmissionData,
    submittedByName?: string,
    createdBy?: number | null,
    nodeOverrides?: { company_id?: number | null; created_by?: number | null }
  ): Observable<FormSubmission> {
    const node: any = {
      type: FORM_NODE_TYPES.SUBMISSION,
      parent_id: templateId,
      company_id: nodeOverrides?.company_id !== undefined ? nodeOverrides.company_id : (companyId ?? null),
      created_by: nodeOverrides?.created_by !== undefined ? nodeOverrides.created_by : (createdBy ?? null),
      data,
      submitted_by_name: submittedByName ?? null,
    };
    return this.nodeService.addNode(node) as Observable<FormSubmission>;
  }

  /**
   * Get all submissions for a template that were submitted by a specific name.
   * Used to find judge submissions by name in multi-judge mode.
   */
  getSubmissionsByName(
    templateId: number,
    submittedByName: string
  ): Observable<FormSubmission[]> {
    return this.nodeService.getBySubmittedByName(
      submittedByName,
      FORM_NODE_TYPES.SUBMISSION,
      templateId
    ) as Observable<FormSubmission[]>;
  }

  updateSubmission(
    id: number,
    data: Partial<IFormSubmissionData>,
    nodeOverrides?: { company_id?: number | null; created_by?: number | null }
  ): Observable<FormSubmission> {
    return (this.nodeService.getNodeById(id) as Observable<FormSubmission>).pipe(
      switchMap(existing => {
        const updated: any = {
          ...existing,
          data: { ...existing.data, ...data },
        };
        if (nodeOverrides?.company_id !== undefined) updated.company_id = nodeOverrides.company_id;
        if (nodeOverrides?.created_by !== undefined) updated.created_by = nodeOverrides.created_by;
        return this.nodeService.updateNode(updated) as Observable<FormSubmission>;
      })
    );
  }

  deleteSubmission(id: number): Observable<any> {
    return this.nodeService.deleteNode(id);
  }
}
