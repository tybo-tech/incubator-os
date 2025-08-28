# CategoryCompanyPicker Component

A smart, reusable Angular component for efficiently managing company assignments within cohorts. This component provides a dual-pane interface for assigning and removing companies from cohorts with real-time search and minimal data transfer.

## Features

- **Dual-pane interface**: Available companies on the left, assigned companies on the right
- **Real-time search**: Debounced search across both available and assigned companies
- **Lightweight data transfer**: Uses a specialized backend endpoint that returns only minimal company fields
- **Context-aware filtering**: Automatically filters based on cohort, program, and client hierarchy
- **Bulk operations**: Select multiple companies for batch assignment/removal
- **Real-time updates**: Immediate UI updates with proper loading states
- **Self-contained service integration**: Handles all API calls internally

## Usage

### Basic Usage

```typescript
<app-category-company-picker
  [cohortId]="selectedCohortId"
  [programId]="selectedProgramId" 
  [clientId]="selectedClientId"
  (close)="handleClose()"
  (companiesChanged)="handleCompaniesChanged()"
></app-category-company-picker>
```

### Input Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `cohortId` | `number` | Yes | The ID of the cohort to manage companies for |
| `programId` | `number` | No | The ID of the parent program (for context filtering) |
| `clientId` | `number` | No | The ID of the parent client (for context filtering) |

### Output Events

| Event | Type | Description |
|-------|------|-------------|
| `close` | `EventEmitter<void>` | Emitted when the user wants to close the picker |
| `companiesChanged` | `EventEmitter<void>` | Emitted when companies are assigned or removed |

### Implementation Example

```typescript
// In your component
export class YourComponent {
  showCompanyPicker = signal(false);
  selectedCohortId = signal<number | null>(null);

  openCompanyPicker(cohortId: number): void {
    this.selectedCohortId.set(cohortId);
    this.showCompanyPicker.set(true);
  }

  closeCompanyPicker(): void {
    this.showCompanyPicker.set(false);
  }

  onCompaniesChanged(): void {
    // Refresh your data or update UI
    this.loadCohortData();
  }
}
```

```html
<!-- In your template -->
@if (showCompanyPicker()) {
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <app-category-company-picker
      [cohortId]="selectedCohortId()!"
      [programId]="getCurrentProgramId()"
      [clientId]="getCurrentClientId()"
      (close)="closeCompanyPicker()"
      (companiesChanged)="onCompaniesChanged()"
    ></app-category-company-picker>
  </div>
}
```

## Backend Integration

The component uses a specialized backend endpoint (`get-companies-for-picker.php`) that:

- Returns minimal company data (id, name, email, registration_number)
- Provides separate lists for available and assigned companies
- Supports search filtering across company fields
- Includes context filtering by cohort/program/client hierarchy
- Returns summary statistics (total counts)

### API Response Format

```json
{
  "available_companies": [
    {
      "id": 1,
      "name": "Company Name",
      "email_address": "contact@company.com",
      "registration_number": "REG123"
    }
  ],
  "assigned_companies": [
    {
      "id": 2,
      "name": "Assigned Company",
      "email_address": "info@assigned.com",
      "registration_number": "REG456"
    }
  ],
  "search_term": "search query",
  "cohort_id": 1,
  "program_id": 1,
  "client_id": 1,
  "total_available": 50,
  "total_assigned": 3
}
```

## Performance Features

- **Debounced search**: 300ms delay prevents excessive API calls
- **Minimal data transfer**: Only essential company fields are transmitted
- **Efficient rendering**: Uses Angular's OnPush change detection strategy
- **Optimized queries**: Backend uses optimized SQL with proper indexing
- **Context filtering**: Reduces data set size through hierarchy-based filtering

## Styling

The component uses Tailwind CSS classes and follows the application's design system:

- Clean, modern interface with subtle shadows and rounded corners
- Responsive design that works on different screen sizes
- Consistent color scheme with proper hover and focus states
- Loading states with skeleton animations
- Clear visual distinction between available and assigned companies

## Dependencies

- Angular 16+ (standalone component)
- `CategoryService` for API integration
- Tailwind CSS for styling
- RxJS for reactive programming (debounced search, observables)

## Integration Notes

This component is already integrated into the admin overview page (`overview-page-new.component.ts`) and can be easily reused in other parts of the application that need company-cohort management functionality.
