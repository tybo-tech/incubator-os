# Dynamic Form Component

A clean, simple, and focused Angular component for rendering dynamic forms using ngModel.

## Features

✅ **Simple**: Uses ngModel (template-driven forms), no reactive forms complexity  
✅ **Dynamic**: Renders form fields based on configuration array  
✅ **Type-safe**: Fully typed with TypeScript interfaces  
✅ **Modern**: Uses Angular signals and new control flow syntax  
✅ **Focused**: Single responsibility - render fields and emit data  
✅ **Accessible**: Proper labels, placeholders, and validation  
✅ **Styled**: Tailwind CSS with consistent styling  

## Installation

The component is standalone and self-contained. Just import it:

```typescript
import { DynamicFormComponent, FormField } from './components/shared/dynamic-form.component';
```

## Usage

### Basic Example

```typescript
import { Component } from '@angular/core';
import { DynamicFormComponent, FormField } from './components/shared/dynamic-form.component';

@Component({
  selector: 'app-my-component',
  standalone: true,
  imports: [DynamicFormComponent],
  template: `
    <app-dynamic-form
      [fields]="formFields"
      [submitButtonText]="'Save Record'"
      (formSubmit)="handleSubmit($event)"
    />
  `
})
export class MyComponent {
  formFields: FormField[] = [
    {
      key: 'name',
      label: 'Full Name',
      type: 'text',
      required: true,
      placeholder: 'Enter your name'
    },
    {
      key: 'email',
      label: 'Email Address',
      type: 'email',
      required: true,
      placeholder: 'you@example.com'
    },
    {
      key: 'age',
      label: 'Age',
      type: 'number',
      min: 18,
      max: 120
    }
  ];

  handleSubmit(data: Record<string, any>): void {
    console.log('Form submitted:', data);
    // Do whatever you need with the data
  }
}
```

### With Initial Data (Edit Mode)

```typescript
formFields: FormField[] = [
  { key: 'period', label: 'Period', type: 'text', required: true },
  { key: 'date_1', label: 'Due Date', type: 'date', required: true },
  { key: 'amount_1', label: 'Amount', type: 'currency' },
  { key: 'notes', label: 'Notes', type: 'textarea', rows: 4 }
];

initialData = {
  period: 'FY2025',
  date_1: '2025-11-21',
  amount_1: 1500.50,
  notes: 'Some existing notes'
};

template = `
  <app-dynamic-form
    [fields]="formFields"
    [initialData]="initialData"
    [submitButtonText]="'Update'"
    (formSubmit)="handleUpdate($event)"
  />
`;
```

### Select/Dropdown Example

```typescript
formFields: FormField[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    required: true,
    options: [
      { label: 'Pending', value: 'pending' },
      { label: 'In Progress', value: 'in_progress' },
      { label: 'Completed', value: 'completed' },
      { label: 'Cancelled', value: 'cancelled' }
    ]
  },
  {
    key: 'priority',
    label: 'Priority',
    type: 'select',
    options: [
      { label: 'Low', value: 1 },
      { label: 'Medium', value: 2 },
      { label: 'High', value: 3 }
    ]
  }
];
```

### All Field Types Example

```typescript
formFields: FormField[] = [
  // Text fields
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'email', label: 'Email', type: 'email', required: true },
  { key: 'phone', label: 'Phone', type: 'tel' },
  
  // Number fields
  { key: 'quantity', label: 'Quantity', type: 'number', min: 1 },
  { key: 'price', label: 'Price', type: 'currency', step: 0.01 },
  { key: 'discount', label: 'Discount', type: 'percentage', max: 100 },
  
  // Date
  { key: 'due_date', label: 'Due Date', type: 'date' },
  
  // Textarea
  { key: 'description', label: 'Description', type: 'textarea', rows: 5 },
  
  // Select
  {
    key: 'category',
    label: 'Category',
    type: 'select',
    options: [
      { label: 'Option 1', value: 'opt1' },
      { label: 'Option 2', value: 'opt2' }
    ]
  }
];
```

## Interface Reference

### FormField

```typescript
interface FormField {
  key: string;                    // Field key for the data object
  label: string;                  // Display label
  type: 'text' | 'number' | 'date' | 'email' | 'tel' | 
        'textarea' | 'select' | 'currency' | 'percentage';
  placeholder?: string;           // Placeholder text
  required?: boolean;             // Is field required?
  options?: FormFieldOption[];    // Options for select fields
  rows?: number;                  // Rows for textarea
  min?: number;                   // Min value for number fields
  max?: number;                   // Max value for number fields
  step?: number;                  // Step for number fields
}
```

### FormFieldOption

```typescript
interface FormFieldOption {
  label: string;                  // Display text
  value: string | number;         // Actual value
}
```

## Component API

### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `fields` | `FormField[]` | ✅ Yes | - | Array of field configurations |
| `submitButtonText` | `string` | ❌ No | `'Submit'` | Text for submit button |
| `initialData` | `Record<string, any>` | ❌ No | `{}` | Initial form data (for edit mode) |

### Outputs

| Output | Type | Description |
|--------|------|-------------|
| `formSubmit` | `Record<string, any>` | Emitted when form is submitted with cleaned data |

## Data Handling

### Input Data Cleaning
- Date fields: Automatically strips timestamps (e.g., `2025-11-21T10:30:00` → `2025-11-21`)
- Null/undefined values: Converted to empty strings for inputs

### Output Data Cleaning
- Empty strings: Excluded from emitted data
- Null values: Excluded from emitted data
- Only fields with actual values are included

### Example

**Initial Data:**
```json
{
  "name": "John Doe",
  "email": "",
  "age": null,
  "date": "2025-11-21T10:30:00"
}
```

**Form Display:**
- name: "John Doe"
- email: "" (empty input)
- age: "" (empty input)
- date: "2025-11-21" (cleaned)

**Submitted Data:**
```json
{
  "name": "John Doe",
  "date": "2025-11-21"
}
```

## Styling

The component uses Tailwind CSS classes. All inputs have consistent styling:
- Border on idle: `border-gray-300`
- Border on hover: `border-gray-400`
- Focus ring: `ring-blue-500`
- Proper spacing and sizing

## Validation

- Native HTML5 validation
- Required fields marked with red asterisk (*)
- Submit button disabled when form is invalid
- Uses Angular's form validation

## Best Practices

✅ **Do:**
- Use semantic field keys (snake_case or camelCase)
- Provide clear labels
- Use appropriate field types
- Add placeholders for better UX
- Mark required fields

❌ **Don't:**
- Use this for complex nested forms
- Add business logic to the component
- Modify the emitted data in parent
- Rely on internal state - use the emitted data

## Migration from Complex Forms

**Before (complex):**
```typescript
// Complex reactive form setup
formGroup = new FormGroup({...});
validators = [...];
// Manual field mapping
// Complex submission logic
```

**After (simple):**
```typescript
// Just define fields
formFields: FormField[] = [...];

// Handle submission
handleSubmit(data: Record<string, any>) {
  // Use the data directly
}
```

## Real-World Example: Annual Returns Form

```typescript
@Component({
  selector: 'app-annual-returns',
  standalone: true,
  imports: [DynamicFormComponent],
  template: `
    <div class="max-w-4xl mx-auto p-6">
      <h2 class="text-2xl font-bold mb-6">Annual Return</h2>
      
      <app-dynamic-form
        [fields]="annualReturnFields"
        [initialData]="currentRecord"
        [submitButtonText]="isEditMode ? 'Update' : 'Create'"
        (formSubmit)="saveAnnualReturn($event)"
      />
    </div>
  `
})
export class AnnualReturnsComponent {
  isEditMode = false;
  currentRecord: any = null;

  annualReturnFields: FormField[] = [
    {
      key: 'period',
      label: 'Year Ending',
      type: 'text',
      required: true,
      placeholder: 'FY2025'
    },
    {
      key: 'date_1',
      label: 'Anniversary Date',
      type: 'date',
      required: true
    },
    {
      key: 'date_2',
      label: 'Due Date',
      type: 'date',
      required: true
    },
    {
      key: 'date_3',
      label: 'Filing Date',
      type: 'date'
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: [
        { label: 'Pending', value: 'Pending' },
        { label: 'In Progress', value: 'In Progress' },
        { label: 'Filed', value: 'Filed' },
        { label: 'Overdue', value: 'Overdue' }
      ]
    },
    {
      key: 'amount_1',
      label: 'Fee Paid',
      type: 'currency',
      step: 0.01
    },
    {
      key: 'notes',
      label: 'Notes',
      type: 'textarea',
      rows: 3,
      placeholder: 'Additional notes...'
    }
  ];

  saveAnnualReturn(data: Record<string, any>): void {
    console.log('Saving annual return:', data);
    
    // Add your IDs
    const payload = {
      ...data,
      company_id: this.companyId,
      client_id: this.clientId,
      type: 'annual_returns'
    };

    // Call your service
    this.complianceService.save(payload).subscribe({
      next: (result) => console.log('Saved!', result),
      error: (err) => console.error('Error:', err)
    });
  }
}
```

## Performance

- ✅ Uses `ChangeDetectionStrategy.OnPush`
- ✅ Uses Angular signals for reactivity
- ✅ Track by functions for `@for` loops
- ✅ Minimal re-renders

## Accessibility

- ✅ Proper label associations
- ✅ Required field indicators
- ✅ Native form validation
- ✅ Keyboard navigation support

## Testing

```typescript
describe('DynamicFormComponent', () => {
  it('should emit form data on submit', () => {
    const fields: FormField[] = [
      { key: 'name', label: 'Name', type: 'text', required: true }
    ];
    
    // Test setup...
    component.fields = signal(fields);
    
    // Submit form...
    // Assert emitted data...
  });
});
```
