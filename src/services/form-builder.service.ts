import { Injectable } from '@angular/core';
import { Observable, forkJoin, map, switchMap } from 'rxjs';
import { FormService } from './form.service';
import { FormNodeService } from './form-node.service';
import { FormSessionService } from './form-session.service';
import { SessionFieldResponseService } from './session-field-response.service';
import {
  IForm,
  IFormNode,
  IFormSession,
  ISessionFieldResponse,
  NodeType,
  FieldType
} from '../models/form-system.models';

export interface FormWithNodes extends IForm {
  nodes: IFormNode[];
  tabs: IFormNode[];
  fields: IFormNode[];
}

export interface FormSessionWithResponses extends IFormSession {
  responses: ISessionFieldResponse[];
  form?: IForm;
}

@Injectable({ providedIn: 'root' })
export class FormBuilderService {

  constructor(
    private formService: FormService,
    private formNodeService: FormNodeService,
    private formSessionService: FormSessionService,
    private sessionFieldResponseService: SessionFieldResponseService
  ) {}

  /**
   * Get a complete form with all its nodes
   */
  getFormWithNodes(formId: number): Observable<FormWithNodes> {
    return forkJoin({
      form: this.formService.getFormById(formId),
      nodes: this.formNodeService.getFormNodes(formId),
      tabs: this.formNodeService.getTabs(formId),
      fields: this.formNodeService.getFields(formId)
    }).pipe(
      map(({ form, nodes, tabs, fields }) => ({
        ...form,
        nodes,
        tabs,
        fields
      }))
    );
  }

  /**
   * Get a form session with all responses and field details
   */
  getSessionWithResponses(sessionId: number): Observable<FormSessionWithResponses> {
    return forkJoin({
      session: this.formSessionService.getFormSessionById(sessionId),
      responses: this.sessionFieldResponseService.getResponsesBySession(sessionId, true)
    }).pipe(
      map(({ session, responses }) => ({
        ...session,
        responses
      }))
    );
  }

  /**
   * Get a complete form session with form structure and responses
   */
  getCompleteFormSession(sessionId: number): Observable<FormSessionWithResponses & { form: FormWithNodes }> {
    return this.getSessionWithResponses(sessionId).pipe(
      switchMap(sessionWithResponses =>
        this.getFormWithNodes(sessionWithResponses.form_id).pipe(
          map(formData => ({
            ...sessionWithResponses,
            form: formData
          }))
        )
      )
    );
  }

  /**
   * Create a new form with basic structure (tabs, sections)
   */
  createFormWithStructure(
    formData: Partial<IForm>,
    tabs: Array<{ key: string; title: string; sections?: Array<{ key: string; title: string }> }>
  ): Observable<FormWithNodes> {
    return this.formService.addForm(formData).pipe(
      switchMap(form => {
        const nodePromises: Observable<IFormNode>[] = [];

        tabs.forEach((tab, tabIndex) => {
          // Create tab
          const tabNode: Partial<IFormNode> = {
            form_id: form.id,
            parent_id: null,
            depth: 1,
            node_type: 'tab' as NodeType,
            node_key: tab.key,
            title: tab.title,
            sort_order: tabIndex
          };

          nodePromises.push(this.formNodeService.addFormNode(tabNode));
        });

        if (nodePromises.length === 0) {
          return this.getFormWithNodes(form.id);
        }

        return forkJoin(nodePromises).pipe(
          switchMap(() => this.getFormWithNodes(form.id))
        );
      })
    );
  }

  /**
   * Add a field to a form section/row
   */
  addFieldToForm(
    formId: number,
    parentId: number,
    fieldData: {
      key: string;
      title: string;
      field_type: FieldType;
      required?: boolean;
      placeholder?: string;
      options?: any[];
      validation?: any;
      default_value?: any;
    }
  ): Observable<IFormNode> {
    const nodeData: Partial<IFormNode> = {
      form_id: formId,
      parent_id: parentId,
      depth: 4, // Field level
      node_type: 'field' as NodeType,
      node_key: fieldData.key,
      title: fieldData.title,
      field_type: fieldData.field_type,
      required: fieldData.required || false,
      placeholder: fieldData.placeholder,
      sort_order: 0 // Will be set by the backend
    };

    if (fieldData.options) {
      nodeData.options_json = fieldData.options;
    }
    if (fieldData.validation) {
      nodeData.validation_json = fieldData.validation;
    }
    if (fieldData.default_value) {
      nodeData.default_json = fieldData.default_value;
    }

    return this.formNodeService.addFormNode(nodeData);
  }

  /**
   * Submit form responses for a session
   */
  submitFormResponses(
    sessionId: number,
    responses: Record<string, any>
  ): Observable<ISessionFieldResponse[]> {
    const responseArray = Object.entries(responses).map(([fieldNodeId, value]) => ({
      field_node_id: parseInt(fieldNodeId),
      ...this.mapValueToResponseFields(value)
    }));

    return this.sessionFieldResponseService.saveResponses(sessionId, { responses: responseArray });
  }

  /**
   * Get form analytics data
   */
  getFormAnalytics(formId: number): Observable<any> {
    return this.formNodeService.getFields(formId).pipe(
      switchMap(fields => {
        const analyticsPromises = fields
          .filter(field => field.metric_key)
          .map(field =>
            this.sessionFieldResponseService.getResponsesByField(field.id!).pipe(
              map(responses => ({
                field: field,
                responses: responses,
                stats: this.calculateFieldStats(responses, field.field_type!)
              }))
            )
          );

        if (analyticsPromises.length === 0) {
          return [];
        }

        return forkJoin(analyticsPromises);
      })
    );
  }

  /**
   * Helper method to map values to appropriate response fields
   */
  private mapValueToResponseFields(value: any): Partial<ISessionFieldResponse> {
    if (typeof value === 'number') {
      return { value_num: value };
    } else if (typeof value === 'boolean') {
      return { value_bool: value };
    } else if (value instanceof Date || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value))) {
      return { value_date: value instanceof Date ? value.toISOString().split('T')[0] : value };
    } else if (typeof value === 'object') {
      return { value_json: value };
    } else {
      return { value_text: String(value) };
    }
  }

  /**
   * Calculate basic statistics for field responses
   */
  private calculateFieldStats(responses: ISessionFieldResponse[], fieldType: FieldType): any {
    const stats: any = {
      total_responses: responses.length,
      field_type: fieldType
    };

    switch (fieldType) {
      case 'number':
      case 'currency':
      case 'percentage':
      case 'rating':
      case 'scale':
        const numValues = responses.map(r => r.value_num).filter(v => v !== null) as number[];
        if (numValues.length > 0) {
          stats.min = Math.min(...numValues);
          stats.max = Math.max(...numValues);
          stats.average = numValues.reduce((a, b) => a + b, 0) / numValues.length;
        }
        break;

      case 'yesno':
      case 'checkbox':
        const boolValues = responses.map(r => r.value_bool).filter(v => v !== null);
        stats.true_count = boolValues.filter(v => v === true).length;
        stats.false_count = boolValues.filter(v => v === false).length;
        break;

      case 'dropdown':
      case 'radio':
        const textValues = responses.map(r => r.value_text).filter(v => v !== null);
        stats.value_distribution = textValues.reduce((acc: any, val) => {
          acc[val!] = (acc[val!] || 0) + 1;
          return acc;
        }, {});
        break;
    }

    return stats;
  }
}
