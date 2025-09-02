# Dynamic Company Forms Integration

This document explains the integration architecture between the category hierarchy system and the new form system for creating dynamic company detail interfaces.

## 📋 Overview

The integration allows programs to define custom forms that automatically appear as tabs in company detail views. This creates a dynamic, program-specific interface for collecting and managing company data based on their enrollment context.

## 🏗️ Architecture

### Core Components

1. **CompanyFormIntegrationService** - Bridges CategoryItem enrollments with Form system
2. **CompanyDetailDynamicComponent** - Example component demonstrating dynamic tabs
3. **Enhanced Models** - Extended interfaces for category-form integration

### Data Flow

```
Company Enrollment (CategoryItem) → Program Context → Form Configuration → Dynamic Tabs
```

1. Company enrolls in a Cohort (via CategoryItem)
2. System identifies the Program associated with that Cohort
3. Forms configured for that Program are loaded
4. Dynamic tabs are generated based on available forms
5. Form sessions are created/managed per enrollment context

## 📊 Database Schema Integration

### Categories Hierarchy
```
Client (depth=1)
  └── Program (depth=2)
      └── Cohort (depth=3)
```

### CategoryItem (Company Enrollments)
```sql
categories_item:
- id (PK)
- cohort_id → categories.id
- program_id (denormalized)
- client_id (denormalized)
- company_id → companies.id
- status ('active', 'completed', 'withdrawn')
- joined_at, left_at, notes
```

### Form System
```sql
forms:
- id, form_key, title, description
- scope_type ('global', 'client', 'program', 'cohort')
- scope_id (nullable, references category.id when scoped)

form_sessions:
- id, categories_item_id, form_id
- status ('draft', 'submitted', 'advisor_verified', 'program_approved', 'cancelled')
- workflow timestamps
```

## 🔌 Integration Points

### 1. Program Form Configuration

Programs can have multiple forms configured:

```typescript
interface ProgramFormConfig {
  program_id: number;
  program_name: string;
  forms: IForm[];
  default_form_id?: number;
  form_order?: number[];
}
```

### 2. Company Enrollment Context

Each form session is linked to a specific company enrollment:

```typescript
interface ICategoryItemWithSession {
  // CategoryItem fields
  id: number;
  cohort_id: number;
  program_id: number;
  company_id: number;
  status: 'active' | 'completed' | 'withdrawn';
  
  // Extended with form data
  form_sessions?: IFormSession[];
  active_sessions?: IFormSession[];
  completed_sessions?: IFormSession[];
}
```

### 3. Dynamic Tab Generation

Forms are converted to tabs with full context:

```typescript
interface CompanyFormTab {
  form: IForm;
  nodes: IFormNode[];
  session?: IFormSession;
  responses?: ISessionFieldResponse[];
  is_active: boolean;
  can_edit: boolean;
}
```

## 🚀 Usage Examples

### Basic Integration

```typescript
@Component({
  template: `
    <app-company-detail-dynamic 
      [companyId]="123"
      [initialEnrollmentId]="456">
    </app-company-detail-dynamic>
  `
})
export class CompanyPageComponent {}
```

### Loading Company Data with Forms

```typescript
// Get all enrollments for a company
const enrollments = await integrationService.getCompanyEnrollments(companyId);

// Generate dynamic tabs based on program forms
const tabs = await integrationService.generateCompanyTabs(companyId, enrollmentId);

// Get completion statistics
const stats = await integrationService.getCompanyFormStatistics(companyId);
```

### Form Session Management

```typescript
// Get or create a form session for specific enrollment
const session = await integrationService.getOrCreateFormSession(
  formId, 
  categoryItemId, 
  companyId
);

// Check if company can edit form
const canEdit = session.status === 'draft';
```

## 📈 Benefits

### 1. **Dynamic Program Configuration**
- Each program can define its own forms
- No need to modify code when adding new programs
- Forms automatically appear in company detail interface

### 2. **Context-Aware Sessions**
- Form sessions are tied to specific enrollments
- Company can have different forms for different programs
- Progress tracking per program participation

### 3. **Flexible Workflow**
- Support for multi-stage approval process
- Draft → Submitted → Verified → Approved workflow
- Status tracking and progress visualization

### 4. **Scalable Architecture**
- Easy to add new form types
- Supports complex form structures with nodes
- Analytics and reporting built-in

## 🔧 API Endpoints

The integration relies on existing API endpoints:

### CategoryItem Endpoints
- `GET /category-item/list-for-company.php?company_id={id}`
- `GET /category-item/get-by-id.php?id={id}`

### Form System Endpoints
- `GET /form/search-forms.php` (with scope filters)
- `GET /form-node/get-form-nodes.php?form_id={id}`
- `GET /form-session/list-form-sessions.php?categories_item_id={id}`
- `POST /form-session/add-form-session.php`

## 🎯 Next Steps

### Immediate Implementation
1. **Create Program Forms** - Configure forms for existing programs
2. **Company Detail Integration** - Replace static tabs with dynamic ones
3. **Form Builder Integration** - Connect to form editing interface

### Future Enhancements
1. **Template System** - Form templates for common use cases
2. **Conditional Logic** - Show/hide tabs based on company characteristics
3. **Bulk Operations** - Mass form assignments and management
4. **Advanced Analytics** - Completion tracking and reporting dashboards

## 📝 Example Configuration

### Setting up Program Forms

1. **Create Program-Scoped Form:**
```sql
INSERT INTO forms (form_key, title, scope_type, scope_id, status) 
VALUES ('business-assessment', 'Business Assessment', 'program', 123, 'published');
```

2. **Add Form Nodes:**
```sql
INSERT INTO form_nodes (form_id, node_type, node_key, title, sort_order)
VALUES (1, 'section', 'financial-info', 'Financial Information', 1);
```

3. **Company Enrollment:**
```sql
INSERT INTO categories_item (cohort_id, program_id, company_id, status)
VALUES (456, 123, 789, 'active');
```

4. **Dynamic Tab Generation:**
The system automatically detects that Company 789 is enrolled in Program 123, loads the "Business Assessment" form, and creates a dynamic tab in the company detail interface.

## 🔍 Troubleshooting

### Common Issues

1. **No Dynamic Tabs Appearing**
   - Check if company has active enrollments
   - Verify program has published forms
   - Ensure form scope_type and scope_id are correct

2. **Form Sessions Not Creating**
   - Verify categories_item_id exists and is valid
   - Check form_id references existing published form
   - Ensure proper permissions for form creation

3. **Completion Statistics Incorrect**
   - Verify session status values match enum
   - Check if form sessions are properly linked to enrollments
   - Ensure program hierarchy is correctly denormalized in categories_item

This integration provides a powerful foundation for dynamic, program-specific company management interfaces that scale with your organizational structure.
