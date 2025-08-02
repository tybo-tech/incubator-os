import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { INode, IField, IGroup, ICollection } from '../../../models/schema';
import { NodeService } from '../../../services';
import { LucideAngularModule, X, RotateCw } from 'lucide-angular';
import { GroupManagerComponent } from './group-manager/group-manager.component';
import { FieldManagerComponent } from './field-manager/field-manager.component';

@Component({
  selector: 'app-collection-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    GroupManagerComponent,
    FieldManagerComponent,
  ],
  templateUrl: './collection-form.component.html',
  styleUrls: ['./collection-form.component.scss'],
})
export class CollectionFormComponent implements OnInit, OnChanges {
  @Input() existingCollection: INode | null = null;
  @Input() isVisible = false;
  @Output() saved = new EventEmitter<INode>();
  @Output() cancelled = new EventEmitter<void>();

  // Lucide Icons
  readonly XIcon = X;
  readonly RotateCwIcon = RotateCw;

  // Form data
  collectionName = '';
  fields: IField[] = [];
  groups: IGroup[] = [];

  // UI state
  isLoading = false;

  constructor(private nodeService: NodeService) {}

  ngOnInit() {
    if (this.existingCollection) {
      this.loadExistingCollection();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log('CollectionForm ngOnChanges:', changes);
    if (changes['isVisible']) {
      console.log('isVisible changed to:', changes['isVisible'].currentValue);
    }
    if (changes['existingCollection'] && this.existingCollection) {
      this.loadExistingCollection();
    } else if (changes['isVisible'] && !this.isVisible) {
      this.resetForm();
    }
  }

  private loadExistingCollection() {
    if (this.existingCollection?.data) {
      const collection = this.existingCollection.data;
      this.collectionName = collection.name;
      this.fields = [...collection.fields];
      this.groups = collection.groups ? [...collection.groups] : [];
    }
  }

  private resetForm() {
    this.collectionName = '';
    this.fields = [];
    this.groups = [];
  }

  // Handle groups change from child component
  onGroupsChange(groups: IGroup[]) {
    this.groups = groups;
  }

  // Handle fields change from child component
  onFieldsChange(fields: IField[]) {
    this.fields = fields;
  }

  // Form actions
  async onSave() {
    if (!this.isFormValid()) {
      return;
    }

    this.isLoading = true;

    try {
      const collectionData: ICollection = {
        name: this.collectionName.trim(),
        type: 'collection',
        targetType: 'custom',
        groups: this.groups,
        fields: this.fields,
      };

      let savedNode: INode;

      if (this.existingCollection?.id) {
        // Update existing collection
        const updatedNode: INode<ICollection> = {
          ...this.existingCollection,
          data: collectionData,
        };
        savedNode = (await this.nodeService
          .updateNode(updatedNode)
          .toPromise()) as INode;
      } else {
        // Create new collection
        const newNode: INode<ICollection> = {
          type: 'collection' as const,
          data: {
            name: this.collectionName.trim(),
            type: 'collection',
            targetType: 'custom',
            groups: this.groups,
            fields: this.fields,
          },
        };
        savedNode = (await this.nodeService
          .addNode(newNode)
          .toPromise()) as INode;
      }

      this.saved.emit(savedNode);
      this.resetForm();
    } catch (error) {
      console.error('Error saving collection:', error);
      // TODO: Show error message to user
    } finally {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.resetForm();
    this.cancelled.emit();
  }

  // Validation
  isFormValid(): boolean {
    const isValid =
      !!(
        this.collectionName.trim()
        // Note: Fields are optional - a collection can exist without fields initially
      );

    // Debug logging to help troubleshoot form validation
    console.log('Form validation:', {
      collectionName: this.collectionName,
      collectionNameTrimmed: this.collectionName.trim(),
      collectionNameLength: this.collectionName.trim().length,
      fieldsLength: this.fields.length,
      groupsLength: this.groups.length,
      isValid,
      isLoading: this.isLoading,
    });

    return isValid;
  }
}
