// services/pdf/assessment-export.service.ts - Assessment PDF Export Service

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { QuestionnaireService } from '../questionnaire.service';
import {
  BusinessQuestionnaire,
  QuestionnaireSection,
  QuestionnaireQuestion
} from '../../models/questionnaire.models';
import { ICompany } from '../../models/simple.schema';

export interface ConsolidatedAssessment {
  id: number;
  type: string;
  company_id: number;
  data: {
    metadata: {
      last_updated: string;
      current_section: string;
      answered_questions: number;
      progress_percentage: number;
    };
    responses: { [questionId: string]: any };
    updated_at: string;
  };
  created_at: string;
  updated_at: string;
}

export interface AssessmentExportOptions {
  includeEmptyAnswers?: boolean;
  groupBySection?: boolean;
  includeMetadata?: boolean;
  customTitle?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AssessmentExportService {
  private readonly PDF_ENDPOINT = 'https://docs.tybo.co.za/pdf.php';

  constructor(
    private http: HttpClient,
    private questionnaireService: QuestionnaireService
  ) {}

  /**
   * Export assessment data as PDF
   */
  exportAssessmentPdf(
    company: ICompany,
    assessmentData: ConsolidatedAssessment,
    options: AssessmentExportOptions = {}
  ): Observable<void> {
    return this.questionnaireService.getBusinessAssessmentQuestionnaire().pipe(
      map(questionnaire => this.generateAssessmentHtml(company, assessmentData, questionnaire, options)),
      switchMap(html => this.generatePdf(html)),
      map(blob => this.downloadPdf(blob, `${company.name}_Assessment_Report.pdf`))
    );
  }

  /**
   * Generate HTML content for assessment PDF
   */
  private generateAssessmentHtml(
    company: ICompany,
    assessment: ConsolidatedAssessment,
    questionnaire: BusinessQuestionnaire,
    options: AssessmentExportOptions
  ): string {
    const { responses, metadata } = assessment.data;
    const sections = this.organizeResponsesBySection(questionnaire, responses);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Business Assessment Report - ${company.name}</title>
        <style>
          ${this.getAssessmentStyles()}
        </style>
      </head>
      <body>
        <div class="container">
          ${this.generateHeader(company, assessment, options)}
          ${this.generateMetadataSection(metadata, options)}
          ${this.generateSectionsContent(sections, options)}
          ${this.generateFooter()}
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Organize responses by questionnaire sections
   */
  private organizeResponsesBySection(
    questionnaire: BusinessQuestionnaire,
    responses: { [key: string]: any }
  ): Array<{
    section: QuestionnaireSection;
    questionAnswers: Array<{
      question: QuestionnaireQuestion;
      answer: any;
      displayAnswer: string;
    }>;
  }> {
    return questionnaire.sections.map(section => {
      const questionAnswers = section.questions
        .map(question => {
          const answer = responses[question.id];
          return {
            question,
            answer,
            displayAnswer: this.formatAnswer(answer, question)
          };
        })
        .filter(qa => qa.answer !== undefined && qa.answer !== null && qa.answer !== '');

      return { section, questionAnswers };
    }).filter(sectionData => sectionData.questionAnswers.length > 0);
  }

  /**
   * Format answer based on question type
   */
  private formatAnswer(answer: any, question: QuestionnaireQuestion): string {
    if (answer === undefined || answer === null || answer === '') {
      return 'Not answered';
    }

    switch (question.type) {
      case 'yesno':
        return answer === true || answer === 'true' ? 'Yes' : 'No';

      case 'rating':
      case 'scale':
        return `${answer}/10`;

      case 'dropdown':
      case 'radio':
        // Try to find the option label
        const option = question.options?.find(opt => opt.value === answer);
        return option ? option.label : String(answer);

      case 'checkbox':
        if (Array.isArray(answer)) {
          return answer.join(', ');
        }
        return String(answer);

      case 'date':
        if (answer) {
          const date = new Date(answer);
          return date.toLocaleDateString();
        }
        return String(answer);

      case 'currency':
        if (typeof answer === 'number') {
          return `R${answer.toLocaleString()}`;
        }
        return `R${answer}`;

      case 'percentage':
        return `${answer}%`;

      default:
        return String(answer);
    }
  }

  /**
   * Generate PDF header
   */
  private generateHeader(
    company: ICompany,
    assessment: ConsolidatedAssessment,
    options: AssessmentExportOptions
  ): string {
    const title = options.customTitle || 'Business Assessment Report';
    const reportDate = new Date().toLocaleDateString();
    const assessmentDate = new Date(assessment.updated_at).toLocaleDateString();

    return `
      <header class="header">
        <div class="header-content">
          <div class="company-info">
            <h1>${title}</h1>
            <h2>${company.name}</h2>
            <div class="company-details">
              <p><strong>Registration Number:</strong> ${company.registration_no || 'N/A'}</p>
              <p><strong>Service Offering:</strong> ${company.service_offering || 'N/A'}</p>
              <p><strong>Assessment Date:</strong> ${assessmentDate}</p>
              <p><strong>Report Generated:</strong> ${reportDate}</p>
            </div>
          </div>
          <div class="logo-section">
            <div class="assessment-badge">
              <div class="completion-circle">
                <span>${assessment.data.metadata.progress_percentage}%</span>
                <small>Complete</small>
              </div>
            </div>
          </div>
        </div>
      </header>
    `;
  }

  /**
   * Generate metadata section
   */
  private generateMetadataSection(
    metadata: any,
    options: AssessmentExportOptions
  ): string {
    if (!options.includeMetadata) return '';

    return `
      <section class="metadata-section">
        <h3>Assessment Summary</h3>
        <div class="metadata-grid">
          <div class="metadata-item">
            <span class="label">Progress:</span>
            <span class="value">${metadata.progress_percentage}% Complete</span>
          </div>
          <div class="metadata-item">
            <span class="label">Questions Answered:</span>
            <span class="value">${metadata.answered_questions}</span>
          </div>
          <div class="metadata-item">
            <span class="label">Current Section:</span>
            <span class="value">${this.formatSectionName(metadata.current_section)}</span>
          </div>
          <div class="metadata-item">
            <span class="label">Last Updated:</span>
            <span class="value">${new Date(metadata.last_updated).toLocaleDateString()}</span>
          </div>
        </div>
      </section>
    `;
  }

  /**
   * Generate sections content
   */
  private generateSectionsContent(
    sections: Array<{
      section: QuestionnaireSection;
      questionAnswers: Array<{
        question: QuestionnaireQuestion;
        answer: any;
        displayAnswer: string;
      }>;
    }>,
    options: AssessmentExportOptions
  ): string {
    return sections.map(({ section, questionAnswers }) => `
      <section class="assessment-section">
        <div class="section-header">
          <h3>${section.name}</h3>
          <span class="section-badge">${questionAnswers.length} responses</span>
        </div>

        ${section.description ? `<p class="section-description">${section.description}</p>` : ''}

        <div class="questions-table">
          <table>
            <thead>
              <tr>
                <th style="width: 60%;">Question</th>
                <th style="width: 40%;">Response</th>
              </tr>
            </thead>
            <tbody>
              ${questionAnswers.map(qa => `
                <tr>
                  <td class="question-cell">
                    <div class="question-text">${qa.question.question}</div>
                    ${qa.question.help_text ? `<div class="help-text">${qa.question.help_text}</div>` : ''}
                    <div class="question-meta">
                      <span class="question-type">${this.getQuestionTypeLabel(qa.question.type)}</span>
                      ${qa.question.required ? '<span class="required-badge">Required</span>' : ''}
                    </div>
                  </td>
                  <td class="answer-cell">
                    <div class="answer-text">${qa.displayAnswer}</div>
                    ${this.getAnswerInsight(qa.answer, qa.question)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>
    `).join('');
  }

  /**
   * Get answer insight/context
   */
  private getAnswerInsight(answer: any, question: QuestionnaireQuestion): string {
    if (question.type === 'rating' || question.type === 'scale') {
      const rating = Number(answer);
      if (rating >= 8) return '<span class="insight excellent">Excellent</span>';
      if (rating >= 6) return '<span class="insight good">Good</span>';
      if (rating >= 4) return '<span class="insight fair">Fair</span>';
      return '<span class="insight poor">Needs Improvement</span>';
    }

    if (question.type === 'yesno' && question.id.includes('compliance')) {
      const isCompliant = answer === true || answer === 'true';
      return isCompliant
        ? '<span class="insight excellent">Compliant</span>'
        : '<span class="insight warning">Non-Compliant</span>';
    }

    return '';
  }

  /**
   * Get question type label
   */
  private getQuestionTypeLabel(type: string): string {
    const typeLabels: { [key: string]: string } = {
      'text': 'Text',
      'textarea': 'Long Text',
      'number': 'Number',
      'email': 'Email',
      'phone': 'Phone',
      'url': 'URL',
      'date': 'Date',
      'dropdown': 'Selection',
      'radio': 'Single Choice',
      'checkbox': 'Multiple Choice',
      'rating': 'Rating',
      'scale': 'Scale',
      'yesno': 'Yes/No',
      'currency': 'Currency',
      'percentage': 'Percentage'
    };
    return typeLabels[type] || 'Text';
  }

  /**
   * Format section name
   */
  private formatSectionName(sectionId: string): string {
    return sectionId.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Generate footer
   */
  private generateFooter(): string {
    return `
      <footer class="footer">
        <div class="footer-content">
          <p>This assessment report was generated automatically from your business questionnaire responses.</p>
          <p>Generated on ${new Date().toLocaleDateString()} | Business Incubator Assessment System</p>
        </div>
      </footer>
    `;
  }

  /**
   * CSS styles for assessment PDF
   */
  private getAssessmentStyles(): string {
    return `
      @page {
        margin: 1cm;
        size: A4;
      }

      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 12px;
        line-height: 1.4;
        color: #333;
        background: white;
      }

      .container {
        max-width: 100%;
        margin: 0 auto;
      }

      /* Header Styles */
      .header {
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        color: white;
        padding: 20px;
        margin-bottom: 20px;
        border-radius: 8px;
      }

      .header-content {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }

      .company-info h1 {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 8px;
      }

      .company-info h2 {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 12px;
        color: #e0e7ff;
      }

      .company-details p {
        margin-bottom: 4px;
        font-size: 11px;
      }

      .assessment-badge {
        text-align: center;
      }

      .completion-circle {
        background: rgba(255, 255, 255, 0.2);
        border: 2px solid rgba(255, 255, 255, 0.5);
        border-radius: 50%;
        width: 80px;
        height: 80px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-weight: bold;
      }

      .completion-circle span {
        font-size: 18px;
      }

      .completion-circle small {
        font-size: 10px;
        opacity: 0.8;
      }

      /* Metadata Section */
      .metadata-section {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 20px;
      }

      .metadata-section h3 {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 12px;
        color: #1e293b;
      }

      .metadata-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }

      .metadata-item {
        display: flex;
        justify-content: space-between;
      }

      .metadata-item .label {
        font-weight: 500;
        color: #64748b;
      }

      .metadata-item .value {
        font-weight: 600;
        color: #1e293b;
      }

      /* Section Styles */
      .assessment-section {
        margin-bottom: 30px;
        break-inside: avoid;
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 2px solid #2563eb;
      }

      .section-header h3 {
        font-size: 18px;
        font-weight: 600;
        color: #1e293b;
      }

      .section-badge {
        background: #2563eb;
        color: white;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 10px;
        font-weight: 500;
      }

      .section-description {
        color: #64748b;
        font-style: italic;
        margin-bottom: 16px;
        font-size: 11px;
      }

      /* Table Styles */
      .questions-table {
        width: 100%;
      }

      .questions-table table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
      }

      .questions-table th {
        background: #f1f5f9;
        border: 1px solid #e2e8f0;
        padding: 10px;
        text-align: left;
        font-weight: 600;
        color: #1e293b;
        font-size: 11px;
      }

      .questions-table td {
        border: 1px solid #e2e8f0;
        padding: 12px 10px;
        vertical-align: top;
      }

      .question-cell {
        background: #fefefe;
      }

      .question-text {
        font-weight: 500;
        color: #1e293b;
        margin-bottom: 4px;
        font-size: 11px;
      }

      .help-text {
        color: #64748b;
        font-size: 10px;
        font-style: italic;
        margin-bottom: 6px;
      }

      .question-meta {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .question-type {
        background: #e2e8f0;
        color: #475569;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 9px;
        font-weight: 500;
      }

      .required-badge {
        background: #fecaca;
        color: #b91c1c;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 9px;
        font-weight: 500;
      }

      .answer-cell {
        background: #fafafa;
      }

      .answer-text {
        font-weight: 500;
        color: #1e293b;
        margin-bottom: 4px;
        word-wrap: break-word;
      }

      /* Insight badges */
      .insight {
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 9px;
        font-weight: 500;
      }

      .insight.excellent {
        background: #dcfce7;
        color: #166534;
      }

      .insight.good {
        background: #dbeafe;
        color: #1d4ed8;
      }

      .insight.fair {
        background: #fef3c7;
        color: #d97706;
      }

      .insight.poor {
        background: #fecaca;
        color: #b91c1c;
      }

      .insight.warning {
        background: #fed7aa;
        color: #c2410c;
      }

      /* Footer */
      .footer {
        margin-top: 30px;
        padding: 16px;
        background: #f8fafc;
        border-top: 1px solid #e2e8f0;
        text-align: center;
      }

      .footer-content p {
        color: #64748b;
        font-size: 10px;
        margin-bottom: 4px;
      }

      /* Print optimizations */
      @media print {
        .assessment-section {
          page-break-inside: avoid;
        }

        .questions-table table {
          page-break-inside: auto;
        }

        .questions-table tr {
          page-break-inside: avoid;
          page-break-after: auto;
        }
      }
    `;
  }

  /**
   * Generate PDF from HTML
   */
  private generatePdf(html: string): Observable<Blob> {
    const formData = new FormData();
    formData.append('html', html);
    formData.append('options', JSON.stringify({
      format: 'A4',
      margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' },
      printBackground: true
    }));

    return this.http.post(this.PDF_ENDPOINT, formData, {
      responseType: 'blob'
    });
  }

  /**
   * Download PDF blob
   */
  private downloadPdf(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}
