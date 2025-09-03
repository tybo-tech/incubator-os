// utils/assessment-data-migrator.ts

import { ConsolidatedAssessmentResponse } from '../models/consolidated-assessment.models';

/**
 * Utility to convert the answers.json data to consolidated format
 * This can be used to migrate existing data
 */
export class AssessmentDataMigrator {

  /**
   * Convert answers.json data to consolidated assessment format
   */
  static convertAnswersJsonToConsolidated(
    answersData: any[],
    companyId: number
  ): ConsolidatedAssessmentResponse {

    const responses: { [questionId: string]: any } = {};
    const sectionCompletion: { [sectionId: string]: any } = {};

    let totalAnswered = 0;
    let earliestDate = new Date().toISOString();
    let latestDate = new Date().toISOString();

    // Process each section from the answers data
    answersData.forEach(sectionData => {
      const data = sectionData.data;
      const sectionId = data.section_id;

      // Track dates
      if (data.response_date && data.response_date < earliestDate) {
        earliestDate = data.response_date;
      }
      if (data.last_updated && data.last_updated > latestDate) {
        latestDate = data.last_updated;
      }

      // Extract responses
      if (data.question_responses) {
        data.question_responses.forEach((qr: any) => {
          responses[qr.question_id] = qr.value;
          totalAnswered++;
        });
      }

      // Build section completion
      sectionCompletion[sectionId] = {
        section_id: sectionId,
        is_complete: data.is_complete || false,
        last_updated: data.last_updated || data.response_date,
        completed_at: data.completed_date,
        answered_questions: data.question_responses?.length || 0,
        total_questions: this.getSectionQuestionCount(sectionId)
      };
    });

    // Calculate totals
    const totalQuestions = Object.values(sectionCompletion)
      .reduce((sum: number, sc: any) => sum + sc.total_questions, 0);

    const overallPercentage = totalQuestions > 0
      ? Math.round((totalAnswered / totalQuestions) * 100)
      : 0;

    const isComplete = Object.values(sectionCompletion)
      .every((sc: any) => sc.is_complete);

    return {
      id: `assessment_${companyId}_business-assessment-v1`,
      company_id: companyId,
      questionnaire_id: 'business-assessment-v1',
      responses,
      section_completion: sectionCompletion,
      metadata: {
        current_section_index: 0,
        overall_completion_percentage: overallPercentage,
        total_answered_questions: totalAnswered,
        total_questions: totalQuestions,
        is_complete: isComplete,
        started_at: earliestDate,
        last_activity: latestDate
      },
      created_at: earliestDate,
      updated_at: latestDate,
      completed_at: isComplete ? latestDate : undefined
    };
  }

  /**
   * Get expected question count for each section
   * These numbers should match your questionnaire definition
   */
  private static getSectionQuestionCount(sectionId: string): number {
    const questionCounts: { [key: string]: number } = {
      'introduction': 4,
      'products_services': 4,
      'strategy_cascade': 5,
      'self_assessment': 6,
      'sars_compliance': 6
    };

    return questionCounts[sectionId] || 0;
  }

  /**
   * Generate migration script for existing data
   */
  static generateMigrationScript(answersData: any[], companyId: number): string {
    const consolidated = this.convertAnswersJsonToConsolidated(answersData, companyId);

    return `
-- Migration script for Company ${companyId} Assessment Data
-- Generated on ${new Date().toISOString()}

-- Insert consolidated assessment record
INSERT INTO nodes (company_id, type, data, created_at, updated_at) VALUES (
  ${companyId},
  'consolidated_assessment',
  '${JSON.stringify(consolidated, null, 2)}',
  '${consolidated.created_at}',
  '${consolidated.updated_at}'
);

-- Optional: Remove old section-based records after verification
-- DELETE FROM nodes WHERE company_id = ${companyId} AND type LIKE 'assessment_%' AND type != 'consolidated_assessment';
`;
  }

  /**
   * Validate migrated data integrity
   */
  static validateMigratedData(
    originalData: any[],
    consolidatedData: ConsolidatedAssessmentResponse
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check response count
    const originalResponseCount = originalData.reduce((sum, section) =>
      sum + (section.data.question_responses?.length || 0), 0
    );

    const consolidatedResponseCount = Object.keys(consolidatedData.responses).length;

    if (originalResponseCount !== consolidatedResponseCount) {
      errors.push(`Response count mismatch: original=${originalResponseCount}, consolidated=${consolidatedResponseCount}`);
    }

    // Check section count
    const originalSectionCount = originalData.length;
    const consolidatedSectionCount = Object.keys(consolidatedData.section_completion).length;

    if (originalSectionCount !== consolidatedSectionCount) {
      errors.push(`Section count mismatch: original=${originalSectionCount}, consolidated=${consolidatedSectionCount}`);
    }

    // Validate specific responses
    originalData.forEach(section => {
      const sectionId = section.data.section_id;

      if (!consolidatedData.section_completion[sectionId]) {
        errors.push(`Missing section in consolidated data: ${sectionId}`);
      }

      section.data.question_responses?.forEach((qr: any) => {
        if (consolidatedData.responses[qr.question_id] !== qr.value) {
          errors.push(`Response value mismatch for ${qr.question_id}: original=${qr.value}, consolidated=${consolidatedData.responses[qr.question_id]}`);
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
