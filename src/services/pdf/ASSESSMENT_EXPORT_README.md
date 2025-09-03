# Assessment Export Service

This service provides data-driven PDF export functionality for business assessment questionnaires. It generates professional PDF reports directly from assessment data without requiring UI components.

## Features

- **Data-Driven PDF Generation**: Converts assessment JSON data directly to HTML and then to PDF
- **Section-Based Organization**: Groups questions by questionnaire sections for clear organization
- **Professional Formatting**: Clean, professional PDF layout optimized for printing and sharing
- **Question Type Support**: Handles all questionnaire types (text, rating, yes/no, dropdowns, etc.)
- **Compliance Insights**: Automatically adds insights for ratings and compliance questions
- **Flexible Export Options**: Multiple export configurations available

## Usage

### Basic Export

```typescript
import { AssessmentExportHelperService } from '../services/pdf/assessment-export-helper.service';

// Export by company ID
this.assessmentExportService.exportAssessmentByCompanyId(companyId)
  .subscribe(() => {
    console.log('PDF exported successfully');
  });

// Export from existing data
this.assessmentExportService.exportAssessmentFromData(company, assessmentData)
  .subscribe(() => {
    console.log('PDF exported successfully');
  });
```

### Export Options

```typescript
const options: AssessmentExportOptions = {
  includeEmptyAnswers: false,     // Include questions without answers
  groupBySection: true,           // Group questions by sections
  includeMetadata: true,          // Include assessment metadata
  customTitle: 'Custom Report'    // Custom report title
};

this.assessmentExportService.exportAssessmentByCompanyId(companyId, options);
```

### Preset Export Methods

```typescript
// Complete detailed report
this.assessmentExportService.exportCompleteReport(companyId);

// Summary report (no metadata)
this.assessmentExportService.exportSummaryReport(companyId);

// Detailed report (includes everything)
this.assessmentExportService.exportDetailedReport(companyId);
```

### Preview Assessment Data

```typescript
this.assessmentExportService.previewAssessmentData(companyId)
  .subscribe(preview => {
    console.log('Company:', preview.company.name);
    console.log('Response Count:', preview.responseCount);
    console.log('Completion:', preview.completionPercentage + '%');
  });
```

### Check Assessment Availability

```typescript
this.assessmentExportService.hasAssessmentData(companyId)
  .subscribe(hasData => {
    if (hasData) {
      // Company has assessment data, show export button
    }
  });
```

## Integration in Components

### Assessment Tab Component

The assessment tab component includes an export button that appears when assessment data is available:

```typescript
export class AssessmentTabComponent {
  isExporting = false;

  constructor(
    private assessmentExportService: AssessmentExportHelperService
  ) {}

  exportAssessmentPdf(): void {
    if (!this.company?.id || !this.consolidatedAssessment) return;

    this.isExporting = true;

    this.assessmentExportService.exportAssessmentFromData(
      this.company,
      this.consolidatedAssessment,
      { includeMetadata: true }
    ).subscribe({
      next: () => {
        this.isExporting = false;
        // Show success message
      },
      error: (error) => {
        this.isExporting = false;
        // Show error message
      }
    });
  }
}
```

### Template Integration

```html
<!-- Export Button (only show if assessment data exists) -->
<button
  *ngIf="consolidatedAssessment && getTotalResponseCount() > 0"
  (click)="exportAssessmentPdf()"
  [disabled]="isExporting"
  class="btn btn-primary"
>
  <svg *ngIf="!isExporting"><!-- Download icon --></svg>
  <svg *ngIf="isExporting" class="animate-spin"><!-- Loading icon --></svg>
  {{ isExporting ? 'Generating PDF...' : 'Export PDF' }}
</button>
```

## Data Structure

### Consolidated Assessment Data

The service expects assessment data in this format:

```typescript
interface ConsolidatedAssessment {
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
```

### Example Assessment Data

```json
{
  "id": 1991,
  "type": "consolidated_assessment",
  "company_id": 11,
  "data": {
    "metadata": {
      "last_updated": "2025-09-03T03:21:30.275Z",
      "current_section": "introduction",
      "answered_questions": 25,
      "progress_percentage": 100
    },
    "responses": {
      "intro_business_description": "Sewing and tailoring for individual...",
      "sa_sales_ability": 6,
      "sars_vat_status": "non_compliant",
      "intro_registration_date": "2024-02-07"
    }
  }
}
```

## PDF Features

### Generated PDF Includes:

1. **Header Section**
   - Company name and details
   - Assessment completion percentage
   - Report generation date

2. **Metadata Section** (optional)
   - Assessment progress
   - Last updated date
   - Current section

3. **Question Sections**
   - Organized by questionnaire sections
   - Question text and help text
   - Formatted answers with insights
   - Question type indicators
   - Required field indicators

4. **Answer Insights**
   - Rating scales with color-coded insights
   - Compliance status indicators
   - Automatic formatting for dates, currencies, percentages

5. **Footer**
   - Report generation info
   - System branding

### PDF Styling

- Professional design optimized for DomPDF
- Print-friendly layout
- Color-coded insights and badges
- Responsive table layout
- Page break optimization

## Testing

Use the `AssessmentExportExampleComponent` for testing:

```typescript
// Test with sample data
exportSampleData(): void {
  this.assessmentExportService.exportAssessmentFromData(
    this.sampleCompany,
    this.sampleAssessment
  ).subscribe(/* ... */);
}

// Test with company ID
exportByCompanyId(): void {
  this.assessmentExportService.exportAssessmentByCompanyId(companyId)
    .subscribe(/* ... */);
}
```

## API Dependencies

- **PDF Generation**: `https://docs.tybo.co.za/pdf.php`
- **Company Data**: `CompanyService.getCompanyById()`
- **Assessment Data**: `GET /api-nodes/company/{id}/consolidated-assessment`
- **Questionnaire Structure**: `QuestionnaireService.getBusinessAssessmentQuestionnaire()`

## Error Handling

The service includes comprehensive error handling:

- Missing assessment data
- Invalid company information
- PDF generation failures
- Network connectivity issues

All errors are propagated to the calling component for appropriate user feedback.
