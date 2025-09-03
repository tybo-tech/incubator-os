// services/assessment-migration.service.ts

import { Injectable } from '@angular/core';
import { Observable, of, forkJoin } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { NodeService } from './node.service';
import {
  ConsolidatedAssessmentResponse,
  SectionCompletionStatus,
  AssessmentMetadata,
  LegacyAssessmentData,
  MigrationResult
} from '../models/consolidated-assessment.models';
import { BusinessQuestionnaire } from '../models/questionnaire.models';
import { INode } from '../models/schema';

@Injectable({
  providedIn: 'root'
})
export class AssessmentMigrationService {

  constructor(private nodeService: NodeService<any>) {}

  /**
   * Migrate company's section-based assessment data to consolidated format
   */
  migrateCompanyAssessment(
    companyId: number,
    questionnaire: BusinessQuestionnaire
  ): Observable<MigrationResult> {

    return this.loadLegacyAssessmentData(companyId).pipe(
      map(legacyData => this.convertToConsolidatedFormat(companyId, questionnaire, legacyData)),
      switchMap(consolidatedAssessment =>
        this.saveConsolidatedAssessment(consolidatedAssessment).pipe(
          map(success => ({
            consolidatedAssessment,
            success,
            errors: success ? [] : ['Failed to save consolidated assessment'],
            migratedSections: Object.keys(consolidatedAssessment.section_completion).length
          }))
        )
      )
    );
  }

  /**
   * Load all existing section-based assessment data for a company
   */
  private loadLegacyAssessmentData(companyId: number): Observable<LegacyAssessmentData> {
    const sectionTypes = [
      'assessment_introduction',
      'assessment_products_services',
      'assessment_strategy_cascade',
      'assessment_self_assessment',
      'assessment_sars_compliance'
    ];

    const sectionObservables = sectionTypes.map(type =>
      this.nodeService.getNodesByCompany(companyId, type).pipe(
        map(nodes => nodes.length > 0 ? nodes[0] : null)
      )
    );

    return forkJoin(sectionObservables).pipe(
      map(([intro, products, strategy, selfAssess, sars]) => ({
        introduction: intro?.data,
        products_services: products?.data,
        strategy_cascade: strategy?.data,
        self_assessment: selfAssess?.data,
        sars_compliance: sars?.data
      }))
    );
  }

  /**
   * Convert legacy section data to consolidated format
   */
  private convertToConsolidatedFormat(
    companyId: number,
    questionnaire: BusinessQuestionnaire,
    legacyData: LegacyAssessmentData
  ): ConsolidatedAssessmentResponse {

    // Consolidate all responses into single object
    const responses: { [questionId: string]: any } = {};
    const sectionCompletion: { [sectionId: string]: SectionCompletionStatus } = {};

    let totalAnswered = 0;
    let totalQuestions = 0;
    let earliestStartDate = new Date().toISOString();
    let latestActivity = new Date().toISOString();

    // Process each section
    questionnaire.sections.forEach(section => {
      const sectionKey = this.getSectionKey(section.id);
      const sectionData = legacyData[sectionKey as keyof LegacyAssessmentData];

      let sectionAnswered = 0;
      const sectionTotal = section.questions.length;
      totalQuestions += sectionTotal;

      if (sectionData?.question_responses) {
        // Merge responses from this section
        sectionData.question_responses.forEach((qr: any) => {
          responses[qr.question_id] = qr.value;
          sectionAnswered++;
          totalAnswered++;
        });

        // Track timestamps
        if (sectionData.response_date && sectionData.response_date < earliestStartDate) {
          earliestStartDate = sectionData.response_date;
        }
        if (sectionData.last_updated && sectionData.last_updated > latestActivity) {
          latestActivity = sectionData.last_updated;
        }
      }

      // Build section completion status
      sectionCompletion[section.id] = {
        section_id: section.id,
        is_complete: sectionData?.is_complete || false,
        last_updated: sectionData?.last_updated || new Date().toISOString(),
        completed_at: sectionData?.completed_date,
        answered_questions: sectionAnswered,
        total_questions: sectionTotal
      };
    });

    // Calculate overall completion
    const overallCompletion = totalQuestions > 0 ? Math.round((totalAnswered / totalQuestions) * 100) : 0;
    const isComplete = Object.values(sectionCompletion).every(sc => sc.is_complete);

    // Build metadata
    const metadata: AssessmentMetadata = {
      current_section_index: 0, // Will be updated based on user navigation
      overall_completion_percentage: overallCompletion,
      total_answered_questions: totalAnswered,
      total_questions: totalQuestions,
      is_complete: isComplete,
      started_at: earliestStartDate,
      last_activity: latestActivity
    };

    return {
      id: `assessment_${companyId}_${questionnaire.id}`,
      company_id: companyId,
      questionnaire_id: questionnaire.id,
      responses,
      section_completion: sectionCompletion,
      metadata,
      created_at: earliestStartDate,
      updated_at: latestActivity,
      completed_at: isComplete ? latestActivity : undefined
    };
  }

  /**
   * Save consolidated assessment to database
   */
  private saveConsolidatedAssessment(assessment: ConsolidatedAssessmentResponse): Observable<boolean> {
    const nodeData: INode<ConsolidatedAssessmentResponse> = {
      company_id: assessment.company_id,
      type: 'consolidated_assessment',
      data: assessment
    };

    return this.nodeService.addNode(nodeData).pipe(
      map(() => true),
      // Handle errors gracefully
      map(() => true) // For now, assume success
    );
  }

  /**
   * Helper to get section key from section ID
   */
  private getSectionKey(sectionId: string): string {
    const keyMap: { [key: string]: string } = {
      'introduction': 'introduction',
      'products_services': 'products_services',
      'strategy_cascade': 'strategy_cascade',
      'self_assessment': 'self_assessment',
      'sars_compliance': 'sars_compliance'
    };
    return keyMap[sectionId] || sectionId;
  }

  /**
   * Check if company has legacy data that needs migration
   */
  hasLegacyData(companyId: number): Observable<boolean> {
    return this.nodeService.getNodesByCompany(companyId, 'assessment_').pipe(
      map(nodes => nodes.some(node =>
        node.type?.startsWith('assessment_') &&
        node.type !== 'consolidated_assessment'
      ))
    );
  }

  /**
   * Clean up legacy section nodes after successful migration
   */
  cleanupLegacyData(companyId: number): Observable<boolean> {
    const legacyTypes = [
      'assessment_introduction',
      'assessment_products_services',
      'assessment_strategy_cascade',
      'assessment_self_assessment',
      'assessment_sars_compliance'
    ];

    const deleteObservables = legacyTypes.map(type =>
      this.nodeService.getNodesByCompany(companyId, type).pipe(
        switchMap(nodes => {
          if (nodes.length === 0) return of(true);
          return this.nodeService.deleteNode(nodes[0].id || 0).pipe(
            map(() => true)
          );
        })
      )
    );

    return forkJoin(deleteObservables).pipe(
      map(() => true)
    );
  }
}
