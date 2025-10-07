# Financial Component Architecture Standard

This document outlines the standardized architecture pattern for all financial components in the application.

## 📁 **File Structure**

For each financial component (e.g., Bank Statements, Revenue, Profits, etc.):

```
src/app/
├── components/
│   └── company-shell/
│       └── financial-shell/
│           └── components/
│               └── {component-name}.component.ts    # Clean component
└── services/
    └── {component-name}-helper.service.ts          # Business logic helper
```

## 🏗️ **Architecture Pattern**

### **1. Component Responsibilities** ✅ CLEAN & MINIMAL
- Data binding and UI interaction
- Service injection and initialization
- Event handling delegation
- State management (loading, selected year, etc.)

### **2. Helper Service Responsibilities** ✅ BUSINESS LOGIC
- Table configuration setup
- Data filtering and transformation
- Record creation templates
- Business rule implementation
- Utility functions (date formatting, validation, etc.)

## 📋 **Component Template**

```typescript
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CompanyFinancialsService, ICompanyFinancials } from '../../../../../services/company-financials.service';
import { CompanyService } from '../../../../../services/company.service';
import { ICompany } from '../../../../../models/simple.schema';
import { EditableTableComponent, EditableTableConfig, EditableTableAction } from '../../../shared';
import { {ComponentName}HelperService } from '../../../../../app/services/{component-name}-helper.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-{component-name}',
  standalone: true,
  imports: [CommonModule, FormsModule, EditableTableComponent],
  template: `
    <!-- Standardized template structure -->
  `
})
export class {ComponentName}Component implements OnInit {
  private readonly financialsService = inject(CompanyFinancialsService);
  private readonly companyService = inject(CompanyService);
  private readonly route = inject(ActivatedRoute);
  private readonly helper = inject({ComponentName}HelperService);

  company: ICompany | null = null;
  financials: ICompanyFinancials[] = [];
  selectedYear: string | number = 'all';
  tableConfig: EditableTableConfig;

  constructor() {
    this.tableConfig = this.helper.getTableConfig();
  }

  ngOnInit() {
    this.loadCompany();
  }

  get availableYears(): number[] {
    return this.helper.getAvailableYears(this.financials);
  }

  get filteredData(): any[] {
    return this.helper.getFilteredData(this.financials, this.selectedYear);
  }

  // Standard CRUD methods with helper delegation
  async loadCompany() { /* ... */ }
  async loadFinancials() { /* ... */ }
  async onCellEdit(event) { /* delegate to helper */ }
  async onTableAction(action) { /* delegate to helper */ }
  async addNewRecord() { /* use helper.createNewRecord() */ }
  async deleteRecord(record) { /* use helper.getDeleteConfirmationMessage() */ }
  exportData() { /* delegate to helper */ }
}
```

## 🔧 **Helper Service Template**

```typescript
import { Injectable } from '@angular/core';
import { EditableTableConfig } from '../components/shared';

@Injectable({
  providedIn: 'root'
})
export class {ComponentName}HelperService {

  getTableConfig(): EditableTableConfig {
    // Return component-specific table configuration
  }

  getAvailableYears(financials: any[]): number[] {
    // Extract and sort years from financial data
  }

  getFilteredData(financials: any[], selectedYear: string | number): any[] {
    // Filter and format data for display
  }

  createNewRecord(companyId: number): any {
    // Create new record template with defaults
  }

  prepareRecordForUpdate(row: any, field: string): any {
    // Apply business rules for record updates
  }

  getDeleteConfirmationMessage(record: any): string {
    // Generate contextual delete confirmation message
  }

  // Component-specific utility methods
  // formatCurrency(), validateData(), calculateTotals(), etc.
}
```

## 🎯 **Benefits of This Architecture**

### **1. Clean Separation of Concerns**
- ✅ Components focus only on UI and data binding
- ✅ Business logic is centralized in helper services
- ✅ Easier to test and maintain

### **2. Consistency Across Components**
- ✅ Same structure for all financial components
- ✅ Predictable code organization
- ✅ Faster development of new components

### **3. Reusability**
- ✅ Helper services can be reused across components
- ✅ Common patterns are abstracted
- ✅ Easy to extend functionality

### **4. Maintainability**
- ✅ Business logic changes in one place
- ✅ TypeScript interfaces ensure type safety
- ✅ Clear responsibilities and dependencies

## 🚀 **Implementation Checklist**

For each new financial component:

- [ ] Create component file with minimal UI logic
- [ ] Create helper service with business logic
- [ ] Implement standardized methods:
  - [ ] `getTableConfig()`
  - [ ] `getAvailableYears()`
  - [ ] `getFilteredData()`
  - [ ] `createNewRecord()`
  - [ ] `prepareRecordForUpdate()`
  - [ ] `getDeleteConfirmationMessage()`
- [ ] Use `firstValueFrom()` for Observable → Promise conversion
- [ ] Remove all console.log statements (except errors)
- [ ] Implement error handling with user-friendly messages
- [ ] Test CRUD operations
- [ ] Verify table configuration and data display

## 🎨 **Styling Standards**

- Use consistent header structure with icon and title
- Implement year filtering in header section
- Use `EditableTableComponent` for all data tables
- Apply consistent spacing with `space-y-6` class
- Use blue theme for icons and primary actions

## 📝 **Example Implementation**

See `bank-statements.component.ts` and `bank-statement-helper.service.ts` for the reference implementation of this architecture pattern.

This standard ensures all financial components are:
- **Consistent** in structure and behavior
- **Maintainable** with clear separation of concerns
- **Scalable** for future enhancements
- **Testable** with isolated business logic
