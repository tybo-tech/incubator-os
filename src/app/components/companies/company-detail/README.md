# Company Detail Component Structure

This directory contains the refactored company detail components, broken down into smaller, more manageable pieces.

## Component Hierarchy

```
CompanyDetailComponent
├── LoadingStateComponent
├── ErrorStateComponent  
├── CompanyHeaderComponent
├── TabsNavigationComponent
└── Tab Content Components
    ├── OverviewTabComponent
    │   ├── CompanyInformationComponent
    │   ├── ContactInformationComponent
    │   ├── BusinessDescriptionComponent
    │   └── CompanySidebarComponent
    ├── FinancialTabComponent
    ├── ComplianceTabComponent
    └── DocumentsTabComponent
```

## Component Descriptions

### Core Layout Components
- **LoadingStateComponent**: Reusable loading spinner with customizable message
- **ErrorStateComponent**: Reusable error display with back button functionality
- **CompanyHeaderComponent**: Company header with logo, name, industry, and action buttons
- **TabsNavigationComponent**: Tab navigation bar with active state management

### Tab Content Components
- **OverviewTabComponent**: Container for company overview information
- **FinancialTabComponent**: Financial data and bank statement placeholders
- **ComplianceTabComponent**: Compliance status with color-coded indicators
- **DocumentsTabComponent**: Document upload areas with guidelines

### Overview Sub-Components
- **CompanyInformationComponent**: Legal name, registration, industry, VAT info
- **ContactInformationComponent**: Contact person, phone, email, address
- **BusinessDescriptionComponent**: Service offering and locations
- **CompanySidebarComponent**: Quick stats and ownership profile

## Benefits of This Structure

1. **Modularity**: Each component has a single responsibility
2. **Reusability**: Loading and error states can be used elsewhere
3. **Maintainability**: Easier to find and modify specific sections
4. **Testing**: Individual components can be tested in isolation
5. **Code Organization**: Related functionality is grouped together

## Usage

Import the main component:
```typescript
import { CompanyDetailComponent } from './company-detail/company-detail.component';
```

Or import specific sub-components:
```typescript
import { 
  LoadingStateComponent, 
  ErrorStateComponent,
  TabType 
} from './company-detail';
```
