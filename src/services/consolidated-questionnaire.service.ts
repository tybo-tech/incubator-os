// services/consolidated-questionnaire.service.ts

import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { NodeService } from './node.service';
import {
  ConsolidatedAssessmentResponse,
  SectionCompletionStatus,
  AssessmentMetadata
} from '../models/consolidated-assessment.models';
import {
  BusinessQuestionnaire,
  QuestionnaireProgress,
  QuestionnaireSection
} from '../models/questionnaire.models';
import { AssessmentMigrationService } from './assessment-migration.service';
import { QuestionnaireService } from './questionnaire.service';

@Injectable({
  providedIn: 'root'
})
export class ConsolidatedQuestionnaireService {

  // Cache for consolidated assessment data
  private assessmentCache$ = new BehaviorSubject<ConsolidatedAssessmentResponse | null>(null);

  constructor(
    private nodeService: NodeService<any>,
    private migrationService: AssessmentMigrationService,
    private originalQuestionnaireService: QuestionnaireService
  ) {}

  /**
   * Get consolidated assessment for a company
   * Will migrate legacy data if needed
   */
  getConsolidatedAssessment(companyId: number): Observable<ConsolidatedAssessmentResponse | null> {
    return this.loadConsolidatedAssessment(companyId).pipe(
      switchMap(existing => {
        if (existing) {
          this.assessmentCache$.next(existing);
          return of(existing);
        }

        // Check if we need to migrate legacy data
        return this.migrationService.hasLegacyData(companyId).pipe(
          switchMap(hasLegacy => {
            if (hasLegacy) {
              return this.migrateAndReturnAssessment(companyId);
            }
            // No existing data, return null
            return of(null);
          })
        );
      })
    );
  }

  /**
   * Get all responses for a company as a flat object
   */
  getAllResponses(companyId: number): Observable<{ [questionId: string]: any }> {
    return this.getConsolidatedAssessment(companyId).pipe(
      map(assessment => assessment?.responses || {})
    );
  }

  /**
   * Get responses for a specific section
   */
  getSectionResponses(
    companyId: number,
    sectionId: string
  ): Observable<{ [questionId: string]: any }> {
    return this.getConsolidatedAssessment(companyId).pipe(
      switchMap(assessment => {
        if (!assessment) return of({});

        // Filter responses for this section by checking question IDs
        // This requires the questionnaire to determine which questions belong to which section
        return this.originalQuestionnaireService.getBusinessAssessmentQuestionnaire().pipe(
          map(questionnaire => {
            const section = questionnaire.sections.find(s => s.id === sectionId);
            if (!section) return {};

            const sectionResponses: { [questionId: string]: any } = {};
            section.questions.forEach(q => {
              if (assessment.responses[q.id] !== undefined) {
                sectionResponses[q.id] = assessment.responses[q.id];
              }
            });
            return sectionResponses;
          })
        );
      })
    );
  }

  /**
   * Save responses for current section
   */
  savePartialResponse(
    companyId: number,
    questionnaireId: string,
    sectionId: string,
    responses: { [questionId: string]: any }
  ): Observable<boolean> {
    return this.getConsolidatedAssessment(companyId).pipe(
      switchMap(existing => {
        const updated = this.updateAssessmentResponses(
          existing,
          companyId,
          questionnaireId,
          sectionId,
          responses
        );

        return this.saveConsolidatedAssessment(updated).pipe(
          tap(success => {
            if (success) {
              this.assessmentCache$.next(updated);
            }
          })
        );
      })
    );
  }

  /**
   * Mark section as complete
   */
  markSectionComplete(
    companyId: number,
    questionnaireId: string,
    sectionId: string
  ): Observable<boolean> {
    return this.getConsolidatedAssessment(companyId).pipe(
      switchMap(existing => {
        if (!existing) return of(false);

        // Update section completion status
        const updated = {
          ...existing,
          section_completion: {
            ...existing.section_completion,
            [sectionId]: {
              ...existing.section_completion[sectionId],
              is_complete: true,
              completed_at: new Date().toISOString()
            }
          },
          updated_at: new Date().toISOString()
        };

        // Check if all sections are complete
        const allComplete = Object.values(updated.section_completion)
          .every(sc => sc.is_complete);

        if (allComplete) {
          updated.metadata.is_complete = true;
          updated.completed_at = new Date().toISOString();
        }

        return this.saveConsolidatedAssessment(updated).pipe(
          tap(success => {
            if (success) {
              this.assessmentCache$.next(updated);
            }
          })
        );
      })
    );
  }

  /**
   * Calculate progress from consolidated assessment
   */
  calculateProgress(
    questionnaire: BusinessQuestionnaire,
    responses: { [questionId: string]: any }
  ): QuestionnaireProgress {
    let totalQuestions = 0;
    let answeredQuestions = 0;

    questionnaire.sections.forEach(section => {
      section.questions.forEach(question => {
        totalQuestions++;
        const value = responses[question.id];
        if (value !== undefined && value !== null && value !== '') {
          answeredQuestions++;
        }
      });
    });

    return {
      total_questions: totalQuestions,
      answered_questions: answeredQuestions,
      progress_percentage: totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0,
      completed_sections: questionnaire.sections.filter(section =>
        section.questions.every(q => {
          const value = responses[q.id];
          return !q.required || (value !== undefined && value !== null && value !== '');
        })
      ).length,
      total_sections: questionnaire.sections.length
    };
  }

  /**
   * Update current section index
   */
  updateCurrentSection(companyId: number, sectionIndex: number): Observable<boolean> {
    return this.getConsolidatedAssessment(companyId).pipe(
      switchMap(existing => {
        if (!existing) return of(false);

        const updated = {
          ...existing,
          metadata: {
            ...existing.metadata,
            current_section_index: sectionIndex,
            last_activity: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        };

        return this.saveConsolidatedAssessment(updated).pipe(
          tap(success => {
            if (success) {
              this.assessmentCache$.next(updated);
            }
          })
        );
      })
    );
  }

  // Private helper methods

  private loadConsolidatedAssessment(companyId: number): Observable<ConsolidatedAssessmentResponse | null> {
    return this.nodeService.getNodesByCompany(companyId, 'consolidated_assessment').pipe(
      map(nodes => {
        const node = nodes.find(n => n.type === 'consolidated_assessment');
        return node?.data || null;
      })
    );
  }

  private migrateAndReturnAssessment(companyId: number): Observable<ConsolidatedAssessmentResponse | null> {
    return this.originalQuestionnaireService.getBusinessAssessmentQuestionnaire().pipe(
      switchMap(questionnaire =>
        this.migrationService.migrateCompanyAssessment(companyId, questionnaire).pipe(
          map(result => {
            if (result.success) {
              this.assessmentCache$.next(result.consolidatedAssessment);
              return result.consolidatedAssessment;
            }
            return null;
          })
        )
      )
    );
  }

  private updateAssessmentResponses(
    existing: ConsolidatedAssessmentResponse | null,
    companyId: number,
    questionnaireId: string,
    sectionId: string,
    newResponses: { [questionId: string]: any }
  ): ConsolidatedAssessmentResponse {

    if (!existing) {
      // Create new assessment
      existing = this.createEmptyAssessment(companyId, questionnaireId);
    }

    // Merge new responses
    const updatedResponses = {
      ...existing.responses,
      ...newResponses
    };

    // Update section completion
    const updatedSectionCompletion = {
      ...existing.section_completion,
      [sectionId]: {
        ...existing.section_completion[sectionId],
        last_updated: new Date().toISOString(),
        answered_questions: Object.keys(newResponses).length
      }
    };

    // Recalculate metadata
    const totalAnswered = Object.keys(updatedResponses).length;
    const overallPercentage = existing.metadata.total_questions > 0
      ? Math.round((totalAnswered / existing.metadata.total_questions) * 100)
      : 0;

    return {
      ...existing,
      responses: updatedResponses,
      section_completion: updatedSectionCompletion,
      metadata: {
        ...existing.metadata,
        total_answered_questions: totalAnswered,
        overall_completion_percentage: overallPercentage,
        last_activity: new Date().toISOString()
      },
      updated_at: new Date().toISOString()
    };
  }

  private createEmptyAssessment(companyId: number, questionnaireId: string): ConsolidatedAssessmentResponse {
    const now = new Date().toISOString();

    return {
      id: `assessment_${companyId}_${questionnaireId}`,
      company_id: companyId,
      questionnaire_id: questionnaireId,
      responses: {},
      section_completion: {},
      metadata: {
        current_section_index: 0,
        overall_completion_percentage: 0,
        total_answered_questions: 0,
        total_questions: 0,
        is_complete: false,
        started_at: now,
        last_activity: now
      },
      created_at: now,
      updated_at: now
    };
  }

  private saveConsolidatedAssessment(assessment: ConsolidatedAssessmentResponse): Observable<boolean> {
    return this.nodeService.getNodesByCompany(assessment.company_id, 'consolidated_assessment').pipe(
      switchMap(existingNodes => {
        const existingNode = existingNodes.find(n => n.type === 'consolidated_assessment');

        if (existingNode) {
          // Update existing
          return this.nodeService.updateNode({
            ...existingNode,
            data: assessment
          }).pipe(map(() => true));
        } else {
          // Create new
          return this.nodeService.addNode({
            company_id: assessment.company_id,
            type: 'consolidated_assessment',
            data: assessment
          }).pipe(map(() => true));
        }
      })
    );
  }
}
