import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { ICollection, IField, IGroup, INode } from '../../models/schema';
import { NodeService } from '../../services/node.service';

export interface FormGroupConfig {
  group: IGroup;
  fields: IField[];
  formGroup: FormGroup;
}

export interface DynamicFormConfig {
  collection: INode<ICollection>;
  formGroups: FormGroupConfig[];
  mainForm: FormGroup;
  collectionOptions: { [fieldKey: string]: { label: string; value: any }[] };
}

@Injectable({
  providedIn: 'root'
})
export class DynamicFormService {

  constructor(
    private fb: FormBuilder,
    private nodeService: NodeService
  ) {}

  /**
   * Generate complete form configuration from collection schema
   */
  async generateFormConfig(collection: INode<ICollection>, editingRecord?: INode): Promise<DynamicFormConfig> {
    if (!collection?.data) {
      throw new Error('Invalid collection data');
    }

    const collectionData = collection.data;
    const formGroups: FormGroupConfig[] = [];
    const collectionOptions: { [fieldKey: string]: { label: string; value: any }[] } = {};

    // Load all relationship options first
    await this.preloadCollectionOptions(collectionData.fields, collectionOptions);

    // Create form groups for each group in the collection
    if (collectionData.groups && collectionData.groups.length > 0) {
      // Sort groups by order
      const sortedGroups = [...collectionData.groups].sort((a, b) => (a.order || 0) - (b.order || 0));

      for (const group of sortedGroups) {
        const groupFields = collectionData.fields.filter((field: IField) => field.groupId === group.id);
        if (groupFields.length > 0) {
          const formGroup = this.createFormGroup(groupFields, editingRecord);
          formGroups.push({
            group,
            fields: groupFields,
            formGroup
          });
        }
      }
    } else {
      // Create a default group for ungrouped fields
      const ungroupedFields = collectionData.fields.filter((field: IField) => !field.groupId);
      if (ungroupedFields.length > 0) {
        const defaultGroup: IGroup = {
          id: 'default',
          name: 'Information',
          order: 1
        };
        const formGroup = this.createFormGroup(ungroupedFields, editingRecord);
        formGroups.push({
          group: defaultGroup,
          fields: ungroupedFields,
          formGroup
        });
      }
    }

    // Create main form that contains all group forms
    const mainForm = this.fb.group({});
    formGroups.forEach(config => {
      mainForm.addControl(config.group.id, config.formGroup);
    });

    return {
      collection,
      formGroups,
      mainForm,
      collectionOptions
    };
  }

  /**
   * Create a form group for a set of fields
   */
  private createFormGroup(fields: IField[], editingRecord?: INode): FormGroup {
    const group: { [key: string]: FormControl } = {};

    fields.forEach(field => {
      const validators = [];

      if (field.required) {
        validators.push(Validators.required);
      }

      if (field.type === 'json') {
        validators.push(this.jsonValidator);
      }

      // Get initial value from editing record
      let initialValue = field.defaultValue || '';
      if (editingRecord?.data && editingRecord.data[field.key] !== undefined) {
        initialValue = editingRecord.data[field.key];
      }

      // Handle checkbox initial values
      if (field.type === 'checkbox') {
        initialValue = initialValue === true || initialValue === 'true' || initialValue === 1;
      }

      // Handle multi-select arrays
      if (field.multiple && !Array.isArray(initialValue)) {
        initialValue = initialValue ? [initialValue] : [];
      }

      group[field.key] = new FormControl(initialValue, { validators });
    });

    return this.fb.group(group);
  }

  /**
   * Preload all collection options for relationship fields
   */
  private async preloadCollectionOptions(
    fields: IField[],
    collectionOptions: { [fieldKey: string]: { label: string; value: any }[] }
  ): Promise<void> {
    const loadPromises = fields
      .filter(field => field.type === 'select' && field.source === 'collection' && field.sourceCollectionId)
      .map(async field => {
        try {
          const options = await this.nodeService
            .getCollectionOptions(field.sourceCollectionId!, field.labelField || 'name')
            .toPromise();
          collectionOptions[field.key] = options || [];
        } catch (error) {
          console.error(`Error loading options for field ${field.key}:`, error);
          collectionOptions[field.key] = [];
        }
      });

    await Promise.all(loadPromises);
  }

  /**
   * Extract clean form data from form groups
   */
  extractFormData(formGroups: FormGroupConfig[]): any {
    const formData: any = {};

    formGroups.forEach(config => {
      if (config.formGroup.valid) {
        const groupData = config.formGroup.value;
        Object.assign(formData, groupData);
      }
    });

    return formData;
  }

  /**
   * Check if a specific field in a form group is invalid
   */
  isFieldInvalid(formGroup: FormGroup, fieldKey: string): boolean {
    const field = formGroup.get(fieldKey);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  /**
   * Get options for a specific field
   */
  getFieldOptions(field: IField, collectionOptions: { [fieldKey: string]: { label: string; value: any }[] }): { label: string; value: any }[] {
    if (field.type === 'select') {
      if (field.source === 'static' && field.options) {
        return field.options.map((option: string) => ({ label: option, value: option }));
      } else if (field.source === 'collection') {
        return collectionOptions[field.key] || [];
      }
    }
    return [];
  }

  /**
   * Custom JSON validator
   */
  private jsonValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;

    try {
      JSON.parse(control.value);
      return null;
    } catch (error) {
      return { invalidJson: true };
    }
  }

  /**
   * Track by function for options
   */
  trackByOption(index: number, option: { label: string; value: any }): any {
    return option.value;
  }
}
