// services/questionnaire.service.ts - Simplified consolidated questionnaire service

import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { NodeService } from './node.service';
import {
  BusinessQuestionnaire,
  QuestionnaireProgress
} from '../models/questionnaire.models';

@Injectable({
  providedIn: 'root'
})
export class QuestionnaireService {

  constructor(private nodeService: NodeService) {}

  /**
   * Get business assessment questionnaire structure
   */
  getBusinessAssessmentQuestionnaire(): Observable<BusinessQuestionnaire> {
    const questionnaire: BusinessQuestionnaire = {
      id: 'business_assessment',
      name: 'Business Assessment',
      description: 'Comprehensive business assessment questionnaire',
      version: '1.0',
      type: 'assessment',
      is_active: true,
      sections: [
        {
          id: 'introduction',
          name: 'Introduction',
          description: 'Business introduction and basic information',
          order: 1,
          required: true,
          questions: [
            {
              id: 'intro_business_description',
              question: 'Please provide a brief description of your business',
              type: 'textarea',
              order: 1,
              required: true,
              placeholder: 'Describe what your business does'
            },
            {
              id: 'intro_business_motivation',
              question: 'What motivated you to start this business?',
              type: 'textarea',
              order: 2,
              required: true,
              placeholder: 'Describe your motivation and current state'
            },
            {
              id: 'intro_business_stage',
              question: 'What stage is your business in?',
              type: 'dropdown',
              order: 3,
              required: true,
              options: [
                { value: 'startup', label: 'Startup' },
                { value: 'growth', label: 'Growth' },
                { value: 'established', label: 'Established' },
                { value: 'mature', label: 'Mature' }
              ]
            },
            {
              id: 'intro_registration_date',
              question: 'When was your business registered?',
              type: 'date',
              order: 4,
              required: false
            }
          ]
        },
        {
          id: 'products_services',
          name: 'Products & Services',
          description: 'Information about your offerings',
          order: 2,
          required: true,
          questions: [
            {
              id: 'ps_primary_focus',
              question: 'What is your primary business focus?',
              type: 'radio',
              order: 1,
              required: true,
              options: [
                { value: 'products', label: 'Products' },
                { value: 'services', label: 'Services' },
                { value: 'both', label: 'Both Products and Services' }
              ]
            },
            {
              id: 'ps_offerings_list',
              question: 'List your main products or services',
              type: 'textarea',
              order: 2,
              required: true,
              placeholder: 'Describe your main offerings'
            },
            {
              id: 'ps_target_market',
              question: 'Who is your target market?',
              type: 'textarea',
              order: 3,
              required: true,
              placeholder: 'Describe your target customers'
            },
            {
              id: 'ps_revenue_streams',
              question: 'How many revenue streams do you have?',
              type: 'number',
              order: 4,
              required: true,
              validation: { min_value: 1, max_value: 10 }
            }
          ]
        },
        {
          id: 'strategy_cascade',
          name: 'Strategy Cascade',
          description: 'Strategic planning and competitive positioning',
          order: 3,
          required: true,
          questions: [
            {
              id: 'sc_winning_aspiration',
              question: 'What is your winning aspiration?',
              type: 'textarea',
              order: 1,
              required: true,
              placeholder: 'Describe your long-term vision'
            },
            {
              id: 'sc_where_play',
              question: 'Where do you choose to play?',
              type: 'textarea',
              order: 2,
              required: true,
              placeholder: 'Describe your market positioning'
            },
            {
              id: 'sc_how_win',
              question: 'How do you win in the marketplace?',
              type: 'textarea',
              order: 3,
              required: true,
              placeholder: 'Describe your competitive advantage'
            },
            {
              id: 'sc_capabilities',
              question: 'What capabilities must be in place?',
              type: 'textarea',
              order: 4,
              required: true,
              placeholder: 'List required capabilities'
            },
            {
              id: 'sc_management_systems',
              question: 'What management systems and measures matter most?',
              type: 'textarea',
              order: 5,
              required: true,
              placeholder: 'Describe key systems and measures'
            }
          ]
        },
        {
          id: 'self_assessment',
          name: 'Self Assessment',
          description: 'Evaluate your business skills and abilities',
          order: 4,
          required: true,
          questions: [
            {
              id: 'sa_strengths',
              question: 'What are your key strengths?',
              type: 'textarea',
              order: 1,
              required: true,
              placeholder: 'List your main strengths'
            },
            {
              id: 'sa_improvement_areas',
              question: 'What areas need improvement?',
              type: 'textarea',
              order: 2,
              required: true,
              placeholder: 'Identify areas for development'
            },
            {
              id: 'sa_leadership_skills',
              question: 'Rate your leadership skills (1-10)',
              type: 'rating',
              order: 3,
              required: true,
              validation: { min_value: 1, max_value: 10 }
            },
            {
              id: 'sa_marketing_ability',
              question: 'Rate your marketing ability (1-10)',
              type: 'rating',
              order: 4,
              required: true,
              validation: { min_value: 1, max_value: 10 }
            },
            {
              id: 'sa_sales_ability',
              question: 'Rate your sales ability (1-10)',
              type: 'rating',
              order: 5,
              required: true,
              validation: { min_value: 1, max_value: 10 }
            },
            {
              id: 'sa_accounting_understanding',
              question: 'Rate your accounting understanding (1-10)',
              type: 'rating',
              order: 6,
              required: true,
              validation: { min_value: 1, max_value: 10 }
            }
          ]
        },
        {
          id: 'sars_compliance',
          name: 'SARS Compliance',
          description: 'Tax compliance and regulatory status',
          order: 5,
          required: true,
          questions: [
            {
              id: 'sars_tax_clearance',
              question: 'Do you have a valid tax clearance certificate?',
              type: 'yesno',
              order: 1,
              required: true
            },
            {
              id: 'sars_vat_status',
              question: 'What is your VAT registration status?',
              type: 'dropdown',
              order: 2,
              required: true,
              options: [
                { value: 'compliant', label: 'Compliant' },
                { value: 'non_compliant', label: 'Non-compliant' },
                { value: 'not_applicable', label: 'Not applicable' }
              ]
            },
            {
              id: 'sars_paye_status',
              question: 'What is your PAYE status?',
              type: 'dropdown',
              order: 3,
              required: true,
              options: [
                { value: 'compliant', label: 'Compliant' },
                { value: 'non_compliant', label: 'Non-compliant' },
                { value: 'not_applicable', label: 'Not applicable' }
              ]
            },
            {
              id: 'sars_income_tax_status',
              question: 'What is your income tax status?',
              type: 'dropdown',
              order: 4,
              required: true,
              options: [
                { value: 'compliant', label: 'Compliant' },
                { value: 'non_compliant', label: 'Non-compliant' },
                { value: 'not_applicable', label: 'Not applicable' }
              ]
            },
            {
              id: 'sars_outstanding_issues',
              question: 'Do you have any outstanding issues with SARS?',
              type: 'yesno',
              order: 5,
              required: true
            },
            {
              id: 'sars_compliance_notes',
              question: 'Additional compliance notes',
              type: 'textarea',
              order: 6,
              required: false,
              placeholder: 'Any additional information about your tax compliance'
            }
          ]
        }
      ]
    };

    return of(questionnaire);
  }

  /**
   * Get consolidated assessment for a company
   */
  getConsolidatedAssessment(companyId: number): Observable<any> {
    // Get consolidated assessment nodes for this company
    return this.nodeService.getNodesByCompany(companyId, 'consolidated_assessment').pipe(
      map(nodes => {
        if (nodes && nodes.length > 0) {
          // Get the most recent assessment node
          const latestAssessment = nodes.sort((a, b) =>
            new Date(b.updated_at || b.created_at || '').getTime() -
            new Date(a.updated_at || a.created_at || '').getTime()
          )[0];

          // Extract the nested data structure
          const assessmentData = latestAssessment.data;

          return {
            responses: assessmentData.responses || {}, // Get responses from nested structure
            metadata: {
              last_updated: assessmentData.updated_at || latestAssessment.updated_at || latestAssessment.created_at,
              completion_status: assessmentData.metadata?.is_complete ? 'completed' : 'in_progress',
              progress_percentage: assessmentData.metadata?.overall_completion_percentage || 0,
              node_id: latestAssessment.id,
              total_questions: assessmentData.metadata?.total_questions || 0,
              answered_questions: assessmentData.metadata?.total_answered_questions || 0,
              section_completion: assessmentData.section_completion || {}
            }
          };
        }

        // Return empty structure if no assessment found
        return {
          responses: {},
          metadata: {
            last_updated: null,
            completion_status: 'not_started',
            progress_percentage: 0,
            node_id: null
          }
        };
      })
    );
  }

  /**
   * Save responses for current section
   */
  savePartialResponse(
    companyId: number,
    responses: { [questionId: string]: any },
    currentSectionId: string,
    metadata?: any
  ): Observable<boolean> {
    // For now, just return success - implement actual saving later
    console.log('Saving responses:', { companyId, responses, currentSectionId });
    return of(true);
  }

  /**
   * Update current section
   */
  updateCurrentSection(companyId: number, sectionId: string): Observable<boolean> {
    console.log('Updating current section:', { companyId, sectionId });
    return of(true);
  }

  /**
   * Calculate progress across all sections
   */
  calculateProgress(
    questionnaire: BusinessQuestionnaire,
    responses: { [questionId: string]: any }
  ): QuestionnaireProgress {
    const totalQuestions = questionnaire.sections.reduce((total, section) => total + section.questions.length, 0);
    const answeredQuestions = Object.values(responses).filter(response =>
      response !== null && response !== undefined && response !== ''
    ).length;

    return {
      total_questions: totalQuestions,
      answered_questions: answeredQuestions,
      total_sections: questionnaire.sections.length,
      completed_sections: 0,
      progress_percentage: totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0
    };
  }

  /**
   * Mark section as complete
   */
  markSectionComplete(
    companyId: number,
    sectionId: string,
    responses: { [questionId: string]: any }
  ): Observable<boolean> {
    console.log('Marking section complete:', { companyId, sectionId, responses });
    return of(true);
  }

  /**
   * Calculate progress percentage from node data
   */
  private calculateProgressFromNodeData(data: any): number {
    if (!data || typeof data !== 'object') {
      return 0;
    }

    // Count non-empty responses in the data object
    const responses = Object.values(data);
    const answeredCount = responses.filter(response => {
      return response !== null &&
             response !== undefined &&
             response !== '' &&
             response !== 0; // Allow 0 as a valid answer for numeric fields
    }).length;

    // Estimate total questions based on our questionnaire structure (20+ questions)
    const estimatedTotalQuestions = 25;

    return Math.round((answeredCount / estimatedTotalQuestions) * 100);
  }

  /**
   * Calculate progress percentage from responses array
   */
  private calculateProgressPercentage(responses: any[]): number {
    if (!responses || responses.length === 0) {
      return 0;
    }

    // Count responses that have meaningful values
    const answeredCount = responses.filter(response => {
      return response.value_text ||
             response.value_num !== null ||
             response.value_date ||
             response.value_bool !== null ||
             response.value_json ||
             response.file_url;
    }).length;

    // Estimate total questions based on our questionnaire structure (20+ questions)
    const estimatedTotalQuestions = 25;

    return Math.round((answeredCount / estimatedTotalQuestions) * 100);
  }
}
