# Business Process Component Implementation

## Overview

This document describes the implementation of the business process component for the grant funding application workflow. The component includes tabs for navigation and a checklist feature for tracking business process requirements.

## Component Structure

### 1. Business Process Component (`applicant-business-process.component.ts`)

Main component that provides tab navigation between different business process sections:
- Business Process Checklist
- Supporting Documents
- Notes & Comments

### 2. Business Process Checklist Component (`business-process-checklist.component.ts`)

Implements the checklist functionality with:
- Radio buttons for YES/NO/NA responses
- Data persistence using NodeService
- Loading and saving states
- Visual feedback for save operations

### 3. Checklist Models (`checklist.models.ts`)

Defines the data structures for the checklist:
- `ChecklistResponse` enum (YES, NO, NA)
- `GrantFundingChecklist` interface with all required fields
- `DEFAULT_GRANT_FUNDING_CHECKLIST` with default null values
- `GRANT_FUNDING_CHECKLIST_FIELDS` with UI labels

## Implementation Details

### File Structure
```
src/app/admin/grant-funding/business-process/
├── business-process-checklist.component.ts
├── checklist.models.ts
└── index.ts
```

### Key Features

1. **Tab Navigation**
   - Three tabs: Checklist, Documents, Notes
   - Visual indication of active tab
   - Content switching based on active tab

2. **Checklist Functionality**
   - 15 checklist items with YES/NO/NA options
   - Data loaded from database using NodeService
   - Data saved to database using NodeService
   - Company ID used as parent_id for data association

3. **Data Persistence**
   - Checklist data stored as nodes with type 'business_process_checklist'
   - Each company can have one checklist instance
   - Automatic save/update based on existing data

4. **User Experience**
   - Loading indicators during data fetch
   - Save button with disabled state during save operation
   - Success/error messages for save operations
   - Visual feedback for radio button selections

## Integration Points

### Applicant Overview Component
The business process component is integrated into the applicant overview component and renders when:
- The current stage has 'business_process' component enabled
- Company ID and Applicant ID are passed as inputs

### Node Service
The component uses NodeService to:
- Load existing checklist data: `getNodes('business_process_checklist', companyId)`
- Save new checklist data: `addNode(nodeData)`
- Update existing checklist data: `updateNode(nodeData)`

## Data Model

### Checklist Fields
1. SCM Verification Process Checklist
2. Expenditure Authorization Form
3. Business Support Acknowledgement Letter
4. ESD ED Agreement
5. Terms and Conditions for Disbursement of ESD Grant Funding
6. Acknowledgement of Delivery
7. Purchase Order
8. Quotation/s
9. Tax Invoice/s
10. Proof of Payment to Supplier
11. Bank Confirmation
12. BBBEE
13. Tax Pin
14. Beneficiary ID Copy (All Company Directors)
15. Company Registration Document

### Database Structure
Nodes are stored with:
- `type`: 'business_process_checklist'
- `parent_id`: Company ID
- `data`: Checklist responses object

## Usage

To enable the business process component for a stage:
1. In the workflow settings, add 'business_process' to the stage's components
2. The component will automatically render in the applicant overview for that stage
3. Users can navigate between tabs and complete the checklist
4. Data is automatically saved when the user clicks "Save Checklist"

## Future Enhancements

1. Add document upload functionality to the "Supporting Documents" tab
2. Implement notes and comments feature in the "Notes & Comments" tab
3. Add validation and completion tracking
4. Include reporting and analytics features