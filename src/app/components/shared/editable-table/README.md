# EditableTable Component

A reusable, generic editable table component for Angular that handles different data types, inline editing, calculations, and actions.

## Features

- ✅ **Multiple Input Types**: text, number, currency, percentage, select, readonly
- ✅ **Inline Editing**: Click to edit cells with automatic save
- ✅ **Data Validation**: Required fields, min/max values, type validation
- ✅ **Automatic Calculations**: Column totals and custom calculations
- ✅ **Action Support**: Add, delete, export functionality
- ✅ **Responsive Design**: Mobile-friendly with horizontal scrolling
- ✅ **Customizable**: Themes, sizes, empty states
- ✅ **TypeScript Support**: Full type safety

## Basic Usage

```typescript
import { EditableTableComponent, EditableTableColumn, EditableTableConfig } from '../shared';

@Component({
  template: `
    <app-editable-table
      [data]="tableData"
      [config]="tableConfig"
      [title]="'My Data Table'"
      (cellEdit)="onCellEdit($event)"
      (action)="onTableAction($event)">
    </app-editable-table>
  `
})
export class MyComponent {
  tableData = [
    { id: 1, name: 'John', age: 30, salary: 50000, department: 'IT' },
    { id: 2, name: 'Jane', age: 25, salary: 45000, department: 'HR' }
  ];

  tableConfig: EditableTableConfig = {
    columns: [
      {
        key: 'name',
        label: 'Name',
        type: 'text',
        editable: true,
        required: true,
        width: '200px'
      },
      {
        key: 'age',
        label: 'Age',
        type: 'number',
        editable: true,
        min: 18,
        max: 65
      },
      {
        key: 'salary',
        label: 'Salary',
        type: 'currency',
        editable: true,
        calculateTotal: true,
        precision: 0
      },
      {
        key: 'department',
        label: 'Department',
        type: 'select',
        editable: true,
        options: [
          { value: 'IT', label: 'Information Technology' },
          { value: 'HR', label: 'Human Resources' },
          { value: 'Finance', label: 'Finance' }
        ]
      }
    ],
    enableAdd: true,
    enableDelete: true,
    enableExport: true,
    showTotals: true
  };

  onCellEdit(event: { row: any; field: string; index: number; value: any }) {
    // Handle cell edit
    console.log('Cell edited:', event);
  }

  onTableAction(action: EditableTableAction) {
    switch (action.type) {
      case 'add':
        // Handle add new row
        break;
      case 'delete':
        // Handle delete row
        break;
      case 'export':
        // Handle export
        break;
    }
  }
}
```

## Column Configuration

### EditableTableColumn Interface

```typescript
interface EditableTableColumn {
  key: string;                    // Property key in data object
  label: string;                  // Column header label
  type: 'text' | 'number' | 'currency' | 'percentage' | 'select' | 'readonly';
  editable: boolean;              // Whether the column is editable
  required?: boolean;             // Whether the field is required
  width?: string;                 // Column width (e.g., '200px', '20%')
  options?: { value: any; label: string }[]; // Options for select type
  calculateTotal?: boolean;       // Include in totals calculation
  precision?: number;             // Decimal precision for numbers
  placeholder?: string;           // Input placeholder text
  min?: number;                   // Minimum value for numbers
  max?: number;                   // Maximum value for numbers
}
```

### Column Types

#### Text Input
```typescript
{
  key: 'name',
  label: 'Full Name',
  type: 'text',
  editable: true,
  required: true,
  placeholder: 'Enter name...'
}
```

#### Number Input
```typescript
{
  key: 'quantity',
  label: 'Quantity',
  type: 'number',
  editable: true,
  min: 0,
  max: 1000,
  precision: 0
}
```

#### Currency Input
```typescript
{
  key: 'amount',
  label: 'Amount',
  type: 'currency',
  editable: true,
  calculateTotal: true,
  precision: 0,
  min: 0
}
```

#### Percentage Input
```typescript
{
  key: 'rate',
  label: 'Rate (%)',
  type: 'percentage',
  editable: true,
  precision: 1,
  min: 0,
  max: 100
}
```

#### Select Dropdown
```typescript
{
  key: 'status',
  label: 'Status',
  type: 'select',
  editable: true,
  options: [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'pending', label: 'Pending' }
  ]
}
```

#### Readonly Display
```typescript
{
  key: 'created_date',
  label: 'Created',
  type: 'readonly',
  editable: false,
  width: '150px'
}
```

## Table Configuration

```typescript
interface EditableTableConfig {
  columns: EditableTableColumn[];
  enableAdd?: boolean;        // Show add button (default: true)
  enableDelete?: boolean;     // Show delete buttons (default: true)
  enableExport?: boolean;     // Show export button (default: false)
  showTotals?: boolean;       // Show totals row (default: false)
  striped?: boolean;          // Striped row styling (default: true)
  compact?: boolean;          // Compact row height (default: false)
  loading?: boolean;          // Show loading state (default: false)
}
```

## Events

### cellEdit Event
Emitted when a cell value changes:
```typescript
{
  row: any;        // The data row object
  field: string;   // The field name that changed
  index: number;   // Row index
  value: any;      // New value
}
```

### action Event
Emitted for table actions:
```typescript
{
  type: 'add' | 'edit' | 'delete' | 'export';
  data?: any;      // Row data (for delete)
  index?: number;  // Row index (for delete)
}
```

## Customization

### Empty State
```typescript
<app-editable-table
  [emptyStateIcon]="'fas fa-chart-bar'"
  [emptyStateTitle]="'No Financial Data'"
  [emptyStateMessage]="'Start by adding your first record.'"
  [emptyStateButtonText]="'Add First Record'">
</app-editable-table>
```

### Loading State
```typescript
tableConfig: EditableTableConfig = {
  // ... other config
  loading: true  // Shows loading spinner
};
```

### Styling
The component uses Tailwind CSS classes and is fully responsive. You can customize:
- Colors (blue theme by default)
- Spacing (compact mode available)
- Width (responsive with horizontal scroll)

## Best Practices

1. **Use trackBy for performance** - The component automatically uses `item.id` or index
2. **Handle async operations** - Use loading state during API calls
3. **Validate data** - Use required, min, max properties
4. **Format currency properly** - Component handles ZAR formatting automatically
5. **Provide good UX** - Use descriptive labels and placeholders

## Real-World Example

See `bank-statements.component.ts` for a complete implementation example with:
- Financial data management
- Year filtering
- Async CRUD operations
- Currency formatting
- Quarter selection
- Export functionality

This component makes it easy to create consistent, professional data tables across your application!
