# Document Generator Service

A comprehensive service for generating consistent, professional PDF documents across the Incubator OS platform.

## Overview

The `DocumentGeneratorService` provides a standardized way to create HTML documents optimized for DomPDF conversion. It ensures consistency in typography, styling, and layout across all document exports.

## Key Features

- **Consistent Typography**: Standardized heading hierarchy and text styling
- **DomPDF Optimization**: All styles are tested and optimized for DomPDF rendering
- **Reusable Components**: Pre-built components for common document elements
- **Flexible Configuration**: Customizable themes and layouts
- **Status Badge System**: Consistent status indicators across different contexts
- **Priority Summary Tables**: Professional statistical summaries
- **Table Generation**: Various table styles and configurations

## Basic Usage

```typescript
import { DocumentGeneratorService } from '../services/pdf/document-generator.service';

constructor(private documentGenerator: DocumentGeneratorService) {}

// Simple document generation
const htmlContent = this.documentGenerator.generateSimpleDocument({
  title: 'Company Financial Report',
  companyName: 'Acme Corp',
  content: '<h2>Analysis Results</h2><p>Content here...</p>',
  includeSummary: true,
  summaryData: {
    critical: 2,
    high: 5,
    medium: 8,
    low: 3
  }
});
```

## Advanced Usage

```typescript
// Custom document with multiple sections
const sections: DocumentSection[] = [
  {
    type: 'header',
    config: {
      title: 'Action Plan Export',
      subtitle: 'Strategic Business Analysis',
      companyName: 'Acme Corp',
      date: new Date().toLocaleDateString()
    }
  },
  {
    type: 'content',
    content: '<h2>Executive Summary</h2><p>Analysis content...</p>'
  },
  {
    type: 'table',
    config: {
      headers: ['Priority', 'Action Item', 'Status', 'Due Date'],
      rows: [
        ['High', 'Implement new strategy', 'In Progress', '2025-09-15'],
        ['Medium', 'Review processes', 'Planning', '2025-09-30']
      ],
      styling: 'striped',
      columnWidths: ['15%', '45%', '20%', '20%']
    }
  },
  {
    type: 'priority-summary',
    config: {
      critical: 2,
      high: 5,
      medium: 8,
      low: 3,
      title: 'Action Items by Priority'
    }
  },
  {
    type: 'footer',
    config: {
      text: 'This report was generated automatically',
      companyName: 'Acme Corp'
    }
  }
];

const documentConfig: DocumentConfig = {
  title: 'Action Plan Report',
  companyName: 'Acme Corp',
  pageSize: 'A4',
  orientation: 'portrait',
  margins: '1cm'
};

const htmlDocument = this.documentGenerator.generateDocument(sections, documentConfig);
```

## Status Badge System

The service includes a comprehensive status badge system with multiple color schemes:

### Action Plan Status
- `identified` - Slate (neutral)
- `planning` - Blue (active)
- `in_progress` - Amber (warning)
- `completed` - Emerald (success)
- `on_hold` - Red (attention)

### Financial Status
- `excellent` - Dark Green
- `good` - Green
- `fair` - Yellow
- `poor` - Orange
- `critical` - Red

### Project Status
- `not_started` - Gray
- `active` - Blue
- `review` - Indigo
- `approved` - Green
- `rejected` - Red

```typescript
// Generate status badge
const badgeHtml = this.documentGenerator.generateStatusBadge({
  status: 'in_progress',
  text: 'In Progress',
  colorScheme: 'action-plan'
});
```

## Table Configurations

### Table Styling Options
- `default` - Basic table with borders
- `striped` - Alternating row colors
- `bordered` - Heavy borders
- `minimal` - Clean, minimal borders

```typescript
// Generate table
const tableConfig: TableConfig = {
  headers: ['Item', 'Status', 'Priority', 'Date'],
  rows: [
    ['Task 1', 'Completed', 'High', '2025-09-01'],
    ['Task 2', 'In Progress', 'Medium', '2025-09-15']
  ],
  styling: 'striped',
  columnWidths: ['40%', '20%', '20%', '20%']
};
```

## Priority Summary Component

Creates professional priority summaries with color-coded statistics:

```typescript
const summaryConfig: PrioritySummaryConfig = {
  critical: 2,
  high: 5,
  medium: 8,
  low: 3,
  title: 'Issues by Priority',
  colorScheme: 'vibrant'
};

const summaryHtml = this.documentGenerator.renderPrioritySummary(summaryConfig);
```

## DomPDF Optimization

The service automatically handles DomPDF compatibility:

- Converts CSS Grid to table layouts
- Removes unsupported CSS properties
- Optimizes page breaks
- Uses DomPDF-compatible fonts
- Handles proper A4 sizing

```typescript
// Clean existing HTML for DomPDF
const cleanedHtml = this.documentGenerator.cleanContentForDomPdf(existingHtml);
```

## Document Configuration

```typescript
interface DocumentConfig {
  title: string;
  companyName?: string;
  pageSize?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
  margins?: string;
  includeHeader?: boolean;
  includeFooter?: boolean;
  customStyles?: string;
}
```

## Migration Guide

### From Action Plan Export Component

Replace the custom `createDomPdfOptimizedDocument` method:

```typescript
// Old way
const htmlDocument = this.createDomPdfOptimizedDocument(content);

// New way
const htmlDocument = this.documentGenerator.generateSimpleDocument({
  title: `${this.companyName} - Action Plan`,
  companyName: this.companyName,
  content: content,
  includeSummary: true,
  summaryData: {
    critical: this.getTotalByPriority('critical'),
    high: this.getTotalByPriority('high'),
    medium: this.getTotalByPriority('medium'),
    low: this.getTotalByPriority('low')
  }
});
```

### Benefits of Migration

1. **Consistency**: All documents use the same styling and layout standards
2. **Maintainability**: Changes to document styling affect all exports
3. **Reusability**: Common components can be reused across different report types
4. **Professional Quality**: Ensures all documents meet the same quality standards
5. **DomPDF Optimization**: Built-in compatibility with the PDF generation backend

## Best Practices

1. **Use Semantic HTML**: Structure content with proper headings and sections
2. **Leverage Status Badges**: Use the built-in status system for consistency
3. **Table-First Layout**: Use tables instead of CSS Grid for complex layouts
4. **Optimize for PDF**: Use the service's built-in DomPDF optimization
5. **Consistent Spacing**: Use the provided margin and padding classes

## Future Extensions

The service is designed to be extensible for future document types:

- Financial reports
- SWOT analysis exports
- Company assessments
- Project timelines
- Compliance reports
