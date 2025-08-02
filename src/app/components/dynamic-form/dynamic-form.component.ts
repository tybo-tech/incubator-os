import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { INode, ICollection, IField, IGroup } from '../../../models/schema';
import { DynamicFormService, DynamicFormConfig, FormGroupConfig } from '../../services/dynamic-form.service';
import { FormGroupRendererComponent } from '../form-group-renderer/form-group-renderer.component';
import { NodeService } from '../../../services';
import { MultiSelectComponent } from '../multi-select/multi-select.component';

@Component({
  selector: 'app-dynamic-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MultiSelectComponent],
  templateUrl: './dynamic-form.component.html',
  styleUrls: ['./dynamic-form.component.scss'],
})
export class DynamicFormComponent implements OnChanges, OnInit {
  @Input() isVisible: boolean = false;
  @Input() collection: INode | null = null;
  @Input() editingRecord: INode | null = null; // For edit mode

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<any>();

  mainForm!: FormGroup;
  formGroups: FormGroupConfig[] = [];
  isEditMode: boolean = false;
  isSubmitting: boolean = false;

  // Collection options cache
  collectionOptions: { [fieldKey: string]: { label: string; value: any }[] } =
    {};

  constructor(private fb: FormBuilder, private nodeService: NodeService) {
    this.mainForm = this.fb.group({});
  }

  ngOnInit() {
    // Initialize component
  }

  ngOnChanges(changes: SimpleChanges) {
    if (
      changes['collection'] ||
      changes['editingRecord'] ||
      changes['isVisible']
    ) {
      if (this.isVisible && this.collection) {
        this.buildForm();
      }
    }
  }

  // Load options for collection-based select fields
  private async loadCollectionOptions(field: IField): Promise<void> {
    if (
      field.type === 'select' &&
      field.source === 'collection' &&
      field.sourceCollectionId
    ) {
      try {
        const options = await this.nodeService
          .getCollectionOptions(
            field.sourceCollectionId,
            field.labelField || 'name'
          )
          .toPromise();

        this.collectionOptions[field.key] = options || [];
      } catch (error) {
        console.error(
          'Error loading collection options for field',
          field.key,
          error
        );
        this.collectionOptions[field.key] = [];
      }
    }
  }

  // Get options for a select field
  getFieldOptions(field: IField): { label: string; value: any }[] {
    if (field.type !== 'select') return [];

    if (field.source === 'collection') {
      return this.collectionOptions[field.key] || [];
    } else {
      // Static options
      return (field.options || []).map((option) => ({
        label: option,
        value: option,
      }));
    }
  }

  // TrackBy function for option elements to improve performance and stability
  trackByOption(index: number, option: { label: string; value: any }): any {
    return option.value;
  }

  private async buildForm() {
    this.isEditMode = !!this.editingRecord;
    this.formGroups = [];

    const collectionData = this.collection?.data as ICollection;
    if (!collectionData?.fields || !collectionData?.groups) {
      console.warn('No fields or groups found in collection schema');
      return;
    }

    // Load collection options for select fields
    const selectFields = collectionData.fields.filter(
      (field) => field.type === 'select' && field.source === 'collection'
    );

    await Promise.all(
      selectFields.map((field) => this.loadCollectionOptions(field))
    );

    // Group fields by groupId
    const fieldsByGroup: { [groupId: string]: IField[] } = {};

    collectionData.fields.forEach((field) => {
      const groupId = field.groupId || 'ungrouped';
      if (!fieldsByGroup[groupId]) {
        fieldsByGroup[groupId] = [];
      }
      fieldsByGroup[groupId].push(field);
    });

    // Create form groups for each group
    const sortedGroups = collectionData.groups.sort(
      (a, b) => (a.order || 0) - (b.order || 0)
    );

    sortedGroups.forEach((group) => {
      const fields = fieldsByGroup[group.id] || [];
      if (fields.length > 0) {
        const groupFormControls: { [key: string]: FormControl } = {};

        fields.forEach((field) => {
          const validators = [];
          if (field.required) {
            validators.push(Validators.required);
          }
          if (field.type === 'json') {
            validators.push(this.jsonValidator);
          }

          // Set initial value
          let initialValue = this.getInitialValue(field);
          if (this.isEditMode && this.editingRecord?.data) {
            const editValue = this.editingRecord.data[field.key];
            if (editValue !== undefined) {
              if (field.multiple && field.type === 'select') {
                // For multi-select, let the component handle the initial value
                initialValue = editValue;
              } else {
                // For other fields including single-select, use the value directly
                initialValue = editValue;
              }
            }
          }

          groupFormControls[field.key] = new FormControl(
            initialValue,
            validators
          );
        });

        const groupFormGroup = this.fb.group(groupFormControls);

        this.formGroups.push({
          group,
          fields,
          formGroup: groupFormGroup,
        });
      }
    });

    // Handle ungrouped fields
    if (fieldsByGroup['ungrouped']?.length > 0) {
      const ungroupedGroup: IGroup = {
        id: 'ungrouped',
        name: 'Additional Fields',
        description: 'Other fields',
        order: 999,
      };

      const fields = fieldsByGroup['ungrouped'];
      const groupFormControls: { [key: string]: FormControl } = {};

      fields.forEach((field) => {
        const validators = [];
        if (field.required) {
          validators.push(Validators.required);
        }
        if (field.type === 'json') {
          validators.push(this.jsonValidator);
        }

        let initialValue = this.getInitialValue(field);
        if (this.isEditMode && this.editingRecord?.data) {
          const editValue = this.editingRecord.data[field.key];
          if (editValue !== undefined) {
            if (field.multiple && field.type === 'select') {
              // For multi-select, let the component handle the initial value
              initialValue = editValue;
            } else {
              // For other fields including single-select, use the value directly
              initialValue = editValue;
            }
          }
        }

        groupFormControls[field.key] = new FormControl(
          initialValue,
          validators
        );
      });

      const groupFormGroup = this.fb.group(groupFormControls);

      this.formGroups.push({
        group: ungroupedGroup,
        fields,
        formGroup: groupFormGroup,
      });
    }

    console.log('Form built with groups:', this.formGroups);
  }

  private getInitialValue(field: IField): any {
    if (field.defaultValue !== undefined) {
      return field.defaultValue;
    }

    switch (field.type) {
      case 'checkbox':
        return false;
      case 'number':
        return null;
      case 'json':
        return '';
      case 'select':
        return field.multiple ? [] : '';
      default:
        return '';
    }
  }

  private jsonValidator: ValidatorFn = (
    control: AbstractControl
  ): ValidationErrors | null => {
    if (!control.value) return null;

    try {
      JSON.parse(control.value);
      return null;
    } catch (e) {
      return { invalidJson: true };
    }
  };

  isFieldInvalid(formGroup: FormGroup, fieldKey: string): boolean {
    const control = formGroup.get(fieldKey);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onSubmit() {
    if (this.mainForm.invalid) {
      // Mark all fields as touched to show validation errors
      this.formGroups.forEach((groupConfig) => {
        Object.keys(groupConfig.formGroup.controls).forEach((key) => {
          groupConfig.formGroup.get(key)?.markAsTouched();
        });
      });
      return;
    }

    this.isSubmitting = true;

    // Collect all form values from all groups
    const formData: any = {};

    this.formGroups.forEach((groupConfig) => {
      const groupValues = groupConfig.formGroup.value;
      Object.keys(groupValues).forEach((key) => {
        let value = groupValues[key];

        // Process JSON fields and ensure proper select field formatting
        const field = groupConfig.fields.find((f) => f.key === key);
        if (field?.type === 'json' && value) {
          try {
            value = JSON.parse(value);
          } catch (e) {
            // Keep as string if invalid JSON (shouldn't happen due to validator)
          }
        } else if (field?.type === 'select') {
          if (field.multiple) {
            // Multi-select component handles its own array conversion
            // Ensure it's an array
            if (!Array.isArray(value)) {
              value = value ? [value] : [];
            }
          } else {
            // Single-select - ensure it's not an array
            if (Array.isArray(value)) {
              value = value.length > 0 ? value[0] : '';
            }
          }
        }

        formData[key] = value;
      });
    });

    console.log('Form submitted with data:', formData);

    // Emit the save event with the collected data
    setTimeout(() => {
      this.save.emit({
        data: formData,
        isEdit: this.isEditMode,
        originalRecord: this.editingRecord,
      });
      this.isSubmitting = false;
    }, 500); // Simulate API delay
  }

  onClose() {
    this.close.emit();
  }

  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }
}
