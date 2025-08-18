// services/questionnaire.service.ts

import { Injectable } from '@angular/core';
import { Observable, of, forkJoin, map } from 'rxjs';
import {
  BusinessQuestionnaire,
  QuestionnaireSection,
  QuestionnaireQuestion,
  QuestionnaireResponse,
  QuestionnaireProgress,
  QuestionType
} from '../models/questionnaire.models';
import { NodeService } from './node.service';
import { INode } from '../models/schema';

@Injectable({
  providedIn: 'root'
})
export class QuestionnaireService {

  constructor(private nodeService: NodeService<any>) { }

  /**
   * Get the main business assessment questionnaire
   */
  getBusinessAssessmentQuestionnaire(): Observable<BusinessQuestionnaire> {
    const questionnaire: BusinessQuestionnaire = {
      id: 'business-assessment-v1',
      name: 'Business Assessment Questionnaire',
      description: 'Comprehensive business evaluation and strategic planning questionnaire',
      version: '1.0',
      type: 'assessment',
      is_active: true,
      sections: [
        this.getIntroductionSection(),
        this.getProductsServicesSection(),
        this.getStrategyCascadeSection(),
        this.getSelfAssessmentSection(),
        this.getSarsComplianceSection()
      ]
    };

    return of(questionnaire);
  }

  /**
   * Get questionnaire by ID
   */
  getQuestionnaire(id: string): Observable<BusinessQuestionnaire | null> {
    if (id === 'business-assessment-v1') {
      return this.getBusinessAssessmentQuestionnaire();
    }
    return of(null);
  }

  /**
   * Get section by ID
   */
  getSection(sectionId: string): Observable<QuestionnaireSection | null> {
    return new Observable(observer => {
      this.getBusinessAssessmentQuestionnaire().subscribe(questionnaire => {
        const section = questionnaire.sections.find(s => s.id === sectionId);
        observer.next(section || null);
        observer.complete();
      });
    });
  }

  /**
   * Save questionnaire response
   */
  saveResponse(response: QuestionnaireResponse): Observable<QuestionnaireResponse> {
    if (!response.company_id) {
      throw new Error('Company ID is required');
    }

    // Save each section response as a separate node
    const saveOperations = response.section_responses.map(sectionResponse => {
      const nodeData = {
        company_id: parseInt(response.company_id),
        type: `assessment_${sectionResponse.section_id}`,
        data: {
          questionnaire_id: response.questionnaire_id,
          section_id: sectionResponse.section_id,
          question_responses: sectionResponse.question_responses,
          is_complete: sectionResponse.is_complete,
          completed_date: sectionResponse.completed_date,
          response_date: response.response_date,
          completed_by: response.completed_by
        }
      } as INode<any>;

      return this.nodeService.addNode(nodeData);
    });

    return forkJoin(saveOperations).pipe(
      map(() => response)
    );
  }

  /**
   * Update existing questionnaire response
   */
  updateResponse(response: QuestionnaireResponse, existingNodes: INode<any>[]): Observable<QuestionnaireResponse> {
    const updateOperations = response.section_responses.map(sectionResponse => {
      const existingNode = existingNodes.find(node =>
        node.data?.section_id === sectionResponse.section_id
      );

      const nodeData = {
        questionnaire_id: response.questionnaire_id,
        section_id: sectionResponse.section_id,
        question_responses: sectionResponse.question_responses,
        is_complete: sectionResponse.is_complete,
        completed_date: sectionResponse.completed_date,
        response_date: response.response_date,
        completed_by: response.completed_by
      };

      if (existingNode) {
        // Update existing node
        return this.nodeService.updateNode({
          ...existingNode,
          data: nodeData
        });
      } else {
        // Create new node
        return this.nodeService.addNode({
          company_id: parseInt(response.company_id),
          type: `assessment_${sectionResponse.section_id}`,
          data: nodeData
        } as INode<any>);
      }
    });

    return forkJoin(updateOperations).pipe(
      map(() => response)
    );
  }

  /**
   * Get questionnaire response for a company
   */
  getResponse(companyId: string, questionnaireId: string): Observable<QuestionnaireResponse | null> {
    const companyIdNum = parseInt(companyId);

    // Get all assessment nodes for this company
    return this.nodeService.getNodesByCompany(companyIdNum, 'assessment_%').pipe(
      map(nodes => {
        if (!nodes || nodes.length === 0) {
          return null;
        }

        // Filter nodes for this specific questionnaire
        const questionnaireNodes = nodes.filter(node =>
          node.data?.questionnaire_id === questionnaireId
        );

        if (questionnaireNodes.length === 0) {
          return null;
        }

        // Group nodes by section
        const sectionResponses = questionnaireNodes.map(node => ({
          section_id: node.data.section_id,
          question_responses: node.data.question_responses || [],
          is_complete: node.data.is_complete || false,
          completed_date: node.data.completed_date
        }));

        // Create the response object
        const response: QuestionnaireResponse = {
          company_id: companyId,
          questionnaire_id: questionnaireId,
          section_responses: sectionResponses,
          response_date: new Date(questionnaireNodes[0].data.response_date || new Date()),
          completed_by: questionnaireNodes[0].data.completed_by,
          is_complete: sectionResponses.every(sr => sr.is_complete),
          completion_percentage: this.calculateCompletionPercentage(sectionResponses)
        };

        return response;
      })
    );
  }

  /**
   * Save partial responses (allows saving incomplete data)
   */
  savePartialResponse(companyId: string, questionnaireId: string, sectionId: string, responses: { [questionId: string]: any }): Observable<boolean> {
    const companyIdNum = parseInt(companyId);

    // First, try to get existing node for this section
    return this.nodeService.getNodesByCompany(companyIdNum, `assessment_${sectionId}`).pipe(
      map(nodes => {
        const existingNode = nodes.find(node =>
          node.data?.questionnaire_id === questionnaireId &&
          node.data?.section_id === sectionId
        );

        const questionResponses = Object.entries(responses).map(([questionId, value]) => ({
          question_id: questionId,
          value: value,
          response_date: new Date()
        }));

        const nodeData = {
          questionnaire_id: questionnaireId,
          section_id: sectionId,
          question_responses: questionResponses,
          is_complete: false, // Partial save, so not complete
          response_date: new Date(),
          last_updated: new Date()
        };

        if (existingNode) {
          // Update existing node
          this.nodeService.updateNode({
            ...existingNode,
            data: { ...existingNode.data, ...nodeData }
          }).subscribe();
        } else {
          // Create new node
          this.nodeService.addNode({
            company_id: companyIdNum,
            type: `assessment_${sectionId}`,
            data: nodeData
          } as INode<any>).subscribe();
        }

        return true;
      })
    );
  }

  /**
   * Get responses for a specific section
   */
  getSectionResponses(companyId: string, questionnaireId: string, sectionId: string): Observable<{ [questionId: string]: any }> {
    const companyIdNum = parseInt(companyId);

    return this.nodeService.getNodesByCompany(companyIdNum, `assessment_${sectionId}`).pipe(
      map(nodes => {
        const node = nodes.find(node =>
          node.data?.questionnaire_id === questionnaireId &&
          node.data?.section_id === sectionId
        );

        if (!node || !node.data?.question_responses) {
          return {};
        }

        // Convert question responses array to object
        const responses: { [questionId: string]: any } = {};
        node.data.question_responses.forEach((qr: any) => {
          responses[qr.question_id] = qr.value;
        });

        return responses;
      })
    );
  }

  /**
   * Mark section as complete
   */
  markSectionComplete(companyId: string, questionnaireId: string, sectionId: string): Observable<boolean> {
    const companyIdNum = parseInt(companyId);

    return this.nodeService.getNodesByCompany(companyIdNum, `assessment_${sectionId}`).pipe(
      map(nodes => {
        const existingNode = nodes.find(node =>
          node.data?.questionnaire_id === questionnaireId &&
          node.data?.section_id === sectionId
        );

        if (existingNode) {
          this.nodeService.updateNode({
            ...existingNode,
            data: {
              ...existingNode.data,
              is_complete: true,
              completed_date: new Date()
            }
          }).subscribe();
          return true;
        }

        return false;
      })
    );
  }

  private calculateCompletionPercentage(sectionResponses: any[]): number {
    if (sectionResponses.length === 0) return 0;

    const completedSections = sectionResponses.filter(sr => sr.is_complete).length;
    return Math.round((completedSections / sectionResponses.length) * 100);
  }

  /**
   * Calculate questionnaire progress
   */
  calculateProgress(questionnaire: BusinessQuestionnaire, responses: { [questionId: string]: any }): QuestionnaireProgress {
    let totalQuestions = 0;
    let answeredQuestions = 0;
    let completedSections = 0;

    questionnaire.sections.forEach(section => {
      let sectionAnswered = 0;
      let sectionTotal = section.questions.length;
      totalQuestions += sectionTotal;

      section.questions.forEach(question => {
        if (responses[question.id] !== undefined && responses[question.id] !== null && responses[question.id] !== '') {
          answeredQuestions++;
          sectionAnswered++;
        }
      });

      if (sectionAnswered === sectionTotal) {
        completedSections++;
      }
    });

    return {
      total_sections: questionnaire.sections.length,
      completed_sections: completedSections,
      total_questions: totalQuestions,
      answered_questions: answeredQuestions,
      progress_percentage: totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0
    };
  }

  /**
   * Private methods to define questionnaire sections
   */
  private getIntroductionSection(): QuestionnaireSection {
    return {
      id: 'introduction',
      name: 'Introduction to the Business',
      description: 'Basic information about your business, its purpose, and current state',
      order: 1,
      required: true,
      icon: 'building',
      color: 'blue',
      questions: [
        {
          id: 'intro_business_description',
          question: 'Briefly describe your business and what products you sell',
          type: 'textarea' as QuestionType,
          order: 1,
          required: true,
          placeholder: 'e.g., Health and wellness business focusing on natural way of healing...',
          validation: {
            min_length: 50,
            max_length: 1000,
            message: 'Please provide a detailed description between 50-1000 characters'
          }
        },
        {
          id: 'intro_business_motivation',
          question: 'Briefly describe why you started your business and tell us about the current state',
          type: 'textarea' as QuestionType,
          order: 2,
          required: true,
          placeholder: 'e.g., I saw how these treatments helped me with my own health issues...',
          validation: {
            min_length: 50,
            max_length: 1000,
            message: 'Please explain your motivation and current state in 50-1000 characters'
          }
        },
        // when did you register with CIPC
        {
          id: 'intro_registration_date',
          question: 'When did you register your business with CIPC?',
          type: 'date' as QuestionType,
          order: 3,
          required: true,
          validation: {
            message: 'Please provide a valid registration date'
          }
        },
        {
          id: 'intro_years_operation',
          question: 'How long have you been operating this business?',
          type: 'dropdown' as QuestionType,
          order: 3,
          required: true,
          options: [
            { value: 'less_than_1', label: 'Less than 1 year' },
            { value: '1_to_2', label: '1-2 years' },
            { value: '3_to_5', label: '3-5 years' },
            { value: '6_to_10', label: '6-10 years' },
            { value: 'more_than_10', label: 'More than 10 years' }
          ]
        },
        {
          id: 'intro_business_stage',
          question: 'What stage is your business currently in?',
          type: 'radio' as QuestionType,
          order: 4,
          required: true,
          options: [
            { value: 'idea', label: 'Idea stage' },
            { value: 'startup', label: 'Startup/Launch phase' },
            { value: 'growth', label: 'Growth phase' },
            { value: 'established', label: 'Established business' },
            { value: 'mature', label: 'Mature business' }
          ]
        }
      ]
    };
  }

  private getProductsServicesSection(): QuestionnaireSection {
    return {
      id: 'products_services',
      name: 'Products and Services',
      description: 'Details about the range of products and services you offer',
      order: 2,
      required: true,
      icon: 'package',
      color: 'green',
      questions: [
        {
          id: 'ps_offerings_list',
          question: 'List the range of products and services you offer here',
          type: 'textarea' as QuestionType,
          order: 1,
          required: true,
          placeholder: 'e.g., Colon hydrotherapy, ionic foot detox, red light therapy...',
          help_text: 'Please list each product or service separated by commas',
          validation: {
            min_length: 20,
            max_length: 2000
          }
        },
        {
          id: 'ps_primary_focus',
          question: 'What is your primary business focus?',
          type: 'dropdown' as QuestionType,
          order: 2,
          required: true,
          options: [
            { value: 'products', label: 'Products only' },
            { value: 'services', label: 'Services only' },
            { value: 'both_equal', label: 'Equal mix of products and services' },
            { value: 'products_primary', label: 'Primarily products with some services' },
            { value: 'services_primary', label: 'Primarily services with some products' }
          ]
        },
        {
          id: 'ps_target_market',
          question: 'Who is your target market?',
          type: 'textarea' as QuestionType,
          order: 3,
          required: false,
          placeholder: 'Describe your ideal customers and target demographic',
          validation: {
            max_length: 500
          }
        },
        {
          id: 'ps_revenue_streams',
          question: 'How many different revenue streams do you have?',
          type: 'dropdown' as QuestionType,
          order: 4,
          required: false,
          options: [
            { value: '1', label: '1 revenue stream' },
            { value: '2-3', label: '2-3 revenue streams' },
            { value: '4-5', label: '4-5 revenue streams' },
            { value: '6+', label: '6 or more revenue streams' }
          ]
        }
      ]
    };
  }

  private getStrategyCascadeSection(): QuestionnaireSection {
    return {
      id: 'strategy_cascade',
      name: 'Strategy Cascade',
      description: 'Strategic planning and business direction questions',
      order: 3,
      required: true,
      icon: 'target',
      color: 'purple',
      questions: [
        {
          id: 'sc_winning_aspiration',
          question: 'What is our winning aspiration? What is the purpose of the company? What are our Guiding aspirations?',
          type: 'textarea' as QuestionType,
          order: 1,
          required: true,
          placeholder: 'e.g., I want to have a retreat, for health & wellness all over the Country...',
          help_text: 'Describe your ultimate vision and purpose for the business',
          validation: {
            min_length: 100,
            max_length: 2000
          }
        },
        {
          id: 'sc_where_play',
          question: 'Where will we play? What geographies, demographics, product categories and consumer channels will we play in?',
          type: 'textarea' as QuestionType,
          order: 2,
          required: true,
          placeholder: 'e.g., We want to play all over South Africa. It should be places that are rich in natural resources...',
          validation: {
            min_length: 50,
            max_length: 1500
          }
        },
        {
          id: 'sc_how_win',
          question: 'How will we win in chosen markets? What are our value proposition and competitive advantages? What makes us unique?',
          type: 'textarea' as QuestionType,
          order: 3,
          required: true,
          placeholder: 'e.g., I will be focussing on not only physical but also mental health and spiritual side of things...',
          validation: {
            min_length: 50,
            max_length: 1500
          }
        },
        {
          id: 'sc_capabilities',
          question: 'What capabilities must we have? What are our core competencies, reinforcing activities and specific configurations?',
          type: 'textarea' as QuestionType,
          order: 4,
          required: true,
          placeholder: 'e.g., I need to get trained in activities like yoga and meditation...',
          validation: {
            min_length: 50,
            max_length: 1500
          }
        },
        {
          id: 'sc_management_systems',
          question: 'What management systems do we need? What systems, structures and measures do we have in place to support delivery to our client?',
          type: 'textarea' as QuestionType,
          order: 5,
          required: true,
          placeholder: 'e.g., Booking system linked with an invoicing systems. Start writing up a systems manual...',
          validation: {
            min_length: 50,
            max_length: 1500
          }
        }
      ]
    };
  }

  private getSelfAssessmentSection(): QuestionnaireSection {
    return {
      id: 'self_assessment',
      name: 'Self Assessment',
      description: 'Rate your current abilities and skills',
      order: 4,
      required: true,
      icon: 'user-check',
      color: 'orange',
      questions: [
        {
          id: 'sa_sales_ability',
          question: 'Sales Ability',
          type: 'rating' as QuestionType,
          order: 1,
          required: true,
          help_text: 'Rate your sales skills from 1 (poor) to 10 (excellent)',
          validation: {
            min_value: 1,
            max_value: 10
          }
        },
        {
          id: 'sa_marketing_ability',
          question: 'Marketing Ability',
          type: 'rating' as QuestionType,
          order: 2,
          required: true,
          help_text: 'Rate your marketing skills from 1 (poor) to 10 (excellent)',
          validation: {
            min_value: 1,
            max_value: 10
          }
        },
        {
          id: 'sa_accounting_understanding',
          question: 'Understanding of Accounting',
          type: 'rating' as QuestionType,
          order: 3,
          required: true,
          help_text: 'Rate your accounting knowledge from 1 (poor) to 10 (excellent)',
          validation: {
            min_value: 1,
            max_value: 10
          }
        },
        {
          id: 'sa_leadership_skills',
          question: 'Leadership Skills',
          type: 'rating' as QuestionType,
          order: 4,
          required: false,
          help_text: 'Rate your leadership abilities from 1 (poor) to 10 (excellent)',
          validation: {
            min_value: 1,
            max_value: 10
          }
        },
        {
          id: 'sa_strengths',
          question: 'What are your main strengths as a business owner?',
          type: 'textarea' as QuestionType,
          order: 5,
          required: false,
          placeholder: 'List your key strengths and abilities',
          validation: {
            max_length: 1000
          }
        },
        {
          id: 'sa_improvement_areas',
          question: 'What areas do you feel you need to improve in?',
          type: 'textarea' as QuestionType,
          order: 6,
          required: false,
          placeholder: 'List areas where you would like to develop further',
          validation: {
            max_length: 1000
          }
        }
      ]
    };
  }

  private getSarsComplianceSection(): QuestionnaireSection {
    return {
      id: 'sars_compliance',
      name: 'SARS Compliance Status',
      description: 'Your current standing with South African Revenue Service',
      order: 5,
      required: true,
      icon: 'file-check',
      color: 'red',
      questions: [
        {
          id: 'sars_vat_status',
          question: 'State of VAT',
          type: 'dropdown' as QuestionType,
          order: 1,
          required: true,
          options: [
            { value: 'compliant', label: 'Compliant' },
            { value: 'non_compliant', label: 'Non-Compliant' },
            { value: 'not_applicable', label: 'Not Applicable' },
            { value: 'pending', label: 'Pending Registration' }
          ]
        },
        {
          id: 'sars_paye_status',
          question: 'State of PAYE',
          type: 'dropdown' as QuestionType,
          order: 2,
          required: true,
          options: [
            { value: 'compliant', label: 'Compliant' },
            { value: 'non_compliant', label: 'Non-Compliant' },
            { value: 'not_applicable', label: 'Not Applicable' },
            { value: 'pending', label: 'Pending Registration' }
          ]
        },
        {
          id: 'sars_income_tax_status',
          question: 'State of Income Tax',
          type: 'dropdown' as QuestionType,
          order: 3,
          required: true,
          options: [
            { value: 'compliant', label: 'Compliant' },
            { value: 'non_compliant', label: 'Non-Compliant' },
            { value: 'not_applicable', label: 'Not Applicable' }
          ]
        },
        {
          id: 'sars_tax_clearance',
          question: 'Do you have a valid Tax Clearance Certificate?',
          type: 'yesno' as QuestionType,
          order: 4,
          required: true
        },
        {
          id: 'sars_compliance_notes',
          question: 'Please describe your current standing with SARS (additional details)',
          type: 'textarea' as QuestionType,
          order: 5,
          required: false,
          placeholder: 'Any additional information about your SARS compliance status',
          validation: {
            max_length: 1000
          }
        },
        {
          id: 'sars_outstanding_issues',
          question: 'Do you have any outstanding compliance issues?',
          type: 'yesno' as QuestionType,
          order: 6,
          required: false
        }
      ]
    };
  }
}
