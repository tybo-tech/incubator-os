import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DynamicFormComponent, FormField } from '../shared/dynamic-form.component';

/**
 * Test component to demonstrate DynamicFormComponent usage
 */
@Component({
  selector: 'app-dynamic-form-test',
  standalone: true,
  imports: [CommonModule, DynamicFormComponent],
  template: `
    <div class="max-w-4xl mx-auto p-8">
      <h1 class="text-3xl font-bold mb-2">Dynamic Form Test</h1>
      <p class="text-gray-600 mb-8">Testing the clean, simple dynamic form component</p>

      <!-- Example 1: Basic Form -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 class="text-xl font-semibold mb-4">Example 1: Basic Contact Form</h2>
        <app-dynamic-form
          [fields]="contactFields"
          [submitButtonText]="'Send Message'"
          (formSubmit)="handleContactSubmit($event)"
        />
      </div>

      <!-- Example 2: Edit Mode -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 class="text-xl font-semibold mb-4">Example 2: Edit Product (with initial data)</h2>
        <app-dynamic-form
          [fields]="productFields"
          [initialData]="existingProduct"
          [submitButtonText]="'Update Product'"
          (formSubmit)="handleProductUpdate($event)"
        />
      </div>

      <!-- Example 3: Compliance Record -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 class="text-xl font-semibold mb-4">Example 3: Annual Return Form</h2>
        <app-dynamic-form
          [fields]="annualReturnFields"
          [submitButtonText]="'Save Return'"
          (formSubmit)="handleAnnualReturnSubmit($event)"
        />
      </div>

      <!-- Console Output -->
      <div class="bg-gray-900 rounded-lg p-6 text-white">
        <h2 class="text-xl font-semibold mb-4">Console Output</h2>
        <div class="font-mono text-sm whitespace-pre-wrap">{{ consoleOutput }}</div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: #f9fafb;
    }
  `]
})
export class DynamicFormTestComponent {
  consoleOutput = 'Submit a form to see the output here...';

  // Example 1: Contact Form
  contactFields: FormField[] = [
    {
      key: 'name',
      label: 'Full Name',
      type: 'text',
      required: true,
      placeholder: 'John Doe'
    },
    {
      key: 'email',
      label: 'Email Address',
      type: 'email',
      required: true,
      placeholder: 'john@example.com'
    },
    {
      key: 'phone',
      label: 'Phone Number',
      type: 'tel',
      placeholder: '+27 123 456 789'
    },
    {
      key: 'message',
      label: 'Message',
      type: 'textarea',
      required: true,
      rows: 5,
      placeholder: 'Your message here...'
    }
  ];

  // Example 2: Product Form with Initial Data
  productFields: FormField[] = [
    {
      key: 'name',
      label: 'Product Name',
      type: 'text',
      required: true
    },
    {
      key: 'category',
      label: 'Category',
      type: 'select',
      required: true,
      options: [
        { label: 'Electronics', value: 'electronics' },
        { label: 'Clothing', value: 'clothing' },
        { label: 'Food', value: 'food' },
        { label: 'Books', value: 'books' }
      ]
    },
    {
      key: 'price',
      label: 'Price',
      type: 'currency',
      required: true,
      step: 0.01
    },
    {
      key: 'discount',
      label: 'Discount',
      type: 'percentage',
      max: 100,
      step: 0.1
    },
    {
      key: 'stock',
      label: 'Stock Quantity',
      type: 'number',
      min: 0,
      step: 1
    },
    {
      key: 'description',
      label: 'Description',
      type: 'textarea',
      rows: 4
    }
  ];

  existingProduct = {
    name: 'Laptop Pro 15',
    category: 'electronics',
    price: 15999.99,
    discount: 10,
    stock: 25,
    description: 'High-performance laptop for professionals'
  };

  // Example 3: Annual Return Form
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
      placeholder: 'Additional notes about this annual return...'
    }
  ];

  // Handlers
  handleContactSubmit(data: Record<string, any>): void {
    this.updateConsoleOutput('Contact Form Submitted', data);
  }

  handleProductUpdate(data: Record<string, any>): void {
    this.updateConsoleOutput('Product Updated', data);
  }

  handleAnnualReturnSubmit(data: Record<string, any>): void {
    this.updateConsoleOutput('Annual Return Saved', data);
  }

  private updateConsoleOutput(title: string, data: Record<string, any>): void {
    const output = `${title}:\n${JSON.stringify(data, null, 2)}`;
    console.log(output);
    this.consoleOutput = output;
  }
}
