import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IField, IGroup, INode } from '../../../../models/schema';
import { NodeService } from '../../../../services/node.service';
import { LucideAngularModule, Plus, Edit, Trash2, X } from 'lucide-angular';

@Component({
  selector: 'app-field-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="mb-6">
      <div class="flex items-center justify-between mb-4">
        <h4 class="text-md font-medium text-gray-900">Fields</h4>
        <span class="text-sm text-gray-500">{{ fields.length }} field(s)</span>
      </div>

      <!-- Existing Fields List -->
      <div *ngIf="fields.length > 0" class="mb-4 space-y-2">
        <div *ngFor="let field of fields; let i = index; trackBy: trackByIndex"
             class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div class="flex-1">
            <div class="flex items-center space-x-3">
              <span class="font-medium text-gray-900">{{ field.label }}</span>
              <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                {{ field.type }}
              </span>
              <span *ngIf="field.required" class="text-red-500 text-xs">Required</span>
              <span *ngIf="field.groupId" class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                {{ getGroupName(field.groupId) }}
              </span>
            </div>
            <div class="text-sm text-gray-500 mt-1">
              Key: <code class="bg-gray-200 px-1 rounded">{{ field.key }}</code>
              <span *ngIf="field.placeholder"> • Placeholder: "{{ field.placeholder }}"</span>
            </div>
            <div *ngIf="field.options && field.options.length > 0" class="text-sm text-gray-500 mt-1">
              Options: {{ field.options.join(', ') }}
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <button type="button" 
                    (click)="editField(i)"
                    class="text-blue-600 hover:text-blue-800 p-1">
              <lucide-icon [img]="EditIcon" class="h-4 w-4"></lucide-icon>
            </button>
            <button type="button" 
                    (click)="removeField(i)"
                    class="text-red-600 hover:text-red-800 p-1">
              <lucide-icon [img]="Trash2Icon" class="h-4 w-4"></lucide-icon>
            </button>
          </div>
        </div>
      </div>

      <!-- Add New Field Form -->
      <div class="border border-gray-300 rounded-lg p-4 bg-gray-50">
        <h5 class="text-sm font-medium text-gray-900 mb-3">Add New Field</h5>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <!-- Field Label -->
          <div>
            <label for="field-label" class="block text-sm font-medium text-gray-700 mb-1">
              Label <span class="text-red-500">*</span>
            </label>
            <input type="text" 
                   id="field-label"
                   [(ngModel)]="newField.label"
                   (input)="generateKey()"
                   name="fieldLabel"
                   placeholder="e.g., Company Name"
                   class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
          </div>

          <!-- Field Type -->
          <div>
            <label for="field-type" class="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select id="field-type"
                    [(ngModel)]="newField.type"
                    (ngModelChange)="ensureOptionsArray()"
                    name="fieldType"
                    class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
              <option *ngFor="let type of fieldTypes" [value]="type.value">
                {{ type.label }}
              </option>
            </select>
          </div>

          <!-- Field Group -->
          <div>
            <label for="field-group" class="block text-sm font-medium text-gray-700 mb-1">
              Group
            </label>
            <select id="field-group"
                    [(ngModel)]="newField.groupId"
                    name="fieldGroup"
                    class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
              <option value="">No Group</option>
              <option *ngFor="let group of availableGroups" [value]="group.id">
                {{ group.name }}
              </option>
            </select>
            <p class="mt-1 text-xs text-gray-500">Optional field grouping</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <!-- Placeholder -->
          <div>
            <label for="field-placeholder" class="block text-sm font-medium text-gray-700 mb-1">
              Placeholder
            </label>
            <input type="text" 
                   id="field-placeholder"
                   [(ngModel)]="newField.placeholder"
                   name="fieldPlaceholder"
                   placeholder="e.g., Enter company name"
                   class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
          </div>

          <!-- Default Value -->
          <div>
            <label for="field-default" class="block text-sm font-medium text-gray-700 mb-1">
              Default Value
            </label>
            <input type="text" 
                   id="field-default"
                   [(ngModel)]="newField.defaultValue"
                   name="fieldDefault"
                   placeholder="Optional default value"
                   class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
          </div>
        </div>

        <!-- Options for Select Fields -->
        <div *ngIf="newField.type === 'select'" class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">Select Source</label>
          
          <!-- Source Type Selection -->
          <div class="mb-3">
            <div class="flex space-x-4">
              <label class="flex items-center">
                <input type="radio" 
                       [(ngModel)]="newField.source"
                       value="static"
                       name="fieldSource"
                       class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300">
                <span class="ml-2 text-sm text-gray-700">Static Options</span>
              </label>
              <label class="flex items-center">
                <input type="radio" 
                       [(ngModel)]="newField.source"
                       value="collection"
                       name="fieldSource"
                       class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300">
                <span class="ml-2 text-sm text-gray-700">Collection Options</span>
              </label>
            </div>
          </div>

          <!-- Static Options -->
          <div *ngIf="newField.source === 'static' || !newField.source" class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Static Options</label>
            <div *ngFor="let option of newField.options || []; let i = index; trackBy: trackByIndex" 
                 class="flex items-center space-x-2 mb-2">
              <input type="text" 
                     [(ngModel)]="newField.options![i]"
                     [name]="'option-' + i"
                     placeholder="Option value"
                     class="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
              <button type="button" 
                      (click)="removeOption(i)"
                      class="text-red-600 hover:text-red-800 p-1">
                <lucide-icon [img]="Trash2Icon" class="h-4 w-4"></lucide-icon>
              </button>
            </div>
            <button type="button" 
                    (click)="addOption()"
                    class="text-blue-600 hover:text-blue-800 text-sm font-medium">
              + Add Option
            </button>
          </div>

          <!-- Collection Options -->
          <div *ngIf="newField.source === 'collection'" class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Collection Configuration</label>
            
            <!-- Source Collection Selection -->
            <div class="mb-3">
              <label for="source-collection" class="block text-sm font-medium text-gray-700 mb-1">
                Source Collection
              </label>
              <select id="source-collection"
                      [(ngModel)]="newField.sourceCollectionId"
                      (ngModelChange)="onSourceCollectionChange()"
                      name="sourceCollection"
                      class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                <option value="">Select a collection...</option>
                <option *ngFor="let collection of availableCollections" [value]="collection.id">
                  {{ collection.data?.name || 'Untitled Collection' }}
                </option>
              </select>
            </div>

            <!-- Label Field Selection -->
            <div *ngIf="selectedCollectionFields.length > 0" class="mb-3">
              <label for="label-field" class="block text-sm font-medium text-gray-700 mb-1">
                Display Field
              </label>
              <select id="label-field"
                      [(ngModel)]="newField.labelField"
                      name="labelField"
                      class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                <option value="">Select display field...</option>
                <option *ngFor="let field of selectedCollectionFields" [value]="field.key">
                  {{ field.label }}
                </option>
              </select>
              <p class="mt-1 text-xs text-gray-500">Field to display in the dropdown options (value will always be the record ID)</p>
            </div>

            <!-- No fields message -->
            <div *ngIf="newField.sourceCollectionId && selectedCollectionFields.length === 0" class="text-sm text-gray-500 italic">
              No fields found in selected collection.
            </div>
          </div>
        </div>

        <!-- Field Options -->
        <div class="flex items-center space-x-4 mb-4">
          <label class="flex items-center">
            <input type="checkbox" 
                   [(ngModel)]="newField.required"
                   name="fieldRequired"
                   class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
            <span class="ml-2 text-sm text-gray-700">Required</span>
          </label>

          <label class="flex items-center" *ngIf="newField.type === 'select' || newField.type === 'checkbox'">
            <input type="checkbox" 
                   [(ngModel)]="newField.multiple"
                   name="fieldMultiple"
                   class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
            <span class="ml-2 text-sm text-gray-700">Multiple</span>
          </label>
        </div>

        <!-- Add Field Button -->
        <button type="button" 
                (click)="addField()"
                [disabled]="!isNewFieldValid()"
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed">
          <lucide-icon [img]="PlusIcon" class="h-4 w-4 mr-1"></lucide-icon>
          Add Field
        </button>
      </div>
    </div>
  `
})
export class FieldManagerComponent implements OnInit {
  @Input() fields: IField[] = [];
  @Input() availableGroups: IGroup[] = [];
  @Output() fieldsChange = new EventEmitter<IField[]>();

  // Available collections for select source
  availableCollections: INode[] = [];
  
  // Available fields from selected collection
  selectedCollectionFields: { key: string; label: string }[] = [];

  // Lucide Icons
  readonly PlusIcon = Plus;
  readonly EditIcon = Edit;
  readonly Trash2Icon = Trash2;
  readonly XIcon = X;

  // Field types for dropdown
  fieldTypes = [
    { value: 'text', label: 'Text' },
    { value: 'textarea', label: 'Textarea' },
    { value: 'number', label: 'Number' },
    { value: 'select', label: 'Select' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'date', label: 'Date' },
    { value: 'json', label: 'JSON' }
  ];

  newField: Partial<IField> = this.createEmptyField();

  constructor(private nodeService: NodeService) {}

  ngOnInit() {
    this.loadAvailableCollections();
  }

  private loadAvailableCollections() {
    this.nodeService.getNodesByType('collection').subscribe(collections => {
      this.availableCollections = collections;
    });
  }

  // Load fields from selected collection
  onSourceCollectionChange() {
    this.selectedCollectionFields = [];
    this.newField.labelField = '';
    this.newField.valueField = 'id'; // Always use ID as value
    
    if (this.newField.sourceCollectionId) {
      const selectedCollection = this.availableCollections.find(c => c.id == this.newField.sourceCollectionId);
      if (selectedCollection?.data?.fields) {
        // Only show collection fields for label selection (no system fields needed)
        const collectionFields = selectedCollection.data.fields.map((field: IField) => ({
          key: field.key,
          label: `${field.label} (${field.type})`
        }));
        
        this.selectedCollectionFields = collectionFields;
        
        // Set default label field (first field)
        if (collectionFields.length > 0) {
          this.newField.labelField = collectionFields[0].key;
        }
      }
    }
  }

  private createEmptyField(): Partial<IField> {
    return {
      key: '',
      label: '',
      type: 'text',
      required: false,
      placeholder: '',
      defaultValue: '',
      multiple: false,
      options: [],
      groupId: undefined,
      source: 'static',
      sourceCollectionId: undefined,
      labelField: '',
      valueField: 'id' // Always use ID as value
    };
  }

  addField() {
    if (!this.isNewFieldValid()) {
      return;
    }

    // Check for duplicate keys
    if (this.fields.some(field => field.key === this.newField.key)) {
      console.warn('Field key already exists:', this.newField.key);
      return;
    }

    const field: IField = {
      key: this.newField.key!,
      label: this.newField.label!,
      type: this.newField.type || 'text',
      required: this.newField.required || false,
      placeholder: this.newField.placeholder,
      defaultValue: this.newField.defaultValue,
      multiple: this.newField.multiple || false,
      options: this.newField.options || [],
      groupId: this.newField.groupId,
      source: this.newField.source || 'static',
      sourceCollectionId: this.newField.sourceCollectionId,
      labelField: this.newField.labelField || 'name',
      valueField: this.newField.valueField || 'id'
    };

    this.fields.push(field);
    this.fieldsChange.emit([...this.fields]);
    this.newField = this.createEmptyField();
  }

  removeField(index: number) {
    this.fields.splice(index, 1);
    this.fieldsChange.emit([...this.fields]);
  }

  editField(index: number) {
    this.newField = { ...this.fields[index] };
    this.removeField(index);
  }

  // Options management for select fields
  addOption() {
    if (!this.newField.options) this.newField.options = [];
    this.newField.options.push('');
  }

  removeOption(index: number) {
    if (this.newField.options) {
      this.newField.options.splice(index, 1);
    }
  }

  // Ensure options array exists for select fields
  ensureOptionsArray() {
    if (this.newField.type === 'select' && !this.newField.options) {
      this.newField.options = [];
    }
  }

  // Generate key from label
  generateKey() {
    if (this.newField.label && !this.newField.key) {
      this.newField.key = this.generateSecureKey(this.newField.label);
    }
  }

  // Generate secure, unique keys
  private generateSecureKey(label: string): string {
    const baseKey = label
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '');
    
    // Add timestamp and random string to ensure uniqueness
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${baseKey}_${timestamp}_${random}`;
  }

  // Get group name by ID
  getGroupName(groupId?: string): string {
    if (!groupId) return 'No Group';
    const group = this.availableGroups.find(g => g.id === groupId);
    return group ? group.name : 'Unknown Group';
  }

  isNewFieldValid(): boolean {
    return !!(
      this.newField.key?.trim() &&
      this.newField.label?.trim()
    );
  }

  trackByIndex(index: number): number {
    return index;
  }
}
