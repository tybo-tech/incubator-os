# SWOT Action Plan Export Service

This service provides a pure data-driven approach to export SWOT analysis action plans as PDF documents without requiring any visual components.

## Features

- ✅ **Pure Data-Driven**: Works directly with SWOT data structures
- ✅ **No Component Dependencies**: Doesn't need rendered HTML components
- ✅ **Professional PDF Output**: Optimized for DomPDF with proper styling
- ✅ **Priority-Based Sorting**: Automatically sorts by priority and due dates
- ✅ **Status Badges**: Visual status indicators with proper colors
- ✅ **Date Handling**: Highlights overdue and due-soon items
- ✅ **Statistics Summary**: Overview of categories and priorities

## Usage

### 1. Direct Export from SWOT Tab Component

The SWOT tab component now uses this service automatically. When you click "Export Action Plan PDF", it:

1. Converts current SWOT data to action plan format
2. Generates PDF directly using the service
3. Downloads the PDF file

### 2. Using the Helper Service Anywhere

```typescript
import { SwotExportHelperService } from '../services/pdf/swot-export-helper.service';

// In your component
constructor(private swotExportHelper: SwotExportHelperService) {}

// Export from raw SWOT data array (like your JSON structure)
exportSwotActionPlan(swotDataArray: any[], companyName: string, companyId: string) {
  this.swotExportHelper.exportSwotActionPlanFromData(swotDataArray, companyName, companyId)
    .subscribe({
      next: (blob) => {
        this.swotExportHelper.downloadPdf(blob, companyName);
      },
      error: (error) => {
        console.error('Export failed:', error);
      }
    });
}
```

### 3. Using the Core Service Directly

```typescript
import { SwotActionPlanExportService } from '../services/pdf/swot-action-plan-export.service';

// In your component
constructor(private exportService: SwotActionPlanExportService) {}

// Convert and export
exportSwot(swotData: any, companyName: string, companyId: string) {
  const actionPlanData = this.exportService.convertSwotToActionPlan(
    swotData, 
    companyName, 
    companyId
  );
  
  this.exportService.generateActionPlanPDF(actionPlanData)
    .subscribe(blob => {
      // Handle the PDF blob
    });
}
```

## Data Structure Expected

The service expects SWOT data in this format:

```typescript
{
  data: {
    internal: {
      strengths: [
        {
          description: "Do have the training in place",
          action_required: "Continue training programs",
          assigned_to: "HR Manager", 
          target_date: "2025-09-30",
          status: "identified",
          priority: "medium",
          impact: "high",
          category: "strength"
        }
      ],
      weaknesses: [...] 
    },
    external: {
      opportunities: [...],
      threats: [...]
    },
    summary: "Overall analysis summary",
    analysis_date: "2025-08-29T08:58:03.421Z",
    last_updated: "2025-09-02T04:17:14.020Z"
  }
}
```

## Key Benefits

### 1. No Component Dependency
- No need for action-plan-export component
- No routing to separate pages
- Works purely with data

### 2. Data-Driven HTML Generation
The service generates HTML directly from data using helper functions:
- `generateActionPlanHTML()` - Main HTML structure
- `generateSummaryStats()` - Statistics overview
- `generateActionItemsTable()` - Sortable action items table
- `generatePriorityOverview()` - Priority distribution

### 3. Professional PDF Output
- Optimized CSS for DomPDF
- Proper page breaks
- Status badges with colors
- Priority-based sorting
- Date highlighting (overdue/due soon)

### 4. Easy Integration
```typescript
// Just inject the helper service and call one method
this.swotExportHelper.exportSwotActionPlanFromData(
  yourSwotDataArray,
  companyName,
  companyId
).subscribe(blob => this.swotExportHelper.downloadPdf(blob, companyName));
```

## Methods Available

### SwotActionPlanExportService
- `generateActionPlanPDF(data)` - Generate PDF from action plan data
- `convertSwotToActionPlan(swot, company, id)` - Convert SWOT to action plan format

### SwotExportHelperService  
- `exportSwotActionPlanFromData(array, company, id)` - Export from raw data array
- `exportSwotActionPlan(swot, company, id)` - Export from single SWOT object
- `downloadPdf(blob, company)` - Download PDF with proper filename
- `getActionItemsCount(swot)` - Count action items in SWOT data
- `previewActionPlanData(swot, company, id)` - Preview without generating PDF

This approach eliminates the need for visual components and provides a clean, data-driven PDF generation solution.
